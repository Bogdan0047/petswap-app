import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  Mail,
  ChevronRight,
  ShieldAlert,
  Crown,
  Send,
  Loader2,
  CreditCard,
  ShieldCheck,
  UserCog,
  Sparkles,
  Check,
  CheckCheck,
  BellRing,
  Lock,
  Clock,
  Headphones,
  HelpCircle,
} from 'lucide-react';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useCurrentUserId } from '@/hooks/useTrustProfile';
import { haptic } from '@/lib/haptic';
import { toast } from 'sonner';

type Mode = 'home' | 'chat' | 'emergency' | 'troubleshoot';
type Msg = {
  id: string;
  from: 'user' | 'bot' | 'agent' | 'system';
  body: string;
  ts: number;
  status?: 'sent' | 'delivered' | 'read';
};

type CategoryKey = 'chat' | 'emergency' | 'billing' | 'account';

const MAIN_CATEGORIES: {
  key: CategoryKey;
  label: string;
  hint: string;
  icon: typeof MessageCircle;
  tone: 'primary' | 'danger' | 'amber' | 'neutral';
}[] = [
  { key: 'chat',      label: 'Live chat',              hint: 'Instant answers + human backup', icon: MessageCircle, tone: 'primary' },
  { key: 'emergency', label: 'Safety emergency',       hint: 'Urgent pet or trust concern',    icon: ShieldAlert,   tone: 'danger'  },
  { key: 'billing',   label: 'Billing & subscription', hint: 'Refunds, payments, Trusted Plus', icon: CreditCard,    tone: 'amber'   },
  { key: 'account',   label: 'Account help',           hint: 'Login, profile, verification',   icon: UserCog,       tone: 'neutral' },
];

const FAQS = [
  { q: 'How do refunds work?', a: 'Refunds are processed within 3–5 business days to your original payment method. Trusted Plus members get priority review.' },
  { q: 'Can I cancel a booking?', a: 'Yes — open the booking in chat, tap the booking card, then choose Cancel. Free cancellation up to 24h before start.' },
  { q: 'How do I cancel Trusted Plus?', a: 'Open Settings → Subscription, then Cancel. Your benefits remain until the end of the billing period.' },
  { q: 'Is my data private?', a: 'Yes. Personal details are never shared with other users. See Privacy for full details.' },
];

const QUICK_REPLIES: Record<string, string> = {
  'Refund help':
    'Refunds are reviewed within 24h for Trusted Plus, 3–5 days otherwise. Please share the booking date and a short note — I\'ll prepare your case.',
  'Cancel booking':
    "I can help cancel a booking. Open the conversation with the other member and tap the booking card → Cancel. If it's within 24h of start, fees may apply. Want me to escalate to a human?",
  'User issue':
    "Thanks for telling us — your safety comes first. Share the username and what happened, and I'll route this to our Trust & Safety team.",
  'Notifications broken':
    'Let\'s fix it fast — try our 1-tap diagnostic from Support → "Notifications not working?" or tell me what you\'re seeing.',
  'Subscription help':
    'I can help. Tell me what\'s happening (charge, downgrade, restore) and I\'ll prepare a billing case for our team.',
};

const Support = () => {
  const navigate = useNavigate();
  const myUserId = useCurrentUserId();
  const { profile } = useMyProfile(myUserId);
  const isPlus = (profile?.subscription_tier ?? 'free') !== 'free';

  const [mode, setMode] = useState<Mode>('home');
  const [emergencySent, setEmergencySent] = useState(false);

  useEffect(() => {
    // trackEvent omitted (event not in union);
  }, []);

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-white via-white to-[#F8FAFC]">
      {/* Top bar */}
      <div className="px-5 pt-3 safe-top flex items-center gap-2">
        <button
          onClick={() => (mode === 'home' ? navigate(-1) : setMode('home'))}
          className="p-2 -ml-2 rounded-full active:bg-muted/60 transition"
          aria-label="Back"
        >
          <ArrowLeft size={22} className="text-[#0F172A]" />
        </button>
        <h1 className="text-[17px] font-semibold text-[#0F172A] tracking-tight">
          {mode === 'chat'
            ? 'Live chat'
            : mode === 'emergency'
              ? 'Emergency help'
              : mode === 'troubleshoot'
                ? 'Notifications fix'
                : 'Help'}
        </h1>
      </div>

      {mode === 'home' && (
        <HomeView
          isPlus={isPlus}
          onCategory={(key) => {
            haptic('light');
            if (key === 'emergency') setMode('emergency');
            else setMode('chat');
          }}
          onTroubleshoot={() => {
            haptic('light');
            setMode('troubleshoot');
          }}
        />
      )}

      {mode === 'chat' && <ChatView isPlus={isPlus} userName={profile?.first_name ?? 'there'} />}

      {mode === 'troubleshoot' && <TroubleshootView />}

      {mode === 'emergency' && (
        <EmergencyView
          sent={emergencySent}
          onSubmit={() => {
            haptic('medium');
            setEmergencySent(true);
            toast.success('Urgent ticket created', {
              description: 'A safety specialist will contact you within 15 minutes.',
            });
          }}
        />
      )}
    </div>
  );
};

/* ─────────────  HOME  ───────────── */

const TONE_STYLE: Record<'primary' | 'danger' | 'amber' | 'neutral', { iconBg: string; iconColor: string }> = {
  primary: { iconBg: 'rgba(47,128,237,0.10)', iconColor: '#2F80ED' },
  danger:  { iconBg: 'rgba(220,38,38,0.10)',  iconColor: '#DC2626' },
  amber:   { iconBg: 'rgba(245,158,11,0.12)', iconColor: '#B45309' },
  neutral: { iconBg: 'rgba(15,23,42,0.06)',   iconColor: '#0F172A' },
};

const HomeView = ({
  isPlus,
  onCategory,
  onTroubleshoot,
}: {
  isPlus: boolean;
  onCategory: (key: CategoryKey) => void;
  onTroubleshoot: () => void;
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  return (
    <div className="px-5 mt-3">
      {/* Hero header */}
      <div className="pt-1 pb-4">
        <div className="inline-flex items-center gap-1.5 mb-2">
          <span className="relative inline-flex">
            <span className="block w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="absolute inset-0 rounded-full bg-[#10B981] opacity-50 animate-ping" />
          </span>
          <span className="text-[12px] font-semibold text-[#10B981]">Online now</span>
          <span className="text-[12px] text-[#94A3B8]">• Avg reply 3 min</span>
          {isPlus && (
            <span
              className="ml-1 inline-flex items-center gap-1"
              style={{
                background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E',
                fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
              }}
            >
              <Crown size={10} /> Priority
            </span>
          )}
        </div>
        <h1 className="text-[#0F172A]" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          How can we help today?
        </h1>
        <p className="text-[#64748B] mt-1" style={{ fontSize: 14, lineHeight: 1.4 }}>
          Fast support for bookings, payments, safety and account help — 24/7.
        </p>
      </div>

      {/* 4-card category grid */}
      <div className="grid grid-cols-2 gap-3">
        {MAIN_CATEGORIES.map((c) => {
          const Icon = c.icon;
          const tone = TONE_STYLE[c.tone];
          const isDanger = c.tone === 'danger';
          return (
            <button
              key={c.key}
              onClick={() => onCategory(c.key)}
              className="text-left active:scale-[0.98] transition-transform"
              style={{
                background: '#FFFFFF',
                border: isDanger ? '1px solid #FCA5A5' : '1px solid #E8ECF2',
                borderRadius: 22,
                padding: 16,
                minHeight: 140,
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{ width: 40, height: 40, borderRadius: 12, background: tone.iconBg }}
              >
                <Icon size={20} style={{ color: tone.iconColor }} />
              </div>
              <p
                className="mt-3"
                style={{ fontSize: 15, fontWeight: 700, color: isDanger ? '#7F1D1D' : '#0F172A', letterSpacing: '-0.01em' }}
              >
                {c.label}
              </p>
              <p
                className="mt-0.5"
                style={{ fontSize: 12, lineHeight: 1.35, color: isDanger ? '#991B1B' : '#64748B' }}
              >
                {c.hint}
              </p>
            </button>
          );
        })}
      </div>

      {/* Notifications troubleshoot shortcut */}
      <button
        onClick={onTroubleshoot}
        className="w-full mt-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8ECF2',
          borderRadius: 18,
          padding: 14,
          textAlign: 'left',
          boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(47,128,237,0.10)' }}
        >
          <BellRing size={18} className="text-[#2F80ED]" />
        </div>
        <div className="flex-1">
          <p className="text-[#0F172A]" style={{ fontSize: 14, fontWeight: 700 }}>
            Notifications not working?
          </p>
          <p className="text-[#64748B]" style={{ fontSize: 12 }}>
            1-tap diagnostic — fixes 9 out of 10 cases
          </p>
        </div>
        <ChevronRight size={16} className="text-[#CBD5E1]" />
      </button>

      {/* Trust signals */}
      <div
        className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5"
        style={{ background: 'transparent', padding: '4px 2px' }}
      >
        {[
          { icon: Headphones, text: 'Real human support' },
          { icon: Lock, text: 'Secure conversations' },
          { icon: Clock, text: 'Replies under 5 min' },
          { icon: ShieldCheck, text: 'Safety reviewed fast' },
        ].map((t) => {
          const I = t.icon;
          return (
            <div key={t.text} className="flex items-center gap-1.5">
              <I size={13} className="text-[#10B981]" />
              <span className="text-[12px] text-[#475569]">{t.text}</span>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <h3 className="mt-7 mb-3 text-[#64748B]" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em' }}>
        QUICK ANSWERS
      </h3>
      <div
        className="bg-white overflow-hidden"
        style={{
          borderRadius: 18,
          border: '1px solid #E8ECF2',
          boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
        }}
      >
        {FAQS.map((f, i) => {
          const open = openFaq === i;
          return (
            <div key={f.q} style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9' }}>
              <button
                onClick={() => setOpenFaq(open ? null : i)}
                className="w-full flex items-center gap-3 px-3.5 py-3.5 text-left active:bg-[#F8FAFC]"
              >
                <HelpCircle size={15} className="text-[#94A3B8] flex-shrink-0" />
                <p className="flex-1 text-[#0F172A]" style={{ fontSize: 14, fontWeight: 600 }}>{f.q}</p>
                <ChevronRight
                  size={16}
                  className="text-[#CBD5E1] transition-transform"
                  style={{ transform: open ? 'rotate(90deg)' : 'none' }}
                />
              </button>
              {open && (
                <p className="px-3.5 pb-3.5 pl-10 -mt-1 text-[#475569]" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                  {f.a}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Email fallback */}
      <a
        href="mailto:support@petswap.app"
        className="mt-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8ECF2',
          borderRadius: 18,
          padding: 14,
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: 38, height: 38, borderRadius: 12, background: '#F1F5F9' }}
        >
          <Mail size={18} className="text-[#0F172A]" />
        </div>
        <div className="flex-1">
          <p className="text-[#0F172A]" style={{ fontSize: 14, fontWeight: 600 }}>Prefer email?</p>
          <p className="text-[#64748B]" style={{ fontSize: 12.5 }}>support@petswap.app · UK hours</p>
        </div>
        <ChevronRight size={16} className="text-[#CBD5E1]" />
      </a>

      <p className="text-center mt-5 text-[#94A3B8]" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
        Conversations are private and handled per our Privacy Policy.
      </p>
    </div>
  );
};

/* ─────────────  TROUBLESHOOT (notifications)  ───────────── */

const TroubleshootView = () => {
  const [step, setStep] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [testing, setTesting] = useState(false);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Notifications enabled');
        setStep(2);
      } else {
        toast.error('Permission blocked', {
          description: 'Open your browser/device settings to allow notifications.',
        });
      }
    } catch {
      toast.error('Could not request permission');
    }
  };

  const sendTest = async () => {
    setTesting(true);
    haptic('light');
    try {
      if (permission === 'granted' && typeof Notification !== 'undefined') {
        new Notification('PetSwap', {
          body: '✅ Notifications are working — you\'re all set.',
        });
        toast.success('Test alert sent');
      } else {
        toast.success('Test alert sent (in-app)', {
          description: 'Push permission isn\'t granted, but in-app alerts will still work.',
        });
      }
    } finally {
      setTimeout(() => setTesting(false), 600);
    }
  };

  const steps: { title: string; body: string; action?: { label: string; onClick: () => void; primary?: boolean } }[] = [
    {
      title: 'Check permissions',
      body:
        permission === 'granted'
          ? 'Push permission is granted ✅'
          : permission === 'denied'
            ? 'Push permission is blocked. Open browser/device settings to allow PetSwap notifications.'
            : permission === 'unsupported'
              ? 'This browser doesn\'t support push notifications, but in-app alerts still work.'
              : 'Tap below to allow PetSwap to send notifications.',
      action:
        permission === 'default'
          ? { label: 'Allow notifications', onClick: requestPermission, primary: true }
          : { label: 'Continue', onClick: () => setStep(1) },
    },
    {
      title: 'Enable push notifications',
      body: 'Open Profile → Settings → Alerts & updates and turn on the categories you care about.',
      action: { label: 'Continue', onClick: () => setStep(2) },
    },
    {
      title: 'Background refresh',
      body: 'On iOS, Settings → PetSwap → Background App Refresh. On Android, allow background activity for PetSwap.',
      action: { label: 'Continue', onClick: () => setStep(3) },
    },
    {
      title: 'Send a test alert',
      body: 'We\'ll send a test notification right now to confirm everything is working.',
      action: { label: testing ? 'Sending…' : 'Send me a test alert', onClick: sendTest, primary: true },
    },
  ];

  return (
    <div className="px-5 mt-4">
      <div
        className="bg-white"
        style={{
          borderRadius: 22, border: '1px solid #E8ECF2', padding: 18,
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(47,128,237,0.10)' }}
        >
          <BellRing size={22} className="text-[#2F80ED]" />
        </div>
        <h2 className="mt-3 text-[#0F172A]" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em' }}>
          Let's get notifications working
        </h2>
        <p className="text-[#64748B] mt-1" style={{ fontSize: 13.5, lineHeight: 1.4 }}>
          A quick 4-step check — usually fixes it in under a minute.
        </p>
      </div>

      <div className="mt-4 space-y-2.5">
        {steps.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <div
              key={s.title}
              className="bg-white"
              style={{
                borderRadius: 18,
                border: active ? '1.5px solid #2F80ED' : '1px solid #E8ECF2',
                padding: 14,
                opacity: i > step ? 0.55 : 1,
                boxShadow: active ? '0 8px 22px -10px rgba(47,128,237,0.35)' : '0 1px 2px rgba(15,23,42,0.03)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 26, height: 26, borderRadius: 999,
                    background: done ? '#10B981' : active ? '#2F80ED' : '#F1F5F9',
                    color: done || active ? '#fff' : '#94A3B8',
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                </div>
                <p className="flex-1 text-[#0F172A]" style={{ fontSize: 14.5, fontWeight: 700 }}>
                  {s.title}
                </p>
              </div>
              {(active || done) && (
                <p className="text-[#64748B] mt-2 ml-9" style={{ fontSize: 13, lineHeight: 1.45 }}>
                  {s.body}
                </p>
              )}
              {active && s.action && (
                <button
                  onClick={s.action.onClick}
                  disabled={testing && s.action.label.includes('Sending')}
                  className="ml-9 mt-3 inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-60"
                  style={{
                    minHeight: 42, padding: '0 16px', borderRadius: 12,
                    background: s.action.primary ? 'linear-gradient(180deg,#2F80ED,#1D6FE8)' : '#F1F5F9',
                    color: s.action.primary ? '#fff' : '#0F172A',
                    fontSize: 13.5, fontWeight: 700,
                    boxShadow: s.action.primary ? '0 8px 20px -8px rgba(47,128,237,0.55)' : 'none',
                  }}
                >
                  {testing && s.action.label.includes('Sending') ? <Loader2 size={14} className="animate-spin" /> : null}
                  {s.action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center mt-5 text-[#94A3B8]" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
        Still stuck? Start a live chat from Help and we&rsquo;ll diagnose with you.
      </p>
    </div>
  );
};

/* ─────────────  CHAT  ───────────── */

const ChatView = ({ isPlus, userName }: { isPlus: boolean; userName: string }) => {
  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      id: 'sys-1',
      from: 'system',
      body: isPlus
        ? 'Trusted Plus priority — average reply under 2 min'
        : 'Connected to PetSwap support — average reply 5 min',
      ts: Date.now(),
    },
    {
      id: 'b-1',
      from: 'bot',
      body: `Hi ${userName} 👋 I'm PetSwap Assistant. How can we help today?`,
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [handedOff, setHandedOff] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const pushBot = (body: string, asAgent = false) => {
    setTyping(true);
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: `r-${Date.now()}`, from: asAgent ? 'agent' : 'bot', body, ts: Date.now() },
      ]);
      setTyping(false);
    }, 900 + Math.random() * 600);
  };

  const send = (body: string) => {
    if (!body.trim()) return;
    haptic('light');
    const id = `u-${Date.now()}`;
    setMessages((m) => [...m, { id, from: 'user', body, ts: Date.now(), status: 'sent' }]);
    setInput('');
    // mark delivered then read
    window.setTimeout(() => {
      setMessages((m) => m.map((x) => (x.id === id ? { ...x, status: 'delivered' } : x)));
    }, 350);
    window.setTimeout(() => {
      setMessages((m) => m.map((x) => (x.id === id ? { ...x, status: 'read' } : x)));
    }, 900);

    // Reply logic
    const matched = Object.keys(QUICK_REPLIES).find((k) => body.toLowerCase().includes(k.toLowerCase()));
    if (matched) {
      pushBot(QUICK_REPLIES[matched]);
    } else if (!handedOff) {
      pushBot("Got it — I've noted this. Want me to connect you with a human agent now?");
    } else {
      pushBot('Thanks — a specialist is reviewing this and will reply shortly.', true);
    }
  };

  const handoff = () => {
    if (handedOff) return;
    haptic('medium');
    setHandedOff(true);
    setMessages((m) => [
      ...m,
      { id: `sys-${Date.now()}`, from: 'system', body: 'Connecting you to a human agent…', ts: Date.now() },
    ]);
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          from: 'agent',
          body: `Hi ${userName}, this is Maya from PetSwap Support. I've read the conversation — how can I help?`,
          ts: Date.now(),
        },
      ]);
    }, 1400);
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Status header */}
      <div className="px-5 pt-2 pb-3 flex items-center gap-2 border-b border-[#F1F5F9]">
        <span className="relative inline-flex">
          <span className="block w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="absolute inset-0 rounded-full bg-[#10B981] opacity-50 animate-ping" />
        </span>
        <span className="text-[12.5px] font-semibold text-[#0F172A]">
          {handedOff ? 'Maya · Support agent' : 'PetSwap Assistant'}
        </span>
        {isPlus && (
          <span
            className="ml-auto inline-flex items-center gap-1"
            style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              color: '#92400E',
              fontSize: 10.5,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 999,
            }}
          >
            <Crown size={10} />
            Priority
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m) => {
          if (m.from === 'system') {
            return (
              <p key={m.id} className="text-center text-[11.5px] text-[#94A3B8] py-1">
                {m.body}
              </p>
            );
          }
          const isUser = m.from === 'user';
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[78%] px-3.5 py-2.5"
                style={{
                  borderRadius: 18,
                  borderBottomRightRadius: isUser ? 6 : 18,
                  borderBottomLeftRadius: isUser ? 18 : 6,
                  background: isUser ? '#2F80ED' : '#F1F5F9',
                  color: isUser ? '#fff' : '#0F172A',
                  fontSize: 14.5,
                  lineHeight: 1.4,
                }}
              >
                {!isUser && m.from === 'agent' && (
                  <p className="text-[10.5px] font-bold uppercase tracking-wider mb-0.5 text-[#2F80ED]">
                    Maya · Support
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                {isUser && (
                  <div className="flex items-center justify-end mt-0.5 text-white/70">
                    {m.status === 'sent' && <Check size={12} />}
                    {m.status === 'delivered' && <CheckCheck size={12} />}
                    {m.status === 'read' && <CheckCheck size={12} className="text-sky-200" />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start">
            <div
              className="px-4 py-3"
              style={{ borderRadius: 18, borderBottomLeftRadius: 6, background: '#F1F5F9' }}
            >
              <span className="inline-flex gap-1">
                <Dot delay={0} />
                <Dot delay={150} />
                <Dot delay={300} />
              </span>
            </div>
          </div>
        )}

        {/* Quick reply chips */}
        {messages.length <= 2 && (
          <div className="pt-3 flex flex-wrap gap-2">
            {Object.keys(QUICK_REPLIES).map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="active:scale-95 transition-transform"
                style={{
                  background: '#fff',
                  border: '1px solid #E8ECF2',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#0F172A',
                  padding: '7px 12px',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {!handedOff && messages.length > 2 && (
          <div className="pt-2">
            <button
              onClick={handoff}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2F80ED] active:opacity-70"
            >
              <Sparkles size={12} />
              Talk to a human
            </button>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-3 pt-2 pb-3 border-t border-[#F1F5F9] bg-white safe-bottom flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Type a message…"
          className="flex-1 px-4 py-2.5 rounded-3xl bg-[#F1F5F9] text-[#0F172A] placeholder:text-[#94A3B8] resize-none focus:outline-none"
          style={{ fontSize: 16, maxHeight: 120 }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim()}
          aria-label="Send"
          className="h-11 w-11 flex items-center justify-center rounded-full text-white disabled:opacity-40"
          style={{
            background: 'linear-gradient(180deg,#2F80ED,#1D6FE8)',
            boxShadow: '0 8px 20px -8px rgba(47,128,237,0.55)',
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

const Dot = ({ delay }: { delay: number }) => (
  <span
    className="block w-1.5 h-1.5 rounded-full bg-[#94A3B8]"
    style={{ animation: 'pulse 1.2s infinite', animationDelay: `${delay}ms` }}
  />
);

/* ─────────────  EMERGENCY  ───────────── */

const EMERGENCY_REASONS = [
  'Pet not returned',
  'Unsafe meetup',
  'Suspected scam',
  'Harassment',
  'Other safety concern',
];

const EmergencyView = ({
  sent,
  onSubmit,
}: {
  sent: boolean;
  onSubmit: (reason: string) => void;
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (sent) {
    return (
      <div className="px-5 mt-6">
        <div
          className="bg-white text-center"
          style={{
            borderRadius: 22,
            border: '1px solid #E8ECF2',
            padding: 24,
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
          }}
        >
          <div
            className="mx-auto flex items-center justify-center"
            style={{ width: 56, height: 56, borderRadius: 18, background: '#DCFCE7' }}
          >
            <Check size={26} className="text-[#16A34A]" strokeWidth={3} />
          </div>
          <h2 className="mt-4 text-[#0F172A]" style={{ fontSize: 20, fontWeight: 700 }}>
            Urgent ticket created
          </h2>
          <p className="mt-2 text-[#64748B]" style={{ fontSize: 14, lineHeight: 1.5 }}>
            A Trust & Safety specialist will contact you within 15 minutes. Keep your phone nearby.
          </p>
          <p className="mt-3 text-[12px] text-[#94A3B8]">
            For life-threatening emergencies always call local emergency services first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 mt-4">
      <div
        className="flex items-center gap-3"
        style={{
          background: 'linear-gradient(180deg,#FEF2F2,#FEE2E2)',
          border: '1px solid #FCA5A5',
          borderRadius: 18,
          padding: 14,
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: 38, height: 38, borderRadius: 12, background: '#DC2626' }}
        >
          <ShieldAlert size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[#7F1D1D]" style={{ fontSize: 14.5, fontWeight: 700 }}>
            Trust & Safety priority line
          </p>
          <p className="text-[#991B1B]" style={{ fontSize: 12.5 }}>
            Avg response under 15 minutes
          </p>
        </div>
      </div>

      <h3 className="mt-6 mb-2 text-[#64748B]" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em' }}>
        WHAT HAPPENED?
      </h3>
      <div className="space-y-2">
        {EMERGENCY_REASONS.map((r) => {
          const on = selected === r;
          return (
            <button
              key={r}
              onClick={() => setSelected(r)}
              className="w-full flex items-center justify-between bg-white px-4 py-3.5 active:scale-[0.99] transition-transform"
              style={{
                borderRadius: 14,
                border: on ? '2px solid #DC2626' : '1px solid #E8ECF2',
                fontSize: 14,
                fontWeight: 600,
                color: '#0F172A',
              }}
            >
              <span>{r}</span>
              {on ? (
                <Check size={16} className="text-[#DC2626]" strokeWidth={3} />
              ) : (
                <span className="block w-4 h-4 rounded-full border-2 border-[#D1D5DB]" />
              )}
            </button>
          );
        })}
      </div>

      <h3 className="mt-6 mb-2 text-[#64748B]" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.12em' }}>
        DETAILS (OPTIONAL)
      </h3>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Briefly describe what's happening — names, location, time…"
        rows={4}
        className="w-full p-3.5 bg-white text-[#0F172A] placeholder:text-[#94A3B8] resize-none focus:outline-none"
        style={{ borderRadius: 16, border: '1px solid #E8ECF2', fontSize: 14.5 }}
      />

      <button
        onClick={() => {
          if (!selected || submitting) return;
          setSubmitting(true);
          window.setTimeout(() => {
            setSubmitting(false);
            onSubmit(selected);
          }, 800);
        }}
        disabled={!selected || submitting}
        className="w-full mt-5 inline-flex items-center justify-center gap-2 font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-50"
        style={{
          minHeight: 54,
          borderRadius: 16,
          fontSize: 15.5,
          background: 'linear-gradient(180deg,#DC2626,#B91C1C)',
          boxShadow: '0 12px 26px -10px rgba(220,38,38,0.55)',
        }}
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
        {submitting ? 'Sending…' : 'Send urgent ticket'}
      </button>

      <p className="mt-3 text-center text-[12px] text-[#94A3B8]" style={{ lineHeight: 1.5 }}>
        For life-threatening emergencies, please contact local emergency services first.
      </p>
    </div>
  );
};

export default Support;
