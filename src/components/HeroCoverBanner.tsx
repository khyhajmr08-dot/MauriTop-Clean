import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { ShieldCheck, Zap, CreditCard, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import mauritopLogo from "../assets/images/mauritop_logo_premium_1786293887874.jpg";
import mauritopBanner from "../assets/images/mauritop_banner_premium_1786293905744.jpg";

export default function HeroCoverBanner() {
  const { language, isRtl } = useLanguage();

  const scrollToServices = () => {
    const el = document.getElementById("services-grid") || document.getElementById("service-search-input");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="w-full px-3 sm:px-6 pt-2 pb-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0E1626] shadow-xl group"
      >
        {/* Cover Background Image with Deep Navy Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={mauritopBanner}
            alt="MauriTop Cover Banner"
            className="w-full h-full object-cover object-center opacity-30 scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
          />
          {/* Refined dark gradient overlays for clarity */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E1626] via-[#0E1626]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E1626]/90 via-[#0E1626]/70 to-transparent" />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-10 md:p-12 flex flex-col items-center text-center">
          
          {/* Top Platform Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold tracking-normal mb-5 backdrop-blur-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.6} />
            <span>
              {language === 'ar'
                ? 'المنصة الأولى لشحن الألعاب والخدمات الرقمية في موريتانيا 🇲🇷'
                : 'Plateforme N°1 de Recharge Digitale en Mauritanie 🇲🇷'}
            </span>
          </div>

          {/* Logo & Brand Heading */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-white/20 bg-white p-1 shadow-lg shrink-0 group-hover:scale-105 transition-all duration-300">
              <img
                src={mauritopLogo}
                alt="MauriTop Logo"
                className="w-full h-full object-contain rounded-xl bg-white"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex flex-col text-center sm:text-right">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
                موري توب{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  MAURITOP
                </span>
              </h1>
              <p className="text-xs sm:text-sm font-bold text-emerald-400/90 tracking-wide uppercase mt-1">
                {language === 'ar' ? 'سريعة • آمنة • بالعملة الوطنية MRU' : 'RAPIDE • SÉCURISÉ • MRU'}
              </p>
            </div>
          </div>

          {/* Subtitle Description */}
          <p className="max-w-2xl text-xs sm:text-sm text-slate-300 font-medium leading-relaxed mb-6">
            {language === 'ar'
              ? 'اشحن جميع ألعابك وخدماتك الرقمية المفضلة بآمان وفورية عبر بنكيلي، سداد، وغزة باي.'
              : 'Rechargez vos jeux et services digitaux en toute sécurité via vos moyens de paiement locaux.'}
          </p>

          {/* Quick Feature Badges with Slim Lucide Icons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-6">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070B14]/80 border border-white/10 text-slate-200 text-xs font-semibold backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={1.6} />
              <span>{language === 'ar' ? 'شحن فوري مباشر' : 'Recharge Instantanée'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070B14]/80 border border-white/10 text-slate-200 text-xs font-semibold backdrop-blur-md">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.6} />
              <span>{language === 'ar' ? 'دفع بالعملة الوطنية MRU' : 'Paiement en MRU'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070B14]/80 border border-white/10 text-slate-200 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" strokeWidth={1.6} />
              <span>{language === 'ar' ? 'ضمان وأمان 100%' : 'Garantie 100%'}</span>
            </div>
          </div>

          {/* Call to Action Button */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={scrollToServices}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
            >
              <span>{language === 'ar' ? 'تصفح جميع الخدمات' : 'Voir nos services'}</span>
              {isRtl ? <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} /> : <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
