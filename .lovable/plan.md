

# Animated Number Counters for Statistics Page

## Overview

Add smooth animated number counters that count up from 0 when stat cards first appear on the Statistics page. This creates a more engaging and polished experience as players view their performance data.

---

## What You'll See

When you navigate to the Stats tab, instead of numbers appearing instantly:
- Values will smoothly count up from 0 to their final value
- The animation starts when cards scroll into view
- Numbers use a spring-based animation for a natural, bouncy feel
- Decimal values (like 12.5 PPG) animate smoothly with proper formatting

---

## Implementation Approach

### 1. Create Reusable AnimatedCounter Component

A new utility component that handles all the animation logic:

```text
+--------------------------------------------------+
|  AnimatedCounter                                  |
|  - Takes target value and formatting options     |
|  - Uses useMotionValue + useSpring from Framer   |
|  - Triggers when element scrolls into view       |
|  - Supports decimals, percentages, and integers  |
+--------------------------------------------------+
```

### 2. Apply to All Statistics Sub-Tabs

**Season Overview:**
- PPG, RPG, APG, SPG, BPG, TO/G cards
- Shooting percentage values (FG%, 3P%, FT%)

**Career Highs:**
- Career high values (32 points, 15 rebounds, etc.)
- Win/Loss counts and Win Rate percentage

**Splits:**
- All split stat values (PPG, RPG, APG per split)
- Shooting percentages in win/loss cards

**Advanced Stats:**
- True Shooting %, Efficiency Rating, etc.
- Radar chart summary values

---

## Technical Details

### New File: `src/components/ui/animated-counter.tsx`

```text
Props:
- value: number (target value to animate to)
- decimals?: number (decimal places, default 0)
- suffix?: string (e.g., "%" for percentages)
- duration?: number (animation duration)
- delay?: number (staggered animation delay)
- className?: string (styling)

Uses:
- useMotionValue(0) - starting value
- useSpring() - smooth spring animation
- useInView() - trigger on scroll into view
- useEffect() - update display text
```

### Files to Modify

1. **Create**: `src/components/ui/animated-counter.tsx`
2. **Update**: `src/components/stats/SeasonOverview.tsx`
3. **Update**: `src/components/stats/CareerHighs.tsx`
4. **Update**: `src/components/stats/StatsSplits.tsx`
5. **Update**: `src/components/stats/AdvancedStats.tsx`

---

## Animation Behavior

| Stat Type | Example | Animation |
|-----------|---------|-----------|
| Averages | 12.5 PPG | 0.0 -> 12.5 (1 decimal) |
| Percentages | 62.4% | 0.0 -> 62.4 with "%" suffix |
| Integers | 32 points | 0 -> 32 (whole number) |
| Ratios | 2.1 A/TO | 0.0 -> 2.1 (1 decimal) |

**Timing:**
- Each card staggers slightly (0.05s delay per card index)
- Spring animation: damping 60, stiffness 100
- Only animates once (when first visible)

---

## User Experience Benefits

1. **Visual Engagement**: Numbers counting up draws attention to achievements
2. **Progressive Reveal**: Data feels more dynamic and alive
3. **Performance Emphasis**: High numbers are more impactful when animated
4. **Consistent Polish**: Matches the app's existing spring-based animation patterns

