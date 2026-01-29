import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { FloatingHomeButton } from "@/components/FloatingHomeButton";
import Index from "./pages/Index";
import GameDetail from "./pages/GameDetail";
import PublicProfile from "./pages/PublicProfile";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <FloatingHomeButton />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/game/:id" element={<GameDetail />} />
            <Route path="/game/scheduled/:scheduledId" element={<GameDetail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/:username" element={<PublicProfile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
