import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MyProfileRow {
  id: string;
  first_name: string | null;
  email: string | null;
  area: string | null;
  postcode: string | null;
  bio: string | null;
  avatar_url: string | null;
  household_type: string | null;
  has_children: boolean;
  has_pets: boolean;
  pet_experience: string | null;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_id_verified: boolean;
  is_location_verified: boolean;
  is_pet_owner_verified: boolean;
  selfie_with_pet_url: string | null;
  latitude: number | null;
  longitude: number | null;
  average_rating: number;
  total_reviews: number;
  completed_swaps: number;
  response_rate: number;
  subscription_tier: string;
  cancellations_count: number;
}

export interface MyPetRow {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  size: string | null;
  age: number | null;
  temperament: string | null;
}

export interface MyReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  created_at: string;
  reviewer_id: string;
  reviewer_name: string | null;
  reviewer_avatar: string | null;
}

export const useMyProfile = (userId: string | undefined | null) => {
  const [profile, setProfile] = useState<MyProfileRow | null>(null);
  const [pets, setPets] = useState<MyPetRow[]>([]);
  const [reviews, setReviews] = useState<MyReviewRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) { setProfile(null); setPets([]); setReviews([]); return; }
    setLoading(true);
    const [p, pt, rv] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('pets').select('id,name,type,breed,size,age,temperament').eq('owner_id', userId).order('created_at', { ascending: true }),
      supabase.from('reviews').select('id,rating,comment,tags,created_at,reviewer_id').eq('reviewee_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);

    if (p.data) setProfile(p.data as MyProfileRow);
    setPets((pt.data ?? []) as MyPetRow[]);

    const rawReviews = (rv.data ?? []) as Array<{ id: string; rating: number; comment: string | null; tags: string[] | null; created_at: string; reviewer_id: string }>;
    const reviewerIds = Array.from(new Set(rawReviews.map(r => r.reviewer_id)));
    let nameMap: Record<string, { name: string | null; avatar: string | null }> = {};
    if (reviewerIds.length) {
      const { data: rps } = await supabase.from('profiles').select('id,first_name,avatar_url').in('id', reviewerIds);
      nameMap = Object.fromEntries((rps ?? []).map((r) => [r.id, { name: r.first_name, avatar: r.avatar_url }]));
    }
    setReviews(rawReviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      tags: r.tags ?? [],
      created_at: r.created_at,
      reviewer_id: r.reviewer_id,
      reviewer_name: nameMap[r.reviewer_id]?.name ?? null,
      reviewer_avatar: nameMap[r.reviewer_id]?.avatar ?? null,
    })));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) { setProfile(null); setPets([]); setReviews([]); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const [p, pt, rv] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('pets').select('id,name,type,breed,size,age,temperament').eq('owner_id', userId).order('created_at', { ascending: true }),
        supabase.from('reviews').select('id,rating,comment,tags,created_at,reviewer_id').eq('reviewee_id', userId).order('created_at', { ascending: false }).limit(20),
      ]);
      if (cancelled) return;

      if (p.data) setProfile(p.data as MyProfileRow);
      setPets((pt.data ?? []) as MyPetRow[]);

      const rawReviews = (rv.data ?? []) as Array<{ id: string; rating: number; comment: string | null; tags: string[] | null; created_at: string; reviewer_id: string }>;
      const reviewerIds = Array.from(new Set(rawReviews.map(r => r.reviewer_id)));
      let nameMap: Record<string, { name: string | null; avatar: string | null }> = {};
      if (reviewerIds.length) {
        const { data: rps } = await supabase.from('profiles').select('id,first_name,avatar_url').in('id', reviewerIds);
        nameMap = Object.fromEntries((rps ?? []).map((r) => [r.id, { name: r.first_name, avatar: r.avatar_url }]));
      }
      if (cancelled) return;
      setReviews(rawReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        tags: r.tags ?? [],
        created_at: r.created_at,
        reviewer_id: r.reviewer_id,
        reviewer_name: nameMap[r.reviewer_id]?.name ?? null,
        reviewer_avatar: nameMap[r.reviewer_id]?.avatar ?? null,
      })));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  return { profile, pets, reviews, loading, reload, setProfile };
};
