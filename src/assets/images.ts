// Pet photos
import lunaPhoto from './pets/luna.jpg';
import miloPhoto from './pets/milo.jpg';
import charliePhoto from './pets/charlie.jpg';
import bellaPhoto from './pets/bella.jpg';
import maxPhoto from './pets/max.jpg';
import cleoPhoto from './pets/cleo.jpg';
import simbaPhoto from './pets/simba.jpg';

/**
 * User avatars are intentionally empty.
 *
 * PetSwap is a trust-first community — we never render stock or AI-generated
 * faces. If a user hasn't uploaded a real photo, the UI shows a premium
 * initial-based placeholder (see `<UserAvatar />`).
 *
 * Real uploaded photos come from `profiles.avatar_url` via `useMyProfile` /
 * Supabase, not from this file.
 */
export const userAvatars: Record<string, string> = {};

export const petPhotos: Record<string, string> = {
  'p1': lunaPhoto,
  'p2': miloPhoto,
  'p3': charliePhoto,
  'p4': bellaPhoto,
  'p5': maxPhoto,
  'p6': cleoPhoto,
  'p7': simbaPhoto,
};

export function getUserAvatar(_userId: string): string | undefined {
  // Always undefined — placeholder rendering is handled by <UserAvatar />.
  return undefined;
}

export function getPetPhoto(petId: string): string | undefined {
  return petPhotos[petId];
}
