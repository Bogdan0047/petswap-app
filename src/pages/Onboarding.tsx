import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, MapPin, Camera, Shield, CheckCircle, Star, Users, Calendar, Clock, Search, Heart, Award } from 'lucide-react';
import { getUserAvatar } from '@/assets/images';

const roles = [
  { id: 'owner', emoji: '🐾', label: 'I need pet care', desc: 'Find trusted people nearby to help with your pets' },
  { id: 'helper', emoji: '🤝', label: 'I can help with pet care', desc: 'Help local pet owners and earn credits' },
  { id: 'both', emoji: '💚', label: 'Both', desc: 'Give and receive help within your community' },
];

const petTypes = ['🐕 Dog', '🐈 Cat', '🐇 Rabbit', '🐦 Bird', '🐠 Fish', '🐹 Other'];
const petSizes = ['Small', 'Medium', 'Large'];
const temperaments = ['Calm', 'Friendly', 'Energetic', 'Shy', 'Playful', 'Independent'];
const householdTypes = ['Flat', 'House', 'House with garden', 'Farm'];
const experienceLevels = ['None', 'Some', 'Experienced', 'Professional'];
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('');
  const [firstName, setFirstName] = useState('');
  const [area, setArea] = useState('');
  const [household, setHousehold] = useState('');
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [hasPets, setHasPets] = useState<boolean | null>(null);
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('');
  const [petSize, setPetSize] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [petTemperament, setPetTemperament] = useState('');
  const [goodWithChildren, setGoodWithChildren] = useState<boolean | null>(null);
  const [goodWithPets, setGoodWithPets] = useState<boolean | null>(null);
  const [feedingNotes, setFeedingNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [daysAvailable, setDaysAvailable] = useState<string[]>([]);
  const [daysNeeding, setDaysNeeding] = useState<string[]>([]);
  const [noticePeriod, setNoticePeriod] = useState('');
  const [scheduleType, setScheduleType] = useState('');

  const totalSteps = 9;

  const toggleDay = (day: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(day) ? list.filter(d => d !== day) : [...list, day]);
  };

  const chipButton = (label: string, selected: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick}
      className={`px-4 py-2.5 rounded-[14px] text-[13px] font-semibold transition-all duration-200 ${
        selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
      }`}>
      {label}
    </button>
  );

  const textInput = (value: string, onChange: (v: string) => void, placeholder: string, multiline = false) =>
    multiline ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
        className="w-full px-4 py-3.5 rounded-[14px] bg-muted border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-[15px]" />
    ) : (
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3.5 rounded-[14px] bg-muted border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-[15px]" />
    );

  const yesNoButtons = (value: boolean | null, onChange: (v: boolean) => void) => (
    <div className="flex gap-2">
      {chipButton('Yes', value === true, () => onChange(true))}
      {chipButton('No', value === false, () => onChange(false))}
    </div>
  );

  const onboardingCards = [
    { icon: Search, title: 'Trusted pet care near you', desc: 'Connect with local pet owners who help each other', color: 'bg-primary/10 text-primary' },
    { icon: Star, title: 'Earn credits by helping', desc: 'Help others and use credits when you need care', color: 'bg-warning/10 text-warning' },
    { icon: Shield, title: 'Built on trust', desc: 'Verified users, ratings, safe connections', color: 'bg-accent text-accent-foreground' },
  ];

  const steps = [
    // Step 0: How it works — 3 illustration cards
    <div key="how" className="animate-slide-up">
      <h2 className="heading-lg mb-2">How PetSwap works</h2>
      <p className="text-[15px] text-muted-foreground mb-8">A simple, trust-first system for local pet care.</p>
      <div className="space-y-4">
        {onboardingCards.map((card, i) => (
          <div key={i} className="card-elevated p-5 flex items-start gap-4">
            <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0 ${card.color}`}>
              <card.icon size={24} />
            </div>
            <div className="pt-0.5">
              <p className="font-bold text-[15px] mb-1">{card.title}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>,

    // Step 1: Role selection
    <div key="role" className="animate-slide-up">
      <h2 className="heading-lg mb-2">How will you use PetSwap?</h2>
      <p className="text-[15px] text-muted-foreground mb-8">You can always change this later.</p>
      <div className="space-y-3">
        {roles.map(r => (
          <button key={r.id} onClick={() => setRole(r.id)}
            className={`w-full p-5 rounded-[20px] text-left flex items-center gap-4 transition-all duration-200 border-2 ${
              role === r.id ? 'border-primary bg-accent' : 'border-border bg-card'
            }`}>
            <span className="text-3xl">{r.emoji}</span>
            <div>
              <p className="font-semibold text-[15px]">{r.label}</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">{r.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Auth placeholder
    <div key="auth" className="animate-slide-up">
      <h2 className="heading-lg mb-2">Create your account</h2>
      <p className="text-[15px] text-muted-foreground mb-8">Sign up to save your progress and connect with others.</p>
      <div className="space-y-3">
        <button
          onClick={() => navigate('/auth')}
          className="w-full p-4 rounded-[14px] bg-foreground text-background font-semibold text-[15px] flex items-center justify-center gap-2"
        >
           Continue with Apple
        </button>
        <button
          onClick={() => navigate('/auth')}
          className="w-full p-4 rounded-[14px] bg-muted font-semibold text-[15px] flex items-center justify-center gap-2 border border-border"
        >
          Continue with Google
        </button>
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[13px] text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        {textInput('', () => {}, 'Email address')}
        <button
          onClick={() => navigate('/auth')}
          className="btn-primary w-full text-[15px]"
        >
          Continue with email
        </button>
      </div>
      <button onClick={() => navigate('/home')} className="w-full mt-5 text-[13px] text-muted-foreground font-medium text-center">
        Continue as guest
      </button>
    </div>,

    // Step 3: Profile info
    <div key="profile" className="animate-slide-up">
      <h2 className="heading-lg mb-2">About you</h2>
      <p className="text-[15px] text-muted-foreground mb-8">Help us match you with the right people nearby.</p>
      <div className="space-y-5">
        <div>
          <label className="text-[13px] font-semibold mb-2 block text-muted-foreground">First name</label>
          {textInput(firstName, setFirstName, 'e.g. Alex')}
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2 block text-muted-foreground">Area or postcode</label>
          {textInput(area, setArea, 'e.g. Camden, NW1')}
        </div>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="w-full p-5 rounded-[20px] bg-muted text-left flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center">
            <Camera size={22} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-[15px]">Add profile photo</p>
            <p className="text-[13px] text-muted-foreground">Helps build trust with other users</p>
          </div>
        </button>
        <div>
          <label className="text-[13px] font-semibold mb-2.5 block text-muted-foreground">Household type</label>
          <div className="flex flex-wrap gap-2">
            {householdTypes.map(h => chipButton(h, household === h, () => setHousehold(h)))}
          </div>
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2.5 block text-muted-foreground">Do you have children?</label>
          {yesNoButtons(hasChildren, setHasChildren)}
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2.5 block text-muted-foreground">Do you have pets?</label>
          {yesNoButtons(hasPets, setHasPets)}
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2.5 block text-muted-foreground">Experience with dogs/cats</label>
          <div className="flex flex-wrap gap-2">
            {experienceLevels.map(e => chipButton(e, experience === e, () => setExperience(e)))}
          </div>
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2 block text-muted-foreground">Short bio</label>
          {textInput(bio, setBio, 'Tell others a bit about yourself...', true)}
        </div>
      </div>
    </div>,

    // Step 4: Add pet
    <div key="pet" className="animate-slide-up">
      <h2 className="heading-lg mb-2">Add your pet</h2>
      <p className="text-[15px] text-muted-foreground mb-8">Tell us about your furry friend. You can add more later.</p>
      <div className="space-y-5">
        <div>
          <label className="text-[13px] font-semibold mb-2 block text-muted-foreground">Pet name</label>
          {textInput(petName, setPetName, "e.g. Luna")}
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2.5 block text-muted-foreground">Type</label>
          <div className="flex flex-wrap gap-2">
            {petTypes.map(t => chipButton(t, petType === t, () => setPetType(t)))}
          </div>
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2 block text-muted-foreground">Breed</label>
          {textInput(petBreed, setPetBreed, 'e.g. Border Collie')}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[13px] font-semibold mb-2.5 block text-muted-foreground">Size</label>
            <div className="flex gap-2">
              {petSizes.map(s => chipButton(s, petSize === s, () => setPetSize(s)))}
            </div>
          </div>
          <div>
            <label className="text-[13px] font-semibold mb-2 block text-muted-foreground">Age</label>
            {textInput(petAge, setPetAge, 'e.g. 3 years')}
          </div>
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2.5 block text-muted-foreground">Temperament</label>
          <div className="flex flex-wrap gap-2">
            {temperaments.map(t => chipButton(t, petTemperament === t, () => setPetTemperament(t)))}
          </div>
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2.5 block text-muted-foreground">Good with children?</label>
          {yesNoButtons(goodWithChildren, setGoodWithChildren)}
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2.5 block text-muted-foreground">Good with other pets?</label>
          {yesNoButtons(goodWithPets, setGoodWithPets)}
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2 block text-muted-foreground">Feeding notes</label>
          {textInput(feedingNotes, setFeedingNotes, 'e.g. Twice daily, grain-free')}
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-2 block text-muted-foreground">Special instructions</label>
          {textInput(specialInstructions, setSpecialInstructions, 'Anything a carer should know', true)}
        </div>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="w-full p-5 rounded-[20px] bg-muted text-left flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center">
            <Camera size={22} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-[15px]">Add pet photos</p>
            <p className="text-[13px] text-muted-foreground">Help others recognise your pet</p>
          </div>
        </button>
      </div>
    </div>,

    // Step 5: Availability
    <div key="availability" className="animate-slide-up">
      <h2 className="heading-lg mb-2">Your availability</h2>
      <p className="text-[15px] text-muted-foreground mb-8">When can you help, and when do you need help?</p>
      <div className="space-y-6">
        <div>
          <label className="text-[13px] font-semibold mb-3 block text-muted-foreground flex items-center gap-1.5">
            <Calendar size={14} /> Days you can help
          </label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map(d => chipButton(d, daysAvailable.includes(d), () => toggleDay(d, daysAvailable, setDaysAvailable)))}
          </div>
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-3 block text-muted-foreground flex items-center gap-1.5">
            <Calendar size={14} /> Days you need help
          </label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map(d => chipButton(d, daysNeeding.includes(d), () => toggleDay(d, daysNeeding, setDaysNeeding)))}
          </div>
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-3 block text-muted-foreground flex items-center gap-1.5">
            <Clock size={14} /> Preferred notice period
          </label>
          <div className="flex flex-wrap gap-2">
            {['Same day', '1 day', '2 days', '1 week'].map(p => chipButton(p, noticePeriod === p, () => setNoticePeriod(p)))}
          </div>
        </div>
        <div>
          <label className="text-[13px] font-semibold mb-3 block text-muted-foreground">Schedule type</label>
          <div className="flex gap-2">
            {chipButton('Flexible', scheduleType === 'flexible', () => setScheduleType('flexible'))}
            {chipButton('Fixed', scheduleType === 'fixed', () => setScheduleType('fixed'))}
          </div>
        </div>
      </div>
    </div>,

    // Step 6: Trust setup
    <div key="trust" className="animate-slide-up">
      <h2 className="heading-lg mb-2">Build your trust profile</h2>
      <p className="text-[15px] text-muted-foreground mb-8">Verified users get better visibility and more connections.</p>
      <div className="space-y-3">
        {[
          { icon: CheckCircle, label: 'Verify email', desc: 'Required for account security', done: false },
          { icon: Shield, label: 'Verify phone', desc: 'Adds trust to your profile', done: false },
          { icon: Shield, label: 'ID verification', desc: 'Optional — highest trust level', done: false, optional: true },
          { icon: Users, label: 'Emergency contact', desc: 'For safety in pet care situations', done: false },
        ].map((item, i) => (
          <div key={i} className="card-elevated p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center ${item.done ? 'bg-primary/10' : 'bg-muted'}`}>
              <item.icon size={20} className={item.done ? 'text-primary' : 'text-muted-foreground'} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[15px]">{item.label}</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => navigate('/verify-identity')}
              className="text-primary text-[13px] font-semibold"
            >
              {item.optional ? 'Add' : 'Verify'}
            </button>
          </div>
        ))}
      </div>
      <div className="card-flat p-4 mt-5 flex items-start gap-3">
        <Award size={18} className="text-warning mt-0.5 flex-shrink-0" />
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Verified users appear higher in search results and receive more connection requests.
        </p>
      </div>
    </div>,

    // Step 7: Location permission
    <div key="location" className="animate-slide-up">
      <h2 className="heading-lg mb-2">Enable location</h2>
      <p className="text-[15px] text-muted-foreground mb-8">We use your location to show nearby pet owners and helpers. We never share your exact address.</p>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                () => setStep((s) => Math.min(s + 1, totalSteps - 1)),
                () => setStep((s) => Math.min(s + 1, totalSteps - 1)),
              );
            } else {
              setStep((s) => Math.min(s + 1, totalSteps - 1));
            }
          }}
          className="w-full p-5 rounded-[20px] bg-primary/10 text-left flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-[16px] bg-primary/15 flex items-center justify-center">
            <MapPin size={24} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-[15px] text-primary">Allow location access</p>
            <p className="text-[13px] text-muted-foreground mt-0.5">Used to find nearby matches and requests</p>
          </div>
        </button>
        <div className="card-flat p-5">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Why we need location:</strong> PetSwap matches you with nearby pet owners. Only approximate distance is shown to other users — never your exact location or address.
          </p>
        </div>
      </div>
    </div>,

    // Step 8: First value — show matches
    <div key="matches" className="animate-slide-up">
      <h2 className="heading-lg mb-2">You're all set! 🎉</h2>
      <p className="text-[15px] text-muted-foreground mb-8">Here are some trusted pet owners near you.</p>
      <div className="space-y-3">
        {[
          { id: '1', name: 'Sarah', area: 'Camden', distance: '0.8 km', rating: 4.9, swaps: 24 },
          { id: '3', name: 'Emma', area: 'Hackney', distance: '2.1 km', rating: 4.8, swaps: 31 },
          { id: '5', name: 'Priya', area: 'Brixton', distance: '4.2 km', rating: 4.9, swaps: 19 },
        ].map((u) => {
          const avatar = getUserAvatar(u.id);
          return (
            <div key={u.id} className="card-elevated p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-[18px] bg-accent flex-shrink-0 overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt={u.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🧑</div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[15px]">{u.name}</p>
                <p className="text-[13px] text-muted-foreground">{u.area} · {u.distance}</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-semibold flex items-center gap-0.5 justify-end">
                  <Star size={13} className="text-warning" fill="currentColor" /> {u.rating}
                </p>
                <p className="text-[11px] text-muted-foreground">{u.swaps} swaps</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>,
  ];

  const canProceed = () => {
    switch (step) {
      case 1: return !!role;
      case 3: return !!firstName && !!area;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress */}
      <div className="px-6 pt-6 pb-4 safe-top">
        <div className="flex items-center gap-4 mb-4">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="p-1">
              <ArrowLeft size={22} />
            </button>
          )}
          <div className="flex-1 flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <span className="text-[13px] text-muted-foreground font-medium">{step + 1}/{totalSteps}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 overflow-y-auto pb-36">
        {steps[step]}
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/90 backdrop-blur-xl safe-bottom">
        <button
          onClick={() => step < totalSteps - 1 ? setStep(s => s + 1) : navigate('/home')}
          disabled={!canProceed()}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 text-[17px]"
        >
          {step === totalSteps - 1 ? 'Start exploring' : step === 0 ? 'Get started' : 'Continue'} <ArrowRight size={20} />
        </button>
        {(step === 4 || step === 5 || step === 6) && (
          <button onClick={() => setStep(s => s + 1)} className="w-full mt-3 text-[15px] text-muted-foreground font-medium text-center">
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
