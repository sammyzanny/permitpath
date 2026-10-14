// Minimal stand-in for React's cache() when running server modules under vitest.
export function cache<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}
