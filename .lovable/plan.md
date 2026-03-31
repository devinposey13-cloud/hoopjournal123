

## Add "Free" Option to Admin Plan Override

### Problem
The admin console only offers "Pro" and "Elite" as plan override options. There's no way to force a user down to Free (e.g., to revoke a grandfathered or promo-granted plan).

### Plan

**1. Add "Free" option to the quick override dropdown in `src/components/AdminPanel.tsx`**
- Add `<SelectItem value="free">Free</SelectItem>` between "No Override" and "Pro" (~line 1507)

**2. Add "Free" option to the detailed override dropdown in `src/components/admin/AdminAccessControls.tsx`**
- Add `<SelectItem value="free">Free</SelectItem>` between "No override" and "Pro" (~line 473)

### How it works
The existing `getEffectivePlan()` logic already handles this correctly — `adminOverridePlan` is checked before subscription/promo/grandfathered status, so setting it to `'free'` will force the user to the free tier regardless of other access. "No Override" (null) continues to let the normal priority chain apply.

### Files Changed
- `src/components/AdminPanel.tsx` — add "Free" select option
- `src/components/admin/AdminAccessControls.tsx` — add "Free" select option

