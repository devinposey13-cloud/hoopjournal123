/**
 * OAuth Error Utility
 * Parses, categorizes, and logs OAuth errors with user-friendly messages
 */

export type OAuthErrorType = 
  | 'popup_blocked'
  | 'network_error'
  | 'cancelled'
  | 'invalid_credentials'
  | 'session_expired'
  | 'access_denied'
  | 'unknown';

export interface ParsedOAuthError {
  type: OAuthErrorType;
  userMessage: string;
  userHint?: string;
  errorCode: string;
  rawError: unknown;
}

/**
 * Error patterns to match against error messages
 */
const ERROR_PATTERNS: Array<{ pattern: RegExp | string; type: OAuthErrorType }> = [
  { pattern: /popup.*block/i, type: 'popup_blocked' },
  { pattern: /popup.*closed/i, type: 'cancelled' },
  { pattern: /user.*cancel/i, type: 'cancelled' },
  { pattern: /user.*denied/i, type: 'cancelled' },
  { pattern: /access_denied/i, type: 'access_denied' },
  { pattern: /network/i, type: 'network_error' },
  { pattern: /fetch/i, type: 'network_error' },
  { pattern: /timeout/i, type: 'network_error' },
  { pattern: /offline/i, type: 'network_error' },
  { pattern: /invalid.*token/i, type: 'session_expired' },
  { pattern: /expired/i, type: 'session_expired' },
  { pattern: /refresh.*token/i, type: 'session_expired' },
  { pattern: /invalid.*credential/i, type: 'invalid_credentials' },
  { pattern: /unauthorized/i, type: 'invalid_credentials' },
  { pattern: /403/i, type: 'invalid_credentials' },
  { pattern: /401/i, type: 'invalid_credentials' },
];

/**
 * User-friendly messages for each error type
 */
const USER_MESSAGES: Record<OAuthErrorType, { message: string; hint?: string }> = {
  popup_blocked: {
    message: 'Popup was blocked',
    hint: 'Please allow popups for Hoop Journal and try again.',
  },
  network_error: {
    message: 'Connection failed',
    hint: 'Check your internet connection and try again.',
  },
  cancelled: {
    message: 'Sign-in was cancelled',
    hint: 'Click the button again to try signing in.',
  },
  access_denied: {
    message: 'Access was denied',
    hint: 'You may have declined permissions. Please try again and accept the permissions.',
  },
  invalid_credentials: {
    message: 'Could not verify your account',
    hint: 'Please try again or use a different sign-in method.',
  },
  session_expired: {
    message: 'Your session expired',
    hint: 'Please sign in again to continue.',
  },
  unknown: {
    message: 'Sign-in failed',
    hint: 'Try again or use email login instead.',
  },
};

/**
 * Generate a unique error code for support correlation
 */
function generateErrorCode(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return `OA-${timestamp}`;
}

/**
 * Extract error message from various error formats
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.error_description === 'string') return obj.error_description;
    if (typeof obj.error === 'object' && obj.error) {
      const innerError = obj.error as Record<string, unknown>;
      if (typeof innerError.message === 'string') return innerError.message;
    }
  }
  return 'Unknown error';
}

/**
 * Detect error type from error message
 */
function detectErrorType(errorMessage: string): OAuthErrorType {
  for (const { pattern, type } of ERROR_PATTERNS) {
    if (typeof pattern === 'string') {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return type;
      }
    } else if (pattern.test(errorMessage)) {
      return type;
    }
  }
  return 'unknown';
}

/**
 * Parse an OAuth error and return structured information
 */
export function parseOAuthError(error: unknown): ParsedOAuthError {
  const errorMessage = extractErrorMessage(error);
  const errorType = detectErrorType(errorMessage);
  const userMessageInfo = USER_MESSAGES[errorType];
  const errorCode = generateErrorCode();

  return {
    type: errorType,
    userMessage: userMessageInfo.message,
    userHint: userMessageInfo.hint,
    errorCode,
    rawError: error,
  };
}

/**
 * Log OAuth initiation for debugging
 */
export function logOAuthInit(provider: 'google' | 'apple', redirectUri: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[OAuth] Initiating sign-in with ${provider} at ${timestamp}`);
  console.log(`[OAuth] Redirect URI: ${redirectUri}`);
  console.log(`[OAuth] User Agent: ${navigator.userAgent}`);
}

/**
 * Log detailed OAuth error for debugging
 */
export function logOAuthError(
  provider: 'google' | 'apple',
  parsedError: ParsedOAuthError
): void {
  const timestamp = new Date().toISOString();
  
  console.error(`[OAuth Error] Provider: ${provider}`);
  console.error(`[OAuth Error] Type: ${parsedError.type}`);
  console.error(`[OAuth Error] Error Code: ${parsedError.errorCode}`);
  console.error(`[OAuth Error] User Message: ${parsedError.userMessage}`);
  console.error(`[OAuth Error] Raw Error:`, parsedError.rawError);
  console.error(`[OAuth Error] User Agent: ${navigator.userAgent}`);
  console.error(`[OAuth Error] Timestamp: ${timestamp}`);
  console.error(`[OAuth Error] URL: ${window.location.href}`);
}

/**
 * Log OAuth success for debugging
 */
export function logOAuthSuccess(provider: 'google' | 'apple'): void {
  const timestamp = new Date().toISOString();
  console.log(`[OAuth] Sign-in successful with ${provider} at ${timestamp}`);
}

/**
 * Check URL for OAuth error parameters (callback errors)
 * Returns parsed error if found, null otherwise
 */
export function checkUrlForOAuthError(): ParsedOAuthError | null {
  const url = new URL(window.location.href);
  
  // Check query parameters
  const queryError = url.searchParams.get('error');
  const queryErrorDesc = url.searchParams.get('error_description');
  
  // Check hash parameters
  const hashParams = new URLSearchParams(url.hash.slice(1));
  const hashError = hashParams.get('error');
  const hashErrorDesc = hashParams.get('error_description');
  
  const error = queryError || hashError;
  const errorDescription = queryErrorDesc || hashErrorDesc;
  
  if (error) {
    console.error(`[OAuth Callback Error] Error in URL: ${error}`);
    console.error(`[OAuth Callback Error] Description: ${errorDescription || 'No description'}`);
    console.error(`[OAuth Callback Error] Full URL: ${window.location.href}`);
    
    // Create a synthetic error to parse
    const syntheticError = new Error(errorDescription || error);
    const parsed = parseOAuthError(syntheticError);
    
    // Clean up URL
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    window.history.replaceState({}, '', url.toString());
    
    return parsed;
  }
  
  return null;
}

/**
 * Format error message for toast display
 * Returns a string with message and hint
 */
export function formatErrorForToast(parsedError: ParsedOAuthError): string {
  if (parsedError.userHint) {
    return `${parsedError.userMessage}. ${parsedError.userHint}`;
  }
  return parsedError.userMessage;
}

/**
 * Format error message with error code for support
 */
export function formatErrorWithCode(parsedError: ParsedOAuthError): string {
  const base = formatErrorForToast(parsedError);
  if (parsedError.type === 'unknown') {
    return `${base} (Error code: ${parsedError.errorCode})`;
  }
  return base;
}
