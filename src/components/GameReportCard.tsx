import { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { GameStats } from '@/types/basketball';
import { getGameGradeData } from '@/utils/gameGrading';
import hoopJournalQr from '@/assets/hoop-journal-qr.png';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';

interface GameReportCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: GameStats;
  playerName: string;
  playerTeam: string;
  avatarUrl?: string;
}

export function GameReportCard({ open, onOpenChange, game, playerName, playerTeam, avatarUrl }: GameReportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { grade, color, glow, tags, xpEarned, gameScore } = getGameGradeData(game);

  const scoreDisplay = game.finalScoreUs !== undefined && game.finalScoreThem !== undefined
    ? `${game.finalScoreUs} – ${game.finalScoreThem}`
    : null;

  const captureCard = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      width: 1080,
      height: 1350,
    });
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
  }, []);

  const handleDownload = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('Failed to generate image');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `game-report-vs-${game.opponent.replace(/\s+/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report card downloaded!');
    } catch {
      toast.error('Failed to generate report card');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('Failed to generate image');
      const file = new File([blob], 'game-report.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Game Report vs ${game.opponent}`,
          text: `Check out my game report! ${game.points} PTS vs ${game.opponent} 🏀`,
          files: [file],
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        toast.success('Image copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error('Failed to share');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    setExporting(true);
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('Failed');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy image');
    } finally {
      setExporting(false);
    }
  };

  const stats = [
    { label: 'PTS', value: game.points },
    { label: 'AST', value: game.assists },
    { label: 'REB', value: game.rebounds },
    { label: 'STL', value: game.steals },
    { label: 'BLK', value: game.blocks },
    { label: 'TOV', value: game.turnovers },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] p-4 bg-card border-border overflow-y-auto max-h-[95vh]">
        <DialogTitle className="sr-only">Game Report Card</DialogTitle>

        {/* Scaled preview of the 1080x1350 card */}
        <div className="w-full overflow-hidden rounded-lg" style={{ aspectRatio: '1080/1350' }}>
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div
              ref={cardRef}
              style={{
                width: 1080,
                height: 1350,
                transformOrigin: 'top left',
                transform: `scale(${1 / (1080 / 440)})`,
                fontFamily: "'Inter', sans-serif",
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
            {/* Use inline styles for export fidelity */}
            <div style={{
              width: 1080,
              height: 1350,
              background: 'linear-gradient(180deg, #0f1729 0%, #0a0e1a 40%, #111827 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '60px 60px 40px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Ambient glow behind grade */}
              <div style={{
                position: 'absolute',
                top: 200,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 500,
                height: 500,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              {/* Avatar */}
              <div style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                border: `4px solid ${color}`,
                overflow: 'hidden',
                marginBottom: 16,
                boxShadow: `0 0 30px ${color}40`,
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 48,
                  }}>🏀</div>
                )}
              </div>

              {/* Player Name */}
              <div style={{
                color: '#f8fafc',
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: '0.02em',
                marginBottom: 4,
                textTransform: 'uppercase',
              }}>{playerName}</div>

              <div style={{
                color: '#94a3b8',
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 32,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>{playerTeam}</div>

              {/* Game Grade Label */}
              <div style={{
                color: '#64748b',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}>Game Grade</div>

              {/* Grade */}
              <div style={{
                fontSize: 140,
                fontWeight: 900,
                color,
                lineHeight: 1,
                marginBottom: 24,
                textShadow: glow,
                letterSpacing: '-0.02em',
              }}>{grade}</div>

              {/* Performance Tags */}
              {tags.length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 28,
                }}>
                  {tags.map((tag, i) => (
                    <div key={i} style={{
                      background: 'rgba(255, 107, 0, 0.15)',
                      border: '1px solid rgba(255, 107, 0, 0.3)',
                      borderRadius: 50,
                      padding: '8px 20px',
                      color: '#ff8c3a',
                      fontSize: 16,
                      fontWeight: 700,
                    }}>{tag.emoji} {tag.label}</div>
                  ))}
                </div>
              )}

              {/* Game Info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                marginBottom: 32,
                color: '#cbd5e1',
                fontSize: 20,
                fontWeight: 600,
              }}>
                <span>VS {game.opponent}</span>
                <span style={{
                  color: game.isWin ? '#4ade80' : '#f87171',
                  fontWeight: 800,
                }}>{game.isWin ? 'WIN' : 'LOSS'}{scoreDisplay ? ` ${scoreDisplay}` : ''}</span>
              </div>

              <div style={{
                color: '#64748b',
                fontSize: 16,
                fontWeight: 500,
                marginBottom: 36,
              }}>{format(new Date(game.date), 'MMMM d, yyyy')}</div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                width: '100%',
                maxWidth: 720,
                marginBottom: 32,
              }}>
                {stats.map((s) => (
                  <div key={s.label} style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(100, 116, 139, 0.2)',
                    borderRadius: 16,
                    padding: '24px 16px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 48,
                      fontWeight: 900,
                      color: '#f8fafc',
                      lineHeight: 1.1,
                    }}>{s.value}</div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#64748b',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      marginTop: 4,
                    }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* XP Earned */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.15), rgba(255, 165, 0, 0.1))',
                border: '1px solid rgba(255, 107, 0, 0.3)',
                borderRadius: 12,
                padding: '12px 32px',
                color: '#ff8c3a',
                fontSize: 20,
                fontWeight: 800,
                marginBottom: 40,
              }}>⚡ +{xpEarned} XP Earned</div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                marginTop: 'auto',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={hoopJournalLogo} alt="" style={{ width: 40, height: 40, borderRadius: 8 }} crossOrigin="anonymous" />
                  <div>
                    <div style={{ color: '#f8fafc', fontSize: 18, fontWeight: 800 }}>Hoop Journal</div>
                    <div style={{ color: '#64748b', fontSize: 12, fontWeight: 500 }}>Track Your Game. Improve Every Day.</div>
                  </div>
                </div>
                <img src={hoopJournalQr} alt="QR Code" style={{ width: 80, height: 80, borderRadius: 8 }} crossOrigin="anonymous" />
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button onClick={handleDownload} disabled={exporting} className="flex-1 gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button onClick={handleShare} disabled={exporting} variant="secondary" className="flex-1 gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button onClick={handleCopy} disabled={exporting} variant="outline" size="icon">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
