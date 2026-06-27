// Turns a caught error into a message safe to show to a kiosk user.
// Only the backend-curated `error.error` string is ever surfaced — raw
// `error.message`/`error.stack` (axios internals, file paths, exception
// text) must never reach the UI, so it's deliberately never read here.
const STACKTRACE_LIKE = /\bat\s+\S+\s*\(|\.(js|ts|jsx|tsx):\d+|node_modules|Error:\s*\n/i;

export function toCitizenMessage(error, fallback) {
  const candidate = error?.error;
  if (typeof candidate === 'string' && candidate.length > 0 && candidate.length <= 200 && !STACKTRACE_LIKE.test(candidate)) {
    return candidate;
  }
  return fallback;
}

export default { toCitizenMessage };
