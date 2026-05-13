import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Camera, Upload, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useTrustProfile';
import { sendPetSwapEmail } from '@/lib/sendAppEmail';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { friendlyError } from '@/lib/friendlyError';

type VStatus = 'idle' | 'pending' | 'approved' | 'rejected';

const VerifyIdentity = () => {
  const navigate = useNavigate();
  const userId = useCurrentUserId();
  const [status, setStatus] = useState<VStatus>('idle');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Load current verification status
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('verifications')
      .select('status,created_at')
      .eq('user_id', userId)
      .eq('verification_type', 'id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const newStatus: VStatus =
          data?.status === 'approved' ? 'approved'
          : data?.status === 'pending' ? 'pending'
          : data?.status === 'rejected' ? 'rejected'
          : 'idle';

        // Fire the "you're now verified" email exactly once per user when we
        // first observe the approved state. Local guard prevents duplicate
        // sends across re-mounts; idempotency key on the server prevents
        // duplicate sends across devices.
        setStatus((prev) => {
          if (newStatus === 'approved' && prev !== 'approved') {
            const guardKey = `petswap:verified-email-sent:id:${userId}`;
            if (typeof window !== 'undefined' && !localStorage.getItem(guardKey)) {
              localStorage.setItem(guardKey, '1');
              void (async () => {
                // Pull current trust score for the email.
                const { data: prof } = await supabase
                  .from('profiles')
                  .select('trust_score')
                  .eq('id', userId)
                  .maybeSingle();
                void sendPetSwapEmail({
                  userId,
                  emailType: 'account-verified',
                  // dedupe per verification type — server enforces one per (user, 'id')
                  dedupeKey: 'id',
                  templateData: {
                    profileUrl: 'https://petswap.co.uk/profile',
                    verificationType: 'id',
                    trustScore: prof?.trust_score ?? undefined,
                  },
                });
              })();
            }
          }
          return newStatus;
        });
      });
    return () => { cancelled = true; };
  }, [userId]);

  const upload = async (file: File, kind: 'id' | 'selfie') => {
    if (!userId) throw new Error('Not signed in');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('verifications')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return path;
  };

  const handleSubmit = async () => {
    if (!idFile || !selfieFile) {
      toast.error("Please add both an ID photo and a selfie.");
      return;
    }
    setSubmitting(true);
    try {
      const [idPath, selfiePath] = await Promise.all([
        upload(idFile, 'id'),
        upload(selfieFile, 'selfie'),
      ]);
      const { error } = await supabase.rpc('submit_id_verification', {
        _id_image_path: idPath,
        _selfie_path: selfiePath,
      });
      if (error) throw error;
      setStatus('pending');
      toast.success('Submitted — we\'ll review within 24h');
    } catch (e) {
      toast.error(friendlyError(e, "verification"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-md border-b border-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[17px] font-bold">Verify identity</h1>
      </header>

      <div className="px-5 pt-5 max-w-md mx-auto">
        <div className="card-elevated p-5 mb-5 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <ShieldCheck size={26} className="text-primary" />
          </div>
          <h2 className="font-bold text-[18px] mb-1">Get your ID Verified badge</h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Verified members get more matches, higher trust score, and priority placement.
          </p>
        </div>

        {status === 'approved' && (
          <div className="card-elevated p-5 flex items-center gap-3 bg-primary/5 border border-primary/20">
            <CheckCircle2 size={22} className="text-primary" />
            <div>
              <p className="font-semibold text-[15px]">You're ID verified</p>
              <p className="text-[12px] text-muted-foreground">Your badge is live across the app.</p>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="card-elevated p-5 flex items-center gap-3 bg-warning/5 border border-warning/20">
            <Clock size={22} className="text-warning" />
            <div>
              <p className="font-semibold text-[15px]">Review in progress</p>
              <p className="text-[12px] text-muted-foreground">We typically review within 24 hours.</p>
            </div>
          </div>
        )}

        {(status === 'idle' || status === 'rejected') && (
          <>
            {status === 'rejected' && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-[12px] text-destructive">
                Your previous submission was rejected. Please re-submit clearer photos.
              </div>
            )}
            <FilePicker
              label="Government ID"
              hint="Passport or driving licence — make sure all corners are visible"
              icon={Upload}
              file={idFile}
              onPick={(f) => setIdFile(f)}
              inputRef={idInputRef}
            />
            <div className="h-3" />
            <FilePicker
              label="Selfie"
              hint="A clear photo of your face in good light"
              icon={Camera}
              capture
              file={selfieFile}
              onPick={(f) => setSelfieFile(f)}
              inputRef={selfieInputRef}
            />

            <button
              onClick={handleSubmit}
              disabled={!idFile || !selfieFile || submitting}
              className={cn(
                'btn-primary w-full mt-6 py-3.5 inline-flex items-center justify-center gap-2',
                (!idFile || !selfieFile || submitting) && 'opacity-50',
              )}
            >
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : 'Verify now'}
            </button>

            <p className="text-[11px] text-muted-foreground text-center mt-3 leading-relaxed">
              Your documents are encrypted and only seen by our review team.
              They are never shown to other users.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

interface FilePickerProps {
  label: string;
  hint: string;
  icon: typeof Upload;
  file: File | null;
  capture?: boolean;
  onPick: (f: File) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const FilePicker = ({ label, hint, icon: Icon, file, capture, onPick, inputRef }: FilePickerProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="card-elevated p-4 w-full text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
    >
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon size={20} className="text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14px]">{label}</p>
        <p className="text-[12px] text-muted-foreground truncate">{file ? file.name : hint}</p>
      </div>
      {file && <CheckCircle2 size={18} className="text-primary flex-shrink-0" />}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture ? 'user' : undefined}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />
    </button>
  );
};

export default VerifyIdentity;
