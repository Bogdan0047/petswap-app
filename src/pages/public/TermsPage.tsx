import PublicLayout from "./PublicLayout";

interface Section {
  title: string;
  body?: string;
  bullets?: string[];
}

const sections: Section[] = [
  {
    title: "1. Acceptance",
    body: "By using PetSwap, you agree to these terms. If you do not agree, please do not use the app.",
  },
  {
    title: "2. Platform Purpose",
    body: "PetSwap connects pet owners who voluntarily exchange pet care support. We are a platform — we do not provide pet care directly.",
  },
  {
    title: "3. User Responsibilities",
    body: "Users must:",
    bullets: [
      "Provide honest profile information",
      "Treat animals responsibly",
      "Communicate clearly",
      "Respect agreed times",
      "Follow local animal laws",
    ],
  },
  {
    title: "4. Safety Disclaimer",
    body: "PetSwap is a platform only. Users are responsible for their own arrangements and decisions.",
  },
  {
    title: "5. No Guarantees",
    body: "We do not guarantee behaviour, compatibility, or outcomes between users.",
  },
  {
    title: "6. Account Misuse",
    body: "We may suspend fraudulent, abusive or unsafe accounts at our discretion.",
  },
  {
    title: "7. Paid Subscriptions",
    body: "If premium plans exist, subscriptions auto-renew unless cancelled before the end of the billing period via your app store or payment provider.",
  },
  {
    title: "8. Limitation of Liability",
    body: "PetSwap is not liable for indirect losses arising from user arrangements, to the maximum extent permitted by law.",
  },
  {
    title: "9. Changes",
    body: "We may update these terms anytime. Continued use after changes means you accept the updated terms.",
  },
  {
    title: "10. Contact",
    body: "For questions, contact support@petswap.co.uk.",
  },
];

const TermsPage = () => (
  <PublicLayout
    title="Terms of Use — PetSwap"
    description="The rules for using PetSwap safely and responsibly. Read the full Terms of Use."
  >
    <section className="max-w-3xl mx-auto px-5 sm:px-8 pt-16 sm:pt-20 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-slate-500 mb-3">
        Legal
      </p>
      <h1 className="text-[36px] sm:text-[52px] leading-[1.04] font-semibold tracking-tight text-slate-900">
        Terms of Use
      </h1>
      <p className="mt-5 text-[17px] sm:text-[19px] leading-[1.55] text-slate-600 max-w-xl">
        Rules for using PetSwap safely and responsibly.
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

export default TermsPage;
