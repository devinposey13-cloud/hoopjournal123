import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AgeConfirmationGateProps {
  onConfirmed: () => void;
}

export function AgeConfirmationGate({ onConfirmed }: AgeConfirmationGateProps) {
  const { user } = useAuth();
  const [showParentConsent, setShowParentConsent] = useState(false);
  const [parentChecked, setParentChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const logConfirmation = async (ageDeclared: 'under_13' | '13_or_older', parentConsent: boolean) => {
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
      // Fetch IP via public API (best-effort)
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
        parent_consent: parentConsent,
        consent_timestamp: parentConsent ? new Date().toISOString() : null,
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
    await logConfirmation('13_or_older', false);
    onConfirmed();
  };

  const handleParentApprove = async () => {
    if (!parentChecked) {
      toast.error('Please confirm parental approval to continue.');
      return;
    }
    await logConfirmation('under_13', true);
    onConfirmed();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background flex items-center justify-center">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/10 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        <AnimatePresence mode="wait">
          {!showParentConsent ? (
            <motion.div
              key="age-select"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-primary" />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Before You Continue
              </h1>

              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-8">
                Hoop Journal is designed for athletes <strong className="text-foreground">13 years and older</strong>.
                <br /><br />
                If you are under 13, a parent or legal guardian must approve your account.
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
                  onClick={() => setShowParentConsent(true)}
                  disabled={saving}
                  className="w-full h-12 text-base border-border/50"
                >
                  I am under 13
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="parent-consent"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-primary" />
              </div>

              <h2 className="text-2xl font-bold text-foreground mb-3">
                Parent Approval Required
              </h2>

              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-6">
                To protect young athletes, a parent or legal guardian must review and approve this account.
              </p>

              <div className="w-full bg-card border border-border/50 rounded-lg p-4 mb-6">
                <label className="flex items-start gap-3 cursor-pointer text-left">
                  <Checkbox
                    checked={parentChecked}
                    onCheckedChange={(v) => setParentChecked(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-foreground leading-relaxed">
                    I am a parent or legal guardian, and I approve this account for my child.
                  </span>
                </label>
              </div>

              <div className="w-full space-y-3">
                <Button
                  onClick={handleParentApprove}
                  disabled={saving || !parentChecked}
                  className="w-full h-12 text-base font-semibold gradient-primary"
                >
                  {saving ? 'Saving…' : 'Approve and Continue'}
                </Button>

                <button
                  onClick={() => setShowParentConsent(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
