

## Native Purchase UI for iOS (RevenueCat Offerings)

### Overview
Create a new `NativePurchaseSheet` component that displays real App Store prices from RevenueCat offerings when running on iOS. On web, the existing Stripe-based UI continues to work unchanged. The native UI will be used in the Upgrade page, UpgradeDrawer, and PaywallModal when `isNativeApp()` is true.

### New Component: `src/components/purchase/NativePurchaseSheet.tsx`
A drawer/sheet optimized for mobile that:
- Groups RevenueCat `RCPackage` offerings by plan tier (Starter, Pro, Elite)
- Shows real App Store `priceString` (e.g. "$7.99/mo") instead of hardcoded prices
- Includes a Monthly/Yearly toggle that filters displayed packages
- Shows plan features from `planCatalog` for the selected tier
- Purchase button triggers `purchasePackage()` from `useRevenueCat`
- "Restore Purchases" link at the bottom calls `restorePurchases()`
- Loading/skeleton state while offerings load
- Handles empty offerings gracefully (e.g. "Packages unavailable, try again later")

### Updates to Existing Components

1. **`src/pages/Upgrade.tsx`** -- When `isNativeApp() && rcAvailable`:
   - Replace hardcoded `$price` in `PlanCard` with real `priceString` from offerings
   - Add "Restore Purchases" button at the bottom
   - Pass RC offerings data to plan cards so they display App Store prices

2. **`src/components/upgrade/UpgradeDrawer.tsx`** -- When native:
   - Display `priceString` from the matched RC package instead of `getPlanPrice()`
   - Hide promo code input (not applicable for IAP)
   - Add "Restore Purchases" link

3. **`src/components/paywall/PaywallModal.tsx`** -- When native:
   - Show `priceString` from RC offerings in the plan pills instead of hardcoded prices
   - Add restore purchases option

4. **`src/components/pricing/PlanCard.tsx`** -- Add optional `nativePriceString` prop:
   - When provided, display it instead of the computed `$price`
   - This keeps the component reusable across web and native

5. **`src/components/SettingsPanel.tsx`** -- Add a "Restore Purchases" button in the subscription section when `isNativeApp()` is true, using `restorePurchases()` from `useRevenueCat`.

### Technical Details
- No new dependencies needed; uses existing `useRevenueCat` hook
- `RCPackage.priceString` comes directly from the App Store (localized, correct currency)
- The `period` field on `RCPackage` ("Monthly"/"Yearly") is used to filter by billing cycle
- All purchases still sync server-side via the existing `revenuecat-webhook` edge function
- On web, nothing changes -- all native-only code is behind `isNativeApp()` guards

