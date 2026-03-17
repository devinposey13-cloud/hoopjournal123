import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, UserPlus, Loader2, AtSign, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import hoopJournalLogo from '@/assets/hoop-journal-logo-v2.png';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { Separator } from '@/components/ui/separator';
import { isNativeApp } from '@/lib/platform';
import { openOAuthInSystemBrowser } from '@/lib/nativeOAuth';
import {
  logOAuthInit,
  logOAuthError,
  logOAuthSuccess,
  parseOAuthError,
  formatErrorWithCode } from
'@/utils/oauthErrors';

// Normalize phone number to E.164 format (+1XXXXXXXXXX)
const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it starts with 1 and has 11 digits, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If it has 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Return as-is with + prefix if it doesn't match expected formats
  return digits.startsWith('+') ? digits : `+${digits}`;
};

// Validate phone number format
const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11 && digits.startsWith('1');
};

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const googleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (googleTimeoutRef.current) {
        window.clearTimeout(googleTimeoutRef.current);
      }
    };
  }, []);

  // Debug logging for native OAuth diagnosis
  const nativeDetected = isNativeApp();
  console.log('[AuthForm] ===== RENDER DEBUG =====');
  console.log('[AuthForm] isNativeApp():', nativeDetected);
  console.log('[AuthForm] window.Capacitor:', (window as any).Capacitor);
  console.log('[AuthForm] hostname:', window.location.hostname);
  console.log('[AuthForm] origin:', window.location.origin);

  // Clear service worker caches before OAuth to prevent redirect interception
  const clearServiceWorkerCaches = async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        console.log('[OAuth] Cleared all service worker caches');
      } catch (e) {
        console.warn('[OAuth] Failed to clear caches:', e);
      }
    }
  };

  // Detect if running on a custom domain (not lovable infrastructure)
  // Also treat native Capacitor apps as "custom domain" since their origin
  // (capacitor://localhost) can't receive OAuth redirects
  const isCustomDomain =
  isNativeApp() ||
  !window.location.hostname.includes('lovable.app') &&
  !window.location.hostname.includes('lovableproject.com') &&
  window.location.hostname !== 'localhost';

  const LOVABLE_APP_ORIGIN = 'https://hoopjournal123.lovable.app';

  const handleCustomDomainOAuth = async (provider: 'google' | 'apple') => {
    // Best-effort SW cache clear (non-blocking on failure)
    try {await clearServiceWorkerCaches();} catch (_) {}

    const native = isNativeApp();
    const callbackOrigin = native ? LOVABLE_APP_ORIGIN : window.location.origin;
    const redirectUri = `${callbackOrigin}/auth/callback`;
    const brokerUrl = `${LOVABLE_APP_ORIGIN}/~oauth/initiate?provider=${provider}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    console.log(`[OAuth] ===== ${provider.toUpperCase()} OAUTH DEBUG =====`);
    console.log(`[OAuth] isNativeApp(): ${native}`);
    console.log(`[OAuth] isCustomDomain: ${isCustomDomain}`);
    console.log(`[OAuth] callbackOrigin: ${callbackOrigin}`);
    console.log(`[OAuth] redirect_uri: ${redirectUri}`);
    console.log(`[OAuth] brokerUrl: ${brokerUrl}`);
    console.log(`[OAuth] Code path: ${native ? 'NATIVE (system browser)' : 'WEB (window.location redirect)'}`);

    await openOAuthInSystemBrowser(brokerUrl);
  };

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const handleIframePopupOAuth = async (provider: 'google' | 'apple') => {
    await clearServiceWorkerCaches();

    // Redirect popup back to the SAME origin as this iframe so BroadcastChannel works
    const popupRedirectUri = `${window.location.origin}/auth/callback?popup=1&provider=${provider}`;
    const brokerUrl = `${LOVABLE_APP_ORIGIN}/~oauth/initiate?provider=${provider}&redirect_uri=${encodeURIComponent(popupRedirectUri)}`;
    console.log('[OAuth] Popup redirect_uri:', popupRedirectUri);
    console.log('[OAuth] Broker URL:', brokerUrl);
    const popup = window.open(brokerUrl, `hoopjournal_${provider}_oauth`, 'width=520,height=720');

    if (!popup) {
      throw new Error('Popup blocked. Please allow popups and try again.');
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let bc: BroadcastChannel | null = null;

      try {
        bc = new BroadcastChannel('hoopjournal-oauth');
      } catch {
        // BroadcastChannel not supported — rely on postMessage only
      }

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        window.clearInterval(closeWatcher);
        window.clearTimeout(timeoutId);
        try { bc?.close(); } catch { /* ignore */ }
      };

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        try {
          if (!popup.closed) popup.close();
        } catch {
          // Best-effort popup close
        }
        fn();
      };

      const handlePayload = async (payload: {
        type?: string;
        provider?: string;
        error?: string;
        accessToken?: string;
        refreshToken?: string;
      }) => {
        const isExpectedMessage = payload?.type === 'oauth-complete' || payload?.type === 'oauth-error';
        if (!isExpectedMessage || (payload.provider && payload.provider !== provider)) {
          return;
        }

        if (payload.type === 'oauth-error') {
          settle(() => reject(new Error(payload.error || `${provider} sign-in failed.`)));
          return;
        }

        if (!payload.accessToken || !payload.refreshToken) {
          settle(() => reject(new Error(`Missing auth tokens from ${provider} callback.`)));
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: payload.accessToken,
          refresh_token: payload.refreshToken,
        });

        if (sessionError) {
          settle(() => reject(sessionError));
          return;
        }

        settle(() => resolve());
      };

      // Listen via postMessage (works when window.opener is preserved)
      const onMessage = async (event: MessageEvent) => {
        const isAllowedOrigin = [window.location.origin, LOVABLE_APP_ORIGIN].includes(event.origin);
        if (!isAllowedOrigin) return;
        await handlePayload(event.data);
      };
      window.addEventListener('message', onMessage);

      // Listen via BroadcastChannel (fallback when window.opener is lost after cross-origin nav)
      if (bc) {
        bc.onmessage = async (event: MessageEvent) => {
          console.log('[OAuth] Received token via BroadcastChannel');
          await handlePayload(event.data);
        };
      }

      const closeWatcher = window.setInterval(() => {
        if (popup.closed) {
          // Give BroadcastChannel a moment to deliver before failing
          setTimeout(() => {
            if (!settled) {
              settle(() => reject(new Error(`${provider} sign-in was closed before completion.`)));
            }
          }, 1000);
          window.clearInterval(closeWatcher);
        }
      }, 500);

      const timeoutId = window.setTimeout(() => {
        settle(() => reject(new Error(`${provider} sign-in timed out. Please try again.`)));
      }, 120000);
    });
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const redirectUri = LOVABLE_APP_ORIGIN;

    logOAuthInit('google', redirectUri);

    try {
      // Native (Despia) app: use system browser OAuth flow
      // Note: We do NOT use the Capacitor Google Auth SDK here because
      // Despia is not a Capacitor runtime and the plugin won't work.
      if (isNativeApp()) {
        googleTimeoutRef.current = window.setTimeout(() => {
          setGoogleLoading(false);
          toast.error('Google sign-in took too long. Please try again.');
        }, 25000);

        try {
          await handleCustomDomainOAuth('google');
        } catch {
          if (googleTimeoutRef.current) {
            window.clearTimeout(googleTimeoutRef.current);
            googleTimeoutRef.current = null;
          }
          setGoogleLoading(false);
        }
        return;
      }

      // Preview iframe flow: complete OAuth in popup and hydrate session in the opener
      if (isInIframe) {
        await handleIframePopupOAuth('google');
        logOAuthSuccess('google');
        setGoogleLoading(false);
        return;
      }

      if (isCustomDomain) {
        try {
          await handleCustomDomainOAuth('google');
        } catch {
          setGoogleLoading(false);
        }
        return;
      }

      await clearServiceWorkerCaches();

      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri
      });

      if (error) {
        throw error;
      }

      logOAuthSuccess('google');
    } catch (error: unknown) {
      const parsedError = parseOAuthError(error);
      logOAuthError('google', parsedError);
      toast.error(formatErrorWithCode(parsedError));
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const redirectUri = LOVABLE_APP_ORIGIN;

    logOAuthInit('apple', redirectUri);

    try {
      if (!isNativeApp() && isInIframe) {
        await handleIframePopupOAuth('apple');
        logOAuthSuccess('apple');
        setAppleLoading(false);
        return;
      }

      if (isCustomDomain) {
        try {
          await handleCustomDomainOAuth('apple');
        } catch {
          setAppleLoading(false);
        }
        return;
      }

      await clearServiceWorkerCaches();

      const { error } = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: redirectUri
      });

      if (error) {
        throw error;
      }

      logOAuthSuccess('apple');
    } catch (error: unknown) {
      const parsedError = parseOAuthError(error);
      logOAuthError('apple', parsedError);
      toast.error(formatErrorWithCode(parsedError));
      setAppleLoading(false);
    }
  };

  const validateUsername = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setUsername(cleaned);

    if (cleaned.length < 3) {
      setUsernameError('Username must be at least 3 characters');
    } else if (cleaned.length > 20) {
      setUsernameError('Username must be 20 characters or less');
    } else {
      setUsernameError('');
    }
  };

  const checkUsernameAvailable = async (usernameToCheck: string): Promise<boolean> => {
    const { data } = await (supabase as any).
    from('player_settings').
    select('username').
    eq('username', usernameToCheck).
    maybeSingle();
    return !data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate phone number if using phone auth
      if (authMethod === 'phone' && !isValidPhoneNumber(phone)) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      const identifier = authMethod === 'email' ? email : normalizePhoneNumber(phone);

      if (isLogin) {
        const { error } = await signIn({ identifier, password, method: authMethod });
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        // Validate username
        if (username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }

        // Check if username is available
        const isAvailable = await checkUsernameAvailable(username);
        if (!isAvailable) {
          throw new Error('Username is already taken');
        }

        const { error, data } = await signUp({ identifier, password, method: authMethod });
        if (error) throw error;

        // Check approval mode from feature flags
        let approvalMode = 'automatic';
        if (data.user) {
          try {
            const { data: flagData } = await supabase
              .from('feature_flags')
              .select('flag_value')
              .eq('flag_key', 'user_approval_mode')
              .eq('is_enabled', true)
              .maybeSingle();
            if (flagData?.flag_value) {
              approvalMode = flagData.flag_value;
            }
          } catch {
            // Default to automatic if flag check fails
          }

          const shouldAutoApprove = approvalMode === 'automatic' || approvalMode === 'conditional';
          const approvalMethod = shouldAutoApprove ? 'auto' : 'manual';

          const settingsData: any = {
            user_id: data.user.id,
            username: username.toLowerCase(),
            name: 'Player Name',
            team: 'Team Name',
            position: 'Guard',
            number: 0,
            height: "5'8\"",
            grade: '1st Grade',
            is_approved: shouldAutoApprove
          };

          // Store phone number in player_settings if using phone auth
          if (authMethod === 'phone') {
            settingsData.phone = normalizePhoneNumber(phone);
          }

          const { error: settingsError } = await supabase
            .from('player_settings')
            .insert(settingsData);

          if (settingsError) {
            console.error('Error creating profile:', settingsError);
          }

          // Create approval request for admin visibility
          const { error: approvalError } = await supabase
            .from('account_approval_requests')
            .insert({
              user_id: data.user.id,
              email: authMethod === 'email' ? identifier : null,
              username: username.toLowerCase(),
              status: shouldAutoApprove ? 'approved' : 'pending',
              approval_method: approvalMethod
            } as any);

          if (approvalError) {
            console.error('Error creating approval request:', approvalError);
          }

          // Notify admin of new signup
          try {
            await supabase.functions.invoke('notify-admin-signup', {
              body: {
                username: username.toLowerCase(),
                email: authMethod === 'email' ? identifier : null
              }
            });
          } catch (notifyError) {
            // Don't block signup if notification fails
            console.error('Error sending admin notification:', notifyError);
          }
        }

        toast.success(approvalMode === 'manual' ? 'Account created! Awaiting admin approval.' : 'Account created! Welcome aboard! 🏀');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="stat-card">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-glow">
              <img src={hoopJournalLogo} alt="Hoop Journal" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-bold text-foreground text-4xl">Hoop Journal™</h1>
            <p
              className="text-muted-foreground mt-1 text-2xl uppercase tracking-wide"
              style={{ fontFamily: "'Teko', sans-serif", fontWeight: 600 }}>
              
              {isLogin ? 'Track Your Game. Improve Every Day.' : 'Create your account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Auth Method Toggle */}
            <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'email' | 'phone')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" disabled className="flex items-center gap-2 opacity-50 cursor-not-allowed" title="Coming soon">
                  <Phone className="w-4 h-4" />
                  Phone
                  <span className="text-[10px] text-muted-foreground">(Soon)</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {!isLogin &&
            <div className="space-y-2">
                <Label htmlFor="username">
                  Username
                  <span className="text-muted-foreground text-xs ml-1">(your public profile URL)</span>
                </Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => validateUsername(e.target.value)}
                  placeholder="username"
                  className="pl-9"
                  required={!isLogin}
                  maxLength={20} />
                
                </div>
                {usernameError &&
              <p className="text-xs text-destructive">{usernameError}</p>
              }
                {username.length >= 3 && !usernameError &&
              <p className="text-xs text-muted-foreground">
                    Your profile: hoopjournal.me/{username}
                  </p>
              }
              </div>
            }

            {authMethod === 'email' ?
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required={authMethod === 'email'} />
              
              </div> :

            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                required={authMethod === 'phone'} />
              
                <p className="text-xs text-muted-foreground">
                  Enter your 10-digit US phone number
                </p>
              </div>
            }

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={password ? '' : '••••••••'}
                  required
                  minLength={6}
                  onFocus={(e) => { if (!password) e.target.placeholder = ''; }}
                  onBlur={(e) => { if (!password) e.target.placeholder = '••••••••'; }}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary font-semibold">
              
              {loading ?
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
              isLogin ?
              <LogIn className="w-4 h-4 mr-2" /> :

              <UserPlus className="w-4 h-4 mr-2" />
              }
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              or continue with
            </span>
          </div>

          {/* Social Sign In Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full">
              
              {googleLoading ?
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :

              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                
                  <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                
                  <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                
                  <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                
                </svg>
              }
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleAppleSignIn}
              disabled={appleLoading}
              className="w-full">
              
              {appleLoading ?
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :

              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              }
              Continue with Apple
            </Button>
          </div>

          {/* Forgot Password - only show on login */}
          {isLogin &&
          <div className="mt-4 text-center">
              <ForgotPasswordDialog
              trigger={
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 transition-colors">
                
                    Forgot your password?
                  </button>
              } />
            
            </div>
          }

          {/* Toggle */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors">
              
              {isLogin ?
              "Don't have an account? Sign up" :
              'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>);

}