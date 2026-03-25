import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Fast OAuth bridge redirect — fires before React boots so the system browser
// shows hoopjournal.me in the iOS dialog, then immediately navigates to the
// lovable.app broker without waiting for the full SPA to hydrate.
if (window.location.pathname === '/oauth-bridge') {
  const params = new URLSearchParams(window.location.search);
  const brokerUrl = params.get('broker_url');
  if (brokerUrl) {
    console.log('[OAuthBridge] Fast redirect to broker:', brokerUrl);
    window.location.replace(brokerUrl);
    // Stop execution — don't mount React
  } else {
    window.location.replace('/');
  }
} else {
  // Remove pre-hydration shell once React mounts
  const shell = document.getElementById('prehydration-shell');
  if (shell) shell.remove();
  createRoot(document.getElementById("root")!).render(<App />);
}
