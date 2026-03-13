import { forwardRef, useMemo } from 'react';
import { format } from 'date-fns';
import type { GameStats } from '@/types/basketball';
import { getGameGradeData } from '@/utils/gameGrading';
import { calculateCareerHighs } from '@/utils/statsCalculations';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';
import hoopJournalQr from '@/assets/hoop-journal-qr.png';

interface ReportCardCanvasProps {
  game: GameStats;
  playerName: string;
  playerTeam: string;
  avatarUrl?: string;
  allGames?: GameStats[];
}

function getBestImpact(game: GameStats) {
  const weighted = [
    { stat: 'PTS', value: game.points, weight: game.points },
    { stat: 'REB', value: game.rebounds, weight: game.rebounds },
    { stat: 'AST', value: game.assists, weight: 1.5 * game.assists },
    { stat: 'STL', value: game.steals, weight: 2 * game.steals },
    { stat: 'BLK', value: game.blocks, weight: 2 * game.blocks },
  ];
  return weighted.sort((a, b) => b.weight - a.weight)[0];
}

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

    // Shared text style helper
    const s = {
      muted: '#64748b' as const,
      dim: '#475569' as const,
      bright: '#f8fafc' as const,
      sub: '#94a3b8' as const,
    };

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: 'linear-gradient(180deg, #070b16 0%, #0a0f1e 25%, #0d1424 50%, #0a0f1e 75%, #070b16 100%)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Background Effects ── */}
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
        {/* Subtle vertical lines for sports graphic feel */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 80, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(100,116,139,0.08) 30%, rgba(100,116,139,0.08) 70%, transparent)',
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: 80, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(100,116,139,0.08) 30%, rgba(100,116,139,0.08) 70%, transparent)',
        }} />

        {/* ── Content Safe Zone ── */}
        <div style={{
          position: 'absolute',
          top: 140, bottom: 160, left: 70, right: 70,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
        }}>

          {/* ═══ ZONE 1+2: Avatar + Grade Side-by-Side ═══ */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', marginBottom: 32, gap: 48,
          }}>
            {/* Left: Avatar */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              flexShrink: 0,
            }}>
              <div style={{
                width: 360, height: 360, borderRadius: '50%',
                border: `7px solid ${color}`,
                overflow: 'hidden',
                boxShadow: `0 0 100px ${color}40, 0 0 200px ${color}15`,
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', background: '#1e293b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 120,
                  }}>🏀</div>
                )}
              </div>
            </div>

            {/* Right: Grade + Tags */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              position: 'relative', marginTop: 40,
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 440, height: 440, borderRadius: '50%',
                background: `radial-gradient(circle, ${color}15 0%, transparent 60%)`,
                pointerEvents: 'none',
              }} />
              <div style={{
                color: s.dim, fontSize: 18, fontWeight: 800,
                letterSpacing: '0.4em', textTransform: 'uppercase',
                textAlign: 'center', marginBottom: 0,
              }}>GAME GRADE</div>
              <div style={{
                fontSize: 240, fontWeight: 900, color,
                lineHeight: 1, textShadow: glow,
                letterSpacing: '-0.03em', textAlign: 'center',
                position: 'relative',
              }}>{grade}</div>
              {tags.length > 0 && (
                <div style={{
                  display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
                  marginTop: 4,
                }}>
                  {tags.slice(0, 3).map((tag, i) => (
                    <div key={i} style={{
                      background: `${color}15`,
                      border: `1px solid ${color}30`,
                      borderRadius: 50, padding: '6px 22px',
                      color, fontSize: 16, fontWeight: 700,
                    }}>{tag.emoji} {tag.label}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Player Name + Team */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: 28,
          }}>
            <div style={{
              color: s.bright, fontSize: 48, fontWeight: 900,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              textAlign: 'center', lineHeight: 1,
            }}>{playerName}</div>
            <div style={{
              color: s.muted, fontSize: 18, fontWeight: 700,
              letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 10,
              textAlign: 'center',
            }}>{playerTeam}</div>
          </div>

          {/* ═══ ZONE 3: Game Context ═══ */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: 28, gap: 6,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              fontSize: 36, fontWeight: 700,
            }}>
              <span style={{ color: '#cbd5e1', fontSize: 42, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>vs {game.opponent}</span>
              <span style={{
                color: game.isWin ? '#4ade80' : '#f87171',
                fontWeight: 800, fontSize: 18,
                background: game.isWin ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${game.isWin ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                borderRadius: 8, padding: '4px 16px',
              }}>{game.isWin ? 'WIN' : 'LOSS'}{scoreDisplay ? ` ${scoreDisplay}` : ''}</span>
            </div>
            <div style={{ color: s.dim, fontSize: 15, fontWeight: 500 }}>
              {format(new Date(game.date), 'MMM d, yyyy')}
            </div>
          </div>

          {/* Micro divider */}
          <div style={{
            width: '40%', height: 1, marginBottom: 20,
            background: `linear-gradient(90deg, transparent, ${color}25, transparent)`,
          }} />

          {/* ═══ ZONE 4: Stat Panel ═══ */}
          <div style={{
            width: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', flex: 1, justifyContent: 'center',
          }}>
            <div style={{
              display: 'flex', gap: 20, marginBottom: 28, justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: s.dim, fontSize: 12, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase' }}>GAME SCORE</div>
                <div style={{ color: s.bright, fontSize: 52, fontWeight: 900, lineHeight: 1 }}>{gameScore}</div>
              </div>
              {bestImpact.value > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: s.dim, fontSize: 12, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase' }}>BEST IMPACT</div>
                  <div style={{ color: s.bright, fontSize: 52, fontWeight: 900, lineHeight: 1 }}>
                    {bestImpact.value} <span style={{ fontSize: 22, color: s.sub, fontWeight: 700 }}>{bestImpact.stat}</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{
              width: '60%', height: 1, marginBottom: 28,
              background: `linear-gradient(90deg, transparent, ${color}30, transparent)`,
            }} />
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16, width: '100%',
            }}>
              {stats.map((st) => (
                <div key={st.label} style={{
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(100,116,139,0.12)',
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 16, padding: '20px 16px 18px',
                  textAlign: 'left',
                  position: 'relative',
                }}>
                  <div style={{ fontSize: 23, fontWeight: 800, color, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>{st.label}</div>
                  <div style={{ fontSize: 60, fontWeight: 900, color: s.bright, lineHeight: 1 }}>{st.value}</div>
                </div>
              ))}
            </div>

            {/* Shooting Percentages Row */}
            <div style={{
              display: 'flex', gap: 16, width: '100%', marginTop: 16,
              justifyContent: 'center',
            }}>
              {[
                { label: 'FG', made: game.fgMade, att: game.fgAttempted },
                { label: '3PT', made: game.threePtMade, att: game.threePtAttempted },
                { label: 'FT', made: game.ftMade, att: game.ftAttempted },
              ].map((sh) => (
                <div key={sh.label} style={{
                  flex: 1, background: 'rgba(15,23,42,0.5)',
                  border: '1px solid rgba(100,116,139,0.1)',
                  borderRadius: 12, padding: '14px 12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.sub, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2 }}>{sh.label}</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: s.bright, lineHeight: 1 }}>{sh.made}/{sh.att}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ ZONE 5: Achievements + XP ═══ */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginTop: 24, gap: 14,
          }}>
            {careerHighsInGame.length > 0 && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {careerHighsInGame.slice(0, 3).map((ch, i) => (
                  <div key={i} style={{
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.06))',
                    border: '1px solid rgba(255,215,0,0.25)',
                    borderRadius: 12, padding: '10px 22px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 18 }}>🏆</span>
                    <span style={{ color: '#fbbf24', fontSize: 15, fontWeight: 800 }}>
                      Career High: {ch.displayValue} {ch.stat}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,107,0,0.18), rgba(255,165,0,0.08))',
              border: '1px solid rgba(255,107,0,0.3)',
              borderRadius: 50, padding: '12px 44px',
              color: '#ff8c3a', fontSize: 22, fontWeight: 900,
              boxShadow: '0 0 40px rgba(255,107,0,0.12)',
              letterSpacing: '0.02em',
            }}>⚡ +{xpEarned} XP Earned</div>
          </div>

          {/* ═══ FOOTER: Branding + QR ═══ */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 32, width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img src={hoopJournalLogo} alt="" style={{ width: 52, height: 52, borderRadius: 12 }} crossOrigin="anonymous" />
              <div>
                <div style={{ color: s.bright, fontSize: 20, fontWeight: 800 }}>Hoop Journal</div>
                <div style={{ color: s.dim, fontSize: 13, fontWeight: 500 }}>Track Your Game. Improve Every Day.</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ color: s.dim, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scan to track</div>
              <img src={hoopJournalQr} alt="" style={{ width: 72, height: 72, borderRadius: 8 }} crossOrigin="anonymous" />
            </div>
          </div>
        </div>



      </div>
    );
  }
);

ReportCardCanvas.displayName = 'ReportCardCanvas';
