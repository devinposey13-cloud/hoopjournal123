import type { QuarterInfo } from '@/types/xp';

/**
 * Get the quarter number (1-4) for a given date
 */
export function getQuarterNumber(date: Date): 1 | 2 | 3 | 4 {
  const month = date.getMonth(); // 0-11
  if (month < 3) return 1;      // Jan-Mar
  if (month < 6) return 2;      // Apr-Jun
  if (month < 9) return 3;      // Jul-Sep
  return 4;                     // Oct-Dec
}

/**
 * Get the quarter string (e.g., "2026-Q1") for a given date
 */
export function getQuarterString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const quarter = getQuarterNumber(date);
  return `${year}-Q${quarter}`;
}

/**
 * Get the start date of a quarter
 */
export function getQuarterStartDate(year: number, quarter: 1 | 2 | 3 | 4): Date {
  const month = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
  return new Date(year, month, 1, 0, 0, 0, 0);
}

/**
 * Get the end date of a quarter
 */
export function getQuarterEndDate(year: number, quarter: 1 | 2 | 3 | 4): Date {
  const month = quarter * 3; // Q1=3, Q2=6, Q3=9, Q4=12
  // Last day of the previous month (which is the last day of the quarter)
  return new Date(year, month, 0, 23, 59, 59, 999);
}

/**
 * Parse a quarter string (e.g., "2026-Q1") into year and quarter number
 */
export function parseQuarterString(quarterStr: string): { year: number; quarter: 1 | 2 | 3 | 4 } {
  const match = quarterStr.match(/^(\d{4})-Q([1-4])$/);
  if (!match) {
    throw new Error(`Invalid quarter string: ${quarterStr}`);
  }
  return {
    year: parseInt(match[1], 10),
    quarter: parseInt(match[2], 10) as 1 | 2 | 3 | 4,
  };
}

/**
 * Get comprehensive info about the current quarter
 */
export function getCurrentQuarterInfo(date: Date = new Date()): QuarterInfo {
  const year = date.getFullYear();
  const quarterNum = getQuarterNumber(date);
  const quarter = `${year}-Q${quarterNum}`;
  
  const startDate = getQuarterStartDate(year, quarterNum);
  const endDate = getQuarterEndDate(year, quarterNum);
  
  const now = date.getTime();
  const start = startDate.getTime();
  const end = endDate.getTime();
  
  const totalMs = end - start;
  const elapsedMs = now - start;
  const remainingMs = end - now;
  
  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  
  return {
    quarter,
    year,
    quarterNum,
    startDate,
    endDate,
    daysRemaining,
    totalDays,
    progressPercent,
  };
}

/**
 * Get the quarter name for display (e.g., "Q1 2026")
 */
export function getQuarterDisplayName(quarterStr: string): string {
  const { year, quarter } = parseQuarterString(quarterStr);
  return `Q${quarter} ${year}`;
}

/**
 * Get the season name for the quarter
 */
export function getQuarterSeasonName(quarter: 1 | 2 | 3 | 4): string {
  switch (quarter) {
    case 1: return 'Winter';
    case 2: return 'Spring';
    case 3: return 'Summer';
    case 4: return 'Fall';
  }
}

/**
 * Check if a date falls within a specific quarter
 */
export function isDateInQuarter(date: Date, quarterStr: string): boolean {
  const { year, quarter } = parseQuarterString(quarterStr);
  const start = getQuarterStartDate(year, quarter);
  const end = getQuarterEndDate(year, quarter);
  return date >= start && date <= end;
}

/**
 * Get the previous quarter string
 */
export function getPreviousQuarter(quarterStr: string): string {
  const { year, quarter } = parseQuarterString(quarterStr);
  if (quarter === 1) {
    return `${year - 1}-Q4`;
  }
  return `${year}-Q${quarter - 1}`;
}

/**
 * Get the next quarter string
 */
export function getNextQuarter(quarterStr: string): string {
  const { year, quarter } = parseQuarterString(quarterStr);
  if (quarter === 4) {
    return `${year + 1}-Q1`;
  }
  return `${year}-Q${quarter + 1}`;
}
