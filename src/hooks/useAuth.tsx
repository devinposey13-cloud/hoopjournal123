import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AuthMethod = 'email' | 'phone';

interface SignUpParams {
  identifier: string;
  password: string;
  method: AuthMethod;
}

interface SignInParams {
  identifier: string;
  password: string;
  method: AuthMethod;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  signUp: (params: SignUpParams) => Promise<{ error: Error | null; data: { user: User | null } }>;
  signIn: (params: SignInParams) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => {
    try { return localStorage.getItem('hj_guest_mode') === 'true'; } catch { return false; }
  });

  const enterGuestMode = () => {
    try { localStorage.setItem('hj_guest_mode', 'true'); } catch {}
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    try { localStorage.removeItem('hj_guest_mode'); } catch {}
    setIsGuest(false);
  };

  useEffect(() => {
    // Detect if we're on a callback URL with tokens - delay loading=false until resolved
    const hash = window.location.hash || '';
    const isCallbackWithTokens = hash.includes('access_token') || 
      window.location.pathname === '/auth/callback';
    
    if (isCallbackWithTokens) {
      console.log('[Auth] Detected token-bearing callback URL, waiting for session hydration...');
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const timestamp = new Date().toISOString();
        console.log(`[Auth] State change: ${event} at ${timestamp}`);
        
        if (session?.user) {
          console.log(`[Auth] User: ${session.user.id}`);
          console.log(`[Auth] Provider: ${session.user.app_metadata?.provider || 'email'}`);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log(`[Auth] Existing session found for user: ${session.user.id}`);
      } else {
        console.log('[Auth] No existing session');
      }
      setSession(session);
      setUser(session?.user ?? null);
      // Only set loading=false immediately if we're NOT on a callback URL
      // On callback URLs, wait for onAuthStateChange to fire after setSession
      if (!isCallbackWithTokens) {
        setLoading(false);
      } else {
        // Safety timeout: if no auth event fires within 5s, stop loading anyway
        setTimeout(() => {
          setLoading(false);
        }, 5000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async ({ identifier, password, method }: SignUpParams) => {
    const authPayload = method === 'email' 
      ? { email: identifier, password, options: { emailRedirectTo: window.location.origin } }
      : { phone: identifier, password };
    
    const { error, data } = await supabase.auth.signUp(authPayload);
    return { error, data: { user: data.user } };
  };

  const signIn = async ({ identifier, password, method }: SignInParams) => {
    const authPayload = method === 'email'
      ? { email: identifier, password }
      : { phone: identifier, password };
    
    const { error } = await supabase.auth.signInWithPassword(authPayload);
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Auth] signOut error (clearing local session anyway):', err);
    }
    // Always clear local state even if server-side sign out fails (e.g. expired session)
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isGuest, enterGuestMode, exitGuestMode, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
