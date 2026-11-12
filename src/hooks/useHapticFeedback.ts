import { useCallback } from "react";

/**
 * A custom hook to trigger haptic feedback on mobile devices using the browser's Vibration API.
 */
export function useHapticFeedback() {
  const triggerHaptic = useCallback((type: "light" | "medium" | "heavy" | "success" | "warning" = "light") => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        switch (type) {
          case "light":
            navigator.vibrate(12);
            break;
          case "medium":
            navigator.vibrate(24);
            break;
          case "heavy":
            navigator.vibrate(45);
            break;
          case "success":
            navigator.vibrate([15, 40, 15]);
            break;
          case "warning":
            navigator.vibrate([40, 50, 40]);
            break;
          default:
            navigator.vibrate(12);
        }
      } catch (error) {
        // Suppress browser security or restriction warnings
        console.debug("Vibration API is not permitted or failed:", error);
      }
    }
  }, []);

  return triggerHaptic;
}
