import petswapIcon from "@/assets/petswap-icon.png";

/**
 * Full-viewport "Checking your secure PetSwap session…" splash.
 * Used by AuthProvider during initial getSession() and by RequireAuth
 * while account-status checks finish. Apple-style minimal: white bg,
 * logo with subtle pulse, brand-blue micro spinner.
 */
export default function AuthLoadingScreen({
  message = "Checking your secure PetSwap session…",
}: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white safe-top safe-bottom px-6"
    >
      <div className="relative">
        <div
          className="absolute inset-0 -z-10 blur-2xl rounded-[28px] bg-[#2F80ED]/30 scale-110"
          aria-hidden
        />
        <img
          src={petswapIcon}
          alt="PetSwap"
          width={84}
          height={84}
          className="w-[84px] h-[84px] rounded-[22px] shadow-[0_14px_32px_-10px_rgba(47,128,237,0.55)] animate-[pulse_2.2s_ease-in-out_infinite]"
        />
      </div>

      <div className="mt-7 flex items-center gap-2.5">
        <span
          className="w-2 h-2 rounded-full bg-[#2F80ED] animate-[pulse_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-[#2F80ED] animate-[pulse_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: "180ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-[#2F80ED] animate-[pulse_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: "360ms" }}
        />
      </div>

      <p className="mt-5 text-[14px] text-[#64748B] text-center max-w-[280px] leading-snug">
        {message}
      </p>
    </div>
  );
}
