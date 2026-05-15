// Firebase Cloud Messaging Service Worker
// This file must be in the public folder and accessible at /firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCW1ki-BZKbV7rBbXzKXuBjuns_fyw6XXU",
  authDomain: "vestry-hub.firebaseapp.com",
  projectId: "vestry-hub",
  storageBucket: "vestry-hub.firebasestorage.app",
  messagingSenderId: "118420456778",
  appId: "1:118420456778:web:51e01b023c8b7362fb6db3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'vestry-notification',
    requireInteraction: payload.data?.priority === 'urgent',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open the app
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});