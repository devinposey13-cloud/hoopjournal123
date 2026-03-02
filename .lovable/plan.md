

## Fix: Settings Panel Not Showing Grandfathered Status

### Problem
The Settings panel uses `useSubscription()` (which only checks Stripe) to determine what plan to display. Grandfathered users have no Stripe subscription, so the code falls to the "Free Plan" branch at line 375-400 of `SettingsPanel.tsx`, showing "Free Plan" with upgrade prompts.

The `usePlan()` hook correctly computes the effective plan (Elite for grandfathered users) and provides an `accessBadge` with "Founding Member" label, but **it's never used in SettingsPanel**.

### Fix
Modify `src/components/SettingsPanel.tsx` to:

1. **Import and use `usePlan()`** alongside `useSubscription()` 
2. **Add a new UI branch** before the "Free Plan" fallback: if the user has special access (grandfathered, admin override, or promo), show the effective plan name with the appropriate badge (e.g., "Founding Member — Elite Access") and hide the upgrade/cancel buttons
3. **Adjust the condition logic**: `subLoading ? loading UI : isSubscribed ? Stripe UI : hasSpecialAccess ? Founding Member UI : Free plan UI`

### Scope
- **1 file changed**: `src/components/SettingsPanel.tsx`
- No database or backend changes needed — the data is already correct in `plan_overrides` (`is_grandfathered: true`)

