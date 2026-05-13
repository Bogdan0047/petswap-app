import { useEffect, useState } from 'react';
import { Zap, Star, CreditCard, Check, Clock } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { toast } from 'sonner';
import {
  boostRequest,
  BOOST_CREDITS_COST,
  BOOST_PAYMENT_PRICE,
  BOOST_DURATION_HOURS,
  type BoostMethod,
} from '@/lib/boostStore';
import { trackEvent } from '@/lib/analyticsStore';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
  petName?: string;
  /** Current credits balance for affordability check. */
  creditsBalance: number;
}

/**
 * Elegant boost sheet — owners pick credits OR a small one-tap payment.
 * 24h visibility boost above standard listings + instant helper alerts.
 * Apple-clean, no aggressive paywall.
 */
const BoostSheet = ({ isOpen, onClose, requestId, petName, creditsBalance }: Props) => {
  const [method, setMethod] = useState<BoostMethod>('credits');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canPayCredits = creditsBalance >= BOOST_CREDITS_COST;

  // Top-of-funnel: log a single view per open.
  useEffect(() => {
    if (isOpen && requestId) trackEvent('boost_view', requestId);
  }, [isOpen, requestId]);

  const reset = () => {
    setMethod('credits');
    setSubmitting(false);
    setDone(false);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 250);
  };

  const handleConfirm = () => {
    if (!requestId || submitting) return;
    if (method === 'credits' && !canPayCredits) {
      toast.error('Not enough credits', {
        description: `You need ${BOOST_CREDITS_COST} credits to boost. Try the one-tap payment instead.`,
      });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      boostRequest(requestId, method);
      trackEvent('boost_activated', `${method}:${requestId}`);
      setDone(true);
      toast.success('Boost activated', {
        description: `Your request will rank above standard listings for the next ${BOOST_DURATION_HOURS} hours.`,
      });
      setSubmitting(false);
      setTimeout(handleClose, 1400);
    }, 600);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      {done ? (
        <div className="px-6 pt-2 pb-8 text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <Check size={28} className="text-primary-foreground" strokeWidth={3} />
            </div>
          </div>
          <p className="font-bold text-[18px] mb-1">Request boosted</p>
          <p className="text-[13px] text-muted-foreground">
            Trusted helpers nearby are being alerted now.
          </p>
        </div>
      ) : (
        <div className="px-6 pt-2 pb-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-5">
            <div className="w-12 h-12 rounded-md bg-warning/10 flex items-center justify-center flex-shrink-0">
              <Zap size={22} className="text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                24-hour boost
              </p>
              <p className="font-bold text-[18px] leading-tight mt-0.5">
                {petName ? `Boost ${petName}'s request` : 'Boost this request'}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                Ranks above standard listings · alerts nearby trusted helpers instantly
              </p>
            </div>
          </div>

          {/* Benefits */}
          <ul className="space-y-2 mb-5">
            {[
              'Top placement in helper feeds for 24 hours',
              'Instant push to nearby Pro helpers',
              'Boosted badge so urgency is clear',
            ].map(b => (
              <li key={b} className="flex items-center gap-2 text-[13px]">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-primary" />
                </div>
                <span className="text-foreground">{b}</span>
              </li>
            ))}
          </ul>

          {/* Method picker */}
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Pay with
          </p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              onClick={() => setMethod('credits')}
              className={cn(
                'p-4 rounded-md border-2 text-left transition-all',
                method === 'credits' ? 'border-primary bg-primary/5' : 'border-border bg-background',
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Star size={14} className="text-warning" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Credits
                </span>
              </div>
              <p className="font-bold text-[16px]">{BOOST_CREDITS_COST} credits</p>
              <p
                className={cn(
                  'text-[11px] mt-0.5',
                  canPayCredits ? 'text-muted-foreground' : 'text-destructive',
                )}
              >
                {canPayCredits
                  ? `${creditsBalance - BOOST_CREDITS_COST} left after`
                  : `${BOOST_CREDITS_COST - creditsBalance} short`}
              </p>
            </button>
            <button
              onClick={() => setMethod('payment')}
              className={cn(
                'p-4 rounded-md border-2 text-left transition-all',
                method === 'payment' ? 'border-primary bg-primary/5' : 'border-border bg-background',
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard size={14} className="text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  One-tap
                </span>
              </div>
              <p className="font-bold text-[16px]">{BOOST_PAYMENT_PRICE}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">No subscription</p>
            </button>
          </div>

          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="btn-primary w-full py-3.5 text-[14px] font-semibold inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Clock size={15} className="animate-spin" /> Activating boost…
              </>
            ) : (
              <>
                <Zap size={15} /> Boost for {BOOST_DURATION_HOURS}h
              </>
            )}
          </button>
          <p className="text-[11px] text-muted-foreground text-center mt-3 leading-relaxed">
            Boosts auto-expire after {BOOST_DURATION_HOURS} hours. Cancel by deleting the request.
          </p>
        </div>
      )}
    </BottomSheet>
  );
};

export default BoostSheet;
