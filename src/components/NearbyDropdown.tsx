import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { RADIUS_OPTIONS, type RadiusMiles } from '@/lib/distance';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';

interface NearbyDropdownProps {
  value: RadiusMiles;
  onChange: (v: RadiusMiles) => void;
  className?: string;
}

const labelFor = (v: RadiusMiles): string => {
  const opt = RADIUS_OPTIONS.find(o => o.value === v);
  if (!opt) return 'Nearby';
  if (v === 0) return 'Anywhere';
  if (v === 1) return '1 mile';
  return `${v} miles`;
};

/**
 * Apple-clean radius picker — replaces the cluttered chip row with a single
 * dropdown that anchors a popover beneath the trigger. Closes on outside tap.
 */
const NearbyDropdown = ({ value, onChange, className }: NearbyDropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        onClick={() => {
          haptic('light');
          setOpen(o => !o);
        }}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-muted text-foreground/80 text-[13px] font-semibold tap-feedback"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MapPin size={13} className="text-primary" />
        {labelFor(value)}
        <ChevronDown size={14} className={cn('transition-transform duration-fast', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 left-0 mt-2 w-48 rounded-lg bg-popover shadow-elevated border border-border-light py-1.5 animate-scale-in origin-top-left"
        >
          {RADIUS_OPTIONS.map(opt => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={active}
                onClick={() => {
                  haptic('light');
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center justify-between w-full px-3.5 py-2 text-[13px] font-medium text-left transition-colors',
                  active ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-muted',
                )}
              >
                <span>{opt.value === 0 ? 'Anywhere' : opt.value === 1 ? '1 mile' : `${opt.value} miles`}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NearbyDropdown;
