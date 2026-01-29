import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, UserPlus, Loader2, AtSign, Mail, Phone } from 'lucide-react';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
};

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

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
        
        // Create player settings with username and phone if applicable
        if (data.user) {
          const settingsData: any = {
            user_id: data.user.id,
            username: username.toLowerCase(),
            name: 'Player Name',
            team: 'Team Name',
            position: 'Guard',
            number: 23,
            height: "5'8\"",
            grade: '8th Grade',
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
        }
        
        toast.success('Account created! You can now log in.');
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
            <h1 className="text-2xl font-bold text-foreground">Hoop Journal</h1>
            <p className="text-muted-foreground mt-1">
              {isLogin ? 'Sign in to track your season' : 'Create your account'}
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
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
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
                {usernameError && (
                  <p className="text-xs text-destructive">{usernameError}</p>
                )}
                {username.length >= 3 && !usernameError && (
                  <p className="text-xs text-muted-foreground">
                    Your profile: hoopjournal.me/{username}
                  </p>
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
                <p className="text-xs text-muted-foreground">
                  Enter your 10-digit US phone number
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary font-semibold"
            >
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

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
