/**
 * Class Year utilities
 * Replaces static grade levels with dynamic "Class of YYYY" format.
 */

const CURRENT_YEAR = new Date().getFullYear();

/** Generate class year options for dropdown (next 10 years from current) */
export function getClassYearOptions(): number[] {
  const years: number[] = [];
  for (let y = CURRENT_YEAR; y <= CURRENT_YEAR + 10; y++) {
    years.push(y);
  }
  return years;
}

/** Format a class year integer as display string */
export function formatClassYear(classYear: number | null | undefined): string {
  if (!classYear) return '';
  return `Class of ${classYear}`;
}

/** Convert a legacy grade string to class year (based on current calendar year) */
export function gradeToClassYear(grade: string): number | null {
  const currentYear = CURRENT_YEAR;
  const map: Record<string, number> = {
    'Senior': currentYear,
    'Junior': currentYear + 1,
    'Sophomore': currentYear + 2,
    'Freshman': currentYear + 3,
    '8th Grade': currentYear + 4,
    '7th Grade': currentYear + 5,
    '6th Grade': currentYear + 6,
  };
  return map[grade] ?? null;
}

/** Infer approximate grade from class year (internal use only) */
export function classYearToGrade(classYear: number): string {
  const diff = classYear - CURRENT_YEAR;
  const map: Record<number, string> = {
    0: 'Senior',
    1: 'Junior',
    2: 'Sophomore',
    3: 'Freshman',
    4: '8th Grade',
    5: '7th Grade',
    6: '6th Grade',
  };
  return map[diff] ?? `Class of ${classYear}`;
}

/** Get display value: prefer class_year, fallback to grade */
export function getClassYearDisplay(classYear?: number | null, grade?: string): string {
  if (classYear) return formatClassYear(classYear);
  if (grade) {
    const converted = gradeToClassYear(grade);
    if (converted) return formatClassYear(converted);
    return grade;
  }
  return '';
}
