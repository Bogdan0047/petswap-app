import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "petswap_cookie_consent_v2";

type Consent = {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
};

const setConsent = (analytics: boolean) => {
  const value: Consent = {
    necessary: true,
    analytics,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

const CookieNotice = () => {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const t = window.setTimeout(() => setVisible(true), 500);
      return () => window.clearTimeout(t);
    }
  }, []);

  const decide = (opts: { analytics: boolean }) => {
    setConsent(opts.analytics);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_24px_70px_-20px_rgba(15,23,42,0.25)] rounded-2xl p-5">
        {!showPrefs ? (
          <>
            <p className="text-[14.5px] font-semibold text-slate-900 tracking-tight">
              Your privacy choices
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              We use essential cookies to make PetSwap work. With your consent we also use
              analytics cookies to improve the experience. See our{" "}
              <Link to="/privacy" className="underline underline-offset-2 text-slate-900">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => decide({ analytics: false })}
                className="px-4 py-2.5 rounded-full text-[13.5px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors active:scale-[0.98]"
              >
                Decline
              </button>
              <button
                onClick={() => decide({ analytics: true })}
                className="px-4 py-2.5 rounded-full text-[13.5px] font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors active:scale-[0.98]"
              >
                Accept all
              </button>
            </div>
            <button
              onClick={() => setShowPrefs(true)}
              className="mt-2.5 w-full text-center text-[12.5px] text-slate-500 hover:text-slate-900 underline underline-offset-2"
            >
              Manage preferences
            </button>
          </>
        ) : (
          <>
            <p className="text-[14.5px] font-semibold text-slate-900 tracking-tight">
              Cookie preferences
            </p>
            <div className="mt-3 space-y-3">
              <Row
                title="Strictly necessary"
                body="Required for the site to work. Cannot be turned off."
                checked
                disabled
              />
              <Row
                title="Analytics"
                body="Helps us understand how the site is used so we can improve it."
                checked={analytics}
                onChange={setAnalytics}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowPrefs(false)}
                className="px-4 py-2.5 rounded-full text-[13.5px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => decide({ analytics })}
                className="px-4 py-2.5 rounded-full text-[13.5px] font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                Save choices
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface RowProps {
  title: string;
  body: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}
const Row = ({ title, body, checked, disabled, onChange }: RowProps) => (
  <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50">
    <div>
      <p className="text-[13.5px] font-medium text-slate-900">{title}</p>
      <p className="mt-0.5 text-[12.5px] text-slate-500 leading-relaxed">{body}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${
        checked ? "bg-slate-900" : "bg-slate-300"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  </div>
);

export default CookieNotice;
