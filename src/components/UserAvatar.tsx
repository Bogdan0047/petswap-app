import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  rounded?: number;
  className?: string;
  /** Optional small online dot anchored to bottom-right */
  online?: boolean;
}

/**
 * Premium initial-based avatar.
 * - If `src` is provided, shows the real uploaded photo.
 * - Otherwise shows a clean circular placeholder with the first initial,
 *   with a deterministic gradient derived from the name.
 *
 * Never renders stock or AI-generated faces.
 */
const PALETTES: Array<[string, string]> = [
  ["#0EA5E9", "#2563EB"], // sky -> blue
  ["#10B981", "#0EA371"], // emerald
  ["#F59E0B", "#EA580C"], // amber -> orange
  ["#8B5CF6", "#6D28D9"], // violet
  ["#EC4899", "#BE185D"], // pink
  ["#14B8A6", "#0D9488"], // teal
  ["#F43F5E", "#E11D48"], // rose
  ["#6366F1", "#4338CA"], // indigo
];

const hashIndex = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % PALETTES.length;
};

const initialOf = (name?: string | null) => {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
};

const UserAvatar = ({
  name,
  src,
  size = 48,
  rounded,
  className,
  online,
}: UserAvatarProps) => {
  const dim = { width: size, height: size };
  const radius = rounded ?? Math.round(size * 0.32);
  const [from, to] = PALETTES[hashIndex(name || "?")];
  const fontSize = Math.max(12, Math.round(size * 0.42));

  return (
    <div className={cn("relative inline-block flex-shrink-0", className)} style={dim}>
      <div
        className="overflow-hidden ring-1 ring-black/[0.04]"
        style={{
          ...dim,
          borderRadius: radius,
          background: src ? "#F1F5F9" : `linear-gradient(135deg, ${from}, ${to})`,
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover"
            style={dim}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-semibold text-white tracking-tight select-none"
            style={{ fontSize, letterSpacing: "-0.01em" }}
            aria-label={name}
          >
            {initialOf(name)}
          </div>
        )}
      </div>
      {online && (
        <span
          aria-label="Active now"
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white"
          style={{ width: Math.max(8, size * 0.22), height: Math.max(8, size * 0.22) }}
        />
      )}
    </div>
  );
};

export default UserAvatar;
