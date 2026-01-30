import { haptic } from 'ios-haptics';

type HapticIntensity = 'light' | 'medium' | 'strong' | 'success' | 'error';

export function useHapticFeedback() {
  const triggerHaptic = (intensity: HapticIntensity = 'medium') => {
    try {
      switch (intensity) {
        case 'light':
          haptic();
          break;
        case 'medium':
          haptic();
          break;
        case 'strong':
        case 'success':
          haptic.confirm(); // Double haptic for positive actions
          break;
        case 'error':
          haptic.error(); // Triple haptic for errors
          break;
        default:
          haptic();
      }
    } catch (e) {
      // Silently fail if haptics not supported
      // This handles older iOS versions and unsupported browsers
    }
  };

  return { triggerHaptic };
}
