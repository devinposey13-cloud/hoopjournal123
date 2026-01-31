
# First Login Basketball Animation Experience

## Overview

Create a cinematic 5-7 second basketball animation that plays the first time a user logs in. This will be a clean, minimal, 2K-style introduction sequence that sets the emotional tone before any onboarding forms appear.

## User Flow

```text
User Signs In
     ↓
Check if first login (no games recorded yet OR first session)
     ↓
[YES] → Show Basketball Intro Animation (5-7 sec)
                    ↓
         "Every game tells a story."
                    ↓
         [Start My Journey] button
                    ↓
         Proceed to Dashboard
     ↓
[NO] → Skip directly to Dashboard
```

## Animation Sequence (5-7 seconds)

| Time | Visual | Audio |
|------|--------|-------|
| 0-1s | Dark screen with subtle court texture fade-in | Silence |
| 1-3s | Basketball bounces into frame (3D animation) | Single bounce echo |
| 3-5s | Stat overlays flash across screen (PTS, REB, AST) | Subtle swoosh sounds |
| 5-6s | Court spotlight illuminates the center | Soft arena ambience |
| 6-7s | Text fades in: "Every game tells a story." | Silence |
| 7s+ | "Start My Journey" button appears | — |

## Technical Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/components/FirstLoginIntro.tsx` | Main full-screen intro component with 3D basketball animation |
| `src/hooks/useFirstLogin.ts` | Hook to detect if this is the user's first session |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add first-login check before showing dashboard |
| `src/hooks/useSoundEffects.ts` | Add `bounce_echo` and `arena_ambience` synthetic sounds |
| `tailwind.config.ts` | Add new keyframes for intro animations |

## Component Design: `FirstLoginIntro.tsx`

```text
+------------------------------------------+
|                                          |
|           [Dark background]              |
|                                          |
|              🏀 (bouncing)               |
|                                          |
|    [PTS] [REB] [AST] flash overlays      |
|                                          |
|       "Every game tells a story."        |
|                                          |
|        [ Start My Journey ]              |
|                                          |
+------------------------------------------+
```

**Animation Techniques:**
- 3D bouncing basketball using React Three Fiber (reuse existing patterns from `BasketballHoop3D.tsx`)
- Stat overlays use Framer Motion `staggerChildren` for sequential flash effect
- Text fade uses existing `animate-fade-in` with delay
- Button slides up from bottom with scale effect

## First Login Detection Logic

We'll create a custom hook `useFirstLogin` that checks:

1. **LocalStorage flag**: `hoopjournal_intro_seen` - persists across sessions
2. **Backup check**: If user has 0 games recorded, they're likely new

```typescript
// src/hooks/useFirstLogin.ts
export function useFirstLogin() {
  const [showIntro, setShowIntro] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('hoopjournal_intro_seen');
    if (!hasSeenIntro) {
      setShowIntro(true);
    }
    setLoading(false);
  }, []);
  
  const completeIntro = () => {
    localStorage.setItem('hoopjournal_intro_seen', 'true');
    setShowIntro(false);
  };
  
  return { showIntro, loading, completeIntro };
}
```

## 3D Basketball Animation Component

Reusing patterns from `BasketballHoop3D.tsx`:

```typescript
function BouncingBasketball() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    // Bounce animation: starts high, bounces with decreasing amplitude
    const t = state.clock.elapsedTime;
    const bounceHeight = Math.abs(Math.sin(t * 4)) * Math.exp(-t * 0.3);
    meshRef.current.position.y = bounceHeight * 2 - 0.5;
    meshRef.current.rotation.x += 0.05;
  });
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#ff6b00" roughness={0.8} />
    </mesh>
  );
}
```

## Stat Flash Overlays

Reusing pattern from `StatFlash.tsx`:

```typescript
const stats = [
  { label: 'PTS', delay: 0 },
  { label: 'REB', delay: 0.2 },
  { label: 'AST', delay: 0.4 },
];

{stats.map((stat) => (
  <motion.div
    key={stat.label}
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1] }}
    transition={{ delay: 3 + stat.delay, duration: 0.8 }}
    className="text-6xl font-black text-primary/30"
  >
    {stat.label}
  </motion.div>
))}
```

## Sound Effects

Add to `useSoundEffects.ts`:

```typescript
case 'bounce_echo':
  // Deep basketball bounce with reverb
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(120, now);
  oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.3);
  gainNode.gain.setValueAtTime(0.4, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  break;
```

## Integration in Index.tsx

```typescript
export default function Index() {
  const { showIntro, loading: introLoading, completeIntro } = useFirstLogin();
  // ... existing code
  
  // Show intro animation for first-time users
  if (!authLoading && user && showIntro) {
    return <FirstLoginIntro onComplete={completeIntro} />;
  }
  
  // ... rest of existing logic
}
```

## Visual Design Notes

- **Color palette**: Dark background (`hsl(220 20% 6%)`), orange accents (`hsl(24 100% 50%)`)
- **Typography**: "Every game tells a story." uses existing Dancing Script cursive font
- **Button**: Uses existing `gradient-primary` class with scale-in animation
- **No cartoonish elements**: Clean geometric shapes, subtle shadows, professional feel
- **Court texture hint**: Subtle wood grain gradient at bottom of screen

## Tailwind Animation Additions

```typescript
// In tailwind.config.ts keyframes
"intro-bounce": {
  "0%": { transform: "translateY(-100vh)", opacity: "0" },
  "20%": { transform: "translateY(0)", opacity: "1" },
  "40%": { transform: "translateY(-30%)" },
  "60%": { transform: "translateY(0)" },
  "80%": { transform: "translateY(-10%)" },
  "100%": { transform: "translateY(0)" }
},
"spotlight-on": {
  "0%": { opacity: "0", transform: "scale(0.5)" },
  "100%": { opacity: "0.3", transform: "scale(1)" }
}
```

## Summary

| Aspect | Implementation |
|--------|----------------|
| Detection | LocalStorage flag + `useFirstLogin` hook |
| Animation | React Three Fiber 3D basketball + Framer Motion overlays |
| Duration | 5-7 seconds, auto-progressing with button option |
| Audio | Synthetic bounce echo + swoosh using Web Audio API |
| Style | 2K-inspired, minimal, dark with orange accents |
| Text | "Every game tells a story." in cursive |
| CTA | "Start My Journey" button |
