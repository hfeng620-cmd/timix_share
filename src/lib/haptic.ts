/**
 * Lightweight haptic feedback utility.
 * Uses navigator.vibrate() on supported devices (Android Chrome, etc.)
 * iOS Safari does not support the Vibration API — calls are silently ignored.
 */
export function haptic(style: "light" | "medium" | "heavy" = "light") {
  if (typeof navigator === "undefined") return;
  try {
    if (navigator.vibrate) {
      const ms = style === "light" ? 5 : style === "medium" ? 10 : 20;
      navigator.vibrate(ms);
    }
  } catch {
    // Silently ignore
  }
}

/** Double-tap haptic pattern (e.g., for like/favorite actions) */
export function hapticDouble() {
  if (typeof navigator === "undefined") return;
  try {
    if (navigator.vibrate) {
      navigator.vibrate([5, 30, 5]);
    }
  } catch {}
}

/** Success haptic pattern (e.g., form submission) */
export function hapticSuccess() {
  if (typeof navigator === "undefined") return;
  try {
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  } catch {}
}
