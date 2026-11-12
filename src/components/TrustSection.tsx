import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { Gamepad2, Tv, ShieldCheck, Zap, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";

function StatBox({ label, value }: { label: string; value: string; index?: number }) {
  return (
    <div 
      className="bg-[#0E1626] p-4 sm:p-5 rounded-2xl border border-white/10 transition-all hover:border-emerald-500/30 flex flex-col justify-center text-center group"
    >
      <div className="text-xs text-slate-400 font-medium">{label}</div>
      <div className="text-sm sm:text-base font-bold mt-1 text-white group-hover:text-emerald-400 transition-colors">
        {value}
      </div>
    </div>
  );
}

export default function TrustSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <section 
      id="about-mouritop"
      className="mt-12 max-w-5xl mx-auto px-4 pb-16 content-visibility-auto" 
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Explanation Banner & Feature Grid */}
      <div className="rounded-2xl border border-white/10 bg-[#0E1626] p-5 sm:p-8 relative overflow-hidden shadow-xl mb-5">
        
        {/* Header Badge & Title */}
        <div className="text-center max-w-2xl mx-auto mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.6} />
            <span>{isAr ? "عن منصة موري توب" : "À propos de MauriTop"}</span>
          </div>

          <h2 className="text-lg sm:text-2xl font-bold text-white leading-snug tracking-tight">
            {isAr 
              ? "المنصة الأولى للشحن الفوري والخدمات الرقمية في موريتانيا" 
              : "La Première Plateforme de Recharge & Services Numériques en Mauritanie"}
          </h2>
          
          <p className="text-slate-400 text-xs sm:text-sm mt-2.5 leading-relaxed font-medium">
            {isAr 
              ? "نقدم لك أسهل وأسرع تجربة لشحن ألعابك واشتراكاتك الرقمية باستخدام وسائل السداد المحلية المعتمدة وبأعلى معايير الأمان."
              : "La solution la plus rapide et sécurisée pour vos recharges de jeux et abonnements avec des moyens de paiement locaux."}
          </p>
        </div>

        {/* 4 Feature Cards */}
        <div className="grid sm:grid-cols-2 gap-3">
          
          {/* Card 1: Games */}
          <div className="bg-[#070B14]/70 border border-white/5 rounded-xl p-4 flex items-start gap-3 hover:border-emerald-500/30 transition-all duration-200">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
              <Gamepad2 className="w-5 h-5" strokeWidth={1.6} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">
                {isAr ? "شحن الألعاب المباشر" : "Recharge de Jeux Directe"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {isAr 
                  ? "شحن جواهر فري فاير (Free Fire) بالـ ID مباشرة، بالإضافة إلى شدات ببجي موبايل (PUBG Mobile) فورياً."
                  : "Recharge instantanée de diamants Free Fire par ID et UC PUBG Mobile aux meilleurs tarifs."}
              </p>
            </div>
          </div>

          {/* Card 2: Subscriptions */}
          <div className="bg-[#070B14]/70 border border-white/5 rounded-xl p-4 flex items-start gap-3 hover:border-emerald-500/30 transition-all duration-200">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
              <Tv className="w-5 h-5" strokeWidth={1.6} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">
                {isAr ? "الاشتراكات والبطاقات" : "Abonnements & Cartes"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {isAr 
                  ? "اشتراكات نتفليكس (Netflix) الموثوقة، وسناب شات بلس (Snapchat+)، وتفعيل حسابات ChatGPT Plus."
                  : "Abonnements certifiés Netflix, Snapchat+, activation de comptes ChatGPT Plus et cartes cadeaux."}
              </p>
            </div>
          </div>

          {/* Card 3: Payments */}
          <div className="bg-[#070B14]/70 border border-white/5 rounded-xl p-4 flex items-start gap-3 hover:border-emerald-500/30 transition-all duration-200">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
              <CreditCard className="w-5 h-5" strokeWidth={1.6} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">
                {isAr ? "وسائل سداد محليّة" : "Paiements Locaux"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {isAr 
                  ? "دعم كامل لجميع التطبيقات المصرفية المحلية مثل بنكيلي (Bankily)، وسداد (Sedad)، وغزة باي (Gaza Pay)."
                  : "Prise en charge intégrale des applications bancaires locales : Bankily, Sedad et transferts directs."}
              </p>
            </div>
          </div>

          {/* Card 4: Speed & Security */}
          <div className="bg-[#070B14]/70 border border-white/5 rounded-xl p-4 flex items-start gap-3 hover:border-emerald-500/30 transition-all duration-200">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
              <Zap className="w-5 h-5" strokeWidth={1.6} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">
                {isAr ? "تنفيذ سريع ودعم 24/7" : "Exécution Rapide & Support 24/7"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {isAr 
                  ? "معالجة ومتابعة فورية للطلبات مع فريق دعم فني متواجد لمساعدتك والإجابة على استفساراتك دائماً."
                  : "Traitement ultra-rapide avec suivi en direct et équipe de support disponible pour vous accompagner."}
              </p>
            </div>
          </div>

        </div>

        {/* Quick Highlights list */}
        <div className="mt-5 pt-4 border-t border-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 bg-[#070B14]/50 px-3 py-2 rounded-lg border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.6} />
              <span>{isAr ? "شحن جواهر فري فاير (Free Fire) بالـ ID مباشرة" : "Recharge diamants Free Fire par ID"}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#070B14]/50 px-3 py-2 rounded-lg border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.6} />
              <span>{isAr ? "شحن شدات ببجي موبايل (PUBG UC) الفوري" : "Recharge UC PUBG Mobile instantanée"}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#070B14]/50 px-3 py-2 rounded-lg border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.6} />
              <span>{isAr ? "اشتراكات نتفليكس وسناب شات بلس رسمية" : "Abonnements officiels Netflix & Snapchat+"}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#070B14]/50 px-3 py-2 rounded-lg border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.6} />
              <span>{isAr ? "تفعيل حسابات الذكاء الاصطناعي وبطاقات الهدايا" : "Comptes AI & cartes cadeaux"}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3 Metric Stats */}
      <div className="grid sm:grid-cols-3 gap-3">
        <StatBox 
          label={isAr ? "الثقة والأمان" : "Confiance & Sécurité"} 
          value={isAr ? "منصة موثوقة 100%" : "Plateforme 100% fiable"} 
        />
        <StatBox 
          label={isAr ? "سرعة التسليم" : "Rapidité"} 
          value={isAr ? "تنفيذ وتسليم فوري" : "Livraison instantanée"} 
        />
        <StatBox 
          label={isAr ? "الدعم الفني" : "Support technique"} 
          value={isAr ? "خدمة متواصلة 24/7" : "Support continu 24/7"} 
        />
      </div>
    </section>
  );
}
