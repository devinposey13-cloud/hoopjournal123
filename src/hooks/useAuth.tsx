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
  signUp: (params: SignUpParams) => Promise<{ error: Error | null; data: { user: User | null } }>;
  signIn: (params: SignInParams) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
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
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
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
