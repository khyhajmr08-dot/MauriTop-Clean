import React, { useEffect, useMemo, useState } from "react";
import { ImageUploader } from "../components/ImageUploader";
import LoadingSpinner from "../components/LoadingSpinner";
import { ServicesManagerSkeleton } from "../components/Skeleton";
import { db, storage } from "../lib/firebase";
import { SERVICES } from "../data/services";
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  limit
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { uploadFileWithProgress, uploadServiceImage } from "../services/fileUpload";
import { cacheService } from "../lib/cache";
import ServiceCard from "../components/ServiceCard";
import {
  Plus,
  Trash2,
  ChevronRight,
  Check,
  Settings,
  DollarSign,
  Image as ImageIcon,
  Layout,
  Database,
  Search,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RefreshCw,
  Archive,
  Cloud,
  Code,
  Star,
  ExternalLink,
  Smartphone
} from "lucide-react";
import { cn, formatMRU } from "../lib/utils";
import type { Service } from "../types";
import { useToast } from "../contexts/ToastContext";
import { getFallbackServiceImage, resolveServiceImage } from "../lib/serviceImages";
import { persistentImageCache } from "../lib/persistentImageCache";

const REQUIRED_FIELD_OPTIONS = [
  { id: "playerId", label: "Player ID", labelAr: "رقم اللاعب" },
  { id: "email", label: "Email", labelAr: "البريد الإلكتروني" },
  { id: "username", label: "Username", labelAr: "اسم المستخدم" },
  { id: "phone", label: "Phone", labelAr: "رقم الهاتف" },
  { id: "amountMru", label: "Amount (MRU)", labelAr: "المبلغ" },
  { id: "cardId", label: "Card ID", labelAr: "رقم البطاقة" },
  { id: "pageLink", label: "Page Link", labelAr: "رابط الصفحة" },
  { id: "profileLink", label: "Profile Link", labelAr: "رابط الحساب" },
  { id: "objective", label: "Objective", labelAr: "هدف الحملة" },
  { id: "budgetMru", label: "Budget (MRU)", labelAr: "الميزانية" },
  { id: "appleIdEmail", label: "Apple ID Email", labelAr: "بريد Apple ID" },
  { id: "note", label: "Note", labelAr: "ملاحظة" },
];

const CATEGORIES = [
  { id: "games", label: "Games", labelAr: "ألعاب إلكترونية", labelFr: "Jeux", aliases: ["games", "ألعاب", "العاب", "Jeux", "jeux"] },
  {
    id: "digital_subs",
    label: "Digital Subscriptions",
    labelAr: "اشتراكات رقمية",
    labelFr: "Abonnements Numériques",
    aliases: ["digital_subs", "اشتراكات رقمية", "الاشتراكات الرقمية", "اشتراكات", "الاشتراكات", "Abonnements Numériques", "abonnements"]
  },
  { id: "gift_cards", label: "Gift Cards", labelAr: "بطاقات الهدايا", labelFr: "Cartes Cadeaux", aliases: ["gift_cards", "بطاقات الهدايا", "البطاقات", "بطاقات", "Cartes Cadeaux", "cartes"] },
  { id: "digital_services", label: "Digital Services", labelAr: "خدمات رقمية", labelFr: "Services Numériques", aliases: ["digital_services", "خدمات رقمية", "الخدمات الرقمية", "خدمات", "الخدمات", "Services Numériques", "services"] },
];

function matchCategory(serviceCat?: string, filterCat?: string): boolean {
  if (!filterCat || filterCat === "all") return true;
  if (!serviceCat) return false;
  
  const cleanCat = serviceCat.trim().toLowerCase();
  const cleanFilter = filterCat.trim().toLowerCase();

  if (cleanCat === cleanFilter) return true;

  const targetCat = CATEGORIES.find(
    (c) => c.id.toLowerCase() === cleanFilter || 
           c.labelAr.toLowerCase() === cleanFilter || 
           c.label.toLowerCase() === cleanFilter
  );

  if (!targetCat) {
    return cleanCat.includes(cleanFilter) || cleanFilter.includes(cleanCat);
  }

  return (
    cleanCat === targetCat.id.toLowerCase() ||
    cleanCat === targetCat.labelAr.toLowerCase() ||
    cleanCat === targetCat.label.toLowerCase() ||
    Boolean(targetCat.aliases?.some((a) => cleanCat.includes(a.toLowerCase()) || a.toLowerCase().includes(cleanCat)))
  );
}

export default function ServicesManager() {
  const { showToast } = useToast();
  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [emptySnapshot, setEmptySnapshot] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "general" | "pricing" | "fields" | "appearance"
  >("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "active" | "featured" | "inactive" | "archived" | "deleted">("all");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [orderCountForService, setOrderCountForService] = useState<number | null>(null);
  const [checkingOrders, setCheckingOrders] = useState(false);

  // String states for numeric inputs to avoid locking to 0 on backspace
  const [priceInput, setPriceInput] = useState<string>("0");
  const [minAmountInput, setMinAmountInput] = useState<string>("0");
  const [maxAmountInput, setMaxAmountInput] = useState<string>("0");

  const [formData, setFormData] = useState<Partial<Service>>({
    name: "",
    nameAr: "",
    nameFr: "",
    descriptionAr: "",
    descriptionFr: "",
    category: "games",
    imageUrl: "",
    pricingMode: "fixed",
    priceMru: 0,
    minAmountMru: 0,
    maxAmountMru: 0,
    allowCustomAmount: false,
    requiredFields: [],
    quantity: 1,
    status: "active",
    badge: "",
    order: 1,
    imageFit: "cover",
    imagePadding: 0,
    isFeatured: false,
    featuredOrder: 1,
  });

  useEffect(() => {
    // 1. Initial cached render for fast UI display
    const cached = cacheService.get<Service[]>("db_services_admin");
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setDbServices(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2. Real-time Firestore sync
    const unsubscribe = onSnapshot(
      collection(db, "services"),
      (snapshot) => {
        setFetchError(null);
        setEmptySnapshot(snapshot.empty);

        const loaded: Service[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (!data) return;
          loaded.push({ id: d.id, ...data } as Service);
        });

        const sorted = loaded.sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999));
        setDbServices(sorted);
        cacheService.set("db_services_admin", sorted);
        cacheService.set("db_services", sorted);
        setLoading(false);
      },
      (error) => {
        console.error("[ServicesManager] Firestore sync error:", error);
        setFetchError(error.message || String(error));
        showToast("فشل في مزامنة الخدمات مع Firestore", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [showToast]);

  // Unified Authoritative Merged Services List:
  const allServices = useMemo(() => {
    const serviceMap = new Map<string, Service & { isDefaultCatalog?: boolean; hasDbRecord?: boolean }>();

    // 1. First populate all default services from code catalog
    SERVICES.forEach((s) => {
      const { resolvedImage, resolvedImageUrl } = resolveServiceImage(s);
      serviceMap.set(s.id, {
        ...s,
        image: resolvedImage,
        imageUrl: resolvedImageUrl,
        priceMru: Number(s.priceMru ?? s.suggestedPrice ?? s.minAmount ?? 0),
        imageFit: s.imageFit || "cover",
        imagePadding: s.imagePadding ?? 0,
        status: s.status || "active",
        packages: s.packages || [],
        order: s.order ?? 9999,
        isFeatured: Boolean(s.isFeatured || (s as any).featured),
        featuredOrder: Number(s.featuredOrder ?? 9999),
        isDefaultCatalog: true,
        hasDbRecord: false,
      });
    });

    // 2. Overlay Firestore documents (custom services or customized base services)
    dbServices.forEach((dbS) => {
      const existing = serviceMap.get(dbS.id);
      const { resolvedImage, resolvedImageUrl } = resolveServiceImage(dbS, existing);

      const rawStatus = dbS.status || (dbS.isDeleted ? "deleted" : (existing?.status || "active"));
      const isDeleted = Boolean(dbS.isDeleted || rawStatus === "deleted" || rawStatus === "Deleted");

      serviceMap.set(dbS.id, {
        ...(existing || {}),
        ...dbS,
        image: resolvedImage,
        imageUrl: resolvedImageUrl,
        priceMru: Number(dbS.priceMru ?? (dbS as any).price ?? existing?.priceMru ?? 0),
        imageFit: dbS.imageFit || existing?.imageFit || "cover",
        imagePadding: dbS.imagePadding !== undefined ? Number(dbS.imagePadding) : (existing?.imagePadding || 0),
        status: isDeleted ? "deleted" : rawStatus,
        isDeleted,
        fields: dbS.fields || (existing as any)?.fields || [],
        packages: dbS.packages || existing?.packages || [],
        order: dbS.order !== undefined && dbS.order !== null ? Number(dbS.order) : (existing?.order ?? 9999),
        isFeatured: dbS.isFeatured !== undefined ? Boolean(dbS.isFeatured) : Boolean((dbS as any).featured ?? existing?.isFeatured),
        featuredOrder: dbS.featuredOrder !== undefined ? Number(dbS.featuredOrder) : (existing?.featuredOrder ?? 9999),
        isDefaultCatalog: Boolean(existing?.isDefaultCatalog),
        hasDbRecord: true,
      });
    });

    return Array.from(serviceMap.values());
  }, [dbServices]);

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    const foundCat = CATEGORIES.find(
      c => c.id === service.category || c.labelAr === service.category || (c.aliases && c.aliases.includes(service.category || ""))
    );
    const normalizedCategory = foundCat ? foundCat.id : (service.category || "games");

    const currentPrice = Number(service.priceMru ?? (service as any).price ?? service.suggestedPrice ?? 0);
    const currentMin = Number(service.minAmountMru ?? service.minAmount ?? 0);
    const currentMax = Number(service.maxAmountMru ?? service.maxAmount ?? 0);

    setPriceInput(currentPrice > 0 ? String(currentPrice) : "0");
    setMinAmountInput(currentMin > 0 ? String(currentMin) : "0");
    setMaxAmountInput(currentMax > 0 ? String(currentMax) : "0");

    const existingImg = service.imageUrl || service.image || persistentImageCache.getServiceImageSync(service.id) || "";

    setFormData({
      ...service,
      imageUrl: existingImg,
      image: existingImg,
      category: normalizedCategory,
      categoryAr: service.categoryAr || foundCat?.labelAr || "",
      categoryFr: service.categoryFr || foundCat?.label || "",
      priceMru: currentPrice,
      minAmountMru: currentMin,
      maxAmountMru: currentMax,
      order: service.order ?? 1,
      isFeatured: Boolean(service.isFeatured || (service as any).featured),
      featuredOrder: Number(service.featuredOrder ?? 1),
      imageFit: service.imageFit || "cover",
      imagePadding: service.imagePadding ?? 0,
    });
    setIsEditing(true);
    setActiveTab("general");
  };

  const handleCreateNew = () => {
    setSelectedService(null);
    setPriceInput("0");
    setMinAmountInput("0");
    setMaxAmountInput("0");
    setFormData({
      name: "",
      nameAr: "",
      nameFr: "",
      descriptionAr: "",
      descriptionFr: "",
      category: "games",
      imageUrl: "",
      pricingMode: "fixed",
      priceMru: 0,
      minAmountMru: 0,
      maxAmountMru: 0,
      allowCustomAmount: false,
      requiredFields: [],
      quantity: 1,
      status: "active",
      badge: "",
      order: allServices.length + 1,
      imageFit: "cover",
      imagePadding: 0,
      isFeatured: false,
      featuredOrder: 1,
    });
    setIsEditing(true);
    setActiveTab("general");
  };

  const handleImageUpload = async (blob: Blob) => {
    try {
      if (!blob || blob.size <= 0 || blob.size > 8 * 1024 * 1024) {
        throw new Error("يجب أن يكون حجم الصورة أكبر من صفر وأقل من 8 ميجابايت");
      }
      setUploadProgress(10);

      // Keep the full cropped source quality. Preview resizing is handled only by the uploader UI.
      const rawBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === "string" && result.startsWith("data:image/")) resolve(result);
          else reject(new Error("تعذر قراءة الصورة المحددة"));
        };
        reader.onerror = () => reject(new Error("فشل قراءة ملف الصورة"));
        reader.readAsDataURL(blob);
      });

      setUploadProgress(80);
      setFormData(prev => ({ ...prev, imageUrl: rawBase64, image: rawBase64 }));
      setUploadProgress(100);
      showToast("تم اختيار الصورة الأصلية المقصوصة. اضغط حفظ التغييرات لرفعها سحابياً.", "success");
      window.setTimeout(() => setUploadProgress(0), 400);
    } catch (err: any) {
      console.error("Image upload error:", err);
      showToast("فشل تجهيز الصورة: " + (err as Error).message, "error");
      setUploadProgress(0);
    }
  };

  const saveService = async () => {
    if (!formData.nameAr || !formData.nameFr) {
      showToast("يرجى إدخال اسم الخدمة بالعربية والفرنسية", "error");
      return;
    }

    const id = selectedService?.id || doc(collection(db, "services")).id;
    let finalImageUrl = formData.imageUrl !== undefined ? formData.imageUrl : (formData.image !== undefined ? formData.image : "");

    try {
      setLoading(true);

      if (finalImageUrl && (finalImageUrl.startsWith("data:") || finalImageUrl.startsWith("blob:"))) {
        try {
          setUploadProgress(15);
          const imageId = selectedService?.id || id;

          const uploadedUrl = await uploadServiceImage(finalImageUrl, imageId, (percent) => {
            setUploadProgress(percent);
          });

          if (!uploadedUrl || uploadedUrl.startsWith("data:") || uploadedUrl.startsWith("blob:") || uploadedUrl === "receipt_attached") {
            throw new Error("لم يتم استلام رابط تخزين دائم للصورة من الخادم أو السحابة");
          }
          finalImageUrl = uploadedUrl;
        } catch (uploadErr: any) {
          console.error("Storage upload error during saveService:", uploadErr);
          const existingImage = selectedService?.imageUrl || selectedService?.image || "";
          if (existingImage && !existingImage.startsWith("data:") && !existingImage.startsWith("blob:")) {
            finalImageUrl = existingImage;
            showToast("تعذر رفع الصورة السحابية الجديدة؛ تم الاحتفاظ بالصورة السابقة", "info");
          } else {
            throw new Error(`تعذر حفظ الصورة: ${uploadErr?.message || "خطأ في الشبكة أو التخزين"}`);
          }
        }
      }

      const cleanPrice = Math.max(0, Number(priceInput.trim()) || 0);
      const cleanMin = Math.max(0, Number(minAmountInput.trim()) || 0);
      const cleanMax = Math.max(0, Number(maxAmountInput.trim()) || 0);

      const maxOrder = allServices.length > 0 ? Math.max(...allServices.map(s => s.order || 0)) : 0;
      const parsedOrder = Number(formData.order);
      const orderVal = (formData.order === undefined || formData.order === null || isNaN(parsedOrder) || parsedOrder <= 0)
        ? maxOrder + 1
        : parsedOrder;

      const isFeat = Boolean(formData.isFeatured);
      const featOrder = Number(formData.featuredOrder) || 1;

      const finalData = {
        ...formData,
        priceMru: cleanPrice,
        minAmountMru: cleanMin,
        maxAmountMru: cleanMax,
        order: orderVal,
        isFeatured: isFeat,
        featured: isFeat,
        featuredOrder: featOrder,
        imageUrl: finalImageUrl,
        image: finalImageUrl,
        id,
        updatedAt: serverTimestamp(),
        createdAt: selectedService
          ? (selectedService as any).createdAt || serverTimestamp()
          : serverTimestamp(),
      };

      const cleanData: any = {};
      Object.entries(finalData).forEach(([key, val]) => {
        if (val !== undefined) {
          cleanData[key] = val;
        }
      });

      const serviceRef = doc(db, "services", id);
      await setDoc(serviceRef, cleanData, { merge: true });

      // Read-after-write check: don't report success until Firestore returns the saved image URL.
      const savedService = await getDoc(serviceRef);
      if (!savedService.exists()) {
        throw new Error("تم إرسال الحفظ لكن تعذر التحقق من وجود سجل الخدمة في Firestore");
      }
      const savedImageUrl = savedService.data()?.imageUrl || savedService.data()?.image || "";
      if (finalImageUrl && savedImageUrl !== finalImageUrl) {
        throw new Error("لم تتطابق صورة الخدمة المحفوظة مع الصورة المرسلة. لم يتم تأكيد الحفظ.");
      }

      setDbServices(prev => {
        const existingIndex = prev.findIndex(s => s.id === id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...cleanData, id };
          return updated;
        } else {
          return [{ ...cleanData, id }, ...prev];
        }
      });

      if (finalImageUrl) {
        persistentImageCache.saveServiceImage(id, finalImageUrl);
      }

      cacheService.remove("db_services");
      cacheService.remove("db_services_admin");
      cacheService.remove("featured_services");
      
      showToast(selectedService ? "تم حفظ بيانات وتعديلات الخدمة بنجاح" : "تمت إضافة الخدمة بنجاح", "success");
      setIsEditing(false);
      setSelectedService(null);
    } catch (error: any) {
      console.error("Save error:", error);
      showToast(`فشل في الحفظ: ${error.message || "خطأ غير معروف"}`, "error");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const confirmDeleteService = async (permanent: boolean = false) => {
    if (!serviceToDelete) return;
    const id = serviceToDelete.id;
    setIsDeleting(true);
    try {
      const previousRecordUrl = serviceToDelete.imageUrl || serviceToDelete.image;
      if (previousRecordUrl && previousRecordUrl.includes("firebasestorage.googleapis.com")) {
        try {
          const oldImageRef = ref(storage, previousRecordUrl);
          await deleteObject(oldImageRef);
        } catch (e) {
          console.warn("Old image deletion skipped:", e);
        }
      }

      const isBaseDefault = (serviceToDelete as any).isDefaultCatalog;

      if (permanent && !isBaseDefault) {
        await deleteDoc(doc(db, "services", id));
        showToast(
          `تم حذف خدمة "${serviceToDelete.nameAr || serviceToDelete.name}" نهائياً من قاعدة البيانات`,
          "success"
        );
      } else {
        await setDoc(
          doc(db, "services", id),
          {
            status: "deleted",
            isDeleted: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        showToast(
          `تمت أرشفة وإخفاء خدمة "${serviceToDelete.nameAr || serviceToDelete.name}" بنجاح`,
          "success"
        );
      }

      cacheService.remove("db_services");
      cacheService.remove("db_services_admin");
      cacheService.remove("featured_services");

      setServiceToDelete(null);
      setOrderCountForService(null);
    } catch (error: any) {
      console.error("Delete service error:", error);
      showToast(`فشل في حذف الخدمة: ${error.message || "خطأ غير متوقع"}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteService = async (service: Service) => {
    setServiceToDelete(service);
    setCheckingOrders(true);
    setOrderCountForService(null);
    try {
      const q1 = query(collection(db, "orders"), where("serviceId", "==", service.id), limit(10));
      const q2 = query(collection(db, "orders"), where("serviceType", "==", service.id), limit(10));
      const q3 = query(collection(db, "orders"), where("serviceType", "==", service.nameAr || service.name), limit(10));

      const [snap1, snap2, snap3] = await Promise.all([
        getDocs(q1).catch(() => ({ size: 0 })),
        getDocs(q2).catch(() => ({ size: 0 })),
        getDocs(q3).catch(() => ({ size: 0 }))
      ]);

      const totalFound = (snap1?.size || 0) + (snap2?.size || 0) + (snap3?.size || 0);
      setOrderCountForService(totalFound);
    } catch (e) {
      console.warn("Could not check orders count:", e);
      setOrderCountForService(1);
    } finally {
      setCheckingOrders(false);
    }
  };

  const restoreService = async (service: Service) => {
    try {
      setLoading(true);
      await setDoc(
        doc(db, "services", service.id),
        {
          status: "active",
          isDeleted: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      cacheService.remove("db_services");
      cacheService.remove("db_services_admin");
      cacheService.remove("featured_services");

      showToast(`تمت استعادة وتفعيل خدمة "${service.nameAr || service.name}"`, "success");
    } catch (err: any) {
      console.error("Restore service error:", err);
      showToast(`فشل في استعادة الخدمة: ${err.message || "خطأ غير متوقع"}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const moveService = async (service: Service, direction: 'up' | 'down') => {
    const visibleIdx = filteredServices.findIndex((s) => s.id === service.id);
    if (visibleIdx === -1) return;

    let targetVisibleIdx = direction === 'up' ? visibleIdx - 1 : visibleIdx + 1;
    if (targetVisibleIdx < 0 || targetVisibleIdx >= filteredServices.length) return;

    const targetService = filteredServices[targetVisibleIdx];

    const idx = allServices.findIndex((s) => s.id === service.id);
    const targetIdx = allServices.findIndex((s) => s.id === targetService.id);
    if (idx === -1 || targetIdx === -1) return;

    let currentOrder = (service.order !== undefined && service.order !== null) ? Number(service.order) : (idx + 1);
    let targetOrder = (targetService.order !== undefined && targetService.order !== null) ? Number(targetService.order) : (targetIdx + 1);

    if (currentOrder === targetOrder) {
      currentOrder = idx + 1;
      targetOrder = targetIdx + 1;
    }

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'services', service.id), { order: targetOrder }, { merge: true });
      batch.set(doc(db, 'services', targetService.id), { order: currentOrder }, { merge: true });

      await batch.commit();

      cacheService.remove("db_services");
      cacheService.remove("db_services_admin");
      cacheService.remove("featured_services");
      
      showToast("تم ترتيب الخدمة بنجاح", "success");
    } catch (error) {
      showToast("فشل في ترتيب الخدمة", "error");
      console.error(error);
    }
  };

  const toggleField = (fieldId: string) => {
    const currentReq = formData.requiredFields || [];
    const currentOpt = formData.optionalFields || [];
    
    if (currentReq.includes(fieldId)) {
      setFormData({
        ...formData,
        requiredFields: currentReq.filter((id) => id !== fieldId),
      });
    } else {
      setFormData({ 
        ...formData, 
        requiredFields: [...currentReq, fieldId],
        optionalFields: currentOpt.filter(id => id !== fieldId)
      });
    }
  };

  const toggleOptionalField = (fieldId: string) => {
    const currentOpt = formData.optionalFields || [];
    const currentReq = formData.requiredFields || [];
    
    if (currentOpt.includes(fieldId)) {
      setFormData({
        ...formData,
        optionalFields: currentOpt.filter((id) => id !== fieldId),
      });
    } else {
      setFormData({ 
        ...formData, 
        optionalFields: [...currentOpt, fieldId],
        requiredFields: currentReq.filter((id) => id !== fieldId)
      });
    }
  };

  const toggleServiceStatus = async (service: Service) => {
    const rawStatus = (service.status || "").toLowerCase();
    const isCurrentlyActive = (rawStatus === "active" || rawStatus === "نشط" || rawStatus === "") && !service.isDeleted;
    const newStatus = isCurrentlyActive ? "unavailable" : "active";

    try {
      await setDoc(
        doc(db, "services", service.id),
        {
          status: newStatus,
          isDeleted: false,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setDbServices(prev => {
        const idx = prev.findIndex(s => s.id === service.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status: newStatus, isDeleted: false };
          return updated;
        } else {
          return [{ ...service, status: newStatus, isDeleted: false }, ...prev];
        }
      });

      cacheService.remove("db_services");
      cacheService.remove("db_services_admin");
      cacheService.remove("featured_services");

      showToast(
        newStatus === "active" 
          ? `تم تفعيل خدمة "${service.nameAr || service.name}" وإتاحتها للطلب` 
          : `تم جعل خدمة "${service.nameAr || service.name}" غير متوفرة حالياً`, 
        newStatus === "active" ? "success" : "info"
      );
    } catch (err: any) {
      console.error("Toggle status error:", err);
      showToast("فشل في تعديل حالة الخدمة", "error");
    }
  };

  const toggleFeatured = async (service: Service) => {
    const isNowFeatured = !Boolean(service.isFeatured || (service as any).featured);
    const updateData = {
      isFeatured: isNowFeatured,
      featured: isNowFeatured,
      featuredOrder: service.featuredOrder || (isNowFeatured ? 1 : 999),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "services", service.id), updateData, { merge: true });

      setDbServices(prev => {
        const idx = prev.findIndex(s => s.id === service.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...updateData };
          return updated;
        } else {
          return [{ ...service, ...updateData }, ...prev];
        }
      });

      cacheService.remove("db_services");
      cacheService.remove("db_services_admin");
      cacheService.remove("featured_services");

      showToast(
        isNowFeatured
          ? `تم تمييز "${service.nameAr || service.name}" كخدمة مميزة ⭐`
          : `تمت إزالة تمييز "${service.nameAr || service.name}"`,
        isNowFeatured ? "success" : "info"
      );
    } catch (err: any) {
      console.error("Toggle featured error:", err);
      showToast("فشل تعديل حالة التمييز: " + err.message, "error");
    }
  };

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = allServices.filter((s) => {
      const rawStatus = (s.status || "").toLowerCase();
      const isDel = s.isDeleted || rawStatus === "deleted" || rawStatus === "محذوف";
      const isArchived = !isDel && (rawStatus === "archived" || rawStatus === "مؤرشف");
      const isUnavailable = !isDel && !isArchived && (rawStatus === "unavailable" || rawStatus === "غير متوفر" || rawStatus === "متوقف");
      const isActive = !isDel && !isArchived && !isUnavailable && (rawStatus === "active" || rawStatus === "نشط" || rawStatus === "");
      const isInactive = !isDel && !isArchived && !isActive && !isUnavailable;
      const isFeat = Boolean(s.isFeatured || (s as any).featured);

      // Status & Featured filters
      if (selectedStatusFilter === "active" && !isActive) return false;
      if (selectedStatusFilter === "featured" && !isFeat) return false;
      if (selectedStatusFilter === "inactive" && !isInactive && !isUnavailable) return false;
      if (selectedStatusFilter === "archived" && !isArchived) return false;
      if (selectedStatusFilter === "deleted" && !isDel) return false;
      if (selectedStatusFilter === "all" && isDel) return false;

      // Category filter
      if (selectedCategoryFilter !== "all" && !matchCategory(s.category, selectedCategoryFilter)) {
        return false;
      }

      if (!q) return true;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.nameAr?.toLowerCase().includes(q) ||
        s.nameFr?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.categoryAr?.toLowerCase().includes(q) ||
        s.categoryFr?.toLowerCase().includes(q) ||
        s.id?.toLowerCase().includes(q)
      );
    });
    
    return result.sort((a, b) => {
      const orderA = a.order ?? 9999;
      const orderB = b.order ?? 9999;
      return orderA - orderB;
    });
  }, [allServices, searchQuery, selectedCategoryFilter, selectedStatusFilter]);

  return (
    <div className="w-full text-[#F8FAFC]">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>إدارة كتالوج الخدمات</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold">
              {allServices.length} خدمة
            </span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#A8B3C5] font-medium">
            تحكم شامل في الخدمات، الأسعار، الصور المربعة 1:1، والخدمات المميزة في واجهة المتجر.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
        >
          <Plus size={18} />
          <span>إضافة خدمة جديدة</span>
        </button>
      </div>

      {/* DB Status Indicators */}
      {fetchError && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300">
          <AlertCircle className="shrink-0 mt-0.5 text-rose-400" size={18} />
          <div className="text-xs font-bold">
            <p className="font-black">خطأ في الاتصال بقاعدة بيانات الخدمات:</p>
            <p className="mt-1 font-mono text-rose-200">{fetchError}</p>
          </div>
        </div>
      )}

      {emptySnapshot && !fetchError && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-300">
          <AlertCircle className="shrink-0 mt-0.5 text-amber-400" size={18} />
          <div className="text-xs font-bold">
            <p className="font-black">تنبيه: قاعدة البيانات فارغة</p>
            <p className="mt-1 text-amber-200/90 font-medium">يتم استخدام الكتالوج الأساسي المدمج. أي تعديل أو حفظ سيتم ترحيله فوراً إلى Firestore.</p>
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="space-y-6">
          {/* Top Sticky Header for Service Editing - Mobile Resilient */}
          <div className="bg-[#0B1120] border border-[#243247] rounded-3xl p-4 md:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-16 sm:top-20 z-30 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-10 h-10 rounded-2xl bg-[#111B2E] hover:bg-[#162238] border border-[#243247] text-[#A8B3C5] hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="رجوع للقائمة"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-0 rotate-180" />
              </button>
              <div>
                <h3 className="text-base md:text-lg font-black text-white leading-tight">
                  {selectedService ? `تعديل خدمة: ${formData.nameAr || formData.name}` : "إضافة خدمة جديدة"}
                </h3>
                <p className="text-xs text-[#A8B3C5] font-medium mt-0.5">
                  قم بضبط المعلومات والأسعار والصورة المربعة، ثم احفظ التغييرات.
                </p>
              </div>
            </div>

            {/* Action Buttons in Header */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => saveService()}
                disabled={loading || uploadProgress > 0}
                className={cn(
                  "flex-1 sm:flex-none px-6 py-3 text-slate-950 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0",
                  (loading || uploadProgress > 0)
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25 active:scale-95"
                )}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>حفظ التغييرات</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="px-4 py-3 bg-[#111B2E] hover:bg-[#162238] text-[#A8B3C5] hover:text-white rounded-xl font-bold text-xs border border-[#243247] transition-all cursor-pointer shrink-0"
              >
                إلغاء
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          {uploadProgress > 0 && (
            <div className="bg-[#111B2E] border border-emerald-500/30 p-4 rounded-2xl">
              <div className="flex justify-between text-xs font-black text-emerald-400 mb-2">
                <span>جاري معالجة ورفع الصورة السحابية...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#070B14] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Horizontal Scrollable Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-[#0B1120] rounded-2xl border border-[#243247] overflow-x-auto scrollbar-none">
            {[
              { id: "general", label: "المعلومات العامة والتمييز", icon: Layout },
              { id: "pricing", label: "نظام التسعير", icon: DollarSign },
              { id: "fields", label: "الحقول المطلوبة", icon: Database },
              { id: "appearance", label: "المظهر والصورة والمعاينة", icon: ImageIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-black text-xs whitespace-nowrap cursor-pointer shrink-0",
                  activeTab === tab.id
                    ? "bg-[#111B2E] text-emerald-400 shadow-sm border border-emerald-500/30"
                    : "text-[#A8B3C5] hover:text-white hover:bg-[#111B2E]/50"
                )}
              >
                <tab.icon size={15} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Form Content Card */}
          <div className="bg-[#0B1120] border border-[#243247] rounded-3xl p-5 md:p-8 shadow-xl">
            {activeTab === "general" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                      الاسم بالعربية
                    </label>
                    <input
                      type="text"
                      value={formData.nameAr || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nameAr: e.target.value,
                          name: e.target.value,
                        })
                      }
                      className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all font-bold placeholder-slate-500"
                      placeholder="ببجي موبايل - شحن شدات"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                      الاسم بالفرنسية / الإنجليزية
                    </label>
                    <input
                      type="text"
                      value={formData.nameFr || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, nameFr: e.target.value })
                      }
                      className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all font-bold placeholder-slate-500"
                      placeholder="PUBG Mobile UC"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                      الفئة المعتمدة
                    </label>
                    <select
                      value={formData.category || "games"}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all font-black cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option
                          key={cat.id}
                          value={cat.id}
                          className="bg-[#0B1120] text-white"
                        >
                          {cat.labelAr} ({cat.label})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                      ترتيب الظهور العام (رقم)
                    </label>
                    <input
                      type="number"
                      value={formData.order ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, order: e.target.value === "" ? "" as any : Number(e.target.value) })
                      }
                      className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all font-bold placeholder-slate-500"
                      placeholder="مثال: 1"
                    />
                  </div>
                </div>

                {/* FEATURED SERVICE TOGGLE CARD ⭐ */}
                <div className="p-5 rounded-2xl bg-[#111B2E] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                      <Star size={20} className={formData.isFeatured ? "fill-amber-400" : ""} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <span>تمييز الخدمة في الصفحة الرئيسية (Featured ⭐)</span>
                        {formData.isFeatured && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            مفعل حالياً
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-[#A8B3C5] font-medium mt-0.5">
                        عرض هذه الخدمة في قسم "خدمات مميزة" بأعلى الصفحة الرئيسية لجذب المشترين.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {formData.isFeatured && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#A8B3C5] font-bold">الترتيب:</span>
                        <input
                          type="number"
                          value={formData.featuredOrder ?? 1}
                          onChange={(e) => setFormData({ ...formData, featuredOrder: Number(e.target.value) || 1 })}
                          className="w-16 bg-[#0B1120] border border-[#243247] rounded-xl px-2 py-1.5 text-center text-xs text-amber-400 font-bold outline-none"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isFeatured: !prev.isFeatured }))}
                      className={cn(
                        "w-14 h-8 rounded-full transition-colors relative cursor-pointer shrink-0 border",
                        formData.isFeatured
                          ? "bg-amber-500 border-amber-400"
                          : "bg-[#162238] border-[#243247]"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 left-1 w-6 h-6 rounded-full transition-transform bg-white shadow-sm flex items-center justify-center text-slate-900",
                          formData.isFeatured ? "translate-x-6" : "translate-x-0"
                        )}
                      >
                        {formData.isFeatured ? <Star size={12} className="text-amber-500 fill-amber-500" /> : null}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                      الوصف بالعربية
                    </label>
                    <textarea
                      value={formData.descriptionAr || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          descriptionAr: e.target.value,
                        })
                      }
                      className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all font-bold min-h-[100px] placeholder-slate-500"
                      placeholder="وصف مختصر للخدمة..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                      الوصف بالفرنسية
                    </label>
                    <textarea
                      value={formData.descriptionFr || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, descriptionFr: e.target.value })
                      }
                      className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all font-bold min-h-[100px] placeholder-slate-500"
                      placeholder="Description en français..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                      حالة توفر الخدمة
                    </label>
                    <select
                      value={formData.status || "active"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all font-black cursor-pointer"
                    >
                      <option value="active" className="bg-[#0B1120] text-white">
                        متوفر للطلب (Active)
                      </option>
                      <option value="unavailable" className="bg-[#0B1120] text-white">
                        غير متوفر حالياً (Unavailable)
                      </option>
                      <option value="inactive" className="bg-[#0B1120] text-white">
                        مخفي من المتجر (Hidden)
                      </option>
                      <option value="archived" className="bg-[#0B1120] text-white">
                        مؤرشف (Archived)
                      </option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                      وسم مميز (Badge نصي)
                    </label>
                    <input
                      type="text"
                      value={formData.badge || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, badge: e.target.value })
                      }
                      className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all font-bold placeholder-slate-500"
                      placeholder="مثال: خصم 20%، تسليم فوري، الأكثر طلباً..."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pricing" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                      مود التسعير (Pricing Mode)
                    </label>
                    <select
                      value={formData.pricingMode || "fixed"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricingMode: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3.5 text-white outline-none focus:border-emerald-500/50 transition-all font-black cursor-pointer"
                    >
                      <option value="fixed" className="bg-[#0B1120] text-white">
                        سعر ثابت (Fixed)
                      </option>
                      <option value="range" className="bg-[#0B1120] text-white">
                        نطاق مبالغ (Range)
                      </option>
                      <option value="custom" className="bg-[#0B1120] text-white">
                        مبلغ حر (Custom)
                      </option>
                      <option value="quote" className="bg-[#0B1120] text-white">
                        طلب عرض سعر (Quote)
                      </option>
                    </select>
                  </div>

                  {(formData.pricingMode === "fixed" ||
                    formData.pricingMode === "custom") && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                          السعر الأساسي (MRU - أوقية جديدة)
                        </label>
                        <span className="text-[11px] font-bold text-emerald-400">
                          {priceInput && Number(priceInput) > 0 ? `${Number(priceInput).toLocaleString()} MRU` : "0 أوقية"}
                        </span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={priceInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setPriceInput(val);
                          setFormData(prev => ({
                            ...prev,
                            priceMru: val === "" ? 0 : Number(val),
                          }));
                        }}
                        onBlur={() => {
                          if (priceInput.trim() === "") {
                            setPriceInput("0");
                            setFormData(prev => ({ ...prev, priceMru: 0 }));
                          }
                        }}
                        placeholder="0"
                        className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3.5 text-emerald-400 outline-none focus:border-emerald-500/50 transition-all font-black text-xl text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  )}
                </div>

                {formData.pricingMode === "range" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-[#111B2E] rounded-2xl border border-[#243247]">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                        الحد الأدنى (Min MRU)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={minAmountInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setMinAmountInput(val);
                          setFormData(prev => ({
                            ...prev,
                            minAmountMru: val === "" ? 0 : Number(val),
                          }));
                        }}
                        onBlur={() => {
                          if (minAmountInput.trim() === "") {
                            setMinAmountInput("0");
                            setFormData(prev => ({ ...prev, minAmountMru: 0 }));
                          }
                        }}
                        placeholder="0"
                        className="w-full bg-[#0B1120] rounded-xl px-5 py-3 text-white border border-[#243247] outline-none focus:border-emerald-500/50 font-bold text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                        الحد الأقصى (Max MRU)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={maxAmountInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setMaxAmountInput(val);
                          setFormData(prev => ({
                            ...prev,
                            maxAmountMru: val === "" ? 0 : Number(val),
                          }));
                        }}
                        onBlur={() => {
                          if (maxAmountInput.trim() === "") {
                            setMaxAmountInput("0");
                            setFormData(prev => ({ ...prev, maxAmountMru: 0 }));
                          }
                        }}
                        placeholder="0"
                        className="w-full bg-[#0B1120] rounded-xl px-5 py-3 text-white border border-[#243247] outline-none focus:border-emerald-500/50 font-bold text-left font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "fields" && (
              <div className="space-y-6">
                <div className="p-4 bg-[#111B2E] border border-[#243247] rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">تتطلب كود تفعيل (PIN)</h4>
                    <p className="text-xs text-[#A8B3C5] mt-0.5">سيظهر حقل لإدخال كود التفعيل عند اكتمال الطلب لعرضه للمستخدم.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, requiresCode: !formData.requiresCode })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative shrink-0 border",
                      formData.requiresCode ? "bg-emerald-500 border-emerald-400" : "bg-[#162238] border-[#243247]"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                      formData.requiresCode ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>
                
                <h3 className="text-sm font-black text-white">
                  اختر الحقول المطلوبة من العميل عند الشراء:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {REQUIRED_FIELD_OPTIONS.map((field) => {
                    const isSelected = formData.requiredFields?.includes(field.id);
                    const isOptional = formData.optionalFields?.includes(field.id);
                    return (
                      <div key={field.id} className="flex gap-1 relative overflow-hidden rounded-2xl border border-[#243247] bg-[#111B2E]">
                        <button
                          type="button"
                          onClick={() => toggleField(field.id)}
                          className={cn(
                            "flex-1 flex flex-col items-start px-4 py-3 transition-all text-right",
                            isSelected
                              ? "bg-emerald-500/20 text-emerald-400 font-black"
                              : "text-[#A8B3C5] hover:bg-[#162238] font-bold"
                          )}
                        >
                          <span className="text-xs">{field.labelAr} (إجباري)</span>
                          <span className="text-[10px] opacity-60 uppercase">{field.label}</span>
                        </button>
                        
                        <div className="w-[1px] bg-[#243247] my-2"></div>
                        
                        <button
                          type="button"
                          onClick={() => toggleOptionalField(field.id)}
                          className={cn(
                            "flex flex-col items-center justify-center px-3 py-3 transition-all",
                            isOptional
                              ? "bg-amber-500/20 text-amber-400 font-black"
                              : "text-slate-500 hover:bg-[#162238] font-bold"
                          )}
                        >
                          <span className="text-[10px] whitespace-nowrap">اختياري</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  {/* Left Column: Image Controls */}
                  <div className="space-y-5">
                    <ImageUploader
                      onFileSelected={handleImageUpload}
                      onImageSelected={(base64) => {
                        // The cropped Blob is stored by onFileSelected at full quality.
                        // This callback is retained only for the remove-image action.
                        if (!base64) {
                          setFormData((prev) => ({ ...prev, imageUrl: "", image: "" }));
                        }
                      }}
                      initialPreview={formData.imageUrl || formData.image}
                      label="تحميل صورة الخدمة المربعة"
                      imageFit={formData.imageFit}
                      aspect={1}
                    />

                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider block">
                        أو رابط الصورة المباشر (URL)
                      </label>
                      <input
                        type="url"
                        value={formData.imageUrl || formData.image || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            imageUrl: e.target.value,
                            image: e.target.value,
                          }))
                        }
                        placeholder="https://example.com/image.webp"
                        className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-emerald-500/50 transition-all text-left ltr"
                      />
                      {selectedService && SERVICES.some((s) => s.id === selectedService.id) && (
                        <button
                          type="button"
                          onClick={() => {
                            const defaultStatic = SERVICES.find((s) => s.id === selectedService.id);
                            const defaultImg = defaultStatic?.imageUrl || defaultStatic?.image || "";
                            setFormData((prev) => ({
                              ...prev,
                              imageUrl: defaultImg,
                              image: defaultImg,
                            }));
                            showToast("تمت استعادة الصورة الافتراضية للخدمة", "info");
                          }}
                          className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1.5 mt-2 cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>استعادة الصورة الافتراضية الأصلية لهذه الخدمة</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider">
                        نمط ملاءمة الصورة (Image Fit)
                      </label>
                      <select
                        value={formData.imageFit || "cover"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            imageFit: e.target.value as any,
                          })
                        }
                        className="w-full bg-[#111B2E] border border-[#243247] rounded-2xl px-5 py-3 text-white outline-none focus:border-emerald-500/50 transition-all font-black cursor-pointer"
                      >
                        <option value="cover" className="bg-[#0B1120] text-white">
                          غطاء كامل (Cover - يملأ المساحة 100% بدون هوامش)
                        </option>
                        <option value="contain" className="bg-[#0B1120] text-white">
                          احتواء كامل (Contain - يظهر كامل الصورة مع الحفاظ على الأبعاد)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-3 bg-[#111B2E] p-5 rounded-2xl border border-[#243247]">
                      <div className="flex justify-between text-xs font-black text-[#A8B3C5]">
                        <span>هامش داخلي للصورة (Padding):</span>
                        <span className="text-emerald-400 font-mono">
                          {formData.imagePadding || 0}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="2"
                        value={formData.imagePadding || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            imagePadding: Number(e.target.value),
                          })
                        }
                        className="w-full h-1.5 bg-[#070B14] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Right Column: LIVE 1:1 CUSTOMER-FACING PREVIEW CARD */}
                  <div className="p-5 rounded-2xl bg-[#070B14] border border-[#243247] space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-[#A8B3C5] uppercase tracking-wider flex items-center gap-2">
                        <Smartphone size={15} className="text-emerald-400" />
                        <span>معاينة حية لبطاقة المتجر كما يراها العميل (1:1 Square)</span>
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        مباشر
                      </span>
                    </div>

                    <div className="max-w-[280px] mx-auto">
                      <ServiceCard
                        service={{
                          ...formData,
                          id: selectedService?.id || "preview-service",
                          name: formData.name || formData.nameAr || "اسم الخدمة",
                          nameAr: formData.nameAr || "اسم الخدمة بالعربية",
                          nameFr: formData.nameFr || "Nom du service",
                          title: formData.nameAr || formData.name || "اسم الخدمة",
                          titleAr: formData.nameAr || "اسم الخدمة بالعربية",
                          titleFr: formData.nameFr || "Nom du service",
                          description: formData.description || formData.descriptionAr || "",
                          descriptionAr: formData.descriptionAr || formData.description || "",
                          descriptionFr: formData.descriptionFr || formData.description || "",
                          imageUrl: formData.imageUrl || formData.image,
                          image: formData.image || formData.imageUrl,
                          priceMru: Number(priceInput.trim()) || formData.priceMru || 0,
                          price: Number(priceInput.trim()) || formData.priceMru || 0,
                          category: formData.category || "خدمات رقمية",
                          badge: formData.badge,
                          packages: formData.packages || [],
                          pricingMode: formData.pricingMode || "fixed",
                          imageFit: formData.imageFit || "cover",
                          imagePadding: formData.imagePadding || 0,
                          status: formData.status || "active",
                          isFeatured: formData.isFeatured,
                        }}
                        featured={Boolean(formData.isFeatured)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Sticky Save Bar - Resilient on Android */}
            <div className="mt-8 pt-6 border-t border-[#243247] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111B2E] -mx-5 -mb-5 md:-mx-8 md:-mb-8 p-5 md:p-6 rounded-b-3xl">
              <div className="flex items-center gap-2.5 text-xs text-[#A8B3C5] font-bold">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span>اضغط "حفظ بيانات وتعديلات الخدمة" للتأكيد وتحديث المتجر فوراً.</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-3 bg-[#0B1120] hover:bg-[#162238] text-[#A8B3C5] hover:text-white rounded-xl font-bold text-xs border border-[#243247] transition-all cursor-pointer shrink-0"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => saveService()}
                  disabled={loading || uploadProgress > 0}
                  className={cn(
                    "w-full sm:w-auto px-7 py-3 text-slate-950 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95",
                    (loading || uploadProgress > 0)
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25"
                  )}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>حفظ بيانات وتعديلات الخدمة الآن</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* List Header / Filters */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="relative flex-1 group">
              <Search
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-400 transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="ابحث عن اسم الخدمة أو الفئة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B1120] border border-[#243247] rounded-2xl pr-11 pl-4 py-3.5 text-white outline-none focus:border-emerald-500/40 transition-all font-bold placeholder-slate-500 shadow-md text-xs sm:text-sm"
              />
            </div>

            {/* Category & Status Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategoryFilter("all")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap border cursor-pointer",
                    selectedCategoryFilter === "all"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                      : "bg-[#0B1120] text-[#A8B3C5] border-[#243247] hover:bg-[#111B2E]"
                  )}
                >
                  جميع الفئات ({allServices.filter(s => !(s.status === "deleted" || s.isDeleted)).length})
                </button>
                {CATEGORIES.map((cat) => {
                  const count = allServices.filter(s => {
                    const isDel = s.status === "deleted" || s.isDeleted;
                    return !isDel && matchCategory(s.category, cat.id);
                  }).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryFilter(cat.id)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap border cursor-pointer",
                        selectedCategoryFilter === cat.id
                          ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                          : "bg-[#0B1120] text-[#A8B3C5] border-[#243247] hover:bg-[#111B2E]"
                      )}
                    >
                      {cat.labelAr} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 shrink-0 bg-[#0B1120] p-1 rounded-xl border border-[#243247] overflow-x-auto max-w-full">
                <button
                  onClick={() => setSelectedStatusFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap",
                    selectedStatusFilter === "all"
                      ? "bg-[#111B2E] text-white border border-[#243247]"
                      : "text-[#A8B3C5] hover:text-white"
                  )}
                >
                  الكل ({allServices.filter(s => !(s.status === "deleted" || s.isDeleted)).length})
                </button>
                <button
                  onClick={() => setSelectedStatusFilter("featured")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap",
                    selectedStatusFilter === "featured"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-amber-400 hover:text-amber-300"
                  )}
                >
                  <Star size={11} className="fill-amber-400" />
                  <span>مميز ({allServices.filter(s => Boolean(s.isFeatured || (s as any).featured) && !s.isDeleted).length})</span>
                </button>
                <button
                  onClick={() => setSelectedStatusFilter("active")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap",
                    selectedStatusFilter === "active"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-[#A8B3C5] hover:text-emerald-400"
                  )}
                >
                  <Eye size={11} />
                  <span>نشط ({allServices.filter(s => (s.status === "active" || s.status === "نشط") && !s.isDeleted).length})</span>
                </button>
                <button
                  onClick={() => setSelectedStatusFilter("inactive")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap",
                    selectedStatusFilter === "inactive"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-[#A8B3C5] hover:text-amber-400"
                  )}
                >
                  <EyeOff size={11} />
                  <span>مخفي</span>
                </button>
                <button
                  onClick={() => setSelectedStatusFilter("archived")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap",
                    selectedStatusFilter === "archived"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "text-[#A8B3C5] hover:text-purple-400"
                  )}
                >
                  <Archive size={11} />
                  <span>مؤرشف</span>
                </button>
                <button
                  onClick={() => setSelectedStatusFilter("deleted")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap",
                    selectedStatusFilter === "deleted"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "text-[#A8B3C5] hover:text-rose-400"
                  )}
                >
                  <Trash2 size={11} />
                  <span>محذوف</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <ServicesManagerSkeleton />
          ) : filteredServices.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-[#243247] rounded-3xl bg-[#0B1120]/50">
              <div className="w-16 h-16 bg-[#111B2E] rounded-full flex items-center justify-center mx-auto mb-4 text-[#A8B3C5]">
                <Database size={28} />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                لم يتم العثور على أي خدمات تطابق الفلاتر
              </h3>
              <p className="mt-1 text-xs text-[#A8B3C5] max-w-sm mx-auto">
                يمكنك إعادة ضبط الفلاتر أو إضافة خدمة جديدة إلى المتجر.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setSelectedStatusFilter("all");
                    setSelectedCategoryFilter("all");
                    setSearchQuery("");
                  }}
                  className="px-5 py-2.5 bg-[#111B2E] hover:bg-[#162238] text-white rounded-xl font-bold text-xs border border-[#243247] cursor-pointer"
                >
                  إعادة ضبط الفلاتر
                </button>
                <button
                  onClick={handleCreateNew}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs cursor-pointer shadow-md"
                >
                  إضافة خدمة جديدة
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredServices.map((service) => {
                const catInfo = CATEGORIES.find(c => matchCategory(service.category, c.id));
                const isDel = service.status === "deleted" || service.isDeleted === true;
                const rawStatus = (service.status || "").toLowerCase();
                const isUnavailable = !isDel && (rawStatus === "unavailable" || rawStatus === "غير متوفر" || rawStatus === "متوقف");
                const isInactive = !isDel && (rawStatus === "inactive" || rawStatus === "مخفي" || rawStatus === "غير نشط");
                const isActive = !isDel && !isUnavailable && !isInactive && (rawStatus === "active" || rawStatus === "نشط" || rawStatus === "");
                const isFeat = Boolean(service.isFeatured || (service as any).featured);
                const hasDb = Boolean((service as any).hasDbRecord);

                return (
                  <div
                    key={service.id}
                    className={cn(
                      "bg-[#0B1120] border rounded-2xl overflow-hidden group shadow-md hover:border-[#10B981]/50 transition-all duration-300 flex flex-col relative",
                      isDel
                        ? "border-rose-500/30 opacity-75"
                        : isUnavailable
                        ? "border-amber-500/30"
                        : isActive
                        ? "border-[#243247]"
                        : "border-[#243247] opacity-85"
                    )}
                  >
                    {/* 1:1 Aspect Square Artwork Media Container */}
                    <div className="aspect-square bg-[#070B14] relative overflow-hidden border-b border-[#243247] shrink-0">
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
                        {Boolean((service as any).isDefaultCatalog) && !hasDb && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[#070B14]/85 text-purple-300 backdrop-blur-md border border-purple-500/30 flex items-center gap-1">
                            <Code size={9} />
                            <span>مدمج</span>
                          </span>
                        )}
                        {Boolean((service as any).isDefaultCatalog) && hasDb && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[#070B14]/85 text-cyan-300 backdrop-blur-md border border-cyan-500/30 flex items-center gap-1">
                            <Cloud size={9} />
                            <span>مخصص</span>
                          </span>
                        )}
                        {!Boolean((service as any).isDefaultCatalog) && hasDb && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-[#070B14]/85 text-emerald-300 backdrop-blur-md border border-emerald-500/30 flex items-center gap-1">
                            <Database size={9} />
                            <span>سحابي</span>
                          </span>
                        )}
                      </div>

                      {/* 1-Click Quick Featured Toggle Button ⭐ */}
                      <button
                        type="button"
                        onClick={() => toggleFeatured(service)}
                        title={isFeat ? "إزالة من الخدمات المميزة" : "تمييز في الصفحة الرئيسية ⭐"}
                        className={cn(
                          "absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border shadow-md active:scale-90",
                          isFeat
                            ? "bg-amber-400 text-slate-950 border-amber-300"
                            : "bg-[#070B14]/80 text-[#A8B3C5] border-white/10 hover:text-amber-400 hover:border-amber-400/50"
                        )}
                      >
                        <Star size={14} className={isFeat ? "fill-slate-950" : ""} />
                      </button>

                      {/* Artwork Image */}
                      {service.imageUrl || service.image ? (
                        <img
                          src={service.imageUrl || service.image!}
                          className={cn(
                            "w-full h-full transition-transform duration-500 group-hover:scale-105",
                            service.imageFit === "contain"
                              ? "object-contain"
                              : "object-cover",
                            (!isActive || isDel) && "grayscale opacity-80"
                          )}
                          style={{ padding: `${service.imagePadding || 0}px` }}
                          alt={service.nameAr}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.failed) {
                              target.dataset.failed = 'true';
                              target.src = getFallbackServiceImage(service.nameAr || service.name || '', service.id);
                            }
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-600">
                          <ImageIcon size={36} />
                        </div>
                      )}

                      {/* Category Label at bottom of image */}
                      <div className="absolute bottom-2 right-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black bg-[#070B14]/85 text-[#A8B3C5] backdrop-blur-sm border border-white/10">
                          {catInfo?.labelAr || service.categoryAr || service.category}
                        </span>
                      </div>

                      {service.badge && (
                        <div className="absolute bottom-2 left-2">
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-500 text-slate-950 shadow-sm">
                            {service.badge}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-black text-white line-clamp-1 leading-tight text-right">
                            {service.nameAr || service.name}
                          </h3>
                          <div className="text-left shrink-0 font-mono">
                            <span className="text-xs font-black text-emerald-400">
                              {service.pricingMode === "quote"
                                ? "عقد"
                                : `${Number(service.priceMru || 0).toLocaleString()} MRU`}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-[#A8B3C5] font-bold line-clamp-1 mt-0.5 text-right">
                          {service.nameFr || service.name}
                        </p>
                      </div>

                      {/* Status Indicator & Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-[#243247]">
                        {isDel ? (
                          <>
                            <button
                              type="button"
                              onClick={() => restoreService(service)}
                              className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs transition-all cursor-pointer"
                            >
                              <RotateCcw size={12} />
                              <span>استعادة</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteService(service)}
                              className="flex items-center justify-center p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all border border-rose-500/30 cursor-pointer shrink-0"
                              title="حذف نهائي"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleEdit(service)}
                              className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#111B2E] hover:bg-[#162238] text-white rounded-xl font-black text-xs transition-all border border-[#243247] cursor-pointer"
                            >
                              <Settings size={12} className="text-emerald-400" />
                              <span>تعديل</span>
                            </button>

                            {/* Quick Active / Inactive Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleServiceStatus(service)}
                              className={cn(
                                "flex items-center justify-center p-2 rounded-xl transition-all border active:scale-95 cursor-pointer shrink-0",
                                isActive 
                                  ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border-amber-500/30" 
                                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border-emerald-500/30"
                              )}
                              title={isActive ? "إخفاء الخدمة" : "تفعيل الخدمة"}
                            >
                              {isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>

                            {/* Sort Up */}
                            <button
                              type="button"
                              onClick={() => moveService(service, 'up')}
                              className="flex items-center justify-center p-2 bg-[#111B2E] hover:bg-[#162238] text-[#A8B3C5] hover:text-white rounded-xl transition-all border border-[#243247] cursor-pointer shrink-0"
                              title="تحريك للأعلى"
                            >
                              <ArrowUp size={13} />
                            </button>
                            
                            {/* Sort Down */}
                            <button
                              type="button"
                              onClick={() => moveService(service, 'down')}
                              className="flex items-center justify-center p-2 bg-[#111B2E] hover:bg-[#162238] text-[#A8B3C5] hover:text-white rounded-xl transition-all border border-[#243247] cursor-pointer shrink-0"
                              title="تحريك للأسفل"
                            >
                              <ArrowDown size={13} />
                            </button>

                            {/* Delete/Archive */}
                            <button
                              type="button"
                              onClick={() => deleteService(service)}
                              className="flex items-center justify-center p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all border border-rose-500/30 cursor-pointer shrink-0"
                              title="حذف أو أرشفة الخدمة"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-[#0B1120] rounded-3xl border border-[#243247] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-right">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-7 h-7 stroke-[2]" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white">
                إدارة حذف وأرشفة الخدمة
              </h3>
              <p className="text-xs text-[#A8B3C5] font-medium leading-relaxed">
                الخدمة المحددة:{" "}
                <span className="text-rose-400 font-black">
                  "{serviceToDelete.nameAr || serviceToDelete.name}"
                </span>{" "}
                (معرّف: <code className="font-mono text-white bg-[#111B2E] px-1.5 py-0.5 rounded border border-[#243247]">{serviceToDelete.id}</code>)
              </p>
            </div>

            {/* Checking Orders Reference Notification */}
            {checkingOrders && (
              <div className="p-3 bg-[#111B2E] border border-[#243247] rounded-xl text-center text-xs text-[#A8B3C5] font-bold flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>جاري التحقق من سجل الطلبات السابقة...</span>
              </div>
            )}

            {!checkingOrders && orderCountForService !== null && orderCountForService > 0 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-amber-300 text-xs">
                <AlertCircle className="shrink-0 mt-0.5 text-amber-400" size={16} />
                <div>
                  <p className="font-black text-amber-200">تنبيه حماية تاريخ الطلبات والفواتير:</p>
                  <p className="mt-0.5 text-amber-300/90 leading-relaxed font-medium">
                    يوجد <strong className="font-mono text-amber-200">{orderCountForService}</strong> طلب مسجل بهذا المعرّف. لحماية سلامة بيانات الفواتير السابقة للعملاء، تم حظر الحذف النهائي التدميري. يُفضل اختيار <strong>أرشفة وإخفاء الخدمة</strong> لمنع الشراء الجديد مع الحفاظ الكامل على سجلات النظام.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="w-full sm:w-auto flex-1 px-4 py-3 bg-[#111B2E] hover:bg-[#162238] text-white rounded-xl font-bold text-xs border border-[#243247] transition-all cursor-pointer"
              >
                إلغاء التراجع
              </button>

              <button
                type="button"
                onClick={() => confirmDeleteService(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "جاري الأرشفة..." : "أرشفة وإخفاء فقط (موصى به)"}
              </button>

              {(!orderCountForService || orderCountForService === 0) && (
                <button
                  type="button"
                  onClick={() => confirmDeleteService(true)}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  حذف نهائي
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
