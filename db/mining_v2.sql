-- =============================================================
-- Mining v2 upgrades:
--  - server-side price snapshots (mining_coin_prices)
--  - audit log (mining_audit_log)
--  - project risk controls (capacity already exists, add controls)
--  - emergency freeze setting in system_settings
--  - settle uses server-side price; client param removed
--  - hourly pg_cron job to auto-settle matured contracts
-- =============================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- -------------------------------------------------------------
-- mining_coin_prices: rolling cache populated by server only
-- -------------------------------------------------------------
create table if not exists public.mining_coin_prices (
  coin text primary key,
  price_usd numeric(28,8) not null,
  source text not null default 'coingecko',
  fetched_at timestamptz not null default now()
);

grant select on public.mining_coin_prices to authenticated;
grant all on public.mining_coin_prices to service_role;

alter table public.mining_coin_prices enable row level security;
drop policy if exists "prices readable" on public.mining_coin_prices;
create policy "prices readable" on public.mining_coin_prices
  for select to authenticated using (true);

-- -------------------------------------------------------------
-- Project risk control columns
-- -------------------------------------------------------------
alter table public.mining_projects
  add column if not exists max_locked_capital numeric(28,8),
  add column if not exists max_active_users integer,
  add column if not exists settlement_frozen boolean not null default false;

-- -------------------------------------------------------------
-- Contract: snapshot starting price
-- -------------------------------------------------------------
alter table public.mining_contracts
  add column if not exists coin_price_at_start numeric(28,8);

-- -------------------------------------------------------------
-- mining_audit_log: append-only
-- -------------------------------------------------------------
create table if not exists public.mining_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,                       -- target user (contract owner) when applicable
  admin_id uuid,                      -- admin who performed action, if any
  actor_id uuid,                      -- effective actor (auth.uid()) at time of action
  action text not null,               -- e.g. 'contract.created'
  contract_id uuid,
  project_id uuid,
  previous jsonb,
  next jsonb,
  ip_address text,
  meta jsonb
);

create index if not exists mining_audit_log_user_idx on public.mining_audit_log(user_id);
create index if not exists mining_audit_log_action_idx on public.mining_audit_log(action);
create index if not exists mining_audit_log_created_idx on public.mining_audit_log(created_at desc);

grant select on public.mining_audit_log to authenticated;
grant all on public.mining_audit_log to service_role;

alter table public.mining_audit_log enable row level security;

drop policy if exists "audit own or admin read" on public.mining_audit_log;
create policy "audit own or admin read" on public.mining_audit_log
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Block updates & deletes outright (append-only) by NOT creating
-- any update/delete policies. RLS denies by default.

-- Helper: log an audit row from inside SECURITY DEFINER funcs
create or replace function public._mining_audit(
  _action text,
  _user_id uuid,
  _contract_id uuid,
  _project_id uuid,
  _previous jsonb,
  _next jsonb,
  _meta jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare _admin uuid;
begin
  if public.has_role(auth.uid(), 'admin') then _admin := auth.uid(); end if;
  insert into public.mining_audit_log(
    user_id, admin_id, actor_id, action, contract_id, project_id, previous, next, meta
  ) values (
    _user_id, _admin, auth.uid(), _action, _contract_id, _project_id, _previous, _next, _meta
  );
end $$;

-- -------------------------------------------------------------
-- Server-side price fetcher (pg_net -> CoinGecko)
--   Maintains a symbol->coingecko_id map; cached in mining_coin_prices
-- -------------------------------------------------------------
create table if not exists public.mining_coin_meta (
  coin text primary key,
  coingecko_id text not null
);
grant select on public.mining_coin_meta to authenticated;
grant all on public.mining_coin_meta to service_role;

insert into public.mining_coin_meta(coin, coingecko_id) values
  ('BTC','bitcoin'),('ETH','ethereum'),('SOL','solana'),
  ('XRP','ripple'),('BNB','binancecoin'),('DOGE','dogecoin'),
  ('LTC','litecoin'),('ADA','cardano'),('TRX','tron'),
  ('USDT','tether'),('USDC','usd-coin'),('MATIC','matic-network'),
  ('AVAX','avalanche-2'),('LINK','chainlink'),('DOT','polkadot')
on conflict (coin) do nothing;

-- Block synchronous fetcher using net.http_get
create or replace function public.mining_refresh_prices()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _ids text;
  _req_id bigint;
  _resp record;
  _body jsonb;
  _entry jsonb;
  _count integer := 0;
  _start timestamptz := clock_timestamp();
begin
  select string_agg(coingecko_id, ',') into _ids from public.mining_coin_meta;
  if _ids is null then return 0; end if;

  -- Fire async http GET, then poll _http_response
  select net.http_get(
    url := 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=' || _ids,
    headers := '{"Accept":"application/json"}'::jsonb
  ) into _req_id;

  -- Poll for response (max ~10s)
  loop
    select * into _resp from net._http_response where id = _req_id;
    exit when _resp.id is not null and _resp.status_code is not null;
    exit when clock_timestamp() - _start > interval '10 seconds';
    perform pg_sleep(0.5);
  end loop;

  if _resp.status_code is null or _resp.status_code <> 200 then
    raise notice 'price fetch failed, status=%', coalesce(_resp.status_code::text,'null');
    return 0;
  end if;

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
  return _count;
end $$;

grant execute on function public.mining_refresh_prices() to service_role;

-- -------------------------------------------------------------
-- Drop old client-priced settle function & rebuild server-side
-- -------------------------------------------------------------
drop function if exists public.settle_mining_contract(uuid, numeric);
drop function if exists public.settle_mining_contract(uuid);

create or replace function public.settle_mining_contract(_contract_id uuid)
returns public.mining_contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _c public.mining_contracts%rowtype;
  _proj public.mining_projects%rowtype;
  _price numeric;
  _total_reward_usd numeric;
  _reward_coin numeric;
  _before jsonb;
begin
  if _uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;

  select * into _c from public.mining_contracts where id = _contract_id for update;
  if not found then raise exception 'contract not found'; end if;
  if _c.user_id <> _uid and not public.has_role(_uid, 'admin') then
    raise exception 'forbidden';
  end if;
  if _c.status not in ('active','matured') then
    raise exception 'contract not settleable (status=%)', _c.status;
  end if;
  if now() < _c.ends_at then raise exception 'contract not yet matured'; end if;

  -- Emergency freeze check (per-project + global)
  if _c.project_id is not null then
    select * into _proj from public.mining_projects where id = _c.project_id;
    if found and _proj.settlement_frozen then
      raise exception 'settlement frozen for this project by admin';
    end if;
  end if;
  if coalesce((select value from public.system_settings where key='mining_settlement_freeze'),'false') = 'true' then
    raise exception 'mining settlement temporarily frozen by admin';
  end if;

  -- Server-side coin price
  select price_usd into _price from public.mining_coin_prices where coin = _c.coin;
  if _price is null then
    -- Try to refresh once
    perform public.mining_refresh_prices();
    select price_usd into _price from public.mining_coin_prices where coin = _c.coin;
  end if;
  if _price is null or _price <= 0 then
    raise exception 'no server-side price available for %', _c.coin;
  end if;

  _total_reward_usd := _c.amount_usd * (_c.daily_rate/100.0) * _c.lock_days;
  _reward_coin := _total_reward_usd / _price;

  -- Return principal
  update public.fiat_balances
    set available = available + _c.amount_usd, updated_at = now()
    where user_id = _c.user_id and currency = 'USD';
  if not found then
    insert into public.fiat_balances(user_id, currency, available)
    values (_c.user_id, 'USD', _c.amount_usd);
  end if;

  -- Credit reward coin
  perform public._mining_credit_coin(_c.user_id, _c.coin, _reward_coin);

  _before := to_jsonb(_c);

  update public.mining_contracts
    set status = 'completed',
        reward_credited_coin = _reward_coin,
        coin_price_at_settle = _price,
        settled_at = now()
    where id = _contract_id
    returning * into _c;

  insert into public.notifications(user_id, title, body)
  values (_c.user_id, 'Mining contract matured',
          format('Your %s mining contract matured. $%s principal returned and %s %s credited.',
                 _c.coin, round(_c.amount_usd,2)::text, round(_reward_coin,8)::text, _c.coin));

  perform public._mining_audit('contract.settled', _c.user_id, _c.id, _c.project_id,
    _before, to_jsonb(_c),
    jsonb_build_object('price', _price, 'reward_coin', _reward_coin));

  return _c;
end $$;

revoke all on function public.settle_mining_contract(uuid) from public;
grant execute on function public.settle_mining_contract(uuid) to authenticated;

-- -------------------------------------------------------------
-- Rebuild create_mining_contract: snapshot start price, enforce
-- capacity & max_locked_capital & max_active_users.
-- -------------------------------------------------------------
drop function if exists public.create_mining_contract(uuid, numeric);

create or replace function public.create_mining_contract(
  _project_id uuid,
  _amount_usd numeric
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _proj public.mining_projects%rowtype;
  _bal numeric;
  _contract_id uuid;
  _start_price numeric;
  _locked numeric;
  _users integer;
  _new public.mining_contracts%rowtype;
begin
  if _uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if _amount_usd is null or _amount_usd <= 0 then raise exception 'invalid amount'; end if;

  select * into _proj from public.mining_projects where id = _project_id for update;
  if not found then raise exception 'project not found'; end if;
  if _proj.status <> 'active' then raise exception 'project is not active'; end if;
  if _amount_usd < _proj.min_amount then
    raise exception 'amount below minimum (% USD)', _proj.min_amount;
  end if;
  if _proj.max_amount is not null and _amount_usd > _proj.max_amount then
    raise exception 'amount above maximum (% USD)', _proj.max_amount;
  end if;

  -- Capacity (total USD already deployed across active contracts) check
  if _proj.capacity is not null or _proj.max_locked_capital is not null then
    select coalesce(sum(amount_usd), 0) into _locked
      from public.mining_contracts
      where project_id = _proj.id and status in ('active','matured');
    if _proj.capacity is not null and (_locked + _amount_usd) > _proj.capacity then
      raise exception 'project capacity reached';
    end if;
    if _proj.max_locked_capital is not null and (_locked + _amount_usd) > _proj.max_locked_capital then
      raise exception 'project max locked capital reached';
    end if;
  end if;

  if _proj.max_active_users is not null then
    select count(distinct user_id) into _users
      from public.mining_contracts
      where project_id = _proj.id and status in ('active','matured');
    if _users >= _proj.max_active_users and not exists (
      select 1 from public.mining_contracts
        where project_id = _proj.id and user_id = _uid and status in ('active','matured')
    ) then
      raise exception 'project max active users reached';
    end if;
  end if;

  -- USD balance
  select available into _bal from public.fiat_balances
    where user_id = _uid and currency = 'USD' for update;
  if _bal is null then
    insert into public.fiat_balances(user_id, currency, available) values (_uid, 'USD', 0);
    _bal := 0;
  end if;
  if _bal < _amount_usd then raise exception 'insufficient USD balance'; end if;

  update public.fiat_balances
    set available = available - _amount_usd, updated_at = now()
    where user_id = _uid and currency = 'USD';

  -- Snapshot start price (best effort; not fatal if missing)
  select price_usd into _start_price from public.mining_coin_prices where coin = _proj.coin;
  if _start_price is null then
    perform public.mining_refresh_prices();
    select price_usd into _start_price from public.mining_coin_prices where coin = _proj.coin;
  end if;

  insert into public.mining_contracts(
    user_id, project_id, coin, amount_usd, daily_rate, lock_days, ends_at, coin_price_at_start
  ) values (
    _uid, _proj.id, _proj.coin, _amount_usd, _proj.daily_rate, _proj.lock_days,
    now() + (_proj.lock_days || ' days')::interval, _start_price
  ) returning * into _new;

  _contract_id := _new.id;

  insert into public.notifications(user_id, title, body)
  values (_uid, 'Mining contract started',
          format('Your %s mining contract for $%s is active for %s days.',
                 _proj.coin, round(_amount_usd,2)::text, _proj.lock_days));

  perform public._mining_audit('contract.created', _uid, _contract_id, _proj.id,
    null, to_jsonb(_new),
    jsonb_build_object('start_price', _start_price));

  return _contract_id;
end $$;

revoke all on function public.create_mining_contract(uuid, numeric) from public;
grant execute on function public.create_mining_contract(uuid, numeric) to authenticated;

-- -------------------------------------------------------------
-- Hourly auto-settle job
-- -------------------------------------------------------------
create or replace function public.process_matured_mining()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _c record;
  _settled integer := 0;
  _global_freeze text;
begin
  perform public.mining_refresh_prices();

  _global_freeze := coalesce((select value from public.system_settings where key='mining_settlement_freeze'),'false');

  -- First mark anything that has matured but is still 'active'
  update public.mining_contracts
    set status = 'matured'
    where status = 'active' and now() >= ends_at;

  if _global_freeze = 'true' then
    return 0; -- still mark matured, but skip payouts
  end if;

  for _c in
    select mc.id, mp.settlement_frozen
      from public.mining_contracts mc
      left join public.mining_projects mp on mp.id = mc.project_id
      where mc.status in ('active','matured') and now() >= mc.ends_at
      order by mc.ends_at
      limit 500
  loop
    if _c.settlement_frozen then continue; end if;
    begin
      perform public.settle_mining_contract(_c.id);
      _settled := _settled + 1;
    exception when others then
      raise notice 'auto-settle failed for %: %', _c.id, sqlerrm;
    end;
  end loop;
  return _settled;
end $$;

grant execute on function public.process_matured_mining() to service_role;

-- Note: settle_mining_contract uses auth.uid() for owner check.
-- For a cron job there is no auth.uid(), so override the call path:
-- we need a SECURITY DEFINER wrapper that bypasses owner check.
create or replace function public._mining_settle_system(_contract_id uuid)
returns public.mining_contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  _c public.mining_contracts%rowtype;
  _proj public.mining_projects%rowtype;
  _price numeric;
  _total_reward_usd numeric;
  _reward_coin numeric;
  _before jsonb;
begin
  select * into _c from public.mining_contracts where id = _contract_id for update;
  if not found then return null; end if;
  if _c.status not in ('active','matured') then return _c; end if;
  if now() < _c.ends_at then return _c; end if;

  if _c.project_id is not null then
    select * into _proj from public.mining_projects where id = _c.project_id;
    if found and _proj.settlement_frozen then return _c; end if;
  end if;

  select price_usd into _price from public.mining_coin_prices where coin = _c.coin;
  if _price is null or _price <= 0 then return _c; end if;

  _total_reward_usd := _c.amount_usd * (_c.daily_rate/100.0) * _c.lock_days;
  _reward_coin := _total_reward_usd / _price;

  update public.fiat_balances
    set available = available + _c.amount_usd, updated_at = now()
    where user_id = _c.user_id and currency = 'USD';
  if not found then
    insert into public.fiat_balances(user_id, currency, available)
    values (_c.user_id, 'USD', _c.amount_usd);
  end if;

  perform public._mining_credit_coin(_c.user_id, _c.coin, _reward_coin);

  _before := to_jsonb(_c);
  update public.mining_contracts
    set status = 'completed',
        reward_credited_coin = _reward_coin,
        coin_price_at_settle = _price,
        settled_at = now()
    where id = _contract_id
    returning * into _c;

  insert into public.notifications(user_id, title, body)
  values (_c.user_id, 'Mining contract matured',
          format('Your %s mining contract matured. $%s principal returned and %s %s credited.',
                 _c.coin, round(_c.amount_usd,2)::text, round(_reward_coin,8)::text, _c.coin));

  insert into public.mining_audit_log(user_id, actor_id, action, contract_id, project_id, previous, next, meta)
  values (_c.user_id, null, 'contract.auto_settled', _c.id, _c.project_id,
          _before, to_jsonb(_c),
          jsonb_build_object('price', _price, 'reward_coin', _reward_coin));

  return _c;
end $$;

-- Update process_matured_mining to use the system-level settle.
create or replace function public.process_matured_mining()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _c record;
  _settled integer := 0;
  _global_freeze text;
begin
  perform public.mining_refresh_prices();
  _global_freeze := coalesce((select value from public.system_settings where key='mining_settlement_freeze'),'false');

  update public.mining_contracts
    set status = 'matured'
    where status = 'active' and now() >= ends_at;

  if _global_freeze = 'true' then return 0; end if;

  for _c in
    select mc.id, mp.settlement_frozen
      from public.mining_contracts mc
      left join public.mining_projects mp on mp.id = mc.project_id
      where mc.status in ('active','matured') and now() >= mc.ends_at
      order by mc.ends_at
      limit 500
  loop
    if _c.settlement_frozen then continue; end if;
    begin
      perform public._mining_settle_system(_c.id);
      _settled := _settled + 1;
    exception when others then
      raise notice 'auto-settle failed for %: %', _c.id, sqlerrm;
    end;
  end loop;
  return _settled;
end $$;

-- -------------------------------------------------------------
-- pg_cron schedules
-- -------------------------------------------------------------
-- Drop existing jobs of same name, then create.
do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('mining-refresh-prices','mining-process-matured');
exception when others then null; end $$;

select cron.schedule('mining-refresh-prices', '*/10 * * * *', $$select public.mining_refresh_prices();$$);
select cron.schedule('mining-process-matured', '0 * * * *', $$select public.process_matured_mining();$$);

-- -------------------------------------------------------------
-- Audit triggers for project lifecycle
-- -------------------------------------------------------------
create or replace function public._mining_projects_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.mining_audit_log(actor_id, admin_id, action, project_id, next)
    values (auth.uid(), case when public.has_role(auth.uid(),'admin') then auth.uid() end,
            'project.created', new.id, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.mining_audit_log(actor_id, admin_id, action, project_id, previous, next)
    values (auth.uid(), case when public.has_role(auth.uid(),'admin') then auth.uid() end,
            case when new.status <> old.status then 'project.status_changed' else 'project.updated' end,
            new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.mining_audit_log(actor_id, admin_id, action, project_id, previous)
    values (auth.uid(), case when public.has_role(auth.uid(),'admin') then auth.uid() end,
            'project.deleted', old.id, to_jsonb(old));
    return old;
  end if;
  return null;
end $$;

drop trigger if exists mining_projects_audit on public.mining_projects;
create trigger mining_projects_audit
  after insert or update or delete on public.mining_projects
  for each row execute function public._mining_projects_audit();

-- Seed default global setting row (not freezing by default)
insert into public.system_settings(key, value)
values ('mining_settlement_freeze','false')
on conflict (key) do nothing;

-- Initial price prime
select public.mining_refresh_prices();
