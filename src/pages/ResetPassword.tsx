import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/friendlyError";
import petswapIcon from "@/assets/petswap-icon.png";

type Status = "checking" | "ready" | "invalid" | "saving" | "success";
type RecoveryInput =
  | { strategy: "session_tokens"; access_token: string; refresh_token: string; source: "hash" | "query" }
  | { strategy: "code"; code: string }
  | { strategy: "token_hash"; token_hash: string };
type RecoverySnapshot = {
  input: RecoveryInput | null;
  queryParams: Record<string, string>;
  hashParams: Record<string, string>;
  type: string | null;
  error: string | null;
  errorDescription: string | null;
  currentUrl: string;
};

const debugRecovery = (message: string, details: Record<string, unknown> = {}) => {
  if (import.meta.env.DEV) {
    console.info("[PetSwap reset-password]", message, details);
  }
};

const scorePassword = (pw: string): { label: string; tone: string; pct: number } => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", tone: "text-rose-500", pct: 25 };
  if (score === 2) return { label: "Fair", tone: "text-amber-500", pct: 50 };
  if (score === 3) return { label: "Good", tone: "text-blue-500", pct: 75 };
  return { label: "Strong", tone: "text-emerald-500", pct: 100 };
};

const paramsToObject = (params: URLSearchParams) => Object.fromEntries(params.entries());

const readRecoverySnapshot = (): RecoverySnapshot => {
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const queryParams = paramsToObject(searchParams);
  const hashParamsObject = paramsToObject(hashParams);

  const searchType = searchParams.get("type");
  const hashType = hashParams.get("type");
  const type = searchType || hashType;
  const queryAccessToken = searchParams.get("access_token");
  const hashAccessToken = hashParams.get("access_token");
  const queryRefreshToken = searchParams.get("refresh_token");
  const hashRefreshToken = hashParams.get("refresh_token");
  const code = searchParams.get("code") || hashParams.get("code");
  const tokenHash = searchParams.get("token_hash") || searchParams.get("token") || hashParams.get("token_hash") || hashParams.get("token");
  const error = searchParams.get("error") || hashParams.get("error");
  const errorDescription = searchParams.get("error_description") || hashParams.get("error_description");

  debugRecovery("parsed url", {
    hasHash: Boolean(hash),
    hasQuery: Boolean(window.location.search),
    type,
    hasHashAccessToken: Boolean(hashAccessToken),
    hasHashRefreshToken: Boolean(hashRefreshToken),
    hasQueryAccessToken: Boolean(queryAccessToken),
    hasQueryRefreshToken: Boolean(queryRefreshToken),
    hasCode: Boolean(code),
    hasTokenHash: Boolean(tokenHash),
  });

  let input: RecoveryInput | null = null;

  if (hashAccessToken && hashRefreshToken && (!hashType || hashType === "recovery")) {
    input = { strategy: "session_tokens", access_token: hashAccessToken, refresh_token: hashRefreshToken, source: "hash" };
  } else if (queryAccessToken && queryRefreshToken && (!searchType || searchType === "recovery")) {
    input = { strategy: "session_tokens", access_token: queryAccessToken, refresh_token: queryRefreshToken, source: "query" };
  } else if (code && (!type || type === "recovery")) {
    input = { strategy: "code", code };
  } else if (tokenHash && (!type || type === "recovery")) {
    input = { strategy: "token_hash", token_hash: tokenHash };
  }

  return {
    input,
    queryParams,
    hashParams: hashParamsObject,
    type,
    error,
    errorDescription,
    currentUrl: window.location.href,
  };
};

/**
 * /reset-password — handles Supabase password recovery deep links.
 *
 * Supabase delivers recovery tokens in either the URL hash or query string.
 * Capture them synchronously before auth listeners can clean up the URL, then
 * explicitly exchange them with setSession before showing the password form.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [recoverySnapshot] = useState(() => readRecoverySnapshot());
  const [status, setStatus] = useState<Status>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const establishRecoverySession = async () => {
      const existingBefore = await supabase.auth.getSession();
      if (cancelled) return;

      debugRecovery("existing session before exchange", {
        hasSession: Boolean(existingBefore.data.session),
        strategy: recoverySnapshot.input?.strategy ?? null,
        type: recoverySnapshot.type,
      });

      let result:
        | Awaited<ReturnType<typeof supabase.auth.setSession>>
        | Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>
        | Awaited<ReturnType<typeof supabase.auth.verifyOtp>>;
        
      if (recoverySnapshot.input?.strategy === "session_tokens") {
        debugRecovery("exchanging access/refresh tokens", { source: recoverySnapshot.input.source });
        result = await supabase.auth.setSession({
          access_token: recoverySnapshot.input.access_token,
          refresh_token: recoverySnapshot.input.refresh_token,
        });
      } else if (recoverySnapshot.input?.strategy === "code") {
        debugRecovery("exchanging auth code");
        result = await supabase.auth.exchangeCodeForSession(recoverySnapshot.input.code);
      } else if (recoverySnapshot.input?.strategy === "token_hash") {
        debugRecovery("verifying recovery token_hash");
        result = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: recoverySnapshot.input.token_hash,
        });
      }

      if (!cancelled && result?.error) {
        debugRecovery("recovery exchange failed", {
          strategy: recoverySnapshot.input?.strategy,
          message: result.error.message,
        });
      }

      const existingAfter = await supabase.auth.getSession();
      if (cancelled) return;

      if (existingAfter.data.session) {
        debugRecovery("recovery session ready", {
          via: recoverySnapshot.input?.strategy ?? "existing_session",
        });
        window.history.replaceState(null, document.title, "/reset-password");
        setErrorMessage("");
        setStatus("ready");
        return;
      }

      if (recoverySnapshot.error || result?.error) {
        setErrorMessage(
          recoverySnapshot.errorDescription ||
            result?.error?.message ||
            "This reset link is invalid or has expired. Request a new link to continue.",
        );
        setStatus("invalid");
        return;
      }

      debugRecovery("no supported recovery credentials found");
      setErrorMessage("We couldn't find a reset token in this link. Request a new link to continue.");
      setStatus("invalid");
    };

    void establishRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [recoverySnapshot]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password is too short. Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match. Please re-enter them.");
      return;
    }
    setStatus("saving");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("success");
      toast.success("Password updated successfully");
      // Sign out the recovery session so the user signs in fresh with the new password.
      window.setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/auth", {
          replace: true,
          state: { toast: "Password updated successfully" },
        });
      }, 1800);
    } catch (err) {
      setStatus("ready");
      toast.error(friendlyError(err, "password-update"));
    }
  };

  const requestNewLink = () => navigate("/auth", { replace: true });

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="px-6 pt-10 pb-6 safe-top flex flex-col items-center">
        <img
          src={petswapIcon}
          alt="PetSwap"
          width={72}
          height={72}
          className="w-[72px] h-[72px] rounded-[18px] shadow-[0_10px_24px_-10px_rgba(47,128,237,0.55)] mb-4"
        />
        <h1 className="text-[26px] font-bold tracking-tight text-center text-[#0F172A]">
          {status === "success" ? "Password updated" : "Reset your password"}
        </h1>
        <p className="text-[14px] text-[#667085] text-center mt-1.5 max-w-[300px]">
          {status === "checking" && "Verifying your reset link…"}
          {status === "invalid" && "We couldn't verify this reset link."}
          {(status === "ready" || status === "saving") && "Choose a new password for your account."}
          {status === "success" && "Redirecting you to sign in…"}
        </p>
      </div>

      <div className="flex-1 px-6 pb-10">
        <div className="max-w-sm mx-auto w-full">
          {status === "checking" && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {status === "invalid" && (
            <div className="rounded-[20px] bg-white ring-1 ring-black/[0.06] p-6 text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.08)]">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <AlertCircle size={22} className="text-amber-500" />
              </div>
              <h2 className="text-[16px] font-semibold text-[#0F172A]">Request a new link</h2>
              <p className="text-[13.5px] text-muted-foreground mt-1.5">
                {errorMessage || "We couldn't verify this reset link. Request a new one to continue."}
              </p>
              <button
                type="button"
                onClick={requestNewLink}
                className="mt-5 w-full h-[52px] rounded-[16px] text-white font-semibold text-[15px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform shadow-[0_10px_24px_-10px_rgba(47,128,237,0.6)]"
                style={{ background: "linear-gradient(180deg, #2F80ED 0%, #1D6FE8 100%)" }}
              >
                Request another link
                <ArrowRight size={17} />
              </button>
            </div>
          )}

          {status === "success" && (
            <div className="rounded-[20px] bg-white ring-1 ring-black/[0.06] p-6 text-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.08)]">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <h2 className="text-[16px] font-semibold text-[#0F172A]">All set</h2>
              <p className="text-[13.5px] text-muted-foreground mt-1.5">
                Your password has been updated. Taking you to sign in…
              </p>
            </div>
          )}

          {(status === "ready" || status === "saving") && (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <FieldShell icon={<Lock size={17} className="text-muted-foreground" />}>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  required
                  minLength={8}
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

              <FieldShell icon={<Lock size={17} className="text-muted-foreground" />}>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/80"
                  style={{ fontSize: "16px" }}
                />
              </FieldShell>

              <p className="text-[12px] text-muted-foreground px-1 pt-1">
                Must be at least 8 characters.
              </p>

              {password && (
                <div className="px-1 pt-1">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${scorePassword(password).pct}%`,
                        background:
                          scorePassword(password).pct <= 25 ? "#f43f5e" :
                          scorePassword(password).pct <= 50 ? "#f59e0b" :
                          scorePassword(password).pct <= 75 ? "#3b82f6" : "#10b981",
                      }}
                    />
                  </div>
                  <p className={`text-[11.5px] mt-1 font-medium ${scorePassword(password).tone}`}>
                    Password strength: {scorePassword(password).label}
                  </p>
                </div>
              )}

              {password && password.length < 8 && (
                <p className="text-[12px] text-rose-500 px-1">Password must be at least 8 characters.</p>
              )}
              {confirm && password !== confirm && (
                <p className="text-[12px] text-rose-500 px-1">Passwords don't match.</p>
              )}

              <button
                type="submit"
                disabled={status === "saving" || !password || !confirm}
                className="w-full h-[56px] rounded-[18px] text-white font-semibold text-[16px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-50 mt-3 shadow-[0_12px_28px_-10px_rgba(47,128,237,0.65)]"
                style={{
                  background:
                    status === "saving" || !password || !confirm
                      ? "linear-gradient(180deg, #9DBEF0 0%, #7FA8E5 100%)"
                      : "linear-gradient(180deg, #2F80ED 0%, #1D6FE8 100%)",
                }}
              >
                {status === "saving" ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    Save new password
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {import.meta.env.DEV && (
        <div className="fixed inset-x-3 bottom-3 z-50 max-h-[42dvh] overflow-auto rounded-lg bg-foreground p-3 text-[11px] text-background shadow-elevated">
          <p className="font-semibold">Reset debug</p>
          <p className="break-all">URL: {recoverySnapshot.currentUrl}</p>
          <p>Query: {JSON.stringify(recoverySnapshot.queryParams)}</p>
          <p>Hash: {JSON.stringify(recoverySnapshot.hashParams)}</p>
          <p>Has code/token: {String(Boolean(recoverySnapshot.input))}</p>
          <p>Strategy: {recoverySnapshot.input?.strategy ?? "none"}</p>
          <p>Status: {status}</p>
        </div>
      )}
    </div>
  );
};

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

export default ResetPassword;
