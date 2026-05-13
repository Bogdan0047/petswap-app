import { useNavigate } from "react-router-dom";
import { XCircle, ArrowRight } from "lucide-react";

export default function SubscriptionCancelled() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-[#F8FAFC] flex flex-col">
      <div className="flex-1 px-6 pt-16 pb-10 max-w-md mx-auto w-full flex flex-col">
        <div className="flex flex-col items-center text-center">
          <div
            className="flex items-center justify-center mb-6"
            style={{
              width: 88, height: 88, borderRadius: 28,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
            }}
          >
            <XCircle size={42} className="text-[#EF4444]" />
          </div>
          <h1
            className="text-[#0F172A]"
            style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            Subscription not completed
          </h1>
          <p className="text-[#64748B] mt-2.5" style={{ fontSize: 15, fontWeight: 500 }}>
            You can try again anytime.
          </p>
        </div>

        <div className="mt-8 space-y-2.5">
          <button
            onClick={() => navigate("/subscription")}
            className="w-full font-bold text-white inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{
              minHeight: 54,
              borderRadius: 16,
              fontSize: 16,
              background: "linear-gradient(180deg, #2F80ED 0%, #1D6FE8 100%)",
              boxShadow: "0 12px 26px -10px rgba(29,111,232,0.55)",
            }}
          >
            Try again <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate("/home")}
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
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
