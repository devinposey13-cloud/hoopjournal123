

# Fix: Milestone Reveal "Next Milestone" Button Not Working

## Problem
The "Next Milestone" button doesn't work because Framer Motion's `AnimatePresence` requires child components to support refs for proper animation lifecycle management. The current components (`GlowEffect`, `Confetti`, and `MilestoneCard`) don't forward refs, causing animation transitions to fail.

## Solution
Wrap the affected components with `React.forwardRef` to enable proper ref forwarding for Framer Motion.

---

## Changes

### 1. Update `MilestoneReveal.tsx`
Wrap `GlowEffect` and `Confetti` components with `forwardRef`:

```text
Before:
  function Confetti({ rarity }) { ... }
  function GlowEffect({ rarity }) { ... }

After:
  const Confetti = forwardRef<HTMLDivElement, { rarity: MilestoneRarity }>((props, ref) => { ... })
  const GlowEffect = forwardRef<HTMLDivElement, { rarity: MilestoneRarity }>((props, ref) => { ... })
```

Also wrap the `motion.div` containing `MilestoneCard` differently - instead of wrapping `MilestoneCard` in `AnimatePresence`, render the card directly without nested `AnimatePresence`.

### 2. Update `MilestoneCard.tsx`
Wrap the main `MilestoneCard` component with `forwardRef`:

```text
Before:
  export function MilestoneCard({ ... }: MilestoneCardProps) { ... }

After:
  export const MilestoneCard = forwardRef<HTMLDivElement, MilestoneCardProps>(
    (props, ref) => { ... }
  );
```

---

## Technical Details

- Import `forwardRef` from React in both files
- Add the `ref` parameter to each component's outer div element
- This allows Framer Motion to properly track component mount/unmount states
- Ensures exit animations complete before state changes occur
- Fixes the button click handler not being triggered due to stale animation state

