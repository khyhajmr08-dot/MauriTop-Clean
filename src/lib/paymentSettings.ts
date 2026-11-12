import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { cacheService } from "./cache";
import { OFFICIAL_PHONE } from "../constants";

export interface PaymentMethodConfig {
  id: "bankily" | "sadad" | "gaza" | "paypal" | string;
  label: string;
  labelAr: string;
  labelFr: string;
  phone: string;
  accountHolderAr?: string;
  accountHolderFr?: string;
  logoUrl?: string;
  enabled: boolean;
  type?: 'manual' | 'automated';
  integrationStatus?: 'not_configured' | 'unavailable' | 'sandbox_testing' | 'active';
  isCustom?: boolean;
  order?: number;
  unavailableReasonAr?: string;
  unavailableReasonFr?: string;
  descAr?: string;
  descFr?: string;
  instructionsAr?: string;
}

export type PaymentSettingsMap = Record<string, PaymentMethodConfig>;

export const DEFAULT_PAYMENT_CONFIGS: PaymentSettingsMap = {
  bankily: {
    id: "bankily",
    label: "Bankily",
    labelAr: "بنكيلي",
    labelFr: "Bankily",
    phone: OFFICIAL_PHONE,
    accountHolderAr: "",
    accountHolderFr: "",
    enabled: true,
    type: "manual",
    integrationStatus: "active",
    unavailableReasonAr: "غير متوفر حالياً",
    unavailableReasonFr: "Actuellement indisponible",
    descAr: "الدفع الفوري السريع عبر تطبيق بنكيلي",
    descFr: "Transfert instantané via Bankily (BPM)"
  },
  sadad: {
    id: "sadad",
    label: "Sadad",
    labelAr: "سداد",
    labelFr: "Sedad",
    phone: "27329380",
    accountHolderAr: "",
    accountHolderFr: "",
    enabled: true,
    type: "manual",
    integrationStatus: "active",
    unavailableReasonAr: "غير متوفر حالياً",
    unavailableReasonFr: "Actuellement indisponible",
    descAr: "التحويل السريع والمباشر عبر سداد",
    descFr: "Transfert rapide via Sedad (BIM)"
  },
  gaza: {
    id: "gaza",
    label: "GazaPay",
    labelAr: "غزة باي",
    labelFr: "GazaPay",
    phone: "27329380",
    accountHolderAr: "",
    accountHolderFr: "",
    enabled: false,
    type: "manual",
    integrationStatus: "unavailable",
    unavailableReasonAr: "غير متوفر حالياً",
    unavailableReasonFr: "Actuellement indisponible",
    descAr: "الدفع الآمن والموثوق عبر غزة باي / غزة كاش",
    descFr: "Paiement sécurisé via GazaPay"
  },
  paypal: {
    id: "paypal",
    label: "PayPal",
    labelAr: "بايبال (PayPal)",
    labelFr: "PayPal International",
    phone: "",
    accountHolderAr: "",
    accountHolderFr: "",
    enabled: false,
    type: "automated",
    integrationStatus: "not_configured",
    unavailableReasonAr: "غير مهيأ حالياً - بانتظار إعداد مفاتيح API الرسمية",
    unavailableReasonFr: "Actuellement non configuré",
    descAr: "الدفع الدولي الآمن عبر بايبال (غير مهيأ حالياً حتى ربط الحساب الرسمي)",
    descFr: "Paiement international sécurisé via PayPal"
  }
};

const CACHE_KEY = "system_payment_settings";

/**
 * Normalizes payment methods map ensuring all standard keys exist
 */
export function normalizePaymentSettings(raw: any): PaymentSettingsMap {
  const result: PaymentSettingsMap = { ...DEFAULT_PAYMENT_CONFIGS };
  if (!raw || typeof raw !== "object") return result;

  const methods = raw.methods || raw;
  
  for (const key of Object.keys(DEFAULT_PAYMENT_CONFIGS)) {
    if (methods[key]) {
      result[key] = {
        ...DEFAULT_PAYMENT_CONFIGS[key],
        ...methods[key],
        id: key,
        enabled: methods[key].enabled !== false, // default to true if not explicitly false
        phone: methods[key].phone || methods[key].accountNumber || DEFAULT_PAYMENT_CONFIGS[key].phone,
        unavailableReasonAr: methods[key].unavailableReasonAr || "غير متوفر حالياً",
        unavailableReasonFr: methods[key].unavailableReasonFr || "Actuellement indisponible"
      };
    }
  }

  // Also include any extra custom payment methods added in Firestore
  for (const [key, val] of Object.entries(methods)) {
    if (!result[key] && val && typeof val === "object") {
      result[key] = val as PaymentMethodConfig;
    }
  }

  return result;
}

/**
 * Fetch payment settings once with caching
 */
export async function getPaymentSettings(force = false): Promise<PaymentSettingsMap> {
  if (!force) {
    const cached = cacheService.get<PaymentSettingsMap>(CACHE_KEY);
    if (cached) return cached;
  }

  try {
    const snap = await getDoc(doc(db, "settings", "payment_methods"));
    if (snap.exists()) {
      const normalized = normalizePaymentSettings(snap.data());
      cacheService.set(CACHE_KEY, normalized, 1000 * 60 * 5); // 5 mins
      return normalized;
    }
  } catch (err) {
    console.error("Error fetching payment settings:", err);
  }

  return DEFAULT_PAYMENT_CONFIGS;
}

/**
 * Real-time subscription to payment settings
 */
export function subscribePaymentSettings(callback: (settings: PaymentSettingsMap, isFromCache?: boolean) => void): () => void {
  // Call immediately with cached or default
  const cached = cacheService.get<PaymentSettingsMap>(CACHE_KEY);
  if (cached) {
    callback(cached, true);
  } else {
    callback(DEFAULT_PAYMENT_CONFIGS, true);
  }

  return onSnapshot(
    doc(db, "settings", "payment_methods"),
    (snapshot) => {
      const fromCache = Boolean((snapshot as any)?.metadata?.fromCache);
      if (snapshot.exists()) {
        const normalized = normalizePaymentSettings(snapshot.data());
        cacheService.set(CACHE_KEY, normalized, 1000 * 60 * 5);
        callback(normalized, fromCache);
      } else {
        callback(DEFAULT_PAYMENT_CONFIGS, fromCache);
      }
    },
    (error) => {
      console.warn("Payment settings listener warning:", error);
      callback(DEFAULT_PAYMENT_CONFIGS, true);
    }
  );
}

/**
 * Save updated payment settings to Firestore
 */
export async function savePaymentSettings(settings: PaymentSettingsMap): Promise<void> {
  const docRef = doc(db, "settings", "payment_methods");
  await setDoc(docRef, {
    methods: settings,
    updatedAt: serverTimestamp()
  }, { merge: true });

  cacheService.set(CACHE_KEY, settings, 1000 * 60 * 5);
}
