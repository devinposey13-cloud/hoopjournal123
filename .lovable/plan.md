
# Plan: Enhance Intro Basketball Realism & Audio

## Overview
Upgrade the first-login intro animation with a photorealistic 3D basketball using PBR textures and replace synthetic audio with AI-generated sound effects using ElevenLabs.

---

## Part 1: Realistic 3D Basketball

### Current Issues
- Basketball is a plain orange sphere with simple torus rings
- No surface texture (leather grain, pebbling)
- Basic flat lighting without shadows
- Seams don't look authentic

### Solution: Procedural PBR Basketball

Using `@react-three/drei` (already installed), we'll create a realistic basketball with:

1. **Procedural Leather Texture**
   - Generate a canvas-based texture for the leather pebble pattern
   - Apply as both color map and bump/normal map for depth

2. **Realistic Seam Lines**
   - Use `Line` component from drei for smooth curved seams
   - Proper basketball seam layout (8 panels)

3. **Enhanced Materials**
   - `MeshPhysicalMaterial` for subsurface scattering effect
   - Proper roughness map for worn leather look
   - Environment reflections for gymnasium lighting

4. **Better Lighting**
   - `Environment` preset for realistic reflections
   - Soft shadows on the court floor
   - Rim lighting for drama

```text
┌─────────────────────────────────────┐
│         Enhanced Basketball         │
├─────────────────────────────────────┤
│  • Procedural leather texture       │
│  • 8-panel seam layout              │
│  • Bump mapping for pebble grain    │
│  • Environment reflections          │
│  • Soft shadows                     │
└─────────────────────────────────────┘
```

---

## Part 2: Professional Audio

### Current Issues
- `bounce_echo` and `arena_ambience` use Web Audio API oscillators
- Sounds are synthetic and robotic
- No court impact sounds

### Solution: ElevenLabs Sound Effects API

Create a new edge function to generate high-quality sound effects:

| Sound | Prompt | Duration |
|-------|--------|----------|
| Bounce Echo | "Basketball bouncing on hardwood gymnasium floor with reverb echo in empty arena" | 3s |
| Arena Ambience | "Quiet basketball arena crowd murmur with distant sneaker squeaks" | 5s |
| Swoosh | "Basketball swishing through net clean shot" | 2s |

**Implementation:**
1. Create `elevenlabs-sfx` edge function
2. Generate sounds on first app load and cache in localStorage
3. Fall back to synthetic sounds if API fails

---

## Technical Implementation

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/elevenlabs-sfx/index.ts` | Edge function for sound generation |
| `src/components/RealisticBasketball.tsx` | New 3D basketball component |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/FirstLoginIntro.tsx` | Use new basketball component, add sound preloading |
| `src/hooks/useSoundEffects.ts` | Add ElevenLabs sound fetching with caching |

---

## Detailed Steps

### Step 1: Create ElevenLabs SFX Edge Function
- New edge function calling ElevenLabs Sound Effects API
- Returns MP3 audio buffer
- Supports custom prompts and durations

### Step 2: Build Realistic Basketball Component
- Use `MeshPhysicalMaterial` with:
  - Base orange color
  - Roughness: 0.8 for matte leather
  - Clearcoat: 0.1 for subtle shine
- Create procedural bump map using canvas:
  - Perlin noise pattern for leather pebbling
  - Higher frequency for realistic grain
- Draw proper 8-panel seam lines using drei `Line`
- Add subtle environment reflections

### Step 3: Enhance Scene Lighting
- Add `Environment` from drei with "warehouse" preset
- Enable shadows on floor mesh
- Add secondary fill light for depth

### Step 4: Integrate AI Sound Effects
- On intro start, fetch sounds from edge function
- Cache in localStorage as base64 for instant replay
- Use Web Audio API for precise timing
- Keep synthetic fallback for offline/error cases

### Step 5: Improve Animation Timing
- Add slight squash on ground impact
- Sync bounce sounds with animation frames
- Add subtle camera follow movement

---

## Expected Results
- Basketball looks like a real NBA game ball with visible leather texture
- Bounce sounds feel like you're in a gymnasium
- Arena ambience creates immersive atmosphere
- Smooth 60fps animation with physics-based bouncing
