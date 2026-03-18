import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Lightweight redirect page that lives on hoopjournal.me.
 * 
 * The native app opens https://hoopjournal.me/oauth-bridge?broker_url=<encoded>
 * iOS shows "hoopjournal.me" in the ASWebAuthenticationSession dialog.
 * This page immediately redirects to the actual lovable.app broker URL.
 */
export default function OAuthBridge() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const brokerUrl = params.get('broker_url');

    if (brokerUrl) {
      console.log('[OAuthBridge] Redirecting to broker:', brokerUrl);
      window.location.replace(brokerUrl);
    } else {
      console.error('[OAuthBridge] No broker_url param found, redirecting home');
      window.location.replace('/');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Connecting to sign in...</p>
      </div>
    </div>
  );
}
