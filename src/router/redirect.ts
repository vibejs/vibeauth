/** Local absolute paths only. Reject encoded separators, dot segments, controls and backslashes. */
export function safeReturnURL(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//"))
    return fallback;
  let decoded = value;
  try {
    for (let i = 0; i < 5; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return fallback;
  }
  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(decoded) ||
    /%[0-9a-f]{2}/i.test(decoded)
  )
    return fallback;
  const url = new URL(value, "https://vibeauth.invalid");
  return url.origin === "https://vibeauth.invalid"
    ? url.pathname + url.search + url.hash
    : fallback;
}
