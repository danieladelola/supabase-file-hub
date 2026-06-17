-- =============================================================
-- Mining investment system
-- =============================================================

do $$ begin
  create type public.mining_status as enum ('active','matured','completed','cancelled','paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.mining_project_status as enum ('active','paused','disabled');
exception when duplicate_object then null; end $$;

create table if not exists public.mining_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coin text not null,
  coin_logo text,
  description text,
  daily_rate numeric(8,4) not null,
  lock_days integer not null check (lock_days > 0),
  min_amount numeric(28,8) not null default 0,
  max_amount numeric(28,8),
  capacity numeric(28,8),
  status public.mining_project_status not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.mining_projects to anon, authenticated;
grant all on public.mining_projects to service_role;

alter table public.mining_projects enable row level security;

drop policy if exists "mining_projects readable" on public.mining_projects;
create policy "mining_projects readable" on public.mining_projects
  for select using (true);

drop policy if exists "mining_projects admin write" on public.mining_projects;
create policy "mining_projects admin write" on public.mining_projects
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public._mining_projects_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists mining_projects_updated_at on public.mining_projects;
create trigger mining_projects_updated_at
  before update on public.mining_projects
  for each row execute function public._mining_projects_touch_updated_at();

create table if not exists public.mining_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.mining_projects(id) on delete set null,
  coin text not null,
  amount_usd numeric(28,8) not null check (amount_usd > 0),
  daily_rate numeric(8,4) not null,
  lock_days integer not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status public.mining_status not null default 'active',
  reward_credited_coin numeric(28,8) not null default 0,
  coin_price_at_settle numeric(28,8),
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mining_contracts_user_idx on public.mining_contracts(user_id);
create index if not exists mining_contracts_status_idx on public.mining_contracts(status);

grant select, insert on public.mining_contracts to authenticated;
grant all on public.mining_contracts to service_role;

alter table public.mining_contracts enable row level security;

drop policy if exists "mining_contracts owner read" on public.mining_contracts;
create policy "mining_contracts owner read" on public.mining_contracts
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "mining_contracts admin write" on public.mining_contracts;
create policy "mining_contracts admin write" on public.mining_contracts
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

do $$ begin
  alter table public.wallet_balances
    add constraint wallet_balances_user_coin_uniq unique (user_id, coin);
exception when duplicate_object then null;
         when duplicate_table then null;
         when others then null;
end $$;

create or replace function public._mining_credit_coin(
  _user_id uuid, _coin text, _amount numeric
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallet_balances(user_id, coin, available, staked)
  values (_user_id, _coin, _amount, 0)
  on conflict (user_id, coin)
  do update set available = public.wallet_balances.available + excluded.available,
                updated_at = now();
end $$;

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
begin
  if _uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if _amount_usd is null or _amount_usd <= 0 then raise exception 'invalid amount'; end if;

  select * into _proj from public.mining_projects where id = _project_id;
  if not found then raise exception 'project not found'; end if;
  if _proj.status <> 'active' then raise exception 'project not available'; end if;
  if _amount_usd < _proj.min_amount then
    raise exception 'amount below minimum (% USD)', _proj.min_amount;
  end if;
  if _proj.max_amount is not null and _amount_usd > _proj.max_amount then
    raise exception 'amount above maximum (% USD)', _proj.max_amount;
  end if;

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

  insert into public.mining_contracts(
    user_id, project_id, coin, amount_usd, daily_rate, lock_days, ends_at
  ) values (
    _uid, _proj.id, _proj.coin, _amount_usd, _proj.daily_rate, _proj.lock_days,
    now() + (_proj.lock_days || ' days')::interval
  ) returning id into _contract_id;

  insert into public.notifications(user_id, title, body)
  values (_uid, 'Mining contract started',
          format('Your %s mining contract for $%s is now active for %s days.',
                 _proj.coin, _amount_usd::text, _proj.lock_days));

  return _contract_id;
end $$;

revoke all on function public.create_mining_contract(uuid, numeric) from public;
grant execute on function public.create_mining_contract(uuid, numeric) to authenticated;

create or replace function public.settle_mining_contract(
  _contract_id uuid,
  _coin_price_usd numeric
) returns public.mining_contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _c public.mining_contracts%rowtype;
  _total_reward_usd numeric;
  _reward_coin numeric;
begin
  if _uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if _coin_price_usd is null or _coin_price_usd <= 0 then raise exception 'invalid coin price'; end if;

  select * into _c from public.mining_contracts where id = _contract_id for update;
  if not found then raise exception 'contract not found'; end if;
  if _c.user_id <> _uid and not public.has_role(_uid, 'admin') then
    raise exception 'forbidden';
  end if;
  if _c.status not in ('active','matured') then
    raise exception 'contract not settleable (status=%)', _c.status;
  end if;
  if now() < _c.ends_at then raise exception 'contract not yet matured'; end if;

  _total_reward_usd := _c.amount_usd * (_c.daily_rate/100.0) * _c.lock_days;
  _reward_coin := _total_reward_usd / _coin_price_usd;

  update public.fiat_balances
    set available = available + _c.amount_usd, updated_at = now()
    where user_id = _c.user_id and currency = 'USD';
  if not found then
    insert into public.fiat_balances(user_id, currency, available)
    values (_c.user_id, 'USD', _c.amount_usd);
  end if;

  perform public._mining_credit_coin(_c.user_id, _c.coin, _reward_coin);

  update public.mining_contracts
    set status = 'completed',
        reward_credited_coin = _reward_coin,
        coin_price_at_settle = _coin_price_usd,
        settled_at = now()
    where id = _contract_id
    returning * into _c;

  insert into public.notifications(user_id, title, body)
  values (_c.user_id, 'Mining contract matured',
          format('Your %s mining contract matured. Principal $%s returned and %s %s credited.',
                 _c.coin, _c.amount_usd::text, _reward_coin::text, _c.coin));

  return _c;
end $$;

revoke all on function public.settle_mining_contract(uuid, numeric) from public;
grant execute on function public.settle_mining_contract(uuid, numeric) to authenticated;

insert into public.mining_projects (name, coin, daily_rate, lock_days, min_amount, max_amount, description, sort_order)
select * from (values
  ('Bitcoin Mining Starter','BTC',0.50::numeric,90,100::numeric,50000::numeric,'Earn BTC daily from a 90-day mining contract.',1),
  ('Ethereum Mining Pro','ETH',0.45::numeric,120,250::numeric,100000::numeric,'Steady ETH yield over 120 days.',2),
  ('Solana High-Yield','SOL',0.80::numeric,60,100::numeric,30000::numeric,'Higher rate, shorter lock SOL mining.',3),
  ('Dogecoin Mining','DOGE',1.00::numeric,30,50::numeric,10000::numeric,'Short-term DOGE mining.',4),
  ('Litecoin Mining','LTC',0.55::numeric,90,100::numeric,40000::numeric,'Classic LTC mining contract.',5),
  ('XRP Mining','XRP',0.70::numeric,60,100::numeric,20000::numeric,'Earn XRP every day.',6),
  ('USDT Mining (Stable)','USDT',0.35::numeric,180,500::numeric,200000::numeric,'Conservative stablecoin mining.',7)
) as v(name,coin,daily_rate,lock_days,min_amount,max_amount,description,sort_order)
where not exists (select 1 from public.mining_projects);
