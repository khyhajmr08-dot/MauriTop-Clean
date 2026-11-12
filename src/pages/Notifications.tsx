import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, where, doc, updateDoc, writeBatch, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Gift, 
  ShieldCheck, 
  MessageSquare, 
  Gamepad2, 
  X, 
  Inbox, 
  CheckCheck,
  Volume2,
  VolumeX
} from "lucide-react";
import { isNotificationSoundEnabled, setNotificationSoundEnabled, playNotificationChime } from "../lib/notificationSound";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { handleFirestoreError, OperationType, cn } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { NotificationSkeleton } from "../components/Skeleton";

export default function Notifications() {
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'orders' | 'security' | 'general'>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isNotificationSoundEnabled());
  const { language, isRtl } = useLanguage();

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() as any }));
        // Sort on client to avoid requiring composite indexes
        docs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
          return timeB - timeA;
        });
        setNotifications(docs);
        setLoading(false);
      },
      (error) => {
        console.warn("Notifications subscription error:", error);
        handleFirestoreError(error, OperationType.LIST, "notifications");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;

    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        batch.update(doc(db, "notifications", n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "notifications/bulk-read");
    }
  };

  // Human-friendly localized relative time formatter
  const formatRelativeTime = (seconds: number) => {
    const diff = Math.floor(Date.now() / 1000 - seconds);
    const isAr = language === "ar";
    
    if (diff < 60) return isAr ? "الآن" : "À l'instant";
    
    const mins = Math.floor(diff / 60);
    if (mins < 60) {
      if (mins === 1) return isAr ? "منذ دقيقة" : "Il y a 1 min";
      if (mins === 2) return isAr ? "منذ دقيقتين" : "Il y a 2 min";
      if (mins >= 3 && mins <= 10) return isAr ? `منذ ${mins} دقائق` : `Il y a ${mins} min`;
      return isAr ? `منذ ${mins} دقيقة` : `Il y a ${mins} min`;
    }
    
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      if (hours === 1) return isAr ? "منذ ساعة" : "Il y a 1 h";
      if (hours === 2) return isAr ? "منذ ساعتين" : "Il y a 2 h";
      if (hours >= 3 && hours <= 10) return isAr ? `منذ ${hours} ساعات` : `Il y a ${hours} h`;
      return isAr ? `منذ ${hours} ساعة` : `Il y a ${hours} h`;
    }
    
    const days = Math.floor(hours / 24);
    if (days === 1) return isAr ? "أمس" : "Hier";
    if (days === 2) return isAr ? "قبل يومين" : "Il y a 2 jours";
    if (days < 7) return isAr ? `منذ ${days} أيام` : `Il y a ${days} jours`;
    
    return format(new Date(seconds * 1000), "d MMM yyyy", { locale: isAr ? ar : undefined });
  };

  // Helper function to categorize notifications
  const getNotificationCategory = (notif: any): 'general' | 'orders' | 'security' => {
    const title = (notif.title || "").toLowerCase();
    const body = (notif.body || "").toLowerCase();
    
    if (
      title.includes("شحن") || 
      title.includes("جواهر") || 
      title.includes("شدات") || 
      title.includes("فري فاير") || 
      title.includes("ببجي") || 
      title.includes("طلب") || 
      title.includes("شراء") || 
      title.includes("تفعيل") ||
      body.includes("شحن") ||
      body.includes("طلب") ||
      body.includes("تفعيل")
    ) {
      return 'orders';
    }

    if (
      title.includes("هوية") || 
      title.includes("تأكيد") || 
      title.includes("kyc") || 
      title.includes("حساب") || 
      title.includes("أمان") || 
      title.includes("كلمة") ||
      body.includes("هوية") ||
      body.includes("أمان") ||
      body.includes("حساب")
    ) {
      return 'security';
    }

    return 'general';
  };

  // Helper function to return beautiful custom styles and icons
  const getNotificationStyle = (notif: any) => {
    const title = (notif.title || "").toLowerCase();
    const body = (notif.body || "").toLowerCase();
    const type = notif.type || "info";

    let icon = <Bell className="w-4 h-4" strokeWidth={1.6} />;
    let styleClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

    if (title.includes("إحالة") || title.includes("مكافأة") || body.includes("إحالة") || body.includes("مكافأة")) {
      icon = <Gift className="w-4 h-4" strokeWidth={1.6} />;
      styleClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    } else if (title.includes("هوية") || title.includes("تأكيد") || title.includes("kyc") || body.includes("هوية") || body.includes("تأكيد")) {
      icon = <ShieldCheck className="w-4 h-4" strokeWidth={1.6} />;
      styleClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    } else if (title.includes("واتساب") || title.includes("whatsapp") || body.includes("واتساب") || body.includes("whatsapp")) {
      icon = <MessageSquare className="w-4 h-4" strokeWidth={1.6} />;
      styleClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    } else if (title.includes("شحن") || title.includes("جواهر") || title.includes("شدات") || title.includes("فري فاير") || title.includes("ببجي") || body.includes("شحن")) {
      icon = <Gamepad2 className="w-4 h-4" strokeWidth={1.6} />;
      styleClass = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    } else if (type === "success" || title.includes("تم") || title.includes("قبول") || title.includes("ناجح") || title.includes("تفعيل")) {
      icon = <CheckCircle2 className="w-4 h-4" strokeWidth={1.6} />;
      styleClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    } else if (type === "error" || title.includes("رفض") || title.includes("فشل") || title.includes("مرفوض") || title.includes("خطأ")) {
      icon = <AlertCircle className="w-4 h-4" strokeWidth={1.6} />;
      styleClass = "text-rose-400 bg-rose-500/10 border-rose-500/20";
    } else if (title.includes("انتظار") || title.includes("قيد") || body.includes("انتظار")) {
      icon = <Clock className="w-4 h-4" strokeWidth={1.6} />;
      styleClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }

    return { icon, styleClass };
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <SEO 
          title={isRtl ? "مركز الإشعارات والتنبيهات | موري توب" : "Centre de Notifications | MauriTop"} 
          description={isRtl ? "متابعة حالة طلبات الشحن والتنبيهات المباشرة من موري توب." : "Suivez l'état de vos commandes et alertes directes de MauriTop."}
          keywords="إشعارات موري توب, تنبيهات شحن الألعاب, MauriTop notifications"
        />
        
        {/* Skeleton Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0E1626] rounded-xl flex items-center justify-center border border-white/5 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-5 w-28 bg-white/10 rounded-md animate-pulse" />
              <div className="h-3 w-40 bg-white/5 rounded-md animate-pulse" />
            </div>
          </div>
        </div>

        <NotificationSkeleton />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Filter by read status AND category
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (typeFilter !== 'all') {
      const category = getNotificationCategory(n);
      if (category !== typeFilter) return false;
    }
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-24 text-white">
      <SEO 
        title={isRtl ? "مركز الإشعارات والتنبيهات | موري توب" : "Centre de Notifications | MauriTop"} 
        description={isRtl ? "متابعة حالة طلبات الشحن والتنبيهات المباشرة من موري توب." : "Suivez l'état de vos commandes et alertes directes de MauriTop."}
        noindex={true}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0E1626] rounded-xl flex items-center justify-center border border-white/10 text-emerald-400">
            <Bell className="w-5 h-5" strokeWidth={1.6} />
          </div>
          <div className={isRtl ? "text-right" : "text-left"}>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {language === 'ar' ? 'التنبيهات' : 'Notifications'}
              </h1>
              {unreadCount > 0 && (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  {unreadCount} {language === "ar" ? "جديد" : "Nouveau"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-normal">
              {language === 'ar' ? 'تابع أحدث نشاطات وتحديثات حسابك' : 'Suivez les activités de votre compte'}
            </p>
          </div>
        </div>
        <Link
          to="/"
          className="w-9 h-9 rounded-xl bg-[#0E1626] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-white/10"
        >
          <X className="w-4 h-4" strokeWidth={1.6} />
        </Link>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center gap-1.5 bg-[#0E1626] p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              filter === 'all' ? "bg-[#070B14] text-white shadow-xs border border-white/10" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {language === 'ar' ? 'الكل' : 'Tout'}
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              filter === 'unread' ? "bg-[#070B14] text-white shadow-xs border border-white/10" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {language === 'ar' ? 'غير مقروءة' : 'Non lus'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              setNotificationSoundEnabled(next);
              if (next) {
                playNotificationChime();
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
              soundEnabled
                ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/20"
                : "bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200"
            )}
            title={soundEnabled ? (language === 'ar' ? "التنبيه الصوتي مفعّل (انقر للكتم)" : "Son activé") : (language === 'ar' ? "التنبيه الصوتي مكتوم (انقر للتفعيل)" : "Son désactivé")}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? (language === 'ar' ? "الصوت مفعّل" : "Son activé") : (language === 'ar' ? "الصوت مكتوم" : "Muet")}</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>{language === 'ar' ? 'تحديد الكل كمقروء' : 'Tout marquer comme lu'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {filteredNotifications.map((notif) => {
              const { icon, styleClass } = getNotificationStyle(notif);
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                  className={cn(
                    "p-3.5 sm:p-4 rounded-xl flex gap-3.5 items-start transition-all duration-150 cursor-pointer relative border",
                    notif.read 
                      ? "bg-[#0E1626]/70 border-white/5 hover:bg-[#0E1626]" 
                      : "bg-[#0E1626] border-emerald-500/20 hover:border-emerald-500/35 shadow-xs"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                    styleClass,
                    notif.read && "opacity-60 grayscale-[40%]"
                  )}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-right" dir="rtl">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className={cn(
                        "text-xs sm:text-sm font-bold leading-snug",
                        notif.read ? "text-slate-300" : "text-white"
                      )}>
                        {notif.title}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-normal whitespace-nowrap mt-0.5">
                        {notif.createdAt?.seconds 
                          ? formatRelativeTime(notif.createdAt.seconds) 
                          : "-"}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs leading-relaxed font-normal",
                      notif.read ? "text-slate-400" : "text-slate-300"
                    )}>{notif.body}</p>
                  </div>
                  
                  {/* Unread indicator */}
                  {!notif.read && (
                    <div className="absolute top-3.5 left-3.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 text-center"
        >
          <div className="w-12 h-12 bg-[#0E1626] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/5">
            <Inbox className="w-5 h-5 text-slate-500" strokeWidth={1.6} />
          </div>
          <p className="text-slate-400 font-bold text-xs">
            {language === "ar" 
              ? (filter === 'unread' ? "لا توجد تنبيهات غير مقروءة" : "صندوق التنبيهات فارغ") 
              : (filter === 'unread' ? "Aucune notification non lue" : "Aucune notification")}
          </p>
        </motion.div>
      )}
    </div>
  );
}
