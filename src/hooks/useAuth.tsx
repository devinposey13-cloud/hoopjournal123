import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  logEvent as logAuthDebugEvent,
  resumeOrCreateMainAppAttempt,
  updateMetadata,
} from '@/lib/appleAuthDebugTracker';

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
  authReady: boolean;
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
    // Detect if we're on a callback URL with tokens
    const url = new URL(window.location.href);
    const hash = window.location.hash || '';
    const isCallbackWithTokens = hash.includes('access_token');
    const isCallbackRoute = window.location.pathname === '/auth/callback';
    const isPostAuthReturn = url.searchParams.get('postAuth') === '1';
    let postAuthPollCount = 0;
    let postAuthPollInterval: number | null = null;
    let postAuthTimeout: number | null = null;

    const clearPostAuthPolling = () => {
      if (postAuthPollInterval) {
        window.clearInterval(postAuthPollInterval);
        postAuthPollInterval = null;
      }
      if (postAuthTimeout) {
        window.clearTimeout(postAuthTimeout);
        postAuthTimeout = null;
      }
    };
    
    if (isCallbackWithTokens) {
      console.log('[Auth] Detected token-bearing URL, waiting for session hydration...');
    }

    if (isPostAuthReturn) {
      resumeOrCreateMainAppAttempt();
      logAuthDebugEvent('main_app_postauth_detected', {
        pathname: window.location.pathname,
        search: window.location.search,
      });
      updateMetadata('mainAppReturnUrl', window.location.href);

      postAuthPollInterval = window.setInterval(async () => {
        postAuthPollCount += 1;
        logAuthDebugEvent('session_check_started', {
          source: 'auth_provider_poll',
          tick: postAuthPollCount,
        });

        const { data: { session } } = await supabase.auth.getSession();
        logAuthDebugEvent('session_check_result', {
          source: 'auth_provider_poll',
          tick: postAuthPollCount,
          hasSession: !!session,
          userId: session?.user?.id,
        });

        if (session) {
          clearPostAuthPolling();
          setSession(session);
          setUser(session.user);
          setLoading(false);
        }
      }, 500);

      postAuthTimeout = window.setTimeout(() => {
        clearPostAuthPolling();
        logAuthDebugEvent('session_check_result', {
          source: 'auth_provider_timeout',
          hasSession: false,
        });
        setLoading(false);
      }, 10000);
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

        if (isPostAuthReturn) {
          logAuthDebugEvent('auth_state_changed', {
            event,
            hasSession: !!session,
            userId: session?.user?.id,
            provider: session?.user?.app_metadata?.provider || 'email',
          });
          if (session) {
            clearPostAuthPolling();
          }
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isPostAuthReturn) {
        logAuthDebugEvent('session_check_started', { source: 'auth_provider_initial' });
        logAuthDebugEvent('session_check_result', {
          source: 'auth_provider_initial',
          hasSession: !!session,
          userId: session?.user?.id,
        });
      }

      if (session) {
        console.log(`[Auth] Existing session found for user: ${session.user.id}`);
      } else {
        console.log('[Auth] No existing session');
      }
      setSession(session);
      setUser(session?.user ?? null);
      // On callback route, let OAuthCallback handle loading state via its own flow.
      // On token-bearing non-callback URLs, wait briefly for onAuthStateChange.
      // Otherwise set loading=false immediately.
      if (isCallbackRoute) {
        // OAuthCallback.tsx manages its own session establishment — let it drive.
        // Set loading=false so the page can render its skeleton.
        setLoading(false);
      } else if (isPostAuthReturn) {
        if (session) {
          clearPostAuthPolling();
          setLoading(false);
        }
      } else if (isCallbackWithTokens) {
        // Safety timeout: if no auth event fires within 3s, stop loading anyway
        setTimeout(() => {
          setLoading(false);
        }, 3000);
      } else {
        setLoading(false);
      }
    });

    return () => {
      clearPostAuthPolling();
      subscription.unsubscribe();
    };
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

  const authReady = !loading;

  return (
    <AuthContext.Provider value={{ user, session, loading, authReady, isGuest, enterGuestMode, exitGuestMode, signUp, signIn, signOut }}>
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
