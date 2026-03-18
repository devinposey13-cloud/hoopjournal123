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
import { isNativeApp, getPlatform, isDespiaIOS } from '@/lib/platform';
import { openOAuthInSystemBrowser } from '@/lib/nativeOAuth';
import { signInWithAppleNative, isAppleJSAvailable } from '@/lib/apple-auth';

const CUSTOM_DOMAIN_ORIGIN = 'https://hoopjournal.me';
const PUBLISHED_ORIGIN = 'https://hoopjournal123.lovable.app';

const isCustomDomain = () =>
  !window.location.hostname.includes('lovable.app') &&
  !window.location.hostname.includes('lovableproject.com') &&
  window.location.hostname !== 'localhost';

const getDirectOAuthUrl = async (
  provider: 'google' | 'apple',
  redirectTo: string
): Promise<string> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('No OAuth URL returned from backend');
  return data.url;
};

// Normalize phone number to E.164 format (+1XXXXXXXXXX)
const normalizePhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return digits.startsWith('+') ? digits : `+${digits}`;
};

const isValidPhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
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
      if (googleTimeoutRef.current) window.clearTimeout(googleTimeoutRef.current);
    };
  }, []);

  // Reset loading when session arrives
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        if (googleTimeoutRef.current) {
          window.clearTimeout(googleTimeoutRef.current);
          googleTimeoutRef.current = null;
        }
        setGoogleLoading(false);
        setAppleLoading(false);
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  // ─── Google Sign-In ───────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const platform = getPlatform();
    console.log(`[Auth:Google] Platform: ${platform}, isNative: ${isNativeApp()}`);

    try {
      if (isNativeApp()) {
        // ── DESPIA NATIVE: Open system browser via Despia bridge ──
        const redirectTo = `${CUSTOM_DOMAIN_ORIGIN}/auth/callback`;
        console.log(`[Auth:Google] Despia native flow, redirectTo: ${redirectTo}`);

        googleTimeoutRef.current = window.setTimeout(() => {
          setGoogleLoading(false);
          toast.error('Google sign-in took too long. Please try again.');
        }, 30000);

        const oauthUrl = await getDirectOAuthUrl('google', redirectTo);
        console.log(`[Auth:Google] OAuth URL generated, opening in system browser`);
        await openOAuthInSystemBrowser(oauthUrl);
        return;
      }

      // ── WEB: Use Lovable managed OAuth ──
      console.log('[Auth:Google] Web flow via lovable.auth');
      const redirectUri = isCustomDomain()
        ? `${window.location.origin}/auth/callback`
        : window.location.origin;
      console.log(`[Auth:Google] Redirect URI: ${redirectUri}`);

      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: redirectUri,
        extraParams: { prompt: 'select_account' },
      });

      if (error) throw error;
    } catch (error: unknown) {
      console.error('[Auth:Google] Sign-in error:', error);
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      toast.error(message);
      setGoogleLoading(false);
    }
  };

  // ─── Apple Sign-In ────────────────────────────────────────────────
  const handleAppleSignIn = async () => {
    setAppleLoading(true);

    try {
      // ── iOS NATIVE: Use Apple JS SDK for native Face ID / Touch ID dialog ──
      if (isDespiaIOS() && isAppleJSAvailable()) {
        console.log('[Auth:Apple] iOS native — using Apple JS SDK');
        await signInWithAppleNative();
        // Session is set automatically by signInWithIdToken
        return;
      }

      // ── WEB: Use Lovable managed OAuth ──
      if (!isNativeApp()) {
        console.log('[Auth:Apple] Web flow via lovable.auth');
        const redirectUri = isCustomDomain()
          ? `${window.location.origin}/auth/callback`
          : window.location.origin;

        const { error } = await lovable.auth.signInWithOAuth('apple', {
          redirect_uri: redirectUri,
        });

        if (error) throw error;
        return;
      }

      // ── ANDROID NATIVE / FALLBACK: Use OAuth redirect via system browser ──
      console.log('[Auth:Apple] Native fallback — OAuth redirect');
      const redirectTo = `${PUBLISHED_ORIGIN}/auth/callback`;
      const oauthUrl = await getDirectOAuthUrl('apple', redirectTo);
      await openOAuthInSystemBrowser(oauthUrl);
    } catch (error: unknown) {
      console.error('[Auth:Apple] Sign-in error:', error);
      const message = error instanceof Error ? error.message : 'Apple sign-in failed';
      if (message !== 'Sign in cancelled') {
        toast.error(message);
      }
    } finally {
      setAppleLoading(false);
    }
  };

  // ─── Username validation ──────────────────────────────────────────
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
    const { data } = await (supabase as any)
      .from('player_settings')
      .select('username')
      .eq('username', usernameToCheck)
      .maybeSingle();
    return !data;
  };

  // ─── Email/Phone form submit ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMethod === 'phone' && !isValidPhoneNumber(phone)) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      const identifier = authMethod === 'email' ? email : normalizePhoneNumber(phone);

      if (isLogin) {
        const { error } = await signIn({ identifier, password, method: authMethod });
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        if (username.length < 3) throw new Error('Username must be at least 3 characters');
        const isAvailable = await checkUsernameAvailable(username);
        if (!isAvailable) throw new Error('Username is already taken');

        const { error, data } = await signUp({ identifier, password, method: authMethod });
        if (error) throw error;

        let approvalMode = 'automatic';
        if (data.user) {
          try {
            const { data: flagData } = await supabase
              .from('feature_flags')
              .select('flag_value')
              .eq('flag_key', 'user_approval_mode')
              .eq('is_enabled', true)
              .maybeSingle();
            if (flagData?.flag_value) approvalMode = flagData.flag_value;
          } catch { /* default to automatic */ }

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
            is_approved: shouldAutoApprove,
          };

          if (authMethod === 'phone') {
            settingsData.phone = normalizePhoneNumber(phone);
          }

          const { error: settingsError } = await supabase.from('player_settings').insert(settingsData);
          if (settingsError) console.error('Error creating profile:', settingsError);

          const { error: approvalError } = await supabase
            .from('account_approval_requests')
            .insert({
              user_id: data.user.id,
              email: authMethod === 'email' ? identifier : null,
              username: username.toLowerCase(),
              status: shouldAutoApprove ? 'approved' : 'pending',
              approval_method: approvalMethod,
            } as any);
          if (approvalError) console.error('Error creating approval request:', approvalError);

          try {
            await supabase.functions.invoke('notify-admin-signup', {
              body: { username: username.toLowerCase(), email: authMethod === 'email' ? identifier : null },
            });
          } catch (notifyError) {
            console.error('Error sending admin notification:', notifyError);
          }
        }

        toast.success(
          approvalMode === 'manual'
            ? 'Account created! Awaiting admin approval.'
            : 'Account created! Welcome aboard! 🏀'
        );
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
              style={{ fontFamily: "'Teko', sans-serif", fontWeight: 600 }}
            >
              {isLogin ? 'Track Your Game. Improve Every Day.' : 'Create your account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {!isLogin && (
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
                    maxLength={20}
                  />
                </div>
                {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                {username.length >= 3 && !usernameError && (
                  <p className="text-xs text-muted-foreground">Your profile: hoopjournal.me/{username}</p>
                )}
              </div>
            )}

            {authMethod === 'email' ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required={authMethod === 'email'}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  required={authMethod === 'phone'}
                />
                <p className="text-xs text-muted-foreground">Enter your 10-digit US phone number</p>
              </div>
            )}

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

            <Button type="submit" disabled={loading} className="w-full gradient-primary font-semibold">
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : isLogin ? (
                <LogIn className="w-4 h-4 mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
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

          {/* Social Sign In */}
          <div className="space-y-3">
            <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={googleLoading} className="w-full">
              {googleLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Continue with Google
            </Button>

            <Button type="button" variant="outline" onClick={handleAppleSignIn} disabled={appleLoading} className="w-full">
              {appleLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              Continue with Apple
            </Button>
          </div>

          {/* Forgot Password */}
          {isLogin && (
            <div className="mt-4 text-center">
              <ForgotPasswordDialog
                trigger={
                  <button type="button" className="text-sm text-primary hover:text-primary/80 transition-colors">
                    Forgot your password?
                  </button>
                }
              />
            </div>
          )}

          {/* Toggle */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
