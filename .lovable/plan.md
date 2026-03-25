

## Fix: Apple Auth Edge Function Timeout

### Root Cause

The screenshot shows `{"error":"request timed out"}` rendered as raw text in the iOS webview. This happens in the `auth-apple-callback` edge function at **line 149**:

```typescript
const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
```

When your existing user signs in, `createUser` returns "already been registered", and the function then calls `listUsers()` which fetches **ALL users** without any filter. As the user base grows, this call gets progressively slower until it exceeds the edge function timeout — causing the raw JSON error to display in the webview.

### Fix

**`supabase/functions/auth-apple-callback/index.ts`** — Two changes:

1. **Replace `listUsers()` with a direct email lookup** — Use `supabaseAdmin.auth.admin.listUsers({ filter: userEmail })` or the `getUserById` approach. The Admin API supports filtering by email, turning an O(n) scan into a fast indexed query. This eliminates the timeout.

2. **Handle edge function errors gracefully for form_post flows** — When the function is called via form_post (iOS redirect), any unhandled timeout or crash renders raw JSON in the webview. Add a top-level catch that redirects to `/auth/callback?error=...` for non-JSON requests, so the user sees the app's error UI instead of raw JSON.

### Files
- `supabase/functions/auth-apple-callback/index.ts`

