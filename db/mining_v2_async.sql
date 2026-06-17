-- Async-friendly price refresh using pg_net (responses arrive in a
-- background worker, NOT inside the same transaction).
-- Pattern: request() enqueues; apply() reads any completed responses
-- and upserts prices. Cron runs request every 10 min and apply 1 min later.

create table if not exists public.mining_price_jobs (
  id bigserial primary key,
  request_id bigint not null,
  enqueued_at timestamptz not null default now(),
  applied boolean not null default false
);

grant all on public.mining_price_jobs to service_role;
grant all on sequence public.mining_price_jobs_id_seq to service_role;

create or replace function public.mining_request_prices()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _ids text;
  _req_id bigint;
begin
  select string_agg(coingecko_id, ',') into _ids from public.mining_coin_meta;
  if _ids is null then return null; end if;

  select net.http_get(
    url := 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' || _ids,
    headers := '{"Accept":"application/json"}'::jsonb
  ) into _req_id;

  insert into public.mining_price_jobs(request_id) values (_req_id);
  return _req_id;
end $$;

grant execute on function public.mining_request_prices() to service_role;

create or replace function public.mining_apply_prices()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _job record;
  _resp record;
  _body jsonb;
  _entry jsonb;
  _count integer := 0;
begin
  for _job in
    select * from public.mining_price_jobs
      where applied = false and enqueued_at > now() - interval '1 day'
      order by id
  loop
    select * into _resp from net._http_response where id = _job.request_id;
    if _resp.id is null or _resp.status_code is null then
      continue; -- not ready yet
    end if;
    if _resp.status_code = 200 and _resp.content is not null then
      begin
        _body := _resp.content::jsonb;
        for _entry in select * from jsonb_array_elements(_body) loop
          insert into public.mining_coin_prices(coin, price_usd, source, fetched_at)
          values (upper(_entry->>'symbol'), (_entry->>'current_price')::numeric, 'coingecko', now())
          on conflict (coin) do update
            set price_usd = excluded.price_usd,
                fetched_at = excluded.fetched_at,
                source = excluded.source;
          _count := _count + 1;
        end loop;
      exception when others then
        raise notice 'parse failed for job %: %', _job.id, sqlerrm;
      end;
    end if;
    update public.mining_price_jobs set applied = true where id = _job.id;
  end loop;
  return _count;
end $$;

grant execute on function public.mining_apply_prices() to service_role;

-- Single convenience used elsewhere in the codebase that calls
-- "mining_refresh_prices()" — keep it as a noop-friendly wrapper that
-- enqueues and (best-effort) applies whatever is already complete.
create or replace function public.mining_refresh_prices()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _applied integer;
begin
  perform public.mining_request_prices();
  -- Best-effort apply of any responses that completed in earlier cron runs
  _applied := public.mining_apply_prices();
  return _applied;
end $$;

-- Re-schedule: request every 5 min, apply every 5 min offset
do $$ begin
  perform cron.unschedule(jobid) from cron.job
    where jobname in ('mining-refresh-prices','mining-request-prices','mining-apply-prices','mining-process-matured');
exception when others then null; end $$;

select cron.schedule('mining-request-prices', '*/5 * * * *', $$select public.mining_request_prices();$$);
select cron.schedule('mining-apply-prices',  '1-59/5 * * * *', $$select public.mining_apply_prices();$$);
select cron.schedule('mining-process-matured','0 * * * *',     $$select public.process_matured_mining();$$);

-- Prime once now (request only; response will arrive shortly)
select public.mining_request_prices();
