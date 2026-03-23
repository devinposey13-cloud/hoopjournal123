

## Plan: Guest Mode for Apple App Review Guideline 5.1.1

### Summary
Add a "Continue as Guest" option to the launch screen so Apple reviewers (and real users) can explore the app without registering. Guest mode provides a read-only demo experience with sample data. Account-gating is applied only when users attempt cloud-dependent actions.

### Architecture

```text
AuthForm
├── Sign Up
├── Log In
└── Continue as Guest  ← NEW (sets localStorage flag, no Supabase auth)

useAuth hook
├── user: User | null
├── isGuest: boolean        ← NEW (from context)
└── enterGuestMode()        ← NEW
    exitGuestMode()         ← NEW

Index.tsx
├── if authLoading → spinner
├── if !user && !isGuest → AuthForm
├── if isGuest → GuestDashboard  ← NEW (sample data, no cloud calls)
├── if user → normal authenticated flow
```

### Changes

**1. `src/hooks/useAuth.tsx` — Add guest state to AuthContext**
- Add `isGuest` boolean, `enterGuestMode()`, and `exitGuestMode()` to context.
- `enterGuestMode` sets `localStorage.setItem('hj_guest_mode', 'true')` and updates state.
- `exitGuestMode` clears the flag.
- On mount, check localStorage to restore guest state (so page refresh keeps guest mode).

**2. `src/components/AuthForm.tsx` — Add "Continue as Guest" button**
- Add a prominent "Continue as Guest" button below the OAuth buttons (same visual weight, not hidden).
- Calls `enterGuestMode()` from useAuth.
- Include Privacy Policy and Terms links at the bottom of the auth form.

**3. `src/components/GuestDashboard.tsx` — NEW: Demo experience**
- Self-contained component with hardcoded sample data (sample player profile, 3-4 sample games with stats, a sample schedule).
- Renders the same visual layout as the real dashboard: PlayerHeader, DashboardQuickStats, TodayCard, RecentActivity, PlayerCard — but fed with static demo data.
- Navigation tabs work (dashboard, games, stats views) but show sample content.
- "Coach" tab shows a teaser message prompting account creation.
- Settings tab shows Privacy Policy, Terms, EULA links (accessible without auth).
- All action buttons (Add Game, Log Stats, etc.) trigger the account-gate modal instead of performing real actions.

**4. `src/components/GuestAccountGate.tsx` — NEW: Prompt modal**
- Polished dialog shown when a guest taps any account-gated action.
- Message: "Create a free account to save your progress, sync your data, and unlock all features."
- Two buttons: "Sign Up" (calls `exitGuestMode()` and shows AuthForm in signup mode) and "Not Now" (dismisses).

**5. `src/pages/Index.tsx` — Route guests to GuestDashboard**
- After the auth loading check, add: `if (!user && isGuest) return <GuestDashboard />;`
- This goes before the `if (!user) return <AuthForm />;` check.

**6. `src/components/BottomNavigation.tsx` & `src/components/Navigation.tsx` — Guest awareness**
- In guest mode, render tabs but gate account-specific actions through GuestAccountGate.

**7. Legal accessibility in guest mode**
- Privacy Policy (`/privacy`), Terms (`/terms`), and EULA (`/eula`) routes already exist as public pages — no changes needed there.
- Add links to these in the GuestDashboard settings/footer area.

### Sample Data (hardcoded in GuestDashboard)
- Player: "Demo Player", #23, Guard, "Demo High School"
- 3 sample games with realistic stats (points, rebounds, assists, etc.)
- 1 upcoming scheduled game
- Season averages computed from sample data

### What Gets Gated (triggers GuestAccountGate modal)
- Add Game / Log Game
- Save any data
- Coach Chat
- Profile editing
- Subscription/upgrade flows
- Any Supabase write operation

### What Remains Open in Guest Mode
- Viewing demo dashboard, stats, schedule
- Navigating between tabs
- Viewing Privacy Policy, Terms, EULA
- Viewing the pricing page (read-only)

### Review Safety
- No special hidden route needed — "Continue as Guest" is the first-launch escape hatch.
- Apple reviewer taps "Continue as Guest" and immediately sees a functional basketball stats dashboard with sample data.

### Files to Create
- `src/components/GuestDashboard.tsx`
- `src/components/GuestAccountGate.tsx`

### Files to Modify
- `src/hooks/useAuth.tsx` (add isGuest, enterGuestMode, exitGuestMode)
- `src/components/AuthForm.tsx` (add Continue as Guest button)
- `src/pages/Index.tsx` (route guests to GuestDashboard)

