

# Add Custom Sound Effects Toggle to Live Stats Capture

## Overview
Add a small toggle switch labeled "Custom Sound Effects" to the Live Stats Capture page that controls whether sound effects play when stat buttons are pressed. The toggle will be off by default.

## Changes

### 1. Add State for Sound Toggle
Add a new state variable to track whether custom sounds are enabled:
```typescript
const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(false);
```

### 2. Add Toggle UI
Place a compact toggle switch in the header area (next to the photo/undo buttons) or just below the half selection buttons. The toggle will include:
- A small label "Sound Effects" 
- A Switch component from the existing UI library
- Styling to keep it unobtrusive

Proposed location: Below the half selection buttons, aligned to the right side for easy access during gameplay.

### 3. Modify Sound Playing Logic
Update the `recordStat` function to conditionally play sounds based on the toggle state:
```typescript
// Play appropriate sound effect only if enabled
if (soundEffectsEnabled) {
  if (isMadeShot) {
    playSound('make');
  } else if (action.type === 'ftAttempted') {
    playSound('miss_ft');
  }
  // ... rest of sound logic
}
```

## UI Mockup
```text
+--------------------------------------------------+
|  [1st Half]  [2nd Half]                          |
|                                                  |
|                     Sound Effects  [OFF]         |
+--------------------------------------------------+
```

The toggle will be small and positioned so it doesn't interfere with the main stat-tracking workflow.

## Technical Details

### Files to Modify
- `src/components/LiveStatCapture.tsx`
  - Import the Switch component
  - Add `soundEffectsEnabled` state (default: `false`)
  - Add toggle UI below half selection
  - Wrap all `playSound()` calls in a conditional check

### Dependencies
- Uses existing `Switch` component from `@/components/ui/switch`
- Uses existing `Label` component from `@/components/ui/label`

