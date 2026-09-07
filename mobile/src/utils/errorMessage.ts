/**
 * User-Friendly Error Message Sanitizer
 *
 * Ensures NO technical error logs, stack traces, JSON dumps, or internal
 * exception details are ever shown to the user in the UI.
 * Converts any technical error into simple, courteous, actionable language.
 */

export function getFriendlyErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;

  let rawMessage = '';
  if (typeof err === 'string') {
    rawMessage = err;
  } else if (err instanceof Error) {
    rawMessage = err.message || '';
  } else if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, any>;
    rawMessage = obj.message || obj.error || obj.detail || '';
  }

  const msg = rawMessage.trim();
  if (!msg) return fallback;

  // Technical traces, stacks, or JSON dumps detection
  const isTechnicalDump =
    msg.includes('at ') ||
    msg.includes('TypeError') ||
    msg.includes('SyntaxError') ||
    msg.includes('ReferenceError') ||
    msg.includes('<!DOCTYPE') ||
    msg.includes('<html') ||
    msg.includes('SQLITE_') ||
    msg.includes('AxiosError') ||
    msg.includes('JSON') ||
    msg.startsWith('{') ||
    msg.length > 200;

  if (isTechnicalDump) {
    return fallback;
  }

  const lower = msg.toLowerCase();

  // Network / Connection
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('econnrefused') ||
    lower.includes('timeout') ||
    lower.includes('offline') ||
    lower.includes('internet')
  ) {
    return 'Unable to reach the server. Please check your internet connection.';
  }

  // Authentication / Authorization
  if (
    lower.includes('unauthorized') ||
    lower.includes('invalid credentials') ||
    lower.includes('password') ||
    lower.includes('user not found') ||
    lower.includes('token expired') ||
    lower.includes('session expired')
  ) {
    return 'Incorrect User ID or Password. Please try again.';
  }

  // Permissions
  if (lower.includes('permission') || lower.includes('denied') || lower.includes('access')) {
    return 'Permission required to proceed. Please grant access in your phone settings.';
  }

  // Already collected / conflict
  if (lower.includes('already collected') || lower.includes('conflict') || lower.includes('409')) {
    return 'This household has already been recorded today.';
  }

  // Subscription
  if (lower.includes('subscription')) {
    return 'Your village subscription has expired. Please contact administration.';
  }

  // If the message is already short, polite, and doesn't look technical, use it
  if (/^[A-Z][a-zA-Z0-9\s.,!?:'-]{3,120}$/.test(msg)) {
    return msg;
  }

  return fallback;
}
