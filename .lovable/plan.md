## Goal
Build one centralized, branded email pipeline used by every system notification, plus an Admin Announcements page that sends rich-text emails to users. SMTP credentials stay in env vars only.

## Architecture

```text
App / DB triggers ──► supabase.functions.invoke("send-email", { templateKey, to, vars })
                         │
                         ▼
            Edge Function: send-email  (Deno, deployed to external Supabase)
              ├─ reads email_settings (DB) OR SMTP_* env vars (env wins)
              ├─ loads email_templates[templateKey]  (subject + body)
              ├─ wraps body in shared BrandLayout (logo, footer, responsive)
              ├─ renders {{vars}} (user_name, amount, link, etc.)
              ├─ sends via SMTP (denomailer)
              └─ writes row to email_logs (status, error, template_key)
```

Single function = single template = single SMTP path. No per-feature SMTP code anywhere in the app.

## Backend (Supabase)

1. **Edge function** `supabase/functions/send-email/index.ts`
   - Actions: `test`, `send` (single recipient), `broadcast` (announcement → all users), `template` (render by key).
   - Uses `denomailer` for SMTP.
   - SMTP creds resolution order: `Deno.env.get("SMTP_HOST"|"SMTP_PORT"|"SMTP_USER"|"SMTP_PASS"|"SMTP_FROM"|"SMTP_FROM_NAME"|"SMTP_ENCRYPTION")` → fallback to `email_settings` row.
   - Logs every attempt to `email_logs`.

2. **Shared layout** `supabase/functions/send-email/layout.ts`
   - `wrap(bodyHtml, { siteName, logoUrl, supportEmail })`
   - Responsive HTML email (max-width 600px, mobile media query, system font stack, brand colors from project).
   - Header with logo, hero title, content slot, divider, footer (site name • support email • © year).

3. **SQL migration** `db/email_announcements.sql`
   - `announcements` table (id, subject, body_html, sent_by, recipients_count, status, created_at).
   - Seed/upsert default `email_templates` rows for every system event: `signup_confirm`, `email_verify`, `password_reset`, `login_alert`, `deposit_received`, `deposit_confirmed`, `withdrawal_requested`, `withdrawal_completed`, `investment_started`, `investment_payout`, `mining_started`, `mining_payout`, `security_alert`, `admin_notice`, `announcement`.
   - GRANTs + RLS (admin-only write, service_role full).

## Frontend

4. **Admin Announcements page** `src/pages/admin/AdminAnnouncements.tsx`
   - Subject input
   - Rich text editor (TipTap — small, already-friendly with shadcn) with bold/italic/link/list/heading toolbar
   - "Send test" (input email)
   - "Send to all users"
   - History table (from `announcements` + linked `email_logs`)
   - Route added in `src/router.tsx` + sidebar link in `AdminLayout`.

5. **Centralized client helper** `src/lib/mail.ts`
   - `sendMail(templateKey, to, vars)` → invokes `send-email`.
   - All existing call sites that send emails (deposits, withdrawals, KYC, login alerts, etc.) switch to this helper. No SMTP details on the client.

6. **Env**
   - Add SMTP_* placeholders to `.env.example`.
   - `.env` keeps Supabase keys; SMTP secrets are set in Supabase function secrets (documented in chat — never committed).

## Verification
- Send test email from Admin → SMTP tab (already exists) using new function.
- Send test announcement.
- Trigger one deposit + one withdrawal flow and confirm `email_logs` rows = `sent`.

## Notes / Tradeoffs
- Project uses an **external** Supabase, so I'll write the edge function + SQL files into the repo; you'll need to run `supabase functions deploy send-email` and apply `db/email_announcements.sql` against your Supabase project once. I'll print the exact commands.
- SMTP password goes into Supabase function secrets (`supabase secrets set SMTP_PASS=...`), not the repo `.env`.
- Rich text stored as sanitized HTML; emails are the same HTML wrapped in the brand layout.

Confirm and I'll build it.