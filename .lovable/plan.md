

# Hoop Journal Shareable Game Report Card

## Overview
Build a shareable post-game report card component that renders a premium sports graphic (1080x1350) using HTML/Canvas, with export/share functionality. The QR code image will be embedded from the uploaded asset.

## New Files

### 1. `src/components/GameReportCard.tsx`
The main component that renders the report card as an HTML element styled to 1080x1350 ratio, then converts to an image for export.

**Structure:**
- Accepts `GameStats`, player profile data (name, avatar, team), and XP earned
- Computes a letter grade from the performance score (using existing `calculatePerformance` from `performanceScoring.ts`)
- Maps performance tiers to letter grades: legendary=A+, elite=A, great=A-, solid=B, rising=C, starter=D
- Color-codes the grade (gold for A/A+, orange for B, gray for C, red for D/F)

**Card layout (rendered as a styled div, captured via `html2canvas`):**
- Dark gradient background (navy-to-black)
- Header: circular avatar with orange ring, player name
- Large game grade with glow effect
- Game info: VS opponent, score, W/L, date
- 2x3 stat grid: PTS, AST, REB, STL, BLK, TOV
- Performance tag badge (e.g., "Double Double", "Hot Shooting") — auto-detected from stats
- XP earned display
- Footer: Hoop Journal branding + QR code (from uploaded image)

**Export functionality:**
- Uses `html2canvas` (new dependency) to render the div to a canvas at 1080px width
- "Download Image" — saves as PNG via anchor download
- "Share" — uses Web Share API (navigator.share) when available for native sharing to Instagram, Twitter, Snapchat, etc.
- Fallback: copy image to clipboard

### 2. `src/utils/gameGrading.ts`
Utility to compute letter grade + performance tag from `GameStats`:
- Grade mapping from performance tier
- Auto-detect tags: "Double Double" (2+ stats ≥ 10), "Hot Shooting" (FG% ≥ 55%), "Playmaker Night" (assists ≥ 8), "Lockdown D" (steals + blocks ≥ 5), etc.

### 3. Copy QR code asset
Copy `user-uploads://Untitled_design_1.png` to `src/assets/hoop-journal-qr.png`

## Modified Files

### `src/pages/GameDetail.tsx`
- Add a "Share Report Card" button in the action bar (next to Export PDF)
- Opens a dialog/drawer showing the `GameReportCard` component with animated grade reveal
- Pass game data, profile info, and avatar URL

### `package.json`
- Add `html2canvas` dependency for high-quality image export

## Grade Animation
When the report card dialog opens:
- Grade scales in with a flash/glow effect using framer-motion
- XP earned fades in with a delay
- Stats grid staggers in

## Performance Tag Detection Logic
```text
Double Double  → 2+ categories ≥ 10 (pts, reb, ast, stl, blk)
Triple Double  → 3+ categories ≥ 10
Hot Shooting   → FG% ≥ 55% with ≥ 8 attempts
Playmaker      → Assists ≥ 8
Lockdown D     → Steals + Blocks ≥ 5
Scoring Machine → Points ≥ 30
```

## Technical Notes
- The card is rendered as a hidden 1080x1350 div, scaled down for preview in the dialog
- `html2canvas` captures at full resolution for crisp social media sharing
- Web Share API handles Instagram/Twitter/Snapchat natively on mobile; desktop gets download option
- QR code points to the published Hoop Journal app URL

