import { AVAILABILITY_SEGMENTS, type AvailabilitySegment } from '@/lib/freshness';
import { cn } from '@/lib/utils';

interface AvailabilitySegmentsProps {
  value: AvailabilitySegment;
  onChange: (v: AvailabilitySegment) => void;
  className?: string;
}

const AvailabilitySegments = ({ value, onChange, className }: AvailabilitySegmentsProps) => (
  <div className={cn('flex gap-1.5 overflow-x-auto scrollbar-hide', className)}>
    {AVAILABILITY_SEGMENTS.map(opt => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-fast active:scale-[0.96] flex items-center gap-1.5',
            active
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-foreground/70 hover:bg-muted/80',
          )}
        >
          {opt.value === 'now' && (
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                active ? 'bg-primary-foreground' : 'bg-success',
              )}
            />
          )}
          {opt.label}
        </button>
      );
    })}
  </div>
);

export default AvailabilitySegments;
