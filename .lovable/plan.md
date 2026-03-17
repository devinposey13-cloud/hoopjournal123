

## Problem

The "Web not supported in this plugin" error occurs because `@revenuecat/purchases-capacitor` does **not** have a web implementation. When the plugin's JS layer calls `Purchases.configure()`, it checks Capacitor's plugin registry for the native bridge. In a remote-URL TestFlight build, the native bridge may not be registered yet when the hook runs, or the plugin simply sees "web" as the platform internally.

This is a **known limitation** of the RevenueCat Capacitor plugin — it only works when the native iOS/Android framework is compiled into the binary and the Capacitor bridge is fully initialized.

## Root Cause

The `Purchases.configure()` call happens immediately on component mount. In remote-URL builds (where the app loads from a server URL rather than local files), there can be a race condition where the Capacitor native bridge isn't fully registered yet.

## Plan

### 1. Add bridge-readiness check with retry logic in `useRevenueCat.ts`

Before calling `Purchases.configure()`, verify the native plugin is actually registered in Capacitor's plugin registry. If not, retry with exponential backoff (up to ~3 seconds) to handle the bridge initialization delay in remote-URL builds.

```text
Hook mount
  → Check if Capacitor.isPluginAvailable('Purchases') 
  → If not available, retry up to 5 times with 500ms delays
  → Only then call Purchases.configure()
  → If still unavailable after retries, set error state (no Stripe fallback)
```

### 2. Use `Capacitor.isPluginAvailable()` guard

Import `Capacitor` from `@capacitor/core` and check `Capacitor.isPluginAvailable('PurchasesPlugin')` before attempting to configure. This is the standard Capacitor pattern for checking if a native plugin's bridge is present.

### 3. Improve error messaging in debug panel

Log each retry attempt so the debug panel shows exactly what's happening — whether the bridge eventually becomes available or is genuinely missing from the binary.

### Files to modify

- **`src/hooks/useRevenueCat.ts`** — Add bridge availability check with retry loop before `configure()`, improved error logging

