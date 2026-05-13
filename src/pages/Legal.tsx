import { ArrowLeft, Mail, FileText, ShieldCheck, Users, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

interface Section {
  q: string;
  a: string;
}
interface PageContent {
  title: string;
  intro: string;
  updated: string;
  icon: React.ReactNode;
  sections: Section[];
  contact?: string;
}

const PAGES: Record<string, PageContent> = {
  '/legal/privacy': {
    title: 'Privacy Policy',
    intro: 'How PetSwap collects, uses and protects your information — written plainly.',
    updated: 'Last updated April 2026',
    icon: <ShieldCheck size={20} className="text-primary" />,
    sections: [
      {
        q: 'What we collect',
        a: 'Profile basics (name, email, phone), approximate location, pet details you add, in-app messages, verification documents, and usage analytics. We never collect data we don\'t need to run the service.',
      },
      {
        q: 'Why we collect it',
        a: 'Location helps match you with nearby owners — we only show approximate distance to others, never your exact spot. Profile and verification data builds trust. Messages stay between you and the other member.',
      },
      {
        q: 'Who we share it with',
        a: 'We do not sell your data. Limited sharing only with the providers we need to run PetSwap (hosting, payments, fraud prevention). All are bound by data-protection contracts.',
      },
      {
        q: 'Your rights',
        a: 'You can export or delete your data at any time from Profile → Settings → Delete account, or by emailing support@petswap.com. We respond within 30 days.',
      },
      {
        q: 'Security',
        a: 'Data is encrypted in transit and at rest. Sensitive verification data is stored separately with restricted access. Report any concern to support@petswap.com.',
      },
    ],
    contact: 'support@petswap.com',
  },
  '/legal/terms': {
    title: 'Terms & Conditions',
    intro: 'The agreement between you and PetSwap when you use the app.',
    updated: 'Last updated April 2026',
    icon: <FileText size={20} className="text-primary" />,
    sections: [
      {
        q: 'How PetSwap works',
        a: 'PetSwap is a platform that connects pet owners for mutual care. We facilitate connections — we do not directly provide pet care or veterinary services.',
      },
      {
        q: 'Your responsibilities',
        a: 'You\'re responsible for the accuracy of your profile, the safety of pets in your care, and the arrangements you make with other members. Always meet first and follow the owner\'s instructions.',
      },
      {
        q: 'Subscriptions',
        a: 'Trusted Plus is £4.99/month or £39.99/year (save 33%). It auto-renews unless cancelled at least 24h before the period ends. Cancel any time from Settings → Subscription.',
      },
      {
        q: 'Refunds',
        a: 'Refunds are handled per Apple/Google store policies. For subscription disputes, email support@petswap.com — Trusted Plus members get priority review within 24h.',
      },
      {
        q: 'Safety disclaimer',
        a: 'PetSwap provides a platform for connection but cannot guarantee any interaction. We do not provide veterinary, legal or insurance services. Use the Safety Centre for guidance and report any concerns immediately.',
      },
      {
        q: 'Account termination',
        a: 'We may suspend or remove accounts that breach these terms or our Community Guidelines. You can delete your account at any time.',
      },
    ],
    contact: 'support@petswap.com',
  },
  '/legal/guidelines': {
    title: 'Community Guidelines',
    intro: 'PetSwap is built on trust. A few simple rules keep it that way.',
    updated: 'Last updated April 2026',
    icon: <Users size={20} className="text-primary" />,
    sections: [
      {
        q: 'Be honest',
        a: 'Use real photos, real names and accurate pet information. Misleading profiles hurt trust for everyone.',
      },
      {
        q: 'Be reliable',
        a: 'Honour your commitments. If plans change, give as much notice as possible — repeat cancellations affect your reliability score and visibility.',
      },
      {
        q: 'Be respectful',
        a: 'Treat other members and their pets with kindness. Discrimination, harassment or unsafe behaviour leads to removal.',
      },
      {
        q: 'Meet first',
        a: 'Arrange a short intro before your first swap. It builds confidence on both sides and is better for the pet.',
      },
      {
        q: 'Keep it in-app',
        a: 'Use PetSwap messages so we can help if anything goes wrong. Sharing personal contact details too early is discouraged.',
      },
      {
        q: 'Report concerns',
        a: 'If something feels wrong, use Report on the user\'s profile or open the Safety Centre. All reports are reviewed by our Trust & Safety team.',
      },
    ],
  },
};

const Legal = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const page = PAGES[pathname] || PAGES['/legal/privacy'];

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 safe-top flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="p-1 -ml-1 active:scale-90 transition-transform"
        >
          <ArrowLeft size={22} />
        </button>
      </div>

      {/* Hero */}
      <div className="px-6 pt-2 pb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            {page.icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold tracking-tight leading-tight">{page.title}</h1>
            <p className="text-[12px] text-muted-foreground">{page.updated}</p>
          </div>
        </div>
        <p className="text-[14px] text-muted-foreground leading-relaxed">{page.intro}</p>
      </div>

      {/* Sections */}
      <div className="px-6">
        <div className="card-elevated p-1 overflow-hidden">
          <Accordion type="single" collapsible className="w-full">
            {page.sections.map((s, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className={i === page.sections.length - 1 ? 'border-b-0' : ''}
              >
                <AccordionTrigger className="px-4 text-[14.5px] font-semibold text-foreground hover:no-underline">
                  {s.q}
                </AccordionTrigger>
                <AccordionContent className="px-4 text-[13.5px] text-muted-foreground leading-relaxed">
                  {s.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact card */}
        {page.contact && (
          <a
            href={`mailto:${page.contact}`}
            className="card-elevated p-4 mt-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold">Questions?</p>
              <p className="text-[12.5px] text-muted-foreground truncate">{page.contact}</p>
            </div>
            <span className="text-[12px] font-semibold text-primary">Email</span>
          </a>
        )}

        {/* Cross-link to others */}
        <div className="mt-5">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground px-1 pb-2">
            More
          </p>
          <div className="card-elevated divide-y divide-border/60 overflow-hidden p-0">
            {Object.entries(PAGES)
              .filter(([path]) => path !== pathname)
              .map(([path, p]) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="w-full p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles size={15} className="text-primary" />
                  </div>
                  <span className="flex-1 text-[14px] font-medium">{p.title}</span>
                  <span className="text-muted-foreground text-[18px] leading-none">›</span>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Legal;
