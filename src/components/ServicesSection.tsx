import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { SERVICES } from "../data/services";
import { useLanguage } from "../contexts/LanguageContext";
import { Search, Sparkles, MessageCircle, Gamepad2, Tv, Gift, Layers, Zap, SlidersHorizontal, ChevronDown, Check, Flame, TrendingDown, TrendingUp, ArrowUpDown } from "lucide-react";
import { haptic, cn, handleFirestoreError, OperationType } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { Service } from "../types";
import { resolveServiceImage } from "../lib/serviceImages";
import { cacheService } from "../lib/cache";
import ServicesByCategory from "./ServicesByCategory";
import { FeaturedServicesSection } from "./FeaturedServicesSection";
import { resolveServiceCategory } from "../lib/serviceUtils";
import { useToast } from "../contexts/ToastContext";

type SortOption = 'default' | 'popular' | 'price_asc' | 'price_desc' | 'name';

const sortOptions = [
  { id: 'default' as const, label: { ar: 'الترتيب الافتراضي', fr: 'Par défaut' }, icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
  { id: 'price_asc' as const, label: { ar: 'الأقل سعراً', fr: 'Prix croissant' }, icon: <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: 'price_desc' as const, label: { ar: 'الأعلى سعراً', fr: 'Prix décroissant' }, icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: 'name' as const, label: { ar: 'حسب الاسم', fr: 'Par nom' }, icon: <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" /> },
];

export default function ServicesSection() {
  const { language, isRtl } = useLanguage();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const focusSearch = searchParams.get("focusSearch") === "true";
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (focusSearch) {
      const input = document.getElementById("service-search-input") as HTMLInputElement;
      if (input) {
        input.focus();
        // Remove the parameter after focus
        setSearchParams(prev => {
          prev.delete("focusSearch");
          return prev;
        }, { replace: true });
      }
    }
  }, [focusSearch, setSearchParams]);

  const setSearch = (val: string) => {
    setSearchParams(prev => {
      if (val) {
        prev.set("search", val);
      } else {
        prev.delete("search");
      }
      return prev;
    });
  };

  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial cached data for instant render from localStorage or durable IndexedDB
    const cached = cacheService.get<Service[]>("db_services");
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setDbServices(cached);
      setLoading(false);
    } else {
      cacheService.getDurableServices().then((durable) => {
        if (durable && Array.isArray(durable) && durable.length > 0) {
          setDbServices(durable);
          setLoading(false);
        }
      });
    }

    // 2. Real-time Firestore sync to guarantee user-added/updated images are reflected immediately
    const unsub = onSnapshot(
      collection(db, "services"),
      (snapshot) => {
        let docs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            nameAr: data.nameAr || data.name,
            suggestedPrice: data.priceMru || data.suggestedPrice || data.price || 0,
          } as Service;
        });

        // Preserve the imageFit/imagePadding selected by the administrator.
        // Missing settings are left unset so the card's service-specific safe defaults apply.

        setDbServices(docs);
        cacheService.set("db_services", docs);
        setLoading(false);
      },
      (error) => {
        console.warn("ServicesSection real-time sync error, using fallback:", error);
        handleFirestoreError(error, OperationType.GET, "services");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [language, showToast]);

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
            fields: s.fields,
            packages: s.packages || [],
            unit: s.unit || dbMatching.unit
          } as Service);
        }
      } else {
        merged.push({
          ...s,
          imageUrl: s.imageUrl || s.image,
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
            nameAr: dbS.nameAr || dbS.name || '',
            nameFr: dbS.nameFr || dbS.name || '',
            description: dbS.description || '',
            descriptionAr: dbS.descriptionAr || dbS.description || '',
            descriptionFr: dbS.descriptionFr || dbS.description || '',
            category: dbS.category || 'خدمات رقمية',
            categoryAr: dbS.categoryAr || dbS.category || 'خدمات رقمية',
            categoryFr: dbS.categoryFr || dbS.category || 'Services Numériques',
            pricingMode: dbS.pricingMode || 'fixed',
            requiredFields: dbS.requiredFields || [],
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
            order: dbS.order
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

  const filteredServices = useMemo(() => {
    return allServices.filter((s) => {
      if (s.status === 'مسودة' || s.status === 'Draft' || s.status === 'draft' || s.status === 'متوقف' || s.status === 'متوقفة' || s.status === 'inactive' || s.status === 'غير نشط') {
        return false;
      }
      return s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.nameAr && s.nameAr.toLowerCase().includes(search.toLowerCase())) ||
        (s.nameFr && s.nameFr.toLowerCase().includes(search.toLowerCase()));
    });
  }, [search, allServices]);

  const navigate = useNavigate();

  const selectService = (id: string) => {
    navigate(`/services/${id}`);
  };

  const gridServices = useMemo(() => {
    return filteredServices.map((s) => {
      const mappedCategory = resolveServiceCategory(s);

      return {
        id: s.id,
        title: language === 'ar' ? (s.nameAr || s.name) : (s.nameFr || s.name),
        titleAr: s.nameAr || s.name,
        titleFr: s.nameFr || s.name,
        imageUrl: s.imageUrl || s.image || "",
        price: s.priceMru || s.suggestedPrice || 0,
        priceMru: s.priceMru || s.suggestedPrice || 0,
        category: mappedCategory,
        status: s.status || "active",
        descriptionAr: language === 'ar' ? (s.descriptionAr || s.description) : (s.descriptionFr || s.description || s.descriptionAr || s.description),
        imageFit: s.imageFit || 'cover',
        imagePadding: s.imagePadding || 0,
        pricingMode: s.pricingMode || "fixed",
        quantity: s.quantity !== undefined ? s.quantity : 999,
        order: s.order
      } as any;
    });
  }, [filteredServices, language]);

  return (
    <section id="services" className="w-full px-2 xs:px-3 sm:px-4 py-0 mt-0">
      {/* Improved mobile-first search bar with enhanced visibility and compact spacing */}
      <div className="flex flex-col gap-2.5 mb-3 sm:mb-4 max-w-3xl mx-auto px-0.5 pt-1">
        <div className="w-full relative group">
          <div className={cn(
            "absolute inset-y-0 flex items-center pointer-events-none text-emerald-400/70 group-focus-within:text-emerald-400 transition-colors z-10",
            isRtl ? "right-3.5" : "left-3.5"
          )}>
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <input
            id="service-search-input"
            type="text"
            placeholder={language === 'ar' ? 'ابحث عن لعبة أو خدمة رقمية...' : 'Rechercher un jeu ou service...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full h-12 sm:h-13 bg-[#111B2E] border border-[#243247] rounded-2xl outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 text-[#F8FAFC] text-xs sm:text-sm font-bold transition-all placeholder:text-[#A8B3C5]/70 shadow-sm",
              isRtl ? "pr-10 pl-9" : "pl-10 pr-9"
            )}
            dir={isRtl ? "rtl" : "ltr"}
          />
          {search && (
            <button 
              onClick={() => setSearch("")}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-[#0B1120] border border-[#243247] rounded-full flex items-center justify-center text-[#A8B3C5] hover:text-rose-400 transition-colors z-10 cursor-pointer text-xs",
                isRtl ? "left-2.5" : "right-2.5"
              )}
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Navigation Bar Directly Below Search Bar */}
        <div className="flex items-center justify-start sm:justify-center gap-1.5 xs:gap-2 px-1 pb-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          {/* ALL Tab */}
          <button
            type="button"
            onClick={() => {
              haptic.light();
              setActiveCategory("ALL");
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer shrink-0 border select-none",
              activeCategory === "ALL"
                ? "bg-[#10B981] text-[#042F2E] border-[#10B981] shadow-md shadow-[#10B981]/25 font-black"
                : "bg-[#0B1120] text-[#A8B3C5] border-[#243247] hover:border-[#10B981]/40 hover:text-[#F8FAFC]"
            )}
          >
            <Layers className={cn("w-3.5 h-3.5", activeCategory === "ALL" ? "text-[#042F2E]" : "text-emerald-400")} />
            <span>{language === 'ar' ? 'جميع الخدمات' : 'Tous'}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-black",
              activeCategory === "ALL" ? "bg-black/20 text-[#042F2E]" : "bg-[#111B2E] text-[#A8B3C5]"
            )}>
              {gridServices.length}
            </span>
          </button>

          {/* Games Category Tab */}
          <button
            type="button"
            onClick={() => {
              haptic.light();
              setActiveCategory("ألعاب");
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer shrink-0 border select-none",
              activeCategory === "ألعاب"
                ? "bg-[#10B981] text-[#042F2E] border-[#10B981] shadow-md shadow-[#10B981]/25 font-black"
                : "bg-[#0B1120] text-[#A8B3C5] border-[#243247] hover:border-[#10B981]/40 hover:text-[#F8FAFC]"
            )}
          >
            <Gamepad2 className={cn("w-3.5 h-3.5", activeCategory === "ألعاب" ? "text-[#042F2E]" : "text-emerald-400")} />
            <span>{language === 'ar' ? 'ألعاب إلكترونية' : 'Jeux Vidéo'}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-black",
              activeCategory === "ألعاب" ? "bg-black/20 text-[#042F2E]" : "bg-[#111B2E] text-[#A8B3C5]"
            )}>
              {gridServices.filter(s => s.category === "ألعاب").length}
            </span>
          </button>

          {/* Subscriptions Category Tab */}
          <button
            type="button"
            onClick={() => {
              haptic.light();
              setActiveCategory("اشتراكات رقمية");
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer shrink-0 border select-none",
              activeCategory === "اشتراكات رقمية"
                ? "bg-[#10B981] text-[#042F2E] border-[#10B981] shadow-md shadow-[#10B981]/25 font-black"
                : "bg-[#0B1120] text-[#A8B3C5] border-[#243247] hover:border-[#10B981]/40 hover:text-[#F8FAFC]"
            )}
          >
            <Tv className={cn("w-3.5 h-3.5", activeCategory === "اشتراكات رقمية" ? "text-[#042F2E]" : "text-cyan-400")} />
            <span>{language === 'ar' ? 'اشتراكات رقمية' : 'Abonnements'}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-black",
              activeCategory === "اشتراكات رقمية" ? "bg-black/20 text-[#042F2E]" : "bg-[#111B2E] text-[#A8B3C5]"
            )}>
              {gridServices.filter(s => s.category === "اشتراكات رقمية").length}
            </span>
          </button>

          {/* Gift Cards Category Tab */}
          <button
            type="button"
            onClick={() => {
              haptic.light();
              setActiveCategory("بطاقات الهدايا");
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer shrink-0 border select-none",
              activeCategory === "بطاقات الهدايا"
                ? "bg-[#10B981] text-[#042F2E] border-[#10B981] shadow-md shadow-[#10B981]/25 font-black"
                : "bg-[#0B1120] text-[#A8B3C5] border-[#243247] hover:border-[#10B981]/40 hover:text-[#F8FAFC]"
            )}
          >
            <Gift className={cn("w-3.5 h-3.5", activeCategory === "بطاقات الهدايا" ? "text-[#042F2E]" : "text-amber-400")} />
            <span>{language === 'ar' ? 'بطاقات الهدايا' : 'Cartes Cadeaux'}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-black",
              activeCategory === "بطاقات الهدايا" ? "bg-black/20 text-[#042F2E]" : "bg-[#111B2E] text-[#A8B3C5]"
            )}>
              {gridServices.filter(s => s.category === "بطاقات الهدايا").length}
            </span>
          </button>

          {/* Digital Services Category Tab */}
          <button
            type="button"
            onClick={() => {
              haptic.light();
              setActiveCategory("خدمات رقمية");
            }}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer shrink-0 border select-none",
              activeCategory === "خدمات رقمية"
                ? "bg-[#10B981] text-[#042F2E] border-[#10B981] shadow-md shadow-[#10B981]/25 font-black"
                : "bg-[#0B1120] text-[#A8B3C5] border-[#243247] hover:border-[#10B981]/40 hover:text-[#F8FAFC]"
            )}
          >
            <Sparkles className={cn("w-3.5 h-3.5", activeCategory === "خدمات رقمية" ? "text-[#042F2E]" : "text-emerald-400")} />
            <span>{language === 'ar' ? 'خدمات رقمية' : 'Services Digitaux'}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-md font-black",
              activeCategory === "خدمات رقمية" ? "bg-black/20 text-[#042F2E]" : "bg-[#111B2E] text-[#A8B3C5]"
            )}>
              {gridServices.filter(s => s.category === "خدمات رقمية").length}
            </span>
          </button>
        </div>

        {/* Row 2: Sorting Selector Bar Directly Below Category Tabs */}
        <div className="flex items-center justify-between gap-2 px-1 py-1 w-full max-w-7xl mx-auto border-t border-[#243247]/60 pt-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#A8B3C5]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#10B981]" />
            <span>
              {language === 'ar' 
                ? (activeCategory === "ALL" ? "قائمة جميع الخدمات المتاحة" : `قسم ${activeCategory}`) 
                : "Catalogue des services"}
            </span>
          </div>

          <div className="relative shrink-0" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => {
                haptic.light();
                setIsSortOpen(!isSortOpen);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0B1120] border border-[#243247] hover:border-[#10B981]/40 rounded-xl text-xs font-bold text-[#F8FAFC] transition-all cursor-pointer shadow-xs active:scale-95"
              aria-expanded={isSortOpen}
              aria-haspopup="listbox"
            >
              <span className="text-[#A8B3C5] font-normal">{language === 'ar' ? "ترتيب:" : "Trier :"}</span>
              <span className="text-[#10B981] font-extrabold flex items-center gap-1">
                {sortOptions.find(o => o.id === sortOption)?.icon}
                <span>{sortOptions.find(o => o.id === sortOption)?.label[isRtl ? 'ar' : 'fr']}</span>
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-[#A8B3C5] transition-transform duration-200", isSortOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isSortOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "absolute top-full mt-1.5 z-40 min-w-[165px] bg-[#0B1120] border border-[#243247] rounded-xl shadow-2xl p-1.5 space-y-0.5 backdrop-blur-xl",
                    isRtl ? "left-0" : "right-0"
                  )}
                  role="listbox"
                >
                  {sortOptions.map((opt) => {
                    const isSelected = sortOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          haptic.light();
                          setSortOption(opt.id);
                          setIsSortOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-right",
                          isSelected 
                            ? "bg-emerald-500/15 text-emerald-300 font-extrabold" 
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center gap-2">
                          <span className="shrink-0">{opt.icon}</span>
                          <span>{opt.label[isRtl ? 'ar' : 'fr']}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3] shrink-0" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {loading ? (
        <ServicesByCategory services={[]} onOpenService={() => {}} loading={true} />
      ) : filteredServices.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-lg mx-auto"
        >
          <div className="w-24 h-24 bg-primary-main/10 rounded-full flex items-center justify-center mb-8 relative border border-primary-main/20 shadow-[0_0_50px_-12px_rgba(30,202,211,0.3)] group">
            <Search className="w-10 h-10 text-primary-main transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center border-2 border-main-bg">
              <span className="text-[10px] font-black text-white">!</span>
            </div>
          </div>
          <h3 className="text-2xl font-black text-text-primary mb-3 italic tracking-tight">
            {language === 'ar' ? "لم نجد ما تبحث عنه" : "Aucun résultat trouvé"}
          </h3>
          <p className="text-text-secondary text-sm font-bold max-w-sm mb-10 leading-relaxed opacity-80">
            {language === 'ar' 
              ? `عذراً، لم نجد أي خدمة تطابق "${search}". تأكد من الاسم أو اطلبها مباشرة من الدعم.` 
              : `Désolé, aucun service ne correspond à "${search}". Vérifiez l'orthographe ou demandez-nous.`}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
            <button 
              onClick={() => setSearch("")}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-text-primary border border-border-light font-black rounded-2xl transition-all active:scale-95 text-sm"
            >
              {language === 'ar' ? "مسح البحث" : "Effacer"}
            </button>
            <Link 
              to="/contact" 
              className="w-full sm:w-auto px-8 py-4 bg-primary-main text-slate-950 font-black rounded-2xl transition-all hover:opacity-90 active:scale-95 text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-main/20"
            >
              <MessageCircle className="w-4 h-4" />
              {language === 'ar' ? "اطلب الخدمة الآن" : "Commander maintenant"}
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-2 sm:space-y-4 w-full">
          {/* Featured services section dynamically synchronized with active category, search, and sorting */}
          <FeaturedServicesSection 
            activeCategory={activeCategory}
            searchQuery={search}
            sortOption={sortOption}
            onOpenService={(service) => selectService(service.id)}
            services={allServices}
          />

          <ServicesByCategory 
            services={gridServices} 
            onOpenService={(service) => selectService(service.id)} 
            activeCategory={activeCategory}
            onSelectCategory={(cat) => setActiveCategory(cat)}
            sortOption={sortOption}
            onSelectSort={(sort) => setSortOption(sort)}
            hideTabBar={true}
          />
        </div>
      )}
    </section>
  );
}
