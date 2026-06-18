import { supabase } from "@/integrations/supabase/client";

// Centralized client-side mail helper. Every email in the app — auth,
// deposits, withdrawals, mining, security, admin, announcements — goes
// through the `send-email` edge function which applies the brand layout.
//
// No SMTP credentials live in the client. The edge function reads them
// from env vars (or the email_settings table as fallback).

export type TemplateKey =
  | "signup_confirm"
  | "email_verify"
  | "password_reset"
  | "login_alert"
  | "deposit_received"
  | "deposit_confirmed"
  | "withdrawal_requested"
  | "withdrawal_completed"
  | "investment_started"
  | "investment_payout"
  | "mining_started"
  | "mining_payout"
  | "security_alert"
  | "admin_notice"
  | "announcement";

export interface SendResult { ok: boolean; error?: string; sent?: number; failed?: number; total?: number }

export async function sendTemplate(
  templateKey: TemplateKey,
  to: string,
  vars: Record<string, unknown> = {},
): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { action: "template", to, templateKey, vars },
  });
  if (error) return { ok: false, error: error.message };
  return data as SendResult;
}

export async function sendMail(to: string, subject: string, html: string): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { action: "send", to, subject, html },
  });
  if (error) return { ok: false, error: error.message };
  return data as SendResult;
}

export async function sendTest(to: string): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { action: "test", to },
  });
  if (error) return { ok: false, error: error.message };
  return data as SendResult;
}

export async function broadcast(opts: {
  subject: string; html: string; test_to?: string | string[]; announcement_id?: string;
}): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { action: "broadcast", ...opts },
  });
  if (error) return { ok: false, error: error.message };
  return data as SendResult;
}