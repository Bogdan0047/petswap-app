import { useState, useEffect, FormEvent } from "react";
import {
  Mail,
  ShieldAlert,
  CreditCard,
  Clock,
  ChevronDown,
  Check,
  ShieldCheck,
  Zap,
  Heart,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { z } from "zod";
import PublicLayout from "./PublicLayout";
import { supabase } from "@/integrations/supabase/client";

const cards = [
  {
    icon: Mail,
    title: "General Support",
    body: "Questions about how PetSwap works or anything else.",
    contact: "support@petswap.co.uk",
  },
  {
    icon: ShieldAlert,
    title: "Safety Concerns",
    body: "Report urgent trust & safety concerns immediately.",
    contact: "support@petswap.co.uk",
  },
  {
    icon: CreditCard,
    title: "Subscription Help",
    body: "Billing, cancellations, account issues.",
    contact: "support@petswap.co.uk",
  },
  {
    icon: Clock,
    title: "Response Time",
    body: "We usually reply within 24–48 hours.",
    contact: null as string | null,
  },
];

const trust = [
  {
    icon: ShieldCheck,
    title: "Safe Community",
    body: "Verified profiles, trust scores and a 24/7 reporting flow keep PetSwap safe.",
  },
  {
    icon: Zap,
    title: "Fast Help",
    body: "Real humans reply within 24–48 hours. Trusted Plus members get priority.",
  },
  {
    icon: Heart,
    title: "Pet Lovers First",
    body: "Built by pet owners, for pet owners. Every decision starts with the pets.",
  },
];

const faqs = [
  {
    q: "How does PetSwap work?",
    a: "PetSwap connects nearby pet owners so they can arrange mutual pet care swaps — looking after each other's pets when needed, with no money changing hands between members.",
  },
  {
    q: "Is PetSwap a pet sitting company?",
    a: "No. PetSwap is a platform that helps pet owners connect. We do not provide pet sitting services directly and do not employ sitters.",
  },
  {
    q: "How do I report a safety concern?",
    a: "Use the Report option on the user's profile inside the app, or email support@petswap.co.uk. Our Trust & Safety team reviews every report.",
  },
  {
    q: "How do I delete my account?",
    a: "Open the app, go to Profile → Settings → Delete account. You can also email support@petswap.co.uk and we'll handle it within 30 days.",
  },
  {
    q: "How do I contact support?",
    a: "Email support@petswap.co.uk or use the contact form on this page. Trusted Plus members receive priority replies.",
  },
];

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  subject: z.string().trim().min(1, "Please add a subject").max(150),
  message: z.string().trim().min(1, "Please add a message").max(2000),
});

type Status = "idle" | "submitting" | "success" | "error";

const SupportPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const id = "faq-jsonld";
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setStatus("submitting");
    setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("send-support-message", {
        body: result.data,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("Send failed");
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(
        "We couldn't send your message right now. Please email support@petswap.co.uk directly.",
      );
    }
  };

  return (
    <PublicLayout
      title="Support — PetSwap"
      description="Need help with PetSwap? Contact our team for account, safety, billing or general questions. We reply within 24–48 hours."
    >
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pt-16 sm:pt-20 pb-10 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-slate-500 mb-3">
          Help Centre
        </p>
        <h1 className="text-[36px] sm:text-[56px] leading-[1.04] font-semibold tracking-tight text-slate-900">
          We're here to help.
        </h1>
        <p className="mt-5 text-[17px] sm:text-[19px] leading-[1.55] text-slate-600 max-w-xl mx-auto">
          Reach our team for anything — safety, your account or general questions.
          Most replies arrive within 24–48 hours.
        </p>
        <a
          href="mailto:support@petswap.co.uk"
          className="inline-flex items-center gap-2 mt-7 px-5 py-3 rounded-full bg-slate-900 text-white text-[15px] font-medium hover:bg-slate-800 transition-all active:scale-[0.98] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)]"
        >
          <Mail size={16} />
          support@petswap.co.uk
        </a>
      </section>

      {/* Trust strip */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {trust.map((t, i) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 hover:border-slate-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.12)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${i * 90}ms`, animationFillMode: "backwards" }}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900/[0.04] flex items-center justify-center mb-3.5">
                  <Icon size={18} className="text-slate-700" />
                </div>
                <h3 className="text-[15.5px] font-semibold text-slate-900 tracking-tight">
                  {t.title}
                </h3>
                <p className="mt-1 text-[14px] text-slate-600 leading-[1.6]">{t.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cards */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-14">
        <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-slate-900 mb-5">
          What do you need help with?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-slate-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 animate-in fade-in"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
              >
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-slate-700" />
                </div>
                <h3 className="text-[16.5px] font-semibold text-slate-900 tracking-tight">
                  {c.title}
                </h3>
                <p className="mt-1.5 text-[14.5px] text-slate-600 leading-[1.6]">{c.body}</p>
                {c.contact && (
                  <a
                    href={`mailto:${c.contact}`}
                    className="mt-3 inline-block text-[14px] font-medium text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-900 transition-colors"
                  >
                    {c.contact}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-14">
        <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-tight text-slate-900 mb-6">
          Frequently asked
        </h2>
        <div className="bg-slate-50/70 rounded-3xl border border-slate-100 divide-y divide-slate-200/70 overflow-hidden">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <button
                key={f.q}
                onClick={() => setOpenFaq(open ? null : i)}
                className="w-full text-left px-5 sm:px-6 py-5 focus:outline-none focus-visible:bg-white/60 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[15px] sm:text-[15.5px] font-medium text-slate-900">
                    {f.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                  />
                </div>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <p className="text-[14.5px] sm:text-[15px] leading-[1.7] text-slate-600">
                      {f.a}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Contact Form */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-20">
        <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-tight text-slate-900 mb-6">
          Send us a message
        </h2>
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {status === "success" ? (
            <div className="py-10 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-50 mx-auto flex items-center justify-center mb-4">
                <Check size={22} className="text-emerald-600" />
              </div>
              <h3 className="text-[18px] font-semibold text-slate-900 tracking-tight">
                Thank you. Your message has been received.
              </h3>
              <p className="mt-2 text-[14.5px] text-slate-600">
                We'll reply by email within 24–48 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                label="Name"
                value={form.name}
                error={errors.name}
                onChange={(v) => setForm({ ...form, name: v })}
                autoComplete="name"
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                error={errors.email}
                onChange={(v) => setForm({ ...form, email: v })}
                autoComplete="email"
                inputMode="email"
              />
              <Field
                label="Subject"
                value={form.subject}
                error={errors.subject}
                onChange={(v) => setForm({ ...form, subject: v })}
              />
              <Field
                label="Message"
                multiline
                value={form.message}
                error={errors.message}
                onChange={(v) => setForm({ ...form, message: v })}
              />

              {status === "error" && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                  <p className="text-[13.5px] text-red-700 leading-relaxed">{errorMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-[15px] font-medium hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_8px_24px_-8px_rgba(15,23,42,0.4)]"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Message"
                )}
              </button>
            </form>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  multiline?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url" | "search" | "none" | "numeric" | "decimal";
}
const Field = ({
  label,
  value,
  onChange,
  error,
  type = "text",
  multiline,
  autoComplete,
  inputMode,
}: FieldProps) => (
  <div>
    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all resize-y ${
          error ? "border-red-300" : "border-slate-200"
        }`}
      />
    ) : (
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all ${
          error ? "border-red-300" : "border-slate-200"
        }`}
      />
    )}
    {error && (
      <p className="mt-1.5 text-[12.5px] text-red-600 animate-in fade-in slide-in-from-top-0.5">
        {error}
      </p>
    )}
  </div>
);

export default SupportPage;
