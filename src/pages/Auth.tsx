import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck, ArrowRight, Mail, Lock, Eye, EyeOff, Heart, Sparkles, Star, X, CheckCircle2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { buildOAuthRedirectUri, getSafeAuthNext } from "@/lib/authRedirect";
import { friendlyError } from "@/lib/friendlyError";
import petswapIcon from "@/assets/petswap-icon.png";

// Dev-only OAuth diagnostic log persisted across the OAuth redirect roundtrip.
type DebugEntry = { t: string; tag: string; data?: unknown };
const DEBUG_KEY = "petswap_oauth_debug";
const APPLE_ERROR_KEY = "petswap_apple_last_error";
const AUTH_EVENT_KEY = "petswap_last_auth_event";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const APPLE_NATIVE_REDIRECT_URI = `${window.location.origin}/auth/callback`;
const OAUTH_PENDING_KEY = "petswap_oauth_pending";

const pushDebug = (tag: string, data?: unknown) => {
  if (!import.meta.env.DEV) return;
  try {
    const safe = data instanceof Error ? { message: data.message, name: data.name } : data;
    console.log(tag, safe ?? "");
    const list: DebugEntry[] = JSON.parse(sessionStorage.getItem(DEBUG_KEY) || "[]");
    list.push({ t: new Date().toISOString().slice(11, 23), tag, data: safe });
    sessionStorage.setItem(DEBUG_KEY, JSON.stringify(list.slice(-30)));
  } catch { /* noop */ }
};
const readDebug = (): DebugEntry[] => {
  try { return JSON.parse(sessionStorage.getItem(DEBUG_KEY) || "[]"); } catch { return []; }
};
const clearDebug = () => { try { sessionStorage.removeItem(DEBUG_KEY); } catch { /* noop */ } };

const storeAppleError = (stage: string, message: string) => {
  try {
    sessionStorage.setItem(APPLE_ERROR_KEY, JSON.stringify({ t: new Date().toISOString(), stage, message }));
  } catch { /* noop */ }
};
const readAppleError = (): { t: string; stage: string; message: string } | null => {
  try { return JSON.parse(sessionStorage.getItem(APPLE_ERROR_KEY) || "null"); } catch { return null; }
};
const clearAppleError = () => { try { sessionStorage.removeItem(APPLE_ERROR_KEY); } catch { /* noop */ } };

const storeAuthEvent = (event: string) => {
  try { sessionStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ t: new Date().toISOString(), event })); } catch { /* noop */ }
};
const readAuthEvent = (): { t: string; event: string } | null => {
  try { return JSON.parse(sessionStorage.getItem(AUTH_EVENT_KEY) || "null"); } catch { return null; }
};

type Mode = "signin" | "signup";

const parseOAuthCallback = (rawUrl: string) => {
  const normalized = rawUrl.replace(/^petswap:\/\/login-callback(?=[?#]|$)/, "https://login-callback.local");
  const url = new URL(normalized);
  const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  return {
    code: url.searchParams.get("code"),
    error: url.searchParams.get("error") || hash.get("error"),
    errorDescription: url.searchParams.get("error_description") || hash.get("error_description"),
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
    search: url.search,
    hash: url.hash,
  };
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const next = getSafeAuthNext(params.get("next"));
  const { session, loading: authLoading } = useAuth();

  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<{ daysLeft: number | null } | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [authSuccess, setAuthSuccess] = useState<null | "google" | "apple" | "email">(null);
  const oauthProviderRef = useRef<"google" | "apple" | null>(null);
  const [debugLog, setDebugLog] = useState<DebugEntry[]>(() => readDebug());
  const [debugOpen, setDebugOpen] = useState(false);
  const refreshDebug = () => setDebugLog(readDebug());
  const isOAuthDebugVisible = (() => {
    const h = window.location.hostname;
    return h.includes("lovableproject.com") || h.includes("lovable.dev") || h.includes("lovable.app") || h === "localhost";
  })();

  const goHomeWithSession = useCallback((via: string, user?: { id?: string; app_metadata?: { provider?: unknown } }) => {
    console.log("USER LOGGED IN:", user ?? { via });
    pushDebug("AUTH_SESSION_FOUND", {
      userId: user?.id,
      provider: user?.app_metadata?.provider,
      via,
    });
    const provider = oauthProviderRef.current;
    oauthProviderRef.current = null;
    setGoogleLoading(false);
    setAppleLoading(false);
    try { sessionStorage.removeItem(OAUTH_PENDING_KEY); } catch { /* noop */ }
    toast.dismiss();
    clearDebug();
    setDebugOpen(false);
    setDebugLog([]);
    setAuthSuccess(provider ?? "email");
    // Brief success state for premium feel, then smooth fade-out + navigate.
    window.setTimeout(() => { window.location.href = "/home"; }, 850);
  }, []);

  // iOS users see Apple first (App Store guideline 4.8) — everyone else sees Google first.
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Safety net: if Auth renders while a session already exists, leave /auth now.
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const foundUser = data?.session?.user ?? null;

      console.log("LIVE_AUTH_HOSTNAME", window.location.hostname);
      console.log("SUPABASE_URL", SUPABASE_URL);
      console.log("HAS_SESSION", !!foundUser);
      console.log("SESSION_USER_ID", foundUser?.id ?? null);

      if (!mounted) return;


      if (foundUser) {
        console.log("AUTH_PAGE_SESSION_EXISTS_GO_HOME", foundUser.id);
        window.location.href = "/home";
        return;
      }

      setCheckingSession(false);
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, signedInSession) => {
      if (event === "SIGNED_IN" && signedInSession?.user) {
        console.log("AUTH_SIGNED_IN_FORCE_HOME", signedInSession.user.id);
        window.location.href = "/home";
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // If already signed in, check soft-delete status, then redirect.
  // Skip while we're showing the deletion-recovery prompt — we keep the
  // session alive so the user can choose to restore.
  useEffect(() => {
    if (pendingDeletion) return;
    if (authLoading || !session) return;
    const provider = session.user.app_metadata?.provider;
    if (provider === "google") {
      goHomeWithSession("auth-context-session", session.user);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: status, error: statusError } = await supabase.rpc('get_account_status');
      if (cancelled) return;
      if (statusError) {
        console.warn('[auth] account status check failed; keeping session', statusError.message);
        navigate(next, { replace: true });
        return;
      }
      const s = status as { status?: string; days_left?: number | null } | null;
      if (s?.status === 'pending_deletion') {
        setPendingDeletion({ daysLeft: s.days_left ?? null });
        return;
      }
      if (s?.status === 'deleted') {
        await supabase.auth.signOut();
        toast.error('This account has been permanently deleted.');
        return;
      }
      const justSignedUp = sessionStorage.getItem("petswap_just_signed_up") === "1";
      if (justSignedUp) {
        sessionStorage.removeItem("petswap_just_signed_up");
        navigate(`/welcome-new?next=${encodeURIComponent(next)}`, { replace: true });
      } else {
        navigate(next, { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, session, navigate, next, pendingDeletion, goHomeWithSession]);

  useEffect(() => {
    const state = location.state as { toast?: string } | null;
    if (!state?.toast) return;
    toast.success(state.toast);
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  const recoverOAuthSession = useCallback(async (rawUrl: string, via: string) => {
    let callback: ReturnType<typeof parseOAuthCallback>;
    try {
      callback = parseOAuthCallback(rawUrl);
    } catch (error) {
      console.error("OAUTH_TOKEN_PARSING_FAILURE", { via, rawUrl, error });
      pushDebug("OAUTH_TOKEN_PARSING_FAILURE", { via, error: error instanceof Error ? error.message : String(error) });
      toast.error("Sign-in callback could not be read. Please try again.", { duration: 10000 });
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
      setAppleLoading(false);
      setGoogleLoading(false);
      oauthProviderRef.current = null;
      return;
    }

    console.log("OAUTH_CALLBACK_RECEIVED", { via, rawUrl, search: callback.search, hash: callback.hash, hasCode: !!callback.code });
    pushDebug("OAUTH_CALLBACK_RECEIVED", {
      via,
      rawUrl,
      hasCode: !!callback.code,
      hasAccessToken: !!callback.accessToken,
      hasRefreshToken: !!callback.refreshToken,
      error: callback.error,
      errorDescription: callback.errorDescription,
    });
    try { sessionStorage.setItem("petswap_oauth_last_callback", rawUrl); } catch { /* noop */ }

    if (callback.error) {
      const message = callback.errorDescription || callback.error;
      console.error("OAUTH_CALLBACK_ERROR", { via, message, rawUrl });
      pushDebug(message.toLowerCase().includes("cancel") ? "OAUTH_CANCELLATION" : "OAUTH_CALLBACK_ERROR", { via, message });
      toast.error(`Sign-in failed: ${message}`, { duration: 10000 });
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
      setAppleLoading(false);
      setGoogleLoading(false);
      oauthProviderRef.current = null;
      return;
    }

    if (callback.code) {
      console.log("OAUTH_CODE_EXCHANGE_STARTED", { via, redirectTo: APPLE_NATIVE_REDIRECT_URI });
      pushDebug("OAUTH_CODE_EXCHANGE_STARTED", { via, hasCode: true });
      const { data, error } = await supabase.auth.exchangeCodeForSession(callback.code);
      console.log("OAUTH_CODE_EXCHANGE_RESULT", { via, hasSession: !!data.session, userId: data.session?.user.id, error });
      if (error) {
        console.error("OAUTH_CODE_EXCHANGE_FAILURE", { via, error });
        pushDebug("OAUTH_CODE_EXCHANGE_FAILURE", { via, error: error.message });
        toast.error(`Sign-in failed: ${error.message}`, { duration: 10000 });
        sessionStorage.removeItem(OAUTH_PENDING_KEY);
        setAppleLoading(false);
        setGoogleLoading(false);
        oauthProviderRef.current = null;
        return;
      }
      if (data.session?.user) {
        pushDebug("OAUTH_SESSION_RESTORED", { via, userId: data.session.user.id });
        goHomeWithSession(`${via}-codeExchange`, data.session.user);
        return;
      }
    }

    if (callback.accessToken && callback.refreshToken) {
      console.log("OAUTH_SET_SESSION_STARTED", { via });
      const { data, error } = await supabase.auth.setSession({
        access_token: callback.accessToken,
        refresh_token: callback.refreshToken,
      });
      console.log("OAUTH_SET_SESSION_RESULT", { via, hasSession: !!data.session, userId: data.session?.user.id, error });
      if (error) {
        console.error("OAUTH_SESSION_RESTORE_FAILURE", { via, error });
        pushDebug("OAUTH_SESSION_RESTORE_FAILURE", { via, error: error.message });
        toast.error(`Sign-in failed: ${error.message}`, { duration: 10000 });
        sessionStorage.removeItem(OAUTH_PENDING_KEY);
        setAppleLoading(false);
        setGoogleLoading(false);
        oauthProviderRef.current = null;
        return;
      }
      if (data.session?.user) {
        pushDebug("OAUTH_SESSION_RESTORED", { via, userId: data.session.user.id });
        goHomeWithSession(`${via}-setSession`, data.session.user);
        return;
      }
    }

    for (const delayMs of [0, 400, 1000]) {
      if (delayMs) await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      const { data, error } = await supabase.auth.getSession();
      console.log("OAUTH_GET_SESSION_RESULT", { via, delayMs, hasSession: !!data.session, userId: data.session?.user.id, error });
      if (data.session?.user) {
        pushDebug("OAUTH_SESSION_RESTORED", { via, delayMs, userId: data.session.user.id });
        goHomeWithSession(`${via}-getSession-${delayMs}`, data.session.user);
        return;
      }
      if (error) pushDebug("OAUTH_GET_SESSION_ERROR", { via, delayMs, error: error.message });
    }

    console.error("OAUTH_MISSING_SESSION", { via, rawUrl });
    pushDebug("OAUTH_MISSING_SESSION", { via, rawUrl });
    refreshDebug();
    setDebugOpen(true);
    toast.error("Sign-in completed, but no session was restored. Please try again.", { duration: 10000 });
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    setAppleLoading(false);
    setGoogleLoading(false);
    oauthProviderRef.current = null;
  }, [goHomeWithSession]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removed = false;
    let handle: { remove: () => Promise<void> | void } | null = null;

    const onUrlOpen = (event: { url?: string }) => {
      const rawUrl = event.url ?? "";
      console.log("NATIVE_DEEP_LINK_OPENED", { rawUrl });
      pushDebug("NATIVE_DEEP_LINK_OPENED", { rawUrl });
      if (rawUrl.startsWith(APPLE_NATIVE_REDIRECT_URI)) {
        void Browser.close().catch(() => undefined);
        void recoverOAuthSession(rawUrl, "native-deeplink");
      }
    };

    App.addListener("appUrlOpen", onUrlOpen).then((listener) => {
      if (removed) void listener.remove();
      else handle = listener;
    }).catch((error) => {
      console.error("NATIVE_DEEP_LINK_LISTENER_FAILURE", error);
      pushDebug("NATIVE_DEEP_LINK_FAILURE", error instanceof Error ? error.message : String(error));
    });

    App.getLaunchUrl().then((launch) => {
      if (launch?.url?.startsWith(APPLE_NATIVE_REDIRECT_URI)) {
        console.log("NATIVE_DEEP_LINK_LAUNCH_URL", { rawUrl: launch.url });
        pushDebug("NATIVE_DEEP_LINK_LAUNCH_URL", { rawUrl: launch.url });
        void recoverOAuthSession(launch.url, "native-launch-url");
      }
    }).catch((error) => {
      console.error("NATIVE_DEEP_LINK_LAUNCH_FAILURE", error);
      pushDebug("NATIVE_DEEP_LINK_LAUNCH_FAILURE", error instanceof Error ? error.message : String(error));
    });

    return () => {
      removed = true;
      void handle?.remove();
    };
  }, [recoverOAuthSession]);

  // Detect callback return: if URL has OAuth params/hash or pending flag, log it
  // AND if a session exists, redirect to /home immediately (do not show errors).
  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = window.location.hash;
    const hasOAuthParams =
      url.searchParams.has("code") ||
      url.searchParams.has("error") ||
      hash.includes("access_token") ||
      hash.includes("error");
    const pending = sessionStorage.getItem(OAUTH_PENDING_KEY);
    if (!hasOAuthParams && !pending) return;

    void recoverOAuthSession(window.location.href, pending === "apple" ? "web-apple-callback" : "web-oauth-callback");
  }, [recoverOAuthSession]);

  // Helper: only show an OAuth error if no session actually exists.
  // Always surfaces the real provider/Supabase error text — never a generic message.
  const reportOAuthFailure = async (stage: string, errMsg: string) => {
    const { data, error: sessErr } = await supabase.auth.getSession();
    console.error("OAUTH_FAILURE", { stage, errMsg, sessionError: sessErr?.message, hasSession: !!data.session });
    if (data.session?.user) {
      goHomeWithSession(`recovered-after-${stage}`, data.session.user);
      return;
    }
    pushDebug("OAUTH_FAILURE_DETAILS", { stage, error: errMsg });
    refreshDebug();
    setDebugOpen(true);
    toast.error(`Sign-in failed (${stage}): ${errMsg}`, { duration: 10000 });
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    const setLoading = provider === "google" ? setGoogleLoading : setAppleLoading;
    setLoading(true);
    oauthProviderRef.current = provider;
    const isGoogle = provider === "google";
    if (isGoogle) {
      console.log("GOOGLE_BUTTON_CLICKED");
      clearDebug();
      refreshDebug();
      try { sessionStorage.setItem(OAUTH_PENDING_KEY, "google"); } catch { /* noop */ }
      pushDebug("GOOGLE_CLICKED", { origin: window.location.origin, href: window.location.href });
    } else {
      console.log("APPLE_BUTTON_CLICKED");
      clearDebug();
      refreshDebug();
      try { sessionStorage.setItem(OAUTH_PENDING_KEY, "apple"); } catch { /* noop */ }
      pushDebug("APPLE_CLICKED", { origin: window.location.origin, href: window.location.href, redirectTo: APPLE_NATIVE_REDIRECT_URI });
    }
    try {
      if (isGoogle) {
        console.log("GOOGLE_OAUTH_STARTED");
        pushDebug("GOOGLE_REDIRECT_STARTED", { provider, redirectTo: `${window.location.origin}/auth/callback` });
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          console.error("GOOGLE_OAUTH_ERROR", error);
          await reportOAuthFailure("signInWithOAuth", error.message);
          oauthProviderRef.current = null;
          setLoading(false);
          return;
        }
        return; // browser redirecting to Google
      }
      console.log("APPLE_AUTH_STARTED", { redirectTo: APPLE_NATIVE_REDIRECT_URI, userAgent: navigator.userAgent });
      pushDebug("APPLE_AUTH_STARTED", { provider, redirectTo: APPLE_NATIVE_REDIRECT_URI });
      if (Capacitor.isNativePlatform()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: {
            redirectTo: APPLE_NATIVE_REDIRECT_URI,
            skipBrowserRedirect: true,
          },
        });
        console.log("APPLE_NATIVE_OAUTH_RESPONSE", { hasUrl: !!data?.url, error });
        if (error || !data?.url) {
          const message = error?.message || "Apple sign-in URL was not created.";
          console.error("APPLE_NATIVE_AUTH_FAILURE", { message, error });
          pushDebug("APPLE_NATIVE_AUTH_FAILURE", { message, status: error?.status });
          await reportOAuthFailure("apple-native-oauth-start", message);
          oauthProviderRef.current = null;
          setLoading(false);
          return;
        }
        await Browser.open({ url: data.url, presentationStyle: "fullscreen" });
        pushDebug("APPLE_NATIVE_BROWSER_OPENED", { redirectTo: APPLE_NATIVE_REDIRECT_URI });
        return;
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: APPLE_NATIVE_REDIRECT_URI,
          skipBrowserRedirect: false,
        },
      });
      console.log("APPLE_OAUTH_RESPONSE", { data, error });
      if (error) {
        console.error("APPLE_AUTH_FAILURE", {
          message: error.message,
          name: error.name,
          status: error.status,
          fullError: error,
        });
        pushDebug("APPLE_AUTH_FAILURE", { message: error.message, status: error.status });
        await reportOAuthFailure("apple-oauth-start", error.message);
        oauthProviderRef.current = null;
        setLoading(false);
        return;
      }
      pushDebug("APPLE_REDIRECT_OPENED", { redirectTo: APPLE_NATIVE_REDIRECT_URI });
      return; // browser/Safari redirects to Apple, then back to petswap://login-callback
    } catch (e) {
      const appleErr = e as { error?: string; details?: unknown; message?: string };
      const errMsg = e instanceof Error ? e.message : (appleErr?.error || JSON.stringify(e));
      if (isGoogle) {
        console.error("GOOGLE_OAUTH_ERROR", e);
      } else {
        console.error("APPLE_AUTH_EXCEPTION", {
          message: e instanceof Error ? e.message : String(e),
          name: e instanceof Error ? e.name : undefined,
          error: appleErr?.error,
          details: appleErr?.details,
          raw: e,
        });
      }
      if (!isGoogle) pushDebug("APPLE_AUTH_EXCEPTION", { error: errMsg, rawError: appleErr?.error, details: appleErr?.details });
      await reportOAuthFailure("exception", errMsg);
      oauthProviderRef.current = null;
      setLoading(false);
    }
  };


  const handleEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildOAuthRedirectUri(window.location.origin, next),
            data: { first_name: firstName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          sessionStorage.setItem("petswap_just_signed_up", "1");
          toast.success("Welcome to PetSwap 🐾", {
            description: "You're all set — let's get started.",
          });
        } else {
          sessionStorage.removeItem("petswap_just_signed_up");
          toast.success("Check your email to confirm account", {
            description: "Open the confirmation link, then sign in to continue.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Check soft-delete status before letting the user into the app.
        const { data: status, error: statusError } = await supabase.rpc('get_account_status');
        if (statusError) {
          console.warn('[auth] account status check failed after sign-in; keeping session', statusError.message);
          toast.success("Welcome back 👋");
          navigate(next, { replace: true });
          return;
        }
        const s = status as { status?: string; days_left?: number | null } | null;
        if (s?.status === 'pending_deletion') {
          setPendingDeletion({ daysLeft: s.days_left ?? null });
          return; // suspend redirect; show recovery UI
        }
        if (s?.status === 'deleted') {
          await supabase.auth.signOut();
          toast.error('This account has been permanently deleted.');
          return;
        }
        toast.success("Welcome back 👋");
      }
    } catch (err) {
      toast.error(friendlyError(err, mode === "signup" ? "signup" : "login"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email first", {
        description: "We'll send a reset link to that address.",
      });
      return;
    }
    try {
      const redirectTo = `https://petswap.co.uk/reset-password`;
      console.log("[ResetPassword] Sending reset email with redirectTo:", redirectTo);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      toast.success("Check your inbox", {
        description: "We've sent a password reset link.",
      });
    } catch (err) {
      toast.error(friendlyError(err, "password-reset"));
    }
  };

  const handleRestoreAccount = async () => {
    setRecoveryBusy(true);
    try {
      const { error } = await supabase.rpc('cancel_account_deletion');
      if (error) throw error;
      toast.success('Account restored', { description: 'Welcome back to PetSwap.' });
      setPendingDeletion(null);
      navigate(next, { replace: true });
    } catch (err) {
      toast.error(friendlyError(err, "generic"));
    } finally {
      setRecoveryBusy(false);
    }
  };

  const handleContinueSignOut = async () => {
    setRecoveryBusy(true);
    try {
      await supabase.auth.signOut();
      setPendingDeletion(null);
    } finally {
      setRecoveryBusy(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center text-slate-600">Signing you in...</div>
      </div>
    );
  }

  if (pendingDeletion) {
    const days = pendingDeletion.daysLeft;
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 safe-top safe-bottom">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight">Your account is scheduled for deletion</h1>
          <p className="text-[15px] text-muted-foreground">
            {days != null
              ? `You have ${days} day${days === 1 ? '' : 's'} left to cancel before your account is permanently deleted.`
              : 'You can cancel before your account is permanently deleted.'}
          </p>
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleRestoreAccount}
              disabled={recoveryBusy}
              className="w-full h-[52px] rounded-[16px] bg-primary text-primary-foreground font-semibold text-[15px] disabled:opacity-60"
            >
              {recoveryBusy ? 'Restoring…' : 'Cancel deletion and restore account'}
            </button>
            <button
              onClick={handleContinueSignOut}
              disabled={recoveryBusy}
              className="w-full h-[52px] rounded-[16px] bg-muted text-foreground font-semibold text-[15px] disabled:opacity-60"
            >
              Continue sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={"min-h-[100dvh] bg-background flex flex-col transition-opacity duration-500 " + (authSuccess ? "opacity-0 pointer-events-none" : "opacity-100")}>
      {authSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white animate-fade-in safe-top safe-bottom"
        >
          <div className="w-16 h-16 rounded-full bg-[#0B8F6A]/10 text-[#0B8F6A] flex items-center justify-center animate-scale-in">
            <CheckCircle2 size={36} strokeWidth={2.4} />
          </div>
          <p className="mt-4 text-[15px] font-semibold text-[#0F172A] tracking-tight">
            You're signed in
          </p>
          <p className="mt-1 text-[13px] text-[#64748B]">Taking you to PetSwap…</p>
        </div>
      )}
      {/* Top brand */}
      <div className="px-6 pt-6 pb-4 safe-top flex flex-col items-center">
        <div
          className="auth-rise-0 mb-4 relative"
        >
          <div className="absolute inset-0 -z-10 blur-2xl rounded-[28px] bg-[#2F80ED]/35 scale-110" aria-hidden />
          <img
            src={petswapIcon}
            alt="PetSwap"
            width={88}
            height={88}
            className="w-[88px] h-[88px] rounded-[22px] shadow-[0_14px_32px_-10px_rgba(47,128,237,0.55)]"
          />
        </div>
        <h1 className="auth-rise-1 text-[28px] font-bold tracking-tight text-center text-[#0F172A]">
          {mode === "signup" ? "Join PetSwap" : "Welcome back"}
        </h1>
        <p className="auth-rise-2 text-[15px] text-[#667085] text-center mt-1.5 max-w-[300px]">
          {mode === "signup"
            ? "Trusted local pet care. Built on community."
            : "Sign in to trusted local pet care."}
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 px-6 pb-10">
        <div className="max-w-sm mx-auto w-full space-y-3">
          {isOAuthDebugVisible && debugLog.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-mono">
              <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200">
                <button
                  type="button"
                  onClick={() => setDebugOpen((o) => !o)}
                  className="font-semibold tracking-tight"
                >
                  🔧 OAuth Debug ({debugLog.length}) {debugOpen ? "▲" : "▼"}
                </button>
                <button
                  type="button"
                  onClick={() => { clearDebug(); refreshDebug(); }}
                  className="opacity-70 hover:opacity-100"
                  aria-label="Clear debug log"
                >
                  <X size={14} />
                </button>
              </div>
              {debugOpen && (
                <div className="max-h-[260px] overflow-auto p-3 space-y-1.5 leading-snug">
                  {debugLog.map((e, i) => (
                    <div key={i} className="break-words">
                      <span className="opacity-60">{e.t}</span>{" "}
                      <span className="font-bold">{e.tag}</span>
                      {e.data !== undefined && (
                        <pre className="whitespace-pre-wrap text-[10.5px] mt-0.5 bg-white/60 rounded px-1.5 py-1">
{JSON.stringify(e.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Social — Apple first on iOS */}
          {[isIOS ? "apple" : "google", isIOS ? "google" : "apple"].map((p, i) => {
            const provider = p as "apple" | "google";
            const isApple = provider === "apple";
            const loading = isApple ? appleLoading : googleLoading;
            const anyBusy = appleLoading || googleLoading || submitting || authSuccess !== null;
            return (
              <button
                key={provider}
                type="button"
                onClick={() => handleOAuth(provider)}
                disabled={anyBusy}
                aria-busy={loading}
                aria-label={`Continue with ${isApple ? "Apple" : "Google"}`}
                style={{ animationDelay: `${120 + i * 80}ms` }}
                className={
                  "auth-rise relative w-full h-[56px] rounded-[18px] px-4 font-semibold text-[16px] flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all duration-200 ease-out disabled:cursor-not-allowed " +
                  (loading ? "opacity-95 " : anyBusy ? "opacity-50 " : "hover:-translate-y-[1px] hover:shadow-lg ") +
                  (isApple
                    ? "bg-black text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)]"
                    : "bg-white text-[#1f1f1f] ring-1 ring-black/[0.08] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.12)]")
                }
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span className="tracking-[-0.01em]">
                      Connecting to {isApple ? "Apple" : "Google"}…
                    </span>
                  </>
                ) : (
                  <>
                    {isApple ? <AppleGlyph /> : <GoogleGlyph />}
                    <span className="tracking-[-0.01em]">
                      Continue with {isApple ? "Apple" : "Google"}
                    </span>
                  </>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="auth-rise flex items-center gap-3 py-2" style={{ animationDelay: "280ms" }}>
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11.5px] uppercase tracking-wider font-semibold text-muted-foreground">
              or
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail} className="space-y-2.5 auth-rise" style={{ animationDelay: "340ms" }}>
            {mode === "signup" && (
              <FieldShell icon={<Mail size={17} className="text-muted-foreground" />}>
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/80"
                  style={{ fontSize: "16px" }}
                />
              </FieldShell>
            )}

            <FieldShell icon={<Mail size={17} className="text-muted-foreground" />}>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/80"
                style={{ fontSize: "16px" }}
              />
            </FieldShell>

            <FieldShell icon={<Lock size={17} className="text-muted-foreground" />}>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={mode === "signup" ? 8 : 1}
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/80"
                style={{ fontSize: "16px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-muted-foreground p-1 -mr-1 active:scale-95"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </FieldShell>

            {mode === "signin" && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[13px] font-semibold text-[#2F80ED] active:opacity-70"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || googleLoading || appleLoading || !email || !password}
              className="w-full h-[56px] rounded-[18px] text-white font-semibold text-[16px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-50 mt-2 shadow-[0_12px_28px_-10px_rgba(47,128,237,0.65)]"
              style={{
                background:
                  submitting || !email || !password
                    ? "linear-gradient(180deg, #9DBEF0 0%, #7FA8E5 100%)"
                    : "linear-gradient(180deg, #2F80ED 0%, #1D6FE8 100%)",
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  {mode === "signup" ? "Create account" : "Sign in"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <p className="auth-rise text-center text-[13.5px] text-muted-foreground pt-2" style={{ animationDelay: "420ms" }}>
            {mode === "signup" ? "Already have an account?" : "New to PetSwap?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-[#2F80ED] font-semibold"
            >
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </p>

          {/* Trust row */}
          <div className="auth-rise mt-4 grid grid-cols-3 gap-2" style={{ animationDelay: "480ms" }}>
            <TrustChip icon={<ShieldCheck size={14} className="text-[#2F80ED]" />} label="Verified owners" />
            <TrustChip icon={<Heart size={14} className="text-rose-500" fill="currentColor" />} label="Safe swaps" />
            <TrustChip icon={<Sparkles size={14} className="text-amber-500" fill="currentColor" />} label="Trusted locals" />
          </div>

          {/* Social proof */}
          <div className="auth-rise flex items-center justify-center gap-1.5 pt-3" style={{ animationDelay: "510ms" }}>
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={12} className="text-amber-400" fill="currentColor" />
              ))}
            </div>
            <span className="text-[12px] font-medium text-[#667085]">
              Trusted by pet owners across the UK
            </span>
          </div>

          {/* Legal */}
          <p className="auth-rise text-center text-[11.5px] text-muted-foreground/80 leading-relaxed pt-4 max-w-[300px] mx-auto" style={{ animationDelay: "540ms" }}>
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline underline-offset-2">Terms</a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-2">Privacy Policy</a>.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes authRise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-rise { animation: authRise 0.55s cubic-bezier(.2,.8,.2,1) both; }
        .auth-rise-0 { animation: authRise 0.6s cubic-bezier(.2,.8,.2,1) both; animation-delay: 0ms; }
        .auth-rise-1 { animation: authRise 0.55s cubic-bezier(.2,.8,.2,1) both; animation-delay: 60ms; }
        .auth-rise-2 { animation: authRise 0.55s cubic-bezier(.2,.8,.2,1) both; animation-delay: 100ms; }
      `}</style>
    </div>
  );
};

const TrustChip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-surface-muted/60 ring-1 ring-border/60">
    {icon}
    <span className="text-[11px] font-medium text-muted-foreground tracking-tight">{label}</span>
  </div>
);

const FieldShell = ({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 h-[56px] px-4 rounded-[18px] bg-white ring-1 ring-black/[0.07] shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-primary/40 transition-shadow">
    {icon}
    {children}
  </div>
);

// Inline Google "G" mark — keeps the button branded without an extra asset.
const GoogleGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
    <path d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91a8.78 8.78 0 0 0 2.69-6.61z" fill="#4285F4" />
    <path d="M9 18a8.59 8.59 0 0 0 5.95-2.18l-2.91-2.26a5.4 5.4 0 0 1-8.06-2.83H.95v2.34A9 9 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.98 10.73a5.41 5.41 0 0 1 0-3.45V4.94H.95a9 9 0 0 0 0 8.12l3.03-2.33z" fill="#FBBC05" />
    <path d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0a9 9 0 0 0-8.05 4.94l3.03 2.34A5.36 5.36 0 0 1 9 3.58z" fill="#EA4335" />
  </svg>
);

// Official Apple logo glyph — HIG-compliant proportions, fills with currentColor.
const AppleGlyph = () => (
  <svg width="18" height="22" viewBox="0 0 14 17" aria-hidden="true" fill="currentColor">
    <path d="M11.624 8.964c-.02-2.04 1.666-3.02 1.742-3.066-.95-1.388-2.426-1.578-2.95-1.6-1.256-.128-2.452.74-3.09.74-.642 0-1.62-.722-2.664-.702-1.37.02-2.634.798-3.336 2.024-1.422 2.466-.364 6.114 1.022 8.116.676.98 1.482 2.082 2.54 2.042 1.022-.04 1.408-.66 2.642-.66 1.234 0 1.582.66 2.66.638 1.098-.02 1.794-1 2.466-1.984.776-1.138 1.096-2.24 1.114-2.296-.024-.012-2.136-.82-2.146-3.252zM9.61 2.962c.564-.684.944-1.634.84-2.582-.812.034-1.798.542-2.382 1.226-.522.604-.98 1.572-.856 2.5.906.07 1.834-.46 2.398-1.144z" />
  </svg>
);

export default Auth;
