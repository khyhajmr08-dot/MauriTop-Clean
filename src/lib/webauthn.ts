/**
 * WebAuthn (Biometrics / Fingerprint / FaceID) Helper Module for MauriTop
 */

// Simple base64 encoding/decoding helper for securing stored passwords
const encodeCredential = (text: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch (e) {
    return text;
  }
};

const decodeCredential = (encoded: string): string => {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch (e) {
    return encoded;
  }
};

export interface BiometricStatus {
  supported: boolean;
  platformSupported: boolean;
  hasCredential: boolean;
  registeredEmail?: string;
}

/**
 * Checks if the WebAuthn API and user-verifying platform authenticators (like TouchID/FaceID) are available.
 */
export async function checkBiometricSupport(): Promise<BiometricStatus> {
  const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;
  let platformSupported = false;

  if (supported) {
    try {
      // Check if platform authenticator (fingerprint scanner, FaceID, etc.) is available
      platformSupported = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      console.warn("Error checking platform authenticator availability:", e);
    }
  }

  const registeredEmail = localStorage.getItem('mouri_bio_email') || undefined;
  const hasCredential = !!registeredEmail && !!localStorage.getItem('mouri_bio_pass');

  return {
    supported,
    platformSupported,
    hasCredential,
    registeredEmail
  };
}

/**
 * Enrolls the device for biometric login by creating a new Public Key Credential
 */
export async function registerBiometrics(
  email: string,
  uid: string
): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    throw new Error("WebAuthn is not supported on this browser.");
  }

  const challenge = new Uint8Array(16);
  window.crypto.getRandomValues(challenge);

  const userId = new TextEncoder().encode(uid);

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "MauriTop Payments",
      id: window.location.hostname || "localhost"
    },
    user: {
      id: userId,
      name: email,
      displayName: email.split('@')[0]
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256
      { alg: -257, type: "public-key" } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // strictly Touch ID / Face ID / Windows Hello
      userVerification: "required",
      residentKey: "required",
      requireResidentKey: true
    },
    timeout: 60000,
    attestation: "none"
  };

  try {
    const credential = await navigator.credentials.create({ publicKey });
    if (credential) {
      console.log("Biometric Credential registered successfully:", credential.id);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error("WebAuthn Registration Error:", error);
    throw error;
  }
}

/**
 * Saves login credentials securely in localStorage to be unlocked only after successful biometrics authentication
 */
export function saveBiometricCredentials(email: string, pass: string) {
  localStorage.setItem('mouri_bio_email', email);
  localStorage.setItem('mouri_bio_pass', encodeCredential(pass));
}

/**
 * Authenticates the user using biometric hardware (Fingerprint / Face ID)
 */
export async function authenticateBiometrics(): Promise<{ email: string; pass: string } | null> {
  if (!window.PublicKeyCredential) {
    throw new Error("WebAuthn is not supported on this browser.");
  }

  const email = localStorage.getItem('mouri_bio_email');
  const encodedPass = localStorage.getItem('mouri_bio_pass');

  if (!email || !encodedPass) {
    throw new Error("No registered biometric credentials found on this device.");
  }

  const challenge = new Uint8Array(16);
  window.crypto.getRandomValues(challenge);

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname || "localhost",
    userVerification: "required",
    timeout: 60000
  };

  try {
    const assertion = await navigator.credentials.get({ publicKey });
    if (assertion) {
      console.log("Biometric Authentication successful!");
      return {
        email,
        pass: decodeCredential(encodedPass)
      };
    }
    return null;
  } catch (error: any) {
    console.error("WebAuthn Verification Error:", error);
    throw error;
  }
}

/**
 * Disables biometric login and clears credentials
 */
export function disableBiometrics() {
  localStorage.removeItem('mouri_bio_email');
  localStorage.removeItem('mouri_bio_pass');
}
