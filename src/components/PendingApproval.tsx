import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingApprovalProps {
  onRefresh: () => void;
}

export function PendingApproval({ onRefresh }: PendingApprovalProps) {
  const { signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Re-check approval status
      onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-glow">
            <img src={hoopJournalLogo} alt="Hoop Journal" className="w-full h-full object-cover" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Account Pending Approval
          </CardTitle>
          <CardDescription>
            Your account is awaiting admin approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <p className="text-sm text-center text-muted-foreground">
              We're currently in a trial period and manually reviewing all new accounts. 
              You'll receive access once an admin approves your registration.
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Check Status
            </Button>
            <Button 
              variant="ghost" 
              className="flex-1"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Questions? Contact us for assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
