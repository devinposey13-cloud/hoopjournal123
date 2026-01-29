import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Mail, Phone, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Cloudflare Turnstile site key (public)
const TURNSTILE_SITE_KEY = '0x4AAAAAABfDNkOl_G_eo8Y5';

interface ForgotPasswordDialogProps {
  trigger: React.ReactNode;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Load Turnstile script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.onload = () => setTurnstileLoaded(true);
      document.head.appendChild(script);
    } else if (window.turnstile) {
      setTurnstileLoaded(true);
    }
  }, []);

  // Render Turnstile widget when phone tab is active and dialog is open
  useEffect(() => {
    if (open && method === 'phone' && turnstileLoaded && turnstileContainerRef.current && !requestSent) {
      // Clear any existing widget
      if (turnstileWidgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
        } catch (e) {
          // Widget might already be removed
        }
      }
      
      // Small delay to ensure container is mounted
      const timeout = setTimeout(() => {
        if (window.turnstile && turnstileContainerRef.current) {
          turnstileWidgetId.current = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => {
              setTurnstileToken(token);
            },
            'error-callback': () => {
              setTurnstileToken(null);
              toast.error('CAPTCHA verification failed. Please try again.');
            },
            'expired-callback': () => {
              setTurnstileToken(null);
            },
            theme: 'auto',
            size: 'normal',
          });
        }
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [open, method, turnstileLoaded, requestSent]);

  // Cleanup widget on close
  useEffect(() => {
    if (!open && turnstileWidgetId.current && window.turnstile) {
      try {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      } catch (e) {
        // Widget might already be removed
      }
    }
  }, [open]);

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

  const handlePhoneResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!turnstileToken) {
      toast.error('Please complete the CAPTCHA verification');
      return;
    }

    setLoading(true);

    try {
      const response = await supabase.functions.invoke('password-reset-request', {
        body: {
          phone,
          playerName: playerName || undefined,
          turnstileToken,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to submit reset request');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setRequestSent(true);
      toast.success('Password reset request sent to admin!');
    } catch (error: any) {
      console.error('Error creating reset request:', error);
      toast.error(error.message || 'Failed to submit reset request');
      
      // Reset Turnstile on error
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId.current);
        setTurnstileToken(null);
      }
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
      setTurnstileToken(null);
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
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps the admin identify your account
                  </p>
                </div>
                
                {/* Turnstile CAPTCHA Widget */}
                <div className="flex justify-center">
                  <div ref={turnstileContainerRef} />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !turnstileToken}
                >
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
