import { useEffect } from 'react';
import { Share2, Heart, X } from 'lucide-react';
import BottomSheet from './BottomSheet';

interface Props {
  open: boolean;
  onClose: () => void;
  petName?: string;
  helperName?: string;
}

/**
 * Post-swap viral share prompt. Apple-clean: single CTA, dismiss-easy.
 * Generates native Web Share or copies a marketing line.
 */
const PostSwapShareSheet = ({ open, onClose, petName = 'my pet', helperName = 'a neighbour' }: Props) => {
  useEffect(() => {
    if (!open) return;
    try { localStorage.setItem('petswap.share.lastShown', String(Date.now())); } catch { /* noop */ }
  }, [open]);

  const text = `I trusted PetSwap with ${petName} and it just worked — ${helperName} was lovely. 🐾`;
  const url = 'https://petswap.co.uk';

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'PetSwap', text, url }); } catch { /* user cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(`${text} ${url}`); } catch { /* noop */ }
    }
    onClose();
  };

  return (
    <BottomSheet isOpen={open} onClose={onClose} size="sm">
      <div className="px-6 pt-2 pb-6">
        <div className="flex justify-end">
          <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-full hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {/* Share card preview */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 text-center mb-5 border border-primary/20">
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <Heart size={22} className="text-primary" fill="currentColor" />
          </div>
          <p className="font-bold text-[16px] mb-1">"I trusted PetSwap"</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Care for {petName} is done. Help a friend find someone they can trust too.
          </p>
        </div>

        <button
          onClick={handleShare}
          className="btn-primary w-full py-3 inline-flex items-center justify-center gap-2"
        >
          <Share2 size={16} /> Share my experience
        </button>
        <button onClick={onClose} className="w-full text-center text-[13px] font-semibold text-muted-foreground py-3">
          Maybe later
        </button>
      </div>
    </BottomSheet>
  );
};

export default PostSwapShareSheet;
