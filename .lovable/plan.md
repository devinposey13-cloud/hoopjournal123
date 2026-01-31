
# Bug Fix: First-Time User Intro/Onboarding Not Showing

## Problem Identified

The first-time user experience (basketball animation + 5-card onboarding) did not appear for the test account `bigpose2@gmail.com`. The user went directly to the Coach AI welcome screen.

## Root Cause Analysis

The onboarding detection in `useFirstLogin.ts` uses **browser localStorage** to track whether a user has seen the intro and completed onboarding:

```typescript
const INTRO_SEEN_KEY = 'hoopjournal_intro_seen';
const ONBOARDING_COMPLETE_KEY = 'hoopjournal_onboarding_complete';
```

**Critical flaw:** These localStorage keys are **global to the browser**, not user-specific. This causes problems when:
1. A user tests with multiple accounts in the same browser
2. A user clears their data and logs back in
3. A user switches devices/browsers

The database correctly stores `onboarding_completed_at` in the `player_settings` table, but this value is **never checked** by `useFirstLogin`.

## Evidence from Database

For `bigpose2@gmail.com`:
- `is_approved`: true (approved by admin)
- `onboarding_completed_at`: NULL (never completed onboarding)
- `court_role`, `playing_level`, `season_goals`: all NULL

The database clearly shows onboarding was never completed, but localStorage from a previous account session may have had the flags set.

## Solution: Hybrid Database + localStorage Approach

Update `useFirstLogin.ts` to:
1. Check the database `onboarding_completed_at` field as the **source of truth**
2. Use localStorage as a secondary cache for the intro animation (which is truly first-impression only)
3. Sync the two: if database says not completed but localStorage says completed, trust the database

## Implementation Changes

### 1. Update `useFirstLogin.ts`

Current logic:
```text
localStorage empty? → Show intro
localStorage intro_seen? → Check onboarding
localStorage both set? → Skip to dashboard
```

New logic:
```text
1. Wait for user profile to load
2. Check database: onboarding_completed_at is NULL?
   - YES → Check localStorage intro_seen?
     - NO → Show intro animation
     - YES → Show onboarding flow
   - NO → Skip both (user already completed onboarding)
```

### 2. Pass User Context to Hook

The hook needs access to the user's profile data (`onboardingCompletedAt`) to make database-aware decisions.

### 3. User-Specific localStorage Keys (Optional Enhancement)

Could change keys to include user ID:
```typescript
const INTRO_SEEN_KEY = `hoopjournal_intro_seen_${userId}`;
```

But the simpler fix is to just trust the database.

## File Changes

| File | Change |
|------|--------|
| `src/hooks/useFirstLogin.ts` | Accept profile data as parameter, check `onboardingCompletedAt` from database |
| `src/pages/Index.tsx` | Pass profile loading state and onboarding status to the hook |

## Updated Hook Logic

```typescript
export function useFirstLogin(profile: PlayerProfile | null, profileLoading: boolean) {
  const [showIntro, setShowIntro] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for profile to load
    if (profileLoading) return;
    
    // If database shows onboarding completed, skip everything
    if (profile?.onboardingCompletedAt) {
      setShowIntro(false);
      setShowOnboarding(false);
      setLoading(false);
      return;
    }
    
    // Database says NOT completed - check localStorage for intro
    const hasSeenIntro = localStorage.getItem(INTRO_SEEN_KEY);
    
    if (!hasSeenIntro) {
      setShowIntro(true);
    } else {
      setShowOnboarding(true);
    }
    setLoading(false);
  }, [profile, profileLoading]);

  // ... rest of implementation
}
```

## Technical Details

### Index.tsx Updates

1. Move `useFirstLogin` call after profile is available from `useGameWithMilestones`
2. Pass profile and loading state to the hook
3. Adjust loading state handling order

### Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Fresh account, empty localStorage | Shows intro → onboarding |
| Fresh account, stale localStorage from another account | Database says NULL → shows intro → onboarding |
| Returning user, same device | Database says completed → skips both |
| Returning user, new device | Database says completed → skips both |
| User who completed onboarding then cleared localStorage | Database says completed → skips both |

## Summary

The fix ensures the database `onboarding_completed_at` field is the source of truth, making the first-time experience work correctly across all scenarios. localStorage remains useful as a per-session cache for the intro animation, but the database determines whether onboarding is truly complete.
