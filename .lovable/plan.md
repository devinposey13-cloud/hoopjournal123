

# AI Schedule Import - Implementation Plan

## Overview
Add a new feature allowing users to upload a screenshot/image of a basketball schedule, have AI (Gemini vision) parse the games, review them in an editable list, check for duplicates, and bulk import into their calendar.

## Architecture

### 1. Edge Function: `parse-schedule-image`
- Accepts a base64-encoded image
- Sends it to Lovable AI Gateway using `google/gemini-2.5-flash` (multimodal, cost-effective for image parsing)
- Uses tool calling to extract structured array of games with fields: `opponent`, `date`, `time`, `location`, `event_name`, `home_or_away`, `confidence` (high/medium/low)
- Returns parsed games array with confidence scores
- Handles 429/402 errors properly
- Add config entry with `verify_jwt = false`

### 2. Component: `AIScheduleImportDialog`
A multi-step dialog component (similar pattern to existing `ImportScheduleDialog`):

**Step 1 - Upload**: Image upload via file input (camera + gallery on mobile, drag-drop on desktop). Accepts JPG/PNG/HEIC. Shows "Scanning schedule..." loading state with spinner.

**Step 2 - Review**: Editable list of parsed games. Each row shows date, time, opponent, location, event name, home/away badge, and confidence badge (green "High Confidence" / amber "Needs Review"). Users can edit fields inline, delete rows, or add games manually. Low-confidence rows highlighted with amber border.

**Step 3 - Duplicate Check**: Before confirming, cross-reference parsed games against existing `schedule` data (same opponent + same date). Show warning with options: Skip duplicates, Replace existing, Import anyway.

**Step 4 - Confirm & Success**: Calls existing `bulkImportScheduledGames` to create entries. Shows success screen with count and navigation buttons to calendar/upcoming games.

**Fallback**: If AI returns no games or errors, show "We couldn't fully read this schedule" with retry/manual options. If image is low quality, show appropriate message.

### 3. Entry Points
- **Schedule tab** in LogSection (line ~765): Add `AIScheduleImportDialog` button next to existing `ImportScheduleDialog`
- **Calendar page**: Add button in `ScheduleCalendar` header area

### 4. Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/functions/parse-schedule-image/index.ts` | Create - Edge function for AI vision parsing |
| `supabase/config.toml` | Edit - Add `[functions.parse-schedule-image]` entry |
| `src/components/AIScheduleImportDialog.tsx` | Create - Multi-step dialog component |
| `src/components/LogSection.tsx` | Edit - Add AIScheduleImportDialog next to existing import button |
| `src/components/ScheduleCalendar.tsx` | Edit - Add AIScheduleImportDialog button |

### 5. Key Technical Details

- Image converted to base64 on client, sent to edge function (max ~20MB)
- Uses existing `bulkImportScheduledGames` from `useCloudData` for the actual import - no DB changes needed
- Duplicate detection done client-side by comparing against existing `schedule` array
- Confidence scoring: high = all required fields present, medium = missing optional fields, low = missing opponent or date
- Date normalization: assumes current season year if year is missing
- The dialog reuses existing UI components (Dialog, ScrollArea, Badge, Input, Button, Card)

