import { useEffect, useRef, useState, ReactNode } from 'react';

interface LazySectionProps {
  /** Estimated rendered height — reserved before mount to avoid layout shift. */
  minHeight?: number;
  /** Pixels before viewport to start mounting. Default 200. */
  rootMargin?: string;
  /** Render immediately instead of waiting for intersection. */
  eager?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Defers mounting children until the placeholder enters (or nears) the viewport.
 * Cuts initial DOM size and JS work for long scroll pages like Home.
 */
const LazySection = ({
  minHeight = 200,
  rootMargin = '200px',
  eager = false,
  className,
  children,
}: LazySectionProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div
      ref={ref}
      className={className}
      style={visible ? undefined : { minHeight, contain: 'layout paint' }}
    >
      {visible ? children : null}
    </div>
  );
};

export default LazySection;
