

## Add App Store Badge to Report Cards and Quick Entry Cards

### Overview
Add the uploaded Apple "Download on the App Store" badge SVG to the footer area of both the **Game Report Card** (`ReportCardCanvas.tsx`) and the **Admin Quick Mode Event Card** (`AdminQuickMode.tsx`). The badge will sit alongside the existing branding/QR section at the bottom.

### Changes

**1. Copy the uploaded SVG into assets**
- Copy `user-uploads://Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg` → `src/assets/app-store-badge.svg`

**2. `src/components/report-card/ReportCardCanvas.tsx` — Add badge to footer**
- Import the App Store badge SVG
- In the footer section (lines ~393-413), add the badge between the branding and QR code, or below the "Hoop Journal" brand text
- Size it proportionally (~120px wide for story, ~90px for post format)
- Apply a white background pill/rounded rect behind it since the badge is black on transparent
- Add `data-canvas-text` or similar attribute so the Canvas 2D export picks it up as an image

**3. `src/components/GameReportCard.tsx` — Update Canvas 2D export to draw the badge**
- In the `captureCard` function, query for the App Store badge element and capture its position
- Draw the badge image onto the final canvas during the manual redraw phase so it exports crisp

**4. `src/components/admin/AdminQuickMode.tsx` — Add badge to event card footer**
- Import the App Store badge SVG
- In the footer section (lines ~341-364), add the badge near the branding area
- Same sizing approach as the report card
- Update the Canvas 2D export logic in AdminQuickMode to include the badge in the final rendered output

### Technical details
- SVG can be imported directly as an image src in React (`import badge from '@/assets/app-store-badge.svg'`)
- For canvas export, load the SVG as an `Image()` element and `drawImage()` it at the correct position
- The badge needs a subtle white or light background treatment since the SVG has black fill — a small white rounded rect behind it will make it pop on the dark card backgrounds

