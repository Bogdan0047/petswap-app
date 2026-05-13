import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AuthLoadingScreen from "@/components/AuthLoadingScreen";

/**
 * Wrap public-only routes (e.g. /auth) so that already-signed-in users are
 * redirected straight into the app instead of seeing the login form.
 *
 * IMPORTANT: while AuthProvider is still resolving the session we render the
 * splash, never the login form — otherwise refreshing /auth flashes login
 * for a returning user.
 */
const PublicOnly = ({ children }: { children: ReactNode }) => {
  const { session, loading, initialized } = useAuth();

  if (loading || !initialized) return <AuthLoadingScreen />;

  if (session) {
    return <Navigate to="/home" replace />;
  }
  return <>{children}</>;
};

export default PublicOnly;
