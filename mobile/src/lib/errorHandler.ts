/**
 * Initialize error handling
 * This file should be imported once at app startup
 */

// Helper to detect AbortError (expected when canceling requests)
function isAbortError(error: any): boolean {
  if (!error) return false;
  if (error.name === 'AbortError') return true;
  if (typeof error === 'object' && error.code === 20) return true; // DOMException ABORT_ERR
  const message = typeof error === 'string'
    ? error
    : (error.message || error.reason || '');
  if (typeof message === 'string') {
    if (message.includes('signal is aborted') || message.includes('aborted without reason') || message.includes('The operation was aborted')) {
      return true;
    }
  }
  return false;
}

// Helper to safely extract error message from any object
function extractErrorMessage(error: any): string {
  // Avoid stringifying event objects
  if (error && typeof error === 'object') {
    // Check if it looks like an event object (has isTrusted property)
    if ('isTrusted' in error) {
      console.warn('[ErrorHandler] Caught event object instead of Error:', error);
      return 'A network error occurred. Please check your connection and try again.';
    }

    // Try standard error properties
    if (error.message && typeof error.message === 'string') {
      return error.message;
    }
    if (error.error && typeof error.error === 'string') {
      return error.error;
    }
    if (error.error?.message && typeof error.error.message === 'string') {
      return error.error.message;
    }
    if (error.details && typeof error.details === 'string') {
      return error.details;
    }
    if (error.reason && typeof error.reason === 'string') {
      return error.reason;
    }
  }

  if (typeof error === 'string') {
    // Check if the string looks like a stringified event object
    if (error.includes('isTrusted') || error === '{"isTrusted":true}') {
      return 'A network error occurred. Please check your connection and try again.';
    }
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

// Set up global error handler for web (unhandled promise rejections)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Silently ignore AbortError - expected when canceling requests on unmount
    if (isAbortError(event.reason)) {
      event.preventDefault();
      return;
    }
    const errorMessage = extractErrorMessage(event.reason);
    console.error('Unhandled promise rejection:', errorMessage);
    // Prevent the rejection from being logged twice
    event.preventDefault();
  });
}

// Set up global error handler for React Native (native platforms)
// This uses the global ErrorUtils which React Native provides
declare const global: {
  ErrorUtils?: {
    setGlobalHandler: (handler: (error: any, isFatal?: boolean) => void) => void;
    getGlobalHandler: () => (error: any, isFatal?: boolean) => void;
  };
};

if (typeof global !== 'undefined' && global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler();

  global.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    // Check if this is an event object being treated as an error
    if (error && typeof error === 'object' && 'isTrusted' in error) {
      console.warn('[ErrorHandler] Suppressed event object error:', error);
      // Don't propagate event objects as errors
      return;
    }

    // Silently ignore AbortError - expected when canceling requests on unmount
    if (isAbortError(error)) {
      return;
    }

    // For other errors, log them properly and call original handler
    const errorMessage = extractErrorMessage(error);
    console.error('[ErrorHandler] Global error:', errorMessage);

    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}
