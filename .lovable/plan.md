

## Where PDF Exports Go on Mobile

**Current behavior:** The `exportPdf.ts` utility uses `jsPDF`'s `doc.save(fileName)` method, which triggers a standard browser file download. On mobile:

- **iOS Safari**: Downloads go to the **Files app** → "Downloads" folder (or iCloud Drive). They do NOT appear in the Photos app because PDFs are documents, not images.
- **Android**: Downloads go to the device's **Downloads** folder, accessible via the Files app.

PDFs will never appear in the photo gallery on any platform — galleries only show images and videos.

## Options to Improve Mobile Experience

### Option A: Use Native Share Sheet (Recommended)
Instead of triggering a raw download, convert the PDF blob and use `navigator.share()` with a File object. This opens the native share sheet where users can:
- **Save to Files** (iOS/Android)
- **Share via iMessage, WhatsApp**, etc.
- **Print** directly
- **Copy to other apps**

This is the same pattern already used successfully for the Game Report Card image export.

### Implementation
1. **Modify `exportSeasonStatsPdf` and `exportGameBoxScorePdf`** in `src/utils/exportPdf.ts`:
   - Instead of `doc.save(fileName)`, call `doc.output('blob')` to get a Blob
   - On mobile (detect via user agent or viewport), use `navigator.share({ files: [new File([blob], fileName, { type: 'application/pdf' })] })`
   - Fall back to `doc.save()` on desktop or if share API is unavailable

2. **Add a toast notification** on iOS explaining where the file went (similar to Game Report Card pattern):
   - "PDF ready! Tap 'Save to Files' to keep it."

### Option B: No Code Change — Just Inform Users
Add a small toast after export on mobile: "PDF saved to Downloads folder in your Files app."

---

**Recommended approach**: Option A (share sheet) — it's more intuitive on mobile and follows the existing pattern used for game report card exports.

