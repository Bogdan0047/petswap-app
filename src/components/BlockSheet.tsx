import { useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { supabase } from '@/integrations/supabase/client';
import { blockStore } from '@/lib/blockStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { friendlyError } from '@/lib/friendlyError';

interface BlockSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  onBlocked?: () => void;
}

const BlockSheet = ({ isOpen, onClose, userId, userName, onBlocked }: BlockSheetProps) => {
  const [submitting, setSubmitting] = useState(false);

  const handleBlock = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('block_user', { _blocked_user_id: userId });
      // Always reflect locally so search/matching hides them immediately
      blockStore.block(userId);
      if (error && !/auth|jwt|not authenticated/i.test(error.message)) {
        throw error;
      }
      toast.success(`${userName ?? 'User'} blocked. They can no longer message or find you.`);
      onBlocked?.();
      onClose();
    } catch (e: unknown) {
      toast.error(friendlyError(e, "block"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} size="sm" title={`Block ${userName ?? 'user'}?`}>
      <div className="space-y-5">
        <div className="card-flat p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <Ban size={18} className="text-destructive" />
          </div>
          <div>
            <p className="text-[14px] font-semibold leading-snug">They won’t be able to contact you</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed mt-1">
              Blocking hides {userName ?? 'this user'} from your matches and search results, cancels any pending connection,
              and stops new messages. They aren’t notified.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleBlock}
            disabled={submitting}
            className={cn('btn-destructive w-full flex items-center justify-center gap-2', submitting && 'opacity-70')}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Blocking…' : 'Block user'}
          </button>
          <button onClick={onClose} disabled={submitting} className="btn-ghost w-full">Cancel</button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default BlockSheet;
