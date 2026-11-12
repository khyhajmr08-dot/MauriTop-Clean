import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { SERVICES } from "../data/services";
import type { Service } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../lib/useAuth";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cacheService } from "../lib/cache";
import { handleFirestoreError, OperationType, compressImage, fileToBase64, haptic, cn, isValidImageUrl, formatNumberSpacing } from "../lib/utils";
import { getFallbackServiceImage, resolveServiceImage } from "../lib/serviceImages";
import { useToast } from "../contexts/ToastContext";
import confetti from "canvas-confetti";
import { uploadFileWithProgress } from "../services/fileUpload";
import { motion, AnimatePresence } from "motion/react";
import { UserCheck, Upload, HelpCircle, AlertCircle, CheckCircle2, ShoppingBag, Copy, FileText, RefreshCw, X, ShieldCheck, Loader2, Eye, ZoomIn, ClipboardList, ArrowRight, PhoneCall, Receipt, Smartphone, Sparkles } from "lucide-react";

// استيراد شعارات طرق الدفع البنكية والمحفظات الإلكترونية المعتمدة
import gazaLogoImg from "../assets/images/gaza_real_logo_1779370210822.png";
import sadadLogoImg from "../assets/images/sadad_real_logo_1779370189416.png";
import bankilyLogoImg from "../assets/images/bankily_real_logo_1779370169060.png";
import { PaymentMethodCard } from "./PaymentMethodCard";
import { ImageViewerModal } from "./ImageViewerModal";
import { LiveAmountDueSummary } from "./LiveAmountDueSummary";
import { 
  PaymentSettingsMap, 
  DEFAULT_PAYMENT_CONFIGS, 
  subscribePaymentSettings 
} from "../lib/paymentSettings";

function getQuantity(service: Service | undefined, amount: number) {
  if (!service) return 0;
  if (!service.packages || service.packages.length === 0) {
    if (service.ratePerUnit) {
      return Math.floor(amount / service.ratePerUnit);
    }
    return 0;
  }
  const pkg = service.packages.find((p) => p.amount === amount);
  if (pkg) return pkg.quantity;

  const base = service.packages[0];
  if (!base) return 0;
  return Math.floor((amount / base.amount) * base.quantity);
}

export function getFieldsForService(requiredFields: string[] = [], optionalFields: string[] = []): any[] {
  const allFields = [...requiredFields, ...optionalFields];
  if (allFields.length === 0) return [];
  
  // Deduplicate just in case
  const uniqueFields = Array.from(new Set(allFields));

  return uniqueFields.map(fieldId => {
    const isRequired = requiredFields.includes(fieldId);
    
    switch (fieldId) {
      case "playerId":
        return { id: "playerId", label: "Player ID", labelAr: "معرف اللاعب", type: "text", required: isRequired, placeholder: "51231233", placeholderAr: "51231233", pattern: "^[0-9]+$" };
      case "email":
        return { id: "email", label: "Email", labelAr: "البريد الإلكتروني", type: "email", required: isRequired, placeholder: "email@example.com", placeholderAr: "email@example.com", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" };
      case "username":
        return { id: "username", label: "Username", labelAr: "اسم المستخدم", type: "text", required: isRequired, placeholder: "player_one", placeholderAr: "player_one" };
      case "phone":
        return { id: "phone", label: "Phone", labelAr: "رقم الهاتف", type: "tel", required: isRequired, placeholder: "32 XX XX XX", placeholderAr: "32 XX XX XX", pattern: "^[0-9]{8,15}$" };
      case "amountMru":
        return { id: "amountMru", label: "Amount (MRU)", labelAr: "المبلغ (الأوقية)", type: "number", required: isRequired, placeholder: "MRU", placeholderAr: "أوقية جديدة (MRU)", pattern: "^[0-9]+$" };
      case "cardId":
        return { id: "cardId", label: "Card ID", labelAr: "رقم البطاقة", type: "text", required: isRequired, pattern: "^[0-9A-Za-z]+$" };
      case "pageLink":
        return { id: "pageLink", label: "Page Link", labelAr: "رابط الصفحة", type: "text", required: isRequired, placeholder: "https://...", placeholderAr: "https://...", pattern: "^https://.*$" };
      case "profileLink":
        return { id: "profileLink", label: "Profile Link", labelAr: "رابط الحساب", type: "text", required: isRequired, placeholder: "https://...", placeholderAr: "https://...", pattern: "^https://.*$" };
      case "objective":
        return { id: "objective", label: "Objective", labelAr: "هدف الحملة", type: "text", required: isRequired };
      case "budgetMru":
        return { id: "budgetMru", label: "Budget (MRU)", labelAr: "الميزانية (الأوقية)", type: "number", required: isRequired, placeholder: "MRU", placeholderAr: "أوقية جديدة (MRU)", pattern: "^[0-9]+$" };
      case "appleIdEmail":
        return { id: "appleIdEmail", label: "Apple ID Email", labelAr: "بريد Apple ID", type: "email", required: isRequired, placeholder: "email@icloud.com", placeholderAr: "email@icloud.com", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" };
      case "note":
        return { id: "note", label: "Note", labelAr: "ملاحظة إضافية", type: "text", required: isRequired, placeholder: "...", placeholderAr: "..." };
      default:
        return { id: fieldId, label: fieldId, labelAr: fieldId, type: "text", required: isRequired };
    }
  });
}

export default function OrderForm({ preSelectedServiceId }: { preSelectedServiceId?: string }) {
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const serviceId = preSelectedServiceId || searchParams.get("service") || "";

  const setServiceId = (id: string) => {
    if (preSelectedServiceId) {
      if (!id) {
        navigate('/services');
      }
      return; 
    }
    if (id) {
      searchParams.set("service", id);
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.delete("service");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [amount, setAmount] = useState<string>("500");

  const [sender, setSender] = useState("");
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderSubmittedSuccess, setOrderSubmittedSuccess] = useState(false);
  const [submittedOrderInfo, setSubmittedOrderInfo] = useState<{ 
    orderId?: string;
    trackingToken?: string;
    serviceName: string; 
    amount: number; 
    paymentMethod: string;
    trackingUrl?: string;
    isGuest?: boolean;
  } | null>(null);

  // Stable cryptographic attempt ID generated once per order draft, reused on retries
  const [attemptId, setAttemptId] = useState<string>(() => {
    return 'att_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 12);
  });
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsMap>(DEFAULT_PAYMENT_CONFIGS);
  const [paymentMethod, setPaymentMethod] = useState<"bankily" | "sadad" | string>("bankily");
  const [copied, setCopied] = useState(false);

  const [receiptDragging, setReceiptDragging] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [isFormImagePreviewOpen, setIsFormImagePreviewOpen] = useState(false);

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isPaymentFromCache, setIsPaymentFromCache] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Subscribe to real-time payment settings (Bankily, Sadad, GazaPay)
  useEffect(() => {
    const unsubscribe = subscribePaymentSettings((data, fromCache) => {
      setPaymentSettings(data);
      if (fromCache !== undefined) {
        setIsPaymentFromCache(fromCache);
      }
    });
    return () => unsubscribe();
  }, []);

  // If currently selected payment method becomes disabled, auto-switch to first available
  useEffect(() => {
    const current = paymentSettings[paymentMethod];
    if (current && current.enabled === false) {
      const firstEnabled = Object.values(paymentSettings).find((m) => m.enabled !== false);
      if (firstEnabled) {
        setPaymentMethod(firstEnabled.id);
      }
    }
  }, [paymentSettings, paymentMethod]);

  const PAYMENT_POSTS = useMemo(() => {
    const list: any[] = [];
    
    Object.entries(paymentSettings).forEach(([key, config]) => {
      // If PayPal is not configured or disabled, do not show to customer
      if (key === 'paypal' && (config.integrationStatus === 'not_configured' || config.enabled === false)) {
        return;
      }

      let logo = config.logoUrl || null;
      if (!logo) {
        if (key === 'bankily') logo = bankilyLogoImg;
        else if (key === 'sadad') logo = sadadLogoImg;
        else if (key === 'gaza') logo = gazaLogoImg;
      }

      list.push({
        id: key,
        logo,
        label: config.label || key,
        labelAr: config.labelAr || key,
        desc: config.descFr || config.label || key,
        descAr: config.descAr || `الدفع عبر ${config.labelAr || key}`,
        active: config.enabled !== false,
        unavailableReasonAr: config.unavailableReasonAr || "غير متوفر حالياً",
        unavailableReasonFr: config.unavailableReasonFr || "Actuellement indisponible",
        phone: config.phone || ""
      });
    });

    // Fallback: if no active methods exist, guarantee bankily is listed
    if (list.length === 0) {
      list.push({
        id: "bankily",
        logo: bankilyLogoImg,
        label: "Bankily",
        labelAr: "بنكيلي",
        desc: "Instant transfer via Bankily app",
        descAr: "الدفع الفوري السريع عبر تطبيق بنكيلي",
        active: true,
        unavailableReasonAr: "غير متوفر حالياً",
        unavailableReasonFr: "Actuellement indisponible",
        phone: "32014902"
      });
    }

    return list;
  }, [paymentSettings]);

  const currentPaymentConfig = paymentSettings[paymentMethod] || paymentSettings.bankily || DEFAULT_PAYMENT_CONFIGS.bankily;

  // Manage receipt object URL preview
  useEffect(() => {
    if (!file) {
      setReceiptPreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setReceiptPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleCopy = async () => {
    const phoneToCopy = (currentPaymentConfig?.phone || (paymentMethod === "sadad" ? "27329380" : "32014902")).trim().replace(/\s+/g, "");
    const formattedDisplay = formatNumberSpacing(phoneToCopy);
    try {
      await navigator.clipboard.writeText(phoneToCopy);
      haptic.medium();
      setCopied(true);
      showToast(
        language === 'ar' 
          ? `تم نسخ رقم التحويل (${formattedDisplay}) بنجاح` 
          : `Numéro de transfert (${formattedDisplay}) copié avec succès`,
        'success'
      );
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn("Clipboard write failed, fallbacking:", err);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const [dbServices, setDbServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const cached = cacheService.get<Service[]>("db_services");
      if (cached) {
        setDbServices(cached);
        return;
      }
      
      const q = query(collection(db, "services"), orderBy("updatedAt", "desc"));
      try {
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            nameAr: data.nameAr || data.name,
            nameFr: data.nameFr || data.name,
            descriptionFr: data.descriptionFr || data.description || '',
            suggestedPrice: data.priceMru || data.suggestedPrice || data.price || 0,
          } as Service;
        });
        setDbServices(docs);
        cacheService.set("db_services", docs);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "services");
      }
    };
    fetchData();
  }, []);

  const allServices = useMemo(() => {
    const merged: Service[] = [];

    const isDeletedService = (item: any) => {
      if (!item) return false;
      return item.status === 'Deleted' || item.status === 'deleted' || item.isDeleted === true;
    };

    SERVICES.forEach(s => {
      const dbMatching = dbServices.find(dbS => dbS.id === s.id);
      if (dbMatching) {
        if (!isDeletedService(dbMatching)) {
          const reqFields = dbMatching.requiredFields || s.requiredFields || [];
          const optFields = dbMatching.optionalFields || s.optionalFields || [];
          const { resolvedImage, resolvedImageUrl } = resolveServiceImage(dbMatching, s);

          merged.push({
            ...s,
            ...dbMatching,
            image: resolvedImage,
            imageUrl: resolvedImageUrl,
            priceMru: Number(dbMatching.priceMru ?? dbMatching.price ?? s.priceMru ?? s.suggestedPrice ?? s.minAmount ?? 0),
            imageFit: dbMatching.imageFit || s.imageFit || 'cover',
            imagePadding: dbMatching.imagePadding !== undefined ? Number(dbMatching.imagePadding) : 0,
            status: dbMatching.status || 'نشط',
            requiredFields: reqFields,
            optionalFields: optFields,
            fields: (reqFields.length > 0 || optFields.length > 0) ? getFieldsForService(reqFields, optFields) : (dbMatching.fields || s.fields || []),
            packages: s.packages || [],
            unit: s.unit || dbMatching.unit
          } as Service);
        }
      } else {
        const reqFields = s.requiredFields || [];
        const optFields = s.optionalFields || [];
        merged.push({
          ...s,
          priceMru: Number(s.priceMru ?? s.suggestedPrice ?? s.minAmount ?? 0),
          imageFit: s.imageFit || 'cover',
          imagePadding: 0,
          status: 'نشط',
          requiredFields: reqFields,
          optionalFields: optFields,
          fields: (reqFields.length > 0 || optFields.length > 0) ? getFieldsForService(reqFields, optFields) : (s.fields || []),
          packages: s.packages || [],
        } as Service);
      }
    });

    dbServices.forEach(dbS => {
      const isDefault = SERVICES.some(s => s.id === dbS.id);
      if (!isDefault) {
        if (!isDeletedService(dbS)) {
          const reqFields = dbS.requiredFields || [];
          const optFields = dbS.optionalFields || [];
          const { resolvedImage, resolvedImageUrl } = resolveServiceImage(dbS);

          merged.push({
            id: dbS.id,
            name: dbS.name || '',
            nameAr: dbS.nameAr || dbS.name || '',
            nameFr: dbS.nameFr || dbS.name || '',
            description: dbS.description || '',
            descriptionAr: dbS.descriptionAr || dbS.description || '',
            descriptionFr: dbS.descriptionFr || dbS.description || '',
            image: resolvedImage,
            imageUrl: resolvedImageUrl,
            priceMru: Number(dbS.priceMru || dbS.price || 0),
            badge: dbS.badge || 'خدمات رقمية',
            imageFit: dbS.imageFit || 'cover',
            imagePadding: dbS.imagePadding !== undefined ? Number(dbS.imagePadding) : 0,
            status: dbS.status || 'نشط',
            requiredFields: reqFields,
            optionalFields: optFields,
            fields: (reqFields.length > 0 || optFields.length > 0) ? getFieldsForService(reqFields, optFields) : (dbS.fields || []),
            packages: dbS.packages || [],
            unit: dbS.unit || '',
            order: dbS.order || 0
          } as Service);
        }
      }
    });

    return merged.sort((a, b) => {
      const orderA = (a.order !== undefined && a.order !== null) ? a.order : 999;
      const orderB = (b.order !== undefined && b.order !== null) ? b.order : 999;
      return orderA - orderB;
    });
  }, [dbServices]);

  const service = useMemo(() => {
    return allServices.find((s) => s.id === serviceId);
  }, [serviceId, allServices]);

  // Sync default amount and reset fields automatically on service switch
  useEffect(() => {
    if (service) {
      if (service.packages && Array.isArray(service.packages) && service.packages.length > 0) {
        const validAmounts = service.packages
          .map((p: any) => Number(p.amount))
          .filter((a: number) => !isNaN(a) && a > 0);
        const minPkgAmount = validAmounts.length > 0 ? Math.min(...validAmounts) : service.packages[0].amount;
        setAmount(minPkgAmount.toString());
      } else if (service.pricingMode === "fixed" || (!service.pricingMode && service.priceMru)) {
        setAmount((service.priceMru || service.suggestedPrice || 0).toString());
      } else if (service.pricingMode === "quote") {
        setAmount("0");
      } else if (service.pricingMode === "range") {
        setAmount((service.minAmountMru || service.minAmount || 50).toString());
      } else if (service.pricingMode === "custom") {
        setAmount((service.priceMru || 0).toString() || "50");
      } else {
        setAmount((service.priceMru || service.suggestedPrice || service.minAmount || 50).toString());
      }
      
      const initialFields: Record<string, string> = {};
      service.fields?.forEach(field => {
        initialFields[field.id] = "";
      });
      setFieldValues(initialFields);
    }
    setSender("");
    setRef("");
    setFile(null);
    setMsg("");
  }, [serviceId, service]);

  // Sync fieldValues['amountMru'] with amount state if it exists in fields
  useEffect(() => {
    if (service?.fields?.some(f => f.id === 'amountMru')) {
      setFieldValues(prev => ({ ...prev, amountMru: amount }));
    }
  }, [amount, service]);

  const quantity = useMemo(() => {
    if (!service) return 0;
    return getQuantity(service, Number(amount || 0));
  }, [amount, service]);

  const handleFieldChange = (field: any, val: string) => {
    const isNumeric = field.type === 'number' || field.type === 'tel' || field.id === 'playerId' || field.id === 'gameId' || field.id === 'amountMru' || field.id === 'budgetMru' || field.id === 'phone' || field.id === 'cardId' || field.pattern === '^[0-9]+$';
    if (isNumeric) {
      val = val.replace(/[^0-9]/g, '');
    }
    if (field.maxLength && val.length > field.maxLength) {
      val = val.slice(0, field.maxLength);
    }
    setFieldValues(prev => ({ ...prev, [field.id]: val }));
  };

  const handleFieldBlur = (fieldId: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldId]: true }));
  };

  const handleSenderChange = (value: string) => {
    let cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length > 8) {
      cleaned = cleaned.slice(0, 8);
    }
    setSender(cleaned);
  };

  function validate() {
    if (!service) return "Service not found";

    const rawStatus = (service.status || '').toLowerCase();
    const isServiceUnavailable = service.isDeleted === true || rawStatus === 'deleted' || rawStatus === 'inactive' || rawStatus === 'غير متوفر' || rawStatus === 'متوقف' || rawStatus === 'صيانة' || rawStatus === 'draft' || rawStatus === 'unavailable';
    if (isServiceUnavailable) {
      return language === 'ar' ? "هذه الخدمة غير متوفرة حالياً، لا يمكن استقبال طلبات جديدة لها." : "Ce service est actuellement indisponible.";
    }

    const isQuoteMode = service.pricingMode === "quote";

    if (!isQuoteMode) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return language === 'ar' ? "يرجى إدخال مبلغ صحيح" : "Veuillez entrer un montant valide";
      }

      if (service.pricingMode === "range") {
        const min = service.minAmountMru || 0;
        const max = service.maxAmountMru || Infinity;
        if (numAmount < min || numAmount > max) {
          return "المبلغ خارج النطاق المسموح";
        }
      } else {
        if (service.minAmount && numAmount < service.minAmount) {
          return language === 'ar' 
            ? `الحد الأدنى لهذا الطلب هو ${service.minAmount} MRU` 
            : `Le montant minimum est ${service.minAmount} MRU`;
        }
        if (service.maxAmount && numAmount > service.maxAmount) {
          return language === 'ar' 
            ? `الحد الأقصى لهذا الطلب هو ${service.maxAmount} MRU` 
            : `Le montant maximum est ${service.maxAmount} MRU`;
        }
      }
    }

    if (service.fields) {
      for (const field of service.fields) {
        const val = fieldValues[field.id]?.trim() || "";
        if (field.required && !val) {
          return language === 'ar' ? `${field.labelAr} مطلوب` : `${field.label} est requis`;
        }
        if (field.pattern && val && !new RegExp(field.pattern).test(val)) {
           return language === 'ar' ? `صيغة ${field.labelAr} غير صحيحة` : `Format de ${field.label} invalide`;
        }
        if (field.minLength && val.length < field.minLength) {
          return language === 'ar' 
            ? `${field.labelAr} يجب أن يكون على الأقل ${field.minLength} أرقام` 
            : `${field.label} doit avoir au moins ${field.minLength} chiffres`;
        }
        if (field.maxLength && val.length > field.maxLength) {
           return language === 'ar' 
            ? `${field.labelAr} يجب ألا يتجاوز ${field.maxLength} أرقام` 
            : `${field.label} ne doit pas dépasser ${field.maxLength} chiffres`;
        }
      }
    }

    if (!isQuoteMode) {
      const selectedConfig = paymentSettings[paymentMethod];
      if (selectedConfig && selectedConfig.enabled === false) {
        return language === 'ar'
          ? `طريقة الدفع (${selectedConfig.labelAr || paymentMethod}) غير متوفرة حالياً. يرجى اختيار طريقة دفع أخرى.`
          : `Le mode de paiement sélectionné est actuellement indisponible. Veuillez en choisir un autre.`;
      }

      if (!sender.trim()) return language === 'ar' ? "أدخل رقم المرسل" : "Entrez le numéro de l'expéditeur";
      if (!file) return language === 'ar' ? "أضف صورة الإيصال" : "Ajoutez la capture d'écran";
    }
    
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!service) return;

    if (!isOnline || (typeof navigator !== "undefined" && !navigator.onLine)) {
      haptic.error();
      const offlineMsg = language === 'ar' ? "أنت غير متصل بالإنترنت حالياً. يرجى الاتصال بالإنترنت لإرسال الطلب." : "Vous êtes actuellement hors ligne. Veuillez vous reconnecter.";
      setMsg(offlineMsg);
      showToast(offlineMsg, 'error');
      return;
    }

    haptic.medium();
    const error = validate();
    if (error) {
      haptic.error();
      setMsg(error);
      showToast(error, 'error');
      return;
    }

    setSubmitError("");
    haptic.light();
    setShowConfirmModal(true);
  }

  async function executeSubmit() {
    if (!service) return;

    if (!isOnline || (typeof navigator !== "undefined" && !navigator.onLine)) {
      haptic.error();
      const offlineMsg = language === 'ar' ? "تعذر إرسال الطلب: أنت غير متصل بالإنترنت حالياً. يرجى إعادة الاتصال ثم المحاولة." : "Impossible d'envoyer: Vous êtes hors ligne.";
      setSubmitError(offlineMsg);
      showToast(offlineMsg, 'error');
      return;
    }

    const rawStatus = (service.status || '').toLowerCase();
    const isServiceUnavailable = service.isDeleted === true || rawStatus === 'deleted' || rawStatus === 'inactive' || rawStatus === 'غير متوفر' || rawStatus === 'متوقف' || rawStatus === 'صيانة' || rawStatus === 'draft' || rawStatus === 'unavailable';
    if (isServiceUnavailable) {
      showToast(
        language === 'ar' ? 'عذراً، هذه الخدمة غير متوفرة حالياً ولا يمكن إنشاء طلب جديد لها.' : 'Désolé, ce service est actuellement indisponible.',
        'error'
      );
      haptic.error();
      setShowConfirmModal(false);
      return;
    }

    setLoading(true);
    setSubmitError("");
    setMsg("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    try {
      const isQuoteMode = service.pricingMode === "quote";
      const finalAmount = isQuoteMode ? 0 : Number(amount);
      const isArabic = language === 'ar';
      const serviceName = isArabic ? (service.nameAr || service.name) : (service.nameFr || service.name);

      let uploadedUrl = "";
      if (!isQuoteMode) {
        if (!file) {
          throw new Error(isArabic ? "يرجى إرفاق صورة إيصال الدفع البنكي أولاً" : "Veuillez joindre le reçu");
        }
        if (file.size > 8 * 1024 * 1024) {
          throw new Error(isArabic ? "حجم الصورة كبير جداً، يرجى اختيار صورة أصغر من 8 ميغابايت" : "Image trop grande, veuillez en choisir une plus petite");
        }

        setUploadProgress(15); 
        setProcessingStatus(isArabic ? "جاري تجهيز ورفع صورة الإيصال..." : "Préparation du reçu...");

        // Resilient image compression
        let compressedData = "";
        try {
          compressedData = await compressImage(file, 900, 900, 0.70);
        } catch (compErr) {
          console.warn("compressImage notice:", compErr);
        }

        const payloadForUpload: Blob | File | string = compressedData || file;
        const uploadPath = `receipts/${attemptId}_${Date.now()}.webp`;

        // Upload to durable storage; strictly throws on failure
        uploadedUrl = await uploadFileWithProgress(payloadForUpload, uploadPath, (percent) => {
          setUploadProgress(Math.min(95, Math.max(15, percent)));
        });

        if (!uploadedUrl || uploadedUrl === "receipt_attached" || uploadedUrl.startsWith("data:")) {
          throw new Error(isArabic ? "تعذر تأكيد رفع إيصال الدفع. يرجى إعادة المحاولة." : "Échec du téléchargement du reçu");
        }
        setUploadProgress(100);
      }

      setProcessingStatus(isArabic ? "جاري التحقق وتأكيد الطلب عبر الخادم..." : "Validation du serveur...");

      // Get authenticated Firebase ID token if user is signed in
      let idToken: string | null = null;
      if (user) {
        try {
          idToken = await user.getIdToken();
        } catch (tokenErr) {
          console.warn("[Auth] Could not get fresh ID token:", tokenErr);
        }
      }

      // Authoritative server order creation
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          serviceId: service.id,
          amount: finalAmount,
          fields: fieldValues,
          paymentMethod: isQuoteMode ? "quote" : paymentMethod,
          senderPhone: isQuoteMode ? "" : sender,
          proofImageUrl: uploadedUrl,
          attemptId: attemptId,
          guestEmail: user ? undefined : guestEmail,
          guestName: user ? undefined : guestName
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error(isArabic ? "انتهت صلاحية جلسة تسجيل الدخول. يرجى تسجيل الدخول مجدداً أو إتمام الطلب كزائر." : "Session expirée.");
        }
        throw new Error(errorData.message || (isArabic ? "تعذر إرسال الطلب إلى الخادم" : "Échec de l'envoi de la commande"));
      }

      const result = await response.json();
      if (!result.success || !result.orderId) {
        throw new Error(isArabic ? "لم يتم استلام تأكيد حفظ الطلب من الخادم" : "Confirmation de commande invalide");
      }

      const orderId = result.orderId;
      const trackingToken = result.trackingToken;
      const isGuest = !user;

      setProcessingStatus(isArabic ? "تم الإرسال بنجاح! 🎉" : "Succès! 🎉");

      setSubmittedOrderInfo({
        orderId,
        trackingToken: isGuest ? trackingToken : undefined,
        serviceName,
        amount: finalAmount,
        paymentMethod: isQuoteMode ? (isArabic ? 'طلب تسعيرة' : 'Devis') : paymentMethod,
        trackingUrl: result.trackingUrl || (isGuest ? `/orders?token=${trackingToken}` : `/orders`),
        isGuest: isGuest
      });

      // Save guest order tracking info to localStorage for easy retrieval
      if (isGuest && trackingToken) {
        try {
          const guestOrders = JSON.parse(localStorage.getItem("mauritop_guest_orders") || "[]");
          guestOrders.unshift({
            orderId: orderId,
            trackingToken: trackingToken,
            serviceName,
            amount: finalAmount,
            date: new Date().toISOString()
          });
          localStorage.setItem("mauritop_guest_orders", JSON.stringify(guestOrders.slice(0, 20)));
        } catch (e) {
          console.warn("Could not save guest order to localStorage:", e);
        }
      }

      setShowConfirmModal(false);
      setOrderSubmittedSuccess(true);

      const successMessage = isArabic
        ? `🎉 تم إرسال طلب شحن (${serviceName}) بنجاح! رقم الطلب #${(orderId || '').slice(0, 8).toUpperCase()}`
        : `🎉 Demande (${serviceName}) envoyée avec succès ! N° ${(orderId || '').slice(0, 8).toUpperCase()}`;

      showToast(successMessage, 'success');
      haptic.success();
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 } });

      // Generate fresh attemptId for subsequent orders
      setAttemptId('att_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 12));

      // Auto-redirect if authenticated user
      if (user) {
        setTimeout(() => {
          navigate('/orders');
        }, 3600);
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Order submit error:", err);
      haptic.error();
      const errorMessage = err.name === 'AbortError'
        ? (language === 'ar' ? "انتهت مهلة الاتصال بالخادم. إذا كنت قد أرسلت الطلب بالفعل، فلن يتكرر، يرجى التحقق من طلباتك." : "Délai de connexion dépassé.")
        : (err.message || (language === 'ar'
            ? "❌ تعذر إرسال الطلب في الوقت الحالي. يرجى التحقق من الاتصال وإعادة المحاولة."
            : "❌ Échec de la soumission de la commande."));
      setSubmitError(errorMessage);
      showToast(errorMessage, 'error');
      setMsg(errorMessage);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  const StepBadge = ({ num }: { num: number }) => (
    <span className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center justify-center shrink-0 shadow-sm">
      {num}
    </span>
  );

  return (
    <section id="order" className={`max-w-5xl mx-auto py-12 px-4 mt-8 ${language === 'ar' ? 'text-right' : 'text-left'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {serviceId && !service ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center min-h-[300px] border border-border-light rounded-3xl relative">
          <div className="absolute -top-4.5 left-1/2 -translate-x-1/2 w-9 h-9 bg-primary-main rounded-xl flex items-center justify-center text-main-bg font-black text-sm z-20 border border-primary-main/20">
            ⌛
          </div>
          <p className="text-text-primary text-base font-black uppercase tracking-wider mb-4 pt-4">
            {language === 'ar' ? 'جاري تحميل تفاصيل الخدمة...' : 'Chargement des détails du service...'}
          </p>
          <button 
            type="button" 
            onClick={() => { haptic.light(); setServiceId(""); }} 
            className="text-primary-main font-black text-sm hover:underline transition-all"
          >
            {language === 'ar' ? '← العودة لاختيار الخدمات' : '← Revenir à la sélection'}
          </button>
        </div>
      ) : !serviceId ? (
        <div className="glass-card p-6 sm:p-10 rounded-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-text-primary mb-4">
              {language === 'ar' ? 'اختر الخدمة المطلوبة' : 'Choisissez le service'}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {allServices.filter(s => s.status !== 'مسودة' && s.status !== 'Draft' && s.status !== 'draft' && s.status !== 'متوقف' && s.status !== 'متوقفة').map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                aria-label={language === 'ar' ? `اختر خدمة ${s.nameAr || s.name}` : `Sélectionner le service ${s.nameFr || s.name}`}
                onClick={() => { haptic.light(); setServiceId(s.id); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    haptic.light();
                    setServiceId(s.id);
                  }
                }}
                className="glass-card group overflow-hidden rounded-2xl cursor-pointer hover:border-primary-main/50 transition-all flex flex-col h-full bg-card-bg/40 focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none"
              >
                <div className="w-full h-48 bg-main-bg overflow-hidden relative">
                  {(s.id !== 'pubg' && s.id !== 'freefire' && s.imageFit === 'contain') ? (
                    <>
                      <div
                        className="absolute inset-0 w-full h-full bg-main-bg pointer-events-none"
                      />
                      <img
                        src={s.image || null}
                        alt={s.name}
                        loading="lazy"
                        className="absolute inset-x-0 inset-y-0 m-auto w-full h-full object-contain z-10 group-hover:scale-105 transition-all duration-500"
                        style={{
                          padding: s.imagePadding ? `${Math.min(s.imagePadding, 16)}px` : '10px'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.failed) {
                            target.dataset.failed = 'true';
                            target.src = getFallbackServiceImage(s.nameAr || s.name || '', s.id);
                          } else {
                            target.style.display = 'none';
                          }
                        }}
                      />
                    </>
                  ) : (
                    <img
                      src={s.image || null}
                      alt={s.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      style={{
                        padding: (s.id === 'pubg' || s.id === 'freefire') ? '0px' : (s.imagePadding ? `${Math.min(s.imagePadding, 16)}px` : '0px')
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.failed) {
                          target.dataset.failed = 'true';
                          target.src = getFallbackServiceImage(s.nameAr || s.name || '', s.id);
                        } else {
                          target.style.display = 'none';
                        }
                      }}
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-main-bg/40 to-transparent pointer-events-none z-10" />
                </div>
                <div className="p-3 text-center flex-1 flex flex-col justify-center min-h-[50px]">
                  <h3 className="font-black bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent text-xs sm:text-sm line-clamp-2 leading-snug tracking-normal break-words group-hover:from-[#1ECAD3] group-hover:to-cyan-200 transition-all duration-300 dir-auto">
                    {language === 'ar' ? (s.nameAr || s.name) : (s.nameFr || s.name)}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3 sm:space-y-4"
        >
          {/* Header Card / كارت ملخص الخدمة المختارة */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden border border-white/10 bg-[#0B1220]/90">
            <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
            <div className={cn(
              "relative bg-[#070B14] rounded-2xl overflow-hidden w-16 h-16 sm:w-20 sm:h-20 shrink-0 border border-[#243247] flex items-center justify-center shadow-lg",
              (service.imageFit === 'contain' && !service.id.toLowerCase().includes('pubg') && !service.id.toLowerCase().includes('freefire')) ? "p-1.5" : "p-0"
            )}>
              {service.imageFit === 'contain' ? (
                <>
                  <div className="absolute inset-0 w-full h-full bg-[#050811]" />
                  <img 
                    src={service.image || null} 
                    loading="lazy"
                    className="absolute inset-x-0 inset-y-0 m-auto w-full h-full object-contain z-10"
                    style={{
                      padding: service.imagePadding ? `${Math.min(Math.floor(service.imagePadding / 2), 12)}px` : (service.id.toLowerCase().includes('pubg') || service.id.toLowerCase().includes('freefire') ? '0px' : '4px')
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.failed) {
                        target.dataset.failed = 'true';
                        target.src = getFallbackServiceImage(service.nameAr || service.name || '', service.id);
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                  />
                </>
              ) : (
                <img 
                  src={service.image || null} 
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    padding: (service.id.toLowerCase().includes('pubg') || service.id.toLowerCase().includes('freefire')) ? '0px' : (service.imagePadding ? `${Math.min(Math.floor(service.imagePadding / 2), 12)}px` : '0px')
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.failed) {
                      target.dataset.failed = 'true';
                      target.src = getFallbackServiceImage(service.nameAr || service.name || '', service.id);
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                />
              )}
            </div>
              
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase inline-block mb-1">
                  {service.badge || (language === 'ar' ? "خدمة رقمية" : "Service Digital")}
                </span>
                <h1 className="text-sm sm:text-base font-black text-white truncate">
                  {language === 'ar' ? 'شحن' : 'Recharge'} {language === 'ar' ? (service.nameAr || service.name) : (service.nameFr || service.name)}
                </h1>
                <p className="text-[11px] text-slate-400 truncate max-w-sm">
                  {language === 'ar' ? (service.descriptionAr || service.description) : (service.descriptionFr || service.description || service.descriptionAr || service.description)}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
              <button 
                type="button" 
                onClick={() => { haptic.light(); setServiceId(""); }} 
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {language === 'ar' ? '← اختيار خدمة أخرى' : '← Changer'}
              </button>
              {service.pricingMode !== "quote" && Number(amount) > 0 && (
                <div className="text-left rtl:text-right bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                  <span className="text-xs sm:text-sm font-mono font-black text-emerald-400">
                    {amount} <span className="text-[10px] text-emerald-300 font-sans">MRU</span>
                  </span>
                </div>
              )}
            </div>
          </div>

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-3 sm:space-y-4 relative w-full pb-32 sm:pb-24">
              <fieldset disabled={loading} className="space-y-3 sm:space-y-4 w-full">
                {!user && (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 font-medium">
                        {language === 'ar' ? 'يمكنك الشحن الفوري كزائر أو تسجيل الدخول لحفظ الطلبات بملفك.' : 'Commander en tant qu\'invité ou se connecter.'}
                      </span>
                    </div>
                    <Link to="/login" className="px-3 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-xl font-bold shrink-0 transition-colors">
                      {language === 'ar' ? 'دخول' : 'Connexion'}
                    </Link>
                  </div>
                )}
                {/* Step 1: User details / الخطوة 1: البيانات المطلوبة */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="glass-card rounded-2xl p-4 sm:p-5 relative border border-white/10 bg-[#0B1220]/90 space-y-4"
                >
                  <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                    <StepBadge num={1} />
                    <UserCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                    <h2 className="text-sm sm:text-base font-black text-white">
                      {language === 'ar' ? 'أدخل معلومات الحساب والشحن' : 'Informations du compte'}
                    </h2>
                  </div>

                    <div className="space-y-5">
                      {service.fields?.filter(f => f.id !== 'amountMru').map((field) => {
                        const isSelect = field.type === 'select';
                        const isNumeric = field.type === 'number' || field.type === 'tel' || field.id === 'playerId' || field.id === 'gameId' || field.id === 'amountMru' || field.id === 'budgetMru' || field.id === 'phone' || field.id === 'cardId' || field.pattern === '^[0-9]+$';
                        const val = fieldValues[field.id] || "";
                        const isTooShort = field.minLength ? val.length < field.minLength : false;
                        const isInvalid = field.pattern && val && !new RegExp(field.pattern).test(val);
                        const showErrors = touchedFields[field.id] && (isTooShort || isInvalid || (field.required && !val));

                        return (
                          <div key={field.id} className="space-y-2 relative">
                            <label htmlFor={`field-${field.id}`} className="text-xs font-black text-text-secondary flex items-center gap-1.5 uppercase tracking-wider">
                              <span>{language === 'ar' ? field.labelAr : field.label}</span>
                              {field.required && <span className="text-red-500 font-bold">*</span>}
                            </label>

                            {isSelect ? (
                              <div className="relative">
                                <select
                                  id={`field-${field.id}`}
                                  value={val}
                                  aria-required={field.required}
                                  aria-invalid={showErrors ? true : false}
                                  onChange={(e) => handleFieldChange(field, e.target.value)}
                                  onBlur={() => handleFieldBlur(field.id)}
                                  className={cn(
                                    "input-field py-4 w-full bg-card-bg/60 border text-text-primary rounded-xl focus:border-primary-main focus:bg-main-bg/80 focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none transition-all outline-none text-xs sm:text-sm font-bold",
                                    showErrors ? "border-red-500/50 focus:border-red-500" : "border-border-light hover:border-primary-main/20"
                                  )}
                                >
                                  <option value="" className="bg-main-bg">
                                    {language === 'ar' ? '-- اختر خياراً --' : '-- Choisir une option --'}
                                  </option>
                                  {field.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-main-bg">
                                      {language === 'ar' ? (opt.labelAr || opt.label) : opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="relative">
                                <input 
                                  id={`field-${field.id}`}
                                  type={field.type || "text"}
                                  pattern={isNumeric ? "[0-9]*" : undefined}
                                  inputMode={isNumeric ? "numeric" : field.type === 'email' ? 'email' : undefined}
                                  placeholder={language === 'ar' ? (field.placeholderAr || field.placeholder) : field.placeholder}
                                  value={val} 
                                  aria-required={field.required}
                                  aria-invalid={showErrors ? true : false}
                                  onChange={(e) => handleFieldChange(field, e.target.value)} 
                                  onBlur={() => handleFieldBlur(field.id)}
                                  className={cn(
                                    "input-field py-4 w-full bg-card-bg/60 text-text-primary transition-all rounded-xl border focus:border-primary-main focus:bg-main-bg/80 focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none text-xs sm:text-sm font-bold outline-none",
                                    showErrors ? "border-red-500/50 focus:border-red-500" : "border-border-light hover:border-primary-main/20",
                                    (field.minLength || field.maxLength) ? "pr-20 pl-4" : "px-4"
                                  )} 
                                />
                                {(field.minLength || field.maxLength) && (
                                  <span className={cn(
                                    "absolute top-1/2 -translate-y-1/2 text-[9px] font-mono font-black px-2 py-1 rounded bg-[#0a0f19] border border-white/5",
                                    language === 'ar' ? 'left-4' : 'right-4',
                                    showErrors ? "text-red-400 border-red-500/20" : "text-text-secondary"
                                  )}>
                                    {val.length}
                                    {field.maxLength ? `/${field.maxLength}` : field.minLength ? ` (>${field.minLength})` : ''}
                                  </span>
                                )}
                                {showErrors && <AlertCircle className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-red-400", language === 'ar' ? 'left-16' : 'right-16')} />}
                              </div>
                            )}

                            <AnimatePresence>
                              {showErrors && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="space-y-1 overflow-hidden"
                                >
                                  {field.required && !val && (
                                    <p className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-1">
                                      <AlertCircle className="w-3 h-3" />
                                      {language === 'ar' ? 'هذا الحقل مطلوب' : 'Ce champ est requis'}
                                    </p>
                                  )}
                                  {field.minLength && val && val.length < field.minLength && (
                                    <p className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-1">
                                      <AlertCircle className="w-3 h-3" />
                                      {language === 'ar' 
                                        ? `يتطلب على الأقل ${field.minLength} أرقام/حروف` 
                                        : `Requis au moins ${field.minLength} caractères`}
                                    </p>
                                  )}
                                  {isInvalid && val && (
                                    <p className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-1">
                                      <AlertCircle className="w-3 h-3" />
                                      {language === 'ar' ? `صيغة ${field.labelAr} غير صحيحة` : `Format invalide`}
                                    </p>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {isNumeric && !isSelect && !isInvalid && !showErrors && (
                              <p className="text-[9px] text-text-secondary">
                                {language === 'ar' ? 'مسموح بالأرقام فقط' : 'Chiffres uniquement'}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                </motion.div>

                {/* Step 2: Choose amount or packages / الخطوة 2: اختيار الباقة أو كتابة المبلغ */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="glass-card rounded-2xl p-4 sm:p-5 relative border border-white/10 bg-[#0B1220]/90 space-y-4"
                >
                  <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                    <StepBadge num={2} />
                    <ShoppingBag className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                    <h2 className="text-sm sm:text-base font-black text-white">
                      {language === 'ar' ? 'حدد باقة الشحن أو القيمة المطلوبة' : 'Montant de recharge'}
                    </h2>
                  </div>
                  
                  {service.pricingMode === "fixed" || (!service.pricingMode && service.priceMru && (!service.packages || service.packages.length === 0)) ? (
                    <div>
                      <div className="flex items-center gap-3 border-b border-border-light pb-4 mb-4">
                        <ShoppingBag className="w-5 h-5 text-[#1ECAD3]" />
                        <h2 className="text-base font-black text-text-primary">
                          {language === 'ar' ? 'سعر الخدمة الثابت' : 'Tarif de la recharge'}
                        </h2>
                      </div>
                      <div className="bg-main-bg border border-border-light/80 rounded-2xl p-6 text-center shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary-main/5 via-transparent to-transparent pointer-events-none" />
                        <span className="text-[10px] font-black text-[#1ECAD3] bg-[#1ECAD3]/10 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-3">
                          {language === 'ar' ? 'السعر الثابت للشحن بالكامل' : 'Prix unique pour la recharge'}
                        </span>
                        <div className="text-4xl font-black text-primary-main font-mono tracking-tight">{service.priceMru} MRU</div>
                      </div>
                    </div>
                  ) : service.pricingMode === "range" ? (
                    <div className="space-y-6 pt-2">
                      <div className="flex items-center gap-3 border-b border-border-light pb-4">
                        <ShoppingBag className="w-5 h-5 text-[#1ECAD3]" />
                        <h2 className="text-base font-black text-text-primary">
                          {language === 'ar' ? 'حدد قيمة الشحن المطلوبة' : 'Montant de recharge'}
                        </h2>
                      </div>
                      
                      <div className="space-y-4">
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {language === 'ar' ? 'اختر قيمة جاهزة من المقترحات أدناه أو اكتب المبلغ المطلوب بدقة:' : 'Sélectionnez un montant suggéré ou saisissez la valeur exacte :'}
                        </p>
                        
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {[50, 100, 200, 300, 500, 1000].map(val => {
                            const min = service.minAmountMru || 0;
                            const max = service.maxAmountMru || Infinity;
                            if (val >= min && val <= max) {
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={loading}
                                  aria-pressed={Number(amount) === val}
                                  onClick={() => { haptic.light(); setAmount(val.toString()); }}
                                  className={cn(
                                    "py-2.5 px-1 rounded-xl text-xs font-black transition-all border duration-300 focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none",
                                    Number(amount) === val 
                                      ? "bg-primary-main text-main-bg border-primary-main shadow-lg shadow-primary-main/20 scale-105" 
                                      : "bg-card-bg text-text-secondary border-border-light hover:border-primary-main/30 hover:text-text-primary"
                                  )}
                                >
                                  {val} MRU
                                </button>
                              );
                            }
                            return null;
                          })}
                        </div>
                        
                        <div className="relative">
                          <input
                            type="number"
                            name="amountMru"
                            required
                            min={service.minAmountMru}
                            max={service.maxAmountMru}
                            step={1}
                            value={amount}
                            onChange={(e) => {
                              let val = e.target.value.replace(/[^0-9]/g, '');
                              setAmount(val);
                            }}
                            placeholder={`بين ${service.minAmountMru} و ${service.maxAmountMru} MRU`}
                            className="w-full rounded-2xl border px-4 py-4 bg-card-bg text-center text-2xl font-black border-border-light text-primary-main outline-none focus:border-primary-main focus:bg-main-bg/50 transition-all font-mono"
                          />
                          <span className={cn(
                            "absolute top-1/2 -translate-y-1/2 font-black text-xs text-text-secondary",
                            language === 'ar' ? 'left-6' : 'right-6'
                          )}>MRU</span>
                        </div>
                        
                        {(Number(amount || 0) > 0 && (Number(amount || 0) < (service.minAmountMru || 0) || Number(amount || 0) > (service.maxAmountMru || Infinity))) && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <p className="text-xs text-red-400 font-bold leading-none">
                              {language === 'ar' 
                                ? `المبلغ يجب أن يكون بين ${service.minAmountMru} و ${service.maxAmountMru} أوقية` 
                                : `Le montant doit être compris entre ${service.minAmountMru} et ${service.maxAmountMru} MRU`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : service.pricingMode === "quote" ? (
                    <div className="pt-2">
                      <div className="flex items-center gap-3 border-b border-border-light pb-4 mb-4">
                        <ShoppingBag className="w-5 h-5 text-amber-500" />
                        <h2 className="text-base font-black text-text-primary">
                          {language === 'ar' ? 'طلب عرض تسعير مخصص' : 'Demande de devis'}
                        </h2>
                      </div>
                      <div className="bg-main-bg border border-border-light/80 rounded-2xl p-6 text-center relative overflow-hidden">
                        <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-wider block mb-3 mx-auto w-fit">
                          {language === 'ar' ? 'نوع التسعير' : 'Récapitulatif de tarification'}
                        </span>
                        <span className="text-xl font-black text-amber-500 block mb-2">
                          {language === 'ar' ? 'طلب عرض سعر مخصص' : 'Tarif sur devis'}
                        </span>
                        <p className="text-text-secondary text-xs leading-relaxed max-w-md mx-auto">
                          {language === 'ar' 
                            ? 'سيتم مراجعة بيانات الشحن والمستندات الخاصة بك من قبل الإدارة لتقديم عرض سعر مناسب وسيصلك إشعار بالنتيجة فورًا.' 
                            : 'Traitement de votre demande et devis estimé par l\'administrateur par la suite.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 pt-2">
                      <div className="flex items-center gap-3 border-b border-border-light pb-4">
                        <ShoppingBag className="w-5 h-5 text-[#1ECAD3]" />
                        <h2 className="text-base font-black text-text-primary">
                          {language === 'ar' ? 'اختر الباقة أو حدد القيمة المخصصة' : 'Sélection de la recharge'}
                        </h2>
                      </div>
                      
                      {service.packages && service.packages.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs text-text-secondary font-bold">
                            {language === 'ar' ? 'الباقات المتوفرة:' : 'Forfaits disponibles :'}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                             {service.packages.map((pkg, idx) => {
                               const isSelected = Number(amount) === pkg.amount;
                               return (
                                 <button 
                                   key={idx} 
                                   type="button" 
                                   disabled={loading}
                                   aria-pressed={isSelected}
                                   aria-label={language === 'ar' ? `باقة ${pkg.quantity} بقيمة ${pkg.amount} أوقية` : `Forfait ${pkg.quantity} pour ${pkg.amount} MRU`}
                                   onClick={() => {
                                     haptic.light();
                                     setAmount(pkg.amount.toString());
                                   }}
                                   className={cn(
                                     "p-2.5 rounded-lg border transition-all duration-300 text-center flex flex-col items-center justify-center gap-1 relative overflow-hidden focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none", 
                                     isSelected 
                                       ? "border-primary-main bg-primary-main/5 shadow-lg shadow-primary-main/5 scale-[1.03]" 
                                       : "border-border-light bg-card-bg/50 hover:border-primary-main/30 hover:bg-card-bg/80"
                                   )}
                                 >
                                    {isSelected && (
                                      <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-primary-main animate-pulse" />
                                    )}
                                    <span className="text-sm font-black text-text-primary block leading-none">{pkg.quantity}</span>
                                    <span className="text-[9px] text-text-secondary font-black bg-[#0a0f19] border border-white/5 px-1.5 py-0.5 rounded-full">{pkg.amount} MRU</span>
                                 </button>
                               );
                             })}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-3 pt-2">
                        <label htmlFor="custom-amount-input" className="text-xs font-black text-text-secondary uppercase tracking-wider block">
                           {language === 'ar' ? 'أو أدخل مبلغاً مخصصاً (بالأوقية MRU):' : 'Ou saisissez un montant personnalisé (MRU) :'}
                        </label>
                        
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2">
                          {[50, 100, 200, 300, 500, 1000].map(val => {
                            const min = service.minAmount || 0;
                            const max = service.maxAmount || Infinity;
                            if (val >= min && val <= max) {
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={loading}
                                  aria-pressed={Number(amount) === val}
                                  onClick={() => { haptic.light(); setAmount(val.toString()); }}
                                  className={cn(
                                    "py-1 px-0.5 rounded-md text-[9px] font-black transition-all border duration-300 focus-visible:ring-2 focus-visible:ring-primary-main focus-visible:outline-none",
                                    Number(amount) === val 
                                      ? "bg-primary-main text-main-bg border-primary-main scale-105" 
                                      : "bg-card-bg text-text-secondary border-border-light hover:border-primary-main/20 hover:text-text-primary"
                                  )}
                                >
                                  {val} MRU
                                </button>
                              );
                            }
                            return null;
                          })}
                        </div>

                        <div className="relative">
                           <input 
                             type="number" 
                             value={amount} 
                             onChange={(e) => {
                               let val = e.target.value.replace(/[^0-9]/g, '');
                               setAmount(val);
                             }} 
                             className="w-full text-center py-4 bg-card-bg/60 border border-border-light text-2xl sm:text-3xl font-black rounded-2xl text-primary-main outline-none focus:border-primary-main focus:bg-main-bg/50 transition-all font-mono" 
                             min={service.minAmount || 1}
                             max={service.maxAmount}
                           />
                           <span className={cn(
                             "absolute top-1/2 -translate-y-1/2 text-text-secondary font-black text-xs",
                             language === 'ar' ? 'left-6' : 'right-6'
                           )}>MRU</span>
                        </div>
                        
                        {(service.minAmount || service.maxAmount) && (
                          <p className="text-[10px] text-text-secondary bg-[#0a0f19] px-3 py-1 rounded border border-white/5 w-fit">
                            {language === 'ar' 
                              ? `الحدود المسموحة: من ${service.minAmount || 1} إلى ${service.maxAmount || 'غير محدود'} MRU` 
                              : `Limites: de ${service.minAmount || 1} à ${service.maxAmount || 'illimité'} MRU`}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Step 3: Payment method / الخطوة 3: اختيار طريقة التحويل والدفع */}
                {service.pricingMode !== "quote" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="glass-card rounded-2xl p-4 sm:p-5 relative border border-white/10 bg-[#0B1220]/90 space-y-4"
                  >
                     <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
                       <StepBadge num={3} />
                       <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                       <h2 className="text-sm sm:text-base font-black text-white">
                         {language === 'ar' ? 'اختر طريقة التحويل' : 'Sélectionnez le mode de paiement'}
                       </h2>
                     </div>
                        
                     {/* 2-Column Mobile Grid: Row 1 = Bankily, Sedad; Row 2 = GazaPay centered with same width; sm:grid-cols-3 */}
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
                        {(() => {
                          const renderPaymentCard = (p: typeof PAYMENT_POSTS[0]) => {
                            const isSel = paymentMethod === p.id;
                            const isBankily = p.id === "bankily";
                            const isSadad = p.id === "sadad";
                            const isGaza = p.id === "gaza";

                            return (
                              <button 
                                key={p.id} 
                                type="button" 
                                disabled={loading}
                                aria-pressed={isSel}
                                aria-label={language === 'ar' ? `طريقة الدفع ${p.labelAr}` : `Mode de paiement ${p.label}`}
                                onClick={() => {
                                  if (p.active) {
                                    haptic.light();
                                    setPaymentMethod(p.id);
                                  } else {
                                    haptic.error();
                                    const alternative = PAYMENT_POSTS.find(m => m.active && m.id !== p.id);
                                    const altName = alternative ? (language === 'ar' ? alternative.labelAr : alternative.label) : '';
                                    showToast(
                                      language === 'ar' 
                                        ? `تطبيق ${p.labelAr} في وضع الصيانة مؤقتاً (${p.unavailableReasonAr || 'صيانة'}). ${altName ? `يمكنك اختيار ${altName} للشحن الفوري.` : ''}` 
                                        : `Le service ${p.label} est en maintenance. ${altName ? `Veuillez choisir ${altName}.` : ''}`, 
                                      "error"
                                    );
                                  }
                                }} 
                                className={cn(
                                  "group relative p-3 sm:p-3.5 rounded-[18px] border transition-all duration-300 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none flex flex-col items-center justify-between min-h-[150px] sm:min-h-[160px] overflow-hidden", 
                                  !p.active && "bg-[#080d18] border-slate-800 opacity-60 grayscale cursor-not-allowed shadow-none",
                                  !isSel && p.active && "bg-[#0B1120] border-[#243247] hover:border-slate-500 hover:bg-[#10192b]",
                                  isSel && "border-[#10B981] bg-[#10B981]/10 shadow-[0_0_25px_rgba(16,185,129,0.2)] ring-1 ring-[#10B981]/50 scale-[1.02]"
                                )}
                              >
                                {/* Header Checkbox & Tag */}
                                <div className="w-full flex justify-between items-center shrink-0">
                                  <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded",
                                    isSel ? "text-emerald-300 bg-emerald-500/20" : "text-slate-400 bg-white/5"
                                  )}>
                                    {isBankily ? 'BPM' : isSadad ? 'BIM' : 'WALLET'}
                                  </span>
                                  <div className={cn(
                                    "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                    isSel 
                                      ? "border-emerald-400 bg-emerald-400 text-slate-950" 
                                      : "border-white/20 bg-black/20"
                                  )}>
                                    {isSel && <CheckCircle2 size={11} className="stroke-[3.5]" />}
                                  </div>
                                </div>

                                {/* Logo Stage: 116-132px wide, 64-76px high with dedicated plate */}
                                <div className={cn(
                                  "w-full h-16 sm:h-20 flex items-center justify-center p-1.5 my-1 rounded-xl transition-all",
                                  isGaza 
                                    ? "bg-[#070B14] border border-[#243247]" 
                                    : "bg-white/95 border border-white/20 shadow-sm"
                                )}>
                                  {p.logo ? (
                                     <img 
                                       src={p.logo} 
                                       alt={p.label}
                                       className={cn(
                                         "max-w-[128px] max-h-[64px] w-full h-full object-contain object-center filter drop-shadow-sm transition-transform duration-300 group-hover:scale-105",
                                         !p.active && "opacity-50"
                                       )} 
                                       onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                                     />
                                  ) : (
                                     <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xs bg-slate-800 font-black text-white">
                                       {p.label.substring(0, 2)}
                                     </div>
                                  )}
                                </div>

                                {/* Method Label */}
                                <div className="w-full text-center shrink-0">
                                  <span className={cn(
                                    "text-xs sm:text-sm font-black block truncate",
                                    isSel ? "text-white" : "text-slate-300 group-hover:text-white"
                                  )}>
                                    {language === 'ar' ? p.labelAr : p.label}
                                  </span>
                                  <span className={cn(
                                    "text-[10px] font-bold block mt-0.5 truncate",
                                    isSel ? "text-emerald-300" : "text-slate-400"
                                  )}>
                                    {isBankily && (language === 'ar' ? 'فوري ومباشر' : 'Instant')}
                                    {isSadad && (language === 'ar' ? 'تحويل فوري' : 'Direct')}
                                    {isGaza && (language === 'ar' ? 'دفع إلكتروني' : 'E-Pay')}
                                    {!isBankily && !isSadad && !isGaza && (language === 'ar' ? 'دفع معتمد' : 'Paiement')}
                                  </span>
                                </div>

                                {/* Maintenance Overlay */}
                                {!p.active && (
                                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-2">
                                     <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow whitespace-nowrap">
                                        {language === 'ar' ? 'صيانة مؤقتة' : 'MAINT'}
                                     </span>
                                  </div>
                                )}
                              </button>
                            );
                          };

                          const firstTwo = PAYMENT_POSTS.slice(0, 2);
                          const remainder = PAYMENT_POSTS.slice(2);

                          return (
                            <>
                              {firstTwo.map(p => renderPaymentCard(p))}
                              {remainder.length === 1 ? (
                                <div className="col-span-2 sm:col-span-1 flex justify-center sm:block">
                                  <div className="w-[calc(50%-0.375rem)] sm:w-full">
                                    {renderPaymentCard(remainder[0])}
                                  </div>
                                </div>
                              ) : (
                                remainder.map(p => renderPaymentCard(p))
                              )}
                            </>
                          );
                        })()}
                     </div>

                     {PAYMENT_POSTS.every(p => !p.active) && (
                       <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold text-center">
                         ⚠️ {language === 'ar' ? 'جميع طرق وتطبيقات الدفع متوقفة مؤقتاً لأعمال الصيانة. يرجى المحاولة لاحقاً.' : 'Tous les modes de paiement sont temporairement indisponibles.'}
                       </div>
                     )}
                  </motion.div>
                )}
{service.pricingMode === "quote" && (
                   <motion.div 
                     initial={{ opacity: 0, y: 15 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.3, delay: 0.15 }}
                     className="glass-card rounded-3xl p-6 relative text-center space-y-4 hover:shadow-[0_0_25px_rgba(30,202,211,0.03)] transition-all"
                   >
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {language === 'ar' 
                          ? 'يرجى مراجعة بياناتك وإرسال طلب السعر المخصص بالضغط على زر الإرسال أدناه.'
                          : 'Veuillez vérifier vos informations et soumettre la demande de devis ci-dessous.'}
                      </p>
                   </motion.div>
                 )}
              </fieldset>

              {/* Step 4 & Action Section */}
              <div className="space-y-3 sm:space-y-4 w-full">
                {/* Step 4: Receipt Panel / الخطوة 4: تفاصيل التحويل المالي وإيصال الدفع */}
                {service.pricingMode !== "quote" && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="rounded-2xl p-4 sm:p-5 space-y-4 relative border border-slate-800 bg-[#091122] shadow-xl"
                  >
                     <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
                       <StepBadge num={4} />
                       <Receipt className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
                       <h3 className="text-sm sm:text-base font-black text-white">
                         {language === 'ar' ? 'تفاصيل التحويل وإثبات الدفع' : 'Confirmation du transfert'}
                       </h3>
                     </div>

                     {/* High-End Virtual Payment Card */}
                     <PaymentMethodCard
                       paymentMethod={paymentMethod as "bankily" | "sadad" | "gaza"}
                       amount={amount}
                       language={language}
                       copied={copied}
                       onCopy={handleCopy}
                       accountNumber={currentPaymentConfig?.phone || (paymentMethod === "sadad" ? "27329380" : "32014902")}
                       accountHolder={language === 'ar' ? currentPaymentConfig?.accountHolderAr : (language === 'fr' ? currentPaymentConfig?.accountHolderFr : currentPaymentConfig?.accountHolderAr)}
                       serviceTitle={language === 'ar' ? service.nameAr : (language === 'fr' ? service.nameFr : service.name)}
                       serviceImage={resolveServiceImage(service).resolvedImageUrl || service.imageUrl || service.image || getFallbackServiceImage(service.name, service.id)}
                       isAvailable={currentPaymentConfig?.enabled !== false}
                       unavailableReason={language === 'ar' ? currentPaymentConfig?.unavailableReasonAr : currentPaymentConfig?.unavailableReasonFr}
                     />

                     <div className="space-y-3.5">
                        {/* Field 1: Sender Phone Card with Icon */}
                        <div className="rounded-xl bg-[#060B17] border border-slate-800/80 p-3 sm:p-3.5 space-y-2">
                          <div className="flex justify-between items-center">
                            <label htmlFor="sender-phone-input" className="text-[10px] sm:text-xs font-bold text-slate-300 flex items-center gap-1.5 sm:gap-2">
                              <PhoneCall size={12} className="text-cyan-400 shrink-0" />
                              <span className="truncate">{language === 'ar' ? 'رقم الهاتف المُرسِل (الذي قمت بالتحويل منه):' : "Numéro de l'expéditeur"}</span>
                              <span className="text-rose-400 font-bold shrink-0">*</span>
                            </label>
                            
                            {/* Validation indicator */}
                            <AnimatePresence mode="wait">
                              {sender.length === 8 ? (
                                <motion.span 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-500/20"
                                >
                                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                                  <span>{language === 'ar' ? 'مكتمل 8 أرقام ✓' : 'Complet ✓'}</span>
                                </motion.span>
                              ) : sender.length > 0 ? (
                                <motion.span 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="text-[10px] font-medium text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5"
                                >
                                  {language === 'ar' ? `متبقي ${8 - sender.length} أرقام` : `${8 - sender.length} restants`}
                                </motion.span>
                              ) : null}
                            </AnimatePresence>
                          </div>

                          <div className="relative flex items-center bg-[#040812] border border-slate-800 focus-within:border-slate-600 rounded-lg overflow-hidden transition-colors" dir="ltr">
                            <div className="px-3 py-2.5 flex items-center justify-center text-slate-400 border-r border-slate-800/80 bg-white/[0.02]">
                              <span className="text-xs font-bold font-mono">🇲🇷 +222</span>
                            </div>
                            
                            <input 
                              id="sender-phone-input"
                              placeholder={language === 'ar' ? "32 XX XX XX" : "32 XX XX XX"} 
                              value={sender} 
                              onChange={e => handleSenderChange(e.target.value)} 
                              pattern="[0-9]*"
                              inputMode="numeric"
                              maxLength={8}
                              dir="ltr"
                              className="py-2.5 px-3 w-full bg-transparent text-left font-bold text-base sm:text-lg text-white font-mono outline-none tracking-widest placeholder:text-slate-700/50"
                            />
                          </div>
                        </div>

                        {/* Field 2: Receipt Upload Card with Icon */}
                        <div className="rounded-xl bg-[#060B17] border border-slate-800/80 p-3 sm:p-3.5 space-y-2">
                          <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                            <Receipt size={14} className="text-cyan-400 shrink-0" />
                            <span>{language === 'ar' ? 'إثبات الدفع (لقطة الشاشة):' : 'Preuve de paiement (capture)'}</span>
                            <span className="text-rose-400 font-bold">*</span>
                          </label>
                          
                          {/* Drag and Drop area for receipt */}
                          <div 
                            role="button"
                            tabIndex={0}
                            aria-label={language === 'ar' ? 'إرفاق إيصال التحويل' : 'Télécharger le reçu'}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (!file) receiptInputRef.current?.click();
                              }
                            }}
                            className={cn(
                              "relative min-h-[95px] sm:min-h-[105px] border border-dashed rounded-xl flex flex-col items-center justify-center p-3 sm:p-4 transition-all duration-200 cursor-pointer overflow-hidden group/drop focus-visible:ring-1 focus-visible:ring-slate-500 focus-visible:outline-none",
                              receiptDragging ? "border-cyan-400 bg-cyan-950/20" : "border-slate-700/80 bg-[#040812] hover:border-slate-500 hover:bg-[#070E1C]",
                              file ? "border-slate-700 bg-[#040812]" : ""
                            )}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setReceiptDragging(true);
                            }}
                            onDragLeave={() => setReceiptDragging(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setReceiptDragging(false);
                              const droppedFile = e.dataTransfer.files?.[0] || null;
                              if (droppedFile) {
                                haptic.light();
                                setFile(droppedFile);
                              }
                            }}
                            onClick={() => {
                              if (!file) receiptInputRef.current?.click();
                            }}
                          >
                            <input 
                              ref={receiptInputRef}
                              type="file" 
                              accept="image/*"
                              onChange={e => {
                                const selectedFile = e.target.files?.[0] || null;
                                if (selectedFile) haptic.light();
                                setFile(selectedFile);
                              }} 
                              className="hidden" 
                            />
                            
                            <AnimatePresence mode="wait">
                              {file ? (
                                <motion.div 
                                  key="preview"
                                  initial={{ opacity: 0, scale: 0.97 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.97 }}
                                  className="w-full flex items-center justify-between gap-3 relative z-10 px-1"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {receiptPreview ? (
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsFormImagePreviewOpen(true);
                                        }}
                                        className="relative group/thumb w-12 h-12 rounded-lg overflow-hidden border border-slate-700 shadow cursor-pointer hover:border-slate-500 shrink-0"
                                        title={language === 'ar' ? 'اضغط للمعاينة' : 'Cliquer pour agrandir'}
                                      >
                                        <img 
                                          src={receiptPreview} 
                                          alt="Receipt preview" 
                                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                          <Eye className="w-3.5 h-3.5 text-white" />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-11 h-11 rounded-lg bg-white/[0.04] flex items-center justify-center border border-white/10 shrink-0">
                                        <Receipt className="w-5 h-5 text-slate-300" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs text-white font-bold truncate max-w-[180px] sm:max-w-xs mb-0.5">
                                        {file.name}
                                      </p>
                                      <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB • {language === 'ar' ? 'تم إرفاق الإيصال بنجاح' : 'Reçu joint avec succès'}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {receiptPreview && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsFormImagePreviewOpen(true);
                                        }}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                        title={language === 'ar' ? 'معاينة' : 'Aperçu'}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        haptic.light();
                                        setFile(null);
                                        if (receiptInputRef.current) receiptInputRef.current.value = "";
                                      }}
                                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                                      title={language === 'ar' ? 'حذف الصورة' : 'Supprimer'}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </motion.div>
                              ) : (
                                <motion.div 
                                  key="upload-prompt"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="flex flex-col items-center text-center select-none py-1"
                                >
                                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-1.5 group-hover/drop:bg-white/[0.08] transition-colors">
                                    <Upload className="w-4 h-4 text-slate-300" />
                                  </div>
                                  <p className="text-xs font-bold text-white mb-0.5">
                                    {language === 'ar' ? 'اضغط لاختيار صورة الإيصال أو اسحبها هنا' : 'Cliquez pour joindre le reçu ou glissez-le ici'}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {language === 'ar' ? 'يدعم صور JPG و PNG و WEBP حتى 8 ميجابايت' : 'Images JPG, PNG, WEBP jusqu\'à 8 MB'}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                     </div>
                  </motion.div>
                )}

                 {/* Live Amount Due Financial Calculator */}
                 {service && (
                   <LiveAmountDueSummary
                     serviceName={language === 'ar' ? (service.nameAr || service.name) : (service.nameFr || service.name)}
                     packageLabel={(() => {
                       if (service.packages && service.packages.length > 0) {
                         const matchedPkg = service.packages.find(p => p.amount === Number(amount));
                         if (matchedPkg) {
                           return `${matchedPkg.quantity} ${matchedPkg.unit || service.unit || ''}`.trim();
                         }
                       }
                       if (quantity > 0) {
                         return `${quantity} ${service.unit || ''}`.trim();
                       }
                       return undefined;
                     })()}
                     unitPrice={service.ratePerUnit || service.priceMru || 0}
                     quantity={1}
                     subtotal={Number(amount || 0)}
                     fee={0}
                     discount={0}
                     amountDue={Number(amount || 0)}
                     isQuoteMode={service.pricingMode === "quote"}
                     paymentMethodLabel={(() => {
                       const current = paymentSettings[paymentMethod];
                       if (current) {
                         return language === 'ar' ? (current.labelAr || current.label) : current.label;
                       }
                       return undefined;
                     })()}
                   />
                 )}

                {/* Submit Action Section / زر الإرسال الرئيسي وزر التراجع */}
                <div className="pt-2 space-y-3">
                  {!isOnline && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{language === 'ar' ? 'أنت غير متصل بالإنترنت حالياً. تم حفظ بيانات طلبك، يرجى إعادة الاتصال لإرسال الطلب.' : 'Vous êtes hors ligne. Vos données sont conservées. Veuillez vous reconnecter.'}</span>
                    </div>
                  )}

                  {msg && (
                    <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{msg}</span>
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => navigate(-1)}
                      className="w-full sm:w-auto sm:px-6 py-3.5 rounded-xl border border-white/10 bg-[#0B1220] hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
                      <span>{language === 'ar' ? 'تراجع' : 'Retour'}</span>
                    </button>

                    <button 
                      type="submit" 
                      disabled={loading || !isOnline} 
                      className="w-full py-3.5 sm:py-4 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 text-sm sm:text-base font-black tracking-wide cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/15 border border-emerald-400/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-slate-950 shrink-0" />
                          <span>{language === 'ar' ? 'جاري معالجة وتأكيد الطلب...' : 'Traitement de la demande...'}</span>
                        </>
                      ) : !isOnline ? (
                        <span>{language === 'ar' ? 'الاتصال بالإنترنت مطلوب للإرسال' : 'Connexion requise pour envoyer'}</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0 stroke-[2.5]" />
                          <span>
                            {service.pricingMode === "quote" 
                              ? (language === 'ar' ? "متابعة لإرسال طلب السعر" : "Continuer vers la demande")
                              : (language === 'ar' ? "إرسال طلب الشحن" : "Soumettre la recharge")}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
        </motion.div>
      )}

      {/* Confirmation Dialog Portal / نافذة تأكيد الطلب الثابتة والموجودة بالمنتصف */}
      {showConfirmModal && service && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99999] overflow-y-auto p-3 sm:p-4 flex flex-col items-center justify-center min-h-full">
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
              onClick={() => { if (!loading) { setShowConfirmModal(false); setSubmitError(""); } }}
            />
            
            {/* Modal Dialog Content - Max 460px width, max 88dvh height */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-[460px] max-h-[88dvh] bg-[#0B1120] border border-[#243247] rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col z-10 overflow-hidden my-auto shrink-0 select-none"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-[#243247] bg-[#0E1626] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Receipt className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                      {language === 'ar' ? 'مراجعة طلب الشحن' : 'Vérification de la commande'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {language === 'ar' ? 'تأكد من صحة البيانات قبل إرسال طلبك' : 'Vérifiez les données avant de confirmer'}
                    </p>
                  </div>
                </div>
                {!loading && (
                  <button 
                    type="button"
                    onClick={() => { setShowConfirmModal(false); setSubmitError(""); }}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Scrollable Body Container */}
              <div className="p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                
                {/* 1. Service Info Banner - Full, uncompressed card */}
                <div className="bg-[#0D1527] p-4 rounded-2xl border border-white/10 flex items-center gap-3.5 shadow-sm">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#070B14] border border-[#243247] shrink-0 flex items-center justify-center overflow-hidden shadow-inner">
                    {service.imageUrl || service.image ? (
                      <img 
                        src={service.imageUrl || service.image} 
                        className="w-full h-full object-cover filter drop-shadow-md" 
                        alt={service.name} 
                      />
                    ) : (
                      <ShoppingBag className="w-8 h-8 text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>{service.badge || (language === 'ar' ? "خدمة معتمدة" : "Service Vérifié")}</span>
                      </span>
                      {service.categoryAr && (
                        <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                          {language === 'ar' ? service.categoryAr : service.category}
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-white text-sm sm:text-base leading-snug">
                      {language === 'ar' ? (service.nameAr || service.name) : (service.nameFr || service.name)}
                    </h4>
                    {service.descriptionAr && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {language === 'ar' ? service.descriptionAr : (service.descriptionFr || service.descriptionAr)}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Account & Player ID Details */}
                <div className="bg-[#0B1220] p-3.5 rounded-2xl border border-white/10 space-y-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block border-b border-white/5 pb-1">
                    {language === 'ar' ? 'بيانات الشحن والحساب:' : 'Identifiants du compte :'}
                  </span>
                  
                  <div className="space-y-1.5 pt-0.5">
                    {service.fields?.map(f => {
                      const val = fieldValues[f.id];
                      if (!val) return null;
                      return (
                        <div key={f.id} className="flex justify-between items-center text-xs gap-2">
                          <span className="text-slate-400 font-bold shrink-0">
                            {language === 'ar' ? f.labelAr : f.label}:
                          </span>
                          <span className="text-white font-black font-mono bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/10 select-all truncate max-w-[200px]">
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Payment Method & Transfer Info */}
                {service.pricingMode !== "quote" && (
                  <div className="bg-[#0B1220] p-3.5 rounded-2xl border border-white/10 space-y-2 text-xs">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block border-b border-white/5 pb-1">
                      {language === 'ar' ? 'معلومات التحويل المالي:' : 'Paiement & Transfert :'}
                    </span>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">{language === 'ar' ? 'طريقة التحويل:' : 'Méthode :'}</span>
                      <span className="font-black text-white flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {PAYMENT_POSTS.find(p => p.id === paymentMethod)?.labelAr || paymentMethod}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-t border-white/5">
                      <span className="text-slate-400 font-bold">{language === 'ar' ? 'حساب الاستلام:' : 'Numéro officiel :'}</span>
                      <span className="font-mono font-black text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-emerald-500/20 tracking-wider">
                        {formatNumberSpacing(currentPaymentConfig?.phone || (paymentMethod === "sadad" ? "27329380" : "32014902"))}
                      </span>
                    </div>

                    {sender && (
                      <div className="flex justify-between items-center py-1 border-t border-white/5">
                        <span className="text-slate-400 font-bold">{language === 'ar' ? 'رقم المرسل:' : 'Expéditeur :'}</span>
                        <span className="font-mono font-black text-amber-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-white/5">
                          {sender}
                        </span>
                      </div>
                    )}

                    {receiptPreview && (
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-bold text-xs flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-emerald-400" />
                            <span>{language === 'ar' ? 'إشعار التحويل المرفق:' : 'Reçu de virement :'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsFormImagePreviewOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-bold transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{language === 'ar' ? 'عرض بحجم كامل' : 'Agrandir'}</span>
                          </button>
                        </div>

                        <div 
                          onClick={() => setIsFormImagePreviewOpen(true)}
                          className="w-full h-28 sm:h-32 rounded-xl bg-[#070B14] border border-[#243247] overflow-hidden cursor-pointer relative group flex items-center justify-center shadow-inner"
                        >
                          <img 
                            src={receiptPreview} 
                            alt="Receipt preview" 
                            className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-200" 
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                            <Eye className="w-4 h-4 text-emerald-400" />
                            <span>{language === 'ar' ? 'انقر لتكبير الإيصال' : 'Cliquer pour agrandir'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Total Amount Due Block (Emerald Green) */}
                {service.pricingMode !== "quote" && (
                  <div className="bg-gradient-to-r from-emerald-500/10 via-[#0B1324] to-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/30 text-center space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === 'ar' ? 'المبلغ الإجمالي المستحق' : 'Montant total à payer'}
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight flex items-center justify-center gap-1.5">
                      <span>{amount}</span>
                      <span className="text-xs font-sans font-bold text-emerald-300">
                        {language === 'ar' ? 'أوقية جديدة (MRU)' : 'MRU'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Inline Error Alert with Retry button if submission failed */}
                {submitError && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-rose-200 leading-relaxed flex-1">
                        {submitError}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitError("");
                          executeSubmit();
                        }}
                        className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'إعادة المحاولة' : 'Réessayer'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Caution Alert */}
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-200 leading-relaxed">
                    {language === 'ar' 
                      ? 'الرجاء التأكد التام من صحة معرف اللاعب والمعلومات أعلاه. الشحن سينفذ بناءً عليها.' 
                      : "Veuillez vérifier vos identifiants ci-dessus avant de confirmer."}
                  </p>
                </div>

                {/* Upload Progress Bar inside modal if active */}
                {uploadProgress > 0 && loading && (
                  <div className="w-full bg-slate-900/90 p-3 rounded-xl border border-emerald-500/30">
                    <div className="flex justify-between text-[10px] font-black text-emerald-400 mb-1">
                      <span>{processingStatus || (language === 'ar' ? 'جاري رفع الإيصال وتأكيد الطلب...' : 'Traitement...')}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 transition-all duration-300 animate-pulse" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pinned Footer Buttons - Always Visible */}
              <div className="p-3.5 border-t border-white/10 bg-[#0B1324] grid grid-cols-2 gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => { setShowConfirmModal(false); setSubmitError(""); }}
                  className="w-full py-3 rounded-xl border border-white/15 bg-slate-900/60 text-xs sm:text-sm font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180 shrink-0" />
                  <span>{language === 'ar' ? 'تعديل البيانات' : 'Modifier'}</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    haptic.light();
                    executeSubmit();
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950 shrink-0" />
                      <span>{language === 'ar' ? 'جاري الإرسال...' : 'Envoi...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{language === 'ar' ? 'تأكيد وإرسال الطلب' : 'Confirmer la commande'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
      
      {orderSubmittedSuccess && submittedOrderInfo && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl shadow-cyan-500/20 relative overflow-hidden my-auto shrink-0"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              {/* Background ambient glowing orb */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Success Badge Icon */}
              <div className="relative mx-auto w-20 h-20 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl animate-ping opacity-75" />
                <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-3xl border-2 border-emerald-300/50 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-xl sm:text-2xl font-black text-white leading-snug mb-2">
                {language === 'ar' ? 'تم إرسال طلب الشحن بنجاح! ⚡' : 'Demande envoyée avec succès ! ⚡'}
              </h3>
              <p className="text-xs text-slate-300 font-bold leading-relaxed mb-6">
                {language === 'ar'
                  ? 'تم استلام طلبك وبدأ فريق الدعم في معالجته فوراً.'
                  : 'Votre demande a été reçue et est en cours de traitement par notre équipe.'}
              </p>

              {/* Order Info Card */}
              <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 text-start mb-6 space-y-2.5 font-sans">
                {submittedOrderInfo.orderId && (
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                    <span className="text-slate-400 font-bold">{language === 'ar' ? 'رقم الطلب:' : 'N° Commande :'}</span>
                    <span className="text-cyan-300 font-mono font-black select-all">
                      #{submittedOrderInfo.orderId.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">{language === 'ar' ? 'الخدمة:' : 'Service :'}</span>
                  <span className="text-white font-black">{submittedOrderInfo.serviceName}</span>
                </div>
                {submittedOrderInfo.amount > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">{language === 'ar' ? 'المبلغ:' : 'Montant :'}</span>
                    <span className="text-cyan-400 font-black font-mono">{submittedOrderInfo.amount} MRU</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                  <span className="text-slate-400 font-bold">{language === 'ar' ? 'حالة الطلب:' : 'Statut :'}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-black">
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    {language === 'ar' ? 'قيد المعالجة (1-5 دقائق)' : 'En traitement (1-5 min)'}
                  </span>
                </div>
              </div>

              {/* Guest Tracking Token Notice */}
              {submittedOrderInfo.isGuest && submittedOrderInfo.trackingToken && (
                <div className="p-3 bg-cyan-950/50 border border-cyan-500/30 rounded-2xl mb-5 text-right text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-cyan-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>{language === 'ar' ? 'رابط تتبع الطلب الخاص بك' : 'Lien de suivi'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}/orders?token=${submittedOrderInfo.trackingToken}`;
                        navigator.clipboard.writeText(link);
                        showToast(language === 'ar' ? 'تم نسخ رابط التتبع!' : 'Lien copié !', 'success');
                      }}
                      className="px-2 py-1 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                    >
                      {language === 'ar' ? 'نسخ الرابط' : 'Copier'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                    {language === 'ar'
                      ? 'يمكنك متابعة حالة شحن طلبك في أي وقت حتى بدون تسجيل الدخول عبر هذا الرابط.'
                      : 'Vous pouvez suivre l\'état de votre commande via ce lien.'}
                  </p>
                </div>
              )}

              {/* Redirecting Progress Bar (Only for signed in user) */}
              {!submittedOrderInfo.isGuest ? (
                <div className="mb-6 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-400">
                    {language === 'ar'
                      ? 'جاري توجيهك تلقائياً إلى صفحة سجل الطلبات...'
                      : 'Redirection automatique vers l\'historique des commandes...'}
                  </p>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3.2, ease: "linear" }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                    />
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    haptic.medium();
                    if (submittedOrderInfo.trackingUrl) {
                      navigate(submittedOrderInfo.trackingUrl);
                    } else {
                      navigate('/orders');
                    }
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>
                    {submittedOrderInfo.isGuest
                      ? (language === 'ar' ? 'متابعة تفاصيل الطلب الآن 🚀' : 'Suivre ma commande 🚀')
                      : (language === 'ar' ? 'الانتقال إلى سجل الطلبات الآن 🚀' : 'Voir mes commandes maintenant 🚀')}
                  </span>
                </button>
                {submittedOrderInfo.isGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderSubmittedSuccess(false);
                      setSubmittedOrderInfo(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    {language === 'ar' ? 'طلب خدمة أخرى' : 'Commander un autre service'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* Fullscreen Receipt Modal for Order Form */}
      <ImageViewerModal
        imageUrl={receiptPreview}
        isOpen={isFormImagePreviewOpen}
        onClose={() => setIsFormImagePreviewOpen(false)}
        isArabic={language === 'ar'}
        title={language === 'ar' ? "معاينة صورة إيصال التحويل" : "Aperçu du reçu de virement"}
        subtitle={file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : undefined}
      />
    </section>
  );
}
