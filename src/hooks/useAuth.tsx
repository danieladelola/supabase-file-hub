import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "user";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  roles: Role[];
  isAdmin: boolean;
  emailConfirmed: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  async function syncEmailVerification(nextUser: User | null) {
    if (!nextUser) return;
    const emailVerified = !!nextUser.email_confirmed_at;
    await supabase
      .from("profiles")
      .update({ email_verified: emailVerified })
      .eq("id", nextUser.id)
      .neq("email_verified", emailVerified);
  }

  useEffect(() => {
    // Set listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock
        setTimeout(() => {
          void syncEmailVerification(sess.user);
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", sess.user.id)
            .then(({ data }) => setRoles((data ?? []).map((r: any) => r.role)));
          // Record login event (best-effort; silent on failure)
          if (event === "SIGNED_IN") {
            supabase.rpc("record_login", { _ip: undefined, _ua: navigator.userAgent }).then(() => {});
          }
        }, 0);
      } else {
        setRoles([]);
      }
    });

    // Then check existing
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        void syncEmailVerification(sess.user);
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", sess.user.id)
          .then(({ data }) => setRoles((data ?? []).map((r: any) => r.role)));
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{
        session,
        user,
        roles,
        isAdmin: roles.includes("admin"),
        emailConfirmed: !!user?.email_confirmed_at,
        loading,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
