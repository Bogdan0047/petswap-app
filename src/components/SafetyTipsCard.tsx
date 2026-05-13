import { Video, Home, Users, ShieldCheck } from 'lucide-react';

const TIPS = [
  { icon: Users, title: 'Meet in person first', body: 'A quick walk together builds real trust.' },
  { icon: Home, title: 'Verify home conditions', body: 'A short visit tells you everything.' },
  { icon: Video, title: 'Video call before the swap', body: 'See the pet, ask questions, set expectations.' },
];

/**
 * Reusable safety education block.
 * Shown on profile, chat acceptance, and the first booking flow.
 */
const SafetyTipsCard = ({ compact = false }: { compact?: boolean }) => (
  <div className="card-flat p-4">
    <div className="flex items-center gap-2 mb-3">
      <ShieldCheck size={14} className="text-primary" />
      <p className="text-[12px] font-bold uppercase tracking-wide text-primary">
        Stay safe, swap smart
      </p>
    </div>
    <ul className={compact ? 'space-y-2' : 'space-y-2.5'}>
      {TIPS.map(({ icon: Icon, title, body }) => (
        <li key={title} className="flex items-start gap-2.5">
          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon size={13} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold leading-tight">{title}</p>
            {!compact && <p className="text-[11.5px] text-muted-foreground mt-0.5">{body}</p>}
          </div>
        </li>
      ))}
    </ul>
  </div>
);

export default SafetyTipsCard;
