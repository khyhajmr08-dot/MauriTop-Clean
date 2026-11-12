import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Zap, ShoppingCart, Tv, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { cn, haptic } from '../lib/utils';
import { resolveServiceImage } from '../lib/serviceImages';
import { normalizeCategoryDisplay } from '../lib/servicesCatalog';
import OptimizedImage from './OptimizedImage';

export interface ServiceCardProps {
  service: any;
  onClick?: () => void;
  featured?: boolean;
  badge?: string;
  className?: string;
  priority?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onClick,
  featured = false,
  badge,
  className,
  priority = false,
}) => {
  const { language, isRtl } = useLanguage();
  const navigate = useNavigate();

  // Normalize product titles
  const title = useMemo(() => {
    if (language === 'ar') {
      return service.nameAr || service.titleAr || service.name || service.title || '';
    }
    return service.nameFr || service.titleFr || service.name || service.title || service.nameAr || '';
  }, [service, language]);

  // Short description
  const description = useMemo(() => {
    if (language === 'ar') {
      return service.descriptionAr || service.description || '';
    }
    return service.descriptionFr || service.description || service.descriptionAr || '';
  }, [service, language]);

  // Resolve genuine image URL
  const resolvedImageUrl = useMemo(() => {
    return resolveServiceImage(service, service).resolvedImageUrl;
  }, [service]);

  // Normalize category
  const canonicalCategory = useMemo(() => {
    return normalizeCategoryDisplay(service.category, service.id, title);
  }, [service.category, service.id, title]);

  // Action CTA label matching product category
  const actionLabel = useMemo(() => {
    if (canonicalCategory === 'ألعاب') {
      return language === 'ar' ? 'اشحن الآن' : 'Recharger';
    }
    if (canonicalCategory === 'بطاقات الهدايا') {
      return language === 'ar' ? 'اشترِ البطاقة' : 'Acheter';
    }
    if (canonicalCategory === 'اشتراكات رقمية') {
      return language === 'ar' ? 'اشترك الآن' : "S'abonner";
    }
    return language === 'ar' ? 'اطلب الآن' : 'Commander';
  }, [canonicalCategory, language]);

  // Price calculation - never 0 for valid purchasable items
  const priceDisplay = useMemo(() => {
    // 1. Quote pricing
    if (service.pricingMode === 'quote') {
      return {
        prefix: '',
        amount: language === 'ar' ? 'طلب تسعير' : 'Sur devis',
        isText: true
      };
    }

    // 2. Package pricing (show lowest valid positive package price)
    if (service.packages && Array.isArray(service.packages) && service.packages.length > 0) {
      const validAmounts = service.packages
        .map((p: any) => Number(p.amount))
        .filter((a: number) => !isNaN(a) && a > 0);

      if (validAmounts.length > 0) {
        const minPkg = Math.min(...validAmounts);
        return {
          prefix: language === 'ar' ? 'يبدأ من' : 'Dès',
          amount: `${minPkg} MRU`,
          isText: false
        };
      }
    }

    // 3. Range pricing
    if (service.pricingMode === 'range' || service.pricingMode === 'custom') {
      const minVal = Number(service.minAmountMru || service.minAmount || 50);
      return {
        prefix: language === 'ar' ? 'يبدأ من' : 'Dès',
        amount: `${minVal} MRU`,
        isText: false
      };
    }

    // 4. Fixed price
    const fixedPrice = Number(service.priceMru ?? service.price ?? service.suggestedPrice ?? 0);
    if (fixedPrice > 0) {
      return {
        prefix: '',
        amount: `${fixedPrice} MRU`,
        isText: false
      };
    }

    // Fallback if price is unverified
    return {
      prefix: '',
      amount: language === 'ar' ? 'شحن فوري' : 'Instantané',
      isText: true
    };
  }, [service, language]);

  // Decide image fit and padding
  const imageFit = useMemo(() => {
    if (service.imageFit === 'contain') return 'contain';
    const id = (service.id || '').toLowerCase();
    if (id.includes('apple') || id.includes('spotify') || id.includes('playstation') || id.includes('googleplay')) {
      return 'contain';
    }
    return 'cover';
  }, [service.imageFit, service.id]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    haptic.light();
    if (onClick) {
      onClick();
    } else if (service.id) {
      navigate(`/services/${service.id}`);
    }
  };

  const activeBadge = badge || service.badge;

  return (
    <article
      onClick={handleClick}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={cn(
        "service-card-container group relative cursor-pointer min-w-0 max-w-full",
        "flex flex-col justify-between",
        "w-full h-full min-h-[290px] sm:min-h-[320px]",
        "bg-[#0B1120] rounded-2xl overflow-hidden",
        "border border-[#243247] hover:border-[#10B981]/60 hover:bg-[#111B2E]",
        "transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-black/60 hover:-translate-y-0.5 active:scale-[0.98]",
        "select-none",
        featured && "ring-1 ring-[#D6B35A]/30 border-[#D6B35A]/40",
        className
      )}
    >
      {/* 1. Square 1:1 Image Area (100% full artwork without artificial mask) */}
      <div className="w-full aspect-square relative bg-[#070B14] overflow-hidden flex items-center justify-center shrink-0">
        <OptimizedImage
          src={resolvedImageUrl}
          alt={title}
          fallbackTitle={title}
          fallbackId={service.id}
          aspectRatio="1/1"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          fetchPriority={priority ? "high" : "auto"}
          loading={priority ? "eager" : "lazy"}
          objectFit={imageFit}
          padding={imageFit === 'contain' ? (service.imagePadding || 8) : 0}
          className="w-full h-full block transition-transform duration-300 group-hover:scale-105"
        />

        {/* Promotional or Featured Badge Overlay (Never hides or replaces price) */}
        {activeBadge && (
          <div className="absolute top-2 right-2 z-20 pointer-events-none">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black shadow-md border bg-amber-500/90 text-slate-950 border-amber-300/40">
              {activeBadge}
            </span>
          </div>
        )}

        {/* Region notice for Apple US or specific region cards */}
        {(service.id?.includes('apple') || service.id?.includes('itunes')) && (
          <div className="absolute bottom-1.5 left-1.5 z-20 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded bg-blue-500/80 text-white text-[9px] font-black border border-blue-400/40 backdrop-blur-xs">
              US متجر أمريكي
            </span>
          </div>
        )}
      </div>

      {/* 2. Content Body: Product Name + Short Description */}
      <div className="service-card-content min-w-0 p-2.5 sm:p-3 flex flex-col justify-between flex-1 border-t border-[#243247]/70">
        <div className="space-y-1">
          <h3 
            className="text-xs sm:text-sm font-black text-[#F8FAFC] text-center leading-snug group-hover:text-emerald-300 transition-colors line-clamp-2 min-h-[2.5rem] flex items-center justify-center"
            title={title}
          >
            {title}
          </h3>

          {description ? (
            <p className="text-[10px] sm:text-[11px] text-[#A8B3C5] font-normal line-clamp-1 text-center">
              {description}
            </p>
          ) : (
            <p className="text-[10px] text-slate-500 font-normal line-clamp-1 text-center">
              {canonicalCategory}
            </p>
          )}
        </div>

        {/* 3. Footer Row: Aligned Price + Category Action Button */}
        <div className="service-card-footer mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
          {/* Price Section */}
          <div className="service-card-price flex flex-col text-right min-w-0">
            {priceDisplay.prefix && (
              <span className="text-[9px] text-[#A8B3C5] font-medium leading-none mb-0.5">
                {priceDisplay.prefix}
              </span>
            )}
            <span className={cn(
              "service-card-price-amount max-w-full font-mono font-black text-xs sm:text-sm tracking-tight",
              priceDisplay.isText ? "text-[#06B6D4]" : "text-[#10B981]"
            )}>
              {priceDisplay.amount}
            </span>
          </div>

          {/* Action CTA Button */}
          <button
            type="button"
            tabIndex={-1}
            className="service-card-action max-w-full min-w-0 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 shadow-xs shrink-0 cursor-pointer group-hover:shadow-emerald-500/20 group-hover:shadow-md"
          >
            <span>{actionLabel}</span>
            {isRtl ? (
              <ArrowLeft className="w-3 h-3 stroke-[2.5] rtl:rotate-0" />
            ) : (
              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
};

export default ServiceCard;
