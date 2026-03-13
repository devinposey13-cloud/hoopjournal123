import { forwardRef, useMemo } from 'react';
import { format } from 'date-fns';
import type { GameStats } from '@/types/basketball';
import { getGameGradeData } from '@/utils/gameGrading';
import { calculateCareerHighs } from '@/utils/statsCalculations';
import hoopJournalLogo from '@/assets/hoop-journal-logo.png';
import hoopJournalQr from '@/assets/hoop-journal-qr.png';

export type ExportFormat = 'story' | 'post';

interface ReportCardCanvasProps {
  game: GameStats;
  playerName: string;
  playerTeam: string;
  avatarUrl?: string;
  allGames?: GameStats[];
  exportFormat?: ExportFormat;
  showSafeZones?: boolean;
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

const FORMATS = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
} as const;

// Instagram safe zones
const SAFE = {
  top: 100,
  bottom: 320,
  left: 80,
  right: 80,
} as const;

export const ReportCardCanvas = forwardRef<HTMLDivElement, ReportCardCanvasProps>(
  ({ game, playerName, playerTeam, avatarUrl, allGames, exportFormat = 'story', showSafeZones = false }, ref) => {
    const { grade, color, glow, tags, xpEarned, gameScore } = getGameGradeData(game);
    const bestImpact = getBestImpact(game);
    const { w: CANVAS_W, h: CANVAS_H } = FORMATS[exportFormat];
    const isPost = exportFormat === 'post';

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

    const s = {
      muted: '#64748b' as const,
      dim: '#475569' as const,
      bright: '#f8fafc' as const,
      sub: '#94a3b8' as const,
    };

    // Scale factors for Instagram readability (post is more compact)
    const sf = isPost ? 0.82 : 1;

    return (
      <div
        ref={ref}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
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
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: SAFE.left, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(100,116,139,0.08) 30%, rgba(100,116,139,0.08) 70%, transparent)',
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, right: SAFE.right, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(100,116,139,0.08) 30%, rgba(100,116,139,0.08) 70%, transparent)',
        }} />

        {/* ── Instagram Safe Zone Overlay (debug/preview only) ── */}
        {showSafeZones && (
          <>
            {/* Top */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SAFE.top, background: 'rgba(255,0,0,0.12)', borderBottom: '2px dashed rgba(255,0,0,0.4)', pointerEvents: 'none', zIndex: 100 }} />
            {/* Bottom */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: SAFE.bottom, background: 'rgba(255,0,0,0.12)', borderTop: '2px dashed rgba(255,0,0,0.4)', pointerEvents: 'none', zIndex: 100 }} />
            {/* Left */}
            <div style={{ position: 'absolute', top: SAFE.top, bottom: SAFE.bottom, left: 0, width: SAFE.left, background: 'rgba(255,0,0,0.08)', borderRight: '2px dashed rgba(255,0,0,0.3)', pointerEvents: 'none', zIndex: 100 }} />
            {/* Right */}
            <div style={{ position: 'absolute', top: SAFE.top, bottom: SAFE.bottom, right: 0, width: SAFE.right, background: 'rgba(255,0,0,0.08)', borderLeft: '2px dashed rgba(255,0,0,0.3)', pointerEvents: 'none', zIndex: 100 }} />
            {/* Labels */}
            <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,80,80,0.7)', fontSize: 14, fontWeight: 700, zIndex: 101, pointerEvents: 'none' }}>IG Story UI Zone</div>
            <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,80,80,0.7)', fontSize: 14, fontWeight: 700, zIndex: 101, pointerEvents: 'none' }}>IG Message/Input Zone</div>
          </>
        )}

        {/* ── Content Safe Zone ── */}
        <div style={{
          position: 'absolute',
          top: isPost ? 40 : SAFE.top, bottom: isPost ? 80 : SAFE.bottom, left: SAFE.left, right: SAFE.right,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
        }}>

          {/* ═══ ZONE 1+2: Avatar + Grade Side-by-Side ═══ */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', marginBottom: isPost ? 20 : 32, gap: isPost ? 36 : 48,
          }}>
            {/* Left: Avatar */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              flexShrink: 0,
            }}>
              <div style={{
                width: 360 * sf, height: 360 * sf, borderRadius: '50%',
                border: `7px solid ${color}`,
                overflow: 'hidden',
                boxShadow: `0 0 100px ${color}40, 0 0 200px ${color}15`,
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', background: '#1e293b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 120 * sf,
                  }}>🏀</div>
                )}
              </div>
            </div>

            {/* Right: Grade + Tags */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              position: 'relative', marginTop: isPost ? 12 : 40,
              padding: isPost ? '60px 50px' : '80px 60px',
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 440 * sf, height: 440 * sf, borderRadius: '50%',
                background: `radial-gradient(circle, ${color}15 0%, transparent 60%)`,
                pointerEvents: 'none',
              }} />
              <div style={{
                color: s.dim, fontSize: 18 * sf, fontWeight: 800,
                letterSpacing: '0.4em', textTransform: 'uppercase',
                textAlign: 'center', marginBottom: 0,
              }}>HOOP JOURNAL GAME GRADE</div>
              <div style={{
                fontSize: 250 * sf, fontWeight: 900, color,
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
                      color, fontSize: 16 * sf, fontWeight: 700,
                    }}>{tag.emoji} {tag.label}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Player Name + Team — 15% larger text */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: isPost ? 18 : 28,
          }}>
            <div style={{
              color: s.bright, fontSize: 55 * sf, fontWeight: 900,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              textAlign: 'center', lineHeight: 1,
            }}>{playerName}</div>
            <div style={{
              color: s.muted, fontSize: 21 * sf, fontWeight: 700,
              letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 10,
              textAlign: 'center',
            }}>{playerTeam}</div>
          </div>

          {/* ═══ ZONE 3: Game Context ═══ */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: isPost ? 18 : 28, gap: 6,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              fontSize: 36 * sf, fontWeight: 700,
            }}>
              <span style={{ color: '#cbd5e1', fontSize: 42 * sf, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>vs {game.opponent}</span>
              <span style={{
                color: game.isWin ? '#4ade80' : '#f87171',
                fontWeight: 800, fontSize: 18 * sf,
                background: game.isWin ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${game.isWin ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                borderRadius: 8, padding: '4px 16px',
              }}>{game.isWin ? 'WIN' : 'LOSS'}{scoreDisplay ? ` ${scoreDisplay}` : ''}</span>
            </div>
            <div style={{ color: s.dim, fontSize: 15 * sf, fontWeight: 500 }}>
              {format(new Date(game.date), 'MMM d, yyyy')}
            </div>
          </div>

          {/* Micro divider */}
          <div style={{
            width: '40%', height: 1, marginBottom: isPost ? 14 : 20,
            background: `linear-gradient(90deg, transparent, ${color}25, transparent)`,
          }} />

          {/* ═══ ZONE 4: Stat Panel ═══ */}
          <div style={{
            width: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', flex: 1, justifyContent: 'center',
          }}>
            <div style={{
              display: 'flex', gap: 24, marginBottom: isPost ? 18 : 28, justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: s.dim, fontSize: 13 * sf, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase' }}>GAME SCORE</div>
                <div style={{ color: s.bright, fontSize: 58 * sf, fontWeight: 900, lineHeight: 1 }}>{gameScore}</div>
              </div>
              {bestImpact.value > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: s.dim, fontSize: 13 * sf, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase' }}>BEST IMPACT</div>
                  <div style={{ color: s.bright, fontSize: 58 * sf, fontWeight: 900, lineHeight: 1 }}>
                    {bestImpact.value} <span style={{ fontSize: 24 * sf, color: s.sub, fontWeight: 700 }}>{bestImpact.stat}</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{
              width: '60%', height: 1, marginBottom: isPost ? 18 : 28,
              background: `linear-gradient(90deg, transparent, ${color}30, transparent)`,
            }} />
            {/* Stat grid — labels +10%, numbers +12% */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 24, width: '100%',
            }}>
              {stats.map((st) => (
                <div key={st.label} style={{
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(100,116,139,0.12)',
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 16, padding: `${20 * sf}px ${20 * sf}px ${18 * sf}px`,
                  textAlign: 'left',
                  position: 'relative',
                }}>
                  <div style={{ fontSize: 25 * sf, fontWeight: 800, color, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4, whiteSpace: 'nowrap' }}>{st.label}</div>
                  <div style={{ fontSize: 67 * sf, fontWeight: 900, color: s.bright, lineHeight: 1, whiteSpace: 'nowrap' }}>{st.value}</div>
                </div>
              ))}
            </div>

            {/* Shooting Row */}
            <div style={{
              display: 'flex', gap: 24, width: '100%', marginTop: isPost ? 12 : 16,
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
                  borderRadius: 12, padding: `${14 * sf}px ${12 * sf}px`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 18 * sf, fontWeight: 800, color: s.sub, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 2, whiteSpace: 'nowrap' }}>{sh.label}</div>
                  <div style={{ fontSize: 40 * sf, fontWeight: 900, color: s.bright, lineHeight: 1, whiteSpace: 'nowrap' }}>{sh.made}/{sh.att}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ ZONE 5: Achievements + XP ═══ */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginTop: isPost ? 10 : 24, gap: isPost ? 8 : 14,
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
              borderRadius: 50, padding: isPost ? '8px 32px' : '12px 44px',
              color: '#ff8c3a', fontSize: 22 * sf, fontWeight: 900,
              boxShadow: '0 0 40px rgba(255,107,0,0.12)',
              letterSpacing: '0.02em',
            }}>⚡ +{xpEarned} XP Earned</div>
          </div>

          {/* ═══ FOOTER: Branding + QR ═══ */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: isPost ? 'auto' : 32, width: '100%',
            padding: isPost ? '8px 0 0' : '0',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isPost ? 12 : 16 }}>
              <img src={hoopJournalLogo} alt="" style={{ width: isPost ? 56 : 82, height: isPost ? 56 : 82, borderRadius: isPost ? 12 : 16 }} crossOrigin="anonymous" />
              <div>
                <div style={{ color: s.bright, fontSize: isPost ? 20 : 28, fontWeight: 800 }}>Hoop Journal</div>
                <div style={{ color: s.dim, fontSize: isPost ? 13 : 18, fontWeight: 500 }}>Track Your Game. Improve Every Day.</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ color: s.dim, fontSize: isPost ? 8 : 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scan to track</div>
              <div style={{ padding: isPost ? 4 : 6, background: 'rgba(255,255,255,0.06)', borderRadius: isPost ? 8 : 10 }}>
                <img src={hoopJournalQr} alt="" style={{ width: isPost ? 100 : 160, height: isPost ? 100 : 160, borderRadius: 6 }} crossOrigin="anonymous" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ReportCardCanvas.displayName = 'ReportCardCanvas';
