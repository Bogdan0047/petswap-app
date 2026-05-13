/**
 * Maps mock user IDs (used across the app's static demo data) to the
 * real Supabase auth UUIDs of the seeded demo users. This lets the
 * existing UI keep using "1", "2", "3" for navigation while the chat
 * (and any other live feature) talks to real backend rows.
 */

export const MOCK_TO_REAL_USER_ID: Record<string, string> = {
  "1": "05fc269c-6d31-495b-89af-bc3a324cdaf4", // Sarah
  "2": "f5e6b3cc-ad4f-4aca-ae5c-8e01f29b86e4", // James
  "3": "6ab3187b-0cc3-4ea6-a3e7-066c943f94c6", // Emma
  "4": "af2f3e3c-944e-44ce-80e5-564e956ff7dc", // Oliver
  "5": "fc3f4a26-9bac-41fb-a17c-e2a5604a5721", // Priya
  "6": "4e26c69a-39c3-46dc-8601-929985c35b01", // Amelia
  "7": "be8edd8e-c5e9-4304-9de4-c790b459175b", // Tom
  "8": "8ae8971f-5a03-43d4-aacc-29e5fcf0fafc", // Noor
  "9": "1f691f7c-b726-4386-9a42-0cd373e3dcda", // Ethan
  "10": "c1e88a9c-962a-4777-8383-0bbb95216b2f", // Sofia
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve a mock id (or pass-through real UUID) to the real Supabase user id. */
export const resolveRealUserId = (id: string | null | undefined): string | null => {
  if (!id) return null;
  if (UUID_RE.test(id)) return id;
  return MOCK_TO_REAL_USER_ID[id] ?? null;
};

export const isUuid = (v: string | null | undefined): v is string =>
  !!v && UUID_RE.test(v);
