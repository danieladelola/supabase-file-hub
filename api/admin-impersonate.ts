import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const config = { runtime: "edge" };

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://tcvwysqgwlnvpmidupqi.supabase.co";
  const SERVICE_ROLE = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const PUBLISHABLE =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_G_OVo3KxlUOqeUgRImKIRQ_ZFFAZvKv";

  if (!SUPABASE_URL || !PUBLISHABLE) {
    return json({ error: "Server is missing Supabase URL/publishable key" }, 500);
  }
  if (!SERVICE_ROLE) {
    return json({ error: "Missing SERVICE_ROLE_KEY secret." }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  const { action, target_user_id, redirect_to, log_id, return_token } = body || {};

  let adminId: string | null = null;
  if (action !== "end_impersonation") {
    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, PUBLISHABLE, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    adminId = userRes.user.id;

    const { data: roleRows, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId);
    if (roleErr) return json({ error: roleErr.message }, 500);
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);
  }

  if (action === "confirm_email") {
    if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);
    const { error } = await admin.auth.admin.updateUserById(target_user_id, {
      email_confirm: true,
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "impersonate") {
    if (!target_user_id) return json({ error: "Missing target_user_id" }, 400);
    const { data: tu, error: tuErr } = await admin.auth.admin.getUserById(target_user_id);
    if (tuErr || !tu?.user?.email)
      return json({ error: tuErr?.message ?? "User not found" }, 404);
    const targetEmail = tu.user.email;

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
      options: { redirectTo: redirect_to },
    });
    if (linkErr || !link?.properties?.hashed_token)
      return json({ error: linkErr?.message ?? "Could not create link" }, 500);

    const returnTok = crypto.randomUUID();
    const { data: logRow } = await admin
      .from("impersonation_log")
      .insert({
        admin_id: adminId,
        target_user_id,
        return_token: returnTok,
        status: "active",
      })
      .select("id")
      .single();

    return json({
      token_hash: link.properties.hashed_token,
      verification_type: "magiclink",
      admin_id: adminId,
      target_user_id,
      email: targetEmail,
      return_token: returnTok,
      log_id: logRow?.id ?? null,
    });
  }

  if (action === "end_impersonation") {
    if (!return_token) return json({ error: "Missing return_token" }, 400);
    const { data: logRow, error: logErr } = await admin
      .from("impersonation_log")
      .select("id, admin_id, return_token, status")
      .eq("return_token", return_token)
      .maybeSingle();
    if (logErr || !logRow) return json({ error: "Invalid return token" }, 400);

    const { data: adminUser, error: adminErr } = await admin.auth.admin.getUserById(
      logRow.admin_id
    );
    if (adminErr || !adminUser?.user?.email)
      return json({ error: adminErr?.message ?? "Admin not found" }, 500);

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: adminUser.user.email,
      options: { redirectTo: redirect_to },
    });
    if (linkErr || !link?.properties?.hashed_token)
      return json({ error: linkErr?.message ?? "Could not create link" }, 500);

    if (log_id) {
      await admin
        .from("impersonation_log")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", log_id);
    }

    return json({
      token_hash: link.properties.hashed_token,
      verification_type: "magiclink",
    });
  }

  return json({ error: "Unknown action" }, 400);
}
