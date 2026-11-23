/**
 * macOS overlay titlebar vs the standard titlebar used on Windows and Linux.
 * User-agent is available synchronously in both WKWebView and WebView2, so the
 * first paint already has the correct chrome (no traffic-light gap on Windows).
 */
export function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData;
  if (uaData?.platform && /macOS/i.test(uaData.platform)) return true;
  return /Macintosh|Mac OS X/.test(navigator.userAgent ?? "");
}

/** Monaco draws on canvas and does not resolve CSS variables in fontFamily. */
export function monoFontFamily(theme: "dark" | "editorial"): string {
  return theme === "editorial"
    ? '"IBM Plex Mono", ui-monospace, Menlo, monospace'
    : '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';
}
