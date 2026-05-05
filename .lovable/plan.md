## Export Report Card Background as Reusable Template

Generate a downloadable PNG of the Report Card background (no player content) so you can reuse it as a template for other social posts.

### What's included in the background
From `src/components/report-card/ReportCardCanvas.tsx`:
- Dark vertical gradient (`#070b16 → #0d1424 → #070b16`)
- Faint basketball court lines overlay (`basketball-court-lines.jpg`, ~2.5% opacity, inverted to white)
- Subtle vertical divider lines along the Instagram safe-zone margins
- Thin accent line across the top
- Neutral version (no grade color) — uses a soft slate tint for the radial glow so it works for any post

### Deliverables (written to `/mnt/documents/`)
1. `report-card-bg-story.png` — 1080×1920 (Instagram Story / Reel)
2. `report-card-bg-post.png` — 1080×1350 (Instagram Post 4:5)

### How it will be generated
A one-off Python script using Pillow:
- Render the vertical dark gradient
- Composite the court-lines texture (inverted, low opacity, centered, contained)
- Add the radial center glow (neutral slate)
- Draw the top accent line and the two faint vertical safe-zone dividers
- Save both sizes as PNG

No code changes to the app — this is a direct artifact generation, then both files are presented as downloads.