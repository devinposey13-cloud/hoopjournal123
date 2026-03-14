import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Shield, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface AgeConfirmationGateProps {
  onConfirmed: () => void;
}

export function AgeConfirmationGate({ onConfirmed }: AgeConfirmationGateProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<'age-select' | 'under-13'>('age-select');
  const [saving, setSaving] = useState(false);

  const logConfirmation = async (ageDeclared: 'under_13' | '13_or_older') => {
    if (!user) return;
    setSaving(true);

    const deviceMetadata = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      timestamp: new Date().toISOString(),
    };

    try {
      let ip: string | null = null;
      try {
        const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        ip = data.ip;
      } catch {
        // Non-critical
      }

      await supabase.from('age_confirmations' as any).insert({
        user_id: user.id,
        age_declared: ageDeclared,
        parent_consent: false,
        consent_timestamp: null,
        ip_address: ip,
        device_metadata: deviceMetadata,
      });
    } catch (err) {
      console.error('[AgeGate] Failed to log confirmation:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleOver13 = async () => {
    await logConfirmation('13_or_older');
    onConfirmed();
  };

  const handleUnder13 = async () => {
    await logConfirmation('under_13');
    setScreen('under-13');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6 flex-1 flex items-center">
        <AnimatePresence mode="wait">
          {screen === 'age-select' ? (
            <motion.div
              key="age-select"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center w-full"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-primary" />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Age Confirmation
              </h1>

              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-8">
                Hoop Journal™ is designed for athletes <strong className="text-foreground">13 years of age and older</strong>.
                <br /><br />
                If you are under 13, please ask a parent or legal guardian to create and manage your account.
              </p>

              <div className="w-full space-y-3">
                <Button
                  onClick={handleOver13}
                  disabled={saving}
                  className="w-full h-12 text-base font-semibold gradient-primary"
                >
                  I am 13 or older
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

                <Button
                  variant="outline"
                  onClick={handleUnder13}
                  disabled={saving}
                  className="w-full h-12 text-base border-border/50"
                >
                  I am under 13
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="under-13"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center w-full"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-primary" />
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-3">
                Parent or Guardian Required
              </h2>

              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-8">
                Hoop Journal™ accounts must be created and managed by a parent or legal guardian for athletes under 13.
                <br /><br />
                Please ask a parent or guardian to continue.
              </p>

              <div className="w-full space-y-3">
                <Button
                  onClick={() => setScreen('age-select')}
                  className="w-full h-12 text-base font-semibold gradient-primary"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Return
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/privacy')}
                  className="w-full h-12 text-base border-border/50"
                >
                  Learn More
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Privacy Policy footer link */}
      <div className="relative z-10 pb-6">
        <button
          onClick={() => navigate('/privacy')}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          Privacy Policy
        </button>
      </div>
    </div>
  );
}
