import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Diagnostic logger for application health
console.log("[Diagnostics] Initializing MauriTop Firebase client...", {
  projectId: firebaseConfig?.projectId || "N/A",
  authDomain: firebaseConfig?.authDomain || "N/A",
  hasApiKey: Boolean(firebaseConfig?.apiKey),
  databaseId: firebaseConfig?.firestoreDatabaseId || "(default)",
  environment: import.meta.env.MODE
});

const app = initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect long polling to avoid 10s backend stream timeout on HTTP proxies
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Connection validation
import { doc, getDocFromServer } from 'firebase/firestore';
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'settings', 'global'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Diagnostics] Firestore connection offline check:', error.message);
    }
  }
}
testConnection();

