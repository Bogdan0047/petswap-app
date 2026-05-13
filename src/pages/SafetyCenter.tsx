import { ArrowLeft, Shield, ShieldCheck, Heart, AlertTriangle, MessageCircle, Star, Flag, Ban, PhoneCall, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Section {
  id: string;
  icon: typeof Shield;
  title: string;
  intro: string;
  items: string[];
  tone?: 'primary' | 'warning' | 'info';
}

const sections: Section[] = [
  {
    id: 'meet-safely',
    icon: Heart,
    title: 'Meet safely',
    intro: 'A short meet before any swap helps everyone — pets included.',
    items: [
      'Choose a public spot like a park or café for the first meet',
      'Tell a friend or family member where you’re going and when',
      'Trust your instincts — it’s OK to walk away if anything feels off',
      'Keep first meets short and bring a phone with battery',
    ],
    tone: 'primary',
  },
  {
    id: 'first-meetup',
    icon: Users,
    title: 'First pet meetup checklist',
    intro: 'Make sure pet and people get along before committing.',
    items: [
      'Both pets on lead for the first 5–10 minutes',
      'Watch body language — wagging, calm sniffing, soft eyes',
      'Walk together so they meet on neutral ground',
      'Agree there’s no obligation if it isn’t a good fit',
    ],
    tone: 'primary',
  },
  {
    id: 'handover',
    icon: ShieldCheck,
    title: 'Pet handover checklist',
    intro: 'Cover the basics so the helper feels confident from minute one.',
    items: [
      'Feeding schedule, food type and portion sizes',
      'Walking routine, lead/harness preferences and recall words',
      'Medication, dose and timing if any',
      'Vet name, microchip number and any allergies',
      'House rules — sofa, treats, sleeping spots',
      'Drop-off and pick-up time agreed in writing',
    ],
    tone: 'info',
  },
  {
    id: 'emergency',
    icon: PhoneCall,
    title: 'Emergency contacts',
    intro: 'Share these before the swap starts.',
    items: [
      'A back-up contact who can collect the pet if needed',
      'The pet’s vet practice and out-of-hours number',
      'Any insurance details and policy number',
      'In a true emergency in the UK, call 999 and your vet',
    ],
    tone: 'warning',
  },
  {
    id: 'how-trust',
    icon: ShieldCheck,
    title: 'How the trust score works',
    intro: 'Each profile’s 0–100 trust score reflects verifiable behaviour.',
    items: [
      'Email, phone and ID verification add the largest boost',
      'Completed swaps and consistent ratings build it over time',
      'Fast response and low cancellations keep it high',
      'A complete, recent profile gives a small extra lift',
      'Only verified actions count — nobody can self-assign trust',
    ],
    tone: 'primary',
  },
  {
    id: 'how-reviews',
    icon: Star,
    title: 'How reviews work',
    intro: 'Reviews are tied to a completed swap — they can’t be faked.',
    items: [
      'Both people can review each other once the swap is marked complete',
      'You leave a star rating, optional tags and a short note',
      '“Would trust again” is a simple yes/no signal',
      'Reviews are public on the profile and influence the trust score',
    ],
    tone: 'info',
  },
  {
    id: 'reporting',
    icon: Flag,
    title: 'Reporting and blocking',
    intro: 'You stay in control of who can reach you.',
    items: [
      'Tap the … menu on any profile or chat to report or block',
      'Reports are private — the other person isn’t notified',
      'Blocking hides them from search, matching and messaging',
      'Our team reviews every report, usually within 24 hours',
    ],
    tone: 'warning',
  },
  {
    id: 'community',
    icon: Users,
    title: 'Community rules',
    intro: 'Behaviours we expect from every member.',
    items: [
      'Be honest about who you are and the pets you care for',
      'Keep messages within the app for safety',
      'No payments outside PetSwap credits',
      'Treat every animal and person with care and respect',
      'Cancel as early as you can — no-shows hurt the community',
    ],
    tone: 'primary',
  },
];

const toneAccent = (tone: Section['tone']) => {
  switch (tone) {
    case 'warning': return { bg: 'bg-warning/10', text: 'text-warning' };
    case 'info': return { bg: 'bg-info/10', text: 'text-info' };
    default: return { bg: 'bg-primary/10', text: 'text-primary' };
  }
};

const SafetyCenter = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Top bar */}
      <div className="px-6 pt-6 pb-2 safe-top flex items-center gap-4">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1"><ArrowLeft size={24} /></button>
        <h1 className="font-bold text-[18px]">Safety Centre</h1>
      </div>

      {/* Hero */}
      <div className="px-6 mt-3 mb-7">
        <div className="card-elevated p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/5" aria-hidden />
          <div className="relative">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
              <Shield size={22} className="text-primary" />
            </div>
            <h2 className="font-bold text-[22px] leading-tight">Built on trust, kept safe by design.</h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed mt-2">
              PetSwap gives you the tools to connect confidently — verified profiles, honest reviews,
              clear safety guidance and one-tap reporting.
            </p>
            <button onClick={() => navigate('/explore')} className="btn-primary mt-5 text-[14px] py-3 px-5 inline-flex items-center gap-1.5">
              Read before your first swap <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick anchors */}
      <div className="px-6 mb-7">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {sections.slice(0, 5).map((s) => (
            <a key={s.id} href={`#${s.id}`} className="card-flat px-4 py-2 text-[12px] font-semibold whitespace-nowrap text-foreground/80 hover:text-foreground">
              {s.title}
            </a>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="px-6 space-y-5">
        {sections.map((section) => {
          const Icon = section.icon;
          const tone = toneAccent(section.tone);
          return (
            <section key={section.id} id={section.id} className="card-elevated p-6 scroll-mt-20">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-11 h-11 rounded-md ${tone.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={tone.text} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[17px] leading-tight">{section.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{section.intro}</p>
                </div>
              </div>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className={`mt-0.5 flex-shrink-0 ${tone.text}`} />
                    <span className="text-[14px] text-foreground/80 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Report / contact actions */}
      <div className="px-6 mt-7">
        <h3 className="font-bold text-[15px] mb-3 px-1">Need help right now?</h3>
        <div className="card-elevated p-2 divide-y divide-border">
          <div className="w-full flex items-center gap-3 p-4 text-left">
            <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center"><Flag size={18} className="text-destructive" /></div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold">Report a user</p>
              <p className="text-[12px] text-muted-foreground">From their profile or chat → … menu</p>
            </div>
          </div>
          <div className="w-full flex items-center gap-3 p-4 text-left">
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center"><Ban size={18} className="text-foreground/70" /></div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold">Block a user</p>
              <p className="text-[12px] text-muted-foreground">Hides them from search, matching and messages</p>
            </div>
          </div>
          <a href="mailto:support@petswap.app" className="w-full flex items-center gap-3 p-4 text-left">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center"><MessageCircle size={18} className="text-primary" /></div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold">Contact support</p>
              <p className="text-[12px] text-muted-foreground">Replies within 24 hours · support@petswap.app</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </a>
        </div>

        <p className="text-[12px] text-muted-foreground leading-relaxed mt-5 px-1 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          PetSwap helps people connect — it cannot guarantee outcomes. You stay responsible for arrangements
          you make. In an emergency, contact your vet or call 999.
        </p>
      </div>
    </div>
  );
};

export default SafetyCenter;
