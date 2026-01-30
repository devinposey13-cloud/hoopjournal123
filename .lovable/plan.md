
# Increase Video Upload Limit to 100MB

## Overview
Update the video file size limit from 50MB to 100MB across all locations where it's enforced.

---

## Changes Required

### 1. Database Migration (Storage Bucket)
**File:** Create new migration

Update the `video-clips` storage bucket configuration:
- Change `file_size_limit` from `52428800` (50MB) to `104857600` (100MB)

```sql
UPDATE storage.buckets 
SET file_size_limit = 104857600 -- 100MB in bytes
WHERE id = 'video-clips';
```

---

### 2. Update CoachChat Validation
**File:** `src/components/CoachChat.tsx`

Update the client-side validation:
- Change `50 * 1024 * 1024` to `100 * 1024 * 1024`
- Update error message from "50MB" to "100MB"

---

### 3. Add Client-Side Validation to AddClipDialog
**File:** `src/components/AddClipDialog.tsx`

Add file size validation with better UX:
- Validate file size (100MB limit) when file is selected
- Show error toast if file exceeds limit
- Update the upload hint text to show "Max 100MB"

---

## Summary of Limit Locations

| Location | Current | New |
|----------|---------|-----|
| Storage bucket (`video-clips`) | 50MB | 100MB |
| CoachChat validation | 50MB | 100MB |
| AddClipDialog (new validation) | None | 100MB |
