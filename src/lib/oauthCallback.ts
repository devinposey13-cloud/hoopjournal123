import { NATIVE_URL_SCHEME, APP_DOMAIN } from '@/lib/authConfig';

// Re-export for backward compatibility
export { NATIVE_URL_SCHEME };

type NativeReturnParams = {
  code?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  error?: string | null;
  errorDescription?: string | null;
};

type SystemBrowserReturnParams = {
  hostname: string;
  native: boolean;
  userAgent: string;
};

export function isMobileSystemBrowserOAuthReturn({
  hostname,
  native,
  userAgent,
}: SystemBrowserReturnParams): boolean {
  return !native && /iPhone|iPad|iPod|Android/i.test(userAgent) && hostname.includes('hoopjournal.me');
}

export function buildNativeOAuthReturnUrl({
  code,
  accessToken,
  refreshToken,
  error,
  errorDescription,
}: NativeReturnParams): string {
  const params = new URLSearchParams();

  if (code) params.set('code', code);
  if (accessToken) params.set('access_token', accessToken);
  if (refreshToken) params.set('refresh_token', refreshToken);
  if (error) params.set('error', error);
  if (errorDescription) params.set('error_description', errorDescription);

  const query = params.toString();
  return query
    ? `${NATIVE_URL_SCHEME}://oauth/auth/callback?${query}`
    : `${NATIVE_URL_SCHEME}://oauth/auth/callback`;
}
