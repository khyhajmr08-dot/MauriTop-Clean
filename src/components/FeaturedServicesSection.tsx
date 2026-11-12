import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Sparkles } from "lucide-react";
import { cacheService } from "../lib/cache";
import type { Service } from "../types";
import { motion } from "motion/react";
import { buildAuthoritativeServicesList } from "../lib/servicesCatalog";
import { resolveServiceCategory, sortServicesList } from "../lib/serviceUtils";
import ServiceCard from "./ServiceCard";

export interface FeaturedServicesSectionProps {
  activeCategory?: string;
  searchQuery?: string;
  sortOption?: 'popular' | 'default' | 'price_asc' | 'price_desc' | 'name';
  onOpenService?: (service: Service) => void;
  services?: Service[];
}

export function FeaturedServicesSection({
  activeCategory = "ALL",
  searchQuery = "",
  sortOption = "default",
  onOpenService,
  services: propServices
}: FeaturedServicesSectionProps) {
  const { language, isRtl } = useLanguage();
  const [internalServices, setInternalServices] = useState<Service[]>([]);

  useEffect(() => {
    if (propServices && propServices.length > 0) return;

    // 1. Instant load from cache or default authoritative catalog
    const cached = cacheService.get<Service[]>("featured_services");
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setInternalServices(cached);
    } else {
      setInternalServices(buildAuthoritativeServicesList([]));
    }
    
    // 2. Real-time sync with single authoritative builder
    const unsub = onSnapshot(
      collection(db, "services"),
      (snapshot) => {
        const dbServices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const merged = buildAuthoritativeServicesList(dbServices);

        setInternalServices(merged);
        cacheService.set("featured_services", merged);
      },
      (err) => {
        console.warn("FeaturedServices sync error (using local catalog):", err);
      }
    );

    return () => unsub();
  }, [propServices]);

  const sourceServices = propServices && propServices.length > 0 ? propServices : internalServices;

  const featuredOnes = useMemo(() => {
    // 1. Filter out inactive or deleted items
    let filtered = sourceServices.filter(s => {
      const rawStatus = (s.status || '').toLowerCase();
      return rawStatus !== 'inactive' && rawStatus !== 'غير متوفر' && rawStatus !== 'متوقف' && rawStatus !== 'صيانة' && rawStatus !== 'draft' && rawStatus !== 'deleted';
    });

    // 2. Filter by search query if present
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.nameAr && s.nameAr.toLowerCase().includes(q)) ||
        (s.nameFr && s.nameFr.toLowerCase().includes(q))
      );
    }

    // 3. Filter by active category if not ALL
    if (activeCategory && activeCategory !== "ALL") {
      filtered = filtered.filter(s => {
        const cat = resolveServiceCategory(s);
        return cat === activeCategory;
      });
    }

    if (filtered.length === 0) return [];

    // 4. Prefer items explicitly marked featured
    const explicitlyFeatured = filtered.filter(s => (s as any).isFeatured === true || (s as any).featured === true);
    let selected = explicitlyFeatured.length > 0 ? explicitlyFeatured : filtered;

    // 5. Apply sorting preference if passed
    if (sortOption && sortOption !== 'default' && sortOption !== ('popular' as any)) {
      selected = sortServicesList(selected, sortOption as any, language === 'ar');
    } else {
      selected = [...selected].sort((a, b) => ((a as any).featuredOrder ?? a.order ?? 999) - ((b as any).featuredOrder ?? b.order ?? 999));
    }

    return selected.slice(0, 4);
  }, [sourceServices, searchQuery, activeCategory, sortOption, language]);

  if (featuredOnes.length === 0) return null;

  const categoryTitleSuffix = activeCategory !== "ALL"
    ? ` - ${activeCategory}`
    : "";

  return (
    <section dir={isRtl ? "rtl" : "ltr"} className="mx-auto max-w-7xl px-2 xs:px-3 sm:px-4 py-3 sm:py-4">
      <div className="mb-3 sm:mb-4 flex items-center justify-between gap-4 border-b border-[#243247] pb-2.5">
        <div className={isRtl ? "text-right" : "text-left"}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#D6B35A]/10 border border-[#D6B35A]/25 rounded-xl text-[#D6B35A]">
              <Sparkles className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                <span>
                  {language === 'ar'
                    ? `الخدمات المميزة والأكثر طلباً${categoryTitleSuffix}`
                    : `Services Populaires${categoryTitleSuffix}`}
                </span>
                <span className="text-[10px] bg-[#D6B35A]/20 text-[#D6B35A] px-2 py-0.5 rounded-md font-black border border-[#D6B35A]/30">
                  {language === 'ar' ? 'مميز' : 'Top'}
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-[#A8B3C5] font-normal mt-0.5">
                {language === 'ar' ? 'شحن فوري مباشر معتمد عبر بنكيلي ومصرفي وسداد' : 'Recharge instantanée par Bankily, Masrvi et Sedad'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(4,minmax(0,1fr))] gap-2.5 xs:gap-3 sm:gap-4">
        {featuredOnes.map((service, index) => (
          <motion.div
            key={service.id}
            className="min-w-0 w-full"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.2 }}
            viewport={{ once: true }}
          >
            <ServiceCard 
              service={service} 
              featured={true} 
              priority={index < 2}
              badge={index === 0 ? (language === 'ar' ? 'الأكثر طلباً 🔥' : 'Top 🔥') : undefined}
              onClick={onOpenService ? () => onOpenService(service) : undefined}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default FeaturedServicesSection;
