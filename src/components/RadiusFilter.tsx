import { RADIUS_OPTIONS, type RadiusMiles } from '@/lib/distance';
import { cn } from '@/lib/utils';

interface RadiusFilterProps {
  value: RadiusMiles;
  onChange: (v: RadiusMiles) => void;
  className?: string;
}

const RadiusFilter = ({ value, onChange, className }: RadiusFilterProps) => (
  <div className={cn('flex gap-1.5 overflow-x-auto scrollbar-hide', className)}>
    {RADIUS_OPTIONS.map(opt => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-fast active:scale-[0.96]',
            active
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-foreground/70 hover:bg-muted/80',
          )}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

export default RadiusFilter;
