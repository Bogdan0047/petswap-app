import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Heart, ArrowRight, Loader2, Camera, Check, PawPrint } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { sendPetSwapEmail } from "@/lib/sendAppEmail";
import { friendlyError } from "@/lib/friendlyError";

/**
 * 3-step post-signup wizard: Name → Photo → Pets.
 * Apple-style with progress dots, skippable steps, optimistic feel.
 * On finish, profile is patched and user lands on /home (or `next`).
 */

type PetKind = "dog" | "cat" | "other" | "none";

const TOTAL_STEPS = 3;

const WelcomeNew = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/home";
  const { user, loading } = useAuth();

  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [petKind, setPetKind] = useState<PetKind | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Bounce unauth users back; pre-fill name from metadata
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
      return;
    }
    const meta = (user.user_metadata?.first_name as string) ?? "";
    if (meta) setFirstName(meta);

    // Fire welcome email exactly once per signup (idempotent on user.id).
    const flag = `petswap_welcome_sent_${user.id}`;
    if (!localStorage.getItem(flag)) {
      void sendPetSwapEmail({
        userId: user.id,
        emailType: "welcome",
        templateData: { firstName: meta },
        idempotencyKey: `welcome-${user.id}`,
      }).then((ok) => {
        if (ok) localStorage.setItem(flag, "1");
      });
    }
  }, [loading, user, navigate, next]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a photo (JPG or PNG).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That photo is too large. Please choose one under 5 MB.");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url: string | undefined;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        avatar_url = signed?.signedUrl;
      }

      const patch: {
        onboarding_completed: boolean;
        has_pets: boolean;
        first_name?: string;
        avatar_url?: string;
      } = {
        onboarding_completed: true,
        has_pets: petKind !== null && petKind !== "none",
      };
      if (firstName.trim()) patch.first_name = firstName.trim();
      if (avatar_url) patch.avatar_url = avatar_url;

      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;

      // If the user said they have a specific pet, drop a starter row so the
      // /profile pets tab feels populated. They can fully edit it later.
      if (petKind && petKind !== "none") {
        await supabase.from("pets").insert({
          owner_id: user.id,
          name: petKind === "dog" ? "My dog" : petKind === "cat" ? "My cat" : "My pet",
          type: petKind,
        });
      }

      toast.success("You're all set!");
      navigate(next, { replace: true });
    } catch (e) {
      toast.error(friendlyError(e, "profile"));
      setSaving(false);
    }
  };

  const canContinue =
    (step === 0 && firstName.trim().length >= 1) ||
    step === 1 || // photo always skippable
    (step === 2 && petKind !== null);

  const onNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else finish();
  };

  if (loading || !user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col px-6 pt-10 pb-8 safe-top">
      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-10 max-w-sm mx-auto w-full">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 max-w-sm mx-auto w-full">
        {step === 0 && (
          <StepShell
            badge={<Heart size={26} className="text-primary-foreground" fill="currentColor" />}
            title="What should we call you?"
            subtitle="Your first name helps neighbours recognise you."
          >
            <input
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              autoComplete="given-name"
              className="w-full h-[56px] px-5 rounded-2xl bg-surface-muted/80 ring-1 ring-border/60 focus:ring-2 focus:ring-primary/30 outline-none text-[17px] font-medium transition-shadow"
              style={{ fontSize: "16px" }}
            />
          </StepShell>
        )}

        {step === 1 && (
          <StepShell
            title="Add a photo"
            subtitle="Profiles with photos get 5× more matches. You can skip and add later."
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mx-auto w-36 h-36 rounded-full bg-surface-muted ring-1 ring-border/60 overflow-hidden flex items-center justify-center active:scale-[0.98] transition-transform"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Your avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera size={32} className="text-muted-foreground" strokeWidth={1.75} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            badge={<PawPrint size={26} className="text-primary-foreground" />}
            title="Do you have pets?"
            subtitle="We'll match you with the right neighbours."
          >
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { v: "dog", label: "Dog", emoji: "🐶" },
                  { v: "cat", label: "Cat", emoji: "🐱" },
                  { v: "other", label: "Other", emoji: "🐾" },
                  { v: "none", label: "Not yet", emoji: "✨" },
                ] as { v: PetKind; label: string; emoji: string }[]
              ).map((opt) => {
                const active = petKind === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setPetKind(opt.v)}
                    className={`h-[92px] rounded-2xl flex flex-col items-center justify-center gap-1.5 ring-1 transition-all active:scale-[0.98] ${
                      active
                        ? "bg-primary/8 ring-primary text-foreground"
                        : "bg-surface-muted/70 ring-border/60 text-foreground"
                    }`}
                  >
                    <span className="text-[28px] leading-none">{opt.emoji}</span>
                    <span className="text-[14px] font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </StepShell>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-sm mx-auto w-full space-y-2">
        <button
          onClick={onNext}
          disabled={!canContinue || saving}
          className="w-full h-[54px] rounded-2xl bg-primary text-primary-foreground font-semibold text-[15.5px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-40 shadow-[0_8px_22px_-10px_hsl(var(--primary)/0.6)]"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              {step === TOTAL_STEPS - 1 ? "Finish" : "Continue"}
              <ArrowRight size={17} />
            </>
          )}
        </button>
        {step < TOTAL_STEPS - 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="w-full h-11 text-[14px] font-medium text-muted-foreground active:scale-[0.98] transition-transform"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

const StepShell = ({
  badge,
  title,
  subtitle,
  children,
}: {
  badge?: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col items-center text-center pt-2">
    {badge && (
      <div
        className="w-[60px] h-[60px] rounded-[20px] bg-primary flex items-center justify-center mb-5"
        style={{ boxShadow: "0 12px 26px hsl(var(--primary) / 0.28)" }}
      >
        {badge}
      </div>
    )}
    <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
    <p className="text-[15px] text-muted-foreground mt-1.5 max-w-[300px] leading-relaxed mb-8">
      {subtitle}
    </p>
    <div className="w-full">{children}</div>
  </div>
);

export default WelcomeNew;
