-- ============================================================================
-- Centralized email system: settings, templates, logs, announcements
-- Run this against your Supabase project once.
-- ============================================================================

-- email_settings (single row, id=1). Optional fallback when env vars not set.
create table if not exists public.email_settings (
  id              integer primary key default 1,
  enabled         boolean not null default true,
  mail_driver     text default 'smtp',
  smtp_host       text,
  smtp_port       integer default 587,
  smtp_user       text,
  smtp_pass       text,
  smtp_encryption text default 'tls',
  from_email      text,
  from_name       text default 'Haratrading',
  reply_to        text,
  updated_at      timestamptz default now(),
  constraint email_settings_singleton check (id = 1)
);
grant select, insert, update on public.email_settings to authenticated;
grant all on public.email_settings to service_role;
alter table public.email_settings enable row level security;

-- email_templates
create table if not exists public.email_templates (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  name       text not null,
  subject    text not null,
  body       text not null,
  active     boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant select on public.email_templates to authenticated;
grant all on public.email_templates to service_role;
alter table public.email_templates enable row level security;

-- email_logs
create table if not exists public.email_logs (
  id           uuid primary key default gen_random_uuid(),
  recipient    text not null,
  subject      text,
  template_key text,
  status       text not null,
  error        text,
  created_at   timestamptz default now()
);
grant select on public.email_logs to authenticated;
grant all on public.email_logs to service_role;
alter table public.email_logs enable row level security;

-- announcements
create table if not exists public.announcements (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  body_html        text not null,
  sent_by          uuid references auth.users(id),
  status           text not null default 'draft', -- draft | sent | partial | failed
  recipients_count integer default 0,
  failed_count     integer default 0,
  sent_at          timestamptz,
  created_at       timestamptz default now()
);
grant select, insert, update on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;

-- RLS policies (admin role via has_role helper if present)
do $$ begin
  if not exists (select 1 from pg_policies where tablename='email_settings' and policyname='admin_all_settings') then
    create policy admin_all_settings on public.email_settings for all to authenticated
      using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename='email_templates' and policyname='admin_all_templates') then
    create policy admin_all_templates on public.email_templates for all to authenticated
      using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename='email_logs' and policyname='admin_view_logs') then
    create policy admin_view_logs on public.email_logs for select to authenticated
      using (public.has_role(auth.uid(), 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename='announcements' and policyname='admin_all_announcements') then
    create policy admin_all_announcements on public.announcements for all to authenticated
      using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
  end if;
exception when undefined_function then
  -- has_role() not yet created; skip and let admin create policies manually
  null;
end $$;

-- ----------------------------------------------------------------------------
-- Seed default templates for every system event
-- ----------------------------------------------------------------------------
insert into public.email_templates (key, name, subject, body, active) values
  ('signup_confirm',       'Signup confirmation',
    'Welcome to {{site_name}} — confirm your email',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Welcome, {{user_name}} 👋</h1><p>Thanks for joining <strong>{{site_name}}</strong>. Please confirm your email to activate your account.</p><p style="margin:24px 0;"><a href="{{verification_link}}" style="background:#f59e0b;color:#000;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm email</a></p><p style="color:#6b7280;font-size:13px;">If you did not create an account, ignore this email.</p>', true),
  ('email_verify',         'Email verification',
    'Verify your email for {{site_name}}',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Verify your email</h1><p>Click below to verify your email address.</p><p style="margin:24px 0;"><a href="{{verification_link}}" style="background:#f59e0b;color:#000;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Verify email</a></p>', true),
  ('password_reset',       'Password reset',
    'Reset your {{site_name}} password',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Password reset</h1><p>We received a request to reset your password.</p><p style="margin:24px 0;"><a href="{{reset_link}}" style="background:#f59e0b;color:#000;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Reset password</a></p><p style="color:#6b7280;font-size:13px;">If you didn''t request this, you can safely ignore this email.</p>', true),
  ('login_alert',          'Login alert',
    'New sign-in to your {{site_name}} account',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">New sign-in detected</h1><p>Hi {{user_name}}, your account was just accessed.</p><ul><li><strong>Time:</strong> {{date}}</li><li><strong>IP:</strong> {{ip}}</li><li><strong>Device:</strong> {{device}}</li></ul><p>If this wasn''t you, <a href="{{login_url}}">secure your account</a> immediately.</p>', true),
  ('deposit_received',     'Deposit received',
    'Deposit received — {{amount}} {{currency}}',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Deposit received</h1><p>Hi {{user_name}}, we''ve received your deposit and it''s being processed.</p><p><strong>Amount:</strong> {{amount}} {{currency}}<br/><strong>Transaction:</strong> {{transaction_id}}</p>', true),
  ('deposit_confirmed',    'Deposit confirmed',
    'Deposit confirmed — {{amount}} {{currency}}',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Deposit confirmed ✅</h1><p>Your deposit of <strong>{{amount}} {{currency}}</strong> has been credited to your wallet.</p><p>Transaction ID: {{transaction_id}}</p>', true),
  ('withdrawal_requested', 'Withdrawal requested',
    'Withdrawal request received',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Withdrawal request received</h1><p>Hi {{user_name}}, we received your withdrawal request for <strong>{{amount}} {{currency}}</strong>. It is pending review.</p>', true),
  ('withdrawal_completed', 'Withdrawal completed',
    'Withdrawal completed — {{amount}} {{currency}}',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Withdrawal completed</h1><p>Your withdrawal of <strong>{{amount}} {{currency}}</strong> has been processed.</p><p>Transaction ID: {{transaction_id}}</p>', true),
  ('investment_started',   'Investment started',
    'Your investment is active',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Investment active</h1><p>Hi {{user_name}}, your investment of <strong>{{amount}} {{currency}}</strong> in {{plan}} is now active.</p>', true),
  ('investment_payout',    'Investment payout',
    'Investment payout — {{amount}} {{currency}}',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Payout received</h1><p>You earned <strong>{{amount}} {{currency}}</strong> from {{plan}}.</p>', true),
  ('mining_started',       'Mining started',
    'Mining contract active',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Mining contract active</h1><p>Hi {{user_name}}, your {{plan}} mining contract is now active.</p>', true),
  ('mining_payout',        'Mining payout',
    'Mining payout — {{amount}} {{currency}}',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Mining payout</h1><p>You earned <strong>{{amount}} {{currency}}</strong> from your mining contract.</p>', true),
  ('security_alert',       'Security alert',
    'Security alert on your {{site_name}} account',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">Security alert</h1><p>{{message}}</p><p>If this wasn''t you, please <a href="{{login_url}}">secure your account</a>.</p>', true),
  ('admin_notice',         'Admin notice',
    '{{subject}}',
    '<h1 class="h1" style="margin:0 0 12px;font-size:24px;">{{subject}}</h1><div>{{message}}</div>', true),
  ('announcement',         'Announcement',
    '{{subject}}',
    '{{body}}', true)
on conflict (key) do update set
  name = excluded.name,
  subject = case when public.email_templates.subject = '' then excluded.subject else public.email_templates.subject end,
  updated_at = now();
