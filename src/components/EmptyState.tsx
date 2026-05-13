import React from 'react';

interface EmptyStateProps {
  /** Soft fallback emoji (kept for backwards compat). Ignored when `illustration` is provided. */
  emoji?: string;
  /** Premium SVG illustration node — preferred over emoji. */
  illustration?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional secondary actions rendered as outlined buttons under the primary CTA. */
  secondaryActions?: Array<{ label: string; onClick: () => void }>;
  /** Optional reassurance line under the description (e.g. "Every member is reviewed and verified."). */
  trustNote?: string;
}

/**
 * `forwardRef` wrapped so parent containers (e.g. Radix Slot, animation
 * wrappers) can attach a ref without React warning in dev.
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ emoji, illustration, title, description, actionLabel, onAction, secondaryActions, trustNote }, ref) => (
    <div ref={ref} className="text-center py-12 px-6 animate-fade-in">
      {illustration ? (
        <div className="mb-4 flex justify-center">{illustration}</div>
      ) : emoji ? (
        <span className="text-[48px] block mb-4" aria-hidden>
          {emoji}
        </span>
      ) : null}
      <h3 className="text-[18px] font-bold mb-1.5 tracking-tight">{title}</h3>
      <p className="text-[14px] text-muted-foreground mb-5 max-w-[300px] mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary text-[14px] px-6 py-3">
          {actionLabel}
        </button>
      )}
      {secondaryActions && secondaryActions.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {secondaryActions.map(a => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="text-[12px] font-semibold px-4 py-2 rounded-full bg-muted text-foreground/80 hover:bg-muted/80 transition-colors active:scale-[0.97]"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      {trustNote && (
        <p className="mt-5 text-[11px] text-muted-foreground/80 max-w-[260px] mx-auto leading-relaxed">
          {trustNote}
        </p>
      )}
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';

export default EmptyState;
