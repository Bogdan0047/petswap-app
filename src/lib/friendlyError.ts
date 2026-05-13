/**
 * Central, human-friendly error helper for PetSwap.
 *
 * Goals:
 *  - Never expose raw Supabase / Postgres / Stripe error strings to users.
 *  - Always tell the user what happened and what they can do next.
 *  - Short, calm, trust-building copy.
 *
 * Usage:
 *   import { friendlyError } from "@/lib/friendlyError";
 *   toast.error(friendlyError(err, "login"));
 *   // or with a description:
 *   const { title, description } = friendlyErrorParts(err, "upload");
 *   toast.error(title, { description });
 */

export type ErrorContext =
  | "login"
  | "signup"
  | "oauth"
  | "password-reset"
  | "password-update"
  | "logout"
  | "session"
  | "profile"
  | "pet"
  | "upload"
  | "location"
  | "postcode"
  | "message"
  | "booking"
  | "review"
  | "subscription"
  | "payment"
  | "report"
  | "block"
  | "verification"
  | "availability"
  | "preferences"
  | "push"
  | "credits"
  | "generic";

interface Parts {
  title: string;
  description?: string;
}

const rawMessage = (err: unknown): string => {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message ?? "";
  if (typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    if (typeof anyErr.message === "string") return anyErr.message;
    if (typeof anyErr.error_description === "string") return anyErr.error_description as string;
    if (typeof anyErr.error === "string") return anyErr.error as string;
  }
  return "";
};

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/**
 * Map an unknown error to a friendly { title, description } pair given a context.
 * Description is intentionally optional — most cases are clearer as a single line.
 */
export const friendlyErrorParts = (err: unknown, context: ErrorContext = "generic"): Parts => {
  const msg = rawMessage(err);
  const lower = msg.toLowerCase();

  // ---- Universal short-circuits (network) -----------------------------------
  if (isOffline()) {
    return { title: "You're offline. Check your connection and try again." };
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed")
  ) {
    return { title: "Network problem. Check your connection and try again." };
  }
  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("429")) {
    return { title: "Too many attempts. Please wait a minute and try again." };
  }

  // ---- Per-context mapping --------------------------------------------------
  switch (context) {
    case "login":
      if (lower.includes("invalid login") || lower.includes("invalid credentials") || lower.includes("invalid grant"))
        return { title: "Wrong email or password. Please try again." };
      if (lower.includes("email not confirmed") || lower.includes("not confirmed"))
        return { title: "Please confirm your email before signing in." };
      if (lower.includes("user not found"))
        return { title: "We couldn't find an account for that email." };
      if (lower.includes("deleted"))
        return { title: "This account has been permanently deleted." };
      return { title: "We couldn't sign you in. Please try again." };

    case "signup":
      if (lower.includes("already registered") || lower.includes("user already") || lower.includes("duplicate"))
        return { title: "That email is already registered. Try signing in instead." };
      if (lower.includes("password") && (lower.includes("short") || lower.includes("at least")))
        return { title: "Password is too short. Use at least 8 characters." };
      if (lower.includes("weak") && lower.includes("password"))
        return { title: "Please choose a stronger password." };
      if (lower.includes("invalid email") || lower.includes("email address"))
        return { title: "Please enter a valid email address." };
      return { title: "We couldn't create your account. Please try again." };

    case "oauth":
      if (lower.includes("popup") || lower.includes("cancelled") || lower.includes("canceled") || lower.includes("closed"))
        return { title: "Sign-in cancelled. Please try again when you're ready." };
      return { title: "Sign-in didn't complete. Please try again." };

    case "password-reset":
      if (lower.includes("not found") || lower.includes("user"))
        return { title: "We couldn't find an account for that email." };
      return { title: "We couldn't send the reset email. Please try again." };

    case "password-update":
      if (lower.includes("expired") || lower.includes("invalid token") || lower.includes("invalid otp"))
        return { title: "This reset link has expired. Request a new one." };
      if (lower.includes("same as") || lower.includes("new password should be different"))
        return { title: "Choose a new password that's different from the old one." };
      if (lower.includes("short") || lower.includes("at least"))
        return { title: "Password is too short. Use at least 8 characters." };
      return { title: "We couldn't update your password. Please try again." };

    case "logout":
    case "session":
      if (lower.includes("expired") || lower.includes("jwt"))
        return { title: "Your session has expired. Please sign in again." };
      return { title: "Something interrupted your session. Please sign in again." };

    case "profile":
      if (lower.includes("username") && (lower.includes("taken") || lower.includes("duplicate") || lower.includes("unique")))
        return { title: "That username is already taken. Please choose another." };
      if (lower.includes("violates") || lower.includes("constraint"))
        return { title: "Some details look invalid. Please review and try again." };
      return { title: "We couldn't save your profile. Please try again." };

    case "pet":
      if (lower.includes("name"))
        return { title: "Add your pet's name to continue." };
      return { title: "We couldn't save your pet's profile. Please try again." };

    case "upload":
      if (lower.includes("too large") || lower.includes("payload") || lower.includes("size"))
        return { title: "That photo is too large. Please choose one under 5 MB." };
      if (lower.includes("type") || lower.includes("mime") || lower.includes("format"))
        return { title: "That file type isn't supported. Please choose a JPG or PNG." };
      return { title: "Photo upload failed. Please try another image." };

    case "location":
      if (lower.includes("denied") || lower.includes("permission"))
        return { title: "Location permission is off. Enable it in your browser settings." };
      if (lower.includes("timeout") || lower.includes("unavailable"))
        return { title: "We couldn't get your location. Please try again." };
      return { title: "We couldn't find your location. Please try again." };

    case "postcode":
      return { title: "Enter a valid UK postcode." };

    case "message":
      if (lower.includes("blocked"))
        return { title: "You can't message this person." };
      return { title: "Your message didn't send. Please try again." };

    case "booking":
      if (lower.includes("end") && lower.includes("start"))
        return { title: "End time must be after the start time." };
      if (lower.includes("overlap") || lower.includes("conflict"))
        return { title: "That time clashes with another booking. Pick a different slot." };
      return { title: "We couldn't send your request. Please try again." };

    case "review":
      if (lower.includes("already"))
        return { title: "You've already left a review for this booking." };
      if (lower.includes("completed"))
        return { title: "You can leave a review once the booking is completed." };
      return { title: "We couldn't submit your review. Please try again." };

    case "subscription":
      return { title: "We couldn't open billing. Please try again in a moment." };

    case "payment":
      if (lower.includes("declined") || lower.includes("card"))
        return { title: "Payment didn't go through. Please try another card." };
      return { title: "Payment didn't go through. Please try again." };

    case "report":
      if (lower.includes("characters") || lower.includes("short"))
        return { title: "Please add a few words about what happened (10+ characters)." };
      return { title: "We couldn't send your report. Please try again." };

    case "block":
      return { title: "We couldn't update your block list. Please try again." };

    case "verification":
      if (lower.includes("both") || lower.includes("required"))
        return { title: "Please add both an ID photo and a selfie." };
      return { title: "We couldn't submit your verification. Please try again." };

    case "availability":
      if (lower.includes("sign in"))
        return { title: "Please sign in to save your availability." };
      return { title: "We couldn't save your availability. Please try again." };

    case "preferences":
      return { title: "We couldn't update your preferences. Please try again." };

    case "push":
      if (lower.includes("denied") || lower.includes("permission"))
        return { title: "Notifications are blocked. Enable them in your browser settings." };
      if (lower.includes("unsupported"))
        return { title: "Notifications aren't supported on this device." };
      return { title: "We couldn't enable notifications. Please try again." };

    case "credits":
      if (lower.includes("not enough") || lower.includes("insufficient"))
        return { title: "Not enough credits. Top up to continue." };
      return { title: "We couldn't complete that action. Please try again." };

    case "generic":
    default:
      return { title: "Something didn't work. Please try again." };
  }
};

/** Convenience: just the title string. */
export const friendlyError = (err: unknown, context: ErrorContext = "generic"): string =>
  friendlyErrorParts(err, context).title;
