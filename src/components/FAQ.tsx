import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { HelpCircle, ChevronDown } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const faqsAr: FAQItem[] = [
  {
    q: "كيف أطلب شحن لعبة أو خدمة رقمية؟",
    a: "اختر الخدمة المطلوبة من الصفحة الرئيسية أو قائمة الخدمات، حدد الباقة أو القيمة المطلوبة، أدخل معرف اللاعب (ID) أو البيانات المطلوبة للخدمة، ثم تابع خطوات الدفع وتأكيد الطلب.",
  },
  {
    q: "كيف أدفع وأرفع إيصال التحويل؟",
    a: "يظهر لك في صفحة الطلب رقم الحساب المعتمد لوسيلة الدفع المختارة (مثل بنكيلي أو سداد). قم بتحويل المبلغ المحدد عبر تطبيقك البنكي، ثم أدخل رقم هاتفك المُرسِل وأرفق لقطة شاشة لإشعار التحويل (الإيصال) لإتمام الإرسال.",
  },
  {
    q: "كيف أتابع حالة طلبي؟",
    a: "بعد إرسال الطلب، يمكنك متابعة حالته مباشرة من صفحة 'طلباتي' في حال كنت مسجلاً للدخول، أو عبر رمز ورابط تتبع الطلب المخصص لطلبات الزوار لمعرفة مراحل المعالجة حتى الاكتمال.",
  },
  {
    q: "هل أحتاج إلى إنشاء حساب؟",
    a: "يمكنك إنشاء طلب ومتابعته برمز التتبع المخصص، كما يتيح لك تسجيل الحساب حفظ سجل طلباتك السابقة ومراجعتها في أي وقت بسهولة وأمان.",
  },
];

const faqsFr: FAQItem[] = [
  {
    q: "Comment commander une recharge ou un service ?",
    a: "Sélectionnez le service souhaité depuis l'accueil, choisissez votre forfait, renseignez votre identifiant joueur (Player ID) ou vos coordonnées, puis suivez les étapes de paiement.",
  },
  {
    q: "Comment payer et envoyer le reçu de transfert ?",
    a: "Le numéro officiel de virement s'affiche selon le moyen choisi (Bankily, Sedad). Transférez le montant exact depuis votre application bancaire, saisissez votre numéro d'expéditeur et joignez la capture du reçu.",
  },
  {
    q: "Comment suivre l'état de ma commande ?",
    a: "Dès l'envoi de la commande, vous pouvez suivre son statut en temps réel via la rubrique 'Mes commandes' (utilisateurs connectés) ou grâce au lien de suivi dédié (commandes invités).",
  },
  {
    q: "Dois-je obligatoirement créer un compte ?",
    a: "Vous pouvez commander et suivre votre recharge via votre lien de suivi. Créer un compte vous permet de conserver l'historique complet de toutes vos commandes passées.",
  },
];

export default function FAQ() {
  const { language } = useLanguage();
  const faqs = language === 'ar' ? faqsAr : faqsFr;
  // All answers collapsed initially to shorten the homepage
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(prev => (prev === index ? null : index));
  };

  return (
    <section 
      id="faq"
      className="max-w-4xl mx-auto px-4 py-8 sm:py-10 content-visibility-auto" 
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="rounded-2xl border border-[#243247] bg-[#0B1120] p-5 sm:p-7 relative overflow-hidden shadow-lg space-y-4">
        
        {/* Section Badge & Title */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.6} />
            <span>{language === 'ar' ? "الأسئلة الشائعة" : "F.A.Q"}</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
            {language === 'ar' ? 'الأسئلة الأكثر تكراراً' : 'Questions Fréquentes'}
          </h2>
        </div>

        {/* FAQ Accordion Items */}
        <div className="space-y-2">
          {faqs.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen 
                    ? 'border-emerald-500/40 bg-[#121D31] shadow-md shadow-emerald-950/20' 
                    : 'border-white/5 bg-[#070B14] hover:border-white/15'
                }`}
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full text-right flex items-center justify-between p-3.5 sm:p-4 gap-3 cursor-pointer select-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-xs sm:text-sm font-bold transition-colors ${
                      isOpen ? 'text-emerald-400' : 'text-slate-200'
                    }`}>
                      {item.q}
                    </span>
                  </div>
                  <div className={`p-1 rounded-md transition-all duration-200 shrink-0 ${
                    isOpen ? 'bg-emerald-500/20 text-emerald-400 rotate-180' : 'bg-white/5 text-slate-400'
                  }`}>
                    <ChevronDown className="w-4 h-4" strokeWidth={1.6} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-3.5 pt-0 text-xs text-slate-300 leading-relaxed border-t border-white/5 mt-1 pt-2.5">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
