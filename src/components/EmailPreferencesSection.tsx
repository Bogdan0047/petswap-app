import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendlyError";

interface Prefs {
  match_notifications: boolean;
  booking_notifications: boolean;
  review_notifications: boolean;
  trust_tips_enabled: boolean;
  marketing_enabled: boolean;
}

const ROWS: Array<{ key: keyof Prefs; title: string; subtitle: string }> = [
  { key: "match_notifications", title: "Match notifications", subtitle: "When someone connects or matches with you." },
  { key: "booking_notifications", title: "Booking notifications", subtitle: "Confirmations, updates, and reminders for swaps." },
  { key: "review_notifications", title: "Review reminders", subtitle: "Asking you to review after a completed swap." },
  { key: "trust_tips_enabled", title: "Trust tips", subtitle: "Help you build a stronger, more trusted profile." },
  { key: "marketing_enabled", title: "Marketing emails", subtitle: "Occasional updates about new features and your community." },
];

/**
 * Self-contained Email preferences card.
 * Reads + updates email_preferences for the current user.
 * Critical security/account emails are NOT toggleable here.
 */
export default function EmailPreferencesSection() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("email_preferences")
      .select("match_notifications, booking_notifications, review_notifications, trust_tips_enabled, marketing_enabled")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          setPrefs(data as Prefs);
        } else {
          await supabase.from("email_preferences").insert({ user_id: user.id });
          setPrefs({
            match_notifications: true,
            booking_notifications: true,
            review_notifications: true,
            trust_tips_enabled: true,
            marketing_enabled: false,
          });
        }
      });
  }, [user]);

  const toggle = async (key: keyof Prefs) => {
    if (!user || !prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(key);
    const update: Partial<Prefs> = { [key]: next[key] };
    const { error } = await supabase
      .from("email_preferences")
      .update(update as never)
      .eq("user_id", user.id);
    setSaving(null);
    if (error) {
      setPrefs(prefs);
      toast.error(friendlyError(error, "preferences"));
    }
  };

  if (!prefs) {
    return (
      <div className="bg-card rounded-2xl px-4 py-6 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading email preferences…
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Email preferences</p>
        <p className="text-xs text-muted-foreground mt-1">
          Critical account and security emails are always sent.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {ROWS.map(({ key, title, subtitle }) => (
          <li key={key} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
            <button
              role="switch"
              aria-checked={prefs[key]}
              disabled={saving === key}
              onClick={() => toggle(key)}
              className={`relative w-11 h-6 rounded-full transition shrink-0 ${
                prefs[key] ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  prefs[key] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
