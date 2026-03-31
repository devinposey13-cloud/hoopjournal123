

## Add Delete Account URL for Google Play

Google Play requires a publicly accessible URL where users can request account deletion. The app already has full delete-account functionality in Settings → Danger Zone via the `delete-own-account` edge function.

### Plan

**1. Create a new page: `src/pages/DeleteAccount.tsx`**
- Public route at `/delete-account`
- If user is logged in: show account deletion UI inline (reuse the confirmation flow from `DangerZoneSection` — type "DELETE" to confirm, calls the `delete-own-account` edge function)
- If user is not logged in: show a login form first, then the deletion flow after auth
- Branded with Hoop Journal logo and clean layout
- Include a brief explanation: "This will permanently delete your account and all associated data"

**2. Add route in `src/App.tsx`**
- Add `<Route path="/delete-account" element={<DeleteAccount />} />` before the catch-all

**3. The URL to provide Google Play**
- `https://hoopjournal123.lovable.app/delete-account`

No database or edge function changes needed — the existing `delete-own-account` function handles everything.

