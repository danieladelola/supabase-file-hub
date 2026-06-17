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
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(opts.siteName)}</title>
    <style>
      @media (max-width: 620px) {
        .container { width: 100% !important; padding: 16px !important; }
        .card      { padding: 20px !important; }
        .h1        { font-size: 22px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
          <tr><td align="center" style="padding:0 0 24px 0;">
            <a href="${escapeAttr(opts.siteUrl)}" style="text-decoration:none;display:inline-block;">
              <img src="${escapeAttr(opts.logoUrl)}" alt="${escapeAttr(opts.siteName)}" height="40" style="height:40px;display:block;border:0;outline:none;" />
            </a>
          </td></tr>
          <tr><td class="card" style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid #eef0f4;">
            <div style="color:#111827;line-height:1.55;font-size:15px;">${innerHtml}</div>
          </td></tr>
          <tr><td style="padding:24px 8px;text-align:center;color:#6b7280;font-size:12px;line-height:1.6;">
            <div style="margin-bottom:6px;">
              <a href="${escapeAttr(opts.siteUrl)}" style="color:${primary};text-decoration:none;font-weight:600;">${escapeHtml(opts.siteName)}</a>
            </div>
            <div>Need help? <a href="mailto:${escapeAttr(opts.supportEmail)}" style="color:#6b7280;">${escapeHtml(opts.supportEmail)}</a></div>
            <div style="margin-top:8px;">© ${year} ${escapeHtml(opts.siteName)}. All rights reserved.</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
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
