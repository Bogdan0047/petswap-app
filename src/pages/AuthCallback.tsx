import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSafeAuthNext } from "@/lib/authRedirect";
import AuthLoadingScreen from "@/components/AuthLoadingScreen";

const devLog = (event: string, data?: unknown) => {
  if (import.meta.env.DEV) console.log(`[oauth] ${event}`, data ?? "");
};

/**
 * OAuth return route. Lovable-managed OAuth sets the session before we land
 * here; we just read it and forward the user to /home (or ?next=).
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    devLog("OAUTH_CALLBACK_RECEIVED", { search: window.location.search });
    let cancelled = false;
    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (data.session?.user) {
        devLog("OAUTH_SESSION_CREATED", { userId: data.session.user.id });
        toast.dismiss();
        navigate("/home", { replace: true });
        return;
      }
      const next = getSafeAuthNext(params.get("next"), "/home");
      const err = params.get("error") || params.get("error_description");
      if (err) {
        console.error("OAUTH_CALLBACK_ERROR", { err, search: window.location.search });
        devLog("OAUTH_ERROR", err);
        toast.error(`Sign-in failed: ${err}`, { duration: 10000 });
        navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }
      if (error || !data.session) {
        const msg = error?.message ?? "no session returned from provider";
        console.error("OAUTH_CALLBACK_NO_SESSION", { error, search: window.location.search });
        devLog("OAUTH_ERROR", msg);
        toast.error(`Sign-in failed: ${msg}`, { duration: 10000 });
        navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
        return;
      }
    });
    return () => { cancelled = true; };
  }, [navigate, params]);

  return <AuthLoadingScreen />;
};

export default AuthCallback;
