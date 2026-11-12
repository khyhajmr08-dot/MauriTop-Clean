import React, { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Gamepad2, Tv, Gift, Sparkles, Layers, Zap, Flame, TrendingDown, TrendingUp, ArrowUpDown, SlidersHorizontal, Check, ChevronDown } from "lucide-react";
import { useLanguage } from '../contexts/LanguageContext';
import OptimizedImage from "./OptimizedImage";
import { Skeleton } from "./Skeleton";
import { haptic, cn } from "../lib/utils";
import { resolveServiceCategory, sortServicesList } from "../lib/serviceUtils";
import { motion, AnimatePresence } from "motion/react";
import ServiceCard from "./ServiceCard";

type Service = {
  id: string;
  title: string;
  imageUrl: string;
  priceMru: number;
  category: "ألعاب" | "اشتراكات رقمية" | "بطاقات الهدايا" | "خدمات رقمية" | string;
  status: "active" | "inactive" | string;
  imageFit?: 'cover' | 'contain';
  imagePadding?: number;
  order?: number;
};

type Props = {
  services: Service[];
  onOpenService: (service: Service) => void;
  loading?: boolean;
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  sortOption?: SortOption;
  onSelectSort?: (sort: SortOption) => void;
  hideTabBar?: boolean;
};

const ALL = "ALL";
const CATEGORIES = [
  "ألعاب",
  "اشتراكات رقمية",
  "بطاقات الهدايا",
  "خدمات رقمية",
];

const categoryTranslations: Record<string, { ar: string, fr: string }> = {
  "ALL": { ar: "جميع الخدمات", fr: "Tous les services" },
  "ألعاب": { ar: "ألعاب إلكترونية", fr: "Jeux Vidéo" },
  "اشتراكات رقمية": { ar: "اشتراكات رقمية", fr: "Abonnements Digital" },
  "بطاقات الهدايا": { ar: "بطاقات الهدايا", fr: "Cartes Cadeaux" },
  "خدمات رقمية": { ar: "خدمات رقمية", fr: "Services Numériques" },
};

const categoryDescriptions: Record<string, { ar: string, fr: string }> = {
  "ألعاب": { ar: "شحن فوري ومضمون لأفضل الألعاب الحصرية", fr: "Recharge rapide et sécurisée pour vos jeux préférés" },
  "اشتراكات رقمية": { ar: "اشتراكات البث والترفيه بأسعار مميزة وسرعة تفعيل", fr: "Abonnements streaming & divertissement de haute qualité" },
  "بطاقات الهدايا": { ar: "بطاقات رصيد هدايا فورية ومتنوعة", fr: "Cartes cadeaux et recharges numériques instantanées" },
  "خدمات رقمية": { ar: "حلول وخدمات إلكترونية متكاملة وتصاميم", fr: "Solutions & services numériques sur mesure" },
};

function getCategoryIcon(cat: string, className = "w-4 h-4") {
  switch (cat) {
    case "ALL":
      return <Layers className={className} strokeWidth={1.75} />;
    case "ألعاب":
      return <Gamepad2 className={className} strokeWidth={1.75} />;
    case "اشتراكات رقمية":
      return <Tv className={className} strokeWidth={1.75} />;
    case "بطاقات الهدايا":
      return <Gift className={className} strokeWidth={1.75} />;
    case "خدمات رقمية":
      return <Sparkles className={className} strokeWidth={1.75} />;
    default:
      return <Zap className={className} strokeWidth={1.75} />;
  }
}

type SortOption = 'default' | 'popular' | 'price_asc' | 'price_desc' | 'name';

const sortOptions = [
  { id: 'default' as const, label: { ar: 'الترتيب الافتراضي', fr: 'Par défaut' }, icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
  { id: 'price_asc' as const, label: { ar: 'الأقل سعراً', fr: 'Prix croissant' }, icon: <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: 'price_desc' as const, label: { ar: 'الأعلى سعراً', fr: 'Prix décroissant' }, icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: 'name' as const, label: { ar: 'حسب الاسم', fr: 'Par nom' }, icon: <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" /> },
];

type CategorySectionProps = {                
  category: string; 
  items: Service[]; 
  onOpenService: (service: Service) => void;
  isArabic: boolean;
  sortOption: SortOption;
};

function CategorySection({ category, items, onOpenService, isArabic, sortOption }: CategorySectionProps) {
  const sortedItems = useMemo(() => {
    return sortServicesList(items, sortOption as any, isArabic);
  }, [items, sortOption, isArabic]);

  const isGames = category === "ألعاب";

  return (
    <section className="space-y-3 sm:space-y-4 w-full pt-1 sm:pt-2">
      {/* Polished Clean Section Header */}
      <div className="flex items-center justify-between gap-2 w-full pb-2 border-b border-[#243247] px-1">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            isGames 
              ? "bg-[#D6B35A]/10 border border-[#D6B35A]/25 text-[#D6B35A] shadow-[#D6B35A]/10" 
              : "bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] shadow-[#10B981]/10"
          }`}>
            {getCategoryIcon(category, "w-4 h-4 sm:w-5 sm:h-5")}
          </div>
          <div className="text-right">
            <h2 className="text-sm sm:text-base md:text-lg font-black text-[#F8FAFC] tracking-tight leading-tight flex items-center gap-2">
              <span>{categoryTranslations[category]?.[isArabic ? 'ar' : 'fr'] || category}</span>
              {isGames && (
                <span className="text-[10px] bg-[#D6B35A]/15 text-[#D6B35A] border border-[#D6B35A]/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#D6B35A]" />
                  <span>{isArabic ? "شحن سريع" : "Recharge Rapide"}</span>
                </span>
              )}
            </h2>
            {categoryDescriptions[category] && (
              <p className="text-[11px] sm:text-xs text-[#A8B3C5] font-medium mt-0.5 line-clamp-1">
                {categoryDescriptions[category][isArabic ? 'ar' : 'fr']}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <span className="rounded-xl bg-[#0B1120] border border-[#243247] px-2.5 py-1 text-[11px] sm:text-xs font-bold text-[#10B981] inline-flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span>{items.length}</span>
            <span className="text-[#A8B3C5] font-normal">{isArabic ? "خدمة" : "Service(s)"}</span>
          </span>
        </div>
      </div>

      {/* Responsive Grid */}
      <div className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] md:grid-cols-[repeat(3,minmax(0,1fr))] lg:grid-cols-[repeat(4,minmax(0,1fr))] xl:grid-cols-[repeat(5,minmax(0,1fr))] gap-2.5 xs:gap-3 sm:gap-4 w-full pt-1">
        {sortedItems.map((service, idx) => (
          <ServiceCard
            key={service.id}
            service={service}
            onClick={() => {
              haptic.light();
              onOpenService(service);
            }}
            priority={idx < 4}
            badge={idx === 0 && sortOption === 'popular' ? (isArabic ? "الأكثر طلباً 🔥" : "Top 🔥") : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export default function ServicesByCategory({ 
  services, 
  onOpenService, 
  loading,
  activeCategory: controlledCategory,
  onSelectCategory,
  sortOption: controlledSortOption,
  onSelectSort,
  hideTabBar = false
}: Props) {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const [internalCategory, setInternalCategory] = useState<string>(ALL);
  const activeCategory = controlledCategory !== undefined ? controlledCategory : internalCategory;

  const handleCategoryChange = (cat: string) => {
    haptic.light();
    if (onSelectCategory) {
      onSelectCategory(cat);
    } else {
      setInternalCategory(cat);
    }
  };

  const [internalSortOption, setInternalSortOption] = useState<SortOption>('popular');
  const sortOption = controlledSortOption !== undefined ? controlledSortOption : internalSortOption;

  const handleSortChange = (opt: SortOption) => {
    haptic.light();
    if (onSelectSort) {
      onSelectSort(opt);
    } else {
      setInternalSortOption(opt);
    }
  };
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

  const grouped = useMemo(() => {
    const map: Record<string, Service[]> = {
      "ألعاب": [],
      "اشتراكات رقمية": [],
      "بطاقات الهدايا": [],
      "خدمات رقمية": [],
    };

    services.forEach((service) => {
      const rawStatus = (service.status || "").toLowerCase();
      if (rawStatus === "inactive" || rawStatus === "غير متوفر" || rawStatus === "متوقف" || rawStatus === "صيانة" || rawStatus === "draft" || rawStatus === "deleted") {
        return;
      }

      const cat = resolveServiceCategory(service);
      if (map[cat]) {
        map[cat].push(service);
      } else {
        map["خدمات رقمية"].push(service);
      }
    });

    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        const orderA = a.order ?? 9999;
        const orderB = b.order ?? 9999;
        return orderA - orderB;
      });
    });

    return map;
  }, [services]);

  const displayedCategories = activeCategory === ALL 
    ? CATEGORIES 
    : [activeCategory as typeof CATEGORIES[number]];

  const totalCount = useMemo(() => {
    return services.filter(s => s.status === 'active').length;
  }, [services]);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 w-full animate-in fade-in duration-300">
        <div className="flex items-center sm:justify-center gap-2 px-1 pb-1 overflow-x-hidden w-full">
          {[
            { w: "w-24" },
            { w: "w-28" },
            { w: "w-32" },
            { w: "w-28" },
            { w: "w-28" }
          ].map((item, i) => (
            <Skeleton key={i} className={`h-9 sm:h-10 ${item.w} rounded-xl shrink-0 border border-white/10`} />
          ))}
        </div>
        
        {[
          { titleWidth: "w-32", subtitleWidth: "w-48" },
          { titleWidth: "w-36", subtitleWidth: "w-56" }
        ].map((cat, sectionIdx) => (
          <section key={sectionIdx} className="space-y-3 sm:space-y-4 w-full pt-1 sm:pt-2">
            <div className="flex items-center justify-between gap-2 px-1 w-full pb-2 border-b border-white/5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl shrink-0 border border-emerald-500/20" />
                <div className="space-y-1">
                  <Skeleton className={`h-4.5 ${cat.titleWidth} rounded-md`} />
                  <Skeleton className={`h-3 ${cat.subtitleWidth} rounded-md`} />
                </div>
              </div>
              <div className="shrink-0">
                <Skeleton className="h-6 w-16 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 xs:gap-3 sm:gap-4 w-full pt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative flex flex-col w-full h-full bg-[#0E1626] rounded-2xl overflow-hidden border border-white/10 shadow-sm">
                  <div className="w-full aspect-square relative bg-[#070B14] overflow-hidden">
                    <Skeleton className="w-full h-full rounded-none" />
                  </div>
                  <div className="p-2 sm:p-2.5 w-full bg-[#0E1626] relative z-20 min-h-[58px] flex flex-col justify-center items-center gap-1.5 border-t border-white/5">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 w-full">
      {/* 2 Clean Rows of Controls: Row 1 = Balanced Category Tabs, Row 2 = Compact Sorting Dropdown */}
      <div className="flex flex-col gap-2.5 w-full" dir={isArabic ? "rtl" : "ltr"}>
        
        {/* ROW 1: Sleek Category Filter Bar (Hidden if rendered directly below search bar) */}
        {!hideTabBar && (
          <div className="flex items-center justify-start sm:justify-center gap-1.5 xs:gap-2 px-3 sm:px-4 pb-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            {/* ALL Tab */}
            <button
              type="button"
              onClick={() => handleCategoryChange(ALL)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all duration-300 active:scale-95 cursor-pointer shrink-0 border",
                activeCategory === ALL 
                  ? "bg-[#10B981] text-[#042F2E] border-[#10B981] shadow-md shadow-[#10B981]/25 font-black" 
                  : "bg-[#0B1120] text-[#A8B3C5] border-[#243247] hover:border-[#10B981]/40 hover:text-[#F8FAFC]"
              )}
            >
              {getCategoryIcon(ALL, cn("w-3.5 h-3.5", activeCategory === ALL ? "text-[#042F2E]" : "opacity-80"))}
              <span>{categoryTranslations[ALL]?.[isArabic ? 'ar' : 'fr']}</span>
              
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-md font-black",
                activeCategory === ALL ? "bg-black/20 text-[#042F2E]" : "bg-[#111B2E] text-[#A8B3C5]"
              )}>
                {totalCount}
              </span>
            </button>

            {/* Individual Category Tabs */}
            {CATEGORIES.map((category) => {
              const count = grouped[category]?.length || 0;
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryChange(category)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-all duration-300 active:scale-95 cursor-pointer shrink-0 border",
                    isActive 
                      ? "bg-[#10B981] text-[#042F2E] border-[#10B981] shadow-md shadow-[#10B981]/25 font-black" 
                      : "bg-[#0B1120] text-[#A8B3C5] border-[#243247] hover:border-[#10B981]/40 hover:text-[#F8FAFC]"
                  )}
                >
                  {getCategoryIcon(category, cn("w-3.5 h-3.5", isActive ? "text-[#042F2E]" : "opacity-80"))}
                  <span>{categoryTranslations[category]?.[isArabic ? 'ar' : 'fr']}</span>
                  
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-md font-black",
                    isActive ? "bg-black/20 text-[#042F2E]" : "bg-[#111B2E] text-[#A8B3C5]"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ROW 2: Compact Sorting Selector Bar with Floating Dropdown (Hidden if rendered directly below search bar) */}
        {!hideTabBar && (
          <div className="flex items-center justify-between gap-2 px-1 py-1 w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#A8B3C5]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{isArabic ? "قائمة الخدمات المتاحة" : "Catalogue des services"}</span>
            </div>

            <div className="relative shrink-0" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  setIsSortOpen(!isSortOpen);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#0B1120] border border-[#243247] hover:border-[#10B981]/40 rounded-xl text-xs font-bold text-[#F8FAFC] transition-all cursor-pointer shadow-xs active:scale-95"
                aria-expanded={isSortOpen}
                aria-haspopup="listbox"
              >
                <span className="text-[#A8B3C5] font-normal">{isArabic ? "ترتيب:" : "Trier :"}</span>
                <span className="text-[#10B981] font-extrabold flex items-center gap-1">
                  {sortOptions.find(o => o.id === sortOption)?.icon}
                  <span>{sortOptions.find(o => o.id === sortOption)?.label[isArabic ? 'ar' : 'fr']}</span>
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
                      isArabic ? "left-0" : "right-0"
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
                            handleSortChange(opt.id);
                            setIsSortOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-right",
                            isSelected 
                              ? "bg-emerald-500/15 text-emerald-300 font-extrabold" 
                              : "text-slate-[#F8FAFC] hover:bg-white/5 hover:text-white"
                          )}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex items-center gap-2">
                            <span className="shrink-0">{opt.icon}</span>
                            <span>{opt.label[isArabic ? 'ar' : 'fr']}</span>
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
        )}

      </div>

      {/* Render Filtered Category Sections */}
      {displayedCategories.map((category) => {
        const items = grouped[category];
        if (!items || !items.length) return null;

        return (
          <CategorySection 
            key={category} 
            category={category} 
            items={items} 
            onOpenService={onOpenService} 
            isArabic={isArabic}
            sortOption={sortOption}
          />
        );
      })}
    </div>
  );
}



