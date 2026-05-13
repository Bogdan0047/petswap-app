import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import BottomSheet from './BottomSheet';
import { supabase } from '@/integrations/supabase/client';
import { toggleFavourite, isFavourite } from '@/lib/favouritesStore';
import { cn } from '@/lib/utils';
import { friendlyError } from '@/lib/friendlyError';

interface ChatReviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  swapId: string | null;
  otherUserId: string;
  otherFirstName: string;
}

const TAGS = ['On time', 'Great with pets', 'Clear communicator', 'Tidy', 'Reliable', 'Friendly'];

const ChatReviewSheet = ({ isOpen, onClose, swapId, otherUserId, otherFirstName }: ChatReviewSheetProps) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [trustAgain, setTrustAgain] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(isFavourite(otherUserId));

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handleSubmit = async () => {
    if (!swapId) {
      toast.error('You can leave a review once your booking is completed.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('submit_review', {
      _swap_id: swapId,
      _rating: rating,
      _comment: comment.trim() || null,
      _tags: tags,
      _would_trust_again: trustAgain,
    });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error, "review"));
      return;
    }
    toast.success('Thanks — you’re helping the community 💚');
    // STREAK + celebration
    void import('@/lib/streaks').then(({ recordStreakActivity }) =>
      recordStreakActivity('review_submitted').then(() =>
        window.dispatchEvent(new CustomEvent('petswap:streak-changed')),
      ),
    );
    window.dispatchEvent(new CustomEvent('petswap:celebrate', { detail: { kind: 'review' } }));
    // Phase 3 viral loop: prompt to invite a friend after a positive review.
    window.dispatchEvent(new CustomEvent('petswap:invite-prompt', { detail: { kind: 'review' } }));
    // CONVERSION TRACKING — flip most recent review_request push to converted.
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) {
        void supabase.rpc('mark_push_converted', {
          _user_id: data.user.id, _type: 'review_request', _conversion: 'review_submitted',
        });
      }
    })();
    onClose();
  };

  const handleFavourite = () => {
    const next = toggleFavourite(otherUserId);
    setSaved(next);
    toast(next ? 'Saved as favourite' : 'Removed from favourites');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} size="lg">
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary mb-1">Leave a review</p>
        <h3 className="font-bold text-[17px]">How was your time with {otherFirstName}?</h3>
        <p className="text-[12px] text-muted-foreground mt-1">
          Reviews grow trust scores and help neighbours pick reliable people.
        </p>
      </div>

      {/* Stars */}
      <div className="flex justify-center gap-1.5 my-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`} className="p-1">
            <Star
              size={32}
              className={cn(n <= rating ? 'text-warning' : 'text-border')}
              fill={n <= rating ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TAGS.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors',
              tags.includes(t)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-foreground border-border-light',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Add a note (optional)"
        className="w-full px-3 py-2.5 rounded-md bg-muted text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none mb-3"
      />

      <label className="flex items-center gap-2 text-[12.5px] mb-4">
        <input
          type="checkbox"
          checked={trustAgain}
          onChange={(e) => setTrustAgain(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        I'd trust {otherFirstName} again
      </label>

      <div className="flex gap-2">
        <button onClick={handleFavourite} className={cn('btn-outline flex-1 text-[13px] py-3', saved && 'border-primary text-primary')}>
          {saved ? '★ Favourite' : '☆ Save favourite'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={busy}
          className="btn-primary flex-1 text-[13px] py-3 inline-flex items-center justify-center gap-1.5"
        >
          {busy && <Loader2 size={14} className="animate-spin" />} Submit
        </button>
      </div>
    </BottomSheet>
  );
};

export default ChatReviewSheet;
