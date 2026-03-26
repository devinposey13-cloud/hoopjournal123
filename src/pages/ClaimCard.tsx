import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, User, AlertTriangle, Clock, ShieldAlert, Send } from 'lucide-react';

type ClaimStep = 'loading' | 'auth' | 'preview' | 'verify' | 'expired_verify' | 'success' | 'already_claimed' | 'rate_limited' | 'error' | 'request_access';

interface CardPreview {
  player_name: string;
  team_name: string;
  jersey_number: number;
  position: string | null;
  photo_url: string | null;
  grade: string;
}

export default function ClaimCard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const cardId = searchParams.get('card_id');
  const token = searchParams.get('token');

  const [step, setStep] = useState<ClaimStep>('loading');
  const [preview, setPreview] = useState<CardPreview | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  // Verification form
  const [verifyName, setVerifyName] = useState('');
  const [verifyJersey, setVerifyJersey] = useState('');
  const [verifyTeam, setVerifyTeam] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!cardId || !token) {
      setStep('error');
      return;
    }
    if (!user) {
      setStep('auth');
      return;
    }
    fetchPreview();
  }, [user, authLoading, cardId, token]);

  async function fetchPreview() {
    setStep('loading');
    try {
      const { data, error } = await supabase.functions.invoke('claim-card', {
        body: { card_id: cardId, token, action: 'preview' },
      });
      if (error) throw error;
      if (data.error === 'already_claimed') { setStep('already_claimed'); return; }
      if (data.error === 'rate_limited') { setRetryAfter(data.retry_after || 900); setStep('rate_limited'); return; }
      if (data.error) { toast.error(data.message || data.error); setStep('error'); return; }

      setPreview(data.preview);
      setIsExpired(data.expired);

      if (data.claim_status === 'claimed') {
        setStep('already_claimed');
      } else if (data.expired) {
        setStep('expired_verify');
      } else {
        setStep('verify');
      }
    } catch (err: any) {
      console.error('Preview error:', err);
      toast.error('Failed to load card');
      setStep('error');
    }
  }

  async function handleClaim() {
    setLoading(true);
    try {
      const body: any = { card_id: cardId, token, player_name: verifyName.trim(), jersey_number: parseInt(verifyJersey) };
      if (isExpired) body.team_name = verifyTeam.trim();

      const { data, error } = await supabase.functions.invoke('claim-card', { body });
      if (error) throw error;

      if (data.error === 'rate_limited') { setRetryAfter(data.retry_after || 900); setStep('rate_limited'); return; }
      if (data.error === 'verification_failed') { toast.error(data.message); return; }
      if (data.error === 'expired') { setIsExpired(true); setStep('expired_verify'); toast.info('Team name is also required for expired cards'); return; }
      if (data.error === 'already_claimed') { setStep('already_claimed'); return; }
      if (data.error) { toast.error(data.message || data.error); return; }

      if (data.success) {
        setStep('success');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim card');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestAccess() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('claim-card', {
        body: { card_id: cardId, token, player_name: verifyName.trim(), jersey_number: parseInt(verifyJersey), team_name: verifyTeam.trim(), email: verifyEmail.trim() || null, action: 'request_access' },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.message || data.error); return; }
      toast.success('Recovery request submitted! An admin will review it.');
      setStep('error'); // show a "done" state
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Claim Your Card</h1>
            <p className="text-sm text-muted-foreground">Sign in or create an account to claim your event card.</p>
          </div>
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        {step === 'loading' && (
          <CardContent className="py-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading card...</p>
          </CardContent>
        )}

        {(step === 'verify' || step === 'expired_verify') && preview && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {step === 'expired_verify' ? <Clock className="w-5 h-5 text-amber-500" /> : null}
                {step === 'expired_verify' ? 'Recover Your Card' : 'Is this your card?'}
              </CardTitle>
              <CardDescription>
                {step === 'expired_verify'
                  ? "This card has expired, but we can still recover it. Please verify your identity."
                  : "Confirm your identity to claim this card."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Card preview */}
              <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
                {preview.photo_url ? (
                  <img src={preview.photo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-primary blur-[2px]" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-7 h-7 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-foreground">{preview.player_name}</h3>
                  <p className="text-sm text-muted-foreground">#{preview.jersey_number} · {preview.team_name}</p>
                </div>
              </div>

              {/* Verification form */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="verify-name">Player Name</Label>
                  <Input id="verify-name" placeholder="Enter your name" value={verifyName} onChange={(e) => setVerifyName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="verify-jersey">Jersey Number</Label>
                  <Input id="verify-jersey" type="number" placeholder="#" value={verifyJersey} onChange={(e) => setVerifyJersey(e.target.value)} className="mt-1" />
                </div>
                {step === 'expired_verify' && (
                  <div>
                    <Label htmlFor="verify-team">Team Name</Label>
                    <Input id="verify-team" placeholder="Enter your team" value={verifyTeam} onChange={(e) => setVerifyTeam(e.target.value)} className="mt-1" />
                  </div>
                )}
              </div>

              <Button onClick={handleClaim} disabled={loading || !verifyName.trim() || !verifyJersey.trim() || (step === 'expired_verify' && !verifyTeam.trim())} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Claim Card
              </Button>

              {step === 'expired_verify' && (
                <Button variant="outline" onClick={() => setStep('request_access')} className="w-full text-sm">
                  Can't verify? Request Access
                </Button>
              )}
            </CardContent>
          </>
        )}

        {step === 'request_access' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Request Access
              </CardTitle>
              <CardDescription>Submit your info and an admin will review your request.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Player Name</Label>
                <Input value={verifyName} onChange={(e) => setVerifyName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Team Name</Label>
                <Input value={verifyTeam} onChange={(e) => setVerifyTeam(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Jersey Number</Label>
                <Input type="number" value={verifyJersey} onChange={(e) => setVerifyJersey(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Email (optional)</Label>
                <Input value={verifyEmail} onChange={(e) => setVerifyEmail(e.target.value)} className="mt-1" placeholder="your@email.com" />
              </div>
              <Button onClick={handleRequestAccess} disabled={loading || !verifyName.trim() || !verifyTeam.trim() || !verifyJersey.trim()} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Request
              </Button>
              <Button variant="ghost" onClick={() => setStep('expired_verify')} className="w-full text-sm">Back</Button>
            </CardContent>
          </>
        )}

        {step === 'success' && (
          <CardContent className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-bold text-foreground">Card Claimed! 🏀</h3>
            <p className="text-sm text-muted-foreground">Your profile has been set up with your card data.</p>
            <Button onClick={() => navigate('/')} className="w-full">Go to Dashboard</Button>
          </CardContent>
        )}

        {step === 'already_claimed' && (
          <CardContent className="py-8 text-center space-y-4">
            <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto" />
            <h3 className="text-xl font-bold text-foreground">Already Claimed</h3>
            <p className="text-sm text-muted-foreground">This card has already been claimed.</p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">Go to Dashboard</Button>
          </CardContent>
        )}

        {step === 'rate_limited' && (
          <CardContent className="py-8 text-center space-y-4">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
            <h3 className="text-xl font-bold text-foreground">Too Many Attempts</h3>
            <p className="text-sm text-muted-foreground">Please try again in {Math.ceil(retryAfter / 60)} minutes.</p>
          </CardContent>
        )}

        {step === 'error' && (
          <CardContent className="py-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Invalid Link</h3>
            <p className="text-sm text-muted-foreground">This claim link is invalid or has already been processed.</p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">Go Home</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
