import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { captureReferralFromUrl } from "@/lib/referrals";
import { trackSessionOpen } from "@/lib/analyticsStore";
import { captureEmailEventId, trackEmailConversion } from "@/lib/emailConversion";
import { installDevClickLogger } from "@/lib/devClickLogger";
import { installConsoleErrorRecorder } from "@/lib/consoleErrorRecorder";
import AppHooks from "@/components/AppHooks";
import Celebration from "@/components/Celebration";
import DevBuildLabel from "@/components/DevBuildLabel";
import SafePublishLauncher from "@/components/SafePublishLauncher";
import FirstReplyListener from "@/components/FirstReplyListener";
import FirstSwapCompletedToast from "@/components/FirstSwapCompletedToast";
import InvitePromptToast from "@/components/InvitePromptToast";
import PaywallMount from "@/components/PaywallMount";

import AuthLoadingScreen from "@/components/AuthLoadingScreen";
import RouteFallback from "@/components/RouteFallback";
import RequireAuth from "@/components/RequireAuth";
import PublicOnly from "@/components/PublicOnly";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

// Eager: first paint targets only. Welcome + HomePage cover the cold-start
// flows; everything else is split into its own chunk so the initial JS
// payload stays tiny and TTI is fast on 3G/mid-tier mobile.
import Welcome from "./pages/Welcome";
import HomePage from "./pages/HomePage";

// Code-split routes — each becomes its own chunk and only downloads on demand.
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const WelcomeNew = lazy(() => import("./pages/WelcomeNew"));
const Discover = lazy(() => import("./pages/Discover"));
const Activity = lazy(() => import("./pages/Activity"));
// Inbox = helper care-request inbox (accept/decline). Chat = real-time messaging UI.
const Inbox = lazy(() => import("./pages/Inbox"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const SubscriptionCancelled = lazy(() => import("./pages/SubscriptionCancelled"));
const Support = lazy(() => import("./pages/Support"));
const Legal = lazy(() => import("./pages/Legal"));
const PrivacyPage = lazy(() => import("./pages/public/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/public/TermsPage"));
const SupportPage = lazy(() => import("./pages/public/SupportPage"));
const SafetyCenter = lazy(() => import("./pages/SafetyCenter"));
const DataUsage = lazy(() => import("./pages/DataUsage"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const Credits = lazy(() => import("./pages/Credits"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const VerifyIdentity = lazy(() => import("./pages/VerifyIdentity"));
const AdminVerifications = lazy(() => import("./pages/AdminVerifications"));
const AdminEmails = lazy(() => import("./pages/AdminEmails"));
const AdminRoles = lazy(() => import("./pages/AdminRoles"));
const BookingRedirect = lazy(() => import("./pages/BookingRedirect"));
const SafePublish = lazy(() => import("./pages/SafePublish"));
const OAuthDiagnostics = lazy(() => import("./pages/OAuthDiagnostics"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const ReviewRedirect = lazy(() => import("./pages/ReviewRedirect"));
const InviteLanding = lazy(() => import("./pages/InviteLanding"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Schedule background prefetch of the routes most likely to be tapped next.
 * Runs after first paint, when the main thread is idle, so it never
 * competes with the initial render.
 */
const prefetchHotRoutes = () => {
  const idle =
    (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback ??
    ((cb: () => void) => window.setTimeout(cb, 1500));
  idle(() => {
    void import("./pages/Inbox");
    void import("./pages/Profile");
  }, { timeout: 3000 });
};

const RootRedirect = () => {
  const { session, loading, initialized } = useAuth();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data?.session?.user) {
        window.location.replace("/home");
        return;
      }
      setCheckingSession(false);
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !initialized || checkingSession) return <AuthLoadingScreen />;
  return <Navigate to={session ? "/home" : "/auth"} replace />;
};

const AuthReadyRoutes = () => {
  const { loading, initialized } = useAuth();
  if (loading || !initialized) return <AuthLoadingScreen />;

  return (
    <>
      <AppHooks />
      <FirstReplyListener />
      <FirstSwapCompletedToast />
      <InvitePromptToast />
      
      <PaywallMount />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/index" element={<RootRedirect />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/auth" element={<PublicOnly><Auth /></PublicOnly>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/help" element={<Support />} />
          <Route path="/legal/privacy" element={<Legal />} />
          <Route path="/legal/terms" element={<Legal />} />
          <Route path="/legal/guidelines" element={<Legal />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/invite/:code" element={<InviteLanding />} />

          {/* Protected routes — all require an authenticated session */}
          <Route path="/welcome-new" element={<RequireAuth><WelcomeNew /></RequireAuth>} />
          <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/home" element={<RequireAuth><HomePage /></RequireAuth>} />
          <Route path="/explore" element={<RequireAuth><Discover /></RequireAuth>} />
          <Route path="/activity" element={<RequireAuth><Activity /></RequireAuth>} />
          <Route path="/credits" element={<RequireAuth><Credits /></RequireAuth>} />
          <Route path="/inbox" element={<RequireAuth><Inbox /></RequireAuth>} />
          <Route path="/bookings/:id" element={<RequireAuth><BookingRedirect /></RequireAuth>} />
          <Route path="/booking/:id" element={<RequireAuth><BookingRedirect /></RequireAuth>} />
          <Route path="/reviews/:bookingId" element={<RequireAuth><ReviewRedirect /></RequireAuth>} />
          <Route path="/analytics" element={<RequireAuth><AnalyticsDashboard /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="/messages" element={<RequireAuth><Chat /></RequireAuth>} />
          <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
          <Route path="/chat/:userId" element={<RequireAuth><Chat /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/profile/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
          <Route path="/profiles/:id" element={<RequireAuth><PublicProfile /></RequireAuth>} />
          <Route path="/subscription" element={<RequireAuth><Subscription /></RequireAuth>} />
          <Route path="/subscription-success" element={<RequireAuth><SubscriptionSuccess /></RequireAuth>} />
          <Route path="/subscription-cancelled" element={<SubscriptionCancelled />} />
          <Route path="/safety" element={<RequireAuth><SafetyCenter /></RequireAuth>} />
          <Route path="/data-usage" element={<RequireAuth><DataUsage /></RequireAuth>} />
          <Route path="/admin/reports" element={<RequireAuth><AdminReports /></RequireAuth>} />
          <Route path="/admin/verifications" element={<RequireAuth><AdminVerifications /></RequireAuth>} />
          <Route path="/admin/emails" element={<RequireAuth><AdminEmails /></RequireAuth>} />
          <Route path="/admin/roles" element={<RequireAuth><AdminRoles /></RequireAuth>} />
          <Route path="/verify-identity" element={<RequireAuth><VerifyIdentity /></RequireAuth>} />
          {/* Publish dashboard available in production too, but admin-gated inside the page */}
          <Route path="/dev/publish" element={<RequireAuth><SafePublish /></RequireAuth>} />
          <Route path="/dev/oauth-diagnostics" element={<OAuthDiagnostics />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => {
  useEffect(() => {
    captureReferralFromUrl();
    captureEmailEventId();
    // If the user landed from an email click (?e=&cta=), record conversion immediately.
    try {
      const p = new URLSearchParams(window.location.search);
      const cta = p.get('cta');
      if (p.get('e') && cta) void trackEmailConversion(cta);
    } catch { /* noop */ }
    trackSessionOpen();
    installDevClickLogger();
    installConsoleErrorRecorder();
    prefetchHotRoutes();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Celebration />
            <DevBuildLabel />
            <SafePublishLauncher />
            <AuthReadyRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
