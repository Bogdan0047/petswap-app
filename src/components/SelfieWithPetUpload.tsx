import { useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, PawPrint, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string | null | undefined;
  isVerified: boolean;
  selfieUrl: string | null;
  onVerified?: () => void;
}

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Lightweight "selfie with your pet" verification.
 * Stores the image in the private `verifications` bucket under {userId}/...
 * and flips `is_pet_owner_verified=true` on the profile. No legal documents.
 */
const SelfieWithPetUpload = ({ userId, isVerified, selfieUrl, onVerified }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const loadSignedPreview = async (path: string) => {
    const { data } = await supabase.storage.from('verifications').createSignedUrl(path, 60 * 10);
    if (data?.signedUrl) setSignedUrl(data.signedUrl);
  };

  // Lazily get a viewable URL for an existing selfie.
  if (isVerified && selfieUrl && !signedUrl && !previewUrl) {
    void loadSignedPreview(selfieUrl);
  }

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > MAX_BYTES) {
      toast.error('Image too large. Max 8MB.');
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast.error('Use a JPG, PNG or WEBP photo.');
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/selfie-with-pet-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('verifications')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { error: updErr } = await supabase
        .from('profiles')
        .update({
          selfie_with_pet_url: path,
          is_pet_owner_verified: true,
          pet_owner_verified_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (updErr) throw updErr;

      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      setSignedUrl(null);
      toast.success('Verified pet owner — your badge is live!');
      onVerified?.();
    } catch (err) {
      console.error('[selfie-upload] failed', err);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const showImage = previewUrl || signedUrl;

  return (
    <div className="card-elevated p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <PawPrint size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-[15px] leading-tight">Selfie with your pet</p>
            {isVerified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 size={10} /> Verified
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            A quick photo of you with your pet earns the <span className="font-semibold text-foreground">Pet owner verified</span> badge.
            Only you can see this image.
          </p>
        </div>
      </div>

      {showImage && (
        <div className="mt-2 mb-3 rounded-xl overflow-hidden ring-1 ring-border bg-muted aspect-[4/3]">
          <img
            src={showImage}
            alt="Your verification selfie with your pet"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handlePick}
        disabled={busy || !userId}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ? (
          <><Loader2 size={15} className="animate-spin" /> Uploading…</>
        ) : isVerified ? (
          <><RefreshCw size={15} /> Replace photo</>
        ) : (
          <><Camera size={15} /> Take or upload selfie</>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="user"
        onChange={handleFile}
        className="hidden"
      />
      <p className="text-[11px] text-muted-foreground/80 mt-2 text-center">
        We never ask for ID, passport or driving licence.
      </p>
    </div>
  );
};

export default SelfieWithPetUpload;
