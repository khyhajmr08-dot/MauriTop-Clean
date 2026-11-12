import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import SEO from "../components/SEO";
import { AlertCircle, Home, Search, Gamepad2, CreditCard, MessageCircle } from "lucide-react";

export default function NotFound() {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';

  return (
    <main 
      className="min-h-[70vh] flex items-center justify-center px-4 py-16 text-slate-100" 
      dir={isRtl ? "rtl" : "ltr"}
    >
      <SEO 
        title={isAr ? "404 - الصفحة غير موجودة | موري توب" : "404 - Page non trouvée | MauriTop"}
        description={isAr ? "عذراً، الصفحة التي تبحث عنها غير متوفرة في منصة موري توب. تفضل بزيارة الصفحة الرئيسية أو تصفح خدمات شحن الألعاب والبطاقات." : "Désolé, la page demandée n'existe pas. Revenez à l'accueil pour explorer nos services."}
        noindex={true}
      />
      
      <div className="max-w-xl w-full text-center space-y-8 glass-card p-8 sm:p-12 rounded-3xl border border-white/10 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black">
          <AlertCircle className="w-4 h-4" />
          <span>{isAr ? 'خطأ 404: الصفحة غير موجودة' : 'Erreur 404: Introuvable'}</span>
        </div>

        {/* Big 404 Display */}
        <div className="space-y-2">
          <h1 className="text-6xl sm:text-7xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
            404
          </h1>
          <p className="text-base sm:text-lg font-bold text-slate-200">
            {isAr ? 'عذراً، الرابط المطلوب غير موجود أو تم نقله' : 'La page demandée est introuvable ou a été déplacée.'}
          </p>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            {isAr 
              ? 'يمكنك العودة للصفحة الرئيسية واستكشاف كافة خدمات شحن الألعاب، بطاقات الهدايا والاشتراكات المتوفرة في موريتانيا.'
              : 'Retournez à la page d\'accueil pour découvrir tous nos services de recharge disponibles en Mauritanie.'}
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>{isAr ? 'الرئيسية' : 'Accueil'}</span>
          </Link>
          
          <Link 
            to="/#services" 
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs sm:text-sm transition-all"
          >
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'شحن الألعاب' : 'Jeux vidéo'}</span>
          </Link>
          
          <Link 
            to="/service-cards" 
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs sm:text-sm transition-all"
          >
            <CreditCard className="w-4 h-4 text-cyan-400" />
            <span>{isAr ? 'بطاقات الهدايا' : 'Cartes cadeaux'}</span>
          </Link>
        </div>

        {/* Direct WhatsApp help link */}
        <div className="pt-6 border-t border-white/5">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <span>{isAr ? 'هل تواجه مشكلة؟' : 'Besoin d\'aide ?'}</span>
            <a 
              href="https://wa.me/22227329380" 
              target="_blank" 
              rel="noreferrer" 
              className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{isAr ? 'تواصل مع الدعم الفني' : 'Contactez le support'}</span>
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
