// Shared branded email layout. Returns full HTML document.
// All system emails (auth, deposits, withdrawals, announcements, etc.)
// MUST pass through this wrapper so branding stays consistent.

export interface BrandOptions {
  siteName: string;
  siteUrl: string;
  logoUrl: string;
  supportEmail: string;
  primaryColor?: string;
  preheader?: string;
}

export function wrap(innerHtml: string, opts: BrandOptions): string {
  const primary = opts.primaryColor ?? "#7E57DF";
  const accent = "#00BCD4";
  const year = new Date().getFullYear();
  const name = escapeHtml(opts.siteName);
  const url = escapeAttr(opts.siteUrl);
  const support = escapeAttr(opts.supportEmail);

  const logoUrl = `${url}/__l5e/assets-v1/9186068a-a105-4a50-969c-493012240c00/hara-trading-logo.png`;

  // Minified single-line HTML to avoid SMTP quoted-printable soft-break artifacts
  // (e.g. stray "=20" appearing in some mail clients).
  const html =
`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="x-apple-disable-message-reformatting"><title>${name}</title>`+
`<style>@media only screen and (max-width:620px){.email-wrap{padding:16px 8px !important;}.email-card{width:100% !important;max-width:100% !important;border-radius:12px !important;}.email-head{padding:20px 16px !important;}.email-body{padding:24px 18px !important;font-size:15px !important;}.email-foot{padding:0 18px 24px 18px !important;}.email-divider{padding:0 18px 20px 18px !important;}.email-body img{max-width:100% !important;height:auto !important;}.email-brand{font-size:20px !important;}.email-logo-img{max-height:48px !important;}}</style></head>`+
`<body style="margin:0;padding:0;background:#0b1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;width:100%;">`+
(opts.preheader?`<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>`:"")+
`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-wrap" style="background:#0b1220;padding:40px 12px;width:100%;"><tr><td align="center">`+
`<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" class="email-card" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px -20px rgba(0,0,0,.45);">`+
`<tr><td class="email-head" style="background:linear-gradient(135deg,#7E57DF 0%,#6B4FD1 50%,#5C4DB8 100%);padding:28px 32px;text-align:center;">`+
`<a href="${url}" class="email-brand" style="text-decoration:none;display:inline-block;">`+
`<img src="${logoUrl}" alt="${name}" class="email-logo-img" style="max-height:56px;width:auto;display:block;margin:0 auto;filter:brightness(0) invert(1);" /></a></td></tr>`+
`<tr><td class="email-body" style="padding:36px 36px 28px 36px;color:#111827;line-height:1.6;font-size:15px;word-break:break-word;">${innerHtml}</td></tr>`+
`<tr><td class="email-divider" style="padding:0 36px 32px 36px;"><div style="height:1px;background:#eef0f4;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>`+
`<tr><td class="email-foot" style="padding:0 36px 32px 36px;text-align:center;color:#6b7280;font-size:12px;line-height:1.7;">`+
`<div style="margin-bottom:6px;"><a href="${url}" style="color:${accent};text-decoration:none;font-weight:700;">${name}</a></div>`+
`<div>Need help? <a href="mailto:${support}" style="color:#6b7280;">${support}</a></div>`+
`<div style="margin-top:8px;color:#9ca3af;">&copy; ${year} ${name}. All rights reserved.</div>`+
`</td></tr></table></td></tr></table></body></html>`;
  return html;
}

export function renderVars(tmpl: string, vars: Record<string, unknown>): string {
  return tmpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function escapeAttr(s: string): string { return escapeHtml(s); }

