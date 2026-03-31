import { forwardRef, useMemo } from 'react';
import { format } from 'date-fns';
import { type CoachTrustResult, TRUST_BAND_COLORS } from '@/utils/coachTrust';
import { type ConditioningGradeResult, getConditioningGradeColor } from '@/utils/conditioningGrade';
import hoopJournalLogo from '@/assets/hoop-journal-logo-v2.png';
import hoopJournalQr from '@/assets/hoop-journal-qr.png';
import appStoreBadge from '@/assets/app-store-badge.svg';
import { GpsPoint } from '@/hooks/useGpsTracking';

export interface ConditioningCardData {
  playerName: string;
  playerTeam: string;
  jerseyNumber: number;
  position?: string;
  avatarUrl?: string;
  conditioningGrade: ConditioningGradeResult;
  coachTrust: CoachTrustResult;
  elapsedSeconds: number;
  distanceMeters: number;
  trackingMode?: 'background' | 'foreground';
  gpsPoints?: GpsPoint[];
  sessionDate?: string;
}

const METERS_PER_MILE = 1609.344;

function formatMileTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  const miles = meters / METERS_PER_MILE;
  return `${miles.toFixed(2)} MI`;
}

function getConditioningArchetype(grade: string): { title: string; subtitle: string } {
  switch (grade) {
    case 'A+': return { title: 'RELENTLESS RUNNER', subtitle: 'ELITE CONDITIONING LEVEL' };
    case 'A': return { title: 'GAME READY', subtitle: 'ELITE CONDITIONING LEVEL' };
    case 'A-': return { title: 'WELL CONDITIONED', subtitle: 'GAME READY CONDITIONING' };
    case 'B+': return { title: 'STRONG EFFORT', subtitle: 'SOLID CONDITIONING LEVEL' };
    case 'B': return { title: 'SOLID RUNNER', subtitle: 'SOLID CONDITIONING LEVEL' };
    case 'B-': return { title: 'GETTING THERE', subtitle: 'BUILDING CONDITIONING' };
    case 'C+': return { title: 'WORK IN PROGRESS', subtitle: 'NEEDS IMPROVEMENT' };
    case 'C': return { title: 'KEEP GRINDING', subtitle: 'NEEDS IMPROVEMENT' };
    default: return { title: 'KEEP PUSHING', subtitle: 'BUILDING CONDITIONING' };
  }
}

function getConditioningTags(grade: string, trustBand: string, distanceMeters: number): { emoji: string; label: string }[] {
  const tags: { emoji: string; label: string }[] = [];
  const miles = distanceMeters / METERS_PER_MILE;

  if (['A+', 'A', 'A-'].includes(grade)) tags.push({ emoji: '🔥', label: 'Elite Conditioning' });
  if (['B+', 'B'].includes(grade)) tags.push({ emoji: '💪', label: 'Solid Effort' });
  if (trustBand === 'high_trust') tags.push({ emoji: '✅', label: 'Verified Run' });
  if (miles >= 2) tags.push({ emoji: '🏃', label: 'Distance Runner' });
  if (miles >= 1 && miles < 2) tags.push({ emoji: '👟', label: 'Mile Marker' });
  if (['A+', 'A'].includes(grade)) tags.push({ emoji: '⚡', label: 'No Days Off' });
  if (['A+'].includes(grade) && trustBand === 'high_trust') tags.push({ emoji: '🏆', label: 'Workhorse' });

  return tags.slice(0, 3);
}

// Simplified SVG path for canvas background trace
function buildTracePath(points: GpsPoint[], width: number, height: number, padding: number): string | null {
  if (points.length < 3) return null;
  const coords = points.map(p => ({ lat: p.lat, lng: p.lng }));
  const lats = coords.map(p => p.lat);
  const lngs = coords.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const rangeX = maxLng - minLng || 0.001;
  const rangeY = maxLat - minLat || 0.001;
  const scale = Math.min(innerW / rangeX, innerH / rangeY);
  const normalized = coords.map(p => ({
    x: padding + (p.lng - minLng) * scale + (innerW - rangeX * scale) / 2,
    y: padding + (maxLat - p.lat) * scale + (innerH - rangeY * scale) / 2,
  }));
  return normalized.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

const TRUST_COLORS: Record<string, string> = {
  high_trust: '#4ade80',
  solid: '#facc15',
  review: '#fb923c',
  low_trust: '#f87171',
};

export const ConditioningCardCanvas = forwardRef<HTMLDivElement, ConditioningCardData>(
  (props, ref) => {
    const {
      playerName, playerTeam, jerseyNumber, position, avatarUrl,
      conditioningGrade, coachTrust, elapsedSeconds, distanceMeters,
      trackingMode, gpsPoints, sessionDate,
    } = props;

    const color = conditioningGrade.color;
    const glow = conditioningGrade.glow;
    const grade = conditioningGrade.grade;
    const archetype = getConditioningArchetype(String(grade));
    const tags = getConditioningTags(String(grade), coachTrust.band, distanceMeters);
    const trustColor = TRUST_COLORS[coachTrust.band] || '#9CA3AF';
    const dateStr = sessionDate ? format(new Date(sessionDate), 'MMM d, yyyy') : format(new Date(), 'MMM d, yyyy');

    const CANVAS_W = 1080;
    const CANVAS_H = 1920;

    const s = { muted: '#64748b', dim: '#475569', bright: '#f8fafc', sub: '#94a3b8' };

    const tracePath = useMemo(() => {
      if (!gpsPoints || gpsPoints.length < 5) return null;
      return buildTracePath(gpsPoints, CANVAS_W, CANVAS_H, 200);
    }, [gpsPoints]);

    return (
      <div
        ref={ref}
        style={{
          width: CANVAS_W, height: CANVAS_H,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: 'linear-gradient(180deg, #070b16 0%, #0a0f1e 25%, #0d1424 50%, #0a0f1e 75%, #070b16 100%)',
          position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
        }}
      >
        {/* Run trace background */}
        {tracePath && (
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              pointerEvents: 'none', opacity: 0.06,
            }}
          >
            <path d={tracePath} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={tracePath} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
          </svg>
        )}

        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 900, height: 900, borderRadius: '50%',
          background: `radial-gradient(circle, ${color}10 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, transparent 10%, ${color}50 50%, transparent 90%)`,
        }} />

        {/* CONDITIONING CARD badge */}
        <div data-canvas-eventtag="true" style={{
          position: 'absolute', top: 32, right: 32, zIndex: 10,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.9), rgba(22,163,74,0.9))',
          borderRadius: 12, padding: '8px 20px',
          color: '#fff', fontSize: 16, fontWeight: 900, letterSpacing: '0.15em',
          boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>🏃 CONDITIONING CARD</div>

        {/* Content */}
        <div style={{
          position: 'absolute', top: 96, bottom: 280, left: 72, right: 72,
        }}>
          {/* Avatar */}
          <div style={{
            width: 480, height: 480, borderRadius: '50%',
            border: `8px solid ${color}`,
            overflow: 'hidden',
            boxShadow: `0 0 80px ${color}50, 0 0 160px ${color}20, inset 0 0 40px ${color}10`,
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          }}
            data-canvas-avatar="true"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} crossOrigin="anonymous" />
            ) : (
              <div style={{
                width: '100%', height: '100%', background: '#1e293b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 8,
              }}>
                <span style={{ fontSize: 96 }}>🏃</span>
                <span style={{ color: s.muted, fontSize: 36, fontWeight: 800 }}>#{jerseyNumber}</span>
              </div>
            )}
          </div>

          {/* Identity block */}
          <div style={{
            position: 'absolute', top: 530, left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div data-canvas-name="true" style={{
              color: s.bright, fontSize: 72, fontWeight: 900,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              textAlign: 'center', lineHeight: 1.02,
              maxWidth: '100%', wordBreak: 'break-word',
            }}>{playerName}</div>

            <div data-canvas-team="true" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
              marginTop: 12, flexWrap: 'wrap',
            }}>
              <span style={{
                color: s.muted, fontSize: 28, fontWeight: 700,
                letterSpacing: '0.25em', textTransform: 'uppercase',
              }}>{playerTeam}</span>
              <span style={{ color: s.dim, fontSize: 28, fontWeight: 700 }}>|</span>
              <span style={{
                color: s.muted, fontSize: 28, fontWeight: 700,
                letterSpacing: '0.15em',
              }}>#{jerseyNumber}{position ? ` • ${position}` : ''}</span>
            </div>

            {/* Archetype */}
            <div data-canvas-archetype="true" data-canvas-color={color} style={{
              color, fontSize: 32, fontWeight: 800,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              marginTop: 30, textAlign: 'center',
              textShadow: `0 0 30px ${color}40`,
            }}>{archetype.title}</div>

            <div data-canvas-status="true" style={{
              color: s.sub, fontSize: 19, fontWeight: 700,
              letterSpacing: '0.35em', textTransform: 'uppercase',
              marginTop: 14, textAlign: 'center',
              opacity: 0.75,
            }}>{archetype.subtitle}</div>

            <div style={{
              width: 300, height: 2, marginTop: 20,
              background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
            }} />
          </div>

          {/* Grade section */}
          <div style={{
            position: 'absolute', top: 830, left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{
              position: 'absolute', top: 100, left: '50%', transform: 'translate(-50%, -50%)',
              width: 500, height: 500, borderRadius: '50%',
              background: `radial-gradient(circle, ${color}15 0%, transparent 55%)`,
              pointerEvents: 'none',
            }} />
            <div data-canvas-label="true" style={{
              color: s.muted, fontSize: 19, fontWeight: 800,
              letterSpacing: '0.5em', textTransform: 'uppercase',
              textAlign: 'center', marginBottom: 16, opacity: 0.85,
            }}>CONDITIONING GRADE</div>
            <div style={{
              fontSize: 220, fontWeight: 900, color,
              lineHeight: 0.82, textShadow: glow,
              letterSpacing: '-0.03em', textAlign: 'center',
              minHeight: 180,
            }}
              data-canvas-grade="true"
              data-grade-color={color}
              data-grade-glow={glow}
            >{grade}</div>

            {/* Time + Distance below grade */}
            <div data-canvas-time="true" style={{
              color: s.bright, fontSize: 56, fontWeight: 900,
              marginTop: 16, textAlign: 'center', lineHeight: 1,
            }}>
              {conditioningGrade.mileTimeFormatted || formatMileTime(elapsedSeconds)}
            </div>
            <div data-canvas-distance="true" style={{
              color: s.sub, fontSize: 28, fontWeight: 700,
              marginTop: 8, letterSpacing: '0.15em', textAlign: 'center',
            }}>
              {formatDistance(distanceMeters)}
            </div>
          </div>

          {/* Coach Trust */}
          <div style={{
            position: 'absolute', top: 1200, left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div data-canvas-trust="true" style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: `${trustColor}10`,
              border: `1.5px solid ${trustColor}30`,
              borderRadius: 50, padding: '12px 32px',
            }}>
              <span style={{ color: trustColor, fontSize: 24, fontWeight: 900 }}>
                Coach Trust: {coachTrust.score}
              </span>
              <span style={{
                color: trustColor, fontSize: 18, fontWeight: 700,
                opacity: 0.8,
              }}>
                • {coachTrust.bandLabel}
              </span>
            </div>
            {trackingMode === 'background' && (
              <div data-canvas-tracking="true" style={{
                color: s.dim, fontSize: 15, fontWeight: 600,
                letterSpacing: '0.1em', marginTop: 10, opacity: 0.7,
              }}>BACKGROUND TRACKED</div>
            )}
          </div>

          {/* Performance tags */}
          <div data-canvas-badges="true" style={{
            position: 'absolute', top: 1310, left: 0, right: 0,
            display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
            alignItems: 'center',
          }}>
            {tags.map((tag, i) => (
              <div key={i} data-canvas-badge={i} style={{
                background: i === 0 ? `${color}20` : `${color}10`,
                border: `1.5px solid ${i === 0 ? `${color}50` : `${color}28`}`,
                borderRadius: 50,
                padding: i === 0 ? '13px 34px' : '12px 30px',
                color,
                fontSize: i === 0 ? 23 : 21,
                fontWeight: i === 0 ? 800 : 700,
                letterSpacing: '0.04em',
                opacity: i === 0 ? 1 : 0.8,
                boxShadow: i === 0 ? `0 0 24px ${color}18` : 'none',
              }}>{tag.emoji} {tag.label}</div>
            ))}
          </div>

          {/* Date */}
          <div data-canvas-date="true" style={{
            position: 'absolute', top: 1400, left: 0, right: 0,
            textAlign: 'center',
            color: s.dim, fontSize: 18, fontWeight: 600,
            letterSpacing: '0.1em',
          }}>{dateStr}</div>
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
              <div style={{ color: s.dim, fontSize: 14, fontWeight: 600, letterSpacing: '3px', marginTop: 4 }}>CONDITIONING REPORT</div>
            </div>
          </div>
          {/* RIGHT ZONE: QR (primary) + App Store badge (secondary) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div data-canvas-footer-scan="true" style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Scan to Claim</div>
            <div style={{ padding: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 12 }}>
              <img src={hoopJournalQr} alt="" style={{ width: 150, height: 150, borderRadius: 6 }} crossOrigin="anonymous" />
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
);

ConditioningCardCanvas.displayName = 'ConditioningCardCanvas';
