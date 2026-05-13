# PetSwap Premium Retention System

This is a large, multi-area feature touching the home screen, paywall/cancel flow, push notifications and several new components. To keep things shippable and avoid breaking what already works, I'll build it in 3 focused phases. You approve, then I implement Phase 1 end-to-end before moving on.

---

## Phase 1 — Home Dashboard + Activation + Cancel Defense (highest retention impact)

The "must-haves" that move the cancellation/retention needle most.

**1. Premium Smart Dashboard (HomePage, premium users only)**
A new `PremiumDashboardCard` shown at the top of `/home` for active subscribers:
- Status row: "Membership active" + next billing date + "Cancel anytime" pill
- Profile completion progress bar with copy: "You're 80% more likely to get a match"
- CTA: "Complete your profile" → `/edit-profile`

**2. Activation Checklist (first 24h after subscribing)**
New `ActivationChecklist` component, shown on `/home` when `subscription.created_at` < 24h:
- Upload pet photos · Add availability · Set location · Write bio
- Live progress bar driven from existing `profiles` + `pets` data
- Reward line: "Complete this to unlock faster matches"
- Auto-hides when 100% or after 24h

**3. Cancel Defense Modal**
New `CancelDefenseSheet` opened from `Subscription.tsx` cancel button BEFORE we hit Stripe portal:
- Headline: "Before you go…"
- Three options: Pause for 1 month · Keep matches saved · Reactivate anytime
- Trigger line: "Most users cancel right before they need it again"
- Confirm-cancel as a quiet secondary action
- "Pause" sets a flag in `subscriptions.metadata` (DB migration: add `paused_until` column) and skips Stripe cancellation

---

## Phase 2 — Daily Value Loop + Smart Suggestions + Social Proof + Trust

The "habit-building" layer.

**4. Daily Activity Feed** — `DailyActivityCard` on `/home`: new pets near you, new care requests, suggested matches. Refreshes once per day (cached by date key).

**5. Recommended For You** — `RecommendedRail` powered by existing `useNearbyHelpers` + pet-type match. No AI call needed; ranks by distance, pet match, recent activity.

**6. Trust & Safety Boost** — `TrustCommunityCard`: verified users count, total reviews, "Trusted community" message. Pulls aggregates from `profiles` and `reviews`.

**7. Social Proof Bar** — Reuse existing `SocialProofBar` enhanced with: "X pet swaps completed this month" (live count from `chat_bookings` where status=completed).

**8. Re-engagement Banner** — `ReengagementBanner` shown on `/home` when `last_active_at` > 2 days: "We found new matches for you" → `/discover`.

**9. Premium Value Reminder** — `PremiumValueToast` shown every 5th session via localStorage counter: "You're saving vs traditional pet sitters".

---

## Phase 3 — Push Notifications + Success Loop + Empty States

**10. Empty State Intelligence** — Update `MarketplaceEmptyState`: "Let's find your first match" + "High demand in your area this week" + CTA to browse.

**11. Success Feedback Loop** — After first completed swap, show `FirstSwapCompletedToast` (already exists) with new CTA "Book your next one" → `/discover`.

**12. Push Notifications** — Three new templates wired into existing `pending_push_jobs` system:
- `new-match-nearby` (triggered when new helper appears in radius)
- `profile-viewed` (triggered from `profile_views` insert)
- `weekend-high-demand` (cron, Friday morning, premium users)

---

## Technical notes (for reference)

- All new components use existing design tokens (`#0B8F6A`, soft cards, rounded-2xl, `bg-card`, `text-muted-foreground`).
- Premium gating via existing `useSubscription()` hook.
- One DB migration in Phase 1: add `paused_until timestamptz` to `subscriptions`.
- One DB migration in Phase 3: add `weekend_demand` push template config row.
- No new external services, no new secrets, no AI calls.
- Mobile-first; everything renders cleanly at 440px viewport.

---

## What I need from you

Reply **"go phase 1"** and I'll ship Phase 1 in this same session. After it lands and you've tried it, say "phase 2" / "phase 3" to continue. Or tell me to reorder/drop sections.
