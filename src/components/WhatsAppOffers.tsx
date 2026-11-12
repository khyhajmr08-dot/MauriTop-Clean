import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, ChevronLeft, ChevronRight, Sparkles, Flame, Clock } from 'lucide-react';
import { cacheService } from '../lib/cache';
import { cn } from '../lib/utils';
import { OFFICIAL_PHONE } from '../constants';

function getRemainingTime(offer: any, now: number) {
  if (!offer) return null;

  let targetMs: number | null = null;
  if (offer.expiresAt) {
    if (typeof offer.expiresAt === 'number' && !isNaN(offer.expiresAt)) {
      targetMs = offer.expiresAt;
    } else if (typeof offer.expiresAt?.toMillis === 'function') {
      targetMs = offer.expiresAt.toMillis();
    } else {
      const parsed = new Date(offer.expiresAt).getTime();
      if (!isNaN(parsed)) targetMs = parsed;
    }
  } else if (offer.expiryDate) {
    const parsed = new Date(offer.expiryDate).getTime();
    if (!isNaN(parsed)) targetMs = parsed;
  }

  if (!targetMs || isNaN(targetMs)) {
    return null;
  }

  const diffMs = targetMs - now;
  if (diffMs <= 0) {
    return { expired: true, hours: 0, minutes: 0, seconds: 0, formatted: "00:00:00" };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    return null;
  }

  return {
    expired: false,
    hours,
    minutes,
    seconds,
    formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  };
}

export const WhatsAppOffers: React.FC = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [now, setNow] = useState<number>(Date.now());
  const { language, isRtl } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live countdown timer ticker: only active when unexpired timed offers exist
  useEffect(() => {
    const hasActiveTimedOffers = offers.some(offer => {
      const remaining = getRemainingTime(offer, Date.now());
      return remaining !== null && !remaining.expired;
    });

    if (!hasActiveTimedOffers) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [offers]);

  useEffect(() => {
    const fetchOffers = async () => {
      const cached = cacheService.get<any[]>("whatsapp_offers");
      if (cached) {
        setOffers(cached);
        return;
      }
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const approvedOffers = docs.filter((d: any) => d.status === 'approved');
        setOffers(approvedOffers);
        cacheService.set("whatsapp_offers", approvedOffers, 1000 * 60 * 30);
      } catch (error) {
        console.error("Error fetching offers:", error);
      }
    };
    fetchOffers();
  }, []);

  // Guarantee carousel initial scroll position aligns properly in RTL/LTR
  useEffect(() => {
    if (scrollRef.current && offers.length > 0) {
      if (isRtl) {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      } else {
        scrollRef.current.scrollLeft = 0;
      }
    }
  }, [offers, isRtl]);

  useEffect(() => {
    if (selectedOffer) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedOffer]);

  const handleScroll = (direction: 'prev' | 'next') => {
    if (!scrollRef.current) return;
    const scrollContainer = scrollRef.current;
    const scrollAmount = 210;
    const sign = direction === 'next' ? 1 : -1;
    const moveX = isRtl ? -sign * scrollAmount : sign * scrollAmount;
    scrollContainer.scrollBy({ left: moveX, behavior: 'smooth' });
  };

  if (offers.length === 0) return null;

  return (
    <div className="mt-1 sm:mt-2 mb-2 sm:mb-3 w-full relative text-right" dir={isRtl ? "rtl" : "ltr"}>

      {/* Compact Header with Slide Controls */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-2 px-3.5 sm:px-6">
        <div className={cn("flex flex-col gap-0.5", isRtl ? "text-right" : "text-left")}>
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
            <Flame className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.8} />
            <span>{language === 'ar' ? 'عروض حصرية' : 'Offres exclusives'}</span>
          </div>
          <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
            {language === 'ar' ? 'العروض الحصرية' : 'Offres Exclusives'}
          </h2>
        </div>

        {/* Carousel Arrow Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll('prev')}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border border-white/10 bg-[#0E1626] flex items-center justify-center text-slate-300 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-400 transition-all active:scale-95 cursor-pointer shadow-sm shrink-0"
            title={language === 'ar' ? 'السابق' : 'Précédent'}
            aria-label={language === 'ar' ? 'السابق' : 'Précédent'}
          >
            {isRtl ? <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
          <button
            type="button"
            onClick={() => handleScroll('next')}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border border-white/10 bg-[#0E1626] flex items-center justify-center text-slate-300 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-400 transition-all active:scale-95 cursor-pointer shadow-sm shrink-0"
            title={language === 'ar' ? 'التالي' : 'Suivant'}
            aria-label={language === 'ar' ? 'التالي' : 'Suivant'}
          >
            {isRtl ? <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Cards Container - Edge-to-edge scroll track with inline padding */}
      <div className="relative w-full max-w-7xl mx-auto overflow-visible">
        <div 
          ref={scrollRef}
          dir={isRtl ? "rtl" : "ltr"}
          className="flex gap-2.5 xs:gap-3 overflow-x-auto overflow-y-hidden py-1 px-3.5 sm:px-6 scrollbar-none snap-x snap-mandatory scroll-smooth overscroll-x-contain [-webkit-overflow-scrolling:touch]"
          style={{ 
            scrollbarWidth: 'none', 
            WebkitOverflowScrolling: 'touch',
            scrollPaddingInlineStart: '14px',
          }}
        >
          {offers.map((offer) => {
            const timeInfo = getRemainingTime(offer, now);

            return (
              <div
                key={offer.id}
                onClick={() => setSelectedOffer(offer)}
                className="flex-shrink-0 w-[190px] xs:w-[210px] sm:w-[225px] snap-start border border-white/10 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 relative bg-[#0E1626] group active:scale-[0.98]"
              >
                {/* Special offer badge (Top-Left) */}
                <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-md text-[9px] font-extrabold backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>{language === 'ar' ? 'خاص' : 'Spécial'}</span>
                </div>

                {/* Subtle Countdown Timer Badge (Top-Right) - Only if valid unexpired expiry exists */}
                {timeInfo && !timeInfo.expired && (
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-slate-950/85 border border-amber-500/35 text-amber-300 rounded-md text-[9px] font-mono font-bold backdrop-blur-md shadow-sm">
                    <Clock className="w-2.5 h-2.5 text-amber-400 animate-pulse shrink-0" />
                    <span className="tabular-nums dir-ltr">{timeInfo.formatted}</span>
                  </div>
                )}

                {/* Card Image Area - Compact 16:9 ratio */}
                <div className="w-full aspect-[16/9] relative bg-[#070B14] overflow-hidden shrink-0 border-b border-white/5">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E1626] via-transparent to-transparent z-10 pointer-events-none" />
                  {offer.imageUrl ? (
                    <img 
                      src={offer.imageUrl} 
                      alt={offer.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#070B14]">
                      <MessageCircle className="w-6 h-6 text-emerald-500/30" strokeWidth={1.6} />
                    </div>
                  )}
                </div>

                {/* Compact Text content area */}
                <div className={cn("p-2 sm:p-2.5 flex flex-col justify-between min-h-[58px]", isRtl ? "text-right" : "text-left")}>
                  <div>
                    <h3 className="text-[11px] sm:text-xs font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1 mb-0.5">
                      {offer.title}
                    </h3>
                    {offer.description && (
                      <p className="text-[10px] text-slate-400 font-normal leading-tight line-clamp-1 mb-1">
                        {offer.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Clean inline CTA with timer footnote */}
                  <div className="flex items-center justify-between gap-1 text-[10px] font-extrabold text-emerald-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <span>{language === 'ar' ? 'التفاصيل والطلب' : 'Voir l\'offre'}</span>
                      <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" strokeWidth={1.8} />
                    </span>
                    {timeInfo && !timeInfo.expired && (
                      <span className="text-[9px] font-mono text-slate-400 font-normal">
                        ⏳ {timeInfo.hours}{language === 'ar' ? 'س' : 'h'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal Popup */}
      {createPortal(
        <AnimatePresence>
          {selectedOffer && (() => {
            const timeInfo = getRemainingTime(selectedOffer, now);
            return (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[99999] overflow-y-auto p-4 flex flex-col items-center justify-center min-h-full">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 15 }}
                  className="rounded-2xl border border-white/10 max-w-md w-full overflow-hidden relative shadow-2xl bg-[#0E1626] my-auto shrink-0"
                >
                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedOffer(null)}
                    className="absolute top-3.5 right-3.5 w-8 h-8 bg-[#070B14]/80 border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-400 z-30 transition-all active:scale-95 cursor-pointer shadow-md"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                  
                  {/* Large Image inside Modal */}
                  {selectedOffer.imageUrl && (
                    <div className="w-full h-52 sm:h-60 relative bg-[#070B14] border-b border-white/10">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0E1626] via-transparent to-transparent z-10 pointer-events-none" />
                      <img 
                        src={selectedOffer.imageUrl} 
                        alt={selectedOffer.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-md text-[10px] font-bold backdrop-blur-md">
                        <Flame className="w-3 h-3 text-amber-400" strokeWidth={1.6} />
                        <span>{language === 'ar' ? 'عرض حصري نشط' : 'Offre exclusive'}</span>
                      </div>
                    </div>
                  )}

                  {/* Details and CTA area */}
                  <div className="p-5 sm:p-6 text-center">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-tight">
                      {selectedOffer.title}
                    </h3>
                    
                    {/* Countdown Timer Banner inside Modal */}
                    {timeInfo && !timeInfo.expired && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300 text-xs font-mono font-bold mb-4 shadow-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>{language === 'ar' ? 'ينتهي العرض خلال:' : 'Expire dans :'}</span>
                        <span className="tabular-nums font-black text-amber-200 dir-ltr">{timeInfo.formatted}</span>
                      </div>
                    )}

                    <p className="text-xs text-slate-300 mb-6 leading-relaxed max-h-36 overflow-y-auto px-1 font-normal">
                      {selectedOffer.description}
                    </p>

                    {/* Direct WhatsApp Action Button */}
                    <a
                      href={`https://wa.me/222${OFFICIAL_PHONE}?text=${encodeURIComponent(`السلام عليكم، أريد الاستفسار عن العرض الحصري: ${selectedOffer.title}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs transition-all active:scale-[0.98] shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-slate-950 text-slate-950" strokeWidth={1.6} />
                      <span>{language === 'ar' ? 'تواصل معنا واطلب العرض عبر واتساب' : 'Profiter de l\'offre sur WhatsApp'}</span>
                    </a>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default WhatsAppOffers;

