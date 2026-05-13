import { ShieldAlert } from 'lucide-react';

/**
 * Persistent in-chat safety reminder.
 * GDPR / consumer-trust pattern used by Airbnb, Vinted, etc.
 */
const SafetyBanner = () => (
  <div
    role="note"
    aria-label="Safety notice"
    className="mx-3 mt-2 rounded-xl bg-warning/10 ring-1 ring-warning/25 px-3 py-2 flex items-start gap-2"
  >
    <ShieldAlert size={14} className="text-warning mt-0.5 flex-shrink-0" />
    <p className="text-[11.5px] leading-snug text-foreground/80">
      <span className="font-semibold text-foreground">Stay safe.</span>{' '}
      Never send money outside PetSwap, share IDs, or move chats off-app.
      Meet first &amp; trust your gut.
    </p>
  </div>
);

export default SafetyBanner;
