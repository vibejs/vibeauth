// oxlint-disable no-control-regex -- Redirect validation must reject encoded control characters.
/** Local absolute paths only. Reject ambiguous encoding, dot segments, controls and backslashes. */
export function safeReturnURL(value: unknown, fallback = '/'): string {
  return validate(value) ?? validate(fallback) ?? '/';
}

function validate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  let decoded = value;
  try {
    for (let i = 0; i < 5; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }
  if (
    decoded.startsWith('//') ||
    /[\\\u0000-\u0020\u007f]/.test(decoded) ||
    /%[0-9a-f]{2}/i.test(decoded)
  )
    return null;
  if (
    decoded
      .split(/[?#]/)[0]
      .split('/')
      .some((part) => part === '.' || part === '..')
  )
    return null;
  const url = new URL(value, 'https://vibeauth.invalid');
  return url.pathname + url.search + url.hash;
}
