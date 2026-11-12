import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X, ShieldCheck, Zap, Coins } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function PriceGuideSection() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, isRtl } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group relative flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0E1626] hover:bg-[#121D31] text-white border border-white/10 hover:border-emerald-500/40 text-xs font-bold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
        title={language === "ar" ? "دليل الأسعار والشفافية" : "Guide des prix"}
      >
        <div className="w-5 h-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.6} />
        </div>
        <span className="group-hover:text-emerald-300 transition-colors">
          {language === "ar" ? "دليل الأسعار" : "Guide des prix"}
        </span>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto p-4 flex items-center justify-center min-h-full bg-[#070B14]/80 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-[#0E1626] border border-white/10 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative overflow-hidden my-auto text-right"
            dir={isRtl ? "rtl" : "ltr"}
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <HelpCircle className="w-4 h-4" strokeWidth={1.6} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {language === "ar" ? "دليل الأسعار والتسعير" : "Guide de tarification"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal">
                    {language === "ar" ? "كيف نقوم باحتساب أسعار الخدمات والاشتراكات" : "Comment nos prix sont calculés"}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsOpen(false)} 
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/5"
              >
                <X className="w-4 h-4" strokeWidth={1.6} />
              </button>
            </div>

            {/* Content Cards */}
            <div className="space-y-2.5">
              <div className="bg-[#070B14] border border-white/5 p-3.5 rounded-xl flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Coins className="w-4 h-4" strokeWidth={1.6} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">
                    {language === "ar" ? "ربط بالأسعار العالمية" : "Tarifs officiels"}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    {language === "ar"
                      ? "تعتمد أسعارنا على القيمة الرسمية للخدمات والاشتراكات الرقمية عالمياً، محولة للأوقية الموريتانية (MRU)."
                      : "Nos prix sont basés sur les tarifs officiels convertis en MRU."}
                  </p>
                </div>
              </div>

              <div className="bg-[#070B14] border border-white/5 p-3.5 rounded-xl flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" strokeWidth={1.6} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">
                    {language === "ar" ? "شفافية وضمان 100%" : "Garantie 100%"}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    {language === "ar"
                      ? "جميع المبالغ الموضحة شاملة لكافة رسوم التحويل والمعالجة دون أي تكاليف خفية إضافية."
                      : "Tous les prix indiqués sont nets, sans frais cachés."}
                  </p>
                </div>
              </div>

              <div className="bg-[#070B14] border border-white/5 p-3.5 rounded-xl flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" strokeWidth={1.6} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white">
                    {language === "ar" ? "تنفيذ فوري وتلقائي" : "Exécution instantanée"}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    {language === "ar"
                      ? "يتم شحن الحسابات والاشتراكات فور تأكيد إشعار الدفع البنكي عبر المنظومة الآلية."
                      : "Recharge effectuée dès confirmation du paiement."}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Close */}
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                {language === "ar" ? "فهمت ذلك، إغلاق" : "Fermer"}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
