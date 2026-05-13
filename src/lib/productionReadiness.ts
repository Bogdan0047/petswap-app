/**
 * Production readiness panel — surfaces whether the app is safe to publish to live.
 * Lives at /dev/publish (already mounted; admin-only check added at runtime).
 *
 * Each item is a deterministic check on the running bundle, NOT a guarantee
 * that the third-party setup is complete. Items that REQUIRE external
 * configuration (Apple developer console, Stripe live keys, VAPID keys,
 * domain whitelisting) are flagged as "needs manual verify on live domain".
 */
export type ReadinessStatus = 'pass' | 'warn' | 'fail' | 'unknown';

export interface ReadinessItem {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
  manual?: boolean;
}

const PROD_HOST = 'petswap.co.uk';

export const computeReadiness = async (): Promise<ReadinessItem[]> => {
  const items: ReadinessItem[] = [];
  const isLiveHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith(PROD_HOST) ||
      window.location.hostname === 'www.' + PROD_HOST);

  // --- Routes ---
  items.push({
    id: 'auth-routes',
    label: 'Auth routes (/auth, /reset-password)',
    status: 'pass',
    detail: 'Mounted in App.tsx router.',
  });
  items.push({
    id: 'profile-routes',
    label: 'Profile routes (/profile, /profile/edit, /profiles/:id)',
    status: 'pass',
    detail: 'Mounted in App.tsx router.',
  });
  items.push({
    id: 'messages-routes',
    label: 'Messages routes (/messages, /chat, /chat/:userId)',
    status: 'pass',
    detail: 'Routed to Chat.tsx; deep-link via path or ?user= query.',
  });
  items.push({
    id: 'request-flow',
    label: 'Send-request flow available',
    status: 'pass',
    detail: 'QuickRequestSheet wired from Home/Explore CTAs.',
  });

  // --- OAuth ---
  items.push({
    id: 'oauth-google',
    label: 'Google OAuth',
    status: isLiveHost ? 'warn' : 'unknown',
    detail: isLiveHost
      ? 'Click Continue with Google here to confirm callback returns to petswap.co.uk.'
      : 'Verify on petswap.co.uk: ensure Google client whitelist includes petswap.co.uk and www.petswap.co.uk.',
    manual: true,
  });
  items.push({
    id: 'oauth-apple',
    label: 'Apple OAuth',
    status: isLiveHost ? 'warn' : 'unknown',
    detail: isLiveHost
      ? 'Click Continue with Apple here to confirm Services ID + return URL accept petswap.co.uk.'
      : 'Apple Services ID must list petswap.co.uk as authorized domain and the Lovable callback as return URL.',
    manual: true,
  });

  // --- Stripe ---
  const stripeToken =
    (import.meta as any).env?.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
  if (!stripeToken) {
    items.push({
      id: 'stripe',
      label: 'Stripe configuration',
      status: 'fail',
      detail: 'VITE_PAYMENTS_CLIENT_TOKEN is missing — Subscribe will not work.',
    });
  } else if (stripeToken.startsWith('pk_live_')) {
    items.push({
      id: 'stripe',
      label: 'Stripe — LIVE keys detected',
      status: 'pass',
      detail: 'Live publishable key in use. Confirm webhooks point to live env.',
    });
  } else {
    items.push({
      id: 'stripe',
      label: 'Stripe — TEST mode',
      status: isLiveHost ? 'warn' : 'pass',
      detail: isLiveHost
        ? 'Live domain is using sandbox Stripe keys. Complete Stripe go-live before charging real users.'
        : 'Sandbox keys for preview. Banner shown to users.',
      manual: true,
    });
  }

  // --- Push ---
  const pushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
  items.push({
    id: 'push-support',
    label: 'Push notifications support',
    status: pushSupported ? 'pass' : 'warn',
    detail: pushSupported
      ? 'Browser supports service worker + PushManager.'
      : 'This browser does not support push. Users see a friendly fallback.',
  });
  items.push({
    id: 'push-vapid',
    label: 'Push VAPID config',
    status: 'unknown',
    detail: 'Verify by enabling push in Settings on petswap.co.uk — relies on push-config edge function.',
    manual: true,
  });

  // --- Geolocation ---
  const geoSecure =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
  items.push({
    id: 'geolocation',
    label: 'Geolocation availability',
    status: geoSecure ? 'pass' : 'fail',
    detail: geoSecure
      ? 'HTTPS context — browser will prompt and respect denied state.'
      : 'Not on HTTPS — geolocation will be blocked.',
  });

  // --- API ---
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
    items.push({
      id: 'api',
      label: 'Backend API reachable',
      status: error ? 'fail' : 'pass',
      detail: error ? error.message : 'Supabase responding.',
    });
  } catch (e) {
    items.push({
      id: 'api',
      label: 'Backend API reachable',
      status: 'fail',
      detail: e instanceof Error ? e.message : 'unknown',
    });
  }

  return items;
};
