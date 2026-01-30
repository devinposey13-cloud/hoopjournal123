
# Fix Mobile Button Layout on Game Detail Page

## Problem
The "Add Photo", "Resume Live Stats", and "Export PDF" buttons on the game detail page display distorted on mobile devices. The buttons have both icons and text labels, causing layout issues when screen space is limited.

## Solution
Use the existing `useIsMobile` hook to conditionally hide button text labels on mobile devices, showing only the icons. This saves significant horizontal space while maintaining functionality through recognizable icons.

## Changes

### File: `src/pages/GameDetail.tsx`

**1. Add import for the mobile hook:**
```typescript
import { useIsMobile } from '@/hooks/use-mobile';
```

**2. Use the hook in the component:**
```typescript
const isMobile = useIsMobile();
```

**3. Update the three buttons (lines 799-821) to conditionally render labels:**

Current buttons:
```text
+--------------+  +------------------+  +-------------+
| 📷 Add Photo |  | 🔴 Resume Live.. |  | 📥 Export.. |
+--------------+  +------------------+  +-------------+
```

After fix on mobile:
```text
+----+  +----+  +----+
| 📷 |  | 🔴 |  | 📥 |
+----+  +----+  +----+
```

**Button modifications:**

| Button | Current Label | Mobile Label |
|--------|--------------|--------------|
| Add Photo | "Add Photo" / "Update Photo" | Icon only + sr-only text |
| Resume Live Stats | "Resume Live Stats" | Icon only + sr-only text |
| Export PDF | "Export PDF" | Icon only + sr-only text |

The implementation will:
- Keep icons always visible
- Hide text labels on mobile using `{!isMobile && "Label Text"}`
- Add `sr-only` (screen reader only) span for accessibility
- Add tooltip on mobile buttons for discoverability
- Adjust button size to `size="icon"` on mobile for consistent sizing

**Example button transformation:**
```tsx
// Before
<Button variant="outline" onClick={handleExportPdf}>
  <FileDown className="w-4 h-4 mr-2" />
  Export PDF
</Button>

// After
<Button 
  variant="outline" 
  onClick={handleExportPdf}
  size={isMobile ? "icon" : "default"}
  title="Export PDF"
>
  <FileDown className={cn("w-4 h-4", !isMobile && "mr-2")} />
  {!isMobile && "Export PDF"}
  {isMobile && <span className="sr-only">Export PDF</span>}
</Button>
```

## Technical Details

- The `useIsMobile` hook is already available at `src/hooks/use-mobile.tsx` with a breakpoint of 768px
- The `cn` utility is already imported for conditional class merging
- Adding `title` attribute provides hover tooltip on desktop and long-press hint on mobile
- Screen reader text (`sr-only`) maintains accessibility

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/GameDetail.tsx` | Import `useIsMobile`, apply conditional rendering to 3 buttons |

## Visual Result

**Desktop (unchanged):**
```text
[📷 Add Photo] [🔴 Resume Live Stats] [📥 Export PDF]
```

**Mobile (fixed):**
```text
[📷] [🔴] [📥]
```
