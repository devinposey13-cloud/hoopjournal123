

## Problem: Google Blocks OAuth in WebView

Google explicitly forbids OAuth sign-in from embedded WebViews (WKWebView). The current code tries to open the system browser via `@capacitor/browser`, but **the dynamic import hack (`new Function('m', 'return import(m)')`) bypasses Vite's bundler**, so the module is never included in the built app. At runtime, the import silently fails, and the fallback `window.location.href = brokerUrl` navigates the WebView itself — which Google then blocks.

## Root Cause

In `src/lib/nativeOAuth.ts`, line 21:
```typescript
async function dynamicImport(module: string): Promise<...> {
  return await new Function('m', 'return import(m)')(module);
}
```
This intentionally evades Vite's static analysis, meaning `@capacitor/browser` is **not bundled**. On the native device, the import fails, and the code falls back to redirecting inside the WebView.

Additionally, `@capacitor/core` is missing from `package.json` (only exists as a transitive dependency).

## Plan

### 1. Add missing Capacitor dependencies to `package.json`
Add `@capacitor/core` and `@capacitor/browser` explicitly so they're properly resolved.

### 2. Rewrite `nativeOAuth.ts` — use standard `import()` instead of `new Function` hack
Replace the `dynamicImport` helper with regular dynamic imports (`import('@capacitor/browser')`). Vite will bundle these modules. On web, the plugins are harmless no-ops. On native, they'll actually be available.

Key changes:
- `openOAuthInSystemBrowser`: Use `import('@capacitor/browser')` directly. If on native and the import fails, show an error toast instead of falling back to `window.location.href` (which would navigate the WebView and get blocked).
- `setupNativeOAuthListener`: Same — use regular `import('@capacitor/app')`.

### 3. Add safeguard: never redirect the WebView on native
In `AuthForm.tsx`, if `isNativeApp()` is true and the system browser fails to open, display an error message rather than navigating the WebView away. This prevents the "Google is blocking the app" screen entirely.

### 4. User action required after changes
After pulling these changes:
1. Run `npm install` (to pick up `@capacitor/core`)
2. Run `npx cap sync` to register the browser plugin natively
3. Rebuild and deploy to TestFlight

