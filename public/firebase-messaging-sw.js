// Import and configure the Firebase SDK inside the service worker
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Since service worker doesn't have direct access to json configs at run-time, we load or initialize
// using default messaging parameters. The FCM service worker registers successfully to hook push receipts.
// Note: In custom domains, replace these with your actual App credentials inside strings if required.

firebase.initializeApp({
  apiKey: "AIzaSyDummyKeyForServiceWorkerToRegisterSuccessfully",
  authDomain: "mauripay.firebaseapp.com",
  projectId: "mauripay",
  storageBucket: "mauripay.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:dummy"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'تحديث من موري توب';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'تغيرت حالة طلبك الآن',
    icon: '/logo.png', // Fallback to logo
    badge: '/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
