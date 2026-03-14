import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import hoopJournalLogo from '@/assets/hoop-journal-logo-v2.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const token = searchParams.get('token');

  useEffect(() => {
    const validateToken = async () => {
      // If no token in URL, check for Supabase session (legacy flow fallback)
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidToken(true);
          setValidating(false);
          return;
        }
        setIsValidToken(false);
        setErrorMessage('Invalid or expired link');
        setValidating(false);
        return;
      }

      // Validate custom token via edge function
      try {
        const response = await supabase.functions.invoke('validate-reset-token', {
          body: { token },
        });

        if (response.error || !response.data?.valid) {
          setIsValidToken(false);
          setErrorMessage(response.data?.error || 'Invalid or expired reset link');
        } else {
          setIsValidToken(true);
          setUserEmail(response.data.email);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setIsValidToken(false);
        setErrorMessage('Failed to validate reset link');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // If we have a custom token, use edge function to update password
      if (token) {
        const response = await supabase.functions.invoke('validate-reset-token', {
          body: { token, newPassword: password },
        });

        if (response.error || !response.data?.success) {
          throw new Error(response.data?.error || 'Failed to update password');
        }
      } else {
        // Legacy Supabase flow fallback
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }

      setSuccess(true);
      toast.success('Password updated successfully!');
      
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while validating token
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error if token is invalid
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="stat-card text-center">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-glow">
              <img src={hoopJournalLogo} alt="Hoop Journal" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Invalid or Expired Link</h1>
            <p className="text-muted-foreground mb-6">
              {errorMessage || 'This password reset link is invalid or has expired. Please request a new one.'}
            </p>
            <Button onClick={() => navigate('/')} className="gradient-primary">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="stat-card text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Password Updated!</h1>
            <p className="text-muted-foreground">
              Redirecting you to the app...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="stat-card">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-glow">
              <img src={hoopJournalLogo} alt="Hoop Journal" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
            <p className="text-muted-foreground mt-1">
              Enter your new password below
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary font-semibold"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
