
# Fix: Game Details Back Button Not Working

## Problem
The back button on the Game Details page uses `navigate(-1)` which relies on browser history. This fails when:
- Users access the page directly via URL, bookmark, or shared link
- The page is refreshed, clearing the navigation history
- Internal navigation uses `replace: true` which doesn't add to history

## Solution
Replace all `navigate(-1)` calls with `navigate('/')` to always navigate back to the main dashboard, providing consistent and reliable navigation.

---

## Changes

### Update `src/pages/GameDetail.tsx`

**Location 1 - Scheduled Game View (line 550):**
```text
Before:  onClick={() => navigate(-1)}
After:   onClick={() => navigate('/')}
```

**Location 2 - Error View (line 729):**
```text
Before:  onClick={() => navigate(-1)}
After:   onClick={() => navigate('/')}
```

**Location 3 - Main Game Details View (line 757):**
```text
Before:  onClick={() => navigate(-1)}
After:   onClick={() => navigate('/')}
```

---

## Why This Works
- The main dashboard (`/`) is always a valid navigation target
- Matches the existing FloatingHomeButton behavior which navigates to `/`
- Provides consistent, predictable navigation regardless of how the user arrived at the page
- No dependency on browser history state
