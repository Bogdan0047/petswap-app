import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import AuthLoadingScreen from "@/components/AuthLoadingScreen";

interface RequireAuthProps {
  children: ReactNode;
}

type Status = "checking" | "ok" | "blocked";

/**
 * Gate for protected routes. Order of operations:
 *  1. Wait for AuthProvider's initial getSession() to finish (no flash to /auth).
 *  2. If no session → bounce to /auth?next=<originalPath>.
 *  3. If session → check soft-delete account status; while checking, keep showing
 *     the same premium splash (no white flash, no protected screens leak).
 *  4. If status is "pending_deletion" → bounce to /auth so the recovery UI shows.
 */
const RequireAuth = ({ children }: RequireAuthProps) => {
  const { session, loading, initialized } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<Status>("checking");
  const [sessionReady, setSessionReady] = useState(false);
  const [verifiedSession, setVerifiedSession] = useState(session);

  useEffect(() => {
    let cancelled = false;
    setSessionReady(false);
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setVerifiedSession(session ?? data.session ?? null);
      setSessionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const effectiveSession = session ?? verifiedSession;

  useEffect(() => {
    if (loading || !initialized || !sessionReady) return;
    if (!effectiveSession) {
      setStatus("ok"); // handled by the redirect below
      return;
    }
    let cancelled = false;
    setStatus("checking");
    (async () => {
      try {
        const { data } = await supabase.rpc("get_account_status");
        if (cancelled) return;
        const s = data as { status?: string } | null;
        if (s?.status === "pending_deletion" || s?.status === "deleted") {
          setStatus("blocked");
        } else {
          setStatus("ok");
        }
      } catch {
        // Offline / transient backend error — don't kick the user out.
        if (!cancelled) setStatus("ok");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, initialized, sessionReady, effectiveSession]);

  // Auth still resolving OR account-status still checking → premium splash.
  if (loading || !initialized || !sessionReady || (effectiveSession && status === "checking")) {
    return <AuthLoadingScreen />;
  }

  if (!effectiveSession) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  if (status === "blocked") {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
