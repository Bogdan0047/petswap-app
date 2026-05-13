import { Users, HandHeart, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stat {
  icon: typeof Users;
  value: number;
  label: string;
  tone: 'primary' | 'warning' | 'info';
}

interface Props {
  newMembers: number;
  ownersNeedingHelp: number;
  trustedHelpers: number;
  className?: string;
}

const toneClasses = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
  info: { bg: 'bg-info/10', text: 'text-info' },
};

const LocalPulseStrip = ({
  newMembers,
  ownersNeedingHelp,
  trustedHelpers,
  className,
}: Props) => {
  const stats: Stat[] = [
    { icon: Users, value: newMembers, label: 'new nearby', tone: 'primary' },
    { icon: HandHeart, value: ownersNeedingHelp, label: 'need help', tone: 'warning' },
    { icon: ShieldCheck, value: trustedHelpers, label: 'trusted', tone: 'info' },
  ];

  // Hide entirely if there's nothing to celebrate locally.
  if (stats.every(s => s.value === 0)) return null;

  return (
    <div
      className={cn(
        'card-flat p-3 grid grid-cols-3 gap-2 animate-fade-in',
        className,
      )}
    >
      {stats.map(({ icon: Icon, value, label, tone }) => {
        const c = toneClasses[tone];
        return (
          <div key={label} className="flex items-center gap-2.5 min-w-0">
            <div className={cn('w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0', c.bg)}>
              <Icon size={14} className={c.text} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold leading-none tabular-nums">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LocalPulseStrip;
