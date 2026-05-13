/**
 * Tiny haptic helper — uses the Vibration API on Android/PWA.
 * iOS Safari ignores it silently, which is the desired no-op.
 */
export const haptic = (style: 'light' | 'medium' | 'success' = 'light') => {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    if (style === 'light') navigator.vibrate(8);
    else if (style === 'medium') navigator.vibrate(14);
    else navigator.vibrate([6, 30, 18]);
  } catch {
    /* ignore */
  }
};
