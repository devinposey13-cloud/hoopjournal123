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
