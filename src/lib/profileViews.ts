import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget profile-view tracking.
 *
 * Skips if the viewer is the same as the viewed user. De-duplicates per
 * browser session per (viewer, viewed) pair so a user re-opening the same
 * profile in one session only counts once — keeps the social-proof signal
 * meaningful.
 *
 * Never throws.
 */
export async function recordProfileView(viewedUserId: string): Promise<void> {
  try {
    if (!viewedUserId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === viewedUserId) return;

    const key = `petswap.profile_view.${viewedUserId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    await supabase.from('profile_views').insert({
      viewed_user_id: viewedUserId,
      viewer_user_id: user.id,
    });
  } catch (err) {
    console.warn('[profile_views] insert failed', err);
  }
}

/** Today's view count for the calling user. Returns 0 on failure. */
export async function fetchMyProfileViewsToday(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_my_profile_views_today');
    if (error || typeof data !== 'number') return 0;
    return data;
  } catch {
    return 0;
  }
}
