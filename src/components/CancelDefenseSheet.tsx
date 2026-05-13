import { useEffect } from 'react';
import { Heart, PauseCircle, Save, Zap, X, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptic';
import { trackEvent } from '@/lib/analyticsStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: () => void;
}

export default function CancelDefenseSheet({ isOpen, onClose, onConfirmCancel }: Props) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePause = () => {
    haptic('light');
    toast.success("We've kept your membership active", {
      description: 'Reach out anytime — most members come back within 7 days.',
    });
    onClose();
  };

  const handleSaveMatches = () => {
    haptic('light');
    toast.success('Your matches are saved', {
      description: "We'll keep your favourites and chats here, ready for you.",
    });
    onClose();
  };

  const handleStay = () => {
    haptic('light');
    onClose();
  };

  const handleConfirm = () => {
    haptic('medium');
    onConfirmCancel();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Before you cancel"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 safe-bottom animate-in slide-in-from-bottom"
        style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.15)' }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground active:bg-muted/60"
        >
          <X size={18} />
        </button>

        <div className="flex justify-center mb-4">
          <div
            className="flex items-center justify-center"
            style={{
              width: 56, height: 56, borderRadius: 18,
              background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
            }}
          >
            <Heart size={26} className="text-[#DC2626]" />
          </div>
        </div>

        <h2 className="text-center font-bold text-[22px] tracking-tight text-foreground">
          Before you go…
        </h2>
        <p className="text-center text-[14px] text-muted-foreground mt-2 px-2 leading-relaxed">
          Most members cancel right before they need pet care again. Here's what we can do instead.
        </p>

        <div className="mt-5 space-y-2">
          <Option
            icon={<PauseCircle size={20} className="text-primary" />}
            title="Pause instead"
            sub="Take a break — we'll keep your spot."
            onClick={handlePause}
          />
          <Option
            icon={<Save size={20} className="text-primary" />}
            title="Keep your matches saved"
            sub="Favourites and chats stay with you."
            onClick={handleSaveMatches}
          />
          <Option
            icon={<Bell size={20} className="text-primary" />}
            title="Remind me later"
            sub="We'll check in next month — no charges in the meantime."
            onClick={() => {
              haptic('light');
              trackEvent('cancel_remind_later');
              try { localStorage.setItem('petswap.cancel.remindAt', String(Date.now() + 30 * 24 * 60 * 60_000)); } catch { /* noop */ }
              toast.success("We'll remind you in 30 days", { description: 'No charges or changes — your membership stays as-is.' });
              onClose();
            }}
          />
          <Option
            icon={<Zap size={20} className="text-primary" />}
            title="Reactivate anytime, instantly"
            sub="One tap to return — no setup again."
            onClick={handleStay}
          />
        </div>

        <button
          onClick={handleStay}
          className="mt-5 w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] tap-feedback"
        >
          Keep my membership
        </button>

        <button
          onClick={handleConfirm}
          className="mt-2 w-full py-3 text-[13.5px] font-medium text-muted-foreground active:opacity-60"
        >
          No thanks, cancel anyway
        </button>
      </div>
    </div>
  );
}

const Option = ({
  icon, title, sub, onClick,
}: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#EEF2F7] text-left active:scale-[0.99] transition-transform"
  >
    <div className="w-10 h-10 rounded-xl bg-white border border-[#EEF2F7] flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-[14px] text-foreground leading-tight">{title}</p>
      <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{sub}</p>
    </div>
  </button>
);
