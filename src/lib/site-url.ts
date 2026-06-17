// Canonical production URL for auth email redirects.
// Auth emails (signup confirm, password reset) always link here so users
// land on the live site instead of preview/localhost URLs.
export const SITE_URL = "https://www.haratrading.com";

export function siteUrl(path: string = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}
