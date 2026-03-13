## RevenueCat Integration — IMPLEMENTED

### What was built

1. **Platform Detection** (`src/lib/platform.ts`) — `isNativeApp()`, `getPlatform()`, `isIOS()` helpers
2. **RevenueCat Hook** (`src/hooks/useRevenueCat.ts`) — SDK init, purchase, restore, offerings
3. **RevenueCat Webhook** (`supabase/functions/revenuecat-webhook/index.ts`) — syncs purchases to `plan_overrides`
4. **Conditional Routing** — `useSubscription`, `Pricing.tsx`, `Upgrade.tsx`, `UpgradeDrawer.tsx` all route to RevenueCat on native

### Next steps (user action required)

1. **Replace RevenueCat API key** in `src/hooks/useRevenueCat.ts` line 12 — replace `appl_REPLACE_WITH_YOUR_KEY` with your iOS public API key from RevenueCat dashboard
2. **Create RevenueCat products** matching these IDs: `hj_starter_monthly`, `hj_starter_yearly`, `hj_pro_monthly`, `hj_pro_yearly`, `hj_elite_monthly`, `hj_elite_yearly`
3. **Configure RevenueCat webhook** pointing to: `https://jwoupnumuotmwpwrkmob.supabase.co/functions/v1/revenuecat-webhook` with Authorization Bearer header matching the secret you just saved
4. **Set up Capacitor** for native iOS builds (not yet added to the project)

---

## Native Google Sign-In — IMPLEMENTED

### What was built

1. **Plugin** — `@codetrix-studio/capacitor-google-auth` installed
2. **Native helper** (`src/lib/nativeGoogleAuth.ts`) — `initNativeGoogleAuth()` + `nativeGoogleSignIn()` using `signInWithIdToken`
3. **AuthForm.tsx** — branches on `isNativeApp()`: native uses SDK, web keeps existing `lovable.auth.signInWithOAuth`
4. **App.tsx** — initializes the Google Auth plugin on native startup

### User action required

1. **Replace the Client ID** in `src/lib/nativeGoogleAuth.ts` line 10 — replace `REPLACE_WITH_YOUR_IOS_CLIENT_ID.apps.googleusercontent.com` with your iOS OAuth Client ID from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. **Create an iOS OAuth Client ID** — type: iOS application, bundle ID: `app.lovable.2cd79f530f3e4e88858df49e60e86e08`
3. **Add reversed client ID** as a URL scheme in Xcode (e.g. `com.googleusercontent.apps.XXXX`)
4. Run `npm install` → `npx cap sync` → rebuild in Xcode → TestFlight
