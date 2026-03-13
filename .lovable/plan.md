

## Plan: Replace Report Card Logo with New Hoop Journal Logo

**What**: Replace the current `hoop-journal-logo.png` asset used in the Report Card canvas footer with the newly uploaded basketball+book logo.

**How**:
1. Copy the uploaded image (`user-uploads://Screenshot_2026-03-13_at_4.05.20 PM.png`) to `src/assets/hoop-journal-logo-v2.png`
2. Update `ReportCardCanvas.tsx` to import and use the new logo in place of the current one in the footer branding section (bottom-left corner of both Story and Post layouts)

This is a single-file change plus one new asset — the existing `hoop-journal-logo.png` remains available if you want to revert.

