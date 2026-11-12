import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * واجهة حالة اتصال التطبيق بالإنترنت وخوادم Firebase
 */
export interface FirestoreConnectionState {
  // حالة اتصال المتصفح بالشبكة العامة
  isOnline: boolean;
  // حالة اتصال Firestore الحقيقية بالخادم
  isFirestoreConnected: boolean;
  // هل الاتصال مكتمل وسليم بالكامل (إنترنت + خادم)
  isFullyConnected: boolean;
  // سبب الخطأ إن وُجد
  errorMessage: string | null;
  // وقت آخر فحص ناجح
  lastSyncedAt: Date | null;
  // دالة لإعادة المحاولة يدويًا
  retryConnection: () => void;
}

/**
 * خطاف برمجي (Custom Hook) لمراقبة حالة الاتصال الحقيقية بخوادم Firestore
 * يستخدم onSnapshot لاكتشاف أي انقطاع في الاتصال بالخادم فوراً
 * بدلاً من الاعتماد السطحي على navigator.onLine فقط
 */
export function useFirestoreConnection(): FirestoreConnectionState {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true;
  });

  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // مرجع لتتبع وقت أول محاولة للاتصال
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. مراقبة حالة اتصال المتصفح العامة (Network Online/Offline)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // تشغيل فحص اتصال الخادم فور استعادة الشبكة
      setRetryTrigger((prev) => prev + 1);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsFirestoreConnected(false);
      setErrorMessage("لا يوجد اتصال بالشبكة المحلية أو الإنترنت");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 2. مستمع Firestore الحي عبر onSnapshot لمراقبة صحة الاتصال بالخادم الفعلي
  useEffect(() => {
    // إذا كان المتصفح غير متصل أساساً، لا حاجة لفتح استماع إضافي
    if (!isOnline) {
      setIsFirestoreConnected(false);
      return;
    }

    // تعيين مهلة أولية: إذا لم يستجب المستمع خلال 8 ثوانٍ نعتبر الخادم غير متاح
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    
    // نراقب مستند الإعدادات العامة (موجود وخفيف الوزن) مع تمكين تفاصيل الـ metadata
    const settingsDocRef = doc(db, "settings", "global");

    let isSubscribed = true;

    const unsubscribe = onSnapshot(
      settingsDocRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isSubscribed) return;

        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        // إذا كانت البيانات قادمة مباشرة من الخادم (ليست من الكاش المحلي فقط)
        // أو إذا تم التأكيد بنجاح دون أي خطأ
        const fromCache = snapshot.metadata.fromCache;
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;

        // إذا كان المتصفح متصلاً وحصلنا على استجابة
        setIsFirestoreConnected(true);
        setErrorMessage(null);
        setLastSyncedAt(new Date());

        // ملاحظة للمطورين في وضع التطوير
        if (fromCache && hasPendingWrites) {
          console.debug("[useFirestoreConnection] Data synced from cache, pending writes in flight.");
        }
      },
      (error) => {
        if (!isSubscribed) return;
        console.warn("[useFirestoreConnection] Firestore snapshot error:", error.code, error.message);
        
        // اكتشاف حالات عدم إمكانية الوصول إلى الخادم
        if (error.code === "permission-denied") {
          // خطأ الصلاحيات لا يعني انقطاع الخادم
          setIsFirestoreConnected(true);
        } else if (error.code === "unavailable" || error.message.includes("offline")) {
          // إذا كان المتصفح متصلاً، نمنح فرصة للمزامنة التلقائية قبل عرض شريط الخطأ
          if (!connectionTimeoutRef.current) {
            connectionTimeoutRef.current = setTimeout(() => {
              if (isSubscribed) {
                setIsFirestoreConnected(false);
                setErrorMessage("تعذر الوصول إلى خوادم Firebase حالياً (الخدمة غير متاحة)");
              }
            }, 3000);
          }
        } else {
          setIsFirestoreConnected(false);
          setErrorMessage(error.message || "فقدان الاتصال بالخادم");
        }
      }
    );

    return () => {
      isSubscribed = false;
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      unsubscribe();
    };
  }, [isOnline, retryTrigger]);

  const retryConnection = () => {
    setRetryTrigger((prev) => prev + 1);
  };

  const isFullyConnected = isOnline && isFirestoreConnected;

  return {
    isOnline,
    isFirestoreConnected,
    isFullyConnected,
    errorMessage,
    lastSyncedAt,
    retryConnection,
  };
}
