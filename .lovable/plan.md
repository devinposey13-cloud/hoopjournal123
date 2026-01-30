
# Fix Haptic Feedback on Mobile Devices

## Problem Identified
The haptic feedback is **not working on iOS devices** because the Vibration API (`navigator.vibrate()`) is **not supported on iOS Safari** - it has never been supported and there are no plans to add it.

**Current status:**
- **Android devices**: Should work (Vibration API is supported)
- **iOS devices**: Does NOT work (Vibration API is not supported)

## Root Cause
The current implementation at lines 177-189 of `LiveStatCapture.tsx`:
```typescript
if ('vibrate' in navigator) {
  if (isMadeShot) {
    navigator.vibrate([50, 30, 50]);
  } else if (...) {
    navigator.vibrate(30);
  } else {
    navigator.vibrate(40);
  }
}
```

The check `'vibrate' in navigator` returns `false` on iOS Safari, so the code never executes.

## Solution
Integrate the `ios-haptics` library which provides cross-platform haptic feedback:

- **On iOS Safari 17.4+**: Uses a clever technique with `<input type="checkbox" switch />` elements that have native haptic feedback when toggled
- **On Android/other browsers**: Falls back to `navigator.vibrate()` automatically

## Changes Required

### 1. Install the `ios-haptics` package
```bash
npm install ios-haptics
```

### 2. Create a Custom `useHapticFeedback` Hook
Create a new hook that abstracts haptic feedback and provides different intensities:

**File: `src/hooks/useHapticFeedback.ts`**
```typescript
import { haptic } from 'ios-haptics';

export function useHapticFeedback() {
  const triggerHaptic = (intensity: 'light' | 'medium' | 'strong' | 'success' | 'error') => {
    try {
      switch (intensity) {
        case 'light':
          haptic();
          break;
        case 'medium':
          haptic();
          break;
        case 'strong':
        case 'success':
          haptic.confirm(); // Double haptic
          break;
        case 'error':
          haptic.error(); // Triple haptic
          break;
        default:
          haptic();
      }
    } catch (e) {
      // Silently fail if haptics not supported
    }
  };

  return { triggerHaptic };
}
```

### 3. Update `LiveStatCapture.tsx`
Replace the direct `navigator.vibrate()` calls with the new hook:

**Changes:**
```typescript
// Add import
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// Inside component
const { triggerHaptic } = useHapticFeedback();

// In recordStat function, replace lines 177-189:
// Before:
if ('vibrate' in navigator) {
  if (isMadeShot) {
    navigator.vibrate([50, 30, 50]);
  } else if (isMiss || action.type === 'turnovers' || action.type === 'fouls') {
    navigator.vibrate(30);
  } else {
    navigator.vibrate(40);
  }
}

// After:
if (isMadeShot) {
  triggerHaptic('success'); // Double haptic for made shots
} else if (isMiss || action.type === 'turnovers' || action.type === 'fouls') {
  triggerHaptic('light'); // Light haptic for negative stats
} else {
  triggerHaptic('medium'); // Medium haptic for positive stats
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `ios-haptics` dependency |
| `src/hooks/useHapticFeedback.ts` | Create | New hook for cross-platform haptic feedback |
| `src/components/LiveStatCapture.tsx` | Modify | Use the new haptic hook instead of `navigator.vibrate()` |

## Device Support After Fix

| Device/Browser | Before Fix | After Fix |
|----------------|------------|-----------|
| Android Chrome | Works | Works |
| Android Samsung Browser | Works | Works |
| iOS Safari 17.4+ | Not working | Works |
| iOS Safari older | Not working | Not supported (OS limitation) |

## Technical Notes
- The `ios-haptics` library is tiny (~1KB gzipped)
- On iOS, it works by creating a hidden `<input type="checkbox" switch />`, toggling it (which triggers native haptic), then removing it
- This is the only reliable way to trigger haptic feedback in Safari without a native app
- Requires iOS 17.4+ for iOS haptic support
