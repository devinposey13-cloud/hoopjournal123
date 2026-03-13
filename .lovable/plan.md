

## Adding the Reversed Google Client ID URL Scheme for Despia

### The Problem
The `@codetrix-studio/capacitor-google-auth` plugin needs a URL scheme registered so Google's native SDK can redirect back to your app after sign-in. In Xcode you'd add it under Info → URL Types, but since you're using Despia, we need a different approach.

### Your Reversed Client ID
Based on your client ID `900798356514-at6uk29gq1roamu4gasqh839qq75u6ct.apps.googleusercontent.com`, the reversed version is:

```text
com.googleusercontent.apps.900798356514-at6uk29gq1roamu4gasqh839qq75u6ct
```

### How to Add It (Two Options)

**Option A — Add an `ios/App/App/Info.plist` to the repo (recommended)**

Create the file `ios/App/App/Info.plist` with the URL scheme entry. Despia reads the `ios/` folder during build. This is the most reliable method.

The key section to add:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.900798356514-at6uk29gq1roamu4gasqh839qq75u6ct</string>
      <string>hoopjournal</string>
    </array>
  </dict>
</array>
```

This registers both the Google reversed client ID and your existing `hoopjournal://` deep link scheme.

**Option B — Despia's UI**

If Despia has a "Custom Info.plist entries" or "URL Schemes" field in its iOS build settings, you can paste the reversed client ID there directly. Check under your app's iOS configuration in the Despia dashboard.

### Plan

1. Create `ios/App/App/Info.plist` with the full required plist content including both URL schemes (`com.googleusercontent.apps.900798356514-...` and `hoopjournal`)
2. This file will be picked up by `npx cap sync` and by Despia during the iOS build

### Important Note
If Despia generates its own `Info.plist` and overwrites yours, Option B (Despia's UI settings) would be the way to go. Most Capacitor build services merge entries from the project's `ios/` folder, but it depends on Despia's specific behavior.

