

## Plan: Optimize Avatar Generation — Flash-First + Caching

### Changes

**1. Edge Function (`supabase/functions/generate-avatar/index.ts`)**

- **Swap model order**: Put `gemini-3.1-flash-image-preview` first (cheaper/faster), `gemini-3-pro-image-preview` as fallback.
- **Add caching via Supabase Storage**: 
  - Hash the incoming base64 image data (SHA-256) to create a cache key.
  - Before calling AI, check if `avatars/avatar-cache/{hash}.png` exists in storage.
  - If cached, return the public URL immediately (no AI call).
  - After successful generation, upload the result to `avatars/avatar-cache/{hash}.png` for future reuse.
  - Use a service-role client for storage operations.

**2. Client (`src/components/admin/AdminQuickMode.tsx`)**

- No changes needed — the caching is transparent on the backend side. The client already handles `imageData` responses. We'll return a `cached: true` flag so the client can show "Loaded from cache" vs "Generated" in the toast.

### Technical Details

- **Hashing**: Use Web Crypto `crypto.subtle.digest('SHA-256', ...)` on the base64 image string to produce a deterministic cache key.
- **Storage path**: `avatar-cache/{sha256hex}.png` in the existing public `avatars` bucket.
- **Cache hit flow**: Hash → check storage → return public URL → skip AI entirely.
- **Cache miss flow**: Hash → AI generation → decode base64 → upload to storage → return both the base64 data and store for future lookups.

### Files Modified
- `supabase/functions/generate-avatar/index.ts` — model swap + caching logic
- `src/components/admin/AdminQuickMode.tsx` — minor toast update for cache hits

