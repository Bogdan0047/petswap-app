import { Copy, Gift, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import { useCurrentUserId } from '@/hooks/useTrustProfile';
import {
  useMyReferralCode,
  useReferralStats,
  buildShareLink,
  sharePetSwap,
} from '@/lib/referrals';

interface InviteSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const InviteSheet = ({ isOpen, onClose }: InviteSheetProps) => {
  const userId = useCurrentUserId();
  const code = useMyReferralCode(userId);
  const stats = useReferralStats(userId);

  const onShare = async () => {
    const result = await sharePetSwap(code);
    toast.success(result === 'shared' ? 'Invite shared' : 'Invite copied');
  };

  const onCopyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    toast.success('Code copied');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Invite friends" size="md">
      <div className="text-center mb-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Gift size={26} className="text-primary" />
        </div>
        <p className="font-bold text-[16px]">Both earn 2 credits</p>
        <p className="text-[13px] text-muted-foreground mt-1 px-2">
          When your friend completes their first swap, you each receive 2 credits.
        </p>
      </div>

      {code ? (
        <>
          <button
            onClick={onCopyCode}
            className="w-full card-flat p-4 mb-3 flex items-center gap-3 transition-all duration-fast active:scale-[0.99]"
          >
            <div className="flex-1 text-left">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Your code
              </p>
              <p className="font-bold text-[20px] tracking-widest">{code}</p>
            </div>
            <Copy size={18} className="text-muted-foreground" />
          </button>

          <p className="text-[11px] text-muted-foreground mb-3 break-all">
            {buildShareLink(code)}
          </p>

          <button onClick={onShare} className="btn-primary w-full text-[15px] flex items-center justify-center gap-2 mb-4">
            <Share2 size={16} /> Share invite
          </button>

          {(stats.credited > 0 || stats.pending > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="card-flat p-3 text-center">
                <p className="font-bold text-[18px] text-primary">{stats.credited}</p>
                <p className="text-[11px] text-muted-foreground">Credited</p>
              </div>
              <div className="card-flat p-3 text-center">
                <p className="font-bold text-[18px] text-warning">{stats.pending}</p>
                <p className="text-[11px] text-muted-foreground">Pending swap</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card-flat p-5 text-center">
          <Users size={22} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-[13px] text-muted-foreground">
            Sign in to get your unique referral code.
          </p>
        </div>
      )}
    </BottomSheet>
  );
};

export default InviteSheet;
