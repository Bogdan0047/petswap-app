import { ShieldAlert } from 'lucide-react';

interface Props {
  trustScore: number;
  isIdVerified: boolean;
  firstName: string;
}

/**
 * Strong, hard-to-miss low-trust warning shown at the top of a conversation
 * when the other user has trust < 40 AND is not ID-verified.
 */
const ChatTrustWarning = ({ trustScore, isIdVerified, firstName }: Props) => {
  if (trustScore >= 40 || isIdVerified) return null;
  return (
    <div
      role="alert"
      className="mx-3 mt-2 rounded-2xl bg-destructive/10 ring-1 ring-destructive/35 px-3.5 py-3 flex items-start gap-2.5 animate-fade-in"
    >
      <div className="w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
        <ShieldAlert size={16} className="text-destructive" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-destructive leading-tight">
          {firstName} is not verified
        </p>
        <p className="text-[12px] text-foreground/80 leading-snug mt-0.5">
          Meet in a public place first, never send money, and trust your gut.
        </p>
      </div>
    </div>
  );
};

export default ChatTrustWarning;
