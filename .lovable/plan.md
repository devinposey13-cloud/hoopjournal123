
# Fix Foul Sound Not Playing

## Problem
The foul button sound is not working because the `recordStat` function in `LiveStatCapture.tsx` is missing the logic to trigger the foul sound. The sound file is properly uploaded and configured, but there's no code that actually calls `playSound('foul')` when a foul is recorded.

## Root Cause
When the foul button is pressed, it calls:
```typescript
recordStat({ type: 'fouls', value: 1, label: 'Personal Foul' })
```

However, the sound effect logic inside `recordStat` handles rebounds, assists, steals, blocks, and turnovers - but never checks for `action.type === 'fouls'`.

## Solution
Add a condition to trigger the foul sound in the `recordStat` function.

## Changes

### File: `src/components/LiveStatCapture.tsx`

Add a new condition for fouls in the sound effects block (around line 188-190):

```typescript
// Current code ends at turnovers:
} else if (action.type === 'turnovers') {
  playSound('turnover');
}

// Add this new condition:
} else if (action.type === 'fouls') {
  playSound('foul');
}
```

This single line addition will complete the sound mapping so that when the foul button is pressed with Sound Effects enabled, the uploaded foul sound will play.

## Verification
After the fix:
1. Enable the "Sound Effects" toggle on the Live Stat Capture page
2. Press the Personal Foul button
3. The uploaded foul sound should now play
