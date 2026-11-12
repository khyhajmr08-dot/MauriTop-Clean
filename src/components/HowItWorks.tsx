import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { MousePointerClick, FileText, Send, CheckCircle2 } from "lucide-react";

const stepsAr = [
  { 
    icon: MousePointerClick,
    title: "اختر الخدمة", 
    desc: "حدد اللعبة أو البطاقة الرقمية أو الاشتراك الذي ترغب في شحنه." 
  },
  { 
    icon: FileText,
    title: "أدخل البيانات", 
    desc: "اكتب رقم معرف الحساب (ID) والمبلغ أو الباقة المطلوبة بدقة." 
  },
  { 
    icon: Send,
    title: "أرسل الطلب", 
    desc: "تأكيد فوري وإرسال الطلب عبر واتساب لإتمام الشحن بثوانٍ معدودة." 
  },
];

const stepsFr = [
  { 
    icon: MousePointerClick,
    title: "Choisissez le service", 
    desc: "Sélectionnez le jeu ou service à recharger." 
  },
  { 
    icon: FileText,
    title: "Saisissez les informations", 
    desc: "Entrez l'ID du joueur ou le compte et le montant." 
  },
  { 
    icon: Send,
    title: "Envoyez la demande", 
    desc: "Confirmation instantanée et envoi via WhatsApp." 
  },
];

export default function HowItWorks() {
  const { language, isRtl } = useLanguage();
  const steps = language === 'ar' ? stepsAr : stepsFr;

  return (
    <section className="mt-8 max-w-5xl mx-auto px-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`rounded-2xl border border-white/10 bg-[#0E1626] p-6 sm:p-8 ${isRtl ? 'text-right' : 'text-left'} shadow-md`}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.6} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {language === 'ar' ? 'كيف يعمل موري توب' : 'Comment ça marche'}
            </h2>
            <p className="text-xs text-slate-400 font-normal">
              {language === 'ar' ? 'ثلاث خطوات بسيطة للحصول على شحنك الفوري' : 'Trois étapes simples pour recharger'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={index} 
                className="rounded-xl border border-white/5 bg-[#070B14] p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Icon className="w-4 h-4" strokeWidth={1.6} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                      {language === 'ar' ? `الخطوة 0${index + 1}` : `Étape 0${index + 1}`}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
