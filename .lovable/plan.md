
# Add Basketball Hoop Visualization to Free Throw Challenge

## Overview

Enhance the Free Throw Challenge mini-game by adding a realistic 3D basketball hoop visualization using React Three Fiber. The hoop will display above the power bar and animate when shots are made or missed, creating a more immersive basketball experience.

---

## Visual Design

### Court View
- 3D perspective view of a basketball hoop from the free throw line
- Orange rim with white net hanging below
- Glass backboard with regulation markings
- Basketball that animates when shooting

### Shot Animations
- **Made shot**: Ball arcs toward hoop, goes through the net with a satisfying swish animation
- **Missed shot**: Ball bounces off rim/backboard and falls away
- Net physics: Net ripples when ball passes through

---

## Technical Approach

### Option: React Three Fiber (3D)
Use the already-installed `@react-three/fiber` and `@react-three/drei` packages to create a 3D scene with:
- Torus geometry for the rim
- Cylinder for the backboard support
- Box geometry for the backboard
- Sphere for the basketball
- Custom net using line segments or springs

This approach provides the most realistic look with proper lighting and shadows.

---

## Component Structure

### New Component: BasketballHoop3D
A self-contained 3D scene component that receives shot state as props:
- `isShooting`: Whether a shot is in progress
- `shotResult`: 'made' | 'missed' | null
- `onAnimationComplete`: Callback when animation finishes

### Integration with FreeThrowGame
- Add the 3D hoop component above the power bar
- Pass shooting state to trigger animations
- Keep existing power bar mechanics unchanged

---

## Implementation Details

### 3D Scene Setup
```text
Canvas (React Three Fiber)
  PerspectiveCamera - Positioned at free throw line view
  Lighting
    AmbientLight - Soft overall lighting
    SpotLight - Dramatic court lighting effect
  
  BasketballCourt (background plane)
  
  Backboard
    Glass panel with gradient
    Red square target
    
  Rim
    Orange torus geometry
    Attached to backboard
    
  Net
    Series of connected line segments
    Animated when ball passes through
    
  Basketball (animated)
    Textured sphere
    Arc trajectory animation
    Spin rotation
```

### Animation States
1. **Idle**: Ball visible at bottom of scene (in player's hands)
2. **Shooting**: Ball arcs upward toward the hoop
3. **Made**: Ball passes through rim, net ripples, ball falls through
4. **Missed**: Ball hits rim/backboard, bounces away
5. **Reset**: Ball returns to starting position

### Shot Trajectory
- Use `@react-three/drei`'s animation utilities or custom spring physics
- Parabolic arc based on power level (sweet spot = perfect arc)
- Spin applied to basketball for realism

---

## Files to Modify

| File | Changes |
|------|---------|
| src/components/games/FreeThrowGame.tsx | Add 3D hoop component, pass shot state |
| src/components/games/BasketballHoop3D.tsx | **NEW** - 3D scene with hoop, ball, animations |
| src/index.css | Add canvas styling for 3D viewport |

---

## Component Props

```typescript
interface BasketballHoop3DProps {
  gameState: 'ready' | 'playing' | 'shooting' | 'result' | 'finished';
  shotResult: 'made' | 'missed' | null;
  power: number; // 0-100, affects trajectory
}
```

---

## Visual Enhancements

### Lighting
- Ambient light for base visibility
- Spotlight from above for dramatic court feel
- Rim and ball receive subtle shadows

### Materials
- Backboard: Semi-transparent glass material with slight reflection
- Rim: Metallic orange with roughness
- Net: White rope-like material
- Basketball: Orange with black lines texture (procedural or image)

### Camera
- Fixed position simulating free throw line perspective
- Slight tilt upward toward the hoop
- Optional subtle camera shake on rim-out misses

---

## Animation Timeline

1. **User presses SHOOT** (0ms)
   - Ball begins arc trajectory
   - Shooting state activated

2. **Ball reaches apex** (~300ms)
   - Highest point of arc
   - Rotation continues

3. **Ball reaches rim area** (~500ms)
   - For makes: Ball passes through rim center
   - For misses: Ball contacts rim edge

4. **Result animation** (~500-800ms)
   - Makes: Net ripples, ball falls through
   - Misses: Ball bounces off, falls away

5. **Reset** (~1000ms)
   - Ball returns to starting position
   - Ready for next shot

---

## Fallback Behavior

If 3D rendering fails or performance is poor on device:
- Gracefully hide 3D canvas
- Show existing emoji-based feedback (🏀 SWISH! / ❌ MISSED!)
- Game remains fully playable

---

## Performance Considerations

- Use simple geometries (low poly count)
- Limit shadow calculations
- Use `frameloop="demand"` to only render when animating
- Dispose of geometries properly on unmount
