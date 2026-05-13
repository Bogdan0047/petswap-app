import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useMyProfile, type MyProfileRow } from '@/hooks/useMyProfile';
import { haptic } from '@/lib/haptic';

interface Props {
  userId: string | undefined | null;
}

const completionFromProfile = (p: MyProfileRow | null): number => {
  if (!p) return 0;
  const checks = [
    !!p.first_name,
    !!p.bio && p.bio.length > 20,
    !!p.avatar_url,
    !!p.area || !!p.postcode,
    p.is_email_verified,
    p.is_location_verified || (p.latitude != null && p.longitude != null),
    p.is_pet_owner_verified || !!p.selfie_with_pet_url,
    !!p.household_type,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
};

const fmtDate = (iso: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
};

export default function PremiumDashboardCard({ userId }: Props) {
  const navigate = useNavigate();
  const { isActive, subscription } = useSubscription();
  const { profile } = useMyProfile(userId);

  if (!isActive) return null;

  const completion = completionFromProfile(profile);
  const nextBilling = fmtDate(subscription?.current_period_end ?? null);

  return (
    <div className="px-6 mt-4">
      <div className="card-elevated p-5 bg-white">
        {/* Status row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[15px] leading-tight text-foreground">
                Your membership is active
              </p>
              {nextBilling && (
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Next billing · {nextBilling}
                </p>
              )}
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold whitespace-nowrap"
            style={{
              background: '#F0FAF6',
              color: '#0B8F6A',
              border: '1px solid #CFEFE2',
              padding: '4px 9px',
              borderRadius: 999,
            }}
          >
            <ShieldCheck size={10} />
            Cancel anytime
          </span>
        </div>

        {/* Progress */}
        {completion < 100 && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-[13px] font-semibold text-foreground">Profile completion</p>
              <p className="text-[13px] font-bold tabular-nums text-foreground">{completion}%</p>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="text-[12px] text-muted-foreground mt-2 leading-snug">
              You're 80% more likely to get a match if completed.
            </p>
            <button
              onClick={() => { haptic('light'); navigate('/edit-profile'); }}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold tap-feedback"
            >
              Complete your profile
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
