import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string | null;
  onClose: () => void;
}

/** Fullscreen image viewer used from chat bubbles. */
const ImageLightbox = ({ src, onClose }: ImageLightboxProps) => {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [src, onClose]);

  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-label="Photo viewer"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 backdrop-blur text-white flex items-center justify-center active:scale-95"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-[96vw] max-h-[88vh] object-contain rounded-lg animate-scale-in"
        draggable={false}
      />
    </div>
  );
};

export default ImageLightbox;
