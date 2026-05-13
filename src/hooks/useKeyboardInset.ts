import { useEffect, useState } from 'react';

/**
 * Tracks the on-screen keyboard inset on iOS Safari + Android Chrome using
 * the VisualViewport API. Returns the number of CSS pixels the keyboard
 * occupies at the bottom of the layout viewport (0 when hidden).
 *
 * Use this to lift sticky inputs above the keyboard without breaking the
 * fixed bottom-nav layout.
 */
export const useKeyboardInset = (): number => {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Difference between layout viewport bottom and visual viewport bottom
        const next = Math.max(
          0,
          window.innerHeight - vv.height - vv.offsetTop,
        );
        // Treat tiny values as zero to avoid hairline jitter
        setInset(next < 24 ? 0 : Math.round(next));
      });
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
};
