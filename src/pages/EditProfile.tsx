import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import UserAvatar from '@/components/UserAvatar';
import { friendlyError } from '@/lib/friendlyError';

const householdTypes = ['Flat', 'House', 'House with garden', 'Farm'];
const petExperienceLevels = ['None', 'Some', 'Experienced', 'Professional'];

const ProfileSchema = z.object({
  first_name: z.string().trim().min(1, 'Name is required').max(60),
  postcode: z.string().trim().max(12).optional().or(z.literal('')),
  bio: z.string().trim().max(500).optional().or(z.literal('')),
  household_type: z.string().max(40).optional().or(z.literal('')),
  pet_experience: z.string().max(40).optional().or(z.literal('')),
  has_children: z.boolean(),
  has_pets: z.boolean(),
});

const EditProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [postcode, setPostcode] = useState('');
  const [bio, setBio] = useState('');
  const [household, setHousehold] = useState('');
  const [petExperience, setPetExperience] = useState('');
  const [hasChildren, setHasChildren] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name,postcode,bio,household_type,pet_experience,has_children,has_pets,avatar_url')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setError(friendlyError(error, 'generic'));
      } else if (data) {
        setFirstName(data.first_name ?? '');
        setPostcode(data.postcode ?? '');
        setBio(data.bio ?? '');
        setHousehold(data.household_type ?? '');
        setPetExperience(data.pet_experience ?? '');
        setHasChildren(!!data.has_children);
        setHasPets(!!data.has_pets);
        setAvatarUrl(data.avatar_url ?? null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);
      if (updErr) throw updErr;
      setAvatarUrl(publicUrl);
      toast.success('Photo updated');
    } catch (err) {
      toast.error(friendlyError(err, 'upload'));
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    const parsed = ProfileSchema.safeParse({
      first_name: firstName,
      postcode,
      bio,
      household_type: household,
      pet_experience: petExperience,
      has_children: hasChildren,
      has_pets: hasPets,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message || 'Please check the form');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: parsed.data.first_name,
          postcode: parsed.data.postcode || null,
          bio: parsed.data.bio || null,
          household_type: parsed.data.household_type || null,
          pet_experience: parsed.data.pet_experience || null,
          has_children: parsed.data.has_children,
          has_pets: parsed.data.has_pets,
        })
        .eq('id', userId);
      if (error) throw error;
      toast.success('Profile updated');
      navigate('/profile');
    } catch (err) {
      toast.error(friendlyError(err, 'generic'));
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center text-muted-foreground">
        Please sign in to edit your profile.
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-md mx-auto px-4 pt-6 pb-32 safe-top">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-bold tracking-tight">Edit profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your details. Changes save instantly.</p>

        {loading ? (
          <div className="mt-10 flex items-center justify-center text-muted-foreground">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading…
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 p-4 text-sm">
            {error}
            <button
              onClick={() => window.location.reload()}
              className="block mt-2 text-rose-700 font-semibold underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="relative w-[72px] h-[72px] rounded-[18px] overflow-hidden bg-muted flex items-center justify-center"
                aria-label="Change profile photo"
              >
                <UserAvatar name={firstName || 'You'} src={avatarUrl} size={72} rounded={18} />
                <span className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 m-1">
                  {avatarUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div className="text-sm">
                <p className="font-semibold">Profile photo</p>
                <p className="text-muted-foreground text-[12px]">Tap photo to change</p>
              </div>
            </div>

            <Field label="Name">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="input-base"
                style={{ fontSize: 16 }}
              />
            </Field>

            <Field label="Postcode">
              <input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="e.g. SW1A 1AA"
                className="input-base"
                style={{ fontSize: 16 }}
              />
            </Field>

            <Field label="Bio">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others a bit about you…"
                rows={4}
                maxLength={500}
                className="input-base resize-none"
                style={{ fontSize: 16 }}
              />
              <p className="text-[11px] text-muted-foreground text-right mt-1">{bio.length}/500</p>
            </Field>

            <Field label="Home type">
              <div className="flex flex-wrap gap-2">
                {householdTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHousehold(t)}
                    className={`px-4 py-2 rounded-[14px] text-[13px] font-semibold ${
                      household === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Pet experience">
              <div className="flex flex-wrap gap-2">
                {petExperienceLevels.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPetExperience(t)}
                    className={`px-4 py-2 rounded-[14px] text-[13px] font-semibold ${
                      petExperience === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Children at home">
              <YesNo value={hasChildren} onChange={setHasChildren} />
            </Field>

            <Field label="Pets at home">
              <YesNo value={hasPets} onChange={setHasPets} />
            </Field>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-[52px] rounded-[16px] bg-primary text-primary-foreground font-semibold text-[15px] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .input-base {
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          background: hsl(var(--muted));
          border: 0;
          color: hsl(var(--foreground));
          outline: none;
        }
        .input-base:focus {
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.3);
        }
      `}</style>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[13px] font-semibold text-muted-foreground mb-2">{label}</label>
    {children}
  </div>
);

const YesNo = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex gap-2">
    {[true, false].map((v) => (
      <button
        key={String(v)}
        type="button"
        onClick={() => onChange(v)}
        className={`px-4 py-2 rounded-[14px] text-[13px] font-semibold ${
          value === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        }`}
      >
        {v ? 'Yes' : 'No'}
      </button>
    ))}
  </div>
);

export default EditProfile;
