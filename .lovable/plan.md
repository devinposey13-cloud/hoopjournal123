

## Plan: Full Canvas 2D Text Rendering for Event Card Export

### Problem
The status line and other text elements disappear or distort during PNG export because `html2canvas` struggles with certain CSS properties (opacity, letter-spacing, transforms). Currently only the avatar and game grade are redrawn via Canvas 2D.

### Approach
Extend the hybrid rendering strategy: hide ALL significant text and visual elements before the `html2canvas` pass, then redraw them manually using the Canvas 2D API. This guarantees pixel-perfect output regardless of browser rendering quirks.

### What Gets Redrawn via Canvas 2D

Currently redrawn:
- Avatar (circle + image)
- Game Grade text

**Adding to Canvas 2D redraw:**
1. **Player Name** (e.g., "JOE")
2. **Team/Number line** (e.g., "BRONCOS | #2 - SG")
3. **Archetype** (e.g., "3-LEVEL SCORER")
4. **Status Line** (e.g., "ELITE SCORING THREAT")
5. **"GAME GRADE" label**
6. **Badges** (pill shapes with text)
7. **Footer text** ("Hoop Journal", "EVENT EDITION", "Scan to claim", "Claim within 72 hours")
8. **"EVENT CARD" badge** (top-right)

Leave to `html2canvas`: background gradient, basketball court outline SVG, QR code, logo image, divider line, radial glow — these render reliably.

### Implementation (single file: `AdminQuickMode.tsx`)

1. **Tag all text elements** with `data-canvas-*` attributes (e.g., `data-canvas-name`, `data-canvas-team`, `data-canvas-archetype`, `data-canvas-status`, `data-canvas-label`, `data-canvas-badges`, `data-canvas-footer`, `data-canvas-event-tag`).

2. **In `capturePromoCard`**, query and hide all tagged elements before `html2canvas`, then redraw each after:
   - Use `ctx.font`, `ctx.fillStyle`, `ctx.textAlign`, `ctx.fillText()` for each text element at its computed position
   - Use `ctx.roundRect` + `ctx.fill` + `ctx.stroke` for badge pills
   - Match font sizes, weights, colors, and letter-spacing from the inline styles
   - Apply glow/shadow effects via `ctx.shadowColor` / `ctx.shadowBlur`

3. **Position calculation** remains the same pattern: read `getBoundingClientRect()` before hiding, scale to 1080x1920 canvas coordinates.

### Technical Detail

```text
capturePromoCard flow:
1. Query all [data-canvas-*] elements
2. Read their bounding rects + computed styles
3. Set visibility: hidden on all
4. html2canvas capture (bg, court lines, QR, logo, divider)
5. Restore visibility
6. Draw base capture onto output canvas
7. Redraw avatar (circle + image) — existing
8. Redraw grade text — existing
9. NEW: Redraw name, team, archetype, status, label, badges, footer, event tag
10. Export as PNG blob
```

### Risk Mitigation
- Letter-spacing in Canvas 2D is limited — will manually space characters for tracked text (archetype, status line, team)
- Badge pills use `roundRect` with measured widths from emoji+text measurement

