

## Fix: Render Game Grade via Canvas 2D API

### Problem
`html2canvas` struggles to accurately rasterize the 236px CSS text for the game grade (e.g., "A+"). The rendered text gets distorted, clipped, or disappears in the exported PNG.

### Solution
After `html2canvas` captures the full card, **overlay the grade text** directly onto the final canvas using the native Canvas 2D `fillText` API. This bypasses `html2canvas`'s text rendering entirely for the grade.

### How It Works

1. **Pass grade data to the capture function** — The `captureCard` callback in `GameReportCard.tsx` needs access to `grade`, `color`, and `glow` values. These will be computed from the game via `getGameGradeData`.

2. **Hide the grade text from html2canvas** — In `ReportCardCanvas.tsx`, wrap the grade `<div>` (the 236px letter) with a CSS class or data attribute (e.g., `data-canvas-grade="true"`). Before calling `html2canvas`, set that element's `visibility: hidden` so html2canvas skips it. Restore visibility after capture.

3. **Draw the grade with fillText** — After `html2canvas` returns the raw canvas and we create the target canvas, use `ctx.fillText()` to paint the grade at the correct position:
   - Font: `900 236px Inter, sans-serif` (scaled by `sf` for post format)
   - Color: the grade's computed color
   - Shadow: the grade's glow value parsed into `ctx.shadowColor`/`ctx.shadowBlur`
   - Position: calculated from the layout — centered horizontally in the right half of the avatar+grade row

4. **Position calculation** — The grade sits in the right side of the top flex row. Its approximate center-x is ~70% of `CANVAS_W`, and center-y is ~180px from top (story) or ~140px (post). These will be fine-tuned to match the preview layout. Use `ctx.textAlign = 'center'` and `ctx.textBaseline = 'middle'`.

### Files Changed

- **`src/components/report-card/ReportCardCanvas.tsx`** — Add `data-canvas-grade` attribute to the grade text div so it can be targeted and hidden during capture.
- **`src/components/GameReportCard.tsx`** — Update `captureCard` to: hide the grade element, capture with html2canvas, draw grade via `fillText`, then restore visibility.

### Why This Works
The Canvas 2D `fillText` API renders text at the GPU level with pixel-perfect accuracy — no DOM-to-bitmap conversion issues. The rest of the card still uses html2canvas (which handles layout, images, and smaller text fine), while only the problematic large grade text is rendered natively.

