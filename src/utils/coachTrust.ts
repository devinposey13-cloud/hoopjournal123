export type TrustBand = 'high_trust' | 'solid' | 'review' | 'low_trust';

export interface CoachTrustResult {
  score: number; // 0-100
  band: TrustBand;
  bandLabel: string;
  reasons: string[];
}

interface TrustInput {
  trackingMode: 'background' | 'foreground';
  backgroundTrackingEnabled: boolean;
  wasInterrupted?: boolean;
  averageAccuracy: number;
  pauseCount: number;
  maxSpeed: number; // m/s
  gpsPointCount: number;
  isManual: boolean;
  elapsedSeconds: number;
  distanceMeters: number;
}

function getBand(score: number): TrustBand {
  if (score >= 90) return 'high_trust';
  if (score >= 70) return 'solid';
  if (score >= 40) return 'review';
  return 'low_trust';
}

const BAND_LABELS: Record<TrustBand, string> = {
  high_trust: 'High Trust',
  solid: 'Solid',
  review: 'Review',
  low_trust: 'Low Trust',
};

export function calculateCoachTrust(input: TrustInput): CoachTrustResult {
  const reasons: string[] = [];

  // Manual entry — hard cap
  if (input.isManual) {
    return {
      score: 20,
      band: 'low_trust',
      bandLabel: 'Low Trust',
      reasons: ['Manual entry', 'No GPS verification'],
    };
  }

  let score = 100;

  // --- Tracking mode ---
  if (input.trackingMode === 'background') {
    reasons.push('Background tracked');
  } else {
    score -= 5;
    reasons.push('Foreground only');
  }

  // --- Interruption ---
  if (input.wasInterrupted) {
    score -= 15;
    reasons.push('Tracking resumed after interruption');
  }

  // --- GPS accuracy ---
  if (input.averageAccuracy <= 8) {
    reasons.push('GPS quality strong');
  } else if (input.averageAccuracy <= 15) {
    score -= 5;
    reasons.push('GPS quality good');
  } else if (input.averageAccuracy <= 25) {
    score -= 15;
    reasons.push('GPS accuracy weak');
  } else {
    score -= 25;
    reasons.push('GPS accuracy poor');
  }

  // --- GPS point density ---
  const expectedPoints = input.elapsedSeconds / 5; // ~1 point per 5 seconds
  const pointRatio = expectedPoints > 0 ? input.gpsPointCount / expectedPoints : 0;
  if (pointRatio < 0.3 && input.gpsPointCount < 10) {
    score -= 15;
    reasons.push('Few GPS data points');
  }

  // --- Pauses ---
  if (input.pauseCount === 0) {
    // No deduction
  } else if (input.pauseCount <= 2) {
    score -= 3;
    reasons.push('Minor pause detected');
  } else {
    score -= 10;
    reasons.push('Multiple pauses detected');
  }

  // --- Speed spikes ---
  // maxSpeed > 10 m/s (~36 km/h) is suspicious for running
  if (input.maxSpeed > 10) {
    score -= 20;
    reasons.push('Speed spike detected');
  } else if (input.maxSpeed > 7) {
    score -= 8;
    reasons.push('High speed segment');
  }

  // --- Very short run ---
  if (input.elapsedSeconds < 60 || input.distanceMeters < 100) {
    score -= 10;
    reasons.push('Very short session');
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));
  const band = getBand(score);

  return {
    score,
    band,
    bandLabel: BAND_LABELS[band],
    reasons: reasons.slice(0, 4), // max 4 reasons
  };
}

export const TRUST_BAND_COLORS: Record<TrustBand, { bg: string; text: string; border: string }> = {
  high_trust: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  solid: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  review: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  low_trust: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
};
