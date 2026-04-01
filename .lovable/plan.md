

## Fix Android Deep Link Return from native-callback.html

### Problem Diagnosis
The `native-callback.html` page loads successfully (Supabase redirects there correctly), but `window.location.replace('hoopjournal://oauth/auth/callback?...')` doesn't trigger the app to reopen. Two issues need fixing:

### Issue 1: Deep Link Path Mismatch
Per Despia documentation, the deep link format should be:
```text
{scheme}://oauth/{path}?params
```
Despia strips the `oauth/` prefix and navigates the WebView to `/{path}?params`.

Current code uses:
```text
hoopjournal://oauth/auth/callback?access_token=xxx
→ Despia navigates WebView to /auth/callback?access_token=xxx
```

This is actually correct for your route structure. However, the OAuthCallback page at `/auth/callback` needs to handle tokens arriving as **query parameters** (from the deep link) in addition to hash fragments (from web flow). The pre-capture code already does this, so this path should work.

### Issue 2: Verify Despia Deeplink Scheme Configuration
The most likely cause is that the `hoopjournal` deep link scheme is not registered in **Despia > Publish > Deeplink**. Without this, Chrome Custom Tabs won't intercept the `hoopjournal://` URL and the redirect silently fails.

**Manual step**: In Despia Editor, go to **Publish > Deeplink** and confirm the scheme is set to `hoopjournal`. This is what tells the Android app to claim `hoopjournal://` URLs.

### Issue 3: Add Debug Logging to native-callback.html
To diagnose exactly what's happening, we should add visible debug output so you can see on the Android screen whether tokens were received and what deep link URL was constructed.

### Plan

**1. Update `public/native-callback.html` with debug visibility**
- Show a visible status message on screen: what tokens were found, what deep link URL is being fired
- Add a manual "Open App" button as fallback (tapping it fires the same deep link via an `<a>` tag with the scheme URL — this sometimes works when `window.location` doesn't in Chrome Custom Tabs)
- Add an Android-specific workaround: use an `<a href="hoopjournal://...">` link + click simulation, which Chrome Custom Tabs handles more reliably than `window.location.replace`
- Keep the existing auto-redirect as primary attempt

**2. No other file changes needed**
The `AuthForm.tsx` and `authConfig.ts` are correct. The issue is in how Chrome Custom Tabs handles the scheme redirect.

### Key Code Change (native-callback.html)
```html
<script>
  (function () {
    var SCHEME = 'hoopjournal';
    var CALLBACK_PATH = 'oauth/auth/callback';

    var raw = window.location.hash
      ? window.location.hash.substring(1)
      : window.location.search.substring(1);

    var params = new URLSearchParams(raw);
    var forward = new URLSearchParams();

    ['access_token', 'refresh_token', 'expires_in', 'token_type', 'type'].forEach(function (k) {
      var v = params.get(k);
      if (v) forward.set(k, v);
    });
    ['error', 'error_description', 'error_code'].forEach(function (k) {
      var v = params.get(k);
      if (v) forward.set(k, v);
    });

    var query = forward.toString();
    var deepLink = SCHEME + '://' + CALLBACK_PATH + (query ? '?' + query : '');

    // Debug: show what's happening on screen
    var status = document.getElementById('status');
    status.textContent = 'Tokens found: ' + (forward.has('access_token') ? 'YES' : 'NO');

    // Create a clickable link (Chrome Custom Tabs handles <a> taps more reliably)
    var link = document.createElement('a');
    link.id = 'deeplink';
    link.href = deepLink;
    link.style.display = 'none';
    document.body.appendChild(link);

    // Try programmatic click first (works in Chrome Custom Tabs)
    try { link.click(); } catch (e) {}

    // Fallback: window.location
    setTimeout(function () {
      window.location.href = deepLink;
    }, 500);

    // Last resort: show manual button
    setTimeout(function () {
      var btn = document.getElementById('manual-btn');
      btn.href = deepLink;
      btn.style.display = 'inline-block';
      document.getElementById('fallback-msg').style.display = 'block';
    }, 3000);
  })();
</script>
```

Add a visible manual fallback button in the HTML body for cases where auto-redirect fails.

### Manual Steps Required
1. **Verify Despia deeplink scheme**: Go to **Despia > Publish > Deeplink** and confirm `hoopjournal` is set as your app's scheme
2. **Rebuild the Despia app** after confirming the scheme (deep link scheme changes require a new build)
3. **Test again** — the debug output on the native-callback page will now show exactly what's happening

### Files Changed
- `public/native-callback.html` — add debug output, `<a>` click workaround, manual fallback button

