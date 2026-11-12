import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ShoppingBag, Copy, X, Clock, CheckCircle2, XCircle, CreditCard, User,
  Zap, ShieldCheck, ZoomIn, Receipt, Check, Sparkles, ArrowDownCircle, 
  Share2, MessageSquare, HelpCircle, Trash2, Phone, Mail, FileText, 
  Printer, ExternalLink, ChevronRight, AlertTriangle, ArrowLeft, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, onSnapshot, deleteDoc, addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { cn, formatMRU, formatDateSafe, haptic } from "../lib/utils";
import { useToast } from "../contexts/ToastContext";
import { OFFICIAL_PHONE } from "../constants";
import { ImageViewerModal } from "./ImageViewerModal";
import { getFallbackServiceImage } from "../lib/serviceImages";

interface OrderDetailsModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  isArabic: boolean;
  isAdminView?: boolean;
  adminState?: {
    adminNote?: string;
    setAdminNote?: (note: string) => void;
    isUpdatingStatus?: boolean;
    onUpdateStatus?: (status: string, extraData?: { pinCode?: string; adminNote?: string; rejectionReason?: string }) => void | Promise<void>;
    onOpenRejection?: () => void;
    onDeleteOrder?: (orderId: string) => void;
  };
  onDownloadInvoice?: (order: any) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  isArabic,
  isAdminView = false,
  adminState,
  onDownloadInvoice,
}) => {
  const { showToast } = useToast();
  const isRtl = isArabic;

  // Active Tab state
  const [activeTab, setActiveTab] = useState<"info" | "payment" | "invoice" | "admin">(
    isAdminView ? "admin" : "info"
  );

  // Synchronized live order state (subscribes to Firestore when open)
  const [liveOrder, setLiveOrder] = useState<any>(order);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Admin inline form states
  const [pinCodeInput, setPinCodeInput] = useState<string>("");
  const [adminNoteInput, setAdminNoteInput] = useState<string>("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState<boolean>(false);

  // Reset & subscribe when modal opens or order changes
  useEffect(() => {
    if (order) {
      setLiveOrder(order);
      setPinCodeInput(order.pinCode || order.voucherCode || "");
      setAdminNoteInput(order.adminNote || "");
      setRejectionReasonInput(order.rejectionReason || "");
      setShowRejectForm(false);
      if (isAdminView) {
        setActiveTab("admin");
      } else {
        setActiveTab("info");
      }
    }
  }, [order, isAdminView, isOpen]);

  // Real-time Firestore sync when modal is open to reflect live changes
  useEffect(() => {
    // Guest order details come from the private server tracking-token API.
    // Do not attempt a direct Firestore read for a guest order.
    if (!isOpen || !order?.id || order?.isGuest === true) return;

    const unsub = onSnapshot(
      doc(db, "orders", order.id),
      (snap) => {
        if (snap.exists()) {
          const freshData: any = { id: snap.id, ...snap.data() };
          setLiveOrder(freshData);
          if (freshData.pinCode) setPinCodeInput(freshData.pinCode);
          if (freshData.adminNote) setAdminNoteInput(freshData.adminNote);
          if (freshData.rejectionReason) setRejectionReasonInput(freshData.rejectionReason);
        }
      },
      (err) => {
        console.warn("Live order sync handled gracefully:", err);
      }
    );

    return () => unsub();
  }, [isOpen, order?.id]);

  // Reset scroll on tab switch
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  if (!isOpen || !order) return null;

  const currentOrder = liveOrder || order;
  const orderId = currentOrder.id || order.id || "";
  const serviceName = currentOrder.serviceType || currentOrder.serviceName || (isArabic ? "خدمة رقمية" : "Service Numérique");
  const amount = Number(currentOrder.total ?? currentOrder.amount ?? currentOrder.priceMru ?? 0);
  const status = (currentOrder.status || "pending").toLowerCase();
  const rawDateVal = currentOrder.createdAt || currentOrder.date || currentOrder.timestamp || currentOrder.updatedAt;
  const formattedDate = formatDateSafe(rawDateVal, isArabic ? "ar-MR" : "fr-FR");
  const deliveryCode = currentOrder.pinCode || currentOrder.voucherCode || currentOrder.deliveryCode;
  
  // Customer & Account Details
  const customerName = currentOrder.userName || currentOrder.name || currentOrder.customerName || (isArabic ? "العميل" : "Client");
  const customerEmail = currentOrder.userEmail || currentOrder.email || "";
  const senderPhone = currentOrder.senderPhone || currentOrder.phone || currentOrder.fields?.phone || "";
  const senderRef = currentOrder.senderRef || currentOrder.transactionId || currentOrder.ref || "";
  const proofImageUrl = currentOrder.proofImageUrl || currentOrder.proofUrl || currentOrder.receiptUrl || "";
  const paymentMethod = currentOrder.paymentMethod || "bankily";
  const rejectionReason = currentOrder.rejectionReason || "";
  const adminNote = currentOrder.adminNote || "";
  
  // Extract recipient / Player ID cleanly
  const fields = currentOrder.fields || {};
  const playerId = fields.playerId || fields.playerNumber || fields.id || fields.ID || 
    fields["معرف اللاعب"] || fields["ID اللاعب"] || fields["رقم الحساب"] || currentOrder.playerId || "";
  const serviceImg = currentOrder.serviceImage || currentOrder.imageUrl || currentOrder.image || getFallbackServiceImage(serviceName, currentOrder.serviceId);

  // Helper for copying text with feedback
  const handleCopyText = (text: string, fieldKey: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    haptic.success();
    setCopiedField(fieldKey);
    showToast(isArabic ? `تم نسخ ${label} بنجاح!` : `${label} copié !`, "success");
    setTimeout(() => setCopiedField(null), 2500);
  };

  // WhatsApp Support Helper
  const handleWhatsAppCustomer = (phoneNum: string) => {
    const cleanDigits = phoneNum.replace(/\D/g, "");
    const formatted = cleanDigits.startsWith("222") ? cleanDigits : `222${cleanDigits}`;
    const text = isArabic 
      ? `السلام عليكم، بخصوص طلبك في MAURITOP رقم #${orderId.slice(0, 8).toUpperCase()} لخدمة (${serviceName})`
      : `Bonjour, concernant votre commande MAURITOP #${orderId.slice(0, 8).toUpperCase()} (${serviceName})`;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleWhatsAppGeneralSupport = () => {
    const text = isArabic 
      ? `استفسار بخصوص الطلب #${orderId.slice(0, 8).toUpperCase()} (${serviceName})` 
      : `Question commande #${orderId.slice(0, 8).toUpperCase()} (${serviceName})`;
    window.open(`https://wa.me/222${OFFICIAL_PHONE}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Print Invoice Helper
  const handlePrintInvoice = () => {
    window.print();
  };

  // Copy Invoice Text Summary
  const handleCopyInvoiceSummary = () => {
    const summary = `
========================================
       MAURITOP DIGITAL SERVICES
       فاتورة طلب رسمي - موريتانيا
========================================
رقم الفاتورة: INV-${orderId.slice(0, 8).toUpperCase()}
الخدمة: ${serviceName}
المستفيد: ${customerName}
${playerId ? `معرف اللاعب/الحساب: ${playerId}\n` : ""}المبلغ الإجمالي: ${amount} MRU
طريقة الدفع: ${paymentMethod.toUpperCase()}
تاريخ الطلب: ${formattedDate}
الحالة: ${status === "completed" ? "مكتمل" : status === "approved" ? "مقبول" : status === "rejected" ? "مرفوض" : "قيد المراجعة"}
========================================
شكراً لثقتكم بمنصة موري توب الرقمية 🇲🇷
    `.trim();
    navigator.clipboard.writeText(summary);
    haptic.success();
    showToast(isArabic ? "تم نسخ ملخص الفاتورة بنجاح!" : "Résumé copié !", "success");
  };

  // Admin Action Handlers (Direct Firestore updates under authenticated admin security rules)
  const executeServerStatusUpdate = async (newStatus: string, payload: { pinCode?: string; adminNote?: string; rejectionReason?: string }) => {
    if (adminState?.onUpdateStatus) {
      await adminState.onUpdateStatus(newStatus, payload);
      return;
    }

    if (!orderId) return;

    const updateData: any = {
      status: newStatus,
      adminNote: payload.adminNote || null,
      rejectionReason: payload.rejectionReason || null,
      updatedAt: serverTimestamp()
    };

    if (payload.pinCode) {
      updateData.pinCode = payload.pinCode;
    }
    if (newStatus === "completed") {
      updateData.completedAt = serverTimestamp();
    }

    await updateDoc(doc(db, "orders", orderId), updateData);
  };

  const handleAdminAccept = async () => {
    if (!orderId) return;
    setIsSubmittingAdmin(true);
    try {
      await executeServerStatusUpdate("approved", { adminNote: adminNoteInput.trim() || undefined });
      setLiveOrder((prev: any) => ({ ...prev, status: "approved" }));
      showToast(isArabic ? "تم قبول طلب الشحن وبدء معالجته بنجاح! ⚡" : "Commande approuvée !", "success");
      haptic.success();
    } catch (err: any) {
      console.error("Accept error:", err);
      showToast(err.message || (isArabic ? "فشل قبول الطلب" : "Erreur"), "error");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleAdminComplete = async () => {
    if (!orderId) return;
    setIsSubmittingAdmin(true);
    try {
      await executeServerStatusUpdate("completed", {
        pinCode: pinCodeInput.trim() || undefined,
        adminNote: adminNoteInput.trim() || undefined
      });
      setLiveOrder((prev: any) => ({
        ...prev,
        status: "completed",
        pinCode: pinCodeInput.trim() || prev?.pinCode,
        adminNote: adminNoteInput.trim() || prev?.adminNote
      }));
      showToast(isArabic ? "تم تأكيد إكمال الشحن وتسليم الطلب بنجاح! ✅" : "Commande terminée !", "success");
      haptic.success();
    } catch (err: any) {
      console.error("Complete error:", err);
      showToast(err.message || (isArabic ? "فشل إكمال الطلب" : "Erreur"), "error");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleAdminReject = async () => {
    if (!orderId) return;
    if (!rejectionReasonInput.trim()) {
      showToast(isArabic ? "يرجى كتابة سبب الرفض لتوضيحه للعميل" : "Veuillez indiquer le motif du refus", "error");
      return;
    }
    setIsSubmittingAdmin(true);
    try {
      await executeServerStatusUpdate("rejected", {
        rejectionReason: rejectionReasonInput.trim(),
        adminNote: adminNoteInput.trim() || undefined
      });
      setLiveOrder((prev: any) => ({
        ...prev,
        status: "rejected",
        rejectionReason: rejectionReasonInput.trim()
      }));
      setShowRejectForm(false);
      showToast(isArabic ? "تم رفض الطلب وحفظ السبب وإشعار العميل" : "Commande rejetée", "success");
      haptic.success();
    } catch (err: any) {
      console.error("Reject error:", err);
      showToast(err.message || (isArabic ? "فشل رفض الطلب" : "Erreur"), "error");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleAdminDelete = () => {
    if (adminState?.onDeleteOrder) {
      adminState.onDeleteOrder(orderId);
      onClose();
    }
  };

  // Format Status Badge Helper with robust normalization
  const getStatusDisplay = (rawStatus: string) => {
    const s = (rawStatus || "").toLowerCase().trim();
    if (["completed", "complete", "success", "done", "مكتمل"].includes(s)) {
      return {
        label: isArabic ? "مكتمل الشحن بنجاح" : "Terminé",
        bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      };
    }
    if (["approved", "accepted", "processing", "in_progress", "قيد التنفيذ", "مقبول"].includes(s)) {
      return {
        label: isArabic ? "تم قبول الشحن (قيد المعالجة) ⚡" : "Approuvé (en cours)",
        bg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        icon: <Zap className="w-3.5 h-3.5 text-cyan-400" />
      };
    }
    if (["shipped", "shipping", "تم الشحن"].includes(s)) {
      return {
        label: isArabic ? "تم الشحن والتسليم 📦" : "Expédié",
        bg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        icon: <Sparkles className="w-3.5 h-3.5 text-blue-400" />
      };
    }
    if (["pending", "waiting", "قيد المراجعة"].includes(s) || !s) {
      return {
        label: isArabic ? "بانتظار المراجعة والقبول ⏳" : "En attente",
        bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        icon: <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
      };
    }
    // Rejected
    return {
      label: isArabic ? "طلب مرفوض ❌" : "Rejeté",
      bg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />
    };
  };

  const statusInfo = getStatusDisplay(status);

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] p-2 sm:p-4 flex flex-col items-center justify-start sm:justify-center min-h-full" 
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" 
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 15 }} 
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative z-10 checkout-modal shadow-2xl rounded-3xl overflow-hidden border flex flex-col max-h-[92vh] w-full max-w-lg bg-[#090E1A] text-white border-white/10"
        >
          {/* 1. Header (Fixed, Sticky) */}
          <div className="checkout-modal__header px-5 py-4 border-b border-white/10 bg-[#060A13]/95 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white truncate">
                    {isArabic ? "تفاصيل الطلب" : "Détails de la commande"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopyText(orderId, "headerOrderId", isArabic ? "رقم الطلب" : "N° Commande")}
                    className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-0.5 rounded-md border border-cyan-500/20 transition-all flex items-center gap-1 cursor-pointer"
                    title={isArabic ? "نسخ رقم الطلب" : "Copier le numéro"}
                  >
                    <span>#{orderId.slice(0, 8).toUpperCase()}</span>
                    {copiedField === "headerOrderId" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border", statusInfo.bg)}>
                    {statusInfo.icon}
                    <span>{statusInfo.label}</span>
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              aria-label={isArabic ? "إغلاق" : "Fermer"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. Navigation Tabs (Fixed, Persistent) */}
          <div className="px-4 pt-2.5 pb-2 shrink-0 bg-[#060A13]/60 border-b border-white/5 flex gap-1.5 overflow-x-auto">
            {[
              { id: "info", label: isArabic ? "الطلب" : "Détails" },
              { id: "payment", label: isArabic ? "الدفع والإثبات" : "Paiement" },
              { id: "invoice", label: isArabic ? "الفاتورة" : "Facture" },
              ...(isAdminView ? [{ id: "admin", label: isArabic ? "لوحة الإدارة ⚡" : "Admin ⚡" }] : [])
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={cn(
                  "flex-1 py-1.5 px-3 text-xs font-black rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5",
                  activeTab === tab.id 
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 3. Modal Body (Scrollable, Animated Tab Content) */}
          <div ref={scrollContainerRef} className="checkout-modal__body px-4 py-4 overflow-y-auto flex-1 pb-bottom-nav">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRtl ? -10 : 10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* ================= TAB 1: ORDER INFO ================= */}
                {activeTab === "info" && (
                  <div className="space-y-3.5">
                    
                    {/* Activation Code Box (If provided by admin) */}
                    {deliveryCode && (
                      <div className="p-3.5 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border-2 border-emerald-500/40 rounded-2xl shadow-lg shadow-emerald-500/10">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            {isArabic ? "كود التفعيل / الشحن المستلم" : "Code d'activation / Voucher"}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                            {isArabic ? "جاهز للاستخدام" : "Prêt"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-sm sm:text-base font-black text-white bg-slate-950/80 px-3.5 py-2.5 rounded-xl border border-emerald-500/30">
                          <span className="tracking-wider select-all">{deliveryCode}</span>
                          <button 
                            onClick={() => handleCopyText(deliveryCode, "deliveryCode", "كود التفعيل")}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-all"
                            title={isArabic ? "نسخ الكود" : "Copier"}
                          >
                            {copiedField === "deliveryCode" ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Primary Service Card */}
                    <div className="p-4 bg-[#0B1220] rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {serviceImg ? (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#070B14] border border-[#243247] shrink-0 shadow-md flex items-center justify-center overflow-hidden">
                              <img
                                src={serviceImg}
                                alt={serviceName}
                                className="w-full h-full object-cover filter drop-shadow"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#070B14] border border-[#243247] flex items-center justify-center shrink-0 text-cyan-400">
                              <ShoppingBag className="w-7 h-7" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                              {isArabic ? "الخدمة المطلوبة" : "Service"}
                            </span>
                            <h4 className="text-sm sm:text-base font-black text-white leading-snug break-words">{serviceName}</h4>
                          </div>
                        </div>
                        <div className="text-left font-mono shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                            {isArabic ? "المبلغ" : "Montant"}
                          </span>
                          <span className="text-base font-black text-emerald-400 font-sans">
                            <bdi dir="ltr">{formatMRU(amount)}</bdi>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">{isArabic ? "تاريخ الطلب:" : "Date :"}</span>
                          <span className="font-bold text-slate-200">{formattedDate}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{isArabic ? "العميل:" : "Client :"}</span>
                          <span className="font-bold text-slate-200 truncate block min-w-0">{customerName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Recipient & Account Fields Card */}
                    <div className="p-4 bg-[#0B1220] rounded-2xl border border-white/10 space-y-2.5">
                      <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5 border-b border-white/5 pb-2">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        {isArabic ? "بيانات المستلم والحساب المطلوب شحنه" : "Données du compte à recharger"}
                      </h4>

                      {/* Prominent Player ID if exists */}
                      {playerId && (
                        <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-cyan-400 block">
                              {isArabic ? "معرّف اللاعب / رقم الحساب (Player ID)" : "ID Joueur / Numéro de compte"}
                            </span>
                            <span className="font-mono text-sm font-black text-white tracking-wider select-all">
                              <bdi dir="ltr">{playerId}</bdi>
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyText(playerId, "playerId", "معرف اللاعب")}
                            className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-all"
                            title={isArabic ? "نسخ معرف اللاعب" : "Copier ID"}
                          >
                            {copiedField === "playerId" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}

                      {/* Other Custom Fields in order */}
                      {Object.entries(fields)
                        .filter(([k]) => k !== "playerId" && k !== "playerNumber" && k !== "id" && k !== "ID")
                        .map(([key, val]) => {
                          const displayVal = String(val ?? "").trim();
                          if (!displayVal) return null;

                          let labelAr = key;
                          if (key === "amountMru" || key === "amount") labelAr = "المبلغ";
                          else if (key === "budgetMru" || key === "budget") labelAr = "الميزانية";
                          else if (key === "appleIdEmail") labelAr = "بريد Apple ID";
                          else if (key === "email") labelAr = "البريد الإلكتروني";
                          else if (key === "username") labelAr = "اسم المستخدم";
                          else if (key === "phone") labelAr = "رقم الهاتف";
                          else if (key === "cardId") labelAr = "رقم البطاقة";
                          else if (key === "pageLink") labelAr = "رابط الصفحة";
                          else if (key === "profileLink") labelAr = "رابط الحساب";
                          else if (key === "objective") labelAr = "هدف الحملة";
                          else if (key === "note") labelAr = "ملاحظات العميل";
                          else if (key === "orderId") labelAr = "رقم الطلب";
                          else {
                            labelAr = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
                          }

                          return (
                            <div key={key} className="flex items-center justify-between py-1.5 px-2 bg-white/5 rounded-lg text-xs">
                              <span className="text-slate-400 font-bold">{labelAr}:</span>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-white max-w-[220px] truncate select-all">
                                  <bdi dir="ltr">{displayVal}</bdi>
                                </span>
                                <button
                                  onClick={() => handleCopyText(displayVal, key, labelAr)}
                                  className="text-slate-400 hover:text-white p-1 shrink-0"
                                >
                                  {copiedField === key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {/* If no custom fields and no playerId */}
                      {!playerId && Object.keys(fields).length === 0 && (
                        <p className="text-xs text-slate-400 italic py-1">
                          {isArabic ? "لا توجد حقول إضافية مطلوبة لهذه الخدمة." : "Aucun champ supplémentaire requis."}
                        </p>
                      )}
                    </div>

                    {/* Progress Milestone Tracker */}
                    <div className="p-4 bg-[#0B1220] rounded-2xl border border-white/10 space-y-3">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                        {isArabic ? "مراحل تنفيذ الطلب" : "Progression de la commande"}
                      </span>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        {/* Step 1: تم الاستلام */}
                        <div className="flex flex-col items-center gap-1.5 p-2 bg-white/5 rounded-xl border border-white/10">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="font-bold text-[11px] text-white">
                            {isArabic ? "تم الاستلام" : "Reçue"}
                          </span>
                        </div>

                        {/* Step 2: المعالجة والقبول */}
                        <div className={cn(
                          "flex flex-col items-center gap-1.5 p-2 rounded-xl border",
                          status === "approved" || status === "shipped" || status === "completed"
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                            : status === "rejected"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300 opacity-60"
                            : "bg-white/5 border-white/10 text-slate-400 opacity-60"
                        )}>
                          <Clock className="w-5 h-5" />
                          <span className="font-bold text-[11px]">
                            {isArabic ? "قيد المعالجة" : "En cours"}
                          </span>
                        </div>

                        {/* Step 3: اكتمال الشحن */}
                        <div className={cn(
                          "flex flex-col items-center gap-1.5 p-2 rounded-xl border",
                          status === "completed"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                            : status === "rejected"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                            : "bg-white/5 border-white/10 text-slate-400 opacity-40"
                        )}>
                          {status === "rejected" ? <XCircle className="w-5 h-5 text-rose-400" /> : <Sparkles className="w-5 h-5" />}
                          <span className="font-bold text-[11px]">
                            {status === "rejected" ? (isArabic ? "مرفوض" : "Rejeté") : (isArabic ? "اكتمل الشحن" : "Livrée")}
                          </span>
                        </div>
                      </div>

                      {/* Rejection Alert Message */}
                      {status === "rejected" && (
                        <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-rose-400 font-black">
                            <AlertTriangle className="w-4 h-4" />
                            <span>{isArabic ? "تم رفض هذا الطلب" : "Commande rejetée"}</span>
                          </div>
                          <p className="text-slate-300 font-bold leading-relaxed">
                            {rejectionReason || (isArabic ? "لم يذكر المشرف سبباً محدداً. يرجى التواصل مع الدعم." : "Veuillez contacter le support.")}
                          </p>
                        </div>
                      )}

                      {/* Admin Note Notice */}
                      {adminNote && status !== "rejected" && (
                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs space-y-1">
                          <span className="text-cyan-400 font-bold flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {isArabic ? "ملاحظة الإدارة:" : "Note de l'administration :"}
                          </span>
                          <p className="text-slate-200 font-medium">{adminNote}</p>
                        </div>
                      )}
                    </div>

                    {/* Support Button */}
                    <div className="pt-1">
                      <button 
                        onClick={handleWhatsAppGeneralSupport}
                        className="w-full py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{isArabic ? "استفسار عبر واتساب الدعم الفني" : "Contacter le support WhatsApp"}</span>
                      </button>
                    </div>

                  </div>
                )}

                {/* ================= TAB 2: PAYMENT PROOF ================= */}
                {activeTab === "payment" && (
                  <div className="space-y-3.5">
                    
                    {/* Payment Overview */}
                    <div className="p-4 bg-[#0B1220] rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-black text-white">
                            {isArabic ? "طريقة الدفع المختارة" : "Méthode de paiement"}
                          </span>
                        </div>
                        <span className="text-xs font-black font-mono px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                          {paymentMethod === "bankily" ? (isArabic ? "بنكيلي (Bankily)" : "Bankily") :
                           paymentMethod === "sadad" ? (isArabic ? "سداد (Sedad)" : "Sedad") :
                           paymentMethod === "gaza" ? (isArabic ? "غزة باي (GazaPay)" : "GazaPay") :
                           paymentMethod}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-white/5 rounded-xl">
                          <span className="text-[10px] text-slate-400 block mb-0.5">
                            {isArabic ? "رقم هاتف المرسل:" : "Téléphone émetteur :"}
                          </span>
                          <span className="font-mono font-bold text-white select-all">
                            {senderPhone || (isArabic ? "غير مسجل" : "Non spécifié")}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white/5 rounded-xl">
                          <span className="text-[10px] text-slate-400 block mb-0.5">
                            {isArabic ? "رقم التحويل / المرجع:" : "Réf. de transaction :"}
                          </span>
                          <span className="font-mono font-bold text-cyan-300 select-all truncate block">
                            {senderRef || (isArabic ? "غير مسجل" : "Non spécifié")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                        <span className="text-slate-400">{isArabic ? "المبلغ المدفوع:" : "Montant payé :"}</span>
                        <span className="font-black text-emerald-400 text-sm">{formatMRU(amount)}</span>
                      </div>
                    </div>

                    {/* Receipt Image Card */}
                    <div className="p-4 bg-[#0B1220] rounded-2xl border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          {isArabic ? "إثبات التحويل البنكي (الإيصال)" : "Preuve de paiement (Reçu)"}
                        </h4>
                        {proofImageUrl && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {isArabic ? "تم الإرفاق بنجاح" : "Attaché"}
                          </span>
                        )}
                      </div>

                      {proofImageUrl ? (
                        <div className="space-y-3">
                          <div 
                            onClick={() => setIsImageViewerOpen(true)}
                            className="relative group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-slate-950 flex items-center justify-center max-h-[220px] h-[220px]"
                          >
                            <img 
                              src={proofImageUrl} 
                              alt="Receipt proof" 
                              className="w-full h-full max-h-[220px] object-contain transition-transform duration-300 group-hover:scale-102"
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                              <ZoomIn className="w-5 h-5 text-emerald-300" />
                              <span className="text-xs font-bold">{isArabic ? "عرض الإيصال" : "Agrandir"}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsImageViewerOpen(true)}
                              className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <ZoomIn className="w-4 h-4 text-slate-950" />
                              <span>{isArabic ? "عرض الإيصال" : "Afficher le reçu"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyText(proofImageUrl, "proofUrl", isArabic ? "رابط الإيصال" : "Lien")}
                              className="py-2.5 px-3.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              title={isArabic ? "نسخ رابط الصورة" : "Copier le lien"}
                            >
                              {copiedField === "proofUrl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isArabic ? "نسخ" : "Copier"}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-white/5 rounded-xl border border-dashed border-white/10 space-y-2">
                          <Receipt className="w-8 h-8 text-slate-500 mx-auto" />
                          <p className="text-xs font-bold text-slate-300">
                            {isArabic ? "لم يتم إرفاق إيصال دفع لهذا الطلب" : "Aucune preuve de paiement fournie"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {isArabic ? "قد يكون الطلب طلب تسعيرة أو تم تأكيد الدفع هاتفياً." : "Paiement direct ou commande spéciale."}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* ================= TAB 3: INVOICE ================= */}
                {activeTab === "invoice" && (
                  <div className="space-y-3.5">
                    
                    {/* Official MauriTop Invoice Document */}
                    <div className="p-5 bg-gradient-to-b from-[#0E1626] to-[#080E1A] rounded-2xl border border-white/15 shadow-xl space-y-4 text-xs font-sans">
                      
                      {/* Invoice Header */}
                      <div className="flex items-start justify-between border-b border-white/10 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm tracking-tight text-white">MAURITOP 🇲🇷</span>
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              رسمي
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">منصة شحن الألعاب والخدمات الرقمية في موريتانيا</p>
                        </div>
                        <div className="text-left font-mono">
                          <span className="text-[10px] font-bold text-slate-400 block">رقم الفاتورة:</span>
                          <span className="font-black text-xs text-cyan-300 select-all">
                            INV-{orderId.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Invoice Metadata */}
                      <div className="grid grid-cols-2 gap-3 text-[11px] bg-white/5 p-3 rounded-xl border border-white/5">
                        <div>
                          <span className="text-slate-400 block text-[10px]">العميل:</span>
                          <span className="font-bold text-white truncate block min-w-0">{customerName}</span>
                          {customerEmail && <span className="text-[10px] text-slate-400 font-mono block">{customerEmail}</span>}
                        </div>
                        <div className="text-left">
                          <span className="text-slate-400 block text-[10px]">التاريخ:</span>
                          <span className="font-bold text-white block">{formattedDate}</span>
                          <span className="text-[10px] text-emerald-400 font-bold block">{paymentMethod.toUpperCase()}</span>
                        </div>
                      </div>

                      {/* Line Item Table */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 border-b border-white/5 pb-1">
                          <span>البيان / الخدمة</span>
                          <span>المبلغ</span>
                        </div>

                        <div className="flex justify-between items-center py-1.5 text-xs border-b border-white/5">
                          <div>
                            <span className="font-bold text-white block">{serviceName}</span>
                            {playerId && <span className="text-[10px] text-slate-400 font-mono block">ID: {playerId}</span>}
                          </div>
                          <span className="font-mono font-bold text-slate-200">{formatMRU(amount)}</span>
                        </div>

                        <div className="flex justify-between items-center py-1 text-[11px] text-slate-400">
                          <span>رسوم الخدمة:</span>
                          <span className="font-mono">0 MRU (مجاناً)</span>
                        </div>

                        <div className="flex justify-between items-center pt-2 text-sm font-black text-emerald-400 border-t border-white/10">
                          <span>الإجمالي المدفوع:</span>
                          <span className="font-mono text-base">{formatMRU(amount)}</span>
                        </div>
                      </div>

                      {/* Status Stamp */}
                      <div className="pt-2 flex items-center justify-between text-[11px] border-t border-white/5">
                        <span className="text-slate-400">حالة الدفع والتنفيذ:</span>
                        <span className={cn("px-2.5 py-0.5 rounded-full font-bold text-[10px] border", statusInfo.bg)}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Invoice Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={handleCopyInvoiceSummary}
                        className="py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isArabic ? "نسخ ملخص الفاتورة" : "Copier résumé"}</span>
                      </button>

                      <button
                        onClick={handlePrintInvoice}
                        className="py-2.5 px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{isArabic ? "طباعة الفاتورة" : "Imprimer"}</span>
                      </button>
                    </div>

                  </div>
                )}

                {/* ================= TAB 4: ADMIN CONTROLS ================= */}
                {activeTab === "admin" && isAdminView && (
                  <div className="space-y-4">
                    
                    {/* Admin Status Quick Action Buttons */}
                    <div className="p-4 bg-slate-900/90 rounded-2xl border border-cyan-500/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          {isArabic ? "إجراءات الإدارة السريعة على الطلب" : "Actions d'administration"}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">
                          {isArabic ? "الحالة الحالية:" : "Statut:"} <strong className="text-white">{statusInfo.label}</strong>
                        </span>
                      </div>

                      {/* 1. Accept Order Button (for pending or rejected) */}
                      {status !== "approved" && status !== "completed" && (
                        <button
                          onClick={handleAdminAccept}
                          disabled={isSubmittingAdmin}
                          className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 active:scale-98 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-600/20"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isSubmittingAdmin ? (isArabic ? "جاري قبول الشحن..." : "Traitement...") : (isArabic ? "قبول طلب الشحن وبدء التنفيذ ⚡" : "Approuver la commande")}</span>
                        </button>
                      )}

                      {/* Status Banner when Approved */}
                      {status === "approved" && (
                        <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-200">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className="text-xs font-bold text-cyan-200">
                              {isArabic ? "تم قبول الشحن وجاري التنفيذ — أدخل كود التفعيل وأكد التسليم بالأسفل" : "Commande acceptée en cours d'exécution"}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                            مقبول ⚡
                          </span>
                        </div>
                      )}

                      {/* 2. Confirm Delivery Form & Button */}
                      {status !== "completed" && (
                        <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2">
                          <label className="text-[11px] font-black text-emerald-400 block">
                            {isArabic ? "كود التفعيل / رقم الشحن المسلّم (اختياري):" : "Code d'activation / Voucher (optionnel) :"}
                          </label>
                          <input
                            type="text"
                            value={pinCodeInput}
                            onChange={(e) => setPinCodeInput(e.target.value)}
                            placeholder={isArabic ? "مثال: ABCD-1234-EFGH أو رابط الحساب" : "ex: ABCD-1234..."}
                            className="w-full bg-slate-950 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-emerald-400"
                          />
                          <button
                            onClick={handleAdminComplete}
                            disabled={isSubmittingAdmin}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-600/20"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>{isSubmittingAdmin ? (isArabic ? "جاري الحفظ..." : "Enregistrement...") : (isArabic ? "تم الشحن والتسليم بنجاح ✅" : "Confirmer la livraison")}</span>
                          </button>
                        </div>
                      )}

                      {/* 3. Rejection Form & Button */}
                      {status !== "rejected" && (
                        <div className="pt-1">
                          {!showRejectForm ? (
                            <button
                              onClick={() => setShowRejectForm(true)}
                              className="w-full py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>{isArabic ? "رفض الطلب مع ذكر السبب" : "Rejeter la commande"}</span>
                            </button>
                          ) : (
                            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                              <label className="text-[11px] font-black text-rose-400 block">
                                {isArabic ? "سبب رفض الطلب (إلزامي ليصل للعميل):" : "Motif du refus (obligatoire) :"}
                              </label>
                              <textarea
                                value={rejectionReasonInput}
                                onChange={(e) => setRejectionReasonInput(e.target.value)}
                                autoFocus
                                placeholder={isArabic ? "مثال: رقم الحساب/اللاعب غير موجود، صورة الإيصال غير واضحة..." : "Ex: ID joueur incorrect..."}
                                className="w-full bg-slate-950 border border-rose-500/30 rounded-lg p-2.5 text-xs font-bold text-white outline-none focus:border-rose-400 resize-none h-20"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleAdminReject}
                                  disabled={isSubmittingAdmin || !rejectionReasonInput.trim()}
                                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black transition-all disabled:opacity-50 cursor-pointer"
                                >
                                  {isSubmittingAdmin ? (isArabic ? "جاري الرفض..." : "Traitement...") : (isArabic ? "تأكيد الرفض وإشعار العميل" : "Confirmer le rejet")}
                                </button>
                                <button
                                  onClick={() => setShowRejectForm(false)}
                                  className="py-2 px-3 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  {isArabic ? "إلغاء" : "Annuler"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. Delete Order Button */}
                      <div className="pt-2 border-t border-white/5 flex justify-end">
                        <button
                          onClick={handleAdminDelete}
                          className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title={isArabic ? "حذف هذا الطلب" : "Supprimer"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isArabic ? "حذف الطلب نهائياً" : "Supprimer"}</span>
                        </button>
                      </div>

                    </div>

                    {/* Customer Direct Contact Shortcuts */}
                    <div className="p-4 bg-[#0B1220] rounded-2xl border border-white/10 space-y-2.5">
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        {isArabic ? "التواصل المباشر مع العميل" : "Contacter le client"}
                      </h4>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {senderPhone ? (
                          <button
                            onClick={() => handleWhatsAppCustomer(senderPhone)}
                            className="py-2 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span>واتساب العميل ({senderPhone})</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs py-2 px-3 bg-white/5 rounded-xl text-center">
                            لا يوجد رقم هاتف مسجل
                          </span>
                        )}

                        {customerEmail ? (
                          <a
                            href={`mailto:${customerEmail}?subject=${encodeURIComponent(`MauriTop Order #${orderId.slice(0, 8)}`)}`}
                            className="py-2 px-3 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-center truncate"
                          >
                            <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{customerEmail}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs py-2 px-3 bg-white/5 rounded-xl text-center">
                            لا يوجد بريد مسجل
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 4. Footer (Fixed Close & Actions) */}
          <div className="px-5 py-3 border-t border-white/10 bg-[#060A13]/95 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-mono text-slate-400">
              {isArabic ? "رقم الطلب:" : "ID:"} #{orderId.slice(0, 8).toUpperCase()}
            </span>
            <button
              onClick={onClose}
              className="py-1.5 px-4 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {isArabic ? "إغلاق النافذة" : "Fermer"}
            </button>
          </div>
        </motion.div>

        {/* Image Fullscreen Zoom Modal */}
        {proofImageUrl && (
          <ImageViewerModal
            imageUrl={proofImageUrl}
            isOpen={isImageViewerOpen}
            onClose={() => setIsImageViewerOpen(false)}
            title={isArabic ? "إيصال التحويل البنكي" : "Reçu de paiement"}
            subtitle={`#${orderId.slice(0, 8).toUpperCase()} - ${serviceName}`}
            isArabic={isArabic}
          />
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
};
