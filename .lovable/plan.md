
# Enhanced OAuth Error Logging & User-Facing Messages

## Overview
Add comprehensive error logging and user-friendly error messages to the OAuth login flow (Google/Apple) to help diagnose issues like Asia's and improve the user experience when authentication fails.

## What Will Change

### For Users
- **Clear, actionable error messages** instead of generic "sign-in failed"
- **Specific guidance** based on error type (e.g., "Please allow popups" or "Check your internet connection")
- **Recovery suggestions** when things go wrong

### For Debugging
- **Detailed console logs** with timestamps and error codes
- **OAuth event tracking** including auth state changes
- **URL parameter error detection** from OAuth callbacks

## Implementation Details

### 1. Create OAuth Error Utility (`src/utils/oauthErrors.ts`)
A new utility file to:
- Parse and categorize OAuth errors
- Map error codes to user-friendly messages
- Log detailed debugging information to console

**Error Categories:**
| Error Type | User Message | Debug Info |
|------------|--------------|------------|
| Popup blocked | "Popup was blocked. Please allow popups for this site." | Browser popup blocker detected |
| Network error | "Connection failed. Check your internet and try again." | Network/fetch failure |
| Cancelled by user | "Sign-in was cancelled." | User closed OAuth popup |
| Invalid credentials | "Could not verify your account. Please try again." | OAuth provider rejection |
| Session expired | "Your session expired. Please sign in again." | Token refresh failed |
| Unknown error | "Sign-in failed. Please try again or use email login." | Fallback with raw error |

### 2. Update AuthForm.tsx

**Enhanced Google/Apple Sign-In Handlers:**
- Log OAuth initiation with timestamp
- Catch and categorize specific error types
- Show appropriate toast messages with recovery hints
- Log complete error details to console for support

```text
┌─────────────────────────────────────────────────────────┐
│  User clicks "Continue with Google"                     │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Log: "OAuth initiated: google @ 2026-02-08T21:00:00"   │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│  lovable.auth.signInWithOAuth("google", {...})          │
└────────────────────┬────────────────────────────────────┘
                     ▼
          ┌──────────┴──────────┐
          ▼                     ▼
    ┌───────────┐         ┌───────────┐
    │  Success  │         │   Error   │
    └─────┬─────┘         └─────┬─────┘
          │                     │
          │                     ▼
          │         ┌─────────────────────────────────────┐
          │         │  parseOAuthError(error)             │
          │         │  → Categorize error type            │
          │         │  → Log detailed debug info          │
          │         │  → Show user-friendly toast         │
          │         └─────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────┐
│  Log: "OAuth success: google, uid: xxx"                 │
└─────────────────────────────────────────────────────────┘
```

### 3. Add URL OAuth Error Detection (App.tsx or useAuth.tsx)

Check for OAuth error parameters on app load:
- `?error=` and `?error_description=` in URL query
- `#error=` and `#error_description=` in URL hash
- Show toast and log details if OAuth callback failed

### 4. Enhanced Auth State Logging (useAuth.tsx)

Add event-type logging to `onAuthStateChange`:
- Log sign-in events with user email/provider
- Log sign-out events
- Log token refresh events
- Log any error events from auth state changes

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/oauthErrors.ts` | **New file** - Error parsing and user message mapping |
| `src/components/AuthForm.tsx` | Enhanced error handling with detailed logging |
| `src/hooks/useAuth.tsx` | Auth state change logging for debugging |
| `src/App.tsx` | URL-based OAuth error detection on mount |

## Console Log Examples

**On OAuth Initiation:**
```
[OAuth] Initiating sign-in with Google at 2026-02-08T21:00:00.000Z
[OAuth] Redirect URI: https://hoopjournal.lovable.app
```

**On OAuth Error:**
```
[OAuth Error] Provider: google
[OAuth Error] Type: popup_blocked
[OAuth Error] Message: The popup was blocked by the browser
[OAuth Error] Raw: Error: popup_blocked at...
[OAuth Error] User agent: Mozilla/5.0...
[OAuth Error] Timestamp: 2026-02-08T21:00:05.000Z
```

**On OAuth Success:**
```
[OAuth] Sign-in successful with Google
[OAuth] User: abc123 (email: user@example.com)
```

## User-Facing Error Examples

**Popup Blocked:**
> 🚫 Popup blocked
> Please allow popups for Hoop Journal and try again.

**Network Error:**
> 📡 Connection failed  
> Check your internet connection and try again.

**Unknown Error:**
> ⚠️ Sign-in failed
> Something went wrong. Try again or use email login instead.
> 
> *If this keeps happening, contact support with error code: OA-1707423600*

## Technical Notes

- Error codes will include timestamps for support correlation
- All logging uses `console.log`/`console.error` which are captured by the session replay
- No sensitive data (passwords, tokens) logged
- User agent logged to identify device-specific issues (iOS Safari, etc.)
