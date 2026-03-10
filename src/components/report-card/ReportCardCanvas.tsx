import { forwardRef, useMemo } from 'react';
import { format } from 'date-fns';
import type { GameStats } from '@/types/basketball';
import { getGameGradeData } from '@/utils/gameGrading';
import { calculateCareerHighs } from '@/utils/statsCalculations';
import hoopJournalQr from '@/assets/hoop-journal-qr.png';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';

interface ReportCardCanvasProps {
  game: GameStats;
  playerName: string;
  playerTeam: string;
  avatarUrl?: string;
  allGames?: GameStats[];
}

function getBestImpact(game: GameStats) {
  const weighted = [
    { stat: 'PTS', label: 'Scoring', value: game.points, weight: game.points },
    { stat: 'REB', label: 'Rebounding', value: game.rebounds, weight: game.rebounds },
    { stat: 'AST', label: 'Playmaking', value: game.assists, weight: 1.5 * game.assists },
    { stat: 'STL', label: 'Steals', value: game.steals, weight: 2 * game.steals },
    { stat: 'BLK', label: 'Shot Blocking', value: game.blocks, weight: 2 * game.blocks },
  ];
  return weighted.sort((a, b) => b.weight - a.weight)[0];
}

const STAT_ICONS: Record<string, string> = {
  PTS: '🏀', REB: '📊', AST: '🎯', STL: '🔒', BLK: '🛡️', TOV: '↩️',
};

export const ReportCardCanvas = forwardRef<HTMLDivElement, ReportCardCanvasProps>(
  ({ game, playerName, playerTeam, avatarUrl, allGames }, ref) => {
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

    const stats = [
      { label: 'PTS', value: game.points },
      { label: 'REB', value: game.rebounds },
      { label: 'AST', value: game.assists },
      { label: 'STL', value: game.steals },
      { label: 'BLK', value: game.blocks },
      { label: 'TOV', value: game.turnovers },
    ];

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1350,
          fontFamily: "'Inter', sans-serif",
          background: 'linear-gradient(180deg, #0a0f1e 0%, #070b16 35%, #0d1220 70%, #111827 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 80px 48px',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Background ambient glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}10 0%, transparent 65%)`,
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

        {/* ── Content wrapper for vertical centering ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 920,
          flex: 1,
          justifyContent: 'space-between',
        }}>
          {/* Top section: Player identity + Grade */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {/* Avatar */}
            <div style={{
              width: 128,
              height: 128,
              borderRadius: '50%',
              border: `4px solid ${color}`,
              overflow: 'hidden',
              marginBottom: 12,
              boxShadow: `0 0 40px ${color}50, 0 0 80px ${color}20`,
              flexShrink: 0,
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              ) : (
                <div style={{
                  width: '100%', height: '100%', background: '#1e293b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48,
                }}>🏀</div>
              )}
            </div>

            <div style={{
              color: '#f8fafc', fontSize: 28, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2,
              textAlign: 'center',
            }}>{playerName}</div>
            <div style={{
              color: '#64748b', fontSize: 15, fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20,
              textAlign: 'center',
            }}>{playerTeam}</div>

            {/* Game Grade */}
            <div style={{
              color: '#475569', fontSize: 12, fontWeight: 700,
              letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 0,
              textAlign: 'center',
            }}>GAME GRADE</div>
            <div style={{
              fontSize: 120, fontWeight: 900, color, lineHeight: 1,
              marginBottom: 4, textShadow: glow, letterSpacing: '-0.02em',
              textAlign: 'center',
            }}>{grade}</div>

            {/* Performance Tags */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                {tags.map((tag, i) => (
                  <div key={i} style={{
                    background: `${color}18`,
                    border: `1px solid ${color}35`,
                    borderRadius: 50,
                    padding: '5px 16px',
                    color: color,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}>{tag.emoji} {tag.label}</div>
                ))}
              </div>
            )}
          </div>

          {/* Middle section: Game context + stats */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {/* Game Context */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              marginBottom: 4, fontSize: 17, fontWeight: 700,
              justifyContent: 'center',
            }}>
              <span style={{ color: '#cbd5e1' }}>vs {game.opponent}</span>
              <span style={{
                color: game.isWin ? '#4ade80' : '#f87171',
                fontWeight: 800, fontSize: 15, letterSpacing: '0.05em',
                background: game.isWin ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                border: `1px solid ${game.isWin ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                borderRadius: 6, padding: '3px 12px',
              }}>{game.isWin ? 'WIN' : 'LOSS'}{scoreDisplay ? ` ${scoreDisplay}` : ''}</span>
            </div>
            <div style={{
              color: '#475569', fontSize: 13, fontWeight: 500, marginBottom: 14,
              textAlign: 'center',
            }}>{format(new Date(game.date), 'MMM d, yyyy')}</div>

            {/* Game Score + Best Impact row */}
            <div style={{
              display: 'flex', gap: 14, marginBottom: 18, justifyContent: 'center', flexWrap: 'wrap',
            }}>
              <div style={{
                background: 'rgba(30,41,59,0.6)',
                border: '1px solid rgba(100,116,139,0.15)',
                borderRadius: 12, padding: '10px 32px',
                textAlign: 'center',
              }}>
                <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Game Score</div>
                <div style={{ color: '#f8fafc', fontSize: 34, fontWeight: 900, lineHeight: 1.1 }}>{gameScore}</div>
              </div>
              {bestImpact.value > 0 && (
                <div style={{
                  background: `linear-gradient(135deg, ${color}12, ${color}06)`,
                  border: `1px solid ${color}25`,
                  borderRadius: 12, padding: '10px 24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Best Impact</div>
                  <div style={{ color: '#f8fafc', fontSize: 34, fontWeight: 900, lineHeight: 1.1 }}>
                    {bestImpact.value} <span style={{ fontSize: 16, color: '#94a3b8', fontWeight: 700 }}>{bestImpact.stat}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Stat Grid 2×3 */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12, width: '100%', maxWidth: 680, marginBottom: 16,
            }}>
              {stats.map((s) => (
                <div key={s.label} style={{
                  background: 'rgba(30,41,59,0.7)',
                  border: '1px solid rgba(100,116,139,0.15)',
                  borderRadius: 14, padding: '18px 12px',
                  textAlign: 'center', position: 'relative',
                }}>
                  <div style={{
                    fontSize: 10, color: '#475569', marginBottom: 2,
                    position: 'absolute', top: 8, right: 10,
                  }}>{STAT_ICONS[s.label]}</div>
                  <div style={{
                    fontSize: 40, fontWeight: 900, color: '#f8fafc', lineHeight: 1.1,
                  }}>{s.value}</div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#64748b',
                    letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2,
                  }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Career High Callout */}
            {careerHighsInGame.length > 0 && (
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
                marginBottom: 12,
              }}>
                {careerHighsInGame.slice(0, 3).map((ch, i) => (
                  <div key={i} style={{
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.08))',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: 8, padding: '5px 14px',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 13 }}>🏆</span>
                    <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 800, letterSpacing: '0.02em' }}>
                      Career High: {ch.displayValue} {ch.stat}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* XP Earned */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,107,0,0.15), rgba(255,165,0,0.08))',
              border: '1px solid rgba(255,107,0,0.3)',
              borderRadius: 50, padding: '8px 28px',
              color: '#ff8c3a', fontSize: 16, fontWeight: 800,
            }}>⚡ +{xpEarned} XP Earned</div>
          </div>

          {/* Footer / Branding */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={hoopJournalLogo} alt="" style={{ width: 36, height: 36, borderRadius: 8 }} crossOrigin="anonymous" />
              <div>
                <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 800 }}>Hoop Journal</div>
                <div style={{ color: '#475569', fontSize: 10, fontWeight: 500 }}>Track Your Game. Improve Every Day.</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ color: '#475569', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>Scan to track your game</div>
              <img src={hoopJournalQr} alt="QR Code" style={{ width: 64, height: 64, borderRadius: 6 }} crossOrigin="anonymous" />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ReportCardCanvas.displayName = 'ReportCardCanvas';
