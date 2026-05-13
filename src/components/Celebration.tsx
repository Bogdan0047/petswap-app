import { useEffect, useState } from 'react';

/**
 * Subtle, Apple-restrained micro-celebration. Listens for
 * `petswap:celebrate` events and renders a brief gradient flash + a few
 * small dots floating up. No dependencies, no SVG libraries, no sounds.
 *
 * Avoids gamification overload: short (1.6s), low-saturation, dismisses
 * itself, never queues more than one at a time.
 */
const Celebration = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: number | null = null;
    const onCelebrate = () => {
      setActive(true);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setActive(false), 1600);
    };
    window.addEventListener('petswap:celebrate', onCelebrate as EventListener);
    return () => {
      window.removeEventListener('petswap:celebrate', onCelebrate as EventListener);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/20 to-transparent animate-fade-in" />
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute bottom-10 w-2 h-2 rounded-full bg-primary/80"
          style={{
            left: `${(i / 14) * 100}%`,
            animation: `petswap-float-up 1.4s ease-out ${(i % 5) * 0.06}s both`,
            opacity: 0.85,
          }}
        />
      ))}
      <style>{`
        @keyframes petswap-float-up {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-180px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Celebration;
