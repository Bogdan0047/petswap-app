import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { useAuth } from '@/lib/auth';

/**
 * /invite/:code — captures a referral code into localStorage and bounces the
 * visitor onward. Signed-out visitors land on /auth (signup); signed-in users
 * already have an account, so we just send them home (the code stays in
 * localStorage but won't be redeemable for them).
 *
 * Storage keys here intentionally mirror `captureReferralFromUrl` in
 * src/lib/referrals.ts so a single redeem call clears either entry.
 */
export default function InviteLanding() {
  const { code } = useParams<{ code: string }>();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!code) return;
    try {
      localStorage.setItem('petswap.referral', code.toUpperCase());
    } catch {
      /* ignore — localStorage may be blocked */
    }
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Gift size={22} className="text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Opening invite…</p>
        </div>
      </div>
    );
  }

  // Signed in → home. Signed out → auth (signup tab).
  return <Navigate to={session ? '/home' : '/auth?mode=signup'} replace />;
}
