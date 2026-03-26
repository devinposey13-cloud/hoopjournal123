import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, Clock, XCircle, Shield, Loader2, RotateCcw, CalendarPlus, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface ClaimCard {
  id: string;
  player_name: string;
  team_name: string;
  jersey_number: number;
  claim_code: string | null;
  claim_token: string | null;
  claim_status: string;
  claimed_by_user_id: string | null;
  expires_at: string | null;
  claim_attempts: number;
  recovery_claim: boolean;
  created_at: string;
  photo_url: string | null;
}

interface RecoveryRequest {
  id: string;
  card_id: string;
  entered_name: string;
  entered_team: string;
  entered_jersey: number;
  entered_email: string | null;
  user_id: string | null;
  status: string;
  created_at: string;
}

export function AdminClaimManagement() {
  const [cards, setCards] = useState<ClaimCard[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<ClaimCard | null>(null);

  useEffect(() => { fetchData(); }, [filter]);

  async function fetchData() {
    setLoading(true);
    try {
      let query = supabase.from('quick_cards').select('*').order('created_at', { ascending: false }).limit(100);
      if (filter === 'unclaimed') query = query.eq('claim_status', 'unclaimed');
      else if (filter === 'claimed') query = query.eq('claim_status', 'claimed');
      else if (filter === 'expired') query = query.eq('claim_status', 'expired');

      const { data, error } = await query;
      if (error) throw error;
      
      // Check for expired cards
      const now = new Date();
      const processed = (data || []).map((c: any) => {
        if (c.claim_status === 'unclaimed' && c.expires_at && new Date(c.expires_at) < now) {
          return { ...c, claim_status: 'expired' };
        }
        return c;
      });
      
      if (filter === 'expired') {
        setCards(processed.filter((c: any) => c.claim_status === 'expired'));
      } else {
        setCards(processed as ClaimCard[]);
      }

      // Fetch recovery requests
      const { data: requests } = await supabase.from('claim_recovery_requests').select('*').order('created_at', { ascending: false });
      setRecoveryRequests((requests || []) as RecoveryRequest[]);
    } catch (err: any) {
      toast.error('Failed to load claim data');
    } finally {
      setLoading(false);
    }
  }

  async function handleReissueToken(cardId: string) {
    setActionLoading(cardId);
    try {
      const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
      const newExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('quick_cards').update({
        claim_token: newToken,
        expires_at: newExpiry,
        claim_status: 'unclaimed',
        claim_attempts: 0,
        claimed_by_user_id: null,
      } as any).eq('id', cardId);
      if (error) throw error;
      toast.success('Token reissued, expiration reset');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reissue token');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExtendExpiry(cardId: string) {
    setActionLoading(cardId);
    try {
      const newExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('quick_cards').update({
        expires_at: newExpiry,
        claim_status: 'unclaimed',
      } as any).eq('id', cardId);
      if (error) throw error;
      toast.success('Expiration extended by 72 hours');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to extend expiry');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkClaimed(cardId: string) {
    setActionLoading(cardId);
    try {
      const { error } = await supabase.from('quick_cards').update({
        claim_status: 'claimed',
      } as any).eq('id', cardId);
      if (error) throw error;
      toast.success('Card marked as claimed');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApproveRecovery(requestId: string, cardId: string, userId: string | null) {
    setActionLoading(requestId);
    try {
      if (userId) {
        await supabase.from('quick_cards').update({
          claimed_by_user_id: userId,
          claim_status: 'claimed',
          recovery_claim: true,
        } as any).eq('id', cardId);
      }
      await supabase.from('claim_recovery_requests').update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      } as any).eq('id', requestId);
      toast.success('Recovery approved');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDenyRecovery(requestId: string) {
    setActionLoading(requestId);
    try {
      await supabase.from('claim_recovery_requests').update({
        status: 'denied',
        reviewed_at: new Date().toISOString(),
      } as any).eq('id', requestId);
      toast.success('Recovery denied');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deny');
    } finally {
      setActionLoading(null);
    }
  }

  const pendingRequests = recoveryRequests.filter(r => r.status === 'pending');
  const statusColor = (s: string) => {
    if (s === 'claimed') return 'text-green-400';
    if (s === 'expired') return 'text-amber-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Pending Recovery Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Pending Recovery Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map(req => (
              <div key={req.id} className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <div className="text-sm">
                  <span className="font-semibold">{req.entered_name}</span> · #{req.entered_jersey} · {req.entered_team}
                  {req.entered_email && <span className="text-muted-foreground ml-2">({req.entered_email})</span>}
                </div>
                <div className="text-xs text-muted-foreground">{format(new Date(req.created_at), 'MMM d, yyyy h:mm a')}</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApproveRecovery(req.id, req.card_id, req.user_id)} disabled={actionLoading === req.id}>
                    {actionLoading === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    <span className="ml-1">Approve</span>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDenyRecovery(req.id)} disabled={actionLoading === req.id}>
                    <XCircle className="w-3 h-3 mr-1" /> Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cards</SelectItem>
            <SelectItem value="unclaimed">Unclaimed</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Cards List */}
      <div className="space-y-2">
        {cards.map(card => (
          <div key={card.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3 min-w-0">
              {card.photo_url ? (
                <img src={card.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">🏀</div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{card.player_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {card.team_name} · #{card.jersey_number}
                  {card.claim_attempts > 0 && <span className="ml-1 text-amber-400">({card.claim_attempts} attempts)</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`text-xs ${statusColor(card.claim_status)}`}>
                {card.claim_status}
                {card.recovery_claim && ' (recovered)'}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => setSelectedCard(card)}>
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {cards.length === 0 && !loading && (
          <p className="text-center py-8 text-muted-foreground">No cards found</p>
        )}
      </div>

      {/* Card Detail Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={(o) => !o && setSelectedCard(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCard.player_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div><strong>Team:</strong> {selectedCard.team_name}</div>
                <div><strong>Jersey:</strong> #{selectedCard.jersey_number}</div>
                <div><strong>Status:</strong> <span className={statusColor(selectedCard.claim_status)}>{selectedCard.claim_status}</span></div>
                <div><strong>Attempts:</strong> {selectedCard.claim_attempts}</div>
                <div><strong>Expires:</strong> {selectedCard.expires_at ? format(new Date(selectedCard.expires_at), 'MMM d, yyyy h:mm a') : 'N/A'}</div>
                <div><strong>Claim Code:</strong> {selectedCard.claim_code || 'N/A'}</div>
                {selectedCard.recovery_claim && <Badge variant="secondary">Recovery Claim</Badge>}
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <Button variant="outline" onClick={() => handleReissueToken(selectedCard.id)} disabled={actionLoading === selectedCard.id} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Reissue Token & Reset
                </Button>
                <Button variant="outline" onClick={() => handleExtendExpiry(selectedCard.id)} disabled={actionLoading === selectedCard.id} className="gap-2">
                  <CalendarPlus className="w-4 h-4" /> Extend 72 Hours
                </Button>
                {selectedCard.claim_status !== 'claimed' && (
                  <Button onClick={() => handleMarkClaimed(selectedCard.id)} disabled={actionLoading === selectedCard.id} className="gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Mark as Claimed
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
