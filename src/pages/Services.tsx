import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { OFFICIAL_PHONE } from "../constants";
import { SERVICES } from "../data/services";
import { ChevronRight, Star, Users, Zap, Search, MessageCircle, ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, isValidImageUrl } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { Service } from "../types";
import { cacheService } from "../lib/cache";
import { handleFirestoreError, OperationType } from "../lib/utils";
import { getFallbackServiceImage, resolveServiceImage } from "../lib/serviceImages";
import { dedupeByStableId } from "../lib/serviceUtils";

import { useAuth } from "../lib/useAuth";
import SEO from "../components/SEO";
import ServicesSkeleton from "../components/ServicesSkeleton";

const CATEGORIES_MAP = [
  { key: "الكل", ar: "الكل", fr: "Tout" },
  { key: "ألعاب", ar: "ألعاب", fr: "Jeux" },
  { key: "اشتراكات رقمية", ar: "اشتراكات رقمية", fr: "Abonnements" },
  { key: "بطاقات الهدايا", ar: "بطاقات الهدايا", fr: "Cartes Cadeaux" },
  { key: "خدمات رقمية", ar: "خدمات رقمية", fr: "Services Numériques" },
];

export default function Services() {
  const { language, isRtl, t } = useLanguage();
  const { isAdmin } = useAuth();
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [queryStr, setQueryStr] = useState("");
  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Instant load from cache (localStorage or IndexedDB)
    const cached = cacheService.get<Service[]>("db_services");
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setDbServices(cached);
      setIsLoading(false);
    } else {
      cacheService.getDurableServices().then((durable) => {
        if (durable && Array.isArray(durable) && durable.length > 0) {
          setDbServices(durable);
          setIsLoading(false);
        }
      });
      setIsLoading(true);
    }
    
    // 2. Real-time Firestore sync
    const unsub = onSnapshot(
      collection(db, "services"),
      (snapshot) => {
        let docs = snapshot.docs.map(doc => {
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

        // Intercept locally to immediately repair in current render state
        docs = docs.map(d => {
          const targetSubKeys = ['tod', 'shahid', 'netflix', 'spotify', 'disney', 'osn', 'bein', 'youtube', 'shahid-vip', 'tod-vip'];
          const isSubscriptionOrGame = targetSubKeys.some(key => d.id.toLowerCase().includes(key)) || (d.category === 'اشتراكات رقمية' || d.category === 'ألعاب' || d.category === 'اشتراكات');
          if (isSubscriptionOrGame && d.imageFit === 'contain') {
            return { ...d, imageFit: 'cover' };
          }
          return d;
        });

        setDbServices(docs);
        cacheService.set("db_services", docs);
        setIsLoading(false);
      },
      (error) => {
        console.error("Services real-time sync error:", error);
        handleFirestoreError(error, OperationType.GET, "services");
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [isAdmin]);

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
          const { resolvedImage, resolvedImageUrl } = resolveServiceImage(dbMatching, s);

          merged.push({
            ...s,
            ...dbMatching,
            image: resolvedImage,
            imageUrl: resolvedImageUrl,
            priceMru: Number(dbMatching.priceMru ?? dbMatching.price ?? s.suggestedPrice ?? s.minAmount ?? 0),
            imageFit: dbMatching.imageFit || s.imageFit || 'cover',
            imagePadding: dbMatching.imagePadding !== undefined ? Number(dbMatching.imagePadding) : 0,
            status: dbMatching.status || 'نشط',
            fields: dbMatching.fields || s.fields,
            packages: dbMatching.packages || s.packages || [],
            unit: s.unit || dbMatching.unit
          } as Service);
        }
      } else {
        merged.push({
          ...s,
          imageUrl: s.imageUrl || s.image || "",
          image: s.image || s.imageUrl || "",
          priceMru: Number(s.suggestedPrice || s.minAmount || 0),
          imageFit: s.imageFit || 'cover',
          imagePadding: 0,
          status: 'نشط',
          packages: s.packages || [],
        } as Service);
      }
    });

    dbServices.forEach(dbS => {
      const isDefault = SERVICES.some(s => s.id === dbS.id);
      if (!isDefault) {
        if (!isDeletedService(dbS)) {
          const { resolvedImage, resolvedImageUrl } = resolveServiceImage(dbS);

          merged.push({
            id: dbS.id,
            name: dbS.name || '',
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
            fields: dbS.fields || [],
            packages: dbS.packages || [],
            unit: dbS.unit || '',
            order: dbS.order || 0
          } as Service);
        }
      }
    });

    const sorted = merged.sort((a, b) => {
      const orderA = (a.order !== undefined && a.order !== null) ? a.order : 999;
      const orderB = (b.order !== undefined && b.order !== null) ? b.order : 999;
      return orderA - orderB;
    });

    // تطبيق دالة dedupeByStableId لضمان إزالة أي تكرار وتصفية أي خدمات تجريبية للمستخدم
    return dedupeByStableId(sorted);
  }, [dbServices]);

  const filteredServices = useMemo(() => {
    return allServices.filter((service) => {
      // Exclude drafts and stopped services
      if (service.status === 'مسودة' || service.status === 'Draft' || service.status === 'draft' || service.status === 'متوقف' || service.status === 'متوقفة') {
        return false;
      }
      const categoryMatch = activeCategory === "الكل" || service.category === activeCategory;
      const searchQuery = queryStr.toLowerCase();
      const matchesQuery =
        service.name.toLowerCase().includes(searchQuery) ||
        (service.nameAr && service.nameAr.toLowerCase().includes(searchQuery)) ||
        (service.nameFr && service.nameFr.toLowerCase().includes(searchQuery)) ||
        (service.description && service.description.toLowerCase().includes(searchQuery)) ||
        (service.descriptionAr && service.descriptionAr.toLowerCase().includes(searchQuery)) ||
        (service.descriptionFr && service.descriptionFr.toLowerCase().includes(searchQuery));
      return categoryMatch && matchesQuery;
    });
  }, [activeCategory, queryStr, allServices]);

  if (isLoading && dbServices.length === 0) {
    return (
      <div className={cn("text-white", isRtl ? "rtl" : "ltr")} dir={isRtl ? "rtl" : "ltr"}>
        <ServicesSkeleton />
      </div>
    );
  }

  return (
    <div className={cn("pb-20 text-white", isRtl ? "rtl" : "ltr")} dir={isRtl ? "rtl" : "ltr"}>
      <SEO 
        title={isRtl ? "جميع الخدمات" : "Tous les services"}
        description={isRtl ? "استعرض جميع خدمات شحن الألعاب والبطاقات المتوفرة" : "Parcourez tous les services de recharge de jeux et de cartes disponibles"}
      />
      {/* Header Section */}
      <section className="text-text-primary py-8 px-4 relative overflow-hidden bg-card-bg border border-border-light rounded-[2.5rem] mb-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary-main/10 rounded-full -mr-32 -mt-32"></div>
        
        <div className="max-w-4xl mx-auto relative z-10 text-center">
           <motion.div
             initial={{ opacity: 0, y: 15 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
           >
              <h1 className="text-3xl md:text-4xl font-black mb-3 italic tracking-tighter text-text-primary">
                {language === 'ar' ? 'البوابة الرقمية للشحن' : 'Portail de Recharge Premium'}
              </h1>
              <p className="text-xs md:text-sm text-text-secondary max-w-lg mx-auto leading-relaxed font-bold italic">
                {language === 'ar' 
                  ? 'خدمات شحن الألعاب والاشتراكات الرقمية الأسرع والأكثر مبيناً في موريتانيا.'
                  : 'Recharges de jeux et abonnements digitaux avec livraison instantanée.'}
              </p>
           </motion.div>

           {/* Search & Category Filter bar */}
           <div className="mt-8 max-w-3xl mx-auto">
             <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
               {/* Search input */}
               <div className="relative flex-1 group">
                 <Search className={cn("absolute top-1/2 -translate-y-1/2 text-primary-main/60 group-focus-within:text-primary-main transition-colors w-4 h-4", isRtl ? "right-4" : "left-4")} />
                 <input
                   type="text"
                    value={queryStr}
                    onChange={(e) => setQueryStr(e.target.value)}
                   placeholder={language === 'ar' ? 'ابحث عن خدمة أو لعبة...' : 'Chercher un service...'}
                   className={cn(
                     "w-full py-3.5 bg-main-bg/60 text-text-primary rounded-2xl border-2 border-primary-main/20 outline-none focus:border-primary-main/60 focus:ring-4 focus:ring-primary-main/10 text-sm transition-all font-black placeholder:text-text-secondary/40 shadow-xl",
                     isRtl ? "pl-4 pr-11 text-right" : "pr-4 pl-11 text-left"
                   )}
                 />
               </div>

               {/* Categories list */}
               <div className="flex flex-wrap gap-2 justify-center sm:justify-end shrink-0">
                 {CATEGORIES_MAP.map((cat) => (
                   <button
                     key={cat.key}
                     onClick={() => setActiveCategory(cat.key)}
                     className={cn(
                       "px-4 py-2.5 rounded-xl text-[11px] font-black transition-all border-2",
                       activeCategory === cat.key
                         ? "bg-primary-main border-primary-main text-slate-950 shadow-lg shadow-primary-main/20"
                         : "bg-main-bg/40 text-text-secondary border-border-light hover:border-primary-main/40 hover:text-text-primary"
                     )}
                   >
                     {language === 'ar' ? cat.ar : cat.fr}
                   </button>
                 ))}
               </div>
             </div>
           </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-7xl mx-auto">
        {filteredServices.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-lg mx-auto"
          >
            <div className="w-20 h-20 bg-primary-main/10 rounded-full flex items-center justify-center mb-6 border border-primary-main/20 relative">
              <Search className="w-8 h-8 text-primary-main opacity-60" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center border-2 border-main-bg">
                <span className="text-[10px] font-black text-white">!</span>
              </div>
            </div>
            <h3 className="text-xl font-black text-text-primary mb-2 italic">
              {language === 'ar' ? 'لم يعثر على نتائج' : 'Aucun Résultat'}
            </h3>
            <p className="text-xs text-text-secondary font-bold max-w-xs mb-8 leading-relaxed">
              {language === 'ar' 
                ? `عذراً، لم نجد أي خدمة تطابق "${queryStr}". جرب كلمات بحث أخرى أو تواصل معنا.` 
                : `Désolé, aucun service trouvé pour "${queryStr}". Essayez d'autres mots clés.`}
            </p>
            <Link 
              to="/contact" 
              className="px-6 py-3 bg-primary-main text-slate-950 text-[11px] font-black rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary-main/20 active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {language === 'ar' ? "تواصل مع الدعم الفني" : "Contacter le Support"}
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 px-2 sm:px-0">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service, idx) => {
                const serviceName = language === 'ar' ? (service.nameAr || service.name) : (service.nameFr || service.name);
                
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                  >
                    {service.status === 'صيانة' ? (
                      <div className="group flex flex-col bg-card-bg rounded-[2rem] transition-all overflow-hidden h-full shadow-lg relative grayscale opacity-75 cursor-not-allowed select-none border border-border-light">
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                           <span className="bg-orange-500 text-white text-[10px] font-black px-4 py-2 rounded-full transform rotate-[-15deg] shadow-2xl border border-white/20 uppercase tracking-wider">
                             {language === 'ar' ? 'صيانة' : 'En maintenance'}
                           </span>
                        </div>
                        {/* Image Area */}
                        <div className="w-full h-48 relative bg-main-bg overflow-hidden flex items-center justify-center p-4">
                          {service.imageFit === 'contain' ? (
                            <>
                              <div className="absolute inset-0 w-full h-full bg-main-bg pointer-events-none" />
                              <img 
                                src={service.image || null} 
                                alt={serviceName} 
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                className="w-full h-full object-contain z-10 transition-transform duration-500 group-hover:scale-110"
                                style={{ padding: service.imagePadding ? `${service.imagePadding}px` : '10px' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (!target.dataset.failed) {
                                    target.dataset.failed = 'true';
                                    target.src = getFallbackServiceImage(serviceName, service.id);
                                  }
                                }}
                              />
                            </>
                          ) : (
                            <img 
                              src={service.image || null} 
                              alt={serviceName} 
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              style={{ padding: service.imagePadding ? `${service.imagePadding}px` : '0px' }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.dataset.failed) {
                                  target.dataset.failed = 'true';
                                  target.src = getFallbackServiceImage(serviceName, service.id);
                                }
                              }}
                            />
                          )}
                        </div>

                        {/* Content Area */}
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="font-black text-sm text-text-primary group-hover:text-primary-main transition-colors line-clamp-1 mb-1">
                            {serviceName}
                          </h3>
                          
                          <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed mb-4 font-bold flex-1">
                            {language === 'ar' ? (service.descriptionAr || service.description) : (service.descriptionFr || service.description || service.descriptionAr)}
                          </p>
                          
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-light/50">
                            <span className="font-black text-[#1ECAD3] text-sm opacity-50">
                              {service.pricingMode === "quote" 
                                ? (language === 'ar' ? 'حسب الطلب' : 'Sur devis') 
                                : `${service.priceMru || 0} MRU`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Link
                        to={`/services/${service.id}`}
                        className="group flex flex-col bg-card-bg rounded-[2rem] transition-all duration-300 overflow-hidden h-full shadow-lg border border-border-light hover:border-primary-main/20 hover:shadow-primary-main/5 active:scale-[0.98]"
                      >
                        {/* Image Area */}
                        <div className="w-full h-48 relative bg-main-bg overflow-hidden flex items-center justify-center p-4">
                          {service.imageFit === 'contain' ? (
                            <>
                              <div className="absolute inset-0 w-full h-full bg-main-bg pointer-events-none" />
                              <img 
                                src={service.image || null} 
                                alt={serviceName} 
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                className="w-full h-full object-contain z-10 transition-transform duration-500 group-hover:scale-110"
                                style={{ padding: service.imagePadding ? `${service.imagePadding}px` : '10px' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (!target.dataset.failed) {
                                    target.dataset.failed = 'true';
                                    target.src = getFallbackServiceImage(serviceName, service.id);
                                  }
                                }}
                              />
                            </>
                          ) : (
                            <img 
                              src={service.image || null} 
                              alt={serviceName} 
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              style={{ padding: service.imagePadding ? `${service.imagePadding}px` : '0px' }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.dataset.failed) {
                                  target.dataset.failed = 'true';
                                  target.src = getFallbackServiceImage(serviceName, service.id);
                                }
                              }}
                            />
                          )}
                        </div>

                        {/* Content Area */}
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="font-black text-sm text-text-primary group-hover:text-primary-main transition-colors line-clamp-1 mb-1">
                            {serviceName}
                          </h3>
                          
                          <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed mb-4 font-bold flex-1">
                            {language === 'ar' ? (service.descriptionAr || service.description) : (service.descriptionFr || service.description || service.descriptionAr)}
                          </p>
                          
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-light/50">
                            <span className="font-black text-[#1ECAD3] text-sm">
                              {service.pricingMode === "quote" 
                                ? (language === 'ar' ? 'حسب الطلب' : 'Sur devis') 
                                : `${service.priceMru || 0} MRU`}
                            </span>
                            <span className="bg-primary-main/10 text-primary-main text-[10px] font-black px-3 py-1.5 rounded-lg group-hover:bg-primary-main group-hover:text-main-bg transition-colors">
                              {language === 'ar' ? 'اطلب الآن' : 'Commander'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )}
                 </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Support CTA */}
      <section className="max-w-3xl mx-auto mt-24 text-center">
         <div className="bg-card-bg border border-border-light p-8 md:p-12 rounded-[2rem] shadow-2xl flex flex-col items-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary-main/5 rounded-full -mr-16 -mt-16"></div>
            
            <h2 className="text-xl md:text-3xl font-black text-text-primary mb-4 italic tracking-tight">
              {language === 'ar' ? 'لم تجد الخدمة التي تبحث عنها؟' : 'Vous ne trouvez pas votre service ?'}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mb-8 max-w-md mx-auto leading-relaxed font-semibold">
              {language === 'ar' 
                ? 'تواصل معنا مباشرة عبر الواتساب وسنعمل على توفير الخدمة فوراً بإنسب الأسعار وبكل أمان.'
                : 'Envoyez un message d’assistance. Notre équipe cherchera les codes d’importations ou recharges manquantes.'}
            </p>
            <a 
              href={`https://wa.me/222${OFFICIAL_PHONE}?text=${encodeURIComponent(
                language === 'ar' 
                  ? "أهلاً، أريد طلب خدمة شحن مخصصة غير متوفرة بالمتجر" 
                  : "Bonjour, je cherche un service personnalisé non disponible sur la boutique."
              )}`}
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 bg-primary-main text-main-bg font-black rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary-main/20 active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {language === 'ar' ? 'تواصل مع الدعم الفني' : 'Parler à l’Assistance'}
              </span>
            </a>
         </div>
      </section>
    </div>
  );
}
