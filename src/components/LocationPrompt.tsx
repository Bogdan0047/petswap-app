import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { friendlyError } from '@/lib/friendlyError';

interface LocationPromptProps {
  /** Compact inline banner instead of full empty state. */
  inline?: boolean;
  /** Called after we successfully obtain coordinates so the parent can refresh. */
  onUseLocation?: (coords?: { lat: number; lng: number }) => void;
}

const COORDS_STORAGE_KEY = 'petswap.geo.coords.v1';

/**
 * Premium location-needed prompt. Shown when we can't estimate distance for
 * any nearby content because the user has neither granted geolocation nor
 * saved a postcode on their profile. Encourages a real, accurate signal —
 * never invents a fallback distance.
 */
const LocationPrompt = ({ inline = false, onUseLocation }: LocationPromptProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const requestGeo = () => {
    console.log('LOCATION BUTTON CLICKED');

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      console.log('LOCATION ERROR: unsupported');
      toast.error('Location is not supported on this device.');
      return;
    }

    setLoading(true);
    console.log('LOCATION PERMISSION REQUESTED');

    // Hard timeout safety: never leave the button stuck in "Finding…".
    const safety = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.log('LOCATION ERROR: safety timeout');
          toast.error("We couldn't find your location. Please try again.");
        }
        return false;
      });
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(safety);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        console.log('LOCATION SUCCESS', coords);

        // Persist to the same cache useUserLocation reads.
        try {
          localStorage.setItem(
            COORDS_STORAGE_KEY,
            JSON.stringify({ ...coords, ts: Date.now() }),
          );
        } catch {
          /* storage may be full or unavailable — proceed anyway */
        }

        // Save GPS coords to the user's profile (real distance for nearby helpers).
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: upErr } = await supabase
              .from('profiles')
              .update({ latitude: coords.lat, longitude: coords.lng })
              .eq('id', user.id);
            if (upErr) console.log('LOCATION PROFILE UPDATE ERROR', upErr.message);
            else if (import.meta.env.DEV) console.log('Lat/Lng detected', coords);
          }
        } catch (e) {
          console.log('LOCATION PROFILE UPDATE EXCEPTION', e);
        }

        // Notify any listeners (e.g. Explore) to refresh nearby helpers.
        try {
          window.dispatchEvent(new CustomEvent('petswap:location-updated', { detail: coords }));
        } catch { /* ignore */ }

        toast.success('Location updated');
        setLoading(false);
        onUseLocation?.(coords);
      },
      (err) => {
        clearTimeout(safety);
        console.log('LOCATION ERROR', err?.code, err?.message);
        setLoading(false);

        if (err?.code === 1 /* PERMISSION_DENIED */) {
          toast.error('Location permission denied. Enable location in your browser settings.');
          return;
        }
        if (err?.code === 3 /* TIMEOUT */) {
          toast.error("We couldn't find your location. Please try again.");
          return;
        }
        if (err?.code === 2 /* POSITION_UNAVAILABLE */) {
          toast.error("We couldn't find your location. Please try again.");
          return;
        }
        toast.error(friendlyError(err, 'location'));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 * 5 },
    );
  };

  const buttonLabel = loading ? 'Finding…' : 'Use location';

  if (inline) {
    return (
      <div className="card-flat p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <MapPin size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-tight">Set your location</p>
          <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">
            We use it to show distances and trusted neighbours.
          </p>
        </div>
        <button
          onClick={requestGeo}
          disabled={loading}
          aria-busy={loading}
          className="btn-primary text-[12px] px-3 py-1.5 flex-shrink-0 inline-flex items-center gap-1.5 disabled:opacity-70"
        >
          {loading && <Loader2 size={12} className="animate-spin" />}
          {buttonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="card-flat p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <MapPin size={22} className="text-primary" />
      </div>
      <p className="font-bold text-[16px] mb-1">Set your location to see nearby members</p>
      <p className="text-[13px] text-muted-foreground mb-4 max-w-[300px] mx-auto leading-relaxed">
        PetSwap uses your real location only — we never invent distances. Allow location access or add your
        postcode to your profile.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={requestGeo}
          disabled={loading}
          aria-busy={loading}
          className="btn-primary py-2 px-4 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-70"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Finding…' : 'Use my location'}
        </button>
        <button onClick={() => navigate('/profile')} className="btn-secondary py-2 px-4 text-[13px]">Add postcode</button>
      </div>
    </div>
  );
};

export default LocationPrompt;
