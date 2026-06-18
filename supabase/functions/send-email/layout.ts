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
  const primary = opts.primaryColor ?? "#f59e0b";
  const year = new Date().getFullYear();
  const name = escapeHtml(opts.siteName);
  const url = escapeAttr(opts.siteUrl);
  const support = escapeAttr(opts.supportEmail);
  // Minified single-line HTML to avoid SMTP quoted-printable soft-break artifacts
  // (e.g. stray "=20" appearing in some mail clients). Brand mark is rendered
  // as styled text so it always displays, even when remote images are blocked.
  const html =
`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${name}</title></head>`+
`<body style="margin:0;padding:0;background:#0b1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">`+
(opts.preheader?`<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>`:"")+
`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;padding:40px 12px;"><tr><td align="center">`+
`<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px -20px rgba(0,0,0,.45);">`+
`<tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 32px;text-align:center;">`+
`<a href="${url}" style="text-decoration:none;display:inline-block;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:.5px;">`+
`<span style="display:inline-block;width:32px;height:32px;line-height:32px;background:${primary};color:#0b1220;border-radius:8px;font-weight:900;margin-right:10px;vertical-align:middle;">H</span>`+
`<span style="vertical-align:middle;">${name}</span></a></td></tr>`+
`<tr><td style="padding:36px 36px 28px 36px;color:#111827;line-height:1.6;font-size:15px;">${innerHtml}</td></tr>`+
`<tr><td style="padding:0 36px 32px 36px;"><div style="height:1px;background:#eef0f4;"></div></td></tr>`+
`<tr><td style="padding:0 36px 32px 36px;text-align:center;color:#6b7280;font-size:12px;line-height:1.7;">`+
`<div style="margin-bottom:6px;"><a href="${url}" style="color:${primary};text-decoration:none;font-weight:700;">${name}</a></div>`+
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
