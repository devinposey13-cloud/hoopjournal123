
# Add Visual Confirmation Feedback for Performance Buttons

## Overview
Add emoji-based visual confirmation feedback for all stat buttons on the Live Stats Capture page, similar to the existing fire (🔥) celebration for made shots. Each button type will display a relevant emoji that briefly appears and fades when pressed.

## Current Behavior
- Made shots (2PT, 3PT, FT made) trigger a full-screen `FireCelebration` component with 3D particles and a "🔥 BUCKET!" overlay
- Other stat buttons (rebounds, assists, steals, blocks, turnovers, fouls, misses) have no visual feedback beyond the count update

## Proposed Solution
Create a lightweight "stat flash" feedback system that shows a contextual emoji for each stat type. This will be simpler than the FireCelebration (no 3D) but still provide clear visual confirmation.

### Emoji Mapping
| Stat Type | Emoji | Message |
|-----------|-------|---------|
| 2PT Made / 3PT Made / FT Made | 🔥 | BUCKET! (existing) |
| 2PT Miss / 3PT Miss / FT Miss | ❌ | MISS |
| Offensive Rebound | 💪 | OREB! |
| Defensive Rebound | 🧱 | DREB! |
| Assist | 🎯 | DIME! |
| Steal | 🔒 | STEAL! |
| Block | 🚫 | BLOCK! |
| Turnover | 😬 | TO |
| Foul | ⚠️ | FOUL |

## Changes

### 1. Create StatFlash Component
A new lightweight component that shows an emoji with a short message, centered on screen with a quick fade-in/out animation.

**File: `src/components/StatFlash.tsx`**
```typescript
interface StatFlashProps {
  show: boolean;
  emoji: string;
  message: string;
  variant?: 'success' | 'danger' | 'warning' | 'neutral';
}
```

### 2. Add State Management in LiveStatCapture
Track the current flash state including which emoji/message to show.

**Add state:**
```typescript
const [statFlash, setStatFlash] = useState<{
  show: boolean;
  emoji: string;
  message: string;
  variant: 'success' | 'danger' | 'warning' | 'neutral';
} | null>(null);
```

### 3. Update recordStat Function
Add logic to trigger the appropriate flash based on the stat type recorded.

```typescript
// Inside recordStat, after recording the stat:
const flashConfig = getFlashForStat(action.type);
if (flashConfig) {
  setStatFlash({ show: true, ...flashConfig });
  setTimeout(() => setStatFlash(null), 800);
}
```

### 4. Add CSS Animation
Add a "pop" keyframe animation to tailwind.config.ts for the emoji appearance.

```typescript
"stat-pop": {
  "0%": { transform: "scale(0.5)", opacity: "0" },
  "50%": { transform: "scale(1.2)" },
  "100%": { transform: "scale(1)", opacity: "1" },
},
"stat-fade-out": {
  "0%": { opacity: "1" },
  "100%": { opacity: "0" },
}
```

## Files to Modify

1. **`src/components/StatFlash.tsx`** (NEW)
   - Create new lightweight visual feedback component
   - Accept emoji, message, and color variant props
   - Display centered overlay with animation

2. **`src/components/LiveStatCapture.tsx`**
   - Import the new StatFlash component
   - Add state for tracking current flash
   - Update recordStat to trigger flash based on stat type
   - Render StatFlash component alongside FireCelebration

3. **`tailwind.config.ts`**
   - Add new keyframe animations for the stat flash effect

## Visual Design
The StatFlash will be a semi-transparent overlay that appears briefly in the center of the screen:

```text
+--------------------------------------------------+
|                                                  |
|                                                  |
|                     🎯                           |
|                   DIME!                          |
|                                                  |
|                                                  |
+--------------------------------------------------+
```

The overlay will:
- Appear with a quick "pop" scale animation
- Display for ~600ms
- Fade out smoothly
- Use color coding (green for positive stats, red for negative, orange for neutral)
- Be non-interactive (`pointer-events: none`)

## Implementation Details

### Flash Configuration Helper
```typescript
function getFlashConfig(statType: string) {
  const configs = {
    fgMade: { emoji: '🔥', message: 'BUCKET!', variant: 'success' },
    threePtMade: { emoji: '🔥', message: 'BUCKET!', variant: 'success' },
    ftMade: { emoji: '🔥', message: 'BUCKET!', variant: 'success' },
    fgAttempted: { emoji: '❌', message: 'MISS', variant: 'danger' },
    threePtAttempted: { emoji: '❌', message: '3PT MISS', variant: 'danger' },
    ftAttempted: { emoji: '❌', message: 'FT MISS', variant: 'danger' },
    offensiveRebounds: { emoji: '💪', message: 'OREB!', variant: 'success' },
    defensiveRebounds: { emoji: '🧱', message: 'DREB!', variant: 'neutral' },
    assists: { emoji: '🎯', message: 'DIME!', variant: 'success' },
    steals: { emoji: '🔒', message: 'STEAL!', variant: 'success' },
    blocks: { emoji: '🚫', message: 'BLOCK!', variant: 'success' },
    turnovers: { emoji: '😬', message: 'TURNOVER', variant: 'warning' },
    fouls: { emoji: '⚠️', message: 'FOUL', variant: 'danger' },
  };
  return configs[statType] || null;
}
```

### Keeping FireCelebration for Made Shots
The existing FireCelebration with 3D particles will continue to trigger for made shots. The new StatFlash will handle all other stats.
