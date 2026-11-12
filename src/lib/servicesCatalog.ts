import type { Service, ServicePackage } from "../types";
import { getFallbackServiceImage, resolveServiceImage } from "./serviceImages";
import { SERVICES as STATIC_SERVICES } from "../data/services";

export type PricingMode = "fixed" | "package" | "range" | "quote" | "custom";

export interface CanonicalCategory {
  id: "games" | "digital_subs" | "gift_cards" | "digital_services";
  labelAr: string;
  labelFr: string;
  order: number;
}

export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  { id: "games", labelAr: "ألعاب", labelFr: "Jeux Vidéo", order: 1 },
  { id: "digital_subs", labelAr: "اشتراكات رقمية", labelFr: "Abonnements Numériques", order: 2 },
  { id: "gift_cards", labelAr: "بطاقات الهدايا", labelFr: "Cartes Cadeaux", order: 3 },
  { id: "digital_services", labelAr: "خدمات رقمية", labelFr: "Services Numériques", order: 4 },
];

/**
 * Normalizes any category string into one of the 4 canonical Arabic display categories:
 * "ألعاب" | "اشتراكات رقمية" | "بطاقات الهدايا" | "خدمات رقمية"
 */
export function normalizeCategoryDisplay(category?: string, serviceId?: string, serviceName?: string): "ألعاب" | "اشتراكات رقمية" | "بطاقات الهدايا" | "خدمات رقمية" {
  const cat = (category || "").trim().toLowerCase();
  const sid = (serviceId || "").trim().toLowerCase();
  const sname = (serviceName || "").trim().toLowerCase();

  // 1. Explicit Category ID mappings
  if (cat === "digital_services" || cat === "خدمات رقمية" || cat === "الخدمات الرقمية" || cat === "services") {
    return "خدمات رقمية";
  }
  if (cat === "digital_subs" || cat === "اشتراكات رقمية" || cat === "الاشتراكات الرقمية" || cat === "اشتراكات" || cat === "abonnements") {
    return "اشتراكات رقمية";
  }
  if (cat === "gift_cards" || cat === "بطاقات الهدايا" || cat === "البطاقات" || cat === "بطاقات" || cat === "cartes") {
    return "بطاقات الهدايا";
  }
  if (cat === "games" || cat === "ألعاب" || cat === "العاب" || cat === "jeux") {
    // Explicit protection: Snapchat Plus must NEVER appear in Games even if accidentally labeled 'games'
    if (sid.includes("snapchat") || sname.includes("snapchat") || sname.includes("سناب")) {
      return "خدمات رقمية";
    }
    return "ألعاب";
  }

  // 2. Snapchat rule: defaults to digital services
  if (sid.includes("snapchat") || sname.includes("snapchat") || sname.includes("سناب")) {
    return "خدمات رقمية";
  }

  // 3. Known games rule
  const knownGameKeys = ["pubg", "freefire", "cod", "fifa", "mobilelegends", "fortnite", "roblox", "brawl", "clash"];
  if (knownGameKeys.some(k => sid.includes(k))) {
    return "ألعاب";
  }

  // 4. Known subscriptions rule
  const knownSubKeys = ["netflix", "tod", "shahid", "spotify", "canva", "youtube", "prime", "disney", "osn", "bein", "chatgpt"];
  if (knownSubKeys.some(k => sid.includes(k) || sname.includes(k))) {
    return "اشتراكات رقمية";
  }

  // 5. Known gift cards rule
  const knownCardKeys = ["apple", "googleplay", "playstation", "xbox", "steam", "razer", "itunes", "card"];
  if (knownCardKeys.some(k => sid.includes(k) || sname.includes(k))) {
    return "بطاقات الهدايا";
  }

  // 6. Textual heuristics
  if (cat.includes("اشتراك") || cat.includes("abonnement") || cat.includes("streaming")) {
    return "اشتراكات رقمية";
  }
  if (cat.includes("بطاق") || cat.includes("carte") || cat.includes("gift")) {
    return "بطاقات الهدايا";
  }
  if (cat.includes("لعب") || cat.includes("game") || cat.includes("jeux")) {
    return "ألعاب";
  }

  return "خدمات رقمية";
}

/**
 * Standard field template generator ensuring that dynamic fields are consistent across
 * Service Page, Order Form, Confirmation Modal, and Admin details.
 */
export function buildDynamicFieldsForService(requiredFields: string[] = [], optionalFields: string[] = []): any[] {
  const allFields = [...requiredFields, ...optionalFields];
  if (allFields.length === 0) return [];
  const uniqueFields = Array.from(new Set(allFields));

  return uniqueFields.map((fieldId) => {
    const isRequired = requiredFields.includes(fieldId);

    switch (fieldId) {
      case "playerId":
        return {
          id: "playerId",
          label: "Player ID",
          labelAr: "معرف اللاعب (Player ID)",
          type: "text",
          required: isRequired,
          placeholder: "51231233",
          placeholderAr: "أدخل معرف الحساب أو ID اللاعب",
          pattern: "^[0-9]+$",
          helpAr: "تأكد من كتابة الآيدي بدقة لضمان الشحن السريع بدون تأخير",
        };
      case "server":
      case "region":
        return {
          id: "region",
          label: "Server / Region",
          labelAr: "سيرفر / منطقة الحساب",
          type: "select",
          required: isRequired,
          options: [
            { value: "global", label: "Global / عالمي" },
            { value: "mena", label: "MENA / الشرق الأوسط" },
            { value: "europe", label: "Europe / أوروبا" },
            { value: "us", label: "North America / أمريكا" },
          ],
        };
      case "username":
        return {
          id: "username",
          label: "Username",
          labelAr: "اسم المستخدم / الحساب",
          type: "text",
          required: isRequired,
          placeholder: "username_account",
          placeholderAr: "مثال: اسم المستخدم بدون مسافات",
        };
      case "email":
        return {
          id: "email",
          label: "Email",
          labelAr: "البريد الإلكتروني للتسليم",
          type: "email",
          required: isRequired,
          placeholder: "email@example.com",
          placeholderAr: "بريدك الإلكتروني لتلقي معلومات الشحن",
          pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
        };
      case "phone":
        return {
          id: "phone",
          label: "Phone",
          labelAr: "رقم هاتف للتواصل (واتساب)",
          type: "tel",
          required: isRequired,
          placeholder: "32 XX XX XX",
          placeholderAr: "رقم هاتفك الموريتاني (8 أرقام)",
          pattern: "^[0-9]{8,15}$",
        };
      case "cardId":
        return {
          id: "cardId",
          label: "Card / Account Number",
          labelAr: "رقم البطاقة / الحساب",
          type: "text",
          required: isRequired,
          pattern: "^[0-9A-Za-z]+$",
        };
      case "pageLink":
        return {
          id: "pageLink",
          label: "Page Link",
          labelAr: "رابط الصفحة المطلوبة",
          type: "text",
          required: isRequired,
          placeholder: "https://...",
          placeholderAr: "رابط الصفحة المباشر https://...",
        };
      case "profileLink":
        return {
          id: "profileLink",
          label: "Profile Link",
          labelAr: "رابط الحساب المباشر",
          type: "text",
          required: isRequired,
          placeholder: "https://...",
          placeholderAr: "رابط الحساب على المنصة",
        };
      case "objective":
        return {
          id: "objective",
          label: "Objective",
          labelAr: "هدف الحملة أو الخدمة",
          type: "text",
          required: isRequired,
          placeholder: "تفاعل / متابعين / مبيعات",
          placeholderAr: "اكتب الهدف المطلوب بدقة",
        };
      case "budgetMru":
        return {
          id: "budgetMru",
          label: "Budget (MRU)",
          labelAr: "الميزانية المخصصة (أوقية)",
          type: "number",
          required: isRequired,
          placeholder: "MRU",
          placeholderAr: "المبلغ المقترح بالأوقية",
          pattern: "^[0-9]+$",
        };
      case "appleIdEmail":
        return {
          id: "appleIdEmail",
          label: "Apple ID Email",
          labelAr: "بريد Apple ID",
          type: "email",
          required: isRequired,
          placeholder: "email@icloud.com",
          placeholderAr: "حساب الآبل آيدي المطلوب شحنه",
        };
      case "note":
        return {
          id: "note",
          label: "Additional Notes",
          labelAr: "ملاحظات وتفاصيل إضافية",
          type: "textarea",
          required: isRequired,
          placeholder: "أي توضيح خاص بطلبك...",
          placeholderAr: "أي توضيح خاص بطلبك...",
        };
      default:
        return {
          id: fieldId,
          label: fieldId,
          labelAr: fieldId,
          type: "text",
          required: isRequired,
        };
    }
  });
}

/**
 * Checks whether a service is marked as deleted or archived
 */
export function isServiceDeleted(item: any): boolean {
  if (!item) return false;
  const s = String(item.status || "").toLowerCase().trim();
  return item.isDeleted === true || s === "deleted" || s === "محذوف" || s === "مؤرشف";
}

/**
 * Single authoritative service merging function.
 * Ensures that Firestore documents ALWAYS override static base entries,
 * prices and pricing modes are unified, and images are appropriately resolved.
 */
export function buildAuthoritativeServicesList(dbDocs: any[] = []): Service[] {
  const serviceMap = new Map<string, Service>();

  // 1. Initialize static base catalog
  STATIC_SERVICES.forEach((s) => {
    const { resolvedImage, resolvedImageUrl } = resolveServiceImage(undefined, s);
    const catDisplay = normalizeCategoryDisplay(s.category, s.id, s.name);
    const priceMru = Number(s.priceMru ?? s.suggestedPrice ?? s.minAmount ?? 0);

    const req = (s as any).requiredFields || [];
    const opt = (s as any).optionalFields || [];
    const fields = (s as any).fields && Array.isArray((s as any).fields) && (s as any).fields.length > 0
      ? (s as any).fields
      : buildDynamicFieldsForService(req, opt);

    serviceMap.set(s.id, {
      ...s,
      category: catDisplay,
      categoryAr: catDisplay,
      image: resolvedImage,
      imageUrl: resolvedImageUrl,
      priceMru,
      price: priceMru,
      suggestedPrice: priceMru,
      pricingMode: (s.pricingMode as any) || (s.packages && s.packages.length > 0 ? "package" : "fixed"),
      status: s.status || "active",
      fields,
      packages: s.packages || [],
      order: s.order ?? 9999,
      isFeatured: (s as any).isFeatured || false,
    } as any);
  });

  // 2. Overlay Firestore documents (Authoritative Single Source of Truth)
  dbDocs.forEach((doc) => {
    if (!doc || !doc.id) return;
    if (isServiceDeleted(doc)) {
      serviceMap.delete(doc.id);
      return;
    }

    const existing = serviceMap.get(doc.id);
    const { resolvedImage, resolvedImageUrl } = resolveServiceImage(doc, existing);

    // Compute authoritative price
    const priceMru = Number(
      doc.priceMru !== undefined && doc.priceMru !== null
        ? doc.priceMru
        : doc.price !== undefined && doc.price !== null
        ? doc.price
        : doc.suggestedPrice !== undefined && doc.suggestedPrice !== null
        ? doc.suggestedPrice
        : existing?.priceMru ?? 0
    );

    // Compute authoritative category
    const rawCat = doc.category || existing?.category || "خدمات رقمية";
    const catDisplay = normalizeCategoryDisplay(rawCat, doc.id, doc.nameAr || doc.name);

    // Compute dynamic fields
    const req = doc.requiredFields || (existing as any)?.requiredFields || [];
    const opt = doc.optionalFields || (existing as any)?.optionalFields || [];
    const fields = doc.fields && Array.isArray(doc.fields) && doc.fields.length > 0
      ? doc.fields
      : buildDynamicFieldsForService(req, opt);

    // Pricing mode normalization
    let pricingMode = doc.pricingMode || existing?.pricingMode || "fixed";
    if (pricingMode === "range" || pricingMode === "custom") {
      pricingMode = "range";
    }

    const rawPackages: ServicePackage[] = doc.packages && Array.isArray(doc.packages) && doc.packages.length > 0
      ? doc.packages
      : existing?.packages || [];

    const orderNum = doc.order !== undefined && doc.order !== null
      ? Number(doc.order)
      : existing?.order !== undefined
      ? Number(existing.order)
      : 9999;

    serviceMap.set(doc.id, {
      ...(existing || {}),
      ...doc,
      id: doc.id,
      name: doc.name || existing?.name || "",
      nameAr: doc.nameAr || doc.name || existing?.nameAr || existing?.name || "",
      nameFr: doc.nameFr || doc.name || existing?.nameFr || existing?.name || "",
      description: doc.description || existing?.description || "",
      descriptionAr: doc.descriptionAr || doc.description || existing?.descriptionAr || existing?.description || "",
      descriptionFr: doc.descriptionFr || doc.description || existing?.descriptionFr || existing?.description || "",
      category: catDisplay,
      categoryAr: catDisplay,
      categoryFr: catDisplay === "ألعاب" ? "Jeux Vidéo" : catDisplay === "اشتراكات رقمية" ? "Abonnements Numériques" : catDisplay === "بطاقات الهدايا" ? "Cartes Cadeaux" : "Services Numériques",
      image: resolvedImage,
      imageUrl: resolvedImageUrl,
      priceMru,
      price: priceMru,
      suggestedPrice: priceMru,
      pricingMode,
      minAmountMru: doc.minAmountMru !== undefined ? Number(doc.minAmountMru) : existing?.minAmountMru || 0,
      maxAmountMru: doc.maxAmountMru !== undefined ? Number(doc.maxAmountMru) : existing?.maxAmountMru || 0,
      status: doc.status || "active",
      fields,
      requiredFields: req,
      optionalFields: opt,
      packages: rawPackages,
      order: orderNum,
      isFeatured: doc.isFeatured !== undefined ? Boolean(doc.isFeatured) : Boolean(existing?.isFeatured),
      featuredOrder: doc.featuredOrder !== undefined ? Number(doc.featuredOrder) : (existing as any)?.featuredOrder ?? orderNum,
      badge: doc.badge || existing?.badge || "",
      unit: doc.unit || existing?.unit || "",
    } as any);
  });

  // Sort by order ascending
  return Array.from(serviceMap.values()).sort((a, b) => {
    const orderA = a.order !== undefined ? Number(a.order) : 9999;
    const orderB = b.order !== undefined ? Number(b.order) : 9999;
    return orderA - orderB;
  });
}
