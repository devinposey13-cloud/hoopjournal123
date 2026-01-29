import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Mail, Phone, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ForgotPasswordDialogProps {
  trigger: React.ReactNode;
}

export function ForgotPasswordDialog({ trigger }: ForgotPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const normalizePhoneNumber = (input: string): string => {
    const digits = input.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    if (input.startsWith('+')) {
      return `+${digits}`;
    }
    return input;
  };

  const handlePhoneResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      
      // Look up the user by phone number in player_settings
      const { data: playerData } = await supabase
        .from('player_settings')
        .select('user_id, name')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      // Create a password reset request
      const { error } = await supabase
        .from('password_reset_requests')
        .insert({
          user_id: playerData?.user_id || null,
          phone: normalizedPhone,
          player_name: playerData?.name || playerName || null,
          status: 'pending'
        });

      if (error) throw error;

      setRequestSent(true);
      toast.success('Password reset request sent to admin!');
    } catch (error: any) {
      console.error('Error creating reset request:', error);
      toast.error(error.message || 'Failed to submit reset request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setEmail('');
      setPhone('');
      setPlayerName('');
      setEmailSent(false);
      setRequestSent(false);
      setMethod('email');
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Choose how you signed up to reset your password
          </DialogDescription>
        </DialogHeader>

        <Tabs value={method} onValueChange={(v) => setMethod(v as 'email' | 'phone')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            {emailSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Check your email</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We sent a password reset link to <strong>{email}</strong>
                </p>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleEmailReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="phone" className="mt-4">
            {requestSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Request Sent!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  An admin will review your request and contact you with a new password.
                </p>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePhoneResetRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-phone">Phone number</Label>
                  <Input
                    id="reset-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the phone number you used to sign up
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-name">Your name (optional)</Label>
                  <Input
                    id="reset-name"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Player name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps the admin identify your account
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Request Password Reset
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  An admin will contact you with your new password
                </p>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
