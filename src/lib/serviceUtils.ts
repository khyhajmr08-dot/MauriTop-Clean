import type { Service } from "../types";

/**
 * دالة لتوليد واستخراج معرف ثابت (Stable ID) موحد للخدمة
 * تقوم بتنظيف المعرف من أي فروقات في الأحرف الكبيرة أو الصغيرة أو الرموز الزائدة
 * وتطابق الأسماء الشائعة لتجنب تكرار نفس الخدمة بصيغ متعددة
 */
export function getStableServiceId(service: Partial<Service>): string {
  if (!service) return "";

  // 1. إذا كان المعرف الأساسي موجوداً، نعتمد عليه مباشرة بعد تنظيف المسافات والأحرف
  const rawId = (service.id || "").trim().toLowerCase();
  if (rawId) return rawId;

  // 2. استخراج المعرف البديل من الاسم بالإنجليزية أو العربية في حال غياب id تماماً
  const nameEn = (service.name || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (nameEn) return nameEn;

  return (service.nameAr || "").trim().replace(/\s+/g, "_").toLowerCase();
}

/**
 * دالة التحديد القطعي المعتمد لفئة الخدمة (Authoritative Category Resolution)
 * تضمن عدم الاعتماد على تخمين الكلمات في اسم الخدمة، وتعتمد 100% على الفئة المحفوظة
 * وتصحح الخلل السابق الذي كان يبقي سناب شات في الألعاب بعد نقله للخدمات الرقمية.
 */
export function resolveServiceCategory(service: Partial<Service>): "ألعاب" | "اشتراكات رقمية" | "بطاقات الهدايا" | "خدمات رقمية" {
  if (!service) return "خدمات رقمية";

  const rawCat = (service.category || service.categoryAr || "").trim().toLowerCase();

  // 1. مطابقة صريحة مع المعرفات القياسية والأسماء العربية
  if (rawCat === "games" || rawCat === "ألعاب" || rawCat === "الألعاب الإلكترونية" || rawCat === "العاب" || rawCat === "jeux") {
    return "ألعاب";
  }
  if (rawCat === "digital_subs" || rawCat === "اشتراكات رقمية" || rawCat === "الاشتراكات الرقمية" || rawCat === "اشتراكات" || rawCat === "abonnements") {
    return "اشتراكات رقمية";
  }
  if (rawCat === "gift_cards" || rawCat === "بطاقات الهدايا" || rawCat === "بطاقات" || rawCat === "البطاقات" || rawCat === "cartes") {
    return "بطاقات الهدايا";
  }
  if (rawCat === "digital_services" || rawCat === "خدمات رقمية" || rawCat === "الخدمات الرقمية" || rawCat === "خدمات" || rawCat === "services") {
    return "خدمات رقمية";
  }

  return "خدمات رقمية";
}

/**
 * دالة التحقق مما إذا كانت الخدمة بيانات تجريبية قديمة أو محذوفة
 */
export function isTestOrDeletedService(service: Partial<Service>): boolean {
  if (!service) return true;

  // فحص حالة الحذف
  if (
    service.status === "deleted" ||
    service.status === "Deleted" ||
    (service as any).isDeleted === true
  ) {
    return true;
  }

  // فحص الكلمات الدلالية التجريبية (Test Data Filter)
  const testKeywords = [
    "test",
    "demo",
    "sample",
    "fake",
    "temp",
    "تجريب",
    "اختبار",
    "وهمي",
    "مؤقت",
    "تجربة",
  ];

  const idLower = (service.id || "").toLowerCase();
  const nameLower = (service.name || "").toLowerCase();
  const nameAr = service.nameAr || "";
  const nameFr = (service.nameFr || "").toLowerCase();

  const isTestFlag = Boolean((service as any).isTest);

  return (
    isTestFlag ||
    testKeywords.some(
      (kw) =>
        idLower.includes(kw) ||
        nameLower.includes(kw) ||
        nameAr.includes(kw) ||
        nameFr.includes(kw)
    )
  );
}

/**
 * دالة dedupeByStableId:
 * تضمن إزالة أي تكرار للخدمات المعروضة للمستخدم بالاعتماد على معرف فريد ثابت (Stable ID)
 * مع تصفية البيانات التجريبية أو المحذوفة، وترتيب الخدمات بحسب الحقل order المحدد لها
 */
export function dedupeByStableId(services: Service[]): Service[] {
  if (!Array.isArray(services)) return [];

  const seenIds = new Set<string>();
  const deduped: Service[] = [];

  for (const item of services) {
    if (!item) continue;

    // استبعاد الخدمات التجريبية أو المحذوفة
    if (isTestOrDeletedService(item)) {
      continue;
    }

    // استخراج المعرف الفريد الثابت
    const stableId = getStableServiceId(item);
    if (!stableId) continue;

    // منع التكرار
    if (seenIds.has(stableId)) {
      continue;
    }

    seenIds.add(stableId);
    deduped.push(item);
  }

  // ترتيب الخدمات حسب ترتيب العرض order المحدد
  return deduped.sort((a, b) => {
    const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 999;
    const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 999;
    return orderA - orderB;
  });
}

// [MONETIZATION_PLACEHOLDER]: مكان مهيأ لإدراج الخدمات المميزة أو الإعلانات الممولة (Featured / Sponsored / AdMob)
export const MONETIZATION_CONFIG = {
  enableSponsoredSlots: false,
  adMobBannerSlotId: null as string | null,
};

/**
 * استخراج السعر الرقمي الفعلي لأي خدمة لدعم الترتيب والفلترة بدقة تامة
 */
export function getServiceEffectivePrice(service: any): number {
  if (!service) return 0;

  // 1. إذا كانت باقات محددة، نأخذ أقل سعر باقة صالحة
  if (Array.isArray(service.packages) && service.packages.length > 0) {
    const validAmounts = service.packages
      .map((p: any) => Number(p?.amount))
      .filter((a: number) => !isNaN(a) && a > 0);
    if (validAmounts.length > 0) {
      return Math.min(...validAmounts);
    }
  }

  // 2. إذا كان تسعير نطاقي (Range / Custom)
  const minRange = Number(service.minAmountMru || service.minAmount || 0);
  if (!isNaN(minRange) && minRange > 0) {
    return minRange;
  }

  // 3. الحقول المباشرة المتاحة
  const candidates = [
    service.priceMru,
    service.price,
    service.suggestedPrice
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const num = Number(c);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  return 0;
}

export type ServiceSortOption = 'default' | 'price_asc' | 'price_desc' | 'name';

/**
 * دالة الترتيب الموحدة والآمنة لخدمات المتجر بناءً على الخيار المحدد
 */
export function sortServicesList<T extends any>(
  items: T[],
  sortOption: ServiceSortOption,
  isArabic: boolean = true
): T[] {
  const list = [...items];

  if (sortOption === 'price_asc') {
    return list.sort((a, b) => {
      const priceA = getServiceEffectivePrice(a);
      const priceB = getServiceEffectivePrice(b);
      // العناصر بدون سعر حقيقي أو طلب تسعير توضع في النهاية
      if (priceA <= 0 && priceB <= 0) return ((a as any).order ?? 9999) - ((b as any).order ?? 9999);
      if (priceA <= 0) return 1;
      if (priceB <= 0) return -1;
      return priceA - priceB;
    });
  }

  if (sortOption === 'price_desc') {
    return list.sort((a, b) => {
      const priceA = getServiceEffectivePrice(a);
      const priceB = getServiceEffectivePrice(b);
      if (priceA <= 0 && priceB <= 0) return ((a as any).order ?? 9999) - ((b as any).order ?? 9999);
      if (priceA <= 0) return 1;
      if (priceB <= 0) return -1;
      return priceB - priceA;
    });
  }

  if (sortOption === 'name') {
    return list.sort((a, b) => {
      const nameA = (a as any).title || (a as any).nameAr || (a as any).name || '';
      const nameB = (b as any).title || (b as any).nameAr || (b as any).name || '';
      return nameA.localeCompare(nameB, isArabic ? 'ar' : 'fr');
    });
  }

  // 'default': الترتيب الافتراضي حسب order
  return list.sort((a, b) => {
    const orderA = (a as any).order !== undefined && (a as any).order !== null ? Number((a as any).order) : 9999;
    const orderB = (b as any).order !== undefined && (b as any).order !== null ? Number((b as any).order) : 9999;
    return orderA - orderB;
  });
}

