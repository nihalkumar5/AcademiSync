/**
 * Centralized error sanitization and logging utility
 * Ensures zero information leakage (stack traces, internal file paths, raw database/AI errors)
 * while maintaining detailed server-side logs for debugging.
 */

export function logServerError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  if (error instanceof Error) {
    console.error(`[${timestamp}] [ERROR] [${context}]:`, {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
  } else {
    console.error(`[${timestamp}] [ERROR] [${context}]:`, error);
  }
}

/**
 * Returns a user-friendly sanitized error message safe for client display.
 * Strips technical stack traces, internal paths, and translates technical error codes.
 */
export function getSanitizedErrorMessage(
  error: unknown,
  defaultFallback = 'An unexpected error occurred. Please try again later.'
): string {
  if (!error) return defaultFallback;

  let rawMessage = '';
  let errorCode = '';

  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error && typeof error === 'object') {
    const errObj = error as any;
    rawMessage = errObj.message || '';
    errorCode = errObj.code || '';
  }

  // Handle known friendly codes & common auth errors
  if (errorCode) {
    switch (errorCode) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please check your credentials.';
      case 'auth/email-already-in-use':
        return 'This email address is already registered. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled. Please try again.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connection.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'permission-denied':
        return 'You do not have permission to perform this action.';
      case 'unavailable':
        return 'Service is temporarily unavailable. Please check back shortly.';
    }
  }

  // Check if raw message contains common patterns that should be sanitized
  if (rawMessage) {
    const lower = rawMessage.toLowerCase();

    // Prevent leaking internal filesystem paths or node_modules
    if (
      lower.includes('/users/') ||
      lower.includes('/var/') ||
      lower.includes('/app/') ||
      lower.includes('node_modules') ||
      lower.includes('.tsx') ||
      lower.includes('.ts:') ||
      lower.includes('.js:')
    ) {
      return defaultFallback;
    }

    // Prevent leaking raw database/driver errors
    if (
      lower.includes('firestore') ||
      lower.includes('firebaseerror') ||
      lower.includes('econnrefused') ||
      lower.includes('etimedout') ||
      lower.includes('sql') ||
      lower.includes('mongo')
    ) {
      return 'Database operation failed. Please try again later.';
    }

    // Prevent leaking AI API internal keys or raw JSON parse dumps
    if (
      lower.includes('generativeai') ||
      lower.includes('gemini') ||
      lower.includes('api_key') ||
      lower.includes('invalid json') ||
      lower.includes('unexpected token')
    ) {
      return 'Failed to analyze document. Please ensure your upload is clear and try again.';
    }

    // Common human-readable error messages can pass through if clean
    if (
      rawMessage.length < 120 &&
      !rawMessage.includes('{') &&
      !rawMessage.includes('}') &&
      !rawMessage.includes('at ')
    ) {
      return rawMessage;
    }
  }

  return defaultFallback;
}
