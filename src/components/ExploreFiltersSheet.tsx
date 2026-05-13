import React, { useMemo } from 'react';
import { X, Check } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';

export interface ExploreFilters {
  petTypes: string[];
  services: string[];
  availability: string[];
  trust: string[];
  homeFit: string[];
}

export const EMPTY_FILTERS: ExploreFilters = {
  petTypes: [],
  services: [],
  availability: [],
  trust: [],
  homeFit: [],
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  value: ExploreFilters;
  onChange: (next: ExploreFilters) => void;
  /** Live count of helpers/requests matching the current selection. */
  resultCount: number;
  /** "Helpers" or "Requests" — used in the apply button copy. */
  noun?: string;
}

const SECTIONS: { key: keyof ExploreFilters; title: string; options: string[] }[] = [
  { key: 'petTypes', title: 'Pet type', options: ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'] },
  { key: 'services', title: 'Service', options: ['Walk', 'Feeding', 'Sitting', 'Day care', 'Overnight'] },
  { key: 'availability', title: 'Availability', options: ['Today', 'Weekend', 'This week', 'Flexible'] },
  { key: 'trust', title: 'Trust level', options: ['Verified only', 'Trust 80+', 'Fast responders'] },
  { key: 'homeFit', title: 'Home fit', options: ['Garden', 'Pet-friendly', 'Child-friendly'] },
];

const ExploreFiltersSheet: React.FC<Props> = ({ isOpen, onClose, value, onChange, resultCount, noun = 'helpers' }) => {
  const totalSelected = useMemo(
    () => Object.values(value).reduce((s, arr) => s + arr.length, 0),
    [value],
  );

  const toggle = (key: keyof ExploreFilters, opt: string) => {
    haptic('light');
    const arr = value[key];
    const next = arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt];
    onChange({ ...value, [key]: next });
  };

  const reset = () => {
    haptic('medium');
    onChange(EMPTY_FILTERS);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} size="lg" className="!rounded-t-[28px]">
      {/* Custom header so we can show the count chip */}
      <div className="-mx-6 -mt-4 px-6 pt-2 pb-4 flex items-center justify-between border-b border-border/60 sticky top-0 bg-card z-10">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-[19px] tracking-tight">Filters</h3>
          {totalSelected > 0 && (
            <span className="text-[11px] font-bold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
              {totalSelected}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {totalSelected > 0 && (
            <button
              onClick={reset}
              className="text-[12.5px] font-semibold text-primary px-2 py-1 rounded-md hover:bg-primary/5 transition-colors active:scale-[0.96]"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="p-1.5 rounded-full hover:bg-muted transition-colors active:scale-[0.94]"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="space-y-6 pt-4 pb-28">
        {SECTIONS.map(section => (
          <section key={section.key}>
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {section.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {section.options.map(opt => {
                const selected = value[section.key].includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggle(section.key, opt)}
                    aria-pressed={selected}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-fast active:scale-[0.96]',
                      selected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-foreground/80 hover:bg-muted/80',
                    )}
                  >
                    {selected && <Check size={13} />}
                    {opt}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Sticky footer */}
      <div
        className="absolute left-0 right-0 bottom-0 px-5 pt-3 pb-5 bg-card border-t border-border/60 safe-bottom"
        style={{ boxShadow: '0 -6px 18px -8px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            disabled={totalSelected === 0}
            className={cn(
              'btn-outline text-[13px] py-3 px-5',
              totalSelected === 0 && 'opacity-40 pointer-events-none',
            )}
          >
            Reset
          </button>
          <button
            onClick={() => {
              haptic('light');
              onClose();
            }}
            className="btn-primary flex-1 text-[14px] py-3 inline-flex items-center justify-center gap-2"
          >
            {resultCount === 0 ? (
              <>No matches — adjust filters</>
            ) : (
              <>
                Show {resultCount} {noun}
              </>
            )}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default ExploreFiltersSheet;
