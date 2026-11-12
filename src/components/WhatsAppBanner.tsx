import React from 'react';
import { MessageCircle, ArrowLeft, ArrowRight, Phone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORT_WHATSAPP_PHONE } from '../constants';
import { cn } from '../lib/utils';

export const WhatsAppBanner: React.FC = () => {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';

  const phoneFormatted = "+222 32014902";
  const rawPhone = `222${SUPPORT_WHATSAPP_PHONE || '32014902'}`;
  
  const defaultMsg = isAr
    ? "مرحباً، أحتاج إلى المساعدة بخصوص MAURITOP."
    : "Bonjour, j'ai besoin d'aide concernant MAURITOP.";

  const whatsappUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(defaultMsg)}`;

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-1 sm:pb-2 text-right" dir={isRtl ? "rtl" : "ltr"}>
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-500/25 bg-gradient-to-r from-[#0C1425] via-[#0E1A30] to-[#0A101F] p-3.5 sm:p-5 md:p-6 shadow-xl shadow-black/30 group">
        
        {/* Ambient Subtle Emerald Glow in Background */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 sm:gap-5">
          
          {/* Text & Icon Content Area */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* WhatsApp Icon Box */}
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform duration-300">
              <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
            </div>

            {/* Typography */}
            <div className={cn("flex-1 min-w-0", isRtl ? "text-right" : "text-left")}>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-snug">
                  {isAr ? 'تحتاج مساعدة في طلبك؟' : 'Besoin d\'aide pour votre commande ?'}
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 dir-ltr">
                  <Phone className="w-2.5 h-2.5" />
                  <span>{phoneFormatted}</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed line-clamp-2 sm:line-clamp-none">
                {isAr
                  ? 'تواصل معنا عبر واتساب لمتابعة طلباتك والاستفسار عن خدمات الشحن.'
                  : 'Contactez-nous sur WhatsApp pour suivre vos commandes et vous renseigner.'}
              </p>
            </div>
          </div>

          {/* Action Button CTA */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-400/50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer min-h-[44px]"
            aria-label={isAr ? 'تواصل عبر واتساب' : 'Contacter sur WhatsApp'}
          >
            <MessageCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-slate-950 stroke-none" />
            <span>{isAr ? 'تواصل عبر واتساب' : 'Contacter sur WhatsApp'}</span>
            {isRtl ? (
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            )}
          </a>

        </div>

      </div>
    </div>
  );
};

export default WhatsAppBanner;
