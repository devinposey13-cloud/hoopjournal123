/**
 * Lightweight device-level usage tracking for anti-abuse protection.
 * 
 * Generates a persistent device ID and tracks cumulative usage counters
 * across account resets. Uses localStorage + IndexedDB for persistence.
 * 
 * NOT invasive — no IP tracking, no fingerprinting, no bans.
 * Just encourages upgrades when device-level limits are exceeded.
 */

const DEVICE_ID_KEY = 'hj_device_id';
const DEVICE_USAGE_KEY = 'hj_device_usage';

export interface DeviceUsage {
  deviceId: string;
  totalGamesLogged: number;
  totalReportsGenerated: number;
  totalPdfExports: number;
  firstSeenAt: string;
  accountCount: number; // how many accounts used on this device
}

const DEFAULT_USAGE: Omit<DeviceUsage, 'deviceId'> = {
  totalGamesLogged: 0,
  totalReportsGenerated: 0,
  totalPdfExports: 0,
  firstSeenAt: new Date().toISOString(),
  accountCount: 0,
};

// Generate a UUID v4
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create persistent device ID.
 * Stored in localStorage; survives account deletion.
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // In case localStorage is unavailable, return a session-only ID
    return generateUUID();
  }
}

/**
 * Get device usage counters from localStorage.
 */
export function getDeviceUsage(): DeviceUsage {
  const deviceId = getDeviceId();
  try {
    const raw = localStorage.getItem(DEVICE_USAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_USAGE, ...parsed, deviceId };
    }
  } catch {
    // Corrupted data — start fresh
  }
  return { ...DEFAULT_USAGE, deviceId };
}

/**
 * Save device usage counters.
 */
function saveDeviceUsage(usage: DeviceUsage): void {
  try {
    localStorage.setItem(DEVICE_USAGE_KEY, JSON.stringify(usage));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * Increment a specific device counter.
 */
export function incrementDeviceCounter(
  counter: 'totalGamesLogged' | 'totalReportsGenerated' | 'totalPdfExports'
): DeviceUsage {
  const usage = getDeviceUsage();
  usage[counter] += 1;
  saveDeviceUsage(usage);
  return usage;
}

/**
 * Track that a new account was seen on this device.
 * Call this on signup/login with a new user ID.
 */
export function trackAccountOnDevice(userId: string): void {
  const usage = getDeviceUsage();
  const seenKey = `hj_seen_accounts`;
  try {
    const seenRaw = localStorage.getItem(seenKey);
    const seen: string[] = seenRaw ? JSON.parse(seenRaw) : [];
    if (!seen.includes(userId)) {
      seen.push(userId);
      localStorage.setItem(seenKey, JSON.stringify(seen));
      usage.accountCount = seen.length;
      saveDeviceUsage(usage);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Check if device-level free limits are exceeded.
 * Returns which limits are hit.
 */
export function checkDeviceLimits(freeLimits: {
  maxGames: number;
  maxReports: number;
  maxPdfExports: number;
}): {
  gamesExceeded: boolean;
  reportsExceeded: boolean;
  pdfExportsExceeded: boolean;
  isSuspectedReset: boolean;
} {
  const usage = getDeviceUsage();
  const gamesExceeded = usage.totalGamesLogged >= freeLimits.maxGames;
  const reportsExceeded = usage.totalReportsGenerated >= freeLimits.maxReports;
  const pdfExportsExceeded = usage.totalPdfExports >= freeLimits.maxPdfExports;
  
  // Suspected reset: multiple accounts AND device usage already exceeds limits
  const isSuspectedReset = usage.accountCount > 1 && (gamesExceeded || reportsExceeded);

  return { gamesExceeded, reportsExceeded, pdfExportsExceeded, isSuspectedReset };
}
