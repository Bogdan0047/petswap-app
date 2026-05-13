import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import InviteSheet from './InviteSheet';

/**
 * Global Phase 3 invite prompt.
 *
 * Listens for `petswap:invite-prompt` events fired from high-emotion moments
 * (booking confirmed, review submitted, badge unlocked) and shows a single
 * action toast: "Invite a friend". Tapping the action opens InviteSheet.
 *
 * Anti-spam: each `kind` is shown at most once per session — we don't want
 * to nag users who already saw the prompt today.
 */
type Kind = 'booking' | 'review' | 'badge';

const SESSION_KEY = 'petswap.invite-prompt.shown';

function loadShown(): Record<Kind, boolean> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : { booking: false, review: false, badge: false };
  } catch {
    return { booking: false, review: false, badge: false };
  }
}
function saveShown(map: Record<Kind, boolean>) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

const COPY: Record<Kind, { title: string; description: string }> = {
  booking: {
    title: 'You just saved £50+ on pet sitting 🐾',
    description: 'Invite a friend and help them save too.',
  },
  review: {
    title: 'Loved your PetSwap?',
    description: 'Invite a friend so they can find trusted pet care too.',
  },
  badge: {
    title: 'Badge unlocked 🏆',
    description: 'Share PetSwap with a friend.',
  },
};

export default function InvitePromptToast() {
  const [open, setOpen] = useState(false);
  const shownRef = useRef<Record<Kind, boolean>>(loadShown());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      const detail = (e as CustomEvent<{ kind?: Kind }>).detail ?? {};
      const kind = (detail.kind ?? 'booking') as Kind;
      if (shownRef.current[kind]) return;
      shownRef.current = { ...shownRef.current, [kind]: true };
      saveShown(shownRef.current);

      const copy = COPY[kind];
      // Slight delay so it doesn't collide with the success toast / confetti.
      window.setTimeout(() => {
        toast(copy.title, {
          description: copy.description,
          duration: 6000,
          action: {
            label: 'Invite',
            onClick: () => setOpen(true),
          },
        });
      }, 1400);
    };
    window.addEventListener('petswap:invite-prompt', onPrompt as EventListener);
    return () => window.removeEventListener('petswap:invite-prompt', onPrompt as EventListener);
  }, []);

  return <InviteSheet isOpen={open} onClose={() => setOpen(false)} />;
}
