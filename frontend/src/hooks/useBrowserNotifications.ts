import { useEffect, useCallback } from "react";

export function useBrowserNotifications() {
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;

    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (Notification.permission === "granted") {
        new Notification(title, {
          icon: "/icon.png",
          badge: "/icon.png",
          ...options,
        });
      }
    },
    []
  );

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      // Don't auto-request, let user trigger it
    }
  }, []);

  return { requestPermission, notify, supported: "Notification" in window };
}
