import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Sparkles, Gamepad2, ShieldCheck, CreditCard } from 'lucide-react';

export default function MauriTopSEOContent() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <section 
      id="about-mauritop"
      className="max-w-4xl mx-auto px-4 py-8 sm:py-10 text-slate-300"
      dir={isAr ? 'rtl' : 'ltr'}
      aria-label={isAr ? "عن منصة موري توب" : "À propos de MauriTop"}
    >
      <div className="rounded-2xl border border-[#243247] bg-[#0B1120] p-5 sm:p-7 relative overflow-hidden shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-white">
            {isAr ? 'عن متجر موري توب (MAURITOP)' : 'À propos de MAURITOP'}
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
          {isAr ? (
            <>
              موري توب (MAURITOP) متجر رقمي في موريتانيا يتيح لك تصفح خدمات شحن الألعاب والاشتراكات والبطاقات الرقمية المتاحة بسهولة وأمان. اختر الخدمة المطلوبة والباقة المناسبة، وأدخل معرف اللاعب أو البيانات المطلوبة بدقة، ثم اتبع تعليمات التحويل البنكي المعتمدة في صفحة الطلب عبر تطبيقات الدفع المحلية مثل بنكيلي (Bankily) وسداد (Sadad). يمكنك متابعة حالة طلبك بعد إرساله، والتواصل مع فريق خدمة العملاء والدعم الفني عبر القنوات المتاحة داخل الموقع لضمان تجربة شراء سريعة وموثوقة بالأوقية الموريتانية (MRU).
            </>
          ) : (
            <>
              MAURITOP est une boutique digitale en Mauritanie dédiée à la recharge de jeux vidéo, abonnements et cartes cadeaux. Choisissez votre service et forfait, renseignez votre identifiant joueur (Player ID) ou vos coordonnées, puis effectuez le virement bancaire sécurisé via les moyens de paiement locaux (Bankily, Sedad). Suivez l'avancement de votre commande en direct et contactez notre support client pour une assistance rapide en Ouguiya (MRU).
            </>
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/5 text-xs text-slate-400">
          <div className="flex items-center gap-2 bg-[#070B14] p-2.5 rounded-xl border border-white/5">
            <Gamepad2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{isAr ? "شحن مباشر بمعرف اللاعب (ID)" : "Recharge directe par ID"}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#070B14] p-2.5 rounded-xl border border-white/5">
            <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{isAr ? "دفع بالعملة المحلية (MRU)" : "Paiement en Ouguiya (MRU)"}</span>
          </div>
          <div className="flex items-center gap-2 bg-[#070B14] p-2.5 rounded-xl border border-white/5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{isAr ? "تتبع مباشر لحالة الشحن" : "Suivi de commande en direct"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
