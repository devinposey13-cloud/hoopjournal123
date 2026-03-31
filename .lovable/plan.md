

## Add Report Comment & Report Video Functionality

### Problem
The app only supports reporting AI coach responses. Users cannot report inappropriate comments or videos in the Explore feed.

### Plan

**1. Database Migration — Extend `content_reports` table**

Add two new nullable columns:
```sql
ALTER TABLE public.content_reports 
  ALTER COLUMN ai_response DROP NOT NULL,
  ALTER COLUMN reported_content DROP NOT NULL;

ALTER TABLE public.content_reports 
  ADD COLUMN content_type text NOT NULL DEFAULT 'ai_response',
  ADD COLUMN content_reference_id uuid;
```

This makes `ai_response` and `reported_content` nullable (they're irrelevant for comment/video reports), adds `content_type` ('ai_response', 'comment', 'video') and `content_reference_id` (pointing to the comment or video ID).

**2. New Component — `ReportContentDialog.tsx`**

A generic report dialog that works for all content types:
- Props: `contentType` ('ai_response' | 'comment' | 'video'), `contentId` (uuid), `contentPreview` (string to show in dialog), optional `triggerVariant` for different button styles
- Inserts into `content_reports` with `content_type`, `content_reference_id`, `reported_content` (preview text), and `reason`
- Sends Slack alert with appropriate category info
- The existing `ReportContentButton` remains unchanged for backward compatibility

**3. Update `VideoInteractions.tsx` — Report Comment**

- Add a `Flag` icon button next to each comment (visible on hover, like the delete button)
- Only show for comments NOT owned by the current user
- Opens the new `ReportContentDialog` with `contentType='comment'`, `contentId=comment.id`, preview = comment text

**4. Update `ClipCard.tsx` — Report Video**

- Add a small flag/report option on public clips (e.g., in a dropdown or as a subtle icon)
- Opens `ReportContentDialog` with `contentType='video'`, `contentId=clip.id`, preview = clip title

**5. Update `AdminPanel.tsx` — Display new report types**

- Update the `ContentReport` interface to include `content_type` and `content_reference_id`
- Show a badge/label indicating report type (AI Response, Comment, Video)
- Conditionally render preview based on `content_type`

### Files Changed
- **Migration**: Add `content_type`, `content_reference_id` columns; make `ai_response`/`reported_content` nullable
- **`src/components/ReportContentDialog.tsx`** (new): Generic report dialog
- **`src/components/VideoInteractions.tsx`**: Add flag button on non-owned comments
- **`src/components/ClipCard.tsx`**: Add report option on public clips
- **`src/components/AdminPanel.tsx`**: Update report display to handle new types

