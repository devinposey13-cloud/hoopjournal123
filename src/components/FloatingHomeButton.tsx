import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export function FloatingHomeButton() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Don't show on the main dashboard or landing page
  if (location.pathname === '/' || location.pathname === '/dashboard') {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => navigate('/')}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg bg-card border-border hover:bg-primary hover:text-primary-foreground transition-all"
      aria-label="Go to home"
    >
      <Home className="w-5 h-5" />
    </Button>
  );
}
