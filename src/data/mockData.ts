export interface User {
  id: string;
  firstName: string;
  email: string;
  phone?: string;
  area: string;
  postcode: string;
  bio: string;
  householdType: 'flat' | 'house' | 'house_with_garden' | 'farm';
  hasChildren: boolean;
  hasPets: boolean;
  petExperience: 'none' | 'some' | 'experienced' | 'professional';
  avatarUrl: string;
  avatarEmoji: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdVerified: boolean;
  /** Soft verifications — selfie-with-pet upload and GPS-confirmed location. */
  isPetOwnerVerified?: boolean;
  isLocationVerified?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  reliabilityScore: number;
  averageRating: number;
  totalReviews: number;
  completedSwaps: number;
  cancellationsCount: number;
  responseRate: number;
  credits: number;
  subscriptionTier: 'free' | 'premium';
  role: 'owner' | 'helper' | 'both';
  availability: {
    daysAvailable: string[];
    daysNeeding: string[];
    noticePeriod: 'same_day' | '1_day' | '2_days' | '1_week';
    scheduleType: 'flexible' | 'fixed';
  };
  distance: string;
  lastActive: string;
  createdAt: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'fish' | 'other';
  breed: string;
  size: 'small' | 'medium' | 'large';
  age: string;
  temperament: string;
  goodWithChildren: boolean;
  goodWithPets: boolean;
  feedingNotes: string;
  medicationNotes: string;
  walkingNeeds: string;
  specialInstructions: string;
  avatarEmoji: string;
  photos: string[];
  createdAt: string;
}

export interface CareRequest {
  id: string;
  creatorId: string;
  petId: string;
  careType: 'day_care' | 'evening_care' | 'overnight' | 'walk_checkin' | 'feeding_visit' | 'weekend_help';
  startAt: string;
  endAt: string;
  notes: string;
  creditsOffered: number;
  flexibleTiming: boolean;
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Connection {
  id: string;
  requesterId: string;
  recipientId: string;
  requestMessage: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
  read: boolean;
}

export interface Review {
  id: string;
  swapId: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number;
  reviewText: string;
  tags: string[];
  createdAt: string;
}

export interface CreditEntry {
  id: string;
  userId: string;
  amount: number;
  type: 'earned' | 'spent' | 'pending' | 'refunded';
  description: string;
  relatedSwapId?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'connection_request' | 'request_accepted' | 'new_message' | 'care_reminder' | 'credits_earned' | 'review_received' | 'nearby_request' | 'referral_bonus';
  title: string;
  body: string;
  readStatus: boolean;
  createdAt: string;
}

export const careTypeLabels: Record<CareRequest['careType'], string> = {
  day_care: 'Day care',
  evening_care: 'Evening care',
  overnight: 'Overnight care',
  walk_checkin: 'Walk / check-in',
  feeding_visit: 'Feeding visit',
  weekend_help: 'Weekend help',
};

export const careTypeCredits: Record<CareRequest['careType'], number> = {
  feeding_visit: 1,
  walk_checkin: 1,
  day_care: 3,
  evening_care: 2,
  overnight: 4,
  weekend_help: 3,
};

export const mockUsers: User[] = [
  {
    id: '1',
    firstName: 'Sarah',
    email: 'sarah@example.com',
    phone: '+447700900001',
    area: 'Camden',
    postcode: 'NW1',
    bio: 'Dog lover and experienced pet sitter. I work from home so happy to help during weekdays.',
    householdType: 'house_with_garden',
    hasChildren: false,
    hasPets: true,
    petExperience: 'experienced',
    avatarUrl: '',
    avatarEmoji: '👩‍🦰',
    isEmailVerified: true,
    isPhoneVerified: true,
    isIdVerified: true,
    emergencyContactName: 'Tom Mitchell',
    emergencyContactPhone: '+447700900099',
    reliabilityScore: 98,
    averageRating: 4.9,
    totalReviews: 18,
    completedSwaps: 24,
    cancellationsCount: 0,
    responseRate: 97,
    credits: 12,
    subscriptionTier: 'premium',
    role: 'both',
    availability: { daysAvailable: ['Mon', 'Wed', 'Fri', 'Sat'], daysNeeding: ['Tue', 'Sun'], noticePeriod: '1_day', scheduleType: 'flexible' },
    distance: '0.8 km',
    lastActive: '2 min ago',
    createdAt: '2025-08-15',
  },
  {
    id: '2',
    firstName: 'James',
    email: 'james@example.com',
    area: 'Islington',
    postcode: 'N1',
    bio: 'Proud owner of Charlie, a big lovable Labrador. Looking for help with walks on weekdays.',
    householdType: 'flat',
    hasChildren: true,
    hasPets: true,
    petExperience: 'some',
    avatarUrl: '',
    avatarEmoji: '👨',
    isEmailVerified: true,
    isPhoneVerified: false,
    isIdVerified: false,
    reliabilityScore: 92,
    averageRating: 4.7,
    totalReviews: 11,
    completedSwaps: 15,
    cancellationsCount: 1,
    responseRate: 89,
    credits: 8,
    subscriptionTier: 'free',
    role: 'owner',
    availability: { daysAvailable: ['Sat', 'Sun'], daysNeeding: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], noticePeriod: '2_days', scheduleType: 'fixed' },
    distance: '1.2 km',
    lastActive: '15 min ago',
    createdAt: '2025-09-20',
  },
  {
    id: '3',
    firstName: 'Emma',
    email: 'emma@example.com',
    phone: '+447700900003',
    area: 'Hackney',
    postcode: 'E8',
    bio: 'Vet nurse by day, cat lover always. Happy to help with any feline friends nearby.',
    householdType: 'house',
    hasChildren: false,
    hasPets: true,
    petExperience: 'professional',
    avatarUrl: '',
    avatarEmoji: '👩',
    isEmailVerified: true,
    isPhoneVerified: true,
    isIdVerified: true,
    emergencyContactName: 'Dr. Wilson',
    emergencyContactPhone: '+447700900098',
    reliabilityScore: 97,
    averageRating: 4.8,
    totalReviews: 24,
    completedSwaps: 31,
    cancellationsCount: 0,
    responseRate: 99,
    credits: 20,
    subscriptionTier: 'premium',
    role: 'helper',
    availability: { daysAvailable: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], daysNeeding: [], noticePeriod: '1_day', scheduleType: 'flexible' },
    distance: '2.1 km',
    lastActive: '1 hr ago',
    createdAt: '2025-07-10',
  },
  {
    id: '4',
    firstName: 'Oliver',
    email: 'oliver@example.com',
    area: 'Shoreditch',
    postcode: 'E1',
    bio: 'Young professional with a small rescue dog called Max. Happy to trade care on weekends.',
    householdType: 'flat',
    hasChildren: false,
    hasPets: true,
    petExperience: 'some',
    avatarUrl: '',
    avatarEmoji: '👨‍🦱',
    isEmailVerified: true,
    isPhoneVerified: true,
    isIdVerified: false,
    reliabilityScore: 90,
    averageRating: 4.5,
    totalReviews: 7,
    completedSwaps: 9,
    cancellationsCount: 2,
    responseRate: 82,
    credits: 5,
    subscriptionTier: 'free',
    role: 'both',
    availability: { daysAvailable: ['Sat', 'Sun'], daysNeeding: ['Sat', 'Sun'], noticePeriod: '2_days', scheduleType: 'flexible' },
    distance: '3.0 km',
    lastActive: '3 hrs ago',
    createdAt: '2025-11-01',
  },
  {
    id: '5',
    firstName: 'Priya',
    email: 'priya@example.com',
    phone: '+447700900005',
    area: 'Brixton',
    postcode: 'SW9',
    bio: "Mum of two kids and two cats. We'd love to help other pet families in the neighbourhood.",
    householdType: 'house_with_garden',
    hasChildren: true,
    hasPets: true,
    petExperience: 'experienced',
    avatarUrl: '',
    avatarEmoji: '👩‍🦳',
    isEmailVerified: true,
    isPhoneVerified: true,
    isIdVerified: true,
    emergencyContactName: 'Raj Patel',
    emergencyContactPhone: '+447700900097',
    reliabilityScore: 95,
    averageRating: 4.9,
    totalReviews: 15,
    completedSwaps: 19,
    cancellationsCount: 0,
    responseRate: 94,
    credits: 14,
    subscriptionTier: 'premium',
    role: 'both',
    availability: { daysAvailable: ['Mon', 'Wed', 'Fri'], daysNeeding: ['Sat'], noticePeriod: '1_week', scheduleType: 'fixed' },
    distance: '4.2 km',
    lastActive: '30 min ago',
    createdAt: '2025-10-05',
  },
];

export const mockPets: Pet[] = [
  {
    id: 'p1', ownerId: '1', name: 'Luna', type: 'dog', breed: 'Border Collie', size: 'medium',
    age: '3 years', temperament: 'Friendly & energetic', goodWithChildren: true, goodWithPets: true,
    feedingNotes: 'Twice daily, grain-free kibble', medicationNotes: 'None', walkingNeeds: '2 walks per day, 30 min each',
    specialInstructions: 'Loves fetch in the park. Recall is good.', avatarEmoji: '🐕', photos: [], createdAt: '2025-08-15',
  },
  {
    id: 'p2', ownerId: '1', name: 'Milo', type: 'cat', breed: 'British Shorthair', size: 'small',
    age: '5 years', temperament: 'Calm & independent', goodWithChildren: true, goodWithPets: false,
    feedingNotes: 'Wet food morning, dry food evening', medicationNotes: 'Joint supplement in food', walkingNeeds: 'Indoor cat',
    specialInstructions: 'Shy with new people initially', avatarEmoji: '🐈', photos: [], createdAt: '2025-08-15',
  },
  {
    id: 'p3', ownerId: '2', name: 'Charlie', type: 'dog', breed: 'Labrador Retriever', size: 'large',
    age: '4 years', temperament: 'Playful but gentle', goodWithChildren: true, goodWithPets: true,
    feedingNotes: 'Three times daily, portion control important', medicationNotes: 'None', walkingNeeds: '1 hr daily minimum',
    specialInstructions: 'Pulls on lead sometimes. Use harness.', avatarEmoji: '🐕', photos: [], createdAt: '2025-09-20',
  },
  {
    id: 'p4', ownerId: '3', name: 'Bella', type: 'cat', breed: 'Ragdoll', size: 'medium',
    age: '2 years', temperament: 'Shy at first, then very affectionate', goodWithChildren: false, goodWithPets: true,
    feedingNotes: 'Premium wet food twice daily', medicationNotes: 'None', walkingNeeds: 'Indoor cat with catio access',
    specialInstructions: 'Likes quiet environments. Gentle handling.', avatarEmoji: '🐈', photos: [], createdAt: '2025-07-10',
  },
  {
    id: 'p5', ownerId: '4', name: 'Max', type: 'dog', breed: 'Jack Russell Terrier', size: 'small',
    age: '2 years', temperament: 'Very social & energetic', goodWithChildren: true, goodWithPets: true,
    feedingNotes: 'Twice daily. No chicken — allergy.', medicationNotes: 'Antihistamine during pollen season', walkingNeeds: '2-3 short walks daily',
    specialInstructions: 'Gets along with other dogs. Loves squeaky toys.', avatarEmoji: '🐕', photos: [], createdAt: '2025-11-01',
  },
  {
    id: 'p6', ownerId: '5', name: 'Cleo', type: 'cat', breed: 'Bengal', size: 'medium',
    age: '1 year', temperament: 'Curious & playful', goodWithChildren: true, goodWithPets: true,
    feedingNotes: 'Raw diet, pre-portioned in fridge', medicationNotes: 'None', walkingNeeds: 'Indoor with supervised garden',
    specialInstructions: 'Very vocal. Needs interactive play time.', avatarEmoji: '🐈', photos: [], createdAt: '2025-10-05',
  },
  {
    id: 'p7', ownerId: '5', name: 'Simba', type: 'cat', breed: 'Ginger tabby', size: 'large',
    age: '6 years', temperament: 'Relaxed & friendly', goodWithChildren: true, goodWithPets: true,
    feedingNotes: 'Standard cat food, twice daily', medicationNotes: 'None', walkingNeeds: 'Outdoor access via cat flap',
    specialInstructions: 'Loves laps. Will come when called.', avatarEmoji: '🐈', photos: [], createdAt: '2025-10-05',
  },
];

export const mockRequests: CareRequest[] = [
  {
    id: 'r1', creatorId: '2', petId: 'p3', careType: 'day_care',
    startAt: 'Sat 12 Apr, 9am', endAt: 'Sat 12 Apr, 6pm',
    notes: "Charlie needs a walk and feeding. He's great with other dogs.",
    creditsOffered: 3, flexibleTiming: true, status: 'open', createdAt: '2 hours ago',
  },
  {
    id: 'r2', creatorId: '1', petId: 'p2', careType: 'feeding_visit',
    startAt: 'Sun 13 Apr, 8am', endAt: 'Sun 13 Apr, 9am',
    notes: "Just need someone to feed Milo and check he's alright.",
    creditsOffered: 1, flexibleTiming: false, status: 'open', createdAt: '5 hours ago',
  },
  {
    id: 'r3', creatorId: '4', petId: 'p5', careType: 'walk_checkin',
    startAt: 'Mon 14 Apr, 12pm', endAt: 'Mon 14 Apr, 1pm',
    notes: 'Max needs a midday walk. Happy to return the favour anytime.',
    creditsOffered: 1, flexibleTiming: true, status: 'open', createdAt: '1 day ago',
  },
  {
    id: 'r4', creatorId: '5', petId: 'p6', careType: 'overnight',
    startAt: 'Fri 18 Apr, 7pm', endAt: 'Sat 19 Apr, 10am',
    notes: 'Going to a family event overnight. Cleo is easy but needs play time.',
    creditsOffered: 4, flexibleTiming: false, status: 'open', createdAt: '3 days ago',
  },
];

export const mockConnections: Connection[] = [
  { id: 'conn1', requesterId: '1', recipientId: 'me', requestMessage: "Hi! I noticed we're both in the same area. Would love to connect for pet care swaps.", status: 'pending', createdAt: '1 day ago' },
  { id: 'conn2', requesterId: 'me', recipientId: '3', requestMessage: "Hi Emma, I'd love to connect! I could use help with cat sitting.", status: 'accepted', createdAt: '5 days ago' },
  { id: 'conn3', requesterId: '5', recipientId: 'me', requestMessage: "Hello! I'm Priya from Brixton. Would be great to set up a pet care exchange.", status: 'pending', createdAt: '2 days ago' },
];

export const mockMessages: Message[] = [
  { id: 'm1', conversationId: 'c1', senderId: '1', body: "Hi! I saw you're nearby. Would you be able to look after Luna this Saturday?", createdAt: '10:30 AM', read: true },
  { id: 'm2', conversationId: 'c1', senderId: 'me', body: "Sure! I'd love to help. What time works for you?", createdAt: '10:35 AM', read: true },
  { id: 'm3', conversationId: 'c1', senderId: '1', body: 'How about 9am? She needs a morning walk and feeding.', createdAt: '10:38 AM', read: false },
  { id: 'm4', conversationId: 'c2', senderId: '3', body: 'Thanks so much for looking after Bella last weekend! She seemed really happy.', createdAt: 'Yesterday', read: true },
  { id: 'm5', conversationId: 'c2', senderId: 'me', body: 'She was lovely! Happy to help anytime.', createdAt: 'Yesterday', read: true },
];

export const mockReviews: Review[] = [
  { id: 'rev1', swapId: 's1', reviewerId: '1', reviewedUserId: 'me', rating: 5, reviewText: 'Alex was brilliant with Luna. She was tired and happy when I picked her up!', tags: ['Reliable', 'Great with pets', 'On time'], createdAt: '1 week ago' },
  { id: 'rev2', swapId: 's2', reviewerId: 'me', reviewedUserId: '3', rating: 5, reviewText: 'Emma is amazing with cats. Bella loved her. Would trust again.', tags: ['Friendly', 'Great communication', 'Would trust again'], createdAt: '2 weeks ago' },
  { id: 'rev3', swapId: 's3', reviewerId: '4', reviewedUserId: 'me', rating: 4, reviewText: 'Good with Max, arrived on time. Would use again.', tags: ['Reliable', 'On time'], createdAt: '3 weeks ago' },
];

export const creditHistory: CreditEntry[] = [
  { id: 'c1', userId: 'me', amount: 3, type: 'earned', description: 'Day care for Luna (Sarah)', createdAt: '2 days ago' },
  { id: 'c2', userId: 'me', amount: 2, type: 'spent', description: 'Charlie walked by James', createdAt: '5 days ago' },
  { id: 'c3', userId: 'me', amount: 4, type: 'earned', description: 'Overnight care for Bella (Emma)', createdAt: '1 week ago' },
  { id: 'c4', userId: 'me', amount: 1, type: 'earned', description: 'Fed Milo for Sarah', createdAt: '2 weeks ago' },
  { id: 'c5', userId: 'me', amount: 1, type: 'pending', description: 'Walk for Max (pending completion)', createdAt: 'Today' },
];

export const mockNotifications: Notification[] = [
  { id: 'n1', userId: 'me', type: 'connection_request', title: 'New connection', body: 'Sarah wants to connect with you', readStatus: false, createdAt: '1 hr ago' },
  { id: 'n2', userId: 'me', type: 'nearby_request', title: 'Request nearby', body: 'James needs day care for Charlie this Saturday', readStatus: false, createdAt: '2 hrs ago' },
  { id: 'n3', userId: 'me', type: 'credits_earned', title: 'Credits earned', body: 'You earned 3 credits for caring for Luna', readStatus: true, createdAt: '2 days ago' },
  { id: 'n4', userId: 'me', type: 'review_received', title: 'New review', body: 'Sarah left you a 5-star review', readStatus: true, createdAt: '1 week ago' },
];

export const currentUser: User = {
  id: 'me',
  firstName: 'Alex',
  email: 'alex@petswap.com',
  phone: '+447700900010',
  area: "King's Cross",
  postcode: 'N1C',
  bio: "Dog and cat lover based in King's Cross. Happy to help neighbours with pet care. I work from home most days.",
  householdType: 'flat',
  hasChildren: false,
  hasPets: true,
  petExperience: 'experienced',
  avatarUrl: '',
  avatarEmoji: '🧑',
  isEmailVerified: true,
  isPhoneVerified: true,
  isIdVerified: false,
  emergencyContactName: 'Jordan Thompson',
  emergencyContactPhone: '+447700900011',
  reliabilityScore: 96,
  averageRating: 4.8,
  totalReviews: 14,
  completedSwaps: 18,
  cancellationsCount: 1,
  responseRate: 93,
  credits: 10,
  subscriptionTier: 'free',
  role: 'both',
  availability: { daysAvailable: ['Mon', 'Tue', 'Wed', 'Sat'], daysNeeding: ['Fri', 'Sun'], noticePeriod: '1_day', scheduleType: 'flexible' },
  distance: '0 km',
  lastActive: 'Now',
  createdAt: '2025-06-01',
};

export const reviewTags = [
  'Reliable', 'Friendly', 'Great communication', 'Good with pets', 'On time', 'Would trust again',
];

export const introPrompts = [
  "Hi, I'm looking for help with my dog next weekend",
  "Hi, I'm nearby and available to help with pet care",
  "Hi, I'd love to connect and see if we're a good fit for future swaps",
];

export const chatQuickPrompts = [
  "What is your pet's normal schedule?",
  "Is your pet comfortable with children?",
  "Are there any medication instructions?",
  "What time would drop-off work best?",
  "Would you like to arrange a trial meet first?",
];
