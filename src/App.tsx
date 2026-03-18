import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { PlanContext, usePlanState } from "@/hooks/usePlanState";
import { GlobalPaywall } from "@/components/paywall/GlobalPaywall";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { isNativeApp } from "@/lib/platform";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Index from "./pages/Index";
import GameDetail from "./pages/GameDetail";
import PublicProfile from "./pages/PublicProfile";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import Upgrade from "./pages/Upgrade";
import OnboardingFinish from "./pages/OnboardingFinish";
import Rewards from "./pages/Rewards";
import RingOfHonor from "./pages/RingOfHonor";
import Log from "./pages/Log";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import OAuthCallback from "./pages/OAuthCallback";
import ParentDashboard from "./pages/ParentDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient();

// Check for OAuth errors in URL on app load
function OAuthErrorHandler() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get('error') || new URLSearchParams(url.hash.slice(1)).get('error');
    const errorDesc = url.searchParams.get('error_description') || new URLSearchParams(url.hash.slice(1)).get('error_description');
    if (error) {
      console.error('[OAuth] URL error:', error, errorDesc);
      setTimeout(() => {
        toast.error(errorDesc || error || 'Sign-in failed');
      }, 100);
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);
  
  return null;
}

// Initialize native Google Auth on startup
function NativeAuthInitializer() {
  useEffect(() => {
    if (!isNativeApp()) return;
    console.log('[NativeAuth] Initializing native Google Auth SDK');
    import('@/lib/nativeGoogleAuth').then(({ initNativeGoogleAuth }) => {
      initNativeGoogleAuth();
    }).catch(err => {
      console.warn('[NativeAuth] Failed to init native Google Auth:', err);
    });
  }, []);
  
  return null;
}


function PlanProvider({ children }: { children: React.ReactNode }) {
  const planState = usePlanState();
  return <PlanContext.Provider value={planState}>{children}</PlanContext.Provider>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        <PlanProvider>
          <ProfileProvider>
            <TooltipProvider>
              <OfflineIndicator />
              <Toaster />
              <Sonner />
              <OAuthErrorHandler />
              <NativeAuthInitializer />
              <BrowserRouter>
                <GlobalPaywall />
                
                <Routes>
                  <Route path="/auth/callback" element={<OAuthCallback />} />
                  
                  <Route path="/" element={<Index />} />
                  <Route path="/log" element={<Log />} />
                  <Route path="/log/:subTab" element={<Log />} />
                  <Route path="/progress" element={<Progress />} />
                  <Route path="/progress/:subTab" element={<Progress />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/settings/billing" element={<Billing />} />
                  <Route path="/upgrade" element={<Upgrade />} />
                  <Route path="/onboarding/finish" element={<OnboardingFinish />} />
                  <Route path="/onboarding/pricing-preview" element={<OnboardingFinish />} />
                  <Route path="/rewards" element={<Rewards />} />
                  <Route path="/ring-of-honor" element={<RingOfHonor />} />
                  <Route path="/game/:id" element={<GameDetail />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/game/scheduled/:scheduledId" element={<GameDetail />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/parent/:token" element={<ParentDashboard />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/:username" element={<PublicProfile />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ProfileProvider>
        </PlanProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
