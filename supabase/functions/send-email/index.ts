// Centralized email sender. Every system email (auth, deposits, withdrawals,
// announcements, mining, security, admin) goes through this single function.
//
// Actions:
//   - { action: "test", to }                       → send branded test email
//   - { action: "send", to, subject, html|text }   → ad-hoc branded send
//   - { action: "template", to, templateKey, vars }→ render saved template + send
//   - { action: "broadcast", subject, html, test_to? } → email all users (or test)
//
// SMTP credentials are read from env vars first, then DB email_settings as
// fallback. Nothing is hardcoded.

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { wrap, renderVars, type BrandOptions } from "./layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

interface SmtpConfig {
  host: string; port: number; user: string; pass: string;
  encryption: "none" | "ssl" | "tls";
  fromEmail: string; fromName: string; replyTo?: string;
}

interface BrandConfig extends BrandOptions {}

async function loadConfig(): Promise<{ smtp: SmtpConfig; brand: BrandConfig }> {
  // env first
  const envHost = Deno.env.get("SMTP_HOST");
  let smtp: SmtpConfig | null = null;
  if (envHost) {
    smtp = {
      host: envHost,
      port: Number(Deno.env.get("SMTP_PORT") ?? 587),
      user: Deno.env.get("SMTP_USER") ?? "",
      pass: Deno.env.get("SMTP_PASS") ?? "",
      encryption: (Deno.env.get("SMTP_ENCRYPTION") ?? "tls") as SmtpConfig["encryption"],
      fromEmail: Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USER") ?? "",
      fromName: Deno.env.get("SMTP_FROM_NAME") ?? "Haratrading",
      replyTo: Deno.env.get("SMTP_REPLY_TO") ?? undefined,
    };
  }

  // DB fallback / merge
  const { data: row } = await admin.from("email_settings").select("*").eq("id", 1).maybeSingle();
  if (!smtp && row) {
    smtp = {
      host: row.smtp_host, port: row.smtp_port ?? 587,
      user: row.smtp_user ?? "", pass: row.smtp_pass ?? "",
      encryption: (row.smtp_encryption ?? "tls") as SmtpConfig["encryption"],
      fromEmail: row.from_email, fromName: row.from_name ?? "Haratrading",
      replyTo: row.reply_to ?? undefined,
    };
  }
  if (!smtp || !smtp.host || !smtp.fromEmail) {
    throw new Error("SMTP not configured. Set SMTP_HOST/PORT/USER/PASS/FROM env vars or admin email_settings row.");
  }

  const brand: BrandConfig = {
    siteName: Deno.env.get("BRAND_NAME") ?? "Haratrading",
    siteUrl:  Deno.env.get("BRAND_URL")  ?? "https://www.haratrading.com",
    logoUrl:  Deno.env.get("BRAND_LOGO_URL") ?? "https://www.haratrading.com/logo.png",
    supportEmail: Deno.env.get("SUPPORT_EMAIL") ?? smtp.fromEmail,
    primaryColor: Deno.env.get("BRAND_COLOR") ?? "#f59e0b",
  };
  return { smtp, brand };
}

async function newClient(smtp: SmtpConfig): Promise<SMTPClient> {
  return new SMTPClient({
    connection: {
      hostname: smtp.host,
      port: smtp.port,
      tls: smtp.encryption === "ssl" || smtp.encryption === "tls",
      auth: smtp.user ? { username: smtp.user, password: smtp.pass } : undefined,
    },
  });
}

async function log(row: { recipient: string; subject: string; template_key?: string | null; status: "sent" | "failed"; error?: string | null }) {
  try {
    await admin.from("email_logs").insert({
      recipient: row.recipient,
      subject: row.subject,
      template_key: row.template_key ?? null,
      status: row.status,
      error: row.error ?? null,
    });
  } catch (_) { /* logging is best-effort */ }
}

async function sendOne(client: SMTPClient, smtp: SmtpConfig, brand: BrandConfig, opts: {
  to: string; subject: string; html: string; templateKey?: string | null;
}) {
  // Extract base64 data: images from the body and convert them into inline
  // CID attachments. Many SMTP servers and mail clients reject or strip
  // emails whose HTML contains huge inline data:URIs, leading to a blank
  // delivered message. Inline CID attachments are the universally supported
  // way to embed images in HTML email.
  const { html: htmlForBody, attachments } = extractInlineImages(opts.html);
  const wrapped = wrap(htmlForBody, brand);
  try {
    await client.send({
      from: `${smtp.fromName} <${smtp.fromEmail}>`,
      to: opts.to,
      replyTo: smtp.replyTo,
      subject: opts.subject,
      content: stripHtml(htmlForBody),
      html: wrapped,
      attachments: attachments.length ? attachments : undefined,
    });
    await log({ recipient: opts.to, subject: opts.subject, template_key: opts.templateKey ?? null, status: "sent" });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await log({ recipient: opts.to, subject: opts.subject, template_key: opts.templateKey ?? null, status: "failed", error: msg });
    return { ok: false, error: msg };
  }
}

// deno-lint-ignore no-explicit-any
function extractInlineImages(html: string): { html: string; attachments: any[] } {
  // deno-lint-ignore no-explicit-any
  const attachments: any[] = [];
  let idx = 0;
  const out = html.replace(/src=("|')data:(image\/[a-zA-Z0-9+.-]+);base64,([^"']+)\1/g, (_m, q, mime, b64) => {
    idx++;
    const cid = `img${idx}.${Date.now()}@haratrading`;
    const ext = (mime.split("/")[1] || "png").toLowerCase().replace("+xml", "");
    attachments.push({
      filename: `image-${idx}.${ext}`,
      content: b64,
      encoding: "base64",
      contentType: mime,
      contentDisposition: "inline",
      contentID: cid,
    });
    return `src=${q}cid:${cid}${q}`;
  });
  return { html: out, attachments };
}

function stripHtml(s: string): string {
  return s.replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ").trim();
}

async function loadTemplate(key: string) {
  const { data, error } = await admin.from("email_templates").select("*").eq("key", key).maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body?.action as string;
    const { smtp, brand } = await loadConfig();
    const client = await newClient(smtp);

    try {
      if (action === "test") {
        const to = String(body.to ?? "");
        if (!to) throw new Error("Missing 'to'");
        const html = `<h1 class="h1" style="margin:0 0 12px 0;color:#111827;font-size:24px;">SMTP test successful 🎉</h1>
          <p>If you're reading this, your <strong>${brand.siteName}</strong> SMTP configuration is working correctly.</p>
          <p style="color:#6b7280;font-size:13px;">Sent from server at ${new Date().toISOString()}</p>`;
        const r = await sendOne(client, smtp, brand, { to, subject: `[${brand.siteName}] SMTP test`, html });
        return jsonRes(r);
      }

      if (action === "send") {
        const to = String(body.to ?? "");
        const subject = String(body.subject ?? "");
        const html = String(body.html ?? body.text ?? "");
        if (!to || !subject || !html) throw new Error("Missing to/subject/html");
        const r = await sendOne(client, smtp, brand, { to, subject, html });
        return jsonRes(r);
      }

      if (action === "template") {
        const to = String(body.to ?? "");
        const key = String(body.templateKey ?? "");
        const vars = (body.vars ?? {}) as Record<string, unknown>;
        if (!to || !key) throw new Error("Missing to/templateKey");
        const tmpl = await loadTemplate(key);
        if (!tmpl || !tmpl.active) {
          return jsonRes({ ok: false, error: `Template '${key}' not found or inactive` }, 404);
        }
        const merged = { site_name: brand.siteName, support_email: brand.supportEmail, login_url: `${brand.siteUrl}/login`, date: new Date().toLocaleDateString(), ...vars };
        const subject = renderVars(tmpl.subject ?? "", merged);
        const html = renderVars(tmpl.body ?? "", merged);
        const r = await sendOne(client, smtp, brand, { to, subject, html, templateKey: key });
        return jsonRes(r);
      }

      if (action === "broadcast") {
        const subject = String(body.subject ?? "");
        const html = String(body.html ?? "");
        const testTo = body.test_to ? String(body.test_to) : null;
        const announcementId = body.announcement_id ?? null;
        if (!subject || !html) throw new Error("Missing subject/html");

        const recipients: string[] = [];
        if (testTo) {
          recipients.push(testTo);
        } else {
          // Pull all confirmed users from auth.users via admin API
          let page = 1; const perPage = 1000;
          // deno-lint-ignore no-explicit-any
          while (true) {
            const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
            if (error) throw error;
            for (const u of data.users) {
              if (u.email && (u.email_confirmed_at || u.confirmed_at)) recipients.push(u.email);
            }
            if (data.users.length < perPage) break;
            page++;
          }
        }

        let sent = 0, failed = 0;
        for (const to of recipients) {
          const r = await sendOne(client, smtp, brand, { to, subject, html, templateKey: "announcement" });
          if (r.ok) sent++; else failed++;
        }

        if (announcementId && !testTo) {
          await admin.from("announcements").update({
            status: failed === 0 ? "sent" : "partial",
            recipients_count: sent,
            failed_count: failed,
            sent_at: new Date().toISOString(),
          }).eq("id", announcementId);
        }

        return jsonRes({ ok: true, sent, failed, total: recipients.length });
      }

      return jsonRes({ ok: false, error: "Unknown action" }, 400);
    } finally {
      try { await client.close(); } catch (_) { /* ignore */ }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonRes({ ok: false, error: msg }, 500);
  }
});

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
