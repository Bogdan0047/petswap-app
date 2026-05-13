import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star, Shield, Edit, FileText, Lock, Info, LogOut, Heart, Users, MapPin,
  Trash2, Bell, HelpCircle, ShieldAlert, Gift, BarChart3, Share2, Plus,
  CreditCard, ShieldQuestion, Download, Sparkles, ShieldCheck, ChevronRight,
  Camera, Loader2, MailCheck, PawPrint,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMyProfile, type MyReviewRow } from '@/hooks/useMyProfile';
import ProModeCard from '@/components/ProModeCard';
import { useProMode } from '@/lib/proModeStore';
import { trackEvent } from '@/lib/analyticsStore';
import BottomNav from '@/components/BottomNav';
import FirstSwapNudge from '@/components/FirstSwapNudge';
import { markSuggestPending } from '@/hooks/useFirstSwapState';
import TrustBadge from '@/components/TrustBadge';
import TrustScore from '@/components/TrustScore';
import TrustHeroPill from '@/components/TrustHeroPill';
import StreakBadge from '@/components/StreakBadge';
import BadgesRow from '@/components/BadgesRow';
import ProfileViewsPill from '@/components/ProfileViewsPill';
import { useMyStreak } from '@/hooks/useMyStreak';
import TrustBreakdownCard from '@/components/TrustBreakdownCard';
import ProfileStrength from '@/components/ProfileStrength';
import PetCard from '@/components/PetCard';
import ReviewCard from '@/components/ReviewCard';
import SettingsRow from '@/components/SettingsRow';
import UserAvatar from '@/components/UserAvatar';
import SectionHeader from '@/components/SectionHeader';
import AvailabilityPicker from '@/components/AvailabilityPicker';
import InviteSheet from '@/components/InviteSheet';
import SafetyTipsCard from '@/components/SafetyTipsCard';
import SelfieWithPetUpload from '@/components/SelfieWithPetUpload';
import { useCurrentUserId, useTrustProfile } from '@/hooks/useTrustProfile';
import { useMyReferralCode, useReferralStats } from '@/lib/referrals';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { sendPetSwapEmail } from '@/lib/sendAppEmail';
import { scheduleAppEmail } from '@/lib/scheduleAppEmail';
import EmailPreferencesSection from '@/components/EmailPreferencesSection';

type TabKey = 'overview' | 'pets' | 'availability' | 'reviews' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'pets', label: 'Pets' },
  { key: 'availability', label: 'Availability' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'settings', label: 'Settings' },
];

const Profile = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const myUserId = useCurrentUserId();
  const { profile, pets: myPets, reviews, reload: reloadProfile, setProfile } = useMyProfile(myUserId);
  const { streak: myStreak } = useMyStreak();

  // Display fallbacks pulled from auth metadata so the page never feels empty pre-load.
  const displayName =
    profile?.first_name ||
    (user?.user_metadata as { first_name?: string; name?: string } | undefined)?.first_name ||
    (user?.user_metadata as { name?: string } | undefined)?.name ||
    (user?.email ? user.email.split('@')[0] : 'You');
  const avatarUrl = profile?.avatar_url || (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url || null;
  const area = profile?.area || 'Add your area';
  const avgRating = profile?.average_rating ?? 0;
  const totalReviews = profile?.total_reviews ?? 0;
  const completedSwaps = profile?.completed_swaps ?? 0;
  const responseRate = profile?.response_rate ?? 0;
  const isEmailVerified = Boolean(user?.email_confirmed_at);
  const isPhoneVerified = false;
  const isIdVerified = false;
  const isLocationVerified = Boolean(profile?.is_location_verified && profile?.latitude != null && profile?.longitude != null);
  const isPetOwnerVerified = Boolean(profile?.is_pet_owner_verified && profile?.selfie_with_pet_url);
  const selfieUrl = profile?.selfie_with_pet_url ?? null;
  const subscriptionTier = profile?.subscription_tier ?? 'free';
  // "Fully verified" = profile photo + verified email + selfie + location.
  const isFullyVerified = !!avatarUrl && isEmailVerified && isPetOwnerVerified && isLocationVerified;

  const { data: realTrust, refresh: refreshTrust } = useTrustProfile(myUserId);
  const trust = {
    score: realTrust?.score ?? 0,
    tier: realTrust?.tier ?? ('low' as const),
    tierLabel: realTrust?.tierLabel ?? 'New member',
    completion: realTrust?.completion ?? 0,
  };

  const [tab, setTab] = useState<TabKey>('overview');
  const [isAdmin, setIsAdmin] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const referralCode = useMyReferralCode(myUserId);
  const referralStats = useReferralStats(myUserId);

  useEffect(() => {
    if (!myUserId) { setIsAdmin(false); return; }
    let cancelled = false;
    supabase.rpc('has_role', { _user_id: myUserId, _role: 'admin' })
      .then(({ data }) => { if (!cancelled) setIsAdmin(Boolean(data)); });
    return () => { cancelled = true; };
  }, [myUserId]);

  useEffect(() => {
    if (!myUserId || !user?.email_confirmed_at || profile?.is_email_verified) return;
    void supabase.rpc('sync_my_email_verification').then(() => {
      void reloadProfile();
      void refreshTrust();
    });
  }, [myUserId, user?.email_confirmed_at, profile?.is_email_verified, reloadProfile, refreshTrust]);

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file || !myUserId) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Use a JPG, PNG or WEBP photo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Choose a photo under 5 MB.');
      return;
    }
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${myUserId}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', myUserId);
      if (updateError) throw updateError;
      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev);
      toast.success('Profile photo updated');
      void refreshTrust();
      void reloadProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed. Check your connection and try again.');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${displayName} on PetSwap`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Profile link copied');
      }
    } catch { /* user cancelled */ }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* HERO */}
      <div className="px-6 pt-6 pb-5 safe-top">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative flex-shrink-0 group"
            aria-label={avatarUrl ? 'Edit profile photo' : 'Add a profile photo'}
          >
            <UserAvatar name={displayName} src={avatarUrl} size={72} rounded={18} />
            {avatarUploading && (
              <span className="absolute inset-0 rounded-[18px] bg-background/60 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-primary" />
              </span>
            )}
            {!avatarUrl && (
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background shadow-sm">
                <Plus size={14} strokeWidth={2.5} />
              </span>
            )}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleAvatarFile(e.target.files?.[0])}
          />
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-[22px] font-bold tracking-tight truncate">{displayName}</h1>
              {isFullyVerified && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={10} /> Fully verified
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin size={12} /> {area}
            </p>
            {/* Friendly trust subtitle — answers "who is this?" instantly */}
            {(isPetOwnerVerified || isLocationVerified || isEmailVerified) && (
              <p className="text-[12.5px] font-semibold text-success inline-flex items-center gap-1 mt-1">
                <ShieldCheck size={12} />
                {isPetOwnerVerified
                  ? 'Verified pet owner nearby'
                  : isLocationVerified
                    ? 'Trusted member in your area'
                    : 'Verified member'}
              </p>
            )}
            {/* Human-readable trust signals — hide empty stats for brand-new users */}
            {totalReviews > 0 || completedSwaps > 0 ? (
              <>
                <div className="flex items-baseline gap-2 mt-2">
                  {totalReviews > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Star size={20} fill="currentColor" className="text-warning" />
                      <span className="text-[26px] font-bold leading-none">{avgRating.toFixed(1)}</span>
                    </span>
                  )}
                  {totalReviews > 0 && (
                    <span className="text-[13px] text-muted-foreground">({totalReviews} review{totalReviews === 1 ? '' : 's'})</span>
                  )}
                  {completedSwaps > 0 && (
                    <>
                      {totalReviews > 0 && <span className="text-muted-foreground">·</span>}
                      <span className="text-[13px] text-muted-foreground">{completedSwaps} swaps</span>
                    </>
                  )}
                </div>
                {totalReviews > 0 && (
                  <p className="text-[13px] text-foreground/80 mt-1.5">
                    <span className="font-semibold text-foreground">Trusted by {totalReviews} pet owner{totalReviews === 1 ? '' : 's'}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13px] text-primary font-semibold mt-2 inline-flex items-center gap-1">
                <Sparkles size={13} /> New on PetSwap — ready to help
              </p>
            )}
            {/* Clean badge row */}
            <div className="mt-2.5 flex flex-row flex-wrap items-center gap-1.5">
              {avgRating > 4.8 && totalReviews >= 3 && <TrustBadge type="top_trusted" size="md" />}
              {isFullyVerified && <TrustBadge type="fully_verified" size="md" />}
              {!isFullyVerified && isPetOwnerVerified && <TrustBadge type="pet_owner_verified" size="md" />}
              {!isFullyVerified && isLocationVerified && <TrustBadge type="location_verified" size="md" />}
              {!isFullyVerified && !isPetOwnerVerified && !isLocationVerified && isEmailVerified && <TrustBadge type="verified" size="md" />}
            </div>
            <BadgesRow userId={null} className="mt-2" />
          </div>
          {/* Numeric trust score intentionally not shown on hero — humans, not numbers. */}
        </div>


        {/* Hero actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => navigate('/profile/edit')}
            className="flex-1 h-11 rounded-xl bg-foreground text-background font-semibold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Edit size={15} /> Edit profile
          </button>
          <button
            onClick={handleShare}
            className="flex-1 h-11 rounded-xl bg-surface-muted ring-1 ring-border text-foreground font-semibold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Share2 size={15} /> Share
          </button>
        </div>

        {/* Add photo to build trust — only when no real photo */}
        {!avatarUrl && (
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="mt-3 w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-primary/[0.06] ring-1 ring-primary/15 text-left active:scale-[0.99] transition-transform"
          >
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Plus size={16} className="text-primary" strokeWidth={2.5} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13.5px] font-semibold text-foreground">Add a photo to build trust</span>
              <span className="block text-[12px] text-muted-foreground">Profiles with a real photo get 3× more swap requests.</span>
            </span>
          </button>
        )}
      </div>

      {/* Tab bar — sticky for premium feel */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="px-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-1 min-w-max">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 h-12 text-[14px] font-semibold relative transition-colors ${
                    active ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {t.label}
                  {active && (
                    <span className="absolute left-3 right-3 bottom-0 h-[2.5px] rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="pt-5">
        {tab === 'overview' && (
          <OverviewTab
            trust={trust}
            verificationProgress={[isEmailVerified, isLocationVerified, isPetOwnerVerified, !!avatarUrl].filter(Boolean).length}
            stats={{ avgRating, totalReviews, completedSwaps, responseRate }}
            verifications={{ isEmailVerified, isPhoneVerified, isIdVerified, isLocationVerified, isPetOwnerVerified }}
            subscriptionTier={subscriptionTier}
            onInvite={() => setInviteOpen(true)}
            referralCode={referralCode}
            referralCredited={referralStats.credited}
            onActivity={() => navigate('/analytics')}
            myUserId={myUserId}
            avatarUrl={avatarUrl}
            selfieUrl={selfieUrl}
            isFullyVerified={isFullyVerified}
            onVerificationUpdated={() => { void reloadProfile(); void refreshTrust(); }}
          />
        )}

        {tab === 'pets' && (
          <div className="px-6 space-y-3">
            {myPets.length === 0 ? (
              <EmptyCard
                icon={<Heart size={22} className="text-primary" />}
                title="No pets yet"
                body="Add your first pet so neighbours can match with you."
                cta="Add a pet"
                onCta={() => navigate('/welcome-new')}
              />
            ) : (
              <>
                {myPets.map((pet) => (
                  <PetCard
                    key={pet.id}
                    name={pet.name}
                    breed={pet.breed ?? pet.type}
                    size={pet.size ?? ''}
                    temperament={pet.temperament ?? ''}
                    emoji={petEmoji(pet.type)}
                    variant="compact"
                  />
                ))}
                <button
                  onClick={() => navigate('/welcome-new')}
                  className="w-full h-12 mt-1 rounded-xl ring-1 ring-border bg-surface-muted/60 text-foreground font-semibold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.99] transition-transform"
                >
                  <Plus size={16} /> Add another pet
                </button>
              </>
            )}
          </div>
        )}

        {tab === 'availability' && (
          <div className="px-6">
            <p className="text-[13px] text-muted-foreground mb-3">
              More availability = more matches nearby.
            </p>
            <AvailabilityPicker userId={myUserId} />
          </div>
        )}

        {tab === 'reviews' && (
          <ReviewsTab avgRating={avgRating} totalReviews={totalReviews} reviews={reviews} />
        )}

        {tab === 'settings' && (
          <SettingsTab
            isAdmin={isAdmin}
            isPremium={subscriptionTier === 'premium'}
            onUpgrade={() => navigate('/subscription')}
            onSignOut={handleSignOut}
            onNavigate={(p) => navigate(p)}
            onSendTestDeletionEmail={async () => {
              const recipient = user?.email;
              if (!recipient) {
                toast.error('No email on session');
                return;
              }
              const meta = (user?.user_metadata ?? {}) as { first_name?: string; name?: string };
              const firstName = meta.first_name || meta.name || null;
              const idem = `test-deletion-${user?.id ?? recipient}-${Date.now()}`;
              toast.loading('Sending test deletion email…', { id: 'test-del-email' });
              try {
                const { data, error } = await supabase.functions.invoke(
                  'send-transactional-email',
                  {
                    body: {
                      templateName: 'account-deletion-scheduled',
                      recipientEmail: recipient,
                      idempotencyKey: idem,
                      templateData: { firstName, daysLeft: 30 },
                    },
                  }
                );
                if (error) {
                  console.error('[test-deletion-email] provider error', error);
                  toast.error('Send failed', { id: 'test-del-email', description: error.message });
                  return;
                }
                console.log('[test-deletion-email] queued', data);
                toast.success(`Queued to ${recipient}`, {
                  id: 'test-del-email',
                  description: 'Check your inbox in a minute.',
                });
              } catch (err) {
                console.error('[test-deletion-email] invoke threw', err);
                toast.error('Send failed', {
                  id: 'test-del-email',
                  description: err instanceof Error ? err.message : String(err),
                });
              }
            }}
          />
        )}
      </div>

      <InviteSheet isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
      <BottomNav />
    </div>
  );
};

/* ───────────────────  Location verify row  ─────────────── */

const COORDS_STORAGE_KEY = 'petswap.geo.coords.v1';

const LocationVerifyRow = ({
  userId,
  isVerified,
  onVerified,
}: {
  userId: string | null | undefined;
  isVerified: boolean;
  onVerified?: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // Brief celebratory banner shown only right after a fresh verify in this session.
  const [justVerified, setJustVerified] = useState(false);

  useEffect(() => {
    if (!justVerified) return;
    const t = setTimeout(() => setJustVerified(false), 6000);
    return () => clearTimeout(t);
  }, [justVerified]);

  const handleVerifyLocation = () => {
    if (isVerified || loading) return; // prevent duplicate / re-trigger
    if (!userId) {
      toast.error('Please sign in to verify your location');
      return;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      toast.error('Location is not supported on this device.');
      return;
    }

    setLoading(true);
    setPermissionDenied(false);

    const safety = setTimeout(() => {
      setLoading((prev) => {
        if (prev) toast.error("We couldn't find your location. Please try again.");
        return false;
      });
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(safety);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (import.meta.env.DEV) console.log('GPS coords:', coords);

        try {
          localStorage.setItem(
            COORDS_STORAGE_KEY,
            JSON.stringify({ ...coords, ts: Date.now() }),
          );
        } catch { /* ignore */ }

        const { error } = await supabase
          .from('profiles')
          .update({
            latitude: coords.lat,
            longitude: coords.lng,
            is_location_verified: true,
            location_verified_at: new Date().toISOString(),
          })
          .eq('id', userId);

        setLoading(false);

        if (error) {
          toast.error("Couldn't verify location", { description: error.message });
          return;
        }

        try {
          window.dispatchEvent(new CustomEvent('petswap:location-updated', { detail: coords }));
        } catch { /* ignore */ }

        setJustVerified(true);
        toast.success('You are now visible to nearby pet owners', {
          description: '+20% trust boost — your profile just got stronger.',
        });
        onVerified?.();
      },
      (err) => {
        clearTimeout(safety);
        setLoading(false);
        if (err?.code === 1) {
          setPermissionDenied(true);
          toast.error('Location permission is off', {
            description: 'Enable location in your browser settings, then tap Enable location.',
          });
          return;
        }
        toast.error("We couldn't find your location. Please try again.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 * 5 },
    );
  };

  if (isVerified) {
    return (
      <div className="space-y-2">
        {justVerified && (
          <div
            role="status"
            className="w-full rounded-xl bg-success/10 ring-1 ring-success/30 px-4 py-3 flex items-center gap-3 animate-fade-in"
            style={{ animation: 'fade-in 0.4s ease-out' }}
          >
            <div className="w-9 h-9 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={18} className="text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-success leading-tight">
                Location verified — you'll appear to nearby pet owners
              </p>
              <p className="text-[11.5px] text-success/80 mt-0.5">+20% trust boost added to your profile</p>
            </div>
          </div>
        )}
        <div className="card-elevated p-4 w-full flex items-center gap-3 bg-success/[0.04] ring-1 ring-success/20">
          <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] flex items-center gap-1.5">
              Location confirmed <span aria-hidden>📍</span>
            </p>
            <p className="text-[12px] text-muted-foreground">Used to match you with nearby pet owners.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleVerifyLocation}
        disabled={loading}
        aria-busy={loading}
        className="card-elevated p-4 w-full flex items-center gap-3 active:scale-[0.99] transition-transform text-left disabled:opacity-70"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          {loading ? <Loader2 size={18} className="text-primary animate-spin" /> : <MapPin size={18} className="text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px]">
            {loading ? 'Verifying…' : permissionDenied ? 'Enable location' : 'Confirm your location'}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {loading
              ? 'Getting your GPS coordinates…'
              : permissionDenied
                ? 'Location permission is off — turn it on in browser settings, then tap to retry.'
                : 'Helps people nearby trust you.'}
          </p>
        </div>
        {!loading && <ChevronRight size={16} className="text-muted-foreground" />}
      </button>
      <p className="text-[11.5px] text-muted-foreground px-1">
        Profiles with a verified location get more connections.
      </p>
    </div>
  );
};

/* ─────────────────────────  Tabs  ───────────────────────── */

type Stats = { avgRating: number; totalReviews: number; completedSwaps: number; responseRate: number };
type Verifications = {
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdVerified: boolean;
  isLocationVerified: boolean;
  isPetOwnerVerified: boolean;
};

const OverviewTab = ({
  trust, verificationProgress, stats, verifications, subscriptionTier,
  onInvite, referralCode, referralCredited, onActivity,
  myUserId, avatarUrl, selfieUrl, isFullyVerified,
  onVerificationUpdated,
}: {
  trust: { score: number; tier: 'low' | 'improving' | 'good' | 'trusted'; tierLabel: string; completion: number };
  verificationProgress: number;
  stats: Stats;
  verifications: Verifications;
  subscriptionTier: string;
  onInvite: () => void;
  referralCode: string | null;
  referralCredited: number;
  onActivity: () => void;
  myUserId: string | null | undefined;
  avatarUrl: string | null;
  selfieUrl: string | null;
  isFullyVerified: boolean;
  onVerificationUpdated: () => void;
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sendingEmail, setSendingEmail] = useState(false);

  const resendVerificationEmail = async () => {
    if (!user?.email) return;
    setSendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
      if (error) throw error;
      toast.success('Verification email sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send verification email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="px-6 space-y-4">
      {/* Trust score / starter onboarding */}
      {/* Verification checklist — friendly for new users, no big "0/100" number */}
      {(stats.totalReviews === 0 && stats.completedSwaps === 0) ? (
        <div className="card-elevated p-5 bg-gradient-to-br from-primary/5 to-transparent">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">
            <Sparkles size={10} /> Welcome to PetSwap
          </span>
          <p className="text-[18px] font-bold leading-tight">A few quick steps to start matching</p>
          <p className="text-[12.5px] text-muted-foreground mt-1 mb-3">
            Each step builds visible trust on your profile. No documents needed.
          </p>
          <div className="space-y-1.5">
            {[
              { label: 'Verify your email', done: verifications.isEmailVerified },
              { label: 'Add a profile photo', done: !!avatarUrl },
              { label: 'Confirm your location', done: verifications.isLocationVerified },
              { label: 'Add a selfie with your pet', done: verifications.isPetOwnerVerified },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2.5 text-[13px]">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  s.done ? 'bg-success text-success-foreground' : 'bg-surface-muted text-muted-foreground ring-1 ring-border'
                }`}>{s.done ? '✓' : ''}</span>
                <span className={s.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card-elevated p-5">
          <p className="text-[15px] font-bold leading-tight">Why people trust your profile</p>
          <p className="text-[12.5px] text-muted-foreground mt-1 mb-3.5">
            Real signals from your verifications and activity.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <TrustChip label="Email verified" on={verifications.isEmailVerified} />
            <TrustChip label="Pet owner verified" on={verifications.isPetOwnerVerified} />
            <TrustChip label="Location confirmed" on={verifications.isLocationVerified} />
            <TrustChip label="Profile photo" on={!!avatarUrl} />
          </div>
          {trust.score >= 60 && (
            <p className="text-[11.5px] text-muted-foreground mt-3">
              Internal trust score: <span className="font-semibold text-foreground/70">{trust.score}/100</span>
            </p>
          )}
        </div>
      )}

      {/* Why this profile is trusted */}
      {trust.score > 0 && (
        <TrustBreakdownCard
          score={trust.score}
          items={[
            { label: 'Email verified', achieved: verifications.isEmailVerified },
            { label: 'Profile photo added', achieved: !!avatarUrl },
            { label: 'Pet owner verified (selfie)', achieved: verifications.isPetOwnerVerified },
            { label: 'Location verified', achieved: verifications.isLocationVerified },
            { label: '5★ reviews', achieved: stats.avgRating >= 4.5 && stats.totalReviews >= 3 },
            { label: 'Completed swaps', achieved: stats.completedSwaps >= 1 },
          ]}
        />
      )}

      {/* Achievement badges row — capped at 3, prioritised */}
      {(() => {
        const all: Array<'fully_verified' | 'pet_owner_verified' | 'location_verified' | 'top_helper' | 'reliable' | 'verified' | 'premium'> = [];
        if (isFullyVerified) all.push('fully_verified');
        if (verifications.isPetOwnerVerified) all.push('pet_owner_verified');
        if (verifications.isLocationVerified) all.push('location_verified');
        if (stats.avgRating >= 4.7 && stats.totalReviews >= 3) all.push('top_helper');
        if (stats.completedSwaps >= 5) all.push('reliable');
        if (verifications.isEmailVerified && verifications.isPhoneVerified) all.push('verified');
        if (subscriptionTier === 'premium') all.push('premium');
        const shown = all.slice(0, 3);
        if (shown.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1.5 animate-fade-in">
            {shown.map((t) => <TrustBadge key={t} type={t} size="md" />)}
          </div>
        );
      })()}

      <div className="card-elevated p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <MailCheck size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px]">Email verification</p>
          <p className="text-[12px] text-muted-foreground">{verifications.isEmailVerified ? 'Verified' : 'Confirm your email to unlock the badge.'}</p>
        </div>
        <button
          type="button"
          disabled={verifications.isEmailVerified || sendingEmail}
          onClick={resendVerificationEmail}
          className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold disabled:opacity-60"
        >
          {verifications.isEmailVerified ? 'Verified' : sendingEmail ? 'Sending…' : 'Send'}
        </button>
      </div>

      {/* Soft pet-owner verification (selfie with pet — no legal documents) */}
      <SelfieWithPetUpload
        userId={myUserId}
        isVerified={verifications.isPetOwnerVerified}
        selfieUrl={selfieUrl}
        onVerified={onVerificationUpdated}
      />

      {/* Location verification CTA — real GPS via navigator.geolocation */}
      <LocationVerifyRow
        userId={myUserId}
        isVerified={verifications.isLocationVerified}
        onVerified={() => {
          // Queue the "3 people near you ready to help" suggestion sheet
          // for the next Home open — kicks off the first-swap activation loop.
          markSuggestPending();
          onVerificationUpdated?.();
        }}
      />

      {/* First-swap nudge — visible only while user has zero completed swaps */}
      {stats.completedSwaps === 0 && (
        <FirstSwapNudge onCta={() => navigate('/explore')} />
      )}

      {/* Trust level — friendly checklist instead of cold % */}
      {(() => {
        const steps = [
          { label: 'Verify your email', done: verifications.isEmailVerified },
          { label: 'Add a profile photo', done: !!avatarUrl },
          { label: 'Confirm your location', done: verifications.isLocationVerified },
          { label: 'Add a selfie with your pet', done: verifications.isPetOwnerVerified },
          { label: 'Complete your first swap', done: stats.completedSwaps >= 1 },
        ];
        return (
          <ProfileStrength
            pct={trust.completion}
            variant="card"
            doneSteps={steps.filter(s => s.done)}
            nextSteps={steps.filter(s => !s.done)}
            onAction={() => window.location.assign('/profile/edit')}
          />
        );
      })()}

      {/* First-action boost — shown until the user has any activity */}
      {stats.completedSwaps === 0 && stats.totalReviews === 0 && (
        <div className="card-elevated p-4 bg-primary/5 ring-1 ring-primary/15 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <PawPrint size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] leading-tight">Complete your first swap to unlock full trust</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Early members get more requests — yours could be next.</p>
          </div>
        </div>
      )}

      {/* Quick stats — only show stats that aren't empty/negative */}
      {(stats.totalReviews > 0 || stats.completedSwaps > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {stats.totalReviews > 0 && (
            <Stat label="Rating" value={stats.avgRating.toFixed(1)} icon={<Star size={14} className="text-warning" fill="currentColor" />} />
          )}
          {stats.completedSwaps > 0 && stats.responseRate >= 50 && (
            <Stat label="Response rate" value={`${stats.responseRate}%`} icon={<Bell size={14} className="text-primary" />} />
          )}
          {stats.completedSwaps > 0 && (
            <Stat label="Completed swaps" value={String(stats.completedSwaps)} icon={<Heart size={14} className="text-primary" fill="currentColor" />} />
          )}
          {stats.totalReviews > 0 && (
            <Stat label="Reviews" value={String(stats.totalReviews)} icon={<Users size={14} className="text-primary" />} />
          )}
        </div>
      )}


      {/* Invite */}
      <button
        onClick={onInvite}
        className="card-elevated p-5 w-full flex items-center gap-4 bg-primary/5 active:scale-[0.99] transition-transform text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Gift size={22} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px]">Invite a friend</p>
          <p className="text-[12.5px] text-muted-foreground">
            {referralCode ? `Code ${referralCode} · ` : ''}
            Both earn 2 credits after their first swap
            {referralCredited > 0 ? ` · ${referralCredited} credited` : ''}
          </p>
        </div>
        <span className="text-primary font-semibold text-[13px]">Share</span>
      </button>

      {/* Activity */}
      <button
        onClick={onActivity}
        className="card-elevated p-4 w-full flex items-center gap-3 active:scale-[0.99] transition-transform text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[14px]">Your activity</p>
          <p className="text-[12px] text-muted-foreground">Sessions, retention and request completion</p>
        </div>
        <span className="text-primary text-[13px] font-semibold">View</span>
      </button>
    </div>
  );
};

const ReviewsTab = ({ avgRating, totalReviews, reviews }: { avgRating: number; totalReviews: number; reviews: MyReviewRow[] }) => {
  const histogram = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: reviews.filter((r) => r.rating === s).length,
  }));
  const maxCount = Math.max(1, ...histogram.map((h) => h.count));

  return (
    <div className="px-6 space-y-4">
      <div className="card-elevated p-6 flex items-center gap-5">
        <div className="text-center">
          <p className="text-[36px] font-bold leading-none">{avgRating.toFixed(1)}</p>
          <div className="flex items-center justify-center gap-0.5 mt-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={12} fill="currentColor" className={i <= Math.round(avgRating) ? 'text-warning' : 'text-border'} />
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground mt-1.5">{totalReviews} reviews</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {histogram.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-3">{star}</span>
              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-warning" style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {reviews.length === 0 ? (
        <EmptyCard
          icon={<Star size={22} className="text-warning" />}
          title="No reviews yet"
          body="Complete your first swap to start collecting reviews."
        />
      ) : (
        reviews.map((r) => (
          <ReviewCard
            key={r.id}
            reviewerName={r.reviewer_name ?? 'Neighbour'}
            reviewerAvatar={r.reviewer_avatar ?? undefined}
            rating={r.rating}
            reviewText={r.comment ?? ''}
            tags={r.tags}
            date={new Date(r.created_at).toLocaleDateString()}
          />
        ))
      )}
    </div>
  );
};

const SettingsTab = ({
  isAdmin, isPremium, onUpgrade, onSignOut, onNavigate, onSendTestDeletionEmail,
}: {
  isAdmin: boolean;
  isPremium: boolean;
  onUpgrade: () => void;
  onSignOut: () => void;
  onNavigate: (p: string) => void;
  onSendTestDeletionEmail: () => void | Promise<void>;
}) => {
  const proMode = useProMode(isPremium);
  const { user } = useAuth();
  // Two-step delete: 'intro' (explain + reason) → 'confirm' (final tap).
  const [deleteStep, setDeleteStep] = useState<null | 'intro' | 'confirm'>(null);
  const [deleting, setDeleting] = useState(false);
  const [leaveReason, setLeaveReason] = useState<string>('');

  const handleExportData = () => {
    toast.success('Your data export is being prepared', {
      description: "We'll email you a download link within 24 hours.",
    });
  };

  const openDelete = () => {
    setLeaveReason('');
    setDeleteStep('intro');
  };

  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    try {
      // Capture optional analytics signal before we sign out.
      if (leaveReason) {
        trackEvent('account_delete_reason', leaveReason);
      }
      // Soft-delete: marks account_status='pending_deletion' and deleted_at=now()
      // so the profile is hidden from search/matches/messages immediately. The
      // user has 30 days to sign in and restore. Permanent purge runs server-side
      // via public.purge_expired_deletions() (admin/cron).
      const { error } = await supabase.rpc('request_account_deletion');
      if (error) throw error;

      // Send the "scheduled for deletion" confirmation email. We await the
      // invoke so we can surface provider errors in the console, but we
      // never block the sign-out — the queue + cron retry transient failures.
      const recipient = user?.email ?? null;
      const meta = (user?.user_metadata ?? {}) as { first_name?: string; name?: string };
      const firstName = meta.first_name || meta.name || null;
      if (recipient) {
        try {
          const idem = `account-deletion-${user?.id ?? recipient}-${Date.now()}`;
          const { data, error: emailError } = await supabase.functions.invoke(
            'send-transactional-email',
            {
              body: {
                templateName: 'account-deletion-scheduled',
                recipientEmail: recipient,
                idempotencyKey: idem,
                templateData: { firstName, daysLeft: 30 },
              },
            }
          );
          if (emailError) {
            console.error('[deletion-email] provider error', emailError);
          } else {
            console.log('[deletion-email] queued', data);
          }
        } catch (err) {
          console.error('[deletion-email] invoke threw', err);
        }
      } else {
        console.warn('[deletion-email] skipped — no recipient email on session');
      }

      setDeleteStep(null);
      await supabase.auth.signOut();
      toast.success('Account scheduled for deletion', {
        description: 'You have 30 days to sign in and restore before permanent deletion.',
      });
      window.location.href = '/auth';
    } catch (err) {
      const { friendlyError } = await import('@/lib/friendlyError');
      toast.error(friendlyError(err, "profile"));
    } finally {
      setDeleting(false);
    }
  };

  const LEAVE_REASONS = [
    'Not useful',
    'Too expensive',
    'Not enough users',
    'Just testing',
    'Other',
  ];

  return (
    <div className="px-6 space-y-5">
      {/* PetSwap Plus */}
      <ProModeCard
        enabled={proMode.enabled}
        effective={proMode.effective}
        isPremium={proMode.isPremium}
        trialActive={proMode.trialActive}
        trialDaysLeft={proMode.trialDaysLeft}
        onToggle={(next) => {
          proMode.setEnabled(next);
          trackEvent(next ? 'pro_mode_enabled' : 'pro_mode_disabled');
        }}
        onUpgrade={onUpgrade}
      />

      <SettingsGroup title="Account">
        <SettingsRow
          icon={<Heart size={20} />}
          title="Subscription"
          subtitle={isPremium ? 'Trusted Plus active' : 'Upgrade to Trusted Plus'}
          onPress={onUpgrade}
        />
        <SettingsRow
          icon={<Bell size={20} />}
          title="Alerts & updates"
          subtitle="Push, messages, nearby requests"
          onPress={() => onNavigate('/notifications')}
        />
        <SettingsRow
          icon={<CreditCard size={20} />}
          title="Credits & payments"
          subtitle="Balance, history, payouts"
          onPress={() => onNavigate('/credits')}
        />
      </SettingsGroup>

      <SettingsGroup title="Safety">
        <SettingsRow icon={<Shield size={20} />} title="Safety Centre" onPress={() => onNavigate('/safety')} />
        <SettingsRow icon={<PawPrint size={20} />} title="Photo + pet verification" subtitle="Selfie with your pet, no ID documents" onPress={() => onNavigate('/profile')} />
        <SettingsRow icon={<ShieldAlert size={20} />} title={isAdmin ? "Admin · Role management" : "Become admin"} subtitle={isAdmin ? "Grant or revoke admin access" : "Claim the first admin role"} onPress={() => onNavigate('/admin/roles')} />
        {isAdmin && <SettingsRow icon={<ShieldAlert size={20} />} title="Admin · Reports queue" onPress={() => onNavigate('/admin/reports')} />}
        {isAdmin && <SettingsRow icon={<ShieldAlert size={20} />} title="Admin · Email logs" subtitle="View every email sent" onPress={() => onNavigate('/admin/emails')} />}
        {isAdmin && (
          <SettingsRow
            icon={<Trash2 size={20} />}
            title="Admin · Send test deletion email"
            subtitle="Sends the deletion email to your address"
            onPress={() => { void onSendTestDeletionEmail(); }}
          />
        )}
        {isAdmin && user && (
          <>
            <AdminTestButton userId={user.id} type="welcome" label="Send welcome test" />
            <AdminTestButton userId={user.id} type="new-match" label="Send match email test" data={{ otherFirstName: 'Alex', otherAvatarUrl: 'https://i.pravatar.cc/120?img=12', otherTrustScore: 78, otherLocation: 'Hackney, London', chatUrl: 'https://petswap.co.uk/messages' }} />
            <AdminTestButton userId={user.id} type="match-nudge-24h" label="Send match nudge (24h) test" data={{ otherFirstName: 'Alex', chatUrl: 'https://petswap.co.uk/messages' }} />
            <AdminTestButton userId={user.id} type="match-nudge-72h" label="Send match nudge (72h) test" data={{ otherFirstName: 'Alex', chatUrl: 'https://petswap.co.uk/messages' }} />
            <AdminTestButton userId={user.id} type="booking-confirmation" label="Send booking confirmation email test" data={{ otherUser: 'Alex', petName: 'Buddy', dates: 'Sat 4 May, 9:00 AM – 6:00 PM', location: 'Hackney, London', bookingUrl: 'https://petswap.co.uk/inbox' }} />
            <AdminTestButton userId={user.id} type="review-request" label="Send review email test" data={{ otherFirstName: 'Alex', petName: 'Buddy', dates: 'Sat 4 May → Mon 6 May', reviewUrl: 'https://petswap.co.uk/inbox' }} />
            <AdminTestButton userId={user.id} type="review-reminder-3d" label="Send review reminder (3d) test" data={{ otherFirstName: 'Alex', petName: 'Buddy', reviewUrl: 'https://petswap.co.uk/inbox' }} />
            <AdminTestButton userId={user.id} type="trust-booster" label="Send trust booster test" />
            <AdminTestButton userId={user.id} type="profile-incomplete" label="Send profile-incomplete test" data={{ completionPct: 40 }} />
            <AdminTestButton userId={user.id} type="no-pet-added" label="Send no-pet-added test" />
            <AdminTestButton userId={user.id} type="account-verified" label="Send verification email test" data={{ verificationType: 'id', trustScore: 82, profileUrl: 'https://petswap.co.uk/profile' }} />
            <AdminTestButton userId={user.id} type="reengagement" label="Send re-engagement email test" />
            <AdminTestButton userId={user.id} type="inactive-winback" label="Send inactive-winback test" />
            <AdminSimulateFlowButton userId={user.id} flow="match" label="Simulate match flow (now + 24h + 72h)" />
            <AdminSimulateFlowButton userId={user.id} flow="booking" label="Simulate booking flow (now + 12h review)" />
            <AdminSimulateFlowButton userId={user.id} flow="review" label="Simulate review flow (now + 3d reminder)" />
          </>
        )}
      </SettingsGroup>

      <EmailPreferencesSection />

      <SafetyTipsCard />

      <SettingsGroup title="Support">
        <SettingsRow
          icon={<HelpCircle size={20} />}
          title="Need help? We're here"
          subtitle="Live chat · email · FAQ"
          onPress={() => onNavigate('/help')}
        />
        <SettingsRow
          icon={<ShieldQuestion size={20} />}
          title="Report a problem"
          onPress={() => onNavigate('/help')}
        />
      </SettingsGroup>

      <SettingsGroup title="Legal">
        <SettingsRow icon={<FileText size={20} />} title="Privacy Policy" onPress={() => onNavigate('/legal/privacy')} />
        <SettingsRow icon={<Lock size={20} />} title="Terms & Conditions" onPress={() => onNavigate('/legal/terms')} />
        <SettingsRow icon={<Users size={20} />} title="Community Guidelines" onPress={() => onNavigate('/legal/guidelines')} />
        <SettingsRow icon={<Info size={20} />} title="Data Usage" onPress={() => onNavigate('/data-usage')} />
      </SettingsGroup>

      <SettingsGroup title="Danger zone">
        <SettingsRow icon={<Download size={20} />} title="Export my data" onPress={handleExportData} />
        <SettingsRow
          icon={<Trash2 size={20} />}
          title="Delete account"
          destructive
          onPress={openDelete}
        />
        <SettingsRow icon={<LogOut size={20} />} title="Sign out" destructive onPress={onSignOut} />
      </SettingsGroup>

      <p className="text-center text-[11px] text-muted-foreground pt-2 pb-1">
        PetSwap · v1.0
      </p>

      {/* Step 1: explain + optional reason */}
      <AlertDialog
        open={deleteStep === 'intro'}
        onOpenChange={(open) => !open && !deleting && setDeleteStep(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile, pets, matches, messages and reviews will be hidden
              immediately. You have <span className="font-semibold text-foreground">30 days</span> to
              restore your account before it is permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="pt-1">
            <p className="text-[13px] font-medium text-foreground mb-2">
              Mind sharing why? <span className="text-muted-foreground font-normal">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {LEAVE_REASONS.map((r) => {
                const active = leaveReason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLeaveReason(active ? '' : r)}
                    className={
                      'h-8 px-3 rounded-full text-[12.5px] font-medium transition-colors ' +
                      (active
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground/80 hover:bg-muted/80')
                    }
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setDeleteStep('confirm');
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 2: final double-confirmation */}
      <AlertDialog
        open={deleteStep === 'confirm'}
        onOpenChange={(open) => !open && !deleting && setDeleteStep(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out and start the 30-day deletion countdown.
              Sign in any time within 30 days to restore your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteStep('intro')}>
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Yes, delete my account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ─────────────────────────  Bits  ───────────────────────── */

const Stat = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
  <div className="card-elevated p-4">
    <div className="flex items-center gap-1.5 text-muted-foreground text-[11.5px] font-medium uppercase tracking-wide">
      {icon} {label}
    </div>
    <p className="text-[22px] font-bold mt-1.5 leading-none">{value}</p>
  </div>
);

const TrustChip = ({ label, on }: { label: string; on: boolean }) => (
  <div className={`flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg ${
    on ? 'bg-primary/8 text-foreground' : 'bg-surface-muted text-muted-foreground'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-primary' : 'bg-border'}`} />
    {label}
  </div>
);

const SettingsGroup = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div>
    {title && (
      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground px-1 pb-2">
        {title}
      </p>
    )}
    <div className="card-elevated divide-y divide-border/60 overflow-hidden p-0">
      {children}
    </div>
  </div>
);

const EmptyCard = ({ icon, title, body, cta, onCta }: {
  icon: React.ReactNode; title: string; body: string; cta?: string; onCta?: () => void;
}) => (
  <div className="card-elevated p-6 flex flex-col items-center text-center">
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
      {icon}
    </div>
    <p className="font-semibold text-[15px]">{title}</p>
    <p className="text-[13px] text-muted-foreground mt-1 mb-4 max-w-[260px]">{body}</p>
    {cta && onCta && (
      <button onClick={onCta} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] active:scale-[0.98] transition-transform">
        {cta}
      </button>
    )}
  </div>
);

const petEmoji = (type: string): string => {
  const t = type.toLowerCase();
  if (t.includes('dog')) return '🐶';
  if (t.includes('cat')) return '🐱';
  if (t.includes('rabbit') || t.includes('bunny')) return '🐰';
  if (t.includes('bird')) return '🐦';
  if (t.includes('fish')) return '🐠';
  if (t.includes('hamster') || t.includes('rodent')) return '🐹';
  if (t.includes('reptile') || t.includes('lizard')) return '🦎';
  return '🐾';
};


const AdminTestButton = ({ userId, type, label, data }: {
  userId: string; type: string; label: string; data?: Record<string, unknown>;
}) => {
  const [busy, setBusy] = useState(false);
  return (
    <SettingsRow
      icon={<ShieldAlert size={20} />}
      title={`Admin · ${label}`}
      subtitle={busy ? 'Sending…' : `Type: ${type}`}
      onPress={() => {
        if (busy) return;
        setBusy(true);
        toast.loading(`Sending ${type}…`, { id: `t-${type}` });
        void sendPetSwapEmail({
          userId, emailType: type, templateData: data,
          forceTransactional: true,
          idempotencyKey: `admin-test-${type}-${Date.now()}`,
        }).then((ok) => {
          setBusy(false);
          if (ok) toast.success(`Queued ${type}`, { id: `t-${type}` });
          else toast.error(`Failed ${type}`, { id: `t-${type}`, description: 'Check console / admin email logs.' });
        });
      }}
    />
  );
};

const AdminSimulateFlowButton = ({ userId, flow, label }: {
  userId: string; flow: 'match' | 'booking' | 'review'; label: string;
}) => {
  const [busy, setBusy] = useState(false);
  return (
    <SettingsRow
      icon={<ShieldAlert size={20} />}
      title={`Admin · ${label}`}
      subtitle={busy ? 'Simulating…' : `Flow: ${flow}`}
      onPress={async () => {
        if (busy) return;
        setBusy(true);
        const stamp = Date.now();
        const id = `sim-${flow}-${stamp}`;
        const soon = (mins: number) => new Date(Date.now() + mins * 60 * 1000);
        try {
          if (flow === 'match') {
            await sendPetSwapEmail({
              userId, emailType: 'new-match', forceTransactional: true,
              idempotencyKey: `${id}-now`,
              templateData: { otherFirstName: 'Alex', otherTrustScore: 78, chatUrl: 'https://petswap.co.uk/messages' },
            });
            await scheduleAppEmail({
              userId, emailType: 'match-nudge-24h', dedupeKey: id,
              scheduledFor: soon(2),
              templateData: { otherFirstName: 'Alex', chatUrl: 'https://petswap.co.uk/messages' },
            });
            await scheduleAppEmail({
              userId, emailType: 'match-nudge-72h', dedupeKey: id,
              scheduledFor: soon(4),
              templateData: { otherFirstName: 'Alex', chatUrl: 'https://petswap.co.uk/messages' },
            });
          } else if (flow === 'booking') {
            await sendPetSwapEmail({
              userId, emailType: 'booking-confirmation', forceTransactional: true,
              idempotencyKey: `${id}-now`,
              templateData: { otherUser: 'Alex', petName: 'Buddy', dates: 'Sat 4 May, 9:00 AM – 6:00 PM', location: 'Hackney, London', bookingUrl: 'https://petswap.co.uk/inbox' },
            });
            await scheduleAppEmail({
              userId, emailType: 'review-request', dedupeKey: id,
              scheduledFor: soon(2),
              templateData: { otherFirstName: 'Alex', petName: 'Buddy', dates: 'Sat 4 May → Mon 6 May', reviewUrl: 'https://petswap.co.uk/inbox' },
            });
          } else {
            await sendPetSwapEmail({
              userId, emailType: 'review-request', forceTransactional: true,
              idempotencyKey: `${id}-now`,
              templateData: { otherFirstName: 'Alex', petName: 'Buddy', dates: 'Sat 4 May → Mon 6 May', reviewUrl: 'https://petswap.co.uk/inbox' },
            });
            await scheduleAppEmail({
              userId, emailType: 'review-reminder-3d', dedupeKey: id,
              scheduledFor: soon(2),
              templateData: { otherFirstName: 'Alex', petName: 'Buddy', reviewUrl: 'https://petswap.co.uk/inbox' },
            });
          }
          toast.success(`Simulated ${flow} flow`, { description: 'Initial email sent now; follow-ups scheduled in ~2-4 min.' });
        } catch (e: any) {
          toast.error(`Simulate ${flow} failed`, { description: e?.message || String(e) });
        } finally {
          setBusy(false);
        }
      }}
    />
  );
};

export default Profile;
