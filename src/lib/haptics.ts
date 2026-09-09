import { theme } from "@/config/theme";

/**
 * Fire a short vibration on contact.
 *
 * Android Chrome only. iOS Safari implements no Web Vibration API at all, so
 * this is a deliberate no-op there rather than a bug -- there is no reliable
 * web-platform workaround, and faking one costs more than it returns.
 */
export function triggerHaptic(): void {
  if (!theme.haptics.enabled) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;

  try {
    navigator.vibrate(theme.haptics.pattern);
  } catch {
    // Some browsers throw when vibration is blocked by user settings.
  }
}
