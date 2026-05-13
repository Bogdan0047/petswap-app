import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendPetSwapEmail } from "@/lib/sendAppEmail";
import { redeemPendingReferral } from "@/lib/referrals";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** True until the initial getSession() has resolved. */
  loading: boolean;
  /** True once we've heard back from Supabase at least once (online or cached). */
  initialized: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  initialized: false,
  signOut: async () => {},
});

/**
 * Translates Supabase auth errors into friendly UI copy.
 * Used by Auth.tsx + ResetPassword.tsx — keep messages short.
 *
 * MANUAL TEST CHECKLIST (auth lifecycle):
 *  - Login → close app → reopen → still logged in
 *  - Login → refresh page → still logged in
 *  - Login → wait 1 hour → still logged in (token refresh)
 *  - Logout → cannot access protected pages
 *  - Offline reopen → previous session preserved (no flash to /auth)
 *  - Expired token → autoRefreshToken kicks in
 *  - Reset password → /reset-password exchanges code → updateUser works
 *  - Signup confirmation → email link returns to /auth → session created
 */
export function friendlyAuthError(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Something went wrong. Please try again.";
  const lower = msg.toLowerCase();

  if (lower.includes("invalid login") || lower.includes("invalid credentials"))
    return "Wrong email or password. Please try again.";
  if (lower.includes("email not confirmed") || lower.includes("not confirmed"))
    return "Please confirm your email — check your inbox for the link.";
  if (lower.includes("already registered") || lower.includes("user already"))
    return "That email is already registered. Try signing in instead.";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (lower.includes("network") || lower.includes("failed to fetch"))
    return "Network error. Check your connection and try again.";
  if (lower.includes("expired") || lower.includes("invalid token"))
    return "This link has expired. Request a new one to continue.";
  if (lower.includes("password") && lower.includes("short"))
    return "Password is too short. Use at least 8 characters.";
  if (lower.includes("weak") && lower.includes("password"))
    return "Please choose a stronger password.";

  return msg;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const queryClient = useQueryClient();
  // Guard against React StrictMode double-mount creating duplicate listeners.
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;
    let cancelled = false;

    console.log("AUTH START");
    console.log("[auth] AuthProvider mounted — calling getSession()");

    // CRITICAL: subscribe BEFORE getSession to avoid losing the first event.
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      if (cancelled) return;

      console.log(`[auth] onAuthStateChange event=${evt} hasSession=${!!s}`);
      if (import.meta.env.DEV && evt === "SIGNED_IN") {
        const provider = s?.user.app_metadata?.provider;
        if (provider === "google") console.log("GOOGLE_OAUTH_CALLBACK_SUCCESS", { userId: s.user.id });
      }

      // Handle every relevant event explicitly so the contract is obvious.
      switch (evt) {
        case "INITIAL_SESSION":
        case "SIGNED_IN":
        case "TOKEN_REFRESHED":
        case "USER_UPDATED":
        case "MFA_CHALLENGE_VERIFIED":
        case "PASSWORD_RECOVERY":
          setSession(s);
          break;
        case "SIGNED_OUT":
          console.log("[auth] SIGNED_OUT — clearing session");
          setSession(null);
          break;
        default:
          // Any unrecognised event: keep last known good session in place.
          if (s) setSession(s);
      }
      setLoading(false);
      setInitialized(true);

      // Welcome email exactly once per signup. The send-petswap-email function
      // is ONE_TIME for 'welcome' so this is double-safe.
      if (evt === "SIGNED_IN" && s?.user) {
        const justSignedUp = sessionStorage.getItem("petswap_just_signed_up");
        if (justSignedUp === "1") {
          sessionStorage.removeItem("petswap_just_signed_up");
          void sendPetSwapEmail({
            userId: s.user.id,
            emailType: "welcome",
            dedupeKey: "welcome-once",
            idempotencyKey: `welcome-${s.user.id}`,
          });
          void redeemPendingReferral();
        }
      }
    });

    // Resolve the cached session synchronously where possible. If the network
    // call to refresh fails (offline), Supabase still returns the stored
    // session so we stay logged in — exactly what the spec requires.
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Don't destroy the session on a single transient error.
          console.warn("[auth] getSession error (kept cached session):", error.message);
        }
        if (data.session) {
          console.log("SESSION FOUND", { userId: data.session.user.id });
        } else {
          console.log("NO SESSION");
        }
        setSession((prev) => prev ?? data.session ?? null);
      })
      .catch((e: AuthError | Error) => {
        console.warn("[auth] getSession threw (kept cached session):", e?.message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setInitialized(true);
        console.log("AUTH LOADING DONE");
      });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      subscribedRef.current = false;
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[auth] signOut network error (clearing local state anyway):", e);
    }
    setSession(null);
    // Wipe React Query cache so no other user's private data lingers.
    try { queryClient.clear(); } catch { /* noop */ }
    // Wipe sessionStorage flags. Leave localStorage intact for theme/etc.
    try {
      sessionStorage.removeItem("petswap_just_signed_up");
    } catch { /* noop */ }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        initialized,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
