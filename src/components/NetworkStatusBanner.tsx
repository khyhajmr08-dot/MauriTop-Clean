import React, { useState, useEffect, useRef } from "react";
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle2, ServerCrash } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import { useFirestoreConnection } from "../hooks/useFirestoreConnection";

/**
 * شريط حالة الاتصال الذكي (NetworkStatusBanner)
 * يدمج بين فحص اتصال المتصفح (navigator.onLine) والاستماع المباشر لـ Firestore عبر onSnapshot
 * لتنبيه المستخدم فوراً في حال انقطاع الشبكة أو تعذر الوصول إلى خوادم Firebase
 */
export function NetworkStatusBanner() {
  const { isOnline, isFirestoreConnected, isFullyConnected, retryConnection } = useFirestoreConnection();
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const { language, isRtl } = useLanguage();
  const wasDisconnectedRef = useRef(false);

  // مراقبة عودة الاتصال لإظهار شريط النجاح المؤقت
  useEffect(() => {
    if (!isFullyConnected) {
      wasDisconnectedRef.current = true;
    } else if (wasDisconnectedRef.current && isFullyConnected) {
      // تمت استعادة الاتصال بعد انقطاع
      setShowRestoredNotice(true);
      wasDisconnectedRef.current = false;
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isFullyConnected]);

  const handleManualRetry = () => {
    retryConnection();
    if (typeof window !== "undefined") {
      // إعادة فحص سريعة دون إعادة تحميل الصفحة بالكامل للحفاظ على تجربة المستخدم
      if (navigator.onLine) {
        retryConnection();
      } else {
        window.location.reload();
      }
    }
  };

  const isAr = language === "ar";

  // موضع محجوز لنظام التنبيهات الإعلانية أو الرسائل الإدارية لاحقاً (Placeholder: Monetization & AdMob alerts)
  // [ADS_PLACEHOLDER]: Reserved for offline-banner sponsored offline tips or monetization fallback

  return (
    <AnimatePresence>
      {!isFullyConnected ? (
        <motion.div
          key="offline-banner"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-0 inset-x-0 z-[100] bg-rose-600/95 backdrop-blur-md text-white px-3 py-2 sm:py-2.5 shadow-2xl border-b border-rose-400/40"
          dir={isRtl ? "rtl" : "ltr"}
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center shrink-0 animate-pulse">
                {!isOnline ? (
                  <WifiOff className="w-4 h-4 text-white" />
                ) : (
                  <ServerCrash className="w-4 h-4 text-amber-200" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-black leading-tight text-white flex items-center gap-1.5 flex-wrap">
                  <span>
                    {!isOnline
                      ? isAr
                        ? "لا يوجد اتصال بالإنترنت"
                        : "Connexion Internet interrompue"
                      : isAr
                        ? "تعذر الاتصال بخوادم Firebase"
                        : "Connexion aux serveurs Firebase interrompue"}
                  </span>
                  <span className="text-[10px] font-bold bg-black/25 px-2 py-0.5 rounded-full border border-white/20">
                    {!isOnline
                      ? isAr
                        ? "وضع عدم الاتصال"
                        : "Mode Hors-ligne"
                      : isAr
                        ? "انقطاع الخادم"
                        : "Serveur Indisponible"}
                  </span>
                </p>
                <p className="text-[10px] sm:text-xs text-rose-100 font-medium truncate mt-0.5">
                  {!isOnline
                    ? isAr
                      ? "البيانات المعروضة مخزنة محلياً مؤقتاً، ولا يمكن إرسال طلبات جديدة حتى عودة الشبكة."
                      : "Données en cache local. Les commandes reprendront dès le retour du réseau."
                    : isAr
                      ? "جاري إعادة المحاولة للاتصال بقاعدة البيانات تلقائياً، يمكنك الضغط على إعادة المحاولة."
                      : "Tentative de reconnexion automatique à la base de données..."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualRetry}
              className="px-3 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-black text-xs shrink-0 flex items-center gap-1.5 transition-transform active:scale-95 shadow-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isAr ? "إعادة المحاولة" : "Réessayer"}</span>
            </button>
          </div>
        </motion.div>
      ) : showRestoredNotice ? (
        <motion.div
          key="restored-banner"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 inset-x-0 z-[100] bg-emerald-600/95 backdrop-blur-md text-white px-3 py-2 shadow-xl border-b border-emerald-400/30"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-black">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>
              {isAr
                ? "تمت استعادة الاتصال بالخادم والإنترنت ومزامنة البيانات بنجاح"
                : "Connexion aux serveurs rétablie avec succès"}
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default NetworkStatusBanner;
