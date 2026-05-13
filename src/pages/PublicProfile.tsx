import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, ShieldCheck, CheckCircle, Clock, HandHeart, PawPrint, CalendarDays, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import UserAvatar from '@/components/UserAvatar';
import TrustScore from '@/components/TrustScore';
import StatusBadge from '@/components/StatusBadge';
import QuickRequestSheet from '@/components/QuickRequestSheet';
import RouteFallback from '@/components/RouteFallback';
import { haptic } from '@/lib/haptic';
import { trackEvent } from '@/lib/analyticsStore';
import { useAuth } from '@/lib/auth';
import { useUserLocation } from '@/hooks/useUserLocation';
import { haversineMiles, estimateMiles, formatMiles } from '@/lib/distance';
import { cn } from '@/lib/utils';

interface PublicProfileRow {
  id: string;
  first_name: string | null;
  area: string | null;
  postcode: string | null;
  avatar_url: string | null;
  bio: string | null;
  trust_score: number;
  trust_tier: string;
  average_rating: number;
  total_reviews: number;
  completed_swaps: number;
  response_rate: number;
  is_email_verified: boolean;
  is_phone_verified?: boolean;
  is_location_verified?: boolean;
  is_pet_owner_verified?: boolean;
  available_now: boolean;
  last_seen_at: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string | null;
}

interface PetRow {
  id: string;
  name: string;
  type: string | null;
  breed: string | null;
  temperament?: string | null;
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[] | null;
  created_at: string;
  reviewer_id: string;
  reviewer_name?: string | null;
  reviewer_avatar?: string | null;
}

interface AvailabilityRow {
  id: string;
  date: string;
  slot: string;
}

const PET_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', fish: '🐠', reptile: '🦎', other: '🐾',
};

const formatRelative = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const responseLabel = (rate: number): string => {
  if (rate >= 80) return 'Replies within hours';
  if (rate >= 50) return 'Replies within a day';
  if (rate > 0) return 'Replies in 1–2 days';
  return 'New here — keen to reply';
};

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const myLoc = useUserLocation(user?.id);

  const [profile, setProfile] = useState<PublicProfileRow | null>(null);
  const [pets, setPets] = useState<PetRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [pRes, petRes, rvRes, avRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,first_name,area,postcode,avatar_url,bio,trust_score,trust_tier,average_rating,total_reviews,completed_swaps,response_rate,is_email_verified,is_phone_verified,is_location_verified,is_pet_owner_verified,available_now,last_seen_at,latitude,longitude,created_at')
          .eq('id', id)
          .maybeSingle(),
        supabase.from('pets').select('id,name,type,breed,temperament').eq('owner_id', id),
        supabase.from('reviews').select('id,rating,comment,tags,created_at,reviewer_id').eq('reviewee_id', id).order('created_at', { ascending: false }).limit(5),
        supabase.from('availability').select('id,date,slot').eq('user_id', id).gte('date', today).order('date').limit(14),
      ]);
      if (cancelled) return;
      if (pRes.error || !pRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(pRes.data as PublicProfileRow);
      setPets((petRes.data ?? []) as PetRow[]);
      setAvailability((avRes.data ?? []) as AvailabilityRow[]);

      const raw = (rvRes.data ?? []) as ReviewRow[];
      const reviewerIds = Array.from(new Set(raw.map(r => r.reviewer_id)));
      let nameMap: Record<string, { name: string | null; avatar: string | null }> = {};
      if (reviewerIds.length) {
        const { data: rps } = await supabase.from('profiles').select('id,first_name,avatar_url').in('id', reviewerIds);
        nameMap = Object.fromEntries((rps ?? []).map(r => [r.id, { name: r.first_name, avatar: r.avatar_url }]));
      }
      setReviews(raw.map(r => ({
        ...r,
        reviewer_name: nameMap[r.reviewer_id]?.name ?? null,
        reviewer_avatar: nameMap[r.reviewer_id]?.avatar ?? null,
      })));
      setLoading(false);
      trackEvent('home_helper_view', id);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const distanceLabel = useMemo(() => {
    if (!profile) return null;
    if (myLoc.coords && profile.latitude != null && profile.longitude != null) {
      const m = haversineMiles(myLoc.coords, { lat: profile.latitude, lng: profile.longitude });
      if (m != null) return formatMiles(m, false);
    }
    if (myLoc.postcode && profile.postcode) {
      return formatMiles(estimateMiles(myLoc.postcode, profile.postcode), true);
    }
    return null;
  }, [profile, myLoc.coords, myLoc.postcode]);

  if (loading) return <RouteFallback />;
  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <p className="text-foreground font-semibold">Profile not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 btn-outline px-4 py-2 rounded-full text-sm">Go back</button>
      </div>
    );
  }

  const name = (profile.first_name || 'Member').trim() || 'Member';
  const fullyVerified = !!profile.avatar_url && profile.is_email_verified && !!profile.is_pet_owner_verified && !!profile.is_location_verified;
  const online = profile.last_seen_at ? Date.now() - new Date(profile.last_seen_at).getTime() < 5 * 60_000 : false;
  const bio = (profile.bio && profile.bio.trim()) || 'Pet lover nearby — happy to help 🐾';

  const availabilityLabel = profile.available_now
    ? 'Available now'
    : availability.length > 0
      ? (() => {
          const next = new Date(availability[0].date);
          const diffDays = Math.round((next.getTime() - Date.now()) / 86_400_000);
          if (diffDays <= 0) return 'Available today';
          if (diffDays === 1) return 'Available tomorrow';
          if (diffDays <= 7) return 'Available this week';
          return `Available from ${next.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
        })()
      : 'Ask about availability';

  const trustBadges: Array<'verified' | 'id_checked' | 'pet_owner_verified' | 'location_verified' | 'top_helper' | 'reliable'> = [];
  if (fullyVerified) trustBadges.push('verified');
  if (profile.is_pet_owner_verified) trustBadges.push('pet_owner_verified');
  if (profile.is_location_verified) trustBadges.push('location_verified');
  if (profile.is_email_verified && !fullyVerified) trustBadges.push('id_checked');
  if (profile.completed_swaps >= 5) trustBadges.push('top_helper');
  if (profile.response_rate >= 80 && profile.completed_swaps > 0) trustBadges.push('reliable');

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-md border-b border-border/40">
        <div className="px-4 py-3 flex items-center gap-3 safe-top">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-full tap-feedback">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-[16px] truncate">{name}</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <UserAvatar name={name} src={profile.avatar_url || undefined} size={84} rounded={42} />
            {fullyVerified && (
              <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-success text-success-foreground flex items-center justify-center ring-[3px] ring-background">
                <CheckCircle size={14} strokeWidth={2.6} />
              </span>
            )}
            {!fullyVerified && online && (
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-success ring-[3px] ring-background animate-pulse-soft" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-[22px] tracking-tight truncate">{name}</h2>
              {fullyVerified && <ShieldCheck size={16} className="text-success flex-shrink-0" strokeWidth={2.5} />}
            </div>
            <div className="text-[13px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              {(profile.area || distanceLabel) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} />
                  {distanceLabel ? distanceLabel : profile.area}
                </span>
              )}
              {profile.area && distanceLabel && (
                <span className="opacity-50">· {profile.area}</span>
              )}
            </div>
            <div className="mt-2">
              <TrustScore score={profile.trust_score} tier={(profile.trust_tier as 'low' | 'improving' | 'good' | 'trusted') || 'low'} variant="pill" size="sm" />
            </div>
          </div>
        </div>

        {/* Availability + response time row */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-success/10 text-success-foreground rounded-2xl p-3 flex items-center gap-2">
            <CalendarDays size={16} className="text-success flex-shrink-0" strokeWidth={2.4} />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-none">Availability</p>
              <p className="text-[13px] font-semibold text-foreground truncate mt-1">{availabilityLabel}</p>
            </div>
          </div>
          <div className="bg-muted/40 rounded-2xl p-3 flex items-center gap-2">
            <Clock size={16} className="text-foreground/70 flex-shrink-0" strokeWidth={2.4} />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-none">Response</p>
              <p className="text-[13px] font-semibold text-foreground truncate mt-1">{responseLabel(profile.response_rate)}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="bg-muted/40 rounded-2xl p-3 text-center">
            <div className="text-[16px] font-bold tabular-nums">
              {profile.total_reviews > 0 ? profile.average_rating.toFixed(1) : '—'}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
              <Star size={10} className="text-warning" fill="currentColor" /> {profile.total_reviews > 0 ? `${profile.total_reviews} reviews` : 'New member'}
            </div>
          </div>
          <div className="bg-muted/40 rounded-2xl p-3 text-center">
            <div className="text-[16px] font-bold tabular-nums">{profile.completed_swaps || '—'}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{profile.completed_swaps > 0 ? 'Swaps' : 'Getting started'}</div>
          </div>
          <div className="bg-muted/40 rounded-2xl p-3 text-center">
            <div className="text-[16px] font-bold tabular-nums inline-flex items-center justify-center gap-1">
              {profile.response_rate > 0 ? `${profile.response_rate}%` : '—'}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{profile.response_rate > 0 ? 'Reply rate' : 'New here'}</div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="px-6 mt-7">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground mb-2">About</h3>
        <p className="text-[15px] leading-[1.5] text-foreground/85">{bio}</p>
      </section>

      {/* Trust badges */}
      <section className="px-6 mt-7">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Trust & safety</h3>
        {trustBadges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {trustBadges.map((t) => (
              <StatusBadge key={t} type={t} size="sm" />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground bg-muted/40 rounded-2xl p-3">
            <ShieldCheck size={14} className="text-success" strokeWidth={2.5} />
            <span>Building trust — new to PetSwap</span>
          </div>
        )}
      </section>

      {/* Pets */}
      <section className="px-6 mt-7">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Pets</h3>
        {pets.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto -mx-6 px-6 pb-1">
            {pets.map((p) => (
              <div key={p.id} className="min-w-[140px] bg-card rounded-2xl p-3 ring-1 ring-black/[0.04] shadow-sm">
                <div className="w-full h-20 rounded-xl bg-muted flex items-center justify-center mb-2 text-3xl">
                  {PET_EMOJI[(p.type || 'other').toLowerCase()] || '🐾'}
                </div>
                <p className="text-[13px] font-semibold truncate">{p.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{p.breed || p.type || 'Pet'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[13px] text-muted-foreground bg-muted/40 rounded-2xl p-4">
            <PawPrint size={16} className="text-muted-foreground" />
            <span>No pets added yet</span>
          </div>
        )}
      </section>

      {/* Reviews */}
      <section className="px-6 mt-7">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Reviews</h3>
        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-card rounded-2xl p-4 ring-1 ring-black/[0.04] shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <UserAvatar name={r.reviewer_name || 'Member'} src={r.reviewer_avatar || undefined} size={32} rounded={16} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{r.reviewer_name || 'Member'}</p>
                    <p className="text-[11px] text-muted-foreground">{formatRelative(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} className={i < r.rating ? 'text-warning' : 'text-muted'} fill={i < r.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-[13px] text-foreground/80 leading-relaxed">{r.comment}</p>
                )}
                {r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3">
            <MessageCircle size={16} className="text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">New on PetSwap — be the first to review</p>
          </div>
        )}
      </section>

      {/* Sticky Send request CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-background via-background/95 to-transparent safe-bottom">
        <button
          onClick={() => { haptic('medium'); trackEvent('home_cta_tap', `public-profile:${profile.id}`); setRequestOpen(true); }}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-primary-foreground',
            'rounded-[16px] py-4',
            'shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.45),inset_0_1px_0_rgba(255,255,255,0.18)]',
            'transition-all duration-200 active:scale-[0.97]',
          )}
          style={{ background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary-pressed)) 100%)' }}
        >
          <HandHeart size={16} strokeWidth={2.4} /> Send request
        </button>
        <p className="text-[11.5px] text-center text-muted-foreground mt-2">No payment — just pet swaps</p>
      </div>

      <QuickRequestSheet
        isOpen={requestOpen}
        onClose={() => setRequestOpen(false)}
        prefillHelperId={profile.id}
      />
    </div>
  );
};

export default PublicProfile;
