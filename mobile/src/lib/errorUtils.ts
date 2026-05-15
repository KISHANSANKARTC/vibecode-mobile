/**
 * Error utility functions for consistent error message extraction
 * Use these instead of String(err) or error.toString() which can stringify
 * event objects as {"isTrusted":true}
 */

/**
 * Safely extract a readable error message from any object type
 * Handles Error objects, strings, plain objects, and event objects
 */
export const extractErrorMessage = (error: any): string => {
  // Handle strings directly
  if (typeof error === 'string') {
    // Check if the string looks like a stringified event object
    if (error.includes('isTrusted') || error === '{"isTrusted":true}') {
      return 'A network error occurred. Please check your connection and try again.';
    }
    return error;
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Handle plain objects
  if (error && typeof error === 'object') {
    // Detect and prevent stringifying event objects
    if ('isTrusted' in error) {
      console.warn('[ErrorUtils] Caught event object instead of Error:', error);
      return 'A network error occurred. Please check your connection and try again.';
    }

    // Try standard error property names
    if (error.message && typeof error.message === 'string') {
      return error.message;
    }

    // Try nested error object
    if (error.error && typeof error.error === 'string') {
      return error.error;
    }

    if (error.error?.message && typeof error.error.message === 'string') {
      return error.error.message;
    }

    // Try other common properties
    if (error.details && typeof error.details === 'string') {
      return error.details;
    }

    if (error.reason && typeof error.reason === 'string') {
      return error.reason;
    }

    if (error.statusText && typeof error.statusText === 'string') {
      return error.statusText;
    }

    if (error.msg && typeof error.msg === 'string') {
      return error.msg;
    }

    if (error.error_description && typeof error.error_description === 'string') {
      return error.error_description;
    }
  }

  // Fallback for truly unknown types
  return 'An unexpected error occurred';
};

/**
 * Format error message for display in UI
 * Adds context if needed
 */
export const formatErrorForDisplay = (
  error: any,
  context?: string
): string => {
  const message = extractErrorMessage(error);
  return context ? `${context}: ${message}` : message;
};
