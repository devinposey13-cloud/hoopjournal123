
What I found

- I do not see `NSUserTrackingUsageDescription` in your checked-in `ios/App/App/Info.plist`.
- I do not see any source code usage of:
  - `ATTrackingManager`
  - `requestTrackingAuthorization`
  - `AppTrackingTransparency`
  - `AdServices`
- I do see a major remaining blocker in the repo:
  - `package.json` still includes `@revenuecat/purchases-capacitor`
  - `bun.lock` still includes `@revenuecat/purchases-capacitor`
- Despia documentation indicates Despia’s native purchase flow is still RevenueCat-backed internally. That means there are two possible sources for Apple’s warning:
  1. your app build still includes leftover RevenueCat native artifacts from the old plugin in the generated iOS project/build cache
  2. the Despia-generated native shell itself may bundle a framework Apple flags for ATT in that specific build pipeline

Answer to your question

- Based on this repo alone, I cannot prove Despia itself adds `NSUserTrackingUsageDescription`.
- What I can prove is:
  - your current source `Info.plist` is clean
  - your code does not call ATT APIs
  - your JavaScript dependency graph still contains the old RevenueCat Capacitor package, which is the strongest repo-level reason Apple may still detect ATT-related artifacts in the binary

Exact files/settings currently causing concern

- `package.json`
  - contains `@revenuecat/purchases-capacitor`
- `bun.lock`
  - still resolves `@revenuecat/purchases-capacitor`
- `ios/App/App/Info.plist`
  - clean; no `NSUserTrackingUsageDescription`
- iOS native repo files
  - there is no `Podfile` / `Podfile.lock` checked into this repo to verify whether old pods remain locally in your build machine

Conclusion

- Most likely: Apple is not complaining because of the current checked-in `Info.plist`.
- Most likely root cause: the most recent iOS binary was built from an environment that still had RevenueCat Capacitor/native artifacts linked, or the Despia build process itself injected a tracking-related native dependency.
- So yes, it is possible Despia’s build includes something Apple flags, but your repo currently gives stronger evidence that the old RevenueCat Capacitor dependency has not actually been removed everywhere.

Plan to resolve

1. Remove the leftover RevenueCat package from the repo
- Delete `@revenuecat/purchases-capacitor` from `package.json`
- regenerate lockfiles so it disappears from `bun.lock` and any npm lockfile in use

2. Re-audit all imports/usages
- confirm nothing imports RevenueCat packages directly
- keep `despia-native` only for native purchase triggering

3. Rebuild native dependencies from a clean state
- reinstall JS dependencies
- regenerate iOS native dependencies
- ensure no RevenueCat / PurchasesHybridCommon artifacts remain in the native build output

4. If Apple still flags ATT after a fully clean rebuild
- treat Despia shell/build pipeline as the remaining suspect
- verify with Despia whether their current iOS wrapper links ATT-sensitive frameworks
- if they do, ask them for the exact framework and whether they inject `NSUserTrackingUsageDescription` automatically

What I would change when you approve

- Remove `@revenuecat/purchases-capacitor` from:
  - `package.json`
  - lockfiles
- Run a repo-wide cleanup check for any leftover RevenueCat references
- Give you a precise post-clean rebuild checklist for iOS

Technical notes

```text
Current evidence
├─ Info.plist in repo: clean
├─ ATT API usage in source: none found
├─ RevenueCat Capacitor dependency: still present
└─ Despia docs: native purchases are RevenueCat-backed internally
```

Recommended next build steps after cleanup

```text
1. npm install
2. regenerate/remove stale lock artifacts
3. re-sync/rebuild the iOS project from clean state
4. clean build folder / derived data
5. archive a brand-new build
6. if rejection persists, escalate to Despia with the exact App Store warning
```

If you approve, I’ll prepare the cleanup so we can determine whether the ATT trigger is from your repo or from Despia’s native shell.
