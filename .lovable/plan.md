

## Replace Pre-Hydration Shell Emoji with Lottie Animation

The bouncing 🏀 emoji in the pre-hydration shell (index.html) will be replaced with the same Lottie basketball animation used throughout the app, giving a polished branded splash screen on first launch.

### Changes

**index.html** (pre-hydration shell, ~lines 30-40):
- Remove the emoji `<div>` and the `@keyframes hjbounce` CSS
- Add a `<script>` tag to load the dotlottie-wc player: `https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-wc@latest/dist/dotlottie-wc.js`
- Replace the emoji with a `<dotlottie-wc>` element pointing to `https://lottie.host/dc3b3b08-d2bb-46f0-915d-c8d56d0dd2c1/lCHnsbvgB8.lottie` (same URL used in `LoadingSpinner`)
- Size it at ~200×200px with the same orange glow drop-shadow filter used in `loading-spinner.tsx`
- Keep the dark background (#141a23), progressive messaging, and `__dismissShell` logic unchanged

This ensures users see the smooth Lottie basketball animation from the very first moment the app loads, matching what they see on in-app loading states.

