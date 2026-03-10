import { GameStats, ScheduledGame } from '@/types/basketball';
import { isSameDay, isToday, isBefore, startOfDay, parseISO, format } from 'date-fns';

// ── Status Types ──────────────────────────────────────────────────────────

export type GameStatus = 'logged' | 'live' | 'stats_missing' | 'game_day' | 'scheduled';

export interface GameStatusResult {
  status: GameStatus;
  label: string;
  action: string;
  actionLabel: string;
}

// ── Configuration ─────────────────────────────────────────────────────────

/** Hours before start time that count as "Game Day" */
const GAME_DAY_WINDOW_HOURS = 6;
/** Default game duration in hours (fallback when no end_time) */
const DEFAULT_GAME_DURATION_HOURS = 2;
/** Hours after game ends before marking as Stats Missing */
const STATS_MISSING_GRACE_HOURS = 2;
/** Hours after start (no end time) before marking as Stats Missing */
const STATS_MISSING_FALLBACK_HOURS = 4;

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Parse a scheduled game's start time into a full Date object.
 * Combines the game date with the time string (e.g. "4:00 PM").
 */
function parseGameStartTime(game: ScheduledGame): Date {
  const gameDate = new Date(game.date);
  if (!game.time) return gameDate;

  try {
    // Parse time like "4:00 PM", "16:00", "4:30pm"
    const timeStr = game.time.trim().toUpperCase();
    const match = timeStr.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/);
    if (!match) return gameDate;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] || '0', 10);
    const period = match[3];

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const result = new Date(gameDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  } catch {
    return gameDate;
  }
}

/**
 * Get estimated end time for a game (start + default duration).
 */
function getEstimatedEndTime(game: ScheduledGame): Date {
  const start = parseGameStartTime(game);
  return new Date(start.getTime() + DEFAULT_GAME_DURATION_HOURS * 60 * 60 * 1000);
}

// ── Core Status Functions ─────────────────────────────────────────────────

/**
 * Find a logged game that's linked to a scheduled game.
 * Prefers direct link via scheduledGameId, falls back to soft matching.
 */
export function findLinkedLoggedGame(
  scheduledGame: ScheduledGame,
  loggedGames: GameStats[]
): GameStats | undefined {
  // 1. Direct link
  const directMatch = loggedGames.find(
    (g) => g.scheduledGameId === scheduledGame.id
  );
  if (directMatch) return directMatch;

  // 2. Soft match: same opponent + same date
  const scheduleDate = new Date(scheduledGame.date);
  return loggedGames.find((g) => {
    const playedDate = new Date(g.date);
    return (
      g.opponent.toLowerCase() === scheduledGame.opponent.toLowerCase() &&
      isSameDay(scheduleDate, playedDate)
    );
  });
}

/**
 * Check if the game is currently in "Game Day" window.
 */
export function isGameDay(game: ScheduledGame, now: Date = new Date()): boolean {
  const gameDate = new Date(game.date);
  if (!isToday(gameDate)) return false;

  const start = parseGameStartTime(game);
  const windowStart = new Date(start.getTime() - GAME_DAY_WINDOW_HOURS * 60 * 60 * 1000);

  return now >= windowStart && now < start;
}

/**
 * Check if the game is currently "Live" (between start and estimated end).
 */
export function isLiveGame(game: ScheduledGame, now: Date = new Date()): boolean {
  const start = parseGameStartTime(game);
  const end = getEstimatedEndTime(game);
  return now >= start && now <= end;
}

/**
 * Check if a past game is missing stats (past grace window, no linked log).
 */
export function isStatsMissing(
  game: ScheduledGame,
  linkedLog: GameStats | undefined,
  now: Date = new Date()
): boolean {
  if (linkedLog) return false;

  const end = getEstimatedEndTime(game);
  const graceEnd = new Date(end.getTime() + STATS_MISSING_GRACE_HOURS * 60 * 60 * 1000);

  // Also handle fallback: if no time, use start + fallback hours
  const start = parseGameStartTime(game);
  const fallbackEnd = new Date(start.getTime() + STATS_MISSING_FALLBACK_HOURS * 60 * 60 * 1000);

  const threshold = game.time ? graceEnd : fallbackEnd;
  return now > threshold;
}

/**
 * Determine the status of a scheduled game.
 * Priority: Logged > Live > Stats Missing > Game Day > Scheduled
 */
export function getGameStatus(
  game: ScheduledGame,
  loggedGames: GameStats[],
  now: Date = new Date()
): GameStatusResult {
  const linkedLog = findLinkedLoggedGame(game, loggedGames);

  // 1. Logged (highest priority)
  if (linkedLog) {
    return {
      status: 'logged',
      label: 'Logged',
      action: 'view',
      actionLabel: 'View Game',
    };
  }

  // 2. Live
  if (isLiveGame(game, now)) {
    return {
      status: 'live',
      label: 'Live',
      action: 'start_live',
      actionLabel: 'Start Live Game',
    };
  }

  // 3. Stats Missing
  if (isStatsMissing(game, linkedLog, now)) {
    return {
      status: 'stats_missing',
      label: 'Stats Missing',
      action: 'log',
      actionLabel: 'Log Game',
    };
  }

  // 4. Game Day
  if (isGameDay(game, now)) {
    return {
      status: 'game_day',
      label: 'Game Day',
      action: 'start_live',
      actionLabel: 'Start Live Game',
    };
  }

  // 5. Scheduled (default)
  return {
    status: 'scheduled',
    label: 'Scheduled',
    action: 'view',
    actionLabel: 'View Game',
  };
}

/**
 * Get the primary action label for a given status.
 */
export function getPrimaryActionForStatus(status: GameStatus): string {
  switch (status) {
    case 'logged': return 'View Game';
    case 'live': return 'Start Live Game';
    case 'stats_missing': return 'Log Game';
    case 'game_day': return 'Start Live Game';
    case 'scheduled': return 'View Game';
  }
}

/**
 * Determine the best smart prompt to show on the Log home screen.
 * Returns null if no prompt is relevant.
 */
export function getSmartPrompt(
  scheduledGames: ScheduledGame[],
  loggedGames: GameStats[],
  now: Date = new Date()
): { type: 'stats_missing' | 'game_day' | 'live'; game: ScheduledGame; statusResult: GameStatusResult } | null {
  // Check all games and find highest priority prompt
  let livePrompt: { game: ScheduledGame; statusResult: GameStatusResult } | null = null;
  let missingPrompt: { game: ScheduledGame; statusResult: GameStatusResult } | null = null;
  let gameDayPrompt: { game: ScheduledGame; statusResult: GameStatusResult } | null = null;

  for (const sg of scheduledGames) {
    const result = getGameStatus(sg, loggedGames, now);

    if (result.status === 'live' && !livePrompt) {
      livePrompt = { game: sg, statusResult: result };
    }
    if (result.status === 'stats_missing' && !missingPrompt) {
      missingPrompt = { game: sg, statusResult: result };
    }
    if (result.status === 'game_day' && !gameDayPrompt) {
      gameDayPrompt = { game: sg, statusResult: result };
    }
  }

  // Priority: Live > Stats Missing > Game Day
  if (livePrompt) return { type: 'live', ...livePrompt };
  if (missingPrompt) return { type: 'stats_missing', ...missingPrompt };
  if (gameDayPrompt) return { type: 'game_day', ...gameDayPrompt };

  // Fallback: time-based evening prompt (handled separately in UI)
  return null;
}

/**
 * Get the most relevant "next" game to feature on the Log home screen.
 * Priority: Live > Game Day > next Scheduled > most recent Stats Missing
 */
export function getNextRelevantGame(
  scheduledGames: ScheduledGame[],
  loggedGames: GameStats[],
  now: Date = new Date()
): { game: ScheduledGame; statusResult: GameStatusResult } | null {
  let live: { game: ScheduledGame; statusResult: GameStatusResult } | null = null;
  let gameDay: { game: ScheduledGame; statusResult: GameStatusResult } | null = null;
  let nextScheduled: { game: ScheduledGame; statusResult: GameStatusResult } | null = null;
  let statsMissing: { game: ScheduledGame; statusResult: GameStatusResult } | null = null;

  const sorted = [...scheduledGames].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const sg of sorted) {
    const result = getGameStatus(sg, loggedGames, now);

    if (result.status === 'live' && !live) {
      live = { game: sg, statusResult: result };
    } else if (result.status === 'game_day' && !gameDay) {
      gameDay = { game: sg, statusResult: result };
    } else if (result.status === 'scheduled' && !nextScheduled) {
      nextScheduled = { game: sg, statusResult: result };
    } else if (result.status === 'stats_missing' && !statsMissing) {
      statsMissing = { game: sg, statusResult: result };
    }
  }

  return live || gameDay || nextScheduled || statsMissing || null;
}

/**
 * Get all scheduled games that are missing stats, sorted most recent first.
 */
export function getMissingGames(
  scheduledGames: ScheduledGame[],
  loggedGames: GameStats[],
  now: Date = new Date()
): { game: ScheduledGame; statusResult: GameStatusResult }[] {
  return scheduledGames
    .map(sg => ({ game: sg, statusResult: getGameStatus(sg, loggedGames, now) }))
    .filter(item => item.statusResult.status === 'stats_missing')
    .sort((a, b) => new Date(b.game.date).getTime() - new Date(a.game.date).getTime());
}

/**
 * Get season tracking summary: total scheduled, logged, missing.
 */
export function getSeasonTrackingSummary(
  scheduledGames: ScheduledGame[],
  loggedGames: GameStats[],
  now: Date = new Date()
): { totalScheduled: number; logged: number; missing: number; upcoming: number } {
  let logged = 0;
  let missing = 0;
  let upcoming = 0;

  for (const sg of scheduledGames) {
    const status = getGameStatus(sg, loggedGames, now);
    if (status.status === 'logged') logged++;
    else if (status.status === 'stats_missing') missing++;
    else if (status.status === 'scheduled' || status.status === 'game_day' || status.status === 'live') upcoming++;
  }

  return { totalScheduled: scheduledGames.length, logged, missing, upcoming };
}

/** Check if smart prompt dismiss cooldown has expired (12 hours). */
export function isPromptDismissCooldownActive(): boolean {
  try {
    const dismissed = localStorage.getItem('hj_smart_prompt_dismissed');
    if (!dismissed) return false;
    const dismissedAt = parseInt(dismissed, 10);
    const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
    return Date.now() - dismissedAt < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Record that the smart prompt was dismissed. */
export function dismissSmartPrompt(): void {
  try {
    localStorage.setItem('hj_smart_prompt_dismissed', Date.now().toString());
  } catch {}
}
