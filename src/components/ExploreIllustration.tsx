import React from 'react';

/**
 * Soft, premium SVG illustrations for Explore empty states.
 * Two-tone (primary + muted) so they auto-adapt to theme tokens.
 * No emojis — feels like an App Store product, not a toy.
 */

type Variant = 'no-helpers' | 'all-seen' | 'no-requests' | 'offline' | 'location';

interface Props {
  variant: Variant;
  size?: number;
}

const ExploreIllustration: React.FC<Props> = ({ variant, size = 132 }) => {
  switch (variant) {
    case 'no-helpers':
      return <NoHelpers size={size} />;
    case 'all-seen':
      return <AllSeen size={size} />;
    case 'no-requests':
      return <NoRequests size={size} />;
    case 'offline':
      return <Offline size={size} />;
    case 'location':
      return <LocationDenied size={size} />;
  }
};

// --- Wrapper that bakes the soft halo + breathing motion ---
const Halo: React.FC<{ size: number; children: React.ReactNode }> = ({ size, children }) => (
  <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
    <div
      aria-hidden
      className="absolute inset-0 rounded-full animate-breathe"
      style={{
        background:
          'radial-gradient(closest-side, hsl(var(--primary) / 0.10), hsl(var(--primary) / 0) 70%)',
      }}
    />
    <div className="relative">{children}</div>
  </div>
);

const NoHelpers: React.FC<{ size: number }> = ({ size }) => (
  <Halo size={size}>
    <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 88 88" fill="none">
      {/* Map pin with sparkle — "growing in your area" */}
      <circle cx="44" cy="40" r="28" fill="hsl(var(--primary) / 0.12)" />
      <path
        d="M44 22c-7.732 0-14 6.044-14 13.5 0 9.75 14 22.5 14 22.5s14-12.75 14-22.5C58 28.044 51.732 22 44 22z"
        fill="hsl(var(--primary))"
      />
      <circle cx="44" cy="35" r="5" fill="white" />
      {/* sparkle hits */}
      <circle cx="22" cy="22" r="2" fill="hsl(var(--primary))" opacity="0.55" />
      <circle cx="68" cy="20" r="1.6" fill="hsl(var(--primary))" opacity="0.4" />
      <circle cx="72" cy="58" r="2.2" fill="hsl(var(--primary))" opacity="0.5" />
      <circle cx="18" cy="60" r="1.4" fill="hsl(var(--primary))" opacity="0.35" />
    </svg>
  </Halo>
);

const AllSeen: React.FC<{ size: number }> = ({ size }) => (
  <Halo size={size}>
    <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 88 88" fill="none">
      {/* Stack of cards = you swiped through everyone */}
      <rect x="18" y="28" width="52" height="40" rx="10" fill="hsl(var(--muted))" transform="rotate(-6 44 48)" />
      <rect x="18" y="22" width="52" height="40" rx="10" fill="hsl(var(--surface-muted))" />
      <rect x="22" y="26" width="44" height="32" rx="8" fill="white" stroke="hsl(var(--border))" />
      {/* check */}
      <circle cx="44" cy="42" r="9" fill="hsl(var(--success))" />
      <path d="M40 42.5l3 3 5.5-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  </Halo>
);

const NoRequests: React.FC<{ size: number }> = ({ size }) => (
  <Halo size={size}>
    <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 88 88" fill="none">
      {/* Speech bubble with plus = be first to post */}
      <path
        d="M20 24h48a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H44l-10 10v-10h-14a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8z"
        fill="hsl(var(--primary) / 0.10)"
      />
      <circle cx="44" cy="43" r="11" fill="hsl(var(--primary))" />
      <path d="M44 38v10M39 43h10" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  </Halo>
);

const Offline: React.FC<{ size: number }> = ({ size }) => (
  <Halo size={size}>
    <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 88 88" fill="none">
      <path d="M14 38c18-18 42-18 60 0" stroke="hsl(var(--muted-foreground))" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <path d="M24 48c12-12 28-12 40 0" stroke="hsl(var(--muted-foreground))" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <circle cx="44" cy="60" r="4" fill="hsl(var(--muted-foreground))" />
      <path d="M16 16l56 56" stroke="hsl(var(--destructive))" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </Halo>
);

const LocationDenied: React.FC<{ size: number }> = ({ size }) => (
  <Halo size={size}>
    <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 88 88" fill="none">
      <circle cx="44" cy="44" r="22" fill="hsl(var(--primary) / 0.12)" />
      <circle cx="44" cy="44" r="6" fill="hsl(var(--primary))" />
      <circle cx="44" cy="44" r="14" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" fill="none" />
    </svg>
  </Halo>
);

export default ExploreIllustration;
