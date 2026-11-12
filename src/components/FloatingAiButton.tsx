import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';

export const FloatingAiButton: React.FC = () => {
  const location = useLocation();
  const { language, isRtl } = useLanguage();
  const isArabic = language === 'ar';

  // Do not show button on admin routes, checkout/order pages, legal pages, or when already on the AI Assistant page
  if (
    location.pathname.startsWith('/admin') || 
    location.pathname === '/assistant' || 
    location.pathname.startsWith('/services') ||
    location.pathname === '/order' ||
    location.pathname === '/orders' ||
    location.pathname === '/privacy' ||
    location.pathname === '/terms' ||
    location.search.includes('service=')
  ) {
    return null;
  }

  return (
    <Link
      to="/assistant"
      aria-label={isArabic ? "المساعد الذكي" : "Assistant IA"}
      title={isArabic ? "تحدث مع المساعد الذكي لموري توب" : "Discuter avec l'assistant IA"}
      className={cn(
        "fixed z-40 flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 bg-[#0B1120]/95 border border-[#10B981]/40 text-[#F8FAFC] rounded-full shadow-2xl hover:border-[#10B981] hover:bg-[#111B2E] transition-all duration-300 active:scale-90 cursor-pointer backdrop-blur-xl group",
        "bottom-32 left-4 md:bottom-8 md:left-8"
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Bot className="w-6 h-6 text-emerald-400" />
        </div>
        <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-pulse" />
        
        {/* Invisible tooltip for accessibility */}
        <span className="sr-only">
          {isArabic ? "المساعد الذكي" : "Assistant IA"}
        </span>
      </div>
    </Link>
  );
};

export default FloatingAiButton;
