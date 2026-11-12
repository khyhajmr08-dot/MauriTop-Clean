import React, { useState } from "react";
import { motion } from "motion/react";
import { MessageCircle, Sparkles } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { cn } from "../lib/utils";

export interface WhatsAppCardProps {
  id: string;
  title: string;
  price?: number | string;
  description?: string;
  imageUrl?: string;
  badge?: string;
  imageFit?: 'contain' | 'cover';
  imagePadding?: number;
  onAction?: (e: React.MouseEvent) => void;
  onClick?: () => void;
}

export const WhatsAppCard: React.FC<WhatsAppCardProps> = ({
  id,
  title,
  price,
  description,
  imageUrl,
  badge,
  imageFit = "cover",
  imagePadding = 0,
  onAction,
  onClick
}) => {
  const { language, isRtl } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Parse price display
  const priceVal = typeof price === 'number' ? price : parseFloat(price || "0");
  const hasPrice = !isNaN(priceVal) && priceVal > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ 
        y: -6, 
        borderColor: "rgba(16, 185, 129, 0.3)",
        boxShadow: "0 20px 25px -5px rgba(16, 185, 129, 0.08), 0 10px 10px -5px rgba(16, 185, 129, 0.04)"
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-[2.5rem] border border-border-light bg-card-bg transition-all duration-300 flex flex-col justify-between active:scale-95 cursor-pointer shadow-lg"
      )}
    >
      {/* Dynamic Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Card Image Area with Custom Glow - Exact match to ServiceGrid aspect */}
      <div className="w-full aspect-video relative bg-main-bg overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-t from-card-bg via-transparent to-transparent z-10 pointer-events-none" />
        
        {/* Screenshot-style Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 sm:w-24 h-5 sm:h-6 bg-main-bg rounded-b-2xl z-20 border-x border-b border-border-light flex items-center justify-center">
          {/* Pulsing Green status dot to show WhatsApp service is active/live */}
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        </div>

        {/* Shimmer skeleton background while loading */}
        {imageUrl && !imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-[length:200%_100%] animate-shimmer z-0" style={{ backgroundImage: 'linear-gradient(90deg, #0d1527 25%, #16223f 50%, #0d1527 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear' }} />
        )}

        {imageUrl ? (
          imageFit === 'contain' ? (
            <>
              <div className="absolute inset-0 w-full h-full bg-main-bg pointer-events-none" />
              <img
                src={imageUrl}
                alt={title}
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                className="absolute inset-x-0 inset-y-0 m-auto w-full h-full object-contain z-10 transition-transform duration-[1000ms] group-hover:scale-105"
                style={{ 
                  padding: imagePadding ? `${imagePadding}px` : '10px'
                }}
              />
            </>
          ) : (
            <img
              src={imageUrl}
              alt={title}
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1000ms] group-hover:scale-110"
              style={{ 
                padding: imagePadding ? `${imagePadding}px` : '0px'
              }}
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <MessageCircle className="w-10 h-10 text-emerald-500/20" />
          </div>
        )}

        {/* Custom badge tag in top right */}
        {badge && (
          <div className="absolute top-3 right-3 z-30">
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider backdrop-blur-sm shadow-md">
              {badge}
            </span>
          </div>
        )}
      </div>

      {/* Reusable Bottom Title Panel - Bold Dark Block, matching ServiceGrid min-h exactly */}
      <div 
        className="py-4 px-3 text-center flex flex-col justify-center items-center bg-card-bg relative z-20 min-h-[88px] sm:min-h-[100px] mt-auto border-t border-border-light/20"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center gap-1 text-[8px] sm:text-[9px] uppercase font-black text-emerald-400 tracking-widest mb-1.5">
          <Sparkles className="w-3 h-3 animate-pulse text-emerald-400" />
          <span>{language === "ar" ? "شحن فوري ⚡" : "Livraison Instantanée"}</span>
        </div>

        <h3 className="text-xs sm:text-sm font-black text-text-primary group-hover:text-emerald-400 transition-colors line-clamp-1 uppercase tracking-wider mb-1.5 px-1">
          {title}
        </h3>

        <div className="w-full flex items-center justify-between gap-2 mt-auto pt-1 border-t border-border-light/10">
          <div className="flex flex-col items-start">
            {hasPrice ? (
              <span className="text-xs sm:text-sm font-black text-emerald-400 italic flex items-baseline gap-1 leading-none">
                {price}
                <span className="text-[8px] font-bold not-italic text-text-secondary">MRU</span>
              </span>
            ) : (
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tight leading-none">
                {language === "ar" ? "استفسار" : "Négocier"}
              </span>
            )}
          </div>
          
          <button
            onClick={(e) => {
              if (onAction) {
                onAction(e);
              }
            }}
            className="h-7 sm:h-8 px-2.5 sm:px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[9px] sm:text-[10px] font-black transition-all duration-300 flex items-center justify-center gap-1 sm:gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer leading-none"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current shrink-0 text-slate-950 animate-bounce duration-2000" />
            <span>{language === "ar" ? "طلب" : "Commander"}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
