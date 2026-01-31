

# Add Countdown Timer to Delete Account Confirmation

## Overview
Add a 5-second countdown timer that starts after the user types "DELETE" in the confirmation dialog. This provides an additional safety buffer, giving users one last chance to reconsider before permanently deleting their account.

## Current Behavior
- User opens the Delete Account dialog
- User types "DELETE" in the input field
- The "Delete My Account" button becomes immediately enabled
- User can click to delete right away

## New Behavior
- User opens the Delete Account dialog
- User types "DELETE" in the input field
- A 5-second countdown timer starts automatically
- The button shows "Wait 5s..." then "Wait 4s..." etc.
- After countdown completes, button shows "Delete My Account" and becomes clickable
- If user clears/changes the input, the countdown resets

## Changes

### Update `src/components/settings/DangerZoneSection.tsx`

**New State:**
- `deleteCountdown: number | null` - Tracks remaining seconds (null when not counting)

**New Effect:**
Add a `useEffect` that:
1. Watches for `deleteConfirmText === 'DELETE'`
2. When matched, starts a countdown from 5
3. Uses `setInterval` to decrement every second
4. Cleans up interval when countdown reaches 0 or text changes
5. Resets countdown to null if user changes the input text

**Updated Button Logic:**
- Disabled when: text !== 'DELETE' OR countdown > 0 OR isDeletingAccount
- Button text shows:
  - `Wait ${countdown}s...` when counting down
  - `Delete My Account` when countdown complete
  - `Deleting...` with spinner when in progress

## Visual Design

```text
Before countdown (text not matching):
[Cancel]  [Delete My Account] (disabled, grayed out)

During countdown:
[Cancel]  [Wait 4s...] (disabled, showing countdown)

After countdown:
[Cancel]  [Delete My Account] (enabled, destructive red)
```

## Technical Details

**Import Addition:**
- Add `useEffect` to the React import

**Timer Implementation:**
```text
useEffect(() => {
  // Only start countdown when DELETE is typed
  if (deleteConfirmText === 'DELETE' && !isDeletingAccount) {
    setDeleteCountdown(5);
    
    const interval = setInterval(() => {
      setDeleteCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  } else {
    // Reset countdown if text changes
    setDeleteCountdown(null);
  }
}, [deleteConfirmText, isDeletingAccount]);
```

**Button Disabled Condition:**
```text
disabled={
  deleteConfirmText !== 'DELETE' || 
  (deleteCountdown !== null && deleteCountdown > 0) || 
  isDeletingAccount
}
```

**Button Text Logic:**
```text
{isDeletingAccount ? (
  <><Loader2 className="animate-spin" /> Deleting...</>
) : deleteCountdown !== null && deleteCountdown > 0 ? (
  `Wait ${deleteCountdown}s...`
) : (
  'Delete My Account'
)}
```

## Edge Cases Handled
- **User types DELETE then changes it**: Countdown resets to null
- **User closes dialog during countdown**: Effect cleanup clears interval
- **User reopens dialog**: Fresh state, countdown starts again when DELETE typed
- **Countdown at 0**: Button becomes enabled (0 is falsy but we check > 0)

