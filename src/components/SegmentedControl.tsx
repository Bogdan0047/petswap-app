import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';

interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * iOS-style segmented control with a sliding active pill.
 * - Container: soft surface, 14px radius
 * - Active segment: white card with subtle elevation, animates between positions
 * - Haptic on tap
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = itemRefs.current[value];
    const container = containerRef.current;
    if (!el || !container) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    setIndicator({ left: eRect.left - cRect.left, width: eRect.width });
  }, [value, options.length]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={cn(
        'relative flex p-1 rounded-[14px] bg-muted/70 select-none',
        className,
      )}
    >
      {/* Sliding active indicator */}
      {indicator && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-[11px] bg-card shadow-card transition-[transform,width] duration-[260ms]"
          style={{
            transform: `translateX(${indicator.left - 4}px)`,
            width: indicator.width,
            transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        />
      )}

      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            ref={(el) => (itemRefs.current[opt.id] = el)}
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (isActive) return;
              haptic('light');
              onChange(opt.id as T);
            }}
            className={cn(
              'relative z-10 flex-1 py-2.5 text-[13.5px] font-semibold tracking-tight transition-colors duration-200',
              isActive ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
