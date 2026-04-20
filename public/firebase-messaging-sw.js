// Firebase Messaging Service Worker
// Handles background push notifications when the browser/app is not in focus.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCW1ki-BZKbV7rBbXzKXuBjuns_fyw6XXU",
  authDomain: "vestry-hub.firebaseapp.com",
  projectId: "vestry-hub",
  storageBucket: "vestry-hub.firebasestorage.app",
  messagingSenderId: "118420456778",
  appId: "1:118420456778:web:51e01b023c8b7362fb6db3",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Vestry Hub";
  const body  = payload.notification?.body  ?? "";
  const icon  = "/favicon.ico";

  self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    data: payload.data ?? {},
    requireInteraction: payload.data?.priority === "urgent",
  });
});

// Handle notification click — open or focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("/");
    })
  );
});
