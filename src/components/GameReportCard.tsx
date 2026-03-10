import { useRef, useState, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { GameStats } from '@/types/basketball';
import { getGameGradeData } from '@/utils/gameGrading';
import { calculateCareerHighs } from '@/utils/statsCalculations';
import hoopJournalQr from '@/assets/hoop-journal-qr.png';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';

interface GameReportCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: GameStats;
  playerName: string;
  playerTeam: string;
  avatarUrl?: string;
  allGames?: GameStats[];
}

function getBestImpact(game: GameStats): { label: string; value: number; stat: string } {
  const weighted = [
    { stat: 'PTS', label: 'Scoring', value: game.points, weight: game.points },
    { stat: 'REB', label: 'Rebounding', value: game.rebounds, weight: game.rebounds },
    { stat: 'AST', label: 'Playmaking', value: game.assists, weight: 1.5 * game.assists },
    { stat: 'STL', label: 'Steals', value: game.steals, weight: 2 * game.steals },
    { stat: 'BLK', label: 'Shot Blocking', value: game.blocks, weight: 2 * game.blocks },
  ];
  const best = weighted.sort((a, b) => b.weight - a.weight)[0];
  return { label: best.label, value: best.value, stat: best.stat };
}

const STAT_ICONS: Record<string, string> = {
  PTS: '🏀', REB: '📊', AST: '🎯', STL: '🔒', BLK: '🛡️', TOV: '↩️',
};

export function GameReportCard({ open, onOpenChange, game, playerName, playerTeam, avatarUrl, allGames }: GameReportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { grade, color, glow, tags, xpEarned, gameScore } = getGameGradeData(game);
  const bestImpact = getBestImpact(game);

  const careerHighsInGame = useMemo(() => {
    if (!allGames || allGames.length === 0) return [];
    const highs = calculateCareerHighs(allGames);
    return highs.filter(h => h.gameId === game.id);
  }, [allGames, game.id]);

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
    { label: 'REB', value: game.rebounds },
    { label: 'AST', value: game.assists },
    { label: 'STL', value: game.steals },
    { label: 'BLK', value: game.blocks },
    { label: 'TOV', value: game.turnovers },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] p-4 bg-card border-border overflow-y-auto max-h-[95vh]">
        <DialogTitle className="sr-only">Game Report Card</DialogTitle>

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
              <div style={{
                width: 1080,
                height: 1350,
                background: 'linear-gradient(180deg, #0a0f1e 0%, #070b16 35%, #0d1220 70%, #111827 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '48px 56px 36px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Background ambient glow */}
                <div style={{
                  position: 'absolute',
                  top: 160,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 600,
                  height: 600,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${color}12 0%, transparent 65%)`,
                  pointerEvents: 'none',
                }} />
                {/* Subtle top light streak */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 800,
                  height: 3,
                  background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
                }} />

                {/* ── Player Identity ── */}
                <div style={{
                  width: 144,
                  height: 144,
                  borderRadius: '50%',
                  border: `4px solid ${color}`,
                  overflow: 'hidden',
                  marginBottom: 14,
                  boxShadow: `0 0 40px ${color}50, 0 0 80px ${color}20`,
                }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', background: '#1e293b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56,
                    }}>🏀</div>
                  )}
                </div>

                <div style={{
                  color: '#f8fafc', fontSize: 30, fontWeight: 800,
                  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2,
                }}>{playerName}</div>
                <div style={{
                  color: '#64748b', fontSize: 16, fontWeight: 700,
                  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 24,
                }}>{playerTeam}</div>

                {/* ── Game Grade ── */}
                <div style={{
                  color: '#475569', fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 4,
                }}>GAME GRADE</div>
                <div style={{
                  fontSize: 130, fontWeight: 900, color, lineHeight: 1,
                  marginBottom: 8, textShadow: glow, letterSpacing: '-0.02em',
                }}>{grade}</div>

                {/* Performance Tag */}
                {tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    {tags.map((tag, i) => (
                      <div key={i} style={{
                        background: `${color}18`,
                        border: `1px solid ${color}35`,
                        borderRadius: 50,
                        padding: '6px 18px',
                        color: color,
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                      }}>{tag.emoji} {tag.label}</div>
                    ))}
                  </div>
                )}

                {/* ── Game Context ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  marginBottom: 6, fontSize: 18, fontWeight: 700,
                }}>
                  <span style={{ color: '#cbd5e1' }}>vs {game.opponent}</span>
                  <span style={{
                    color: game.isWin ? '#4ade80' : '#f87171',
                    fontWeight: 800, fontSize: 16, letterSpacing: '0.05em',
                    background: game.isWin ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                    border: `1px solid ${game.isWin ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                    borderRadius: 6, padding: '3px 12px',
                  }}>{game.isWin ? 'WIN' : 'LOSS'}{scoreDisplay ? ` ${scoreDisplay}` : ''}</span>
                </div>
                <div style={{
                  color: '#475569', fontSize: 14, fontWeight: 500, marginBottom: 16,
                }}>{format(new Date(game.date), 'MMM d, yyyy')}</div>

                {/* ── Game Score ── */}
                <div style={{
                  background: 'rgba(30,41,59,0.6)',
                  border: '1px solid rgba(100,116,139,0.15)',
                  borderRadius: 12, padding: '10px 36px',
                  textAlign: 'center', marginBottom: 20,
                }}>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Game Score</div>
                  <div style={{ color: '#f8fafc', fontSize: 36, fontWeight: 900, lineHeight: 1.1 }}>{gameScore}</div>
                </div>

                {/* ── Best Impact ── */}
                {bestImpact.value > 0 && (
                  <div style={{
                    background: `linear-gradient(135deg, ${color}12, ${color}06)`,
                    border: `1px solid ${color}25`,
                    borderRadius: 10, padding: '8px 24px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    marginBottom: 20,
                  }}>
                    <span style={{ fontSize: 18 }}>⚡</span>
                    <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Best Impact</span>
                    <span style={{ color: '#f8fafc', fontSize: 15, fontWeight: 800 }}>{bestImpact.value} {bestImpact.stat}</span>
                  </div>
                )}

                {/* ── Stat Grid 2×3 ── */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 14, width: '100%', maxWidth: 700, marginBottom: 20,
                }}>
                  {stats.map((s) => (
                    <div key={s.label} style={{
                      background: 'rgba(30,41,59,0.7)',
                      border: '1px solid rgba(100,116,139,0.15)',
                      borderRadius: 14, padding: '20px 12px',
                      textAlign: 'center', position: 'relative',
                    }}>
                      <div style={{
                        fontSize: 10, color: '#475569', marginBottom: 2,
                        position: 'absolute', top: 8, right: 10,
                      }}>{STAT_ICONS[s.label]}</div>
                      <div style={{
                        fontSize: 42, fontWeight: 900, color: '#f8fafc', lineHeight: 1.1,
                      }}>{s.value}</div>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: '#64748b',
                        letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2,
                      }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Career High Callout ── */}
                {careerHighsInGame.length > 0 && (
                  <div style={{
                    display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                    {careerHighsInGame.slice(0, 3).map((ch, i) => (
                      <div key={i} style={{
                        background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.08))',
                        border: '1px solid rgba(255,215,0,0.3)',
                        borderRadius: 8, padding: '6px 16px',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ fontSize: 14 }}>🏆</span>
                        <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 800, letterSpacing: '0.02em' }}>
                          Career High: {ch.displayValue} {ch.stat}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── XP Earned ── */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,107,0,0.15), rgba(255,165,0,0.08))',
                  border: '1px solid rgba(255,107,0,0.3)',
                  borderRadius: 50, padding: '10px 32px',
                  color: '#ff8c3a', fontSize: 18, fontWeight: 800,
                  marginBottom: 28,
                }}>⚡ +{xpEarned} XP Earned</div>

                {/* ── Footer / Branding ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', marginTop: 'auto',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={hoopJournalLogo} alt="" style={{ width: 38, height: 38, borderRadius: 8 }} crossOrigin="anonymous" />
                    <div>
                      <div style={{ color: '#f8fafc', fontSize: 16, fontWeight: 800 }}>Hoop Journal</div>
                      <div style={{ color: '#475569', fontSize: 11, fontWeight: 500 }}>Track Your Game. Improve Every Day.</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ color: '#475569', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>Scan to track your game</div>
                    <img src={hoopJournalQr} alt="QR Code" style={{ width: 72, height: 72, borderRadius: 6 }} crossOrigin="anonymous" />
                  </div>
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
