import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import firebaseConfig from "../../firebase-applet-config.json";

// Default public VAPID key (Vite configuration fallback or customizable via settings)
export const DEFAULT_VAPID_KEY = "BGo-u8ZscH_S_wI7F96B6Y8t3S8K6Sg7bL7t37S7P7f6_3b6G6u33S3T7v6y5S8R7W_m9T6g5R4P3S2K1L0w-E";

/**
 * Request notification permissions and register user token
 */
export async function setupFCM(userId: string): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("FCM Messaging is not supported in this browser environment / secure context.");
      return null;
    }

    const messagingResult = getMessaging();
    
    // Request permission from user
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission was not granted:", permission);
      return null;
    }

    // Retrieve FCM Token
    const token = await getToken(messagingResult, {
      vapidKey: DEFAULT_VAPID_KEY
    });

    if (token) {
      // Save Token to user's document in Firestore
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        fcmToken: token,
        // Also save to array of device tokens to support multiple devices
        fcmTokens: arrayUnion(token),
        notificationsEnabled: true,
        updatedAt: new Date()
      });
      
      console.log("FCM Token registered and saved successfully: ", token);
      return token;
    } else {
      console.warn("No FCM token returned from Firebase.");
      return null;
    }
  } catch (error) {
    console.error("Error setting up Firebase Cloud Messaging:", error);
    return null;
  }
}

/**
 * Setup foreground message handler
 */
export async function listenForForegroundMessages(onMsg: (payload: any) => void) {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const messagingResult = getMessaging();
    return onMessage(messagingResult, (payload) => {
      console.log("Foreground FCM message received:", payload);
      onMsg(payload);
    });
  } catch (err) {
    console.warn("FCM Foreground listener setup failed:", err);
    return null;
  }
}
