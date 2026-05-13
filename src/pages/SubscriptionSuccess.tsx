import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Crown, Check, Loader2, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendlyError";

type Phase = "activating" | "active" | "pending";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { isActive, refresh } = useSubscription();
  const [phase, setPhase] = useState<Phase>(isActive ? "active" : "activating");
  const [openingPortal, setOpeningPortal] = useState(false);

  // Poll subscription status until active or timeout (~12s)
  useEffect(() => {
    if (isActive) {
      setPhase("active");
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      await refresh();
      if (cancelled) return;
      if (attempts >= 6) {
        setPhase((p) => (p === "active" ? p : "pending"));
        return;
      }
      setTimeout(tick, 2000);
    };
    setTimeout(tick, 1500);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isActive) setPhase("active");
  }, [isActive]);

  const openPortal = async () => {
    if (openingPortal) return;
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: window.location.origin + "/subscription",
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Could not open billing portal");
      window.open(data.url as string, "_blank", "noopener");
    } catch (e) {
      toast.error(friendlyError(e, "subscription"));
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-[#F8FAFC] flex flex-col">
      <div className="flex-1 px-6 pt-16 pb-10 max-w-md mx-auto w-full flex flex-col">
        <div className="flex flex-col items-center text-center">
          <div
            className="flex items-center justify-center mb-6"
            style={{
              width: 88, height: 88, borderRadius: 28,
              background: "linear-gradient(135deg, #2F80ED 0%, #1D6FE8 100%)",
              boxShadow: "0 18px 40px -14px rgba(29,111,232,0.55)",
            }}
          >
            {phase === "active" ? (
              <Crown size={42} className="text-white" />
            ) : phase === "activating" ? (
              <Loader2 size={42} className="text-white animate-spin" />
            ) : (
              <Crown size={42} className="text-white" />
            )}
          </div>

          <h1
            className="text-[#0F172A]"
            style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            {phase === "activating"
              ? "Activating your Premium access..."
              : "Welcome to PetSwap Premium"}
          </h1>
          <p className="text-[#64748B] mt-2.5" style={{ fontSize: 15, fontWeight: 500 }}>
            {phase === "activating"
              ? "Confirming your payment with our system."
              : phase === "active"
                ? "Your subscription is active."
                : "Payment received. Premium is still activating."}
          </p>
        </div>

        {/* Confirmation card */}
        <div
          className="bg-white mt-8"
          style={{
            borderRadius: 22,
            border: "1px solid #E8ECF2",
            padding: 18,
            boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: phase === "active" ? "rgba(16,185,129,0.12)" : "rgba(47,128,237,0.12)",
              }}
            >
              {phase === "active" ? (
                <Check size={18} className="text-[#10B981]" />
              ) : (
                <Loader2 size={18} className="text-[#2F80ED] animate-spin" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-[#0F172A] font-semibold text-[15px]">
                {phase === "active"
                  ? "You now have access to premium features."
                  : phase === "activating"
                    ? "Hang tight — usually takes a few seconds."
                    : "Premium is still activating."}
              </p>
              {phase === "pending" && (
                <p className="text-[#64748B] text-[13px] mt-1.5 leading-snug">
                  Please refresh this page in a moment, or contact support if it doesn't appear.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-7 space-y-2.5">
          <button
            onClick={() => navigate("/home")}
            className="w-full font-bold text-white inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{
              minHeight: 54,
              borderRadius: 16,
              fontSize: 16,
              background: "linear-gradient(180deg, #2F80ED 0%, #1D6FE8 100%)",
              boxShadow: "0 12px 26px -10px rgba(29,111,232,0.55)",
            }}
          >
            Go to Home <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate("/explore")}
            className="w-full bg-white inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{
              minHeight: 52,
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 600,
              color: "#0F172A",
              border: "1px solid #E8ECF2",
            }}
          >
            Explore helpers
          </button>
          <button
            onClick={openPortal}
            disabled={openingPortal}
            className="w-full inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ minHeight: 44, fontSize: 14, fontWeight: 600, color: "#2F80ED" }}
          >
            {openingPortal && <Loader2 size={14} className="animate-spin" />}
            Manage subscription
          </button>
        </div>

        {phase === "pending" && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 mx-auto block text-[13px] font-semibold text-[#2F80ED]"
          >
            Refresh status
          </button>
        )}
      </div>
    </div>
  );
}
