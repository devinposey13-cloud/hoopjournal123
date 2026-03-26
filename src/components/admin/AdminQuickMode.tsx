import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Camera, Upload, Zap, Printer, Download, RotateCcw, Eye, Image as ImageIcon, Plus, Clock, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import hoopJournalLogo from '@/assets/hoop-journal-logo-v2.png';
import hoopJournalQr from '@/assets/hoop-journal-qr.png';
import courtLines from '@/assets/basketball-court-lines.jpg';
import html2canvas from 'html2canvas';

// ── Template Definitions ──
const TEMPLATES = {
  scorer: {
    label: 'Scorer',
    emoji: '🔥',
    grade: 'A+',
    headline: 'BUCKET GETTER',
    stats: { points: 28, rebounds: 4, assists: 3, steals: 2, blocks: 0, turnovers: 2, fgMade: 11, fgAttempted: 18, threePtMade: 4, threePtAttempted: 8, ftMade: 2, ftAttempted: 3 },
    badges: ['🎯 Sharpshooter', '🔥 On Fire', '💰 Money'],
    color: '#FFD700',
    glow: '0 0 60px rgba(255,215,0,0.5)',
  },
  playmaker: {
    label: 'Playmaker',
    emoji: '🎯',
    grade: 'A',
    headline: 'FLOOR GENERAL',
    stats: { points: 14, rebounds: 3, assists: 11, steals: 3, blocks: 0, turnovers: 2, fgMade: 6, fgAttempted: 12, threePtMade: 1, threePtAttempted: 3, ftMade: 1, ftAttempted: 2 },
    badges: ['🎯 Dime Dropper', '👀 Court Vision', '🧠 High IQ'],
    color: '#FF6B00',
    glow: '0 0 60px rgba(255,107,0,0.5)',
  },
  defender: {
    label: 'Defender',
    emoji: '🛡️',
    grade: 'A',
    headline: 'LOCKDOWN',
    stats: { points: 8, rebounds: 7, assists: 2, steals: 5, blocks: 3, turnovers: 1, fgMade: 3, fgAttempted: 7, threePtMade: 0, threePtAttempted: 1, ftMade: 2, ftAttempted: 4 },
    badges: ['🛡️ Lockdown', '🖐️ Pickpocket', '🧱 Wall'],
    color: '#4ade80',
    glow: '0 0 60px rgba(74,222,128,0.5)',
  },
  shooter: {
    label: 'Shooter',
    emoji: '💧',
    grade: 'A',
    headline: 'SPLASH',
    stats: { points: 22, rebounds: 2, assists: 2, steals: 1, blocks: 0, turnovers: 1, fgMade: 8, fgAttempted: 14, threePtMade: 6, threePtAttempted: 10, ftMade: 0, ftAttempted: 0 },
    badges: ['💧 Splash', '🎯 Sniper', '🔥 Hot Hand'],
    color: '#60a5fa',
    glow: '0 0 60px rgba(96,165,250,0.5)',
  },
  energy: {
    label: 'Energy Player',
    emoji: '⚡',
    grade: 'A-',
    headline: 'ENERGY SHIFT',
    stats: { points: 12, rebounds: 10, assists: 2, steals: 3, blocks: 2, turnovers: 2, fgMade: 5, fgAttempted: 9, threePtMade: 0, threePtAttempted: 1, ftMade: 2, ftAttempted: 4 },
    badges: ['⚡ Spark Plug', '💪 Hustle', '🏀 Glass Cleaner'],
    color: '#facc15',
    glow: '0 0 60px rgba(250,204,21,0.5)',
  },
  allaround: {
    label: 'All-Around Hooper',
    emoji: '🏀',
    grade: 'A+',
    headline: 'ALL-AROUND THREAT',
    stats: { points: 18, rebounds: 8, assists: 6, steals: 3, blocks: 2, turnovers: 2, fgMade: 7, fgAttempted: 14, threePtMade: 2, threePtAttempted: 5, ftMade: 2, ftAttempted: 3 },
    badges: ['🏀 Complete Player', '🌟 Versatile', '💯 All-Around'],
    color: '#FFD700',
    glow: '0 0 60px rgba(255,215,0,0.5)',
  },
} as const;

type TemplateKey = keyof typeof TEMPLATES;

interface QuickCard {
  id: string;
  player_name: string;
  team_name: string;
  jersey_number: number;
  position: string | null;
  photo_url: string | null;
  template_used: string;
  grade: string;
  stats: Record<string, number>;
  badges: string[];
  card_headline: string | null;
  claim_code: string | null;
  print_count: number;
  created_at: string;
}

function generateClaimCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = 'HJ-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Promo Card Canvas ──
function PromoCardCanvas({ 
  playerName, teamName, jerseyNumber, position, photoUrl, template, cardRef 
}: {
  playerName: string;
  teamName: string;
  jerseyNumber: number;
  position?: string;
  photoUrl?: string;
  template: typeof TEMPLATES[TemplateKey];
  cardRef: React.RefObject<HTMLDivElement>;
}) {
  const { color, glow, grade, badges, stats, headline } = template;
  const CANVAS_W = 1080;
  const CANVAS_H = 1920;

  const s = { muted: '#64748b', dim: '#475569', bright: '#f8fafc', sub: '#94a3b8' };

  const statGrid = [
    { label: 'PTS', value: stats.points },
    { label: 'REB', value: stats.rebounds },
    { label: 'AST', value: stats.assists },
    { label: 'STL', value: stats.steals },
    { label: 'BLK', value: stats.blocks },
    { label: 'TOV', value: stats.turnovers },
  ];

  return (
    <div
      ref={cardRef}
      style={{
        width: CANVAS_W, height: CANVAS_H,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: 'linear-gradient(180deg, #070b16 0%, #0a0f1e 25%, #0d1424 50%, #0a0f1e 75%, #070b16 100%)',
        position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      }}
    >
      {/* Court Lines Background */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `url(${courtLines})`,
        backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
        opacity: 0.025, pointerEvents: 'none', filter: 'invert(1)',
      }} />
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '22%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 800, height: 800, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}08 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, transparent 10%, ${color}50 50%, transparent 90%)`,
      }} />

      {/* PROMO BADGE */}
      <div style={{
        position: 'absolute', top: 32, right: 32, zIndex: 10,
        background: 'linear-gradient(135deg, rgba(168,85,247,0.9), rgba(139,92,246,0.9))',
        borderRadius: 12, padding: '8px 20px',
        color: '#fff', fontSize: 16, fontWeight: 900, letterSpacing: '0.15em',
        boxShadow: '0 4px 20px rgba(168,85,247,0.4)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}>⚡ EVENT CARD</div>

      {/* Content */}
      <div style={{
        position: 'absolute', top: 100, bottom: 320, left: 80, right: 80,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Avatar + Grade */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', marginBottom: 32, gap: 48,
        }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 320, height: 320, borderRadius: '50%',
              border: `7px solid ${color}`,
              overflow: 'hidden',
              boxShadow: `0 0 100px ${color}40, 0 0 200px ${color}15`,
            }}>
              {photoUrl ? (
                <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              ) : (
                <div style={{
                  width: '100%', height: '100%', background: '#1e293b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 8,
                }}>
                  <span style={{ fontSize: 80 }}>🏀</span>
                  <span style={{ color: s.muted, fontSize: 28, fontWeight: 800 }}>#{jerseyNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Grade */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative', marginTop: 28, padding: '44px 24px 96px',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 440, height: 440, borderRadius: '50%',
              background: `radial-gradient(circle, ${color}15 0%, transparent 60%)`,
              pointerEvents: 'none',
            }} />
            <div style={{
              color: s.dim, fontSize: 18, fontWeight: 800,
              letterSpacing: '0.4em', textTransform: 'uppercase',
              textAlign: 'center', marginBottom: 8,
            }}>HOOP JOURNAL GAME GRADE</div>
            <div style={{
              fontSize: 236, fontWeight: 900, color,
              lineHeight: 0.9, textShadow: glow,
              letterSpacing: '-0.03em', textAlign: 'center',
              paddingBottom: 10,
            }}>{grade}</div>
          </div>
        </div>

        {/* Player Name + Team */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            color: s.bright, fontSize: 55, fontWeight: 900,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            textAlign: 'center', lineHeight: 1,
          }}>{playerName}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginTop: 10,
          }}>
            <span style={{
              color: s.muted, fontSize: 21, fontWeight: 700,
              letterSpacing: '0.25em', textTransform: 'uppercase',
            }}>{teamName}</span>
            <span style={{ color: s.dim, fontSize: 21, fontWeight: 700 }}>|</span>
            <span style={{
              color: s.muted, fontSize: 21, fontWeight: 700,
              letterSpacing: '0.15em',
            }}>#{jerseyNumber}{position ? ` • ${position}` : ''}</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28,
        }}>
          <span style={{
            color, fontSize: 36, fontWeight: 900,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>{headline}</span>
        </div>

        {/* Divider */}
        <div style={{
          width: '40%', height: 1, marginBottom: 20,
          background: `linear-gradient(90deg, transparent, ${color}25, transparent)`,
        }} />

        {/* Badges */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 }}>
          {badges.map((badge, i) => (
            <div key={i} style={{
              background: `${color}15`, border: `1px solid ${color}30`,
              borderRadius: 50, padding: '6px 22px',
              color, fontSize: 18, fontWeight: 700,
            }}>{badge}</div>
          ))}
        </div>

        <div style={{
          width: '60%', height: 1, marginBottom: 28,
          background: `linear-gradient(90deg, transparent, ${color}30, transparent)`,
        }} />

        {/* Stat grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24, width: '100%',
        }}>
          {statGrid.map((st) => (
            <div key={st.label} style={{
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(100,116,139,0.12)',
              borderLeft: `4px solid ${color}`,
              borderRadius: 16, padding: '20px 20px 18px',
              textAlign: 'left', position: 'relative',
            }}>
              <div style={{ fontSize: 25, fontWeight: 800, color, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4, whiteSpace: 'nowrap' }}>{st.label}</div>
              <div style={{ fontSize: 67, fontWeight: 900, color: s.bright, lineHeight: 1, whiteSpace: 'nowrap' }}>{st.value}</div>
            </div>
          ))}
        </div>

        {/* Shooting Row */}
        <div style={{ display: 'flex', gap: 24, width: '100%', marginTop: 16, justifyContent: 'center' }}>
          {[
            { label: 'FG', made: stats.fgMade, att: stats.fgAttempted },
            { label: '3PT', made: stats.threePtMade, att: stats.threePtAttempted },
            { label: 'FT', made: stats.ftMade, att: stats.ftAttempted },
          ].map((sh) => (
            <div key={sh.label} style={{
              flex: 1, background: 'rgba(15,23,42,0.5)',
              border: '1px solid rgba(100,116,139,0.1)',
              borderRadius: 12, padding: '14px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.sub, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>{sh.label}</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: s.bright, lineHeight: 1 }}>{sh.made}/{sh.att}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 80, left: 80, right: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={hoopJournalLogo} alt="" style={{ width: 82, height: 82, borderRadius: 16 }} crossOrigin="anonymous" />
          <div>
            <div style={{ color: s.bright, fontSize: 28, fontWeight: 800 }}>Hoop Journal</div>
            <div style={{ color: s.dim, fontSize: 18, fontWeight: 500 }}>Track Your Game. Improve Every Day.</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ color: s.dim, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scan to track</div>
          <div style={{ padding: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 10 }}>
            <img src={hoopJournalQr} alt="" style={{ width: 160, height: 160, borderRadius: 6 }} crossOrigin="anonymous" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export function AdminQuickMode() {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

  // Form state
  const [playerName, setPlayerName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState('');
  const [templateKey, setTemplateKey] = useState<TemplateKey>('scorer');
  const [contactInfo, setContactInfo] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [recentCards, setRecentCards] = useState<QuickCard[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [previewCard, setPreviewCard] = useState<QuickCard | null>(null);
  const [lastTeamName, setLastTeamName] = useState('');
  const [lastTemplate, setLastTemplate] = useState<TemplateKey>('scorer');

  const template = TEMPLATES[templateKey];

  // Load recent cards
  useEffect(() => {
    fetchRecentCards();
  }, []);

  async function fetchRecentCards() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await (supabase.from('quick_cards') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setRecentCards(data as unknown as QuickCard[]);
      const todayCards = data.filter((c: any) => c.created_at?.startsWith(today));
      setTodayCount(todayCards.length);
    }
  }

  // Photo handling
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Photo must be under 20MB');
      return;
    }
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
  }, []);

  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = useCallback(() => {
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  }, []);

  // Upload photo to storage
  async function uploadPhoto(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `event-cards/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    return urlData.publicUrl;
  }

  // Generate card
  async function handleGenerate() {
    if (!playerName.trim() || !teamName.trim() || !jerseyNumber.trim()) {
      toast.error('Fill in player name, team name, and jersey number');
      return;
    }
    if (!photoFile && !photoUrl) {
      toast.error('Please add a player photo');
      return;
    }

    setGenerating(true);
    try {
      let uploadedUrl = photoUrl;
      if (photoFile) {
        uploadedUrl = await uploadPhoto(photoFile);
        if (!uploadedUrl) {
          toast.error('Failed to upload photo');
          setGenerating(false);
          return;
        }
      }

      const claimCode = generateClaimCode();
      const { data, error } = await supabase.from('quick_cards').insert({
        created_by_admin_id: user?.id,
        player_name: playerName.trim(),
        team_name: teamName.trim(),
        jersey_number: parseInt(jerseyNumber),
        position: position || null,
        photo_url: uploadedUrl,
        template_used: templateKey,
        grade: template.grade,
        stats: template.stats as any,
        badges: template.badges as any,
        card_headline: template.headline,
        claim_code: claimCode,
        contact_info: contactInfo || null,
        card_source: 'event_quick_mode',
        verification_status: 'promo_generated',
        eligible_for_leaderboards: false,
        eligible_for_career_stats: false,
        eligible_for_xp_progression: false,
      } as any).select().single();

      if (error) throw error;

      // Log the creation
      await supabase.from('quick_mode_audit_log').insert({
        admin_id: user?.id,
        card_id: data.id,
        action: 'created',
        metadata: { template_used: templateKey, player_name: playerName } as any,
      } as any);

      toast.success('Card generated!');
      setShowPreview(true);
      setPreviewCard(data as unknown as QuickCard);
      setLastTeamName(teamName);
      setLastTemplate(templateKey);
      fetchRecentCards();
    } catch (err) {
      toast.error('Failed to generate card');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  // Save as image
  async function handleSaveImage() {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#070b16',
        width: 1080,
        height: 1920,
      });
      const link = document.createElement('a');
      link.download = `${playerName.replace(/\s+/g, '-')}-event-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Card saved!');
    } catch {
      toast.error('Failed to save image');
    }
  }

  // Print card
  async function handlePrint() {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#070b16',
        width: 1080, height: 1920,
      });
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000"><img src="${canvas.toDataURL()}" style="max-width:100%;max-height:100vh" /></body></html>`);
        win.document.close();
        win.print();
      }

      if (previewCard) {
        await supabase.from('quick_cards').update({ print_count: (previewCard.print_count || 0) + 1 } as any).eq('id', previewCard.id);
        await supabase.from('quick_mode_audit_log').insert({
          admin_id: user?.id, card_id: previewCard.id, action: 'printed',
        } as any);
      }
    } catch {
      toast.error('Failed to print');
    }
  }

  // Create next card
  function handleCreateNext() {
    setPlayerName('');
    setJerseyNumber('');
    setPosition('');
    setContactInfo('');
    setPhotoUrl(null);
    setPhotoFile(null);
    setShowPreview(false);
    setPreviewCard(null);
    setTeamName(lastTeamName);
    setTemplateKey(lastTemplate);
  }

  // Reprint from recent
  function handleReprint(card: QuickCard) {
    setPreviewCard(card);
    setPlayerName(card.player_name);
    setTeamName(card.team_name);
    setJerseyNumber(String(card.jersey_number));
    setPosition(card.position || '');
    setPhotoUrl(card.photo_url);
    setTemplateKey(card.template_used as TemplateKey);
    setShowPreview(true);
  }

  const activeTemplate = previewCard 
    ? TEMPLATES[previewCard.template_used as TemplateKey] || TEMPLATES.scorer
    : template;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-purple-400">{todayCount}</div>
            <div className="text-xs text-muted-foreground font-medium mt-1">Cards Today</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/20">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-orange-400">{recentCards.length}</div>
            <div className="text-xs text-muted-foreground font-medium mt-1">Total Cards</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20 col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              <span className="text-sm font-bold text-green-400">QUICK MODE ACTIVE</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entry Form + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Entry Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-primary" />
              Quick Card Entry
            </CardTitle>
            <CardDescription>Generate a branded promo card in seconds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Template</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(TEMPLATES) as [TemplateKey, typeof TEMPLATES[TemplateKey]][]).map(([key, tpl]) => (
                  <button
                    key={key}
                    onClick={() => setTemplateKey(key)}
                    className={cn(
                      'p-2.5 rounded-lg border-2 text-center transition-all text-xs font-bold',
                      templateKey === key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50 text-muted-foreground'
                    )}
                  >
                    <span className="text-lg">{tpl.emoji}</span>
                    <div className="mt-1">{tpl.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Player Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="qm-name" className="text-sm font-semibold">Player Name *</Label>
                <Input
                  id="qm-name"
                  placeholder="Enter player name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="mt-1"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="qm-team" className="text-sm font-semibold">Team *</Label>
                <Input
                  id="qm-team"
                  placeholder="Team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="mt-1"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label htmlFor="qm-number" className="text-sm font-semibold">Jersey # *</Label>
                <Input
                  id="qm-number"
                  placeholder="#"
                  type="number"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="qm-pos" className="text-sm font-semibold">Position</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PG">PG</SelectItem>
                    <SelectItem value="SG">SG</SelectItem>
                    <SelectItem value="SF">SF</SelectItem>
                    <SelectItem value="PF">PF</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="qm-contact" className="text-sm font-semibold">Contact</Label>
                <Input
                  id="qm-contact"
                  placeholder="Email or phone"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Player Photo *</Label>
              {photoUrl ? (
                <div className="relative w-full aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-primary/30">
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setPhotoUrl(null); setPhotoFile(null); }}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={handleCameraCapture}>
                    <Camera className="w-4 h-4" /> Camera
                  </Button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <label className="flex-1">
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <span><Upload className="w-4 h-4" /> Upload</span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating || !playerName.trim() || !teamName.trim() || !jerseyNumber.trim() || (!photoUrl && !photoFile)}
              className="w-full h-12 text-base font-bold gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
              size="lg"
            >
              {generating ? (
                <>Generating...</>
              ) : (
                <><Zap className="w-5 h-5" /> Generate Card</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="w-5 h-5 text-primary" />
              Card Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-black/50 rounded-xl overflow-hidden aspect-[9/16] max-h-[500px]">
              <div className="absolute inset-0 overflow-hidden" style={{ transform: 'scale(0.26)', transformOrigin: 'top left', width: 1080, height: 1920 }}>
                <PromoCardCanvas
                  playerName={playerName || 'PLAYER NAME'}
                  teamName={teamName || 'TEAM NAME'}
                  jerseyNumber={parseInt(jerseyNumber) || 0}
                  position={position}
                  photoUrl={photoUrl || undefined}
                  template={activeTemplate}
                  cardRef={cardRef}
                />
              </div>
            </div>

            {/* Output Actions */}
            {showPreview && previewCard && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="w-4 h-4" />
                  <span>Claim Code: </span>
                  <Badge variant="secondary" className="font-mono text-sm">{previewCard.claim_code}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-2" onClick={handleSaveImage}>
                    <Download className="w-4 h-4" /> Save Image
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handlePrint}>
                    <Printer className="w-4 h-4" /> Print
                  </Button>
                </div>
                <Button onClick={handleCreateNext} className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                  <Plus className="w-4 h-4" /> Create Next Card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Cards */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Recent Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No cards generated yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentCards.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    {card.photo_url ? (
                      <img src={card.photo_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-primary/20" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">🏀</div>
                    )}
                    <div>
                      <div className="font-semibold text-sm">{card.player_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {card.team_name} • #{card.jersey_number} • {TEMPLATES[card.template_used as TemplateKey]?.label || card.template_used}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">{card.claim_code}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleReprint(card)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
