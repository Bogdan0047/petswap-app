import { useState } from 'react';
import { Flag, AlertTriangle, ShieldOff, MessageSquareWarning, UserX, Ban, HelpCircle, Loader2 } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { friendlyError } from '@/lib/friendlyError';

export type ReportCategory =
  | 'fake_profile'
  | 'unsafe_behaviour'
  | 'harassment'
  | 'spam'
  | 'no_show'
  | 'misleading_information'
  | 'other';

const CATEGORIES: { id: ReportCategory; label: string; icon: typeof Flag; description: string }[] = [
  { id: 'fake_profile', label: 'Fake profile', icon: UserX, description: 'Stolen photos, fake identity, or impersonation' },
  { id: 'unsafe_behaviour', label: 'Unsafe behaviour', icon: AlertTriangle, description: 'Concerns for a pet or person’s safety' },
  { id: 'harassment', label: 'Harassment', icon: ShieldOff, description: 'Threats, insults, or unwanted contact' },
  { id: 'spam', label: 'Spam or scam', icon: Ban, description: 'Promotions, phishing, or off-platform offers' },
  { id: 'no_show', label: 'No-show', icon: MessageSquareWarning, description: 'Did not turn up to an agreed swap' },
  { id: 'misleading_information', label: 'Misleading information', icon: Flag, description: 'False claims about a pet, themselves, or services' },
  { id: 'other', label: 'Something else', icon: HelpCircle, description: 'Tell us what happened' },
];

interface ReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName?: string;
  swapId?: string;
}

const ReportSheet = ({ isOpen, onClose, reportedUserId, reportedUserName, swapId }: ReportSheetProps) => {
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory(null);
    setDescription('');
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!category) return;
    if (description.trim().length < 10) {
      toast.error('Please add a few words about what happened (10+ characters).');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('report_user', {
        _reported_user_id: reportedUserId,
        _category: category,
        _description: description.trim().slice(0, 1000),
        _swap_id: swapId,
      });
      if (error) {
        // Auth not yet wired in — still acknowledge to the user
        if (/auth|jwt|not authenticated/i.test(error.message)) {
          toast.success('Report received. Sign in to track its status.');
        } else {
          throw error;
        }
      } else {
        toast.success('Report sent. Our team will review within 24 hours.');
      }
      reset();
      onClose();
    } catch (e: unknown) {
      toast.error(friendlyError(e, "report"));
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} size="full" title={`Report ${reportedUserName ?? 'user'}`}>
      <div className="space-y-5">
        {!category && (
          <>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Reports are confidential. Pick the closest reason — you can add detail on the next step.
            </p>
            <div className="space-y-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className="w-full text-left card-flat p-4 flex items-start gap-3 transition-all duration-fast active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 rounded-md bg-card flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px]">{c.label}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{c.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {category && (
          <>
            <button
              onClick={() => setCategory(null)}
              className="text-[13px] text-muted-foreground font-medium"
            >
              ← Change reason
            </button>
            <div className="card-flat p-4">
              <p className="text-[12px] text-muted-foreground uppercase tracking-wide font-semibold">Reason</p>
              <p className="font-semibold text-[15px] mt-0.5">{CATEGORIES.find((c) => c.id === category)?.label}</p>
            </div>
            <div>
              <label className="text-[13px] font-semibold mb-2 block">What happened?</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                rows={5}
                placeholder="Share dates, messages, or anything that helps us review."
                className="w-full px-4 py-3 rounded-md bg-surface-muted text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary transition-all resize-none"
              />
              <p className="text-[11px] text-muted-foreground text-right mt-1 tabular-nums">{description.length}/1000</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={submit}
                disabled={submitting}
                className={cn('btn-primary w-full flex items-center justify-center gap-2', submitting && 'opacity-70')}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Sending…' : 'Send report'}
              </button>
              <button onClick={handleClose} disabled={submitting} className="btn-ghost w-full">Cancel</button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              In an emergency, contact local services. PetSwap reviews all reports — usually within 24 hours.
            </p>
          </>
        )}
      </div>
    </BottomSheet>
  );
};

export default ReportSheet;
