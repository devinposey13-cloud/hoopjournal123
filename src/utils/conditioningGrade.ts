import type { LetterGrade } from './gameGrading';
import { getGradeColor, getGradeGlow } from './gameGrading';

export type ConditioningGrade = LetterGrade | 'C' | 'Needs Work' | 'No Grade';

interface ConditioningGradeInput {
  distanceMeters: number;
  elapsedSeconds: number;
  coachTrustBand?: string | null;
}

export interface ConditioningGradeResult {
  grade: ConditioningGrade;
  gradeLabel: string;
  mileTimeSeconds: number | null;
  mileTimeFormatted: string | null;
  reason: string | null; // reason for No Grade
  color: string;
  glow: string;
}

const METERS_PER_MILE = 1609.344;

// Mile time thresholds in seconds
const GRADE_THRESHOLDS: { grade: ConditioningGrade; maxSeconds: number; label: string }[] = [
  { grade: 'A+', maxSeconds: 330, label: 'Elite Conditioning' },   // ≤ 5:30
  { grade: 'A',  maxSeconds: 360, label: 'Game Ready' },           // 5:31 – 6:00
  { grade: 'A-', maxSeconds: 390, label: 'Game Ready' },           // 6:01 – 6:30
  { grade: 'B+', maxSeconds: 420, label: 'Solid Effort' },         // 6:31 – 7:00
  { grade: 'B',  maxSeconds: 450, label: 'Solid Effort' },         // 7:01 – 7:30
  { grade: 'B-', maxSeconds: 480, label: 'Getting There' },        // 7:31 – 8:00
  { grade: 'C+', maxSeconds: 510, label: 'Needs Improvement' },    // 8:01 – 8:30
  { grade: 'C',  maxSeconds: 540, label: 'Needs Improvement' },    // 8:31 – 9:00
];

function formatMileTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getConditioningGradeColor(grade: ConditioningGrade): string {
  if (grade === 'No Grade' || grade === 'Needs Work') return '#9CA3AF';
  if (grade === 'C') return '#9CA3AF';
  return getGradeColor(grade as LetterGrade);
}

export function getConditioningGradeGlow(grade: ConditioningGrade): string {
  if (grade === 'No Grade' || grade === 'Needs Work' || grade === 'C') {
    return '0 0 30px rgba(148, 163, 184, 0.2)';
  }
  return getGradeGlow(grade as LetterGrade);
}

export function calculateConditioningGrade(input: ConditioningGradeInput): ConditioningGradeResult {
  const distanceMiles = input.distanceMeters / METERS_PER_MILE;

  // Check minimum distance
  if (distanceMiles < 1.0) {
    return {
      grade: 'No Grade',
      gradeLabel: '',
      mileTimeSeconds: null,
      mileTimeFormatted: null,
      reason: 'Incomplete distance',
      color: getConditioningGradeColor('No Grade'),
      glow: getConditioningGradeGlow('No Grade'),
    };
  }

  // Check trust band
  if (input.coachTrustBand === 'low_trust') {
    return {
      grade: 'No Grade',
      gradeLabel: '',
      mileTimeSeconds: null,
      mileTimeFormatted: null,
      reason: 'Low tracking confidence',
      color: getConditioningGradeColor('No Grade'),
      glow: getConditioningGradeGlow('No Grade'),
    };
  }

  // Calculate mile time (extrapolate pace to 1 mile)
  const mileTimeSeconds = Math.round((input.elapsedSeconds / distanceMiles));

  // Find grade
  for (const threshold of GRADE_THRESHOLDS) {
    if (mileTimeSeconds <= threshold.maxSeconds) {
      return {
        grade: threshold.grade,
        gradeLabel: threshold.label,
        mileTimeSeconds,
        mileTimeFormatted: formatMileTime(mileTimeSeconds),
        reason: null,
        color: getConditioningGradeColor(threshold.grade),
        glow: getConditioningGradeGlow(threshold.grade),
      };
    }
  }

  // Below 9:00
  return {
    grade: 'Needs Work',
    gradeLabel: 'Keep Pushing',
    mileTimeSeconds,
    mileTimeFormatted: formatMileTime(mileTimeSeconds),
    reason: null,
    color: getConditioningGradeColor('Needs Work'),
    glow: getConditioningGradeGlow('Needs Work'),
  };
}
