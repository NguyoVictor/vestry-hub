import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCW1ki-BZKbV7rBbXzKXuBjuns_fyw6XXU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "vestry-hub.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "vestry-hub",
  storageBucket: "vestry-hub.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "118420456778",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:118420456778:web:51e01b023c8b7362fb6db3",
};

// Initialise only once (Vite HMR can re-run this module)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messaging: Messaging | null = null;
try {
  // Messaging is only available in secure contexts (HTTPS / localhost)
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    messaging = getMessaging(app);
  }
} catch {
  // Silently fail in environments where messaging isn't supported
}

export { app, messaging };

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "BI6Ig92jzwqoyHfF0ovU-O7C2CofynlQSR5AsQ6jVnET4ZdfkPh8OlbwdLjyUu2_KRYG3dQdroZPs6PB8GwuUrU";

/**
 * Request notification permission and return the FCM token.
 * Returns null if permission is denied or messaging is unavailable.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    // Register the service worker first
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Listen for foreground messages (app is open and focused).
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
