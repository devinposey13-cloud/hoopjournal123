
Fix the App Store cancellation/manage flow so web preview and browsers open a real Apple URL instead of attempting the native bridge.

1. Update `src/components/SettingsPanel.tsx`
- In the `effectiveBillingSource === 'ios_app_store'` confirm action, branch by platform:
  - If `isDespia()` is true, keep the native `despia('managesubscriptions://')` behavior.
  - If `isDespia()` is false, skip importing `despia-native` entirely and open `https://apps.apple.com/account/subscriptions` directly with `window.open(..., '_blank', 'noopener,noreferrer')`.
- Show the toast after the correct action for each path so the message matches what actually happened.
- This removes the current web-preview failure where the native import path runs, logs analytics, shows “Opening App Store subscription management…”, and then does nothing.

2. Make the web behavior resilient
- Add a small helper inside `SettingsPanel` (or nearby) for “open Apple subscription management” so both native and web logic are explicit and easy to maintain.
- If `window.open` returns null, fall back to `window.location.href = 'https://apps.apple.com/account/subscriptions'` to handle popup blockers.

3. Align the Billing page
- Update `src/pages/Billing.tsx` to read `billingSource` from `useSubscription()`.
- If `billingSource === 'ios_app_store'`, do not call the Stripe-only `cancelSubscription()` flow.
- Instead, reuse the same Apple management redirect behavior/messages there so Settings and Billing behave consistently.

4. Preserve existing Stripe behavior
- Keep Stripe subscribers on `openCustomerPortal()` / `cancelSubscription(false|true)`.
- Keep App Store subscribers on Apple-managed cancellation only; no backend Stripe cancellation attempt.

Technical details
- Root cause: `SettingsPanel` currently always tries `import('despia-native')` + `despia('managesubscriptions://')` for App Store billing, even in preview/web where there is no working Despia runtime.
- The logs support this: `cancel_subscription_clicked { billingSource: "ios_app_store" }` followed by `manage_ios_subscription_opened {}` with no resulting navigation.
- Existing backend billing detection is already correct enough for this fix: `check-subscription` returns `billing_source: "ios_app_store"` for App Store-backed plans and `stripe` for Stripe.
- Secondary issue to clean up while in this area: the console warning in `SettingsPanel` comes from using `AlertDialogAction` with a custom button-style component flow; replacing that action with a standard button inside the footer or ensuring the child is ref-forwarding will avoid the React ref warning.

Files to change
- `src/components/SettingsPanel.tsx`
- `src/pages/Billing.tsx`

Expected result
- In preview/web browser, clicking “Manage in App Store” opens Apple’s subscriptions page in a new tab or same tab fallback.
- In the native shell, the app continues using the native subscription-management bridge.
- Stripe cancellation remains unchanged.

Testing
- Web preview: open Settings → Cancel Subscription for an App Store subscriber and confirm Apple’s subscription page opens.
- Native shell: confirm the same action still invokes App Store management via the native bridge.
- Stripe subscriber: confirm Manage opens the billing portal and Cancel still schedules Stripe cancellation.
