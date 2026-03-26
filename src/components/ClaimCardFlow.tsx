import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, CreditCard, CheckCircle2, User } from 'lucide-react';

interface ClaimCardFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed?: (cardData: ClaimedCardData) => void;
}

export interface ClaimedCardData {
  playerName: string;
  teamName: string;
  position: string | null;
  jerseyNumber: number;
  photoUrl: string | null;
  grade: string;
}

type FlowStep = 'input' | 'preview' | 'success';

export function ClaimCardFlow({ open, onOpenChange, onClaimed }: ClaimCardFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStep>('input');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<any>(null);

  const resetFlow = () => {
    setStep('input');
    setCode('');
    setCardData(null);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetFlow();
    onOpenChange(val);
  };

  // Format input as HJ-XXXXX
  const handleCodeChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (upper.length <= 10) {
      setCode(upper);
    }
  };

  const lookupCard = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const lookupCode = code.trim().toUpperCase();
      const { data, error } = await supabase
        .from('quick_cards')
        .select('*')
        .eq('claim_code', lookupCode)
        .is('claimed_by_user_id', null)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Code not found or already claimed');
        return;
      }

      setCardData(data);
      setStep('preview');
    } catch (err: any) {
      toast.error(err.message || 'Failed to look up card');
    } finally {
      setLoading(false);
    }
  };

  const claimCard = async () => {
    if (!user || !cardData) return;
    setLoading(true);
    try {
      // 1. Mark card as claimed
      const { error: claimError } = await supabase
        .from('quick_cards')
        .update({ claimed_by_user_id: user.id } as any)
        .eq('id', cardData.id)
        .is('claimed_by_user_id', null);

      if (claimError) throw claimError;

      // 2. Update player profile with card data
      const { error: profileError } = await supabase
        .from('player_settings')
        .update({
          name: cardData.player_name,
          team: cardData.team_name,
          position: cardData.position || 'Guard',
          number: cardData.jersey_number,
          avatar_url: cardData.photo_url,
          grade: cardData.grade,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_active_profile', true);

      if (profileError) throw profileError;

      setStep('success');
      
      onClaimed?.({
        playerName: cardData.player_name,
        teamName: cardData.team_name,
        position: cardData.position,
        jerseyNumber: cardData.jersey_number,
        photoUrl: cardData.photo_url,
        grade: cardData.grade,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'input' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Claim Your Card
              </DialogTitle>
              <DialogDescription>
                Enter the code from your event card to link it to your profile.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookupCard();
              }}
              className="space-y-4 mt-2"
            >
              <Input
                placeholder="HJ-K7M2P"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="text-center text-lg font-mono tracking-widest h-14"
                autoFocus
                maxLength={10}
              />
              <Button
                type="submit"
                disabled={code.length < 4 || loading}
                className="w-full gradient-primary"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Look Up Card
              </Button>
            </form>
          </>
        )}

        {step === 'preview' && cardData && (
          <>
            <DialogHeader>
              <DialogTitle>Is this your card?</DialogTitle>
              <DialogDescription>
                Confirm to link this card to your account.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border bg-card p-4 space-y-3 mt-2">
              <div className="flex items-center gap-4">
                {cardData.photo_url ? (
                  <img
                    src={cardData.photo_url}
                    alt={cardData.player_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-foreground">{cardData.player_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    #{cardData.jersey_number} · {cardData.team_name}
                  </p>
                  {cardData.position && (
                    <p className="text-xs text-muted-foreground">{cardData.position} · {cardData.grade}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep('input')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={claimCard}
                disabled={loading}
                className="flex-1 gradient-primary"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Claim Card
              </Button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-4 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-bold text-foreground">Card Claimed! 🏀</h3>
            <p className="text-sm text-muted-foreground">
              Your profile has been set up with your card data. Welcome to Hoop Journal!
            </p>
            <Button
              onClick={() => handleOpenChange(false)}
              className="w-full gradient-primary"
            >
              Go to Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
