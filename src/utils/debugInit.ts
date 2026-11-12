import { auth, db, storage } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export function runHealthCheck() {
  console.group('[Health Check] Starting Startup & Firebase Initialization Diagnostics');
  
  // Step 1: Environment & Config check
  console.log('[Step 1/5] Checking Environment & Firebase Config:', {
    environmentMode: import.meta.env.MODE,
    hasConfig: Boolean(firebaseConfig),
    projectId: firebaseConfig?.projectId || 'Missing',
    authDomain: firebaseConfig?.authDomain || 'Missing',
    hasApiKey: Boolean(firebaseConfig?.apiKey),
    databaseId: firebaseConfig?.firestoreDatabaseId || '(default)',
    appId: firebaseConfig?.appId || 'Missing'
  });

  // Step 2: Firebase Auth check
  try {
    const isAuthLoaded = Boolean(auth);
    const currentUser = auth?.currentUser;
    console.log('[Step 2/5] Firebase Auth SDK status:', {
      initialized: isAuthLoaded,
      authApp: auth?.app?.name || 'Unknown',
      currentUser: currentUser ? currentUser.uid : 'No user logged in'
    });
  } catch (authError) {
    console.error('[Step 2/5] Firebase Auth initialization error:', authError);
  }

  // Step 3: Firebase Firestore check
  try {
    const isDbLoaded = Boolean(db);
    console.log('[Step 3/5] Firebase Firestore status:', {
      initialized: isDbLoaded,
      databaseId: firebaseConfig?.firestoreDatabaseId || '(default)',
      app: db?.app?.name || 'Unknown'
    });
  } catch (dbError) {
    console.error('[Step 3/5] Firebase Firestore initialization error:', dbError);
  }

  // Step 4: Firebase Storage check
  try {
    const isStorageLoaded = Boolean(storage);
    console.log('[Step 4/5] Firebase Storage status:', {
      initialized: isStorageLoaded,
      bucket: storage?.app?.options?.storageBucket || 'Unknown'
    });
  } catch (storageError) {
    console.error('[Step 4/5] Firebase Storage initialization error:', storageError);
  }

  // Step 5: DOM & Browser context check
  if (typeof window !== 'undefined') {
    const rootEl = document.getElementById('root');
    console.log('[Step 5/5] DOM & Mounting Status:', {
      hasWindow: true,
      rootElementFound: Boolean(rootEl),
      readyState: document.readyState,
      onLine: navigator.onLine
    });
  }

  console.groupEnd();
}

