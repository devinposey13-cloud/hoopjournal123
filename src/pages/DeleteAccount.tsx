import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Loader2, Trash2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from '@/components/AuthForm';

export default function DeleteAccount() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (confirmText === 'DELETE' && !isDeleting) {
      setCountdown(5);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [confirmText, isDeleting]);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Not authenticated'); return; }

      const { data, error } = await supabase.functions.invoke('delete-own-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to delete account');

      await supabase.auth.signOut();
      setDeleted(true);
      toast.success('Account deleted successfully');
    } catch (err: any) {
      console.error('Error deleting account:', err);
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl">Account Deleted</CardTitle>
            <CardDescription>Your account and all associated data have been permanently deleted.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">🏀 Hoop Journal</h1>
          <p className="text-muted-foreground text-sm">Account Deletion</p>
        </div>

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LogIn className="h-5 w-5" /> Sign in to continue
              </CardTitle>
              <CardDescription>
                Please sign in to the account you want to delete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Delete Your Account
              </CardTitle>
              <CardDescription>
                This will <strong>permanently delete</strong> your account and all associated data including games, stats, clips, milestones, and settings. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Signed in as <strong>{user.email}</strong>
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Type <span className="font-mono text-destructive">DELETE</span> to confirm
                </label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="font-mono"
                />
              </div>

              <Button
                variant="destructive"
                className="w-full"
                disabled={confirmText !== 'DELETE' || isDeleting || (countdown !== null && countdown > 0)}
                onClick={handleDelete}
              >
                {isDeleting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</>
                ) : countdown !== null && countdown > 0 ? (
                  `Confirm in ${countdown}s...`
                ) : (
                  <><Trash2 className="h-4 w-4 mr-2" /> Permanently Delete Account</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
