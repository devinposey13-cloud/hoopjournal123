import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CreditCard, CheckCircle2, User, Clock } from 'lucide-react';

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

type FlowStep = 'input' | 'preview' | 'verify' | 'expired_verify' | 'success';

export function ClaimCardFlow({ open, onOpenChange, onClaimed }: ClaimCardFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStep>('input');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<any>(null);
  const [verifyName, setVerifyName] = useState('');
  const [verifyJersey, setVerifyJersey] = useState('');
  const [verifyTeam, setVerifyTeam] = useState('');

  const resetFlow = () => {
    setStep('input');
    setCode('');
    setCardData(null);
    setVerifyName('');
    setVerifyJersey('');
    setVerifyTeam('');
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetFlow();
    onOpenChange(val);
  };

  const handleCodeChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (upper.length <= 10) setCode(upper);
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
        .maybeSingle();

      if (error) throw error;
      if (!data) { toast.error('Code not found'); return; }

      // If claimed by a different user, block
      if (data.claimed_by_user_id && data.claimed_by_user_id !== user?.id) {
        toast.error('This code has already been claimed by another account');
        return;
      }

      setCardData(data);

      // Check expiration
      const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
      if (isExpired) {
        setStep('expired_verify');
      } else {
        setStep('preview');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to look up card');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndClaim = async () => {
    if (!user || !cardData) return;
    setLoading(true);
    try {
      const isExpired = cardData.expires_at && new Date(cardData.expires_at) < new Date();
      const nameMatch = cardData.player_name.trim().toLowerCase() === verifyName.trim().toLowerCase();
      const jerseyMatch = cardData.jersey_number === parseInt(verifyJersey);

      if (isExpired) {
        const teamMatch = cardData.team_name.trim().toLowerCase() === verifyTeam.trim().toLowerCase();
        if (!nameMatch || !jerseyMatch || !teamMatch) {
          toast.error("This doesn't match the card details. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        if (!nameMatch || !jerseyMatch) {
          toast.error("This doesn't match the card details. Please try again.");
          setLoading(false);
          return;
        }
      }

      // Claim the card
      const { error: claimError } = await supabase
        .from('quick_cards')
        .update({
          claimed_by_user_id: user.id,
          claim_status: 'claimed',
          recovery_claim: !!isExpired,
        } as any)
        .eq('id', cardData.id);

      if (claimError) throw claimError;

      // Update player profile
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

  const claimCard = async () => {
    // For the preview step (non-expired), go to verify step
    setStep('verify');
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
            <form onSubmit={(e) => { e.preventDefault(); lookupCard(); }} className="space-y-4 mt-2">
              <Input
                placeholder="HJ-K7M2P"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="text-center text-lg font-mono tracking-widest h-14"
                autoFocus
                maxLength={10}
              />
              <Button type="submit" disabled={code.length < 4 || loading} className="w-full gradient-primary">
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
              <DialogDescription>Confirm to link this card to your account.</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border bg-card p-4 space-y-3 mt-2">
              <div className="flex items-center gap-4">
                {cardData.photo_url ? (
                  <img src={cardData.photo_url} alt={cardData.player_name} className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-foreground">{cardData.player_name}</h3>
                  <p className="text-sm text-muted-foreground">#{cardData.jersey_number} · {cardData.team_name}</p>
                  {cardData.position && <p className="text-xs text-muted-foreground">{cardData.position} · {cardData.grade}</p>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep('input')} className="flex-1">Back</Button>
              <Button onClick={claimCard} className="flex-1 gradient-primary">Verify & Claim</Button>
            </div>
          </>
        )}

        {(step === 'verify' || step === 'expired_verify') && cardData && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {step === 'expired_verify' && <Clock className="w-5 h-5 text-amber-500" />}
                {step === 'expired_verify' ? 'Recover Your Card' : 'Verify Your Identity'}
              </DialogTitle>
              <DialogDescription>
                {step === 'expired_verify'
                  ? "This card has expired, but we can still recover it. Verify all details."
                  : "Enter your name and jersey number to confirm."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Player Name</Label>
                <Input value={verifyName} onChange={(e) => setVerifyName(e.target.value)} placeholder="Enter your name" className="mt-1" />
              </div>
              <div>
                <Label>Jersey Number</Label>
                <Input type="number" value={verifyJersey} onChange={(e) => setVerifyJersey(e.target.value)} placeholder="#" className="mt-1" />
              </div>
              {step === 'expired_verify' && (
                <div>
                  <Label>Team Name</Label>
                  <Input value={verifyTeam} onChange={(e) => setVerifyTeam(e.target.value)} placeholder="Enter your team" className="mt-1" />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setStep(step === 'expired_verify' ? 'input' : 'preview')} className="flex-1">Back</Button>
              <Button
                onClick={handleVerifyAndClaim}
                disabled={loading || !verifyName.trim() || !verifyJersey.trim() || (step === 'expired_verify' && !verifyTeam.trim())}
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
            <p className="text-sm text-muted-foreground">Your profile has been set up with your card data. Welcome to Hoop Journal!</p>
            <Button onClick={() => handleOpenChange(false)} className="w-full gradient-primary">Go to Dashboard</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
