import { supabase } from "@/integrations/supabase/client";
import { siteUrl } from "@/lib/site-url";

export const POST_CONFIRM_PATH = "/app/profile?kyc=required";

export function buildAuthConfirmUrl(next: string = POST_CONFIRM_PATH) {
  return siteUrl(`/auth/confirm?next=${encodeURIComponent(next)}`);
}

export function getSafeNextPath(search: string, fallback: string = POST_CONFIRM_PATH) {
  const next = new URLSearchParams(search).get("next") ?? fallback;
  return next.startsWith("/") ? next : fallback;
}

export async function resendSignupConfirmation(email: string, next: string = POST_CONFIRM_PATH) {
  return supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: buildAuthConfirmUrl(next),
    },
  });
}