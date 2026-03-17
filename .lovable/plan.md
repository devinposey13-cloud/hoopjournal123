

## Increase Video Clip Upload Size

**Current state**: Video clips are limited to 100MB in two files.

**Change**: Increase to 250MB in both locations:

1. **`src/components/AddClipDialog.tsx`** (line 36-38) — Update limit to `250 * 1024 * 1024`, update error message and the helper text on line 97 ("Max 100MB" → "Max 250MB")

2. **`src/components/CoachChat.tsx`** (line 226-228) — Update limit to `250 * 1024 * 1024`, update error message

3. **Storage bucket** — The `video-clips` bucket currently enforces a 100MB server-side limit. This also needs to be updated to 250MB via a database migration to avoid server-side rejections.

