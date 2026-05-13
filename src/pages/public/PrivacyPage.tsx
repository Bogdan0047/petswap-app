import PublicLayout from "./PublicLayout";

interface Section {
  title: string;
  body?: string;
  bullets?: string[];
}

const sections: Section[] = [
  {
    title: "1. Introduction",
    body:
      "PetSwap respects your privacy and is committed to protecting your personal data. This policy explains what we collect, why, and how we keep it safe.",
  },
  {
    title: "2. Information We Collect",
    bullets: [
      "Name",
      "Email address",
      "Profile information",
      "Pet information",
      "Messages between users",
      "Booking / swap requests",
      "Device analytics",
      "Subscription status (if applicable)",
    ],
  },
  {
    title: "3. How We Use Information",
    bullets: [
      "Operate the platform",
      "Enable pet swap connections",
      "Improve trust & safety",
      "Customer support",
      "Prevent fraud",
      "Improve app experience",
    ],
  },
  {
    title: "4. Sharing Data",
    body:
      "We do not sell personal data. We may share limited data with trusted service providers (hosting, analytics, payments) — all bound by data-protection contracts.",
  },
  {
    title: "5. Data Storage",
    body:
      "We use secure systems and industry-standard protections, including encryption in transit and at rest, with restricted internal access.",
  },
  {
    title: "6. User Rights",
    body:
      "Users may request access, correction or deletion of their personal data by emailing support@petswap.co.uk. We respond within 30 days.",
  },
  {
    title: "7. Children",
    body: "PetSwap is not intended for children under 18.",
  },
  {
    title: "8. Contact",
    body: "For privacy questions, contact support@petswap.co.uk.",
  },
  {
    title: "9. Updates",
    body:
      "We may update this policy occasionally. Continued use of PetSwap after changes means you accept the updated policy.",
  },
];

const PrivacyPage = () => (
  <PublicLayout
    title="Privacy Policy — PetSwap"
    description="How PetSwap collects, uses and protects your personal information. Read our full privacy policy."
  >
    <section className="max-w-3xl mx-auto px-5 sm:px-8 pt-16 sm:pt-20 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-slate-500 mb-3">
        Legal
      </p>
      <h1 className="text-[36px] sm:text-[52px] leading-[1.04] font-semibold tracking-tight text-slate-900">
        Privacy Policy
      </h1>
      <p className="mt-5 text-[17px] sm:text-[19px] leading-[1.55] text-slate-600 max-w-xl">
        How PetSwap collects, uses and protects your information.
      </p>
    </section>

    <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-10">
      <div className="bg-slate-50/70 rounded-3xl border border-slate-100 p-6 sm:p-10 space-y-8">
        {sections.map((s) => (
          <article key={s.title}>
            <h2 className="text-[18px] font-semibold text-slate-900 tracking-tight">
              {s.title}
            </h2>
            {s.body && (
              <p className="mt-2 text-[15.5px] leading-[1.7] text-slate-600">{s.body}</p>
            )}
            {s.bullets && (
              <ul className="mt-3 space-y-1.5">
                {s.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2.5 text-[15.5px] leading-[1.7] text-slate-600"
                  >
                    <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      <p className="mt-6 text-[13px] text-slate-400 text-center">Last updated: April 2026</p>
    </section>
  </PublicLayout>
);

export default PrivacyPage;
