import { useState, useCallback, useSyncExternalStore } from 'react';

const DISMISSED_KEY = 'hoop-journal-dismissed-notifications';

// Simple pub/sub so all hook consumers re-render when the list changes
const listeners = new Set<() => void>();
function emitChange() {
  listeners.forEach((l) => l());
}

function getSnapshot(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

let cachedSnapshot = getSnapshot();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshotStable() {
  const fresh = getSnapshot();
  // Only update reference if contents changed
  if (JSON.stringify(fresh) !== JSON.stringify(cachedSnapshot)) {
    cachedSnapshot = fresh;
  }
  return cachedSnapshot;
}

export function useDismissedNotifications() {
  const dismissedIds = useSyncExternalStore(subscribe, getSnapshotStable, getSnapshotStable);

  const dismiss = useCallback((id: string) => {
    const current = getSnapshot();
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(current));
      cachedSnapshot = current;
      emitChange();
    }
  }, []);

  const isDismissed = useCallback((id: string) => {
    return dismissedIds.includes(id);
  }, [dismissedIds]);

  return { dismissedIds, dismiss, isDismissed };
}
