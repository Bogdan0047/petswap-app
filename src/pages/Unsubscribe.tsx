import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, MailX, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import EmailPreferencesSection from "@/components/EmailPreferencesSection";

type Status = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      // No token: show preferences UI for logged-in users instead of an error.
      setStatus("invalid");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.valid) setStatus("valid");
        else if (data?.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      } catch {
        if (!cancelled) setStatus("invalid");
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setStatus("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success || data?.reason === "already_unsubscribed") {
        setStatus("done");
      } else {
        setStatus("error");
        setErrorMsg("We couldn't process that request.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      <div className="max-w-sm w-full text-center space-y-5">
        {status === "loading" && (
          <>
            <Loader2 size={28} className="text-primary animate-spin mx-auto" />
            <p className="text-[15px] text-muted-foreground">Checking your link…</p>
          </>
        )}

        {(status === "valid" || status === "submitting") && (
          <>
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <MailX size={26} />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight">Unsubscribe from PetSwap emails?</h1>
            <p className="text-[15px] text-muted-foreground">
              You'll stop receiving non-essential emails from us. You may still receive
              messages about your account or active bookings.
            </p>
            <button
              onClick={handleConfirm}
              disabled={status === "submitting"}
              className="w-full h-[52px] rounded-[16px] bg-primary text-primary-foreground font-semibold text-[15px] disabled:opacity-60"
            >
              {status === "submitting" ? "Unsubscribing…" : "Confirm unsubscribe"}
            </button>
            <Link to="/" className="block text-[13.5px] font-semibold text-muted-foreground">
              Cancel
            </Link>
          </>
        )}

        {status === "already" && (
          <>
            <div className="w-14 h-14 rounded-full bg-muted text-foreground flex items-center justify-center mx-auto">
              <CheckCircle2 size={26} />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight">You're already unsubscribed</h1>
            <p className="text-[15px] text-muted-foreground">
              This email address has already been removed from our list.
            </p>
            <Link to="/" className="inline-block mt-2 h-[48px] px-6 leading-[48px] rounded-[14px] bg-muted text-foreground font-semibold text-[14px]">
              Back to PetSwap
            </Link>
          </>
        )}

        {status === "done" && (
          <>
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <CheckCircle2 size={26} />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight">You're unsubscribed</h1>
            <p className="text-[15px] text-muted-foreground">
              You won't receive non-essential emails from PetSwap anymore. Sorry to see you go.
            </p>
            <Link to="/" className="inline-block mt-2 h-[48px] px-6 leading-[48px] rounded-[14px] bg-primary text-primary-foreground font-semibold text-[14px]">
              Back to PetSwap
            </Link>
          </>
        )}

        {(status === "invalid" || status === "error") && !token && user && (
          <div className="text-left">
            <h1 className="text-[22px] font-bold tracking-tight text-center mb-2">Email preferences</h1>
            <p className="text-[14px] text-muted-foreground text-center mb-4">
              Choose which PetSwap emails you'd like to receive.
            </p>
            <EmailPreferencesSection />
            <Link to="/" className="block mt-4 text-center text-[13.5px] font-semibold text-muted-foreground">
              Back to PetSwap
            </Link>
          </div>
        )}

        {(status === "invalid" || status === "error") && (token || !user) && (
          <>
            <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle size={26} />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight">This link is invalid or expired</h1>
            <p className="text-[15px] text-muted-foreground">
              {errorMsg || "Try opening the unsubscribe link from your most recent PetSwap email, or sign in to manage your preferences."}
            </p>
            <Link to="/" className="inline-block mt-2 h-[48px] px-6 leading-[48px] rounded-[14px] bg-muted text-foreground font-semibold text-[14px]">
              Back to PetSwap
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
