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
import { Camera, Upload, Zap, Printer, Download, RotateCcw, Eye, Image as ImageIcon, Plus, Clock, Hash, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import hoopJournalLogo from '@/assets/hoop-journal-logo-v2.png';
import courtLines from '@/assets/basketball-court-lines.jpg';
import appStoreBadge from '@/assets/app-store-badge.svg';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { getClassYearOptions, formatClassYear } from '@/utils/classYear';

// ── Template Definitions ──
const TEMPLATES = {
  scorer: {
    label: 'Scorer',
    emoji: '🔥',
    grade: 'A+',
    headline: 'BUCKET GETTER',
    archetype: '3-LEVEL SCORER',
    statusLine: 'ELITE SCORING THREAT',
    stats: { points: 28, rebounds: 4, assists: 3, steals: 2, blocks: 0, turnovers: 2, fgMade: 11, fgAttempted: 18, threePtMade: 4, threePtAttempted: 8, ftMade: 2, ftAttempted: 3 },
    badges: ['🎯 Sharpshooter', '🔥 On Fire', '💰 Money'],
    color: '#FFD700',
    glow: '0 0 80px rgba(255,215,0,0.6)',
  },
  playmaker: {
    label: 'Playmaker',
    emoji: '🎯',
    grade: 'A+',
    headline: 'FLOOR GENERAL',
    archetype: 'PLAYMAKING GUARD',
    statusLine: 'ELITE COURT VISION',
    stats: { points: 14, rebounds: 3, assists: 11, steals: 3, blocks: 0, turnovers: 2, fgMade: 6, fgAttempted: 12, threePtMade: 1, threePtAttempted: 3, ftMade: 1, ftAttempted: 2 },
    badges: ['🎯 Dime Dropper', '👀 Court Vision', '🧠 High IQ'],
    color: '#FF6B00',
    glow: '0 0 80px rgba(255,107,0,0.6)',
  },
  defender: {
    label: 'Defender',
    emoji: '🛡️',
    grade: 'A+',
    headline: 'LOCKDOWN',
    archetype: 'TWO-WAY WING',
    statusLine: 'SHUTDOWN DEFENDER',
    stats: { points: 8, rebounds: 7, assists: 2, steals: 5, blocks: 3, turnovers: 1, fgMade: 3, fgAttempted: 7, threePtMade: 0, threePtAttempted: 1, ftMade: 2, ftAttempted: 4 },
    badges: ['🛡️ Lockdown', '🖐️ Pickpocket', '🧱 Wall'],
    color: '#4ade80',
    glow: '0 0 80px rgba(74,222,128,0.6)',
  },
  shooter: {
    label: 'Shooter',
    emoji: '💧',
    grade: 'A+',
    headline: 'SPLASH',
    archetype: 'ELITE SHOOTER',
    statusLine: 'LIGHTS OUT RANGE',
    stats: { points: 22, rebounds: 2, assists: 2, steals: 1, blocks: 0, turnovers: 1, fgMade: 8, fgAttempted: 14, threePtMade: 6, threePtAttempted: 10, ftMade: 0, ftAttempted: 0 },
    badges: ['💧 Splash', '🎯 Sniper', '🔥 Hot Hand'],
    color: '#60a5fa',
    glow: '0 0 80px rgba(96,165,250,0.6)',
  },
  energy: {
    label: 'Energy Player',
    emoji: '⚡',
    grade: 'A+',
    headline: 'ENERGY SHIFT',
    archetype: 'SPARK PLUG',
    statusLine: 'RELENTLESS MOTOR',
    stats: { points: 12, rebounds: 10, assists: 2, steals: 3, blocks: 2, turnovers: 2, fgMade: 5, fgAttempted: 9, threePtMade: 0, threePtAttempted: 1, ftMade: 2, ftAttempted: 4 },
    badges: ['⚡ Spark Plug', '💪 Hustle', '🏀 Glass Cleaner'],
    color: '#facc15',
    glow: '0 0 80px rgba(250,204,21,0.6)',
  },
  allaround: {
    label: 'All-Around',
    emoji: '🏀',
    grade: 'A+',
    headline: 'ALL-AROUND THREAT',
    archetype: 'COMPLETE HOOPER',
    statusLine: 'DOES IT ALL',
    stats: { points: 18, rebounds: 8, assists: 6, steals: 3, blocks: 2, turnovers: 2, fgMade: 7, fgAttempted: 14, threePtMade: 2, threePtAttempted: 5, ftMade: 2, ftAttempted: 3 },
    badges: ['🏀 Complete Player', '🌟 Versatile', '💯 All-Around'],
    color: '#FFD700',
    glow: '0 0 80px rgba(255,215,0,0.6)',
  },
  dominantbig: {
    label: 'Dominant Big',
    emoji: '🏔️',
    grade: 'A+',
    headline: 'PAINT BEAST',
    archetype: 'DOMINANT BIG',
    statusLine: 'CONTROLS THE PAINT',
    stats: { points: 16, rebounds: 14, assists: 2, steals: 1, blocks: 5, turnovers: 2, fgMade: 7, fgAttempted: 10, threePtMade: 0, threePtAttempted: 0, ftMade: 2, ftAttempted: 5 },
    badges: ['🏔️ Paint Beast', '🧱 Rim Protector', '💪 Boards'],
    color: '#e879f9',
    glow: '0 0 80px rgba(232,121,249,0.6)',
  },
  clutch: {
    label: 'Clutch',
    emoji: '🧊',
    grade: 'A+',
    headline: 'ICE IN VEINS',
    archetype: 'CLUTCH PERFORMER',
    statusLine: 'BIG GAME PLAYER',
    stats: { points: 24, rebounds: 5, assists: 4, steals: 2, blocks: 1, turnovers: 1, fgMade: 9, fgAttempted: 16, threePtMade: 3, threePtAttempted: 6, ftMade: 3, ftAttempted: 3 },
    badges: ['🧊 Ice Cold', '💎 Big Moment', '🎯 Closer'],
    color: '#22d3ee',
    glow: '0 0 80px rgba(34,211,238,0.6)',
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
  claim_token: string | null;
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
  playerName, teamName, jerseyNumber, position, photoUrl, template, cardRef, claimUrl, isNewlyGenerated, classYear 
}: {
  playerName: string;
  teamName: string;
  jerseyNumber: number;
  position?: string;
  photoUrl?: string;
  template: typeof TEMPLATES[TemplateKey];
  cardRef: React.RefObject<HTMLDivElement>;
  claimUrl?: string;
  isNewlyGenerated?: boolean;
  classYear?: number | null;
}) {
  const { color, glow, grade, badges, headline, archetype, statusLine } = template;
  const CANVAS_W = 1080;
  const CANVAS_H = 1920;

  const s = { muted: '#64748b', dim: '#475569', bright: '#f8fafc', sub: '#94a3b8' };

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
      {/* Background glow — flat, no 3D transforms */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        marginLeft: -450, marginTop: -450,
        width: 900, height: 900, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}08 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, transparent 10%, ${color}40 50%, transparent 90%)`,
      }} />

      {/* PROMO BADGE */}
      <div data-canvas-eventtag="true" style={{
        position: 'absolute', top: 32, right: 32, zIndex: 10,
        background: 'linear-gradient(135deg, rgba(168,85,247,0.9), rgba(139,92,246,0.9))',
        borderRadius: 12, padding: '8px 20px',
        color: '#fff', fontSize: 16, fontWeight: 900, letterSpacing: '0.15em',
        boxShadow: '0 4px 20px rgba(168,85,247,0.4)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}>⚡ EVENT CARD</div>

      {/* Content — fixed section spacing for stable exports */}
      <div style={{
        position: 'absolute', top: 96, bottom: 280, left: 72, right: 72,
      }}>
        {/* Avatar — perfect circle, no transforms, pixel-aligned */}
        <div style={{
          width: 540, height: 540, borderRadius: '50%',
          aspectRatio: '1 / 1',
          border: `8px solid ${color}`,
          boxSizing: 'border-box',
          overflow: 'hidden',
          boxShadow: `0 0 60px ${color}30`,
          position: 'absolute', top: 0, left: 0, right: 0,
          marginLeft: 'auto', marginRight: 'auto',
        }}
          data-canvas-avatar="true"
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', aspectRatio: '1 / 1' }} crossOrigin="anonymous" />
          ) : (
            <div style={{
              width: '100%', height: '100%', background: '#1e293b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 8,
            }}>
              <span style={{ fontSize: 112 }}>🏀</span>
              <span style={{ color: s.muted, fontSize: 36, fontWeight: 800 }}>#{jerseyNumber}</span>
            </div>
          )}
        </div>

        {/* Identity block — name is primary, archetype secondary */}
        <div style={{
          position: 'absolute', top: 590, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div data-canvas-name="true" style={{
            color: s.bright, fontSize: 76, fontWeight: 900,
            letterSpacing: '4px', textTransform: 'uppercase',
            textAlign: 'center', lineHeight: 1,
            maxWidth: '100%', wordBreak: 'break-word',
          }}>{playerName}</div>

          <div data-canvas-team="true" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            marginTop: 14, flexWrap: 'wrap',
          }}>
            <span style={{
              color: s.muted, fontSize: 28, fontWeight: 700,
              letterSpacing: '7px', textTransform: 'uppercase',
            }}>{teamName}</span>
            <span style={{ color: s.dim, fontSize: 28, fontWeight: 700 }}>|</span>
            <span style={{
              color: s.muted, fontSize: 28, fontWeight: 700,
              letterSpacing: '4px',
            }}>#{jerseyNumber}{position ? ` • ${position}` : ''}{classYear ? ` • Class of ${classYear}` : ''}</span>
          </div>

          {/* Archetype title */}
          <div data-canvas-archetype="true" data-canvas-color={color} style={{
            color, fontSize: 32, fontWeight: 800,
            letterSpacing: '8px', textTransform: 'uppercase',
            marginTop: 32, textAlign: 'center',
            lineHeight: 1.3,
          }}>{archetype}</div>

          {/* Archetype subtitle */}
          <div data-canvas-status="true" style={{
            color: s.sub, fontSize: 19, fontWeight: 700,
            letterSpacing: '6px', textTransform: 'uppercase',
            marginTop: 10, textAlign: 'center',
            lineHeight: 1.3,
          }}>{statusLine}</div>

          <div style={{
            width: 300, height: 2, marginTop: 24,
            background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
          }} />
        </div>

        {/* Grade — flat 2D rendering, no transforms */}
        <div style={{
          position: 'absolute', top: 940, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{
            position: 'absolute', top: 120, left: 0, right: 0,
            marginLeft: 'auto', marginRight: 'auto',
            width: 500, height: 500, borderRadius: '50%',
            background: `radial-gradient(circle, ${color}10 0%, transparent 55%)`,
            pointerEvents: 'none',
          }} />
          {/* GAME GRADE label */}
          <div data-canvas-label="true" style={{
            color: s.muted, fontSize: 19, fontWeight: 800,
            letterSpacing: '10px', textTransform: 'uppercase',
            textAlign: 'center', marginBottom: 16,
          }}>GAME GRADE</div>
          <div style={{
            fontSize: 244, fontWeight: 900, color,
            lineHeight: 1, textAlign: 'center',
            minHeight: 200,
            textShadow: `0 0 40px ${color}50`,
          }}
            data-canvas-grade="true"
            data-grade-color={color}
            data-grade-glow={`0 0 40px ${color}50`}
          >{grade}</div>
        </div>

        {/* Badges — first badge emphasized */}
        <div data-canvas-badges="true" style={{
          position: 'absolute', top: 1250, left: 0, right: 0,
          display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
          alignItems: 'center',
        }}>
          {badges.slice(0, 3).map((badge, i) => (
            <div key={i} data-canvas-badge={i} style={{
              background: `${color}15`,
              border: `1.5px solid ${color}35`,
              borderRadius: 50,
              padding: '12px 30px',
              color,
              fontSize: i === 0 ? 23 : 21,
              fontWeight: 700,
              letterSpacing: '1px',
            }}>{badge}</div>
          ))}
        </div>
      </div>

      {/* Footer — two-zone layout: branding left, CTA right */}
      <div style={{
        position: 'absolute', bottom: 48, left: 80, right: 80,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        {/* LEFT ZONE: Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <img src={hoopJournalLogo} alt="" style={{ width: 80, height: 80, borderRadius: 16 }} crossOrigin="anonymous" />
          <div data-canvas-footer-brand="true">
            <div style={{ color: s.bright, fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>Hoop Journal</div>
            <div style={{ color: s.dim, fontSize: 14, fontWeight: 600, letterSpacing: '3px', marginTop: 4 }}>EVENT EDITION</div>
          </div>
        </div>
        {/* RIGHT ZONE: QR (primary) + App Store badge (secondary) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div data-canvas-footer-scan="true" style={{ color: s.sub, fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Scan to Claim</div>
          <div style={{ padding: 8, background: 'rgba(255,255,255,0.95)', borderRadius: 12 }}>
            {claimUrl ? (
              <QRCodeSVG value={claimUrl} size={150} bgColor="#ffffff" fgColor="#000000" level="M" />
            ) : (
              <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>Generate card first</div>
            )}
          </div>
          <div data-canvas-footer-claim="true" style={{ color: s.dim, fontSize: 11, fontWeight: 600, letterSpacing: '1px', marginTop: 2 }}>Claim within 72 hours</div>
          <div data-canvas-appstore="true" style={{ marginTop: 6 }}>
            <img src={appStoreBadge} alt="Download on the App Store" style={{ width: 100, height: 'auto', opacity: 0.85 }} crossOrigin="anonymous" />
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
  const exportRef = useRef<HTMLDivElement>(null);

  // ── Camera-reload persistence ──
  // On iOS, opening the native camera causes a full page reload.
  // We use sessionStorage to persist form data across that reload.
  // We use a navigation-aware approach: a "beacon" key is set while this
  // component is mounted. On mount, if the beacon exists AND saved data exists,
  // it means iOS reloaded (not SPA navigation). If the beacon is missing,
  // the user navigated away and back — so we start fresh.
  const STORAGE_KEY = 'quick_mode_form';

  function isReloadNavigation() {
    if (typeof window === 'undefined') return false;

    const navigationEntries = performance.getEntriesByType?.('navigation') as PerformanceNavigationTiming[];
    if (navigationEntries?.length) {
      return navigationEntries[0].type === 'reload';
    }

    return typeof performance !== 'undefined' && 'navigation' in performance
      ? (performance as Performance & { navigation?: { type?: number } }).navigation?.type === 1
      : false;
  }

  function loadSaved() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw || !isReloadNavigation()) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  const saved = useRef(loadSaved());
  const restoredFromReload = useRef(Object.keys(saved.current).length > 0);

  useEffect(() => {
    // Clear stale drafts on fresh visits or SPA route changes.
    // Keep drafts only when the page truly reloaded (iPad/native camera case).
    if (!restoredFromReload.current) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, []);

  function saveFormForCamera(patch: Record<string, any>) {
    try {
      const current = (() => {
        try {
          const raw = sessionStorage.getItem(STORAGE_KEY);
          return raw ? JSON.parse(raw) : {};
        } catch {
          return {};
        }
      })();

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
    } catch {}
  }

  function clearSavedForm() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }

  // Form state — initialise from saved only after a real page reload
  const [playerName, setPlayerName] = useState(saved.current.playerName || '');
  const [teamName, setTeamName] = useState(saved.current.teamName || '');
  const [jerseyNumber, setJerseyNumber] = useState(saved.current.jerseyNumber || '');
  const [position, setPosition] = useState(saved.current.position || '');
  const [classYear, setClassYear] = useState<string>(saved.current.classYear || '');
  const [templateKey, setTemplateKey] = useState<TemplateKey>(saved.current.templateKey || 'scorer');
  const [contactInfo, setContactInfo] = useState(saved.current.contactInfo || '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(saved.current.photoUrl || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Save form on every change so camera interruptions can recover the latest draft
  useEffect(() => {
    saveFormForCamera({ playerName, teamName, jerseyNumber, position, classYear, templateKey, contactInfo, photoUrl });
  }, [playerName, teamName, jerseyNumber, position, classYear, templateKey, contactInfo, photoUrl]);

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

  // Photo handling — persist as data URL so it survives interruption/reload cases
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Photo must be under 20MB');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPhotoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  // In-app camera flow — avoids the iPad native file-input camera reload path
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } },
      });
      streamRef.current = stream;
      setShowWebcam(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error('Webcam error:', err);
      toast.error('Could not access camera. Please use Upload instead.');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowWebcam(false);
  }, []);

  const captureFromWebcam = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) {
        stopWebcam();
        return;
      }

      const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhotoFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      stopWebcam();
    }, 'image/jpeg', 0.92);
  }, [stopWebcam]);

  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Generate AI avatar from uploaded photo
  const handleGenerateAvatar = useCallback(async () => {
    if (!photoFile && !photoUrl) {
      toast.error('Upload a photo first to generate an avatar');
      return;
    }
    setGeneratingAvatar(true);
    try {
      // Convert the photo file to a base64 data URL to avoid blob URL issues
      let imageUrl = photoUrl;
      if (photoFile) {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });
      }
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { imageUrl },
      });
      if (error) throw error;
      if (data?.imageData) {
        // imageData is a base64 data URL from the AI model
        const resp = await fetch(data.imageData);
        const blob = await resp.blob();
        const file = new File([blob], `avatar-${Date.now()}.png`, { type: 'image/png' });
        setPhotoFile(file);
        setPhotoUrl(URL.createObjectURL(file));
        toast.success(data.cached ? 'Avatar loaded from cache!' : 'Avatar generated!');
      } else {
        throw new Error('No avatar image returned');
      }
    } catch (err: any) {
      console.error('Avatar generation error:', err);
      toast.error('Failed to generate avatar. Using original photo.');
    } finally {
      setGeneratingAvatar(false);
    }
  }, [photoUrl, photoFile]);

  // Upload photo to storage
  async function uploadPhoto(file: File): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Upload error: not authenticated');
      return null;
    }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/event-cards/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
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
      // If we have a File, upload it directly
      // If photoUrl is a data URL (from sessionStorage restore), convert to File first
      let fileToUpload = photoFile;
      if (!fileToUpload && photoUrl?.startsWith('data:')) {
        const resp = await fetch(photoUrl);
        const blob = await resp.blob();
        fileToUpload = new File([blob], `photo-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
      }
      if (fileToUpload) {
        uploadedUrl = await uploadPhoto(fileToUpload);
        if (!uploadedUrl) {
          toast.error('Failed to upload photo');
          setGenerating(false);
          return;
        }
      }

      const claimCode = generateClaimCode();
      const claimToken = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
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
        claim_token: claimToken,
        expires_at: expiresAt,
        contact_info: contactInfo || null,
        class_year: classYear ? parseInt(classYear) : null,
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
    const target = exportRef.current || cardRef.current;
    if (!target) return;
    try {
      const blob = await capturePromoCard(target);
      if (!blob) throw new Error('Failed to generate image');
      const file = new File([blob], `${playerName.replace(/\s+/g, '-')}-event-card.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const link = document.createElement('a');
        link.download = file.name;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }
      toast.success('Card saved!');
    } catch {
      toast.error('Failed to save image');
    }
  }

  // Print card
  async function handlePrint() {
    const target = exportRef.current || cardRef.current;
    if (!target) return;
    try {
      const blob = await capturePromoCard(target);
      if (!blob) throw new Error('Failed to generate image');
      const url = URL.createObjectURL(blob);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000"><img src="${url}" style="max-width:100%;max-height:100vh" /></body></html>`);
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

  // Delete a card
  async function handleDeleteCard(cardId: string) {
    try {
      // Delete audit log entries first (foreign key)
      await supabase.from('quick_mode_audit_log').delete().eq('card_id', cardId);
      const { error } = await supabase.from('quick_cards').delete().eq('id', cardId);
      if (error) throw error;
      toast.success('Card deleted');
      setRecentCards(prev => prev.filter(c => c.id !== cardId));
      setTodayCount(prev => prev - 1);
      if (previewCard?.id === cardId) {
        setPreviewCard(null);
        setShowPreview(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete card');
    }
  }

  // Create next card
  function handleCreateNext() {
    setPlayerName('');
    setJerseyNumber('');
    setPosition('');
    setClassYear('');
    setContactInfo('');
    setPhotoUrl(null);
    setPhotoFile(null);
    setShowPreview(false);
    setPreviewCard(null);
    setTeamName(lastTeamName);
    setTemplateKey(lastTemplate);
    clearSavedForm();
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

  // Helper: draw text with letter-spacing (Canvas 2D has no native letter-spacing)
  function drawTrackedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
    const chars = Array.from(text);
    const totalWidth = chars.reduce((acc, ch) => acc + ctx.measureText(ch).width + tracking, -tracking);
    let cx = x - totalWidth / 2;
    for (const ch of chars) {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + tracking;
    }
  }

  // Helper: draw a rounded rect pill
  function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fillColor: string, strokeColor: string, strokeWidth: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }

  // Canvas 2D export — hides all text + avatar, captures bg via html2canvas, redraws everything crisp
  async function capturePromoCard(container: HTMLElement): Promise<Blob | null> {
    const W = 1080, H = 1920;
    const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    // Query all elements to redraw
    const avatarEl = container.querySelector('[data-canvas-avatar]') as HTMLElement | null;
    const gradeEl = container.querySelector('[data-canvas-grade]') as HTMLElement | null;
    const nameEl = container.querySelector('[data-canvas-name]') as HTMLElement | null;
    const teamEl = container.querySelector('[data-canvas-team]') as HTMLElement | null;
    const archetypeEl = container.querySelector('[data-canvas-archetype]') as HTMLElement | null;
    const statusEl = container.querySelector('[data-canvas-status]') as HTMLElement | null;
    const labelEl = container.querySelector('[data-canvas-label]') as HTMLElement | null;
    const badgesEl = container.querySelector('[data-canvas-badges]') as HTMLElement | null;
    const eventTagEl = container.querySelector('[data-canvas-eventtag]') as HTMLElement | null;
    const footerBrandEl = container.querySelector('[data-canvas-footer-brand]') as HTMLElement | null;
    const footerScanEl = container.querySelector('[data-canvas-footer-scan]') as HTMLElement | null;
    const footerClaimEl = container.querySelector('[data-canvas-footer-claim]') as HTMLElement | null;

    const allEls = [avatarEl, gradeEl, nameEl, teamEl, archetypeEl, statusEl, labelEl, badgesEl, eventTagEl, footerBrandEl, footerScanEl, footerClaimEl].filter(Boolean) as HTMLElement[];

    // Read bounding rects BEFORE hiding
    const containerRect = container.getBoundingClientRect();
    const scaleX = W / containerRect.width;
    const scaleY = H / containerRect.height;

    function getPos(el: HTMLElement) {
      const r = el.getBoundingClientRect();
      return {
        cx: (r.left - containerRect.left + r.width / 2) * scaleX,
        cy: (r.top - containerRect.top + r.height / 2) * scaleY,
        x: (r.left - containerRect.left) * scaleX,
        y: (r.top - containerRect.top) * scaleY,
        w: r.width * scaleX,
        h: r.height * scaleY,
      };
    }

    // Collect positions before hiding
    const positions: Record<string, ReturnType<typeof getPos>> = {};
    const posKeys: [HTMLElement | null, string][] = [
      [avatarEl, 'avatar'], [gradeEl, 'grade'], [nameEl, 'name'], [teamEl, 'team'],
      [archetypeEl, 'archetype'], [statusEl, 'status'], [labelEl, 'label'],
      [badgesEl, 'badges'], [eventTagEl, 'eventTag'],
      [footerBrandEl, 'footerBrand'], [footerScanEl, 'footerScan'], [footerClaimEl, 'footerClaim'],
    ];
    for (const [el, key] of posKeys) {
      if (el) positions[key] = getPos(el);
    }

    // Also collect individual badge positions
    const badgeEls = container.querySelectorAll('[data-canvas-badge]') as NodeListOf<HTMLElement>;
    const badgePositions: ReturnType<typeof getPos>[] = [];
    badgeEls.forEach(el => badgePositions.push(getPos(el)));

    // Collect avatar data
    const avatarImg = avatarEl?.querySelector('img') as HTMLImageElement | null;
    const avatarColor = activeTemplate.color;
    const color = activeTemplate.color;

    // Hide ALL elements for clean html2canvas pass
    allEls.forEach(el => el.style.visibility = 'hidden');

    const rawCanvas = await html2canvas(container, {
      scale: 2, useCORS: true, backgroundColor: '#070b16',
      width: W, height: H, windowWidth: W, windowHeight: H, logging: false,
    });

    // Restore visibility
    allEls.forEach(el => el.style.visibility = '');

    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#070b16';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, W, H);

    // ── 1. Redraw avatar as perfect circle ──
    if (avatarEl && positions.avatar) {
      const p = positions.avatar;
      const radius = p.w / 2;
      const borderWidth = 8 * scaleX;

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = avatarColor;
      ctx.lineWidth = borderWidth;
      ctx.shadowColor = avatarColor;
      ctx.shadowBlur = 80;
      ctx.stroke();
      ctx.restore();

      if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, radius - borderWidth / 2, 0, Math.PI * 2);
        ctx.clip();
        const imgW = avatarImg.naturalWidth;
        const imgH = avatarImg.naturalHeight;
        const diam = (radius - borderWidth / 2) * 2;
        const scale = Math.max(diam / imgW, diam / imgH);
        const sw = imgW * scale;
        const sh = imgH * scale;
        ctx.drawImage(avatarImg, p.cx - sw / 2, p.cy - sh / 2, sw, sh);
        ctx.restore();
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, radius - borderWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.restore();
      }
    }

    // ── 2. Redraw player name ──
    if (nameEl && positions.name) {
      const p = positions.name;
      ctx.save();
      ctx.font = `900 76px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f8fafc';
      const nameText = nameEl.textContent || '';
      drawTrackedText(ctx, nameText.toUpperCase(), p.cx, p.cy, 76 * 0.06);
      ctx.restore();
    }

    // ── 3. Redraw team/number line ──
    if (teamEl && positions.team) {
      const p = positions.team;
      ctx.save();
      ctx.font = `700 28px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748b';
      const teamText = teamEl.textContent || '';
      drawTrackedText(ctx, teamText.toUpperCase(), p.cx, p.cy, 28 * 0.15);
      ctx.restore();
    }

    // ── 4. Redraw archetype ──
    if (archetypeEl && positions.archetype) {
      const p = positions.archetype;
      ctx.save();
      ctx.font = `800 32px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.shadowColor = `${color}66`;
      ctx.shadowBlur = 30;
      const archText = archetypeEl.textContent || '';
      drawTrackedText(ctx, archText.toUpperCase(), p.cx, p.cy, 32 * 0.25);
      ctx.restore();
    }

    // ── 5. Redraw status line ──
    if (statusEl && positions.status) {
      const p = positions.status;
      ctx.save();
      ctx.font = `700 19px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      ctx.globalAlpha = 0.75;
      const statusText = statusEl.textContent || '';
      drawTrackedText(ctx, statusText.toUpperCase(), p.cx, p.cy, 19 * 0.35);
      ctx.restore();
    }

    // ── 6. Redraw "GAME GRADE" label ──
    if (labelEl && positions.label) {
      const p = positions.label;
      ctx.save();
      ctx.font = `800 19px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748b';
      ctx.globalAlpha = 0.85;
      drawTrackedText(ctx, 'GAME GRADE', p.cx, p.cy, 19 * 0.5);
      ctx.restore();
    }

    // ── 7. Redraw grade text ──
    if (gradeEl && positions.grade) {
      const p = positions.grade;
      const gradeColor = gradeEl.getAttribute('data-grade-color') || color;
      const gradeGlow = gradeEl.getAttribute('data-grade-glow') || '';

      ctx.save();
      ctx.font = `900 244px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = gradeColor;

      const glowMatch = gradeGlow.match(/rgba?\(([^)]+)\)/);
      if (glowMatch) {
        ctx.shadowColor = `rgba(${glowMatch[1]})`;
        ctx.shadowBlur = 60;
      }

      ctx.fillText(activeTemplate.grade, p.cx, p.cy);
      ctx.restore();
    }

    // ── 8. Redraw badges as pills ──
    if (badgesEl && badgePositions.length > 0) {
      const badges = activeTemplate.badges.slice(0, 3);
      badgePositions.forEach((bp, i) => {
        if (i >= badges.length) return;
        const badge = badges[i];
        const isPrimary = i === 0;
        const fontSize = isPrimary ? 23 : 21;
        const pad = isPrimary ? 34 : 30;
        const padV = isPrimary ? 13 : 12;

        // Draw pill background
        ctx.save();
        const pillH = (fontSize + padV * 2);
        const pillY = bp.cy - pillH / 2;
        drawPill(
          ctx, bp.x, pillY, bp.w, pillH, 50,
          isPrimary ? `${color}33` : `${color}1a`,
          isPrimary ? `${color}80` : `${color}46`,
          1.5
        );

        // Draw badge text
        ctx.font = `${isPrimary ? 800 : 700} ${fontSize}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.globalAlpha = isPrimary ? 1 : 0.8;
        ctx.fillText(badge, bp.cx, bp.cy);
        ctx.restore();
      });
    }

    // ── 9. Redraw EVENT CARD tag ──
    if (eventTagEl && positions.eventTag) {
      const p = positions.eventTag;
      ctx.save();
      // Draw purple pill background
      const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
      grad.addColorStop(0, 'rgba(168,85,247,0.9)');
      grad.addColorStop(1, 'rgba(139,92,246,0.9)');
      drawPill(ctx, p.x, p.y, p.w, p.h, 12, 'transparent', 'rgba(255,255,255,0.2)', 1);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 12);
      ctx.fill();
      // Text
      ctx.font = `900 16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      drawTrackedText(ctx, '⚡ EVENT CARD', p.cx, p.cy, 16 * 0.15);
      ctx.restore();
    }

    // ── 10. Redraw footer branding text ──
    if (footerBrandEl && positions.footerBrand) {
      const p = positions.footerBrand;
      ctx.save();
      // Title
      ctx.font = `800 28px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText('Hoop Journal', p.x, p.cy - 14);
      // Subtitle
      ctx.font = `600 14px ${FONT}`;
      ctx.fillStyle = '#475569';
      drawTrackedText(ctx, 'EVENT EDITION', p.x + ctx.measureText('EVENT EDITION').width / 2, p.cy + 16, 14 * 0.15);
      ctx.restore();
    }

    // ── 11. Redraw footer scan/claim text ──
    if (footerScanEl && positions.footerScan) {
      const p = positions.footerScan;
      ctx.save();
      ctx.font = `700 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      drawTrackedText(ctx, 'SCAN TO CLAIM', p.cx, p.cy, 12 * 0.1);
      ctx.restore();
    }
    if (footerClaimEl && positions.footerClaim) {
      const p = positions.footerClaim;
      ctx.save();
      ctx.font = `600 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#475569';
      ctx.fillText('Claim within 72 hours', p.cx, p.cy);
      ctx.restore();
    }

    return new Promise((resolve) => out.toBlob((b) => resolve(b), 'image/png'));
  }

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
              <div className="grid grid-cols-4 gap-2">
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
              <div>
                <Label htmlFor="qm-classyear" className="text-sm font-semibold">Class Year</Label>
                <Select value={classYear} onValueChange={setClassYear}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {getClassYearOptions().map((y) => (
                      <SelectItem key={y} value={String(y)}>Class of {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Player Photo *</Label>
              {photoUrl ? (
                <div className="space-y-2">
                  <div className="relative w-full aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-primary/30">
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setPhotoUrl(null); setPhotoFile(null); }}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full max-w-[200px] mx-auto flex gap-2"
                    onClick={handleGenerateAvatar}
                    disabled={generatingAvatar}
                  >
                    {generatingAvatar ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Generate Avatar</>
                    )}
                  </Button>
                </div>
               ) : showWebcam ? (
                <div className="space-y-3">
                  <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-xl overflow-hidden border-2 border-primary/30 bg-black">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2 max-w-[280px] mx-auto">
                    <Button onClick={captureFromWebcam} className="flex-1 gap-2">
                      <Camera className="w-4 h-4" /> Capture
                    </Button>
                    <Button variant="outline" onClick={stopWebcam} className="gap-2">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {/* Upload input stays available; camera uses in-app capture to avoid iPad reloads */}
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  {isMobileDevice ? (
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={startWebcam}
                    >
                      <Camera className="w-4 h-4" /> Camera
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex-1 gap-2" onClick={startWebcam}>
                      <Camera className="w-4 h-4" /> Camera
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </Button>
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

        {/* Hidden full-size export canvas */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: -3000,
            top: 0,
            width: 1080,
            height: 1920,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <PromoCardCanvas
            playerName={playerName || 'PLAYER NAME'}
            teamName={teamName || 'TEAM NAME'}
            jerseyNumber={parseInt(jerseyNumber) || 0}
            position={position}
            photoUrl={photoUrl || undefined}
            template={activeTemplate}
            cardRef={exportRef}
            claimUrl={previewCard?.claim_token ? `https://hoopjournal.me/claim?card_id=${previewCard.id}&token=${previewCard.claim_token}` : undefined}
          />
        </div>

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
                  claimUrl={previewCard?.claim_token ? `https://hoopjournal.me/claim?card_id=${previewCard.id}&token=${previewCard.claim_token}` : undefined}
                  isNewlyGenerated={showPreview}
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
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs font-mono">{card.claim_code}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleReprint(card)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCard(card.id)}>
                      <Trash2 className="w-4 h-4" />
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
