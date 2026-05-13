// Seed realistic UK pet owners as real Supabase auth users.
// Idempotent: re-running upserts profiles/pets without duplicating users.
// Public function (verify_jwt = false in config).
//
// IMPORTANT: is_demo is intentionally left at the default (false) so these
// profiles are visible to authenticated users via the existing RLS read
// policy. They are still identifiable by their `*.demo@petswap.app` email.
//
// Anchored around Salford / Manchester (≈53.4876, -2.2866) with a tight
// cluster within 1–5 miles, a wider ring within 10 miles, plus other UK
// cities for further-away results.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoPet {
  name: string;
  type: string;
  breed: string;
  size: string;
  age: number;
  temperament: string;
  good_with_children: boolean;
  good_with_pets: boolean;
  feeding_notes: string;
  walking_needs: string;
  special_instructions: string;
}

interface DemoUser {
  mock_id: string;
  email: string;
  password: string;
  first_name: string;
  area: string;
  postcode: string;
  latitude: number;
  longitude: number;
  bio: string;
  avatar_seed: number; // pravatar id 1..70
  household_type: string;
  has_children: boolean;
  has_pets: boolean;
  pet_experience: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_id_verified: boolean;
  average_rating: number;
  total_reviews: number;
  completed_swaps: number;
  response_rate: number;
  subscription_tier: string;
  trust_score: number;
  trust_tier: string;
  available_now: boolean;
  pets: DemoPet[];
}

// ---- Pet templates (re-used to keep file compact) -------------------------
const PETS: Record<string, DemoPet> = {
  luna_collie: { name: "Luna", type: "dog", breed: "Border Collie", size: "medium", age: 3, temperament: "Friendly & energetic", good_with_children: true, good_with_pets: true, feeding_notes: "Twice daily, grain-free kibble", walking_needs: "2 walks per day, 30 min each", special_instructions: "Loves fetch. Recall is excellent." },
  milo_cat: { name: "Milo", type: "cat", breed: "British Shorthair", size: "small", age: 5, temperament: "Calm & affectionate", good_with_children: true, good_with_pets: true, feeding_notes: "Wet food morning & evening", walking_needs: "Indoor only", special_instructions: "Loves chin scratches." },
  bella_lab: { name: "Bella", type: "dog", breed: "Labrador", size: "large", age: 4, temperament: "Sweet & gentle", good_with_children: true, good_with_pets: true, feeding_notes: "2 cups dry food x2", walking_needs: "60 min walk", special_instructions: "Loves the park." },
  rocky_terrier: { name: "Rocky", type: "dog", breed: "Jack Russell", size: "small", age: 6, temperament: "Playful & curious", good_with_children: true, good_with_pets: false, feeding_notes: "Small portions x3", walking_needs: "45 min", special_instructions: "Escape artist — secure gate needed." },
  daisy_cocker: { name: "Daisy", type: "dog", breed: "Cocker Spaniel", size: "medium", age: 2, temperament: "Loving & soft", good_with_children: true, good_with_pets: true, feeding_notes: "Grain-free x2", walking_needs: "60 min", special_instructions: "Ear care daily." },
  oscar_pug: { name: "Oscar", type: "dog", breed: "Pug", size: "small", age: 5, temperament: "Cuddly & lazy", good_with_children: true, good_with_pets: true, feeding_notes: "Measured kibble x2", walking_needs: "Short 20 min walks", special_instructions: "Heat sensitive." },
  poppy_cat: { name: "Poppy", type: "cat", breed: "Tabby", size: "small", age: 4, temperament: "Independent but loving", good_with_children: true, good_with_pets: false, feeding_notes: "Dry + wet split", walking_needs: "Indoor/garden", special_instructions: "Likes evening cuddles." },
  charlie_shih: { name: "Charlie", type: "dog", breed: "Shih Tzu", size: "small", age: 7, temperament: "Calm lap dog", good_with_children: true, good_with_pets: true, feeding_notes: "Senior food x2", walking_needs: "30 min", special_instructions: "Eye wipes daily." },
  ruby_dachs: { name: "Ruby", type: "dog", breed: "Dachshund", size: "small", age: 3, temperament: "Bold & affectionate", good_with_children: true, good_with_pets: true, feeding_notes: "x2 daily", walking_needs: "30-40 min", special_instructions: "No jumping off sofas." },
  finn_husky: { name: "Finn", type: "dog", breed: "Husky", size: "large", age: 4, temperament: "High energy & vocal", good_with_children: true, good_with_pets: true, feeding_notes: "Raw food x2", walking_needs: "90 min minimum", special_instructions: "Strong recall but lead-only near roads." },
  willow_cat: { name: "Willow", type: "cat", breed: "Maine Coon", size: "large", age: 6, temperament: "Gentle giant", good_with_children: true, good_with_pets: true, feeding_notes: "Premium wet food x2", walking_needs: "Indoor", special_instructions: "Brushing 3x/week." },
  buddy_golden: { name: "Buddy", type: "dog", breed: "Golden Retriever", size: "large", age: 5, temperament: "Everyone's friend", good_with_children: true, good_with_pets: true, feeding_notes: "3 cups x2", walking_needs: "60-90 min", special_instructions: "Loves swimming." },
  nala_cat: { name: "Nala", type: "cat", breed: "Bengal", size: "medium", age: 2, temperament: "Playful & smart", good_with_children: true, good_with_pets: false, feeding_notes: "High-protein wet food", walking_needs: "Indoor with puzzle toys", special_instructions: "Needs daily play." },
  teddy_frenchie: { name: "Teddy", type: "dog", breed: "French Bulldog", size: "small", age: 4, temperament: "Quirky & calm", good_with_children: true, good_with_pets: true, feeding_notes: "Low-allergen kibble", walking_needs: "20-30 min, avoid heat", special_instructions: "Skin folds need wiping." },
  simba_cat: { name: "Simba", type: "cat", breed: "Ginger Tabby", size: "medium", age: 3, temperament: "Confident & chatty", good_with_children: true, good_with_pets: true, feeding_notes: "Dry food + wet treat", walking_needs: "Indoor/outdoor", special_instructions: "Loves sunny windows." },
  ziggy_pood: { name: "Ziggy", type: "dog", breed: "Cockapoo", size: "small", age: 2, temperament: "Playful & cuddly", good_with_children: true, good_with_pets: true, feeding_notes: "Grain-free x2", walking_needs: "45 min", special_instructions: "Loves people, may jump up." },
  cleo_cat: { name: "Cleo", type: "cat", breed: "Siamese", size: "small", age: 5, temperament: "Vocal & loving", good_with_children: true, good_with_pets: true, feeding_notes: "Wet food x2", walking_needs: "Indoor", special_instructions: "Prefers warmth." },
  rex_staffy: { name: "Rex", type: "dog", breed: "Staffordshire Bull Terrier", size: "medium", age: 6, temperament: "Goofy & loyal", good_with_children: true, good_with_pets: true, feeding_notes: "x2 daily", walking_needs: "60 min", special_instructions: "Strong puller — harness only." },
};

// ---- Helper to keep entries compact ---------------------------------------
type MiniUser = {
  e: string; n: string; area: string; pc: string; lat: number; lng: number;
  bio: string; av: number; rating: number; reviews: number; swaps: number;
  rr: number; tier: string; trust: number; ttier: string; avail: boolean;
  ev: boolean; pv: boolean; iv: boolean; pets: DemoPet[];
  hh?: string; child?: boolean; xp?: string;
};

const make = (id: number, m: MiniUser): DemoUser => ({
  mock_id: String(id),
  email: m.e,
  password: "PetSwap-Demo-2026!",
  first_name: m.n,
  area: m.area,
  postcode: m.pc,
  latitude: m.lat,
  longitude: m.lng,
  bio: m.bio,
  avatar_seed: m.av,
  household_type: m.hh ?? "house_with_garden",
  has_children: m.child ?? false,
  has_pets: true,
  pet_experience: m.xp ?? "experienced",
  is_email_verified: m.ev,
  is_phone_verified: m.pv,
  is_id_verified: m.iv,
  average_rating: m.rating,
  total_reviews: m.reviews,
  completed_swaps: m.swaps,
  response_rate: m.rr,
  subscription_tier: m.tier,
  trust_score: m.trust,
  trust_tier: m.ttier,
  available_now: m.avail,
  pets: m.pets,
});

// Anchor: Salford / Manchester ~ 53.4876, -2.2866
// 1 deg lat ≈ 69 mi; 1 deg lng at 53°N ≈ 41.5 mi.
// Very-close ring (~1–5 mi) → small offsets ~ 0.01–0.06 deg.
// 10-mile ring → ~ 0.10–0.14 deg.

const DEMO_USERS: DemoUser[] = [
  // ============ TIGHT CLUSTER 1–5 MILES from anchor (5 users) ============
  make(1, { e: "amelia.demo@petswap.app", n: "Amelia", area: "Salford Quays, Salford", pc: "M50", lat: 53.4720, lng: -2.2920, bio: "Dog lover in Manchester 🐶 Work from home — happy to mind your pup midweek.", av: 1, rating: 4.9, reviews: 18, swaps: 24, rr: 97, tier: "premium", trust: 95, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.luna_collie, PETS.milo_cat] }),
  make(2, { e: "harry.demo@petswap.app", n: "Harry", area: "Eccles, Salford", pc: "M30", lat: 53.4830, lng: -2.3380, bio: "Two-dog dad. Long walks at Worsley Woods most evenings.", av: 12, rating: 4.8, reviews: 14, swaps: 19, rr: 95, tier: "free", trust: 88, ttier: "trusted", avail: true, ev: true, pv: true, iv: false, pets: [PETS.bella_lab, PETS.rocky_terrier] }),
  make(3, { e: "isla.demo@petswap.app", n: "Isla", area: "Pendleton, Salford", pc: "M6", lat: 53.4900, lng: -2.2960, bio: "Cat sitter with garden access. 3 happy resident cats.", av: 5, rating: 5.0, reviews: 22, swaps: 27, rr: 100, tier: "premium", trust: 96, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.poppy_cat, PETS.willow_cat] }),
  make(4, { e: "owen.demo@petswap.app", n: "Owen", area: "Stretford, Manchester", pc: "M32", lat: 53.4470, lng: -2.3090, bio: "Experienced with cats and small dogs. Available weekends.", av: 14, rating: 4.7, reviews: 11, swaps: 13, rr: 92, tier: "free", trust: 80, ttier: "good", avail: false, ev: true, pv: false, iv: false, pets: [PETS.charlie_shih] }),
  make(5, { e: "lily.demo@petswap.app", n: "Lily", area: "Old Trafford, Manchester", pc: "M16", lat: 53.4630, lng: -2.2860, bio: "Vet nurse 🐾 Calm home, perfect for nervous pets.", av: 9, rating: 5.0, reviews: 31, swaps: 38, rr: 100, tier: "premium", trust: 99, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.daisy_cocker, PETS.simba_cat] }),

  // ============ MID RING ~5–10 MILES (10 users) ============
  make(6, { e: "george.demo@petswap.app", n: "George", area: "Didsbury, Manchester", pc: "M20", lat: 53.4180, lng: -2.2300, bio: "Friendly dog walker, retired teacher. Loves spaniels.", av: 13, rating: 4.9, reviews: 17, swaps: 21, rr: 96, tier: "free", trust: 90, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.daisy_cocker] }),
  make(7, { e: "mia.demo@petswap.app", n: "Mia", area: "Chorlton, Manchester", pc: "M21", lat: 53.4420, lng: -2.2780, bio: "Work from home & cat-mum to two rescues. Available weekdays.", av: 16, rating: 4.8, reviews: 13, swaps: 16, rr: 94, tier: "premium", trust: 86, ttier: "trusted", avail: true, ev: true, pv: true, iv: false, pets: [PETS.cleo_cat, PETS.poppy_cat] }),
  make(8, { e: "noah.demo@petswap.app", n: "Noah", area: "Northern Quarter, Manchester", pc: "M4", lat: 53.4860, lng: -2.2350, bio: "City flat, big heart. Best with chilled cats.", av: 11, rating: 4.6, reviews: 9, swaps: 10, rr: 88, tier: "free", trust: 75, ttier: "good", avail: false, ev: true, pv: false, iv: false, pets: [PETS.milo_cat] }),
  make(9, { e: "ruby.demo@petswap.app", n: "Ruby", area: "Prestwich, Manchester", pc: "M25", lat: 53.5350, lng: -2.2840, bio: "Puppy raiser & former kennel asst. Big garden, two friendly dogs.", av: 19, rating: 4.9, reviews: 24, swaps: 30, rr: 98, tier: "premium", trust: 93, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.buddy_golden, PETS.ziggy_pood] }),
  make(10, { e: "leo.demo@petswap.app", n: "Leo", area: "Sale, Trafford", pc: "M33", lat: 53.4250, lng: -2.3220, bio: "Husky owner — high-energy walks welcome. Park nearby.", av: 33, rating: 4.7, reviews: 12, swaps: 15, rr: 90, tier: "free", trust: 82, ttier: "good", avail: true, ev: true, pv: true, iv: false, pets: [PETS.finn_husky] }),
  make(11, { e: "freya.demo@petswap.app", n: "Freya", area: "Altrincham, Trafford", pc: "WA14", lat: 53.3870, lng: -2.3550, bio: "Frenchie mum. Cosy home, lots of cuddles guaranteed.", av: 25, rating: 5.0, reviews: 19, swaps: 22, rr: 100, tier: "premium", trust: 94, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.teddy_frenchie] }),
  make(12, { e: "ethan.demo@petswap.app", n: "Ethan", area: "Levenshulme, Manchester", pc: "M19", lat: 53.4450, lng: -2.1860, bio: "Big-dog person. Staffy parent — loves all sizes.", av: 17, rating: 4.6, reviews: 8, swaps: 9, rr: 85, tier: "free", trust: 70, ttier: "good", avail: false, ev: true, pv: false, iv: false, pets: [PETS.rex_staffy] }),
  make(13, { e: "ava.demo@petswap.app", n: "Ava", area: "Whalley Range, Manchester", pc: "M16", lat: 53.4520, lng: -2.2680, bio: "Cat behaviourist 🐈 Slow intros, calm home.", av: 21, rating: 4.9, reviews: 26, swaps: 29, rr: 98, tier: "premium", trust: 92, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.nala_cat, PETS.simba_cat] }),
  make(14, { e: "jacob.demo@petswap.app", n: "Jacob", area: "Withington, Manchester", pc: "M20", lat: 53.4310, lng: -2.2330, bio: "Student vet — happy to help with meds & seniors.", av: 22, rating: 4.8, reviews: 15, swaps: 17, rr: 93, tier: "free", trust: 84, ttier: "good", avail: true, ev: true, pv: true, iv: false, pets: [PETS.charlie_shih] }),
  make(15, { e: "evie.demo@petswap.app", n: "Evie", area: "Monton, Salford", pc: "M30", lat: 53.4830, lng: -2.3530, bio: "Two pugs, one big garden. Gentle pace, perfect for seniors.", av: 26, rating: 5.0, reviews: 20, swaps: 25, rr: 100, tier: "premium", trust: 95, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.oscar_pug, PETS.teddy_frenchie] }),

  // ============ FURTHER MANCHESTER + LEEDS / BIRMINGHAM / LONDON ============
  make(16, { e: "henry.demo@petswap.app", n: "Henry", area: "Bury, Greater Manchester", pc: "BL9", lat: 53.5930, lng: -2.2980, bio: "Quiet rural-ish home, lots of paths for long walks.", av: 27, rating: 4.7, reviews: 10, swaps: 12, rr: 91, tier: "free", trust: 78, ttier: "good", avail: false, ev: true, pv: false, iv: false, pets: [PETS.bella_lab] }),
  make(17, { e: "grace.demo@petswap.app", n: "Grace", area: "Bolton, Greater Manchester", pc: "BL1", lat: 53.5780, lng: -2.4290, bio: "Lifelong dog person, two friendly retrievers.", av: 28, rating: 4.9, reviews: 16, swaps: 19, rr: 95, tier: "premium", trust: 88, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.buddy_golden] }),
  make(18, { e: "max.demo@petswap.app", n: "Max", area: "Stockport, Greater Manchester", pc: "SK1", lat: 53.4080, lng: -2.1490, bio: "Quiet flat — best with cats and small calm dogs.", av: 31, rating: 4.6, reviews: 7, swaps: 8, rr: 87, tier: "free", trust: 72, ttier: "good", avail: true, ev: true, pv: false, iv: false, pets: [PETS.milo_cat] }),
  make(19, { e: "chloe.demo@petswap.app", n: "Chloe", area: "Headingley, Leeds", pc: "LS6", lat: 53.8200, lng: -1.5800, bio: "Leeds-based dog walker. Available weekends in the Dales.", av: 32, rating: 4.9, reviews: 22, swaps: 26, rr: 97, tier: "premium", trust: 91, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.luna_collie] }),
  make(20, { e: "oliver.demo@petswap.app", n: "Oliver", area: "Roundhay, Leeds", pc: "LS8", lat: 53.8350, lng: -1.5050, bio: "Big garden by Roundhay Park. Two friendly cockers.", av: 34, rating: 5.0, reviews: 28, swaps: 32, rr: 100, tier: "premium", trust: 97, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.daisy_cocker, PETS.poppy_cat] }),
  make(21, { e: "mila.demo@petswap.app", n: "Mila", area: "Chapel Allerton, Leeds", pc: "LS7", lat: 53.8270, lng: -1.5360, bio: "Cat-only household. Quiet, calm, plenty of windowsills.", av: 35, rating: 4.8, reviews: 14, swaps: 15, rr: 94, tier: "free", trust: 83, ttier: "good", avail: false, ev: true, pv: true, iv: false, pets: [PETS.cleo_cat] }),
  make(22, { e: "liam.demo@petswap.app", n: "Liam", area: "Moseley, Birmingham", pc: "B13", lat: 52.4480, lng: -1.8830, bio: "Birmingham-based dog dad. Walks twice daily, all weather.", av: 36, rating: 4.7, reviews: 11, swaps: 14, rr: 89, tier: "free", trust: 79, ttier: "good", avail: true, ev: true, pv: true, iv: false, pets: [PETS.rocky_terrier] }),
  make(23, { e: "nora.demo@petswap.app", n: "Nora", area: "Harborne, Birmingham", pc: "B17", lat: 52.4570, lng: -1.9610, bio: "Two friendly Persian cats and a love for community-led care.", av: 37, rating: 5.0, reviews: 21, swaps: 28, rr: 100, tier: "premium", trust: 99, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.willow_cat, PETS.nala_cat] }),
  make(24, { e: "elijah.demo@petswap.app", n: "Elijah", area: "Edgbaston, Birmingham", pc: "B15", lat: 52.4640, lng: -1.9290, bio: "Calm flat near the parks. Best with senior dogs.", av: 38, rating: 4.6, reviews: 9, swaps: 10, rr: 86, tier: "free", trust: 74, ttier: "good", avail: false, ev: true, pv: false, iv: false, pets: [PETS.charlie_shih] }),
  make(25, { e: "sophia.demo@petswap.app", n: "Sophia", area: "Camden, London", pc: "NW1", lat: 51.5390, lng: -0.1430, bio: "Camden-based dog lover. Work from home, weekends free.", av: 41, rating: 4.9, reviews: 18, swaps: 24, rr: 97, tier: "premium", trust: 95, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.luna_collie, PETS.milo_cat] }),
  make(26, { e: "james.demo@petswap.app", n: "James", area: "Islington, London", pc: "N1", lat: 51.5380, lng: -0.0990, bio: "Two cats, one quiet flat. Calm pace.", av: 42, rating: 4.8, reviews: 15, swaps: 18, rr: 94, tier: "free", trust: 86, ttier: "trusted", avail: true, ev: true, pv: true, iv: false, pets: [PETS.simba_cat, PETS.cleo_cat] }),
  make(27, { e: "ella.demo@petswap.app", n: "Ella", area: "Hackney, London", pc: "E8", lat: 51.5450, lng: -0.0560, bio: "Frenchie + park life. Lots of walks in Victoria Park.", av: 43, rating: 4.9, reviews: 20, swaps: 22, rr: 98, tier: "premium", trust: 92, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.teddy_frenchie] }),
  make(28, { e: "thomas.demo@petswap.app", n: "Thomas", area: "Shoreditch, London", pc: "E1", lat: 51.5230, lng: -0.0750, bio: "City dweller, dog walker on rest days.", av: 44, rating: 4.7, reviews: 12, swaps: 14, rr: 90, tier: "free", trust: 80, ttier: "good", avail: false, ev: true, pv: true, iv: false, pets: [PETS.rocky_terrier] }),
  make(29, { e: "rose.demo@petswap.app", n: "Rose", area: "Brixton, London", pc: "SW2", lat: 51.4620, lng: -0.1150, bio: "South London cat-mum, calm home, two rescues.", av: 45, rating: 4.8, reviews: 16, swaps: 19, rr: 95, tier: "premium", trust: 87, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.poppy_cat, PETS.nala_cat] }),
  make(30, { e: "william.demo@petswap.app", n: "William", area: "Greenwich, London", pc: "SE10", lat: 51.4820, lng: -0.0080, bio: "Greenwich Park is our daily route. Big-dog friendly.", av: 46, rating: 4.9, reviews: 23, swaps: 27, rr: 96, tier: "premium", trust: 93, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.buddy_golden] }),
  make(31, { e: "lucas.demo@petswap.app", n: "Lucas", area: "Clapham, London", pc: "SW4", lat: 51.4620, lng: -0.1380, bio: "Common-side flat. Daily long walks.", av: 47, rating: 4.7, reviews: 13, swaps: 15, rr: 91, tier: "free", trust: 81, ttier: "good", avail: true, ev: true, pv: false, iv: false, pets: [PETS.bella_lab] }),
  make(32, { e: "zara.demo@petswap.app", n: "Zara", area: "Notting Hill, London", pc: "W11", lat: 51.5160, lng: -0.2050, bio: "Cat behaviourist. Slow intros, sensitive cats welcome.", av: 48, rating: 5.0, reviews: 26, swaps: 30, rr: 100, tier: "premium", trust: 98, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.willow_cat] }),
  make(33, { e: "charlie.demo@petswap.app", n: "Charlie", area: "Didsbury Village, Manchester", pc: "M20", lat: 53.4150, lng: -2.2380, bio: "Cockapoo dad, work-from-home, very flexible.", av: 49, rating: 4.8, reviews: 17, swaps: 20, rr: 95, tier: "free", trust: 87, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.ziggy_pood] }),
  make(34, { e: "imogen.demo@petswap.app", n: "Imogen", area: "Heaton Moor, Stockport", pc: "SK4", lat: 53.4290, lng: -2.1840, bio: "Two dachshunds, calm home. Available evenings.", av: 50, rating: 4.9, reviews: 19, swaps: 22, rr: 96, tier: "premium", trust: 90, ttier: "trusted", avail: true, ev: true, pv: true, iv: true, pets: [PETS.ruby_dachs] }),
  make(35, { e: "samir.demo@petswap.app", n: "Samir", area: "Rusholme, Manchester", pc: "M14", lat: 53.4540, lng: -2.2270, bio: "Quiet flat near uni. Best with calm cats.", av: 51, rating: 4.6, reviews: 8, swaps: 9, rr: 86, tier: "free", trust: 73, ttier: "good", avail: false, ev: true, pv: false, iv: false, pets: [PETS.milo_cat] }),
];

interface SeededUser {
  mock_id: string;
  user_id: string;
  email: string;
  first_name: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Require an authenticated admin caller.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await callerClient.auth.getUser(token);
    const caller = userData?.user;
    if (!caller) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seeded: SeededUser[] = [];

    // 1) Build a single map of existing demo users by email (avoids paging
    //    through listUsers per row).
    const existingByEmail = new Map<string, string>();
    {
      let page = 1;
      // We only ever expect <500 demo users; cap at 5 pages for safety.
      while (page <= 5) {
        const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (!list || list.users.length === 0) break;
        for (const u of list.users) {
          if (u.email) existingByEmail.set(u.email, u.id);
        }
        if (list.users.length < 200) break;
        page += 1;
      }
    }

    for (const u of DEMO_USERS) {
      let userId: string | null = existingByEmail.get(u.email) ?? null;

      if (!userId) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { first_name: u.first_name, demo: true },
        });
        if (created?.user) {
          userId = created.user.id;
        } else if (createErr) {
          console.error("createUser failed", u.email, createErr.message);
          continue;
        }
      }
      if (!userId) continue;

      const avatar_url = `https://i.pravatar.cc/300?img=${u.avatar_seed}`;

      // 2) Upsert profile. is_demo intentionally NOT set — defaults to false
      //    so RLS lets authenticated users see them.
      const { error: profErr } = await admin.from("profiles").upsert(
        {
          id: userId,
          email: u.email,
          first_name: u.first_name,
          area: u.area,
          postcode: u.postcode,
          latitude: u.latitude,
          longitude: u.longitude,
          bio: u.bio,
          avatar_url,
          household_type: u.household_type,
          has_children: u.has_children,
          has_pets: u.has_pets,
          pet_experience: u.pet_experience,
          onboarding_completed: true,
          is_email_verified: u.is_email_verified,
          is_phone_verified: u.is_phone_verified,
          is_id_verified: u.is_id_verified,
          average_rating: u.average_rating,
          total_reviews: u.total_reviews,
          completed_swaps: u.completed_swaps,
          response_rate: u.response_rate,
          subscription_tier: u.subscription_tier,
          trust_score: u.trust_score,
          trust_tier: u.trust_tier,
          available_now: u.available_now,
          profile_completion_pct: 100,
        },
        { onConflict: "id" },
      );
      if (profErr) console.error("profile upsert failed", u.email, profErr.message);

      // 3) Insert pets if missing for this owner (idempotent by name).
      const { data: existingPets } = await admin
        .from("pets")
        .select("id, name")
        .eq("owner_id", userId);
      const existingNames = new Set((existingPets ?? []).map((p) => p.name));
      for (const pet of u.pets) {
        if (existingNames.has(pet.name)) continue;
        await admin.from("pets").insert({
          owner_id: userId,
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          size: pet.size,
          age: pet.age,
          temperament: pet.temperament,
          good_with_children: pet.good_with_children,
          good_with_pets: pet.good_with_pets,
          feeding_notes: pet.feeding_notes,
          walking_needs: pet.walking_needs,
          special_instructions: pet.special_instructions,
        });
      }

      seeded.push({
        mock_id: u.mock_id,
        user_id: userId,
        email: u.email,
        first_name: u.first_name,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, count: seeded.length, users: seeded }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("seed-demo-users fatal", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
