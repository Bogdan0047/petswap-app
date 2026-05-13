import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MapPin, Star, CheckCircle, Heart, HandHeart, X as XIcon, Zap, Shield, Clock } from 'lucide-react';
import type { User } from '@/data/mockData';
import { mockPets } from '@/data/mockData';
import { getUserAvatar, getPetPhoto } from '@/assets/images';
import { computeTrust } from '@/lib/trust';
import { isActiveNow, estimateResponseTime } from '@/lib/presence';
import { haptic } from '@/lib/haptic';
import { cn } from '@/lib/utils';

interface Props {
  users: User[];
  onRequest: (user: User) => void;
  onSave: (user: User) => void;
  onExhausted?: () => void;
}

type SwipeAction = 'pass' | 'save' | 'request';

const SWIPE_THRESHOLD = 110;
const ROTATE_FACTOR = 0.06; // deg per px

const SwipeDeck: React.FC<Props> = ({ users, onRequest, onSave, onExhausted }) => {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [exiting, setExiting] = useState<null | SwipeAction>(null);
  const [matchPing, setMatchPing] = useState(false);
  const [savePing, setSavePing] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const current = users[index];
  const next = users[index + 1];

  useEffect(() => {
    if (!current && onExhausted) onExhausted();
  }, [current, onExhausted]);

  const reset = useCallback(() => {
    setDrag({ x: 0, y: 0 });
    setExiting(null);
  }, []);

  const advance = useCallback(
    (action: SwipeAction) => {
      if (!current) return;
      setExiting(action);
      haptic(action === 'request' ? 'success' : action === 'save' ? 'medium' : 'light');
      if (action === 'request') {
        setMatchPing(true);
        window.setTimeout(() => setMatchPing(false), 700);
        onRequest(current);
      } else if (action === 'save') {
        setSavePing(true);
        window.setTimeout(() => setSavePing(false), 600);
        onSave(current);
      }
      // Wait for the exit transition before unmounting
      window.setTimeout(() => {
        setIndex(i => i + 1);
        reset();
      }, 260);
    },
    [current, onRequest, onSave, reset],
  );

  // --- Pointer drag handlers ---
  const onPointerDown = (e: React.PointerEvent) => {
    if (exiting) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current || exiting) return;
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  };
  const onPointerUp = () => {
    if (!startRef.current) return;
    startRef.current = null;
    if (drag.x > SWIPE_THRESHOLD) advance('request');
    else if (drag.x < -SWIPE_THRESHOLD) advance('pass');
    else reset();
  };

  if (!current) {
    return null;
  }

  const trust = computeTrust(current);
  const activeNow = isActiveNow(current);
  const replyEta = estimateResponseTime(current.responseRate);
  const fullyVerified = current.isEmailVerified && current.isPhoneVerified;
  const userPet = mockPets.find(p => p.ownerId === current.id);
  const avatar = getUserAvatar(current.id);
  const petImg = userPet ? getPetPhoto(userPet.id) : undefined;

  // Visual transforms
  const exitX = exiting === 'pass' ? -window.innerWidth : exiting === 'request' ? window.innerWidth : 0;
  const exitRot = exiting === 'pass' ? -22 : exiting === 'request' ? 22 : 0;
  const tx = exiting ? exitX : drag.x;
  const ty = exiting ? -40 : drag.y * 0.2;
  const rot = exiting ? exitRot : drag.x * ROTATE_FACTOR;
  const dragRatio = Math.min(Math.abs(drag.x) / SWIPE_THRESHOLD, 1);
  const passOpacity = drag.x < 0 ? dragRatio : 0;
  const reqOpacity = drag.x > 0 ? dragRatio : 0;

  return (
    <div className="relative">
      {/* Card stack — next card peeks behind */}
      <div className="relative h-[480px] select-none">
        {next && (
          <div
            className="absolute inset-0 card-elevated overflow-hidden"
            style={{
              transform: `scale(${0.94 + dragRatio * 0.04}) translateY(${10 - dragRatio * 6}px)`,
              transition: exiting ? 'none' : 'transform 220ms var(--ease-premium)',
              opacity: 0.6 + dragRatio * 0.4,
            }}
          >
            <SwipeCardImage user={next} />
          </div>
        )}

        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-0 card-elevated overflow-hidden touch-none cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
            transition: exiting
              ? 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)'
              : startRef.current
                ? 'none'
                : 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform',
          }}
        >
          {/* Image w/ subtle parallax based on drag.y */}
          <div className="relative h-[58%] overflow-hidden">
            {avatar ? (
              <img
                src={avatar}
                alt={current.firstName}
                className="w-full h-full object-cover"
                style={{
                  transform: `translateY(${drag.y * 0.05}px) scale(1.02)`,
                  transition: startRef.current ? 'none' : 'transform 320ms var(--ease-premium)',
                }}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl bg-accent">
                {current.avatarEmoji}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 pointer-events-none" />

            {/* Trust badge top-left with shimmer when verified */}
            {fullyVerified && (
              <div className="absolute top-4 left-4 inline-flex items-center gap-1 bg-white/95 backdrop-blur-md text-primary text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm animate-pulse-soft">
                <Shield size={11} /> Verified
              </div>
            )}
            {activeNow && (
              <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
                Active now
              </div>
            )}

            {/* Decision overlays — reveal as user drags */}
            <div
              className="absolute top-6 left-6 px-3 py-1.5 rounded-md border-[2.5px] border-destructive bg-destructive/10 backdrop-blur-sm text-destructive font-extrabold text-[15px] tracking-wider rotate-[-12deg] shadow-sm"
              style={{ opacity: passOpacity }}
            >
              PASS
            </div>
            <div
              className="absolute top-6 right-6 px-3 py-1.5 rounded-md border-[2.5px] border-primary bg-primary/10 backdrop-blur-sm text-primary font-extrabold text-[15px] tracking-wider rotate-[12deg] shadow-sm"
              style={{ opacity: reqOpacity }}
            >
              REQUEST
            </div>

            {/* Bottom name overlay */}
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <div className="flex items-end gap-2">
                <h3 className="text-[22px] font-bold leading-tight drop-shadow-sm">
                  {current.firstName}
                </h3>
                <span className="text-[13px] font-semibold opacity-90 mb-0.5">
                  · Trust {trust.score}
                </span>
              </div>
              <p className="text-[12px] opacity-95 flex items-center gap-1 mt-0.5">
                <MapPin size={11} /> {current.area} · {current.distance}
              </p>
            </div>
          </div>

          {/* Bottom info panel */}
          <div className="p-4">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-success/10 text-success px-2 py-1 rounded-full">
                <Zap size={11} /> Replies {replyEta}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-muted text-foreground/80 px-2 py-1 rounded-full">
                <Star size={11} className="text-warning" fill="currentColor" /> {current.averageRating} · {current.completedSwaps} swaps
              </span>
              {current.reliabilityScore >= 90 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">
                  <CheckCircle size={11} /> {current.reliabilityScore}% reliable
                </span>
              )}
            </div>
            {userPet && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md overflow-hidden bg-accent flex-shrink-0">
                  {petImg ? (
                    <img src={petImg} alt={userPet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-base">
                      {userPet.avatarEmoji}
                    </div>
                  )}
                </div>
                <div className="text-[12px] text-muted-foreground line-clamp-1">
                  Cares for <span className="font-semibold text-foreground">{userPet.name}</span> ·{' '}
                  {userPet.breed}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating glass action bar */}
      <div className="mt-5 flex items-center justify-center gap-3">
        <ActionButton
          variant="pass"
          onClick={() => advance('pass')}
          aria-label="Pass"
        >
          <XIcon size={22} strokeWidth={2.5} />
        </ActionButton>
        <ActionButton variant="save" onClick={() => advance('save')} aria-label="Save">
          <Heart size={20} strokeWidth={2.5} />
        </ActionButton>
        <ActionButton variant="request" onClick={() => advance('request')} aria-label="Request">
          <HandHeart size={22} strokeWidth={2.5} />
        </ActionButton>
      </div>
      <p className="text-center text-[11px] text-muted-foreground mt-3 inline-flex items-center gap-1.5 justify-center w-full">
        <Clock size={11} /> Swipe right to request · left to pass
      </p>

      {/* Match success ping overlay */}
      {matchPing && (
        <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center">
          <div className="absolute inset-0 bg-success/10 animate-fade-in" />
          <div className="relative animate-tick-pop">
            <div className="w-24 h-24 rounded-full bg-success flex items-center justify-center shadow-elevated">
              <HandHeart size={42} className="text-white" strokeWidth={2.4} />
            </div>
          </div>
        </div>
      )}

      {/* Save heart burst */}
      {savePing && (
        <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center">
          <div className="relative animate-tick-pop">
            <div className="w-20 h-20 rounded-full bg-white shadow-elevated flex items-center justify-center">
              <Heart size={38} className="text-destructive animate-heart-pulse" fill="currentColor" strokeWidth={2.2} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant: SwipeAction }
> = ({ variant, className, children, ...rest }) => {
  const styles =
    variant === 'pass'
      ? 'bg-white text-foreground border border-border w-14 h-14'
      : variant === 'save'
        ? 'bg-white text-warning border border-border w-12 h-12'
        : 'bg-primary text-primary-foreground w-16 h-16 shadow-elevated';
  return (
    <button
      {...rest}
      className={cn(
        'rounded-full inline-flex items-center justify-center transition-all duration-fast active:scale-[0.92] hover:scale-[1.04]',
        styles,
        className,
      )}
      style={{
        backdropFilter: variant !== 'request' ? 'blur(10px)' : undefined,
      }}
    >
      {children}
    </button>
  );
};

const SwipeCardImage: React.FC<{ user: User }> = ({ user }) => {
  const avatar = getUserAvatar(user.id);
  if (avatar) {
    return (
      <div className="relative h-[58%] overflow-hidden">
        <img src={avatar} alt="" className="w-full h-full object-cover opacity-90" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
    );
  }
  // Premium placeholder — large initial on a deterministic gradient. No stock faces.
  const palette: Array<[string, string]> = [
    ['#0EA5E9', '#2563EB'],
    ['#10B981', '#0EA371'],
    ['#F59E0B', '#EA580C'],
    ['#8B5CF6', '#6D28D9'],
    ['#EC4899', '#BE185D'],
    ['#14B8A6', '#0D9488'],
  ];
  let h = 0;
  for (let i = 0; i < user.firstName.length; i++) h = (h * 31 + user.firstName.charCodeAt(i)) >>> 0;
  const [from, to] = palette[h % palette.length];
  return (
    <div
      className="relative h-[58%] overflow-hidden flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span className="text-white font-semibold text-[88px] tracking-tight select-none drop-shadow-sm">
        {user.firstName.charAt(0).toUpperCase()}
      </span>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
};

export default SwipeDeck;
