import React from 'react';
import { MessageCircle, Send, ArrowRight, ArrowLeft, ShieldCheck, Zap, HelpCircle, CheckCircle2, Clock, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useLanguage } from '../contexts/LanguageContext';
import { OFFICIAL_PHONE } from '../constants';
import { haptic } from '../lib/utils';

export default function Contact() {
  const { language, isRtl } = useLanguage();
  const isAr = language === 'ar';
  const whatsappNumber = `222${OFFICIAL_PHONE}`;

  const openWhatsApp = (customMessage?: string) => {
    haptic.medium();
    const defaultMsg = isAr
      ? "السلام عليكم، لدي استفسار بخصوص خدمات وشحن موري توب MauriTop."
      : "Bonjour, j'ai une question concernant les services de recharge MauriTop.";
    const msg = customMessage || defaultMsg;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const quickInquiries = [
    {
      id: "order_inquiry",
      icon: Zap,
      titleAr: "استفسار عن حالة طلب أو شحن",
      titleFr: "Suivi de commande ou recharge",
      descAr: "متابعة فورية لحالة شحنك أو إرسال إشعار التحويل",
      descFr: "Suivez l'état de votre recharge instantanément",
      message: isAr
        ? "السلام عليكم، أود الاستفسار عن حالة طلبي في موري توب."
        : "Bonjour, je souhaite suivre l'état de ma commande sur MauriTop."
    },
    {
      id: "payment_support",
      icon: CheckCircle2,
      titleAr: "المساعدة في الدفع والتحويل",
      titleFr: "Assistance paiement (Bankily, Sadad)",
      descAr: "استفسار عن التحويل عبر بنكيلي، سداد، أو غزة باي",
      descFr: "Aide pour le virement bancaire ou wallet",
      message: isAr
        ? "السلام عليكم، أحتاج مساعدة بخصوص إتمام عملية الدفع عبر بنكيلي / سداد / غزة باي."
        : "Bonjour, j'ai besoin d'aide pour finaliser mon paiement."
    },
    {
      id: "custom_service",
      icon: HelpCircle,
      titleAr: "طلب خدمة أو بطاقة غير متوفرة",
      titleFr: "Demande de service personnalisé",
      descAr: "شحن ألعاب أو اشتراكات مخصصة بالطلب السريع",
      descFr: "Recharge de jeux ou abonnements sur mesure",
      message: isAr
        ? "السلام عليكم، أبحث عن خدمة أو لعبة غير متوفرة بالمتجر وأريد توفيرها."
        : "Bonjour, je cherche un jeu ou service non disponible sur la boutique."
    },
    {
      id: "general_support",
      icon: ShieldCheck,
      titleAr: "الدعم الفني والشكاوى",
      titleFr: "Support technique & Assistance",
      descAr: "حل أي مشكلة تقنية أو تقديم استفسار عام للإدارة",
      descFr: "Résolution de problèmes techniques et assistance générale",
      message: isAr
        ? "السلام عليكم، لدي استفسار أو مشكلة تقنية وأحتاج المساعدة من الدعم الفني."
        : "Bonjour, j'ai besoin d'une assistance technique."
    }
  ];

  return (
    <div className="min-h-screen bg-[#070B14] py-6 sm:py-8 px-4 sm:px-6 text-white pb-28 md:pb-12" dir={isRtl ? "rtl" : "ltr"}>
      <SEO 
        title={isRtl ? "تواصل معنا - الدعم الفني لموري توب" : "Contactez-nous - Support MauriTop"} 
        description={isRtl ? "تواصل مباشرة مع فريق دعم موري توب عبر واتساب للإجابة على استفسارات الشحن والدفع في موريتانيا." : "Contactez le support MauriTop via WhatsApp pour toute question sur vos recharges et paiements en Mauritanie."}
        keywords="تواصل معنا موري توب, دعم واتساب موريتانيا, خدمة عملاء موري توب, MauriTop contact, MauriPay, شحن ألعاب موريتانيا"
      />

      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Top Header */}
        <div className="text-center space-y-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold text-xs">
            <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
            <span>{isAr ? 'قناة التواصل والدعم الرسمي المعتمدة' : 'Canal Officiel de Support'}</span>
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isAr ? 'تواصل مع خدمة عملاء MAURITOP' : 'Contactez le Support MauriTop'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 font-normal max-w-lg mx-auto leading-relaxed">
            {isAr 
              ? 'فريق الدعم الفني الموريتاني متواجد لخدمتكم والإجابة على كافة استفساراتكم وتنفيذ طلباتكم فوراً عبر واتساب المعتمد.' 
              : 'Notre équipe est à votre disposition 24h/24 et 7j/7 pour répondre à toutes vos questions via WhatsApp.'}
          </p>
        </div>

        {/* Primary Main WhatsApp Business Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-[#0B1120] p-5 sm:p-7 shadow-xl">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0 text-center sm:text-right">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-md">
                <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    {isAr ? 'حساب واتساب المعتمد والوحيد' : 'Numéro WhatsApp Officiel'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-mono text-center sm:text-right">
                  <bdi dir="ltr">+222 {OFFICIAL_PHONE}</bdi>
                </h2>
                <p className="text-xs text-slate-300 font-medium">
                  {isAr ? 'متاح على مدار الساعة للرد الفوري على عملائنا' : 'Disponible 24h/24 pour une réponse rapide'}
                </p>
              </div>
            </div>

            <button
              onClick={() => openWhatsApp()}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>{isAr ? 'محادثة مباشرة عبر واتساب' : 'Ouvrir WhatsApp Direct'}</span>
            </button>
          </div>

          {/* Official Verification Notice */}
          <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isAr
                ? `تنبيه أمني: الرقم الرسمي والوحيد لخدمة عملاء موري توب هو +222 ${OFFICIAL_PHONE}.`
                : `Sécurité : Le +222 ${OFFICIAL_PHONE} est le seul numéro officiel authorized de MauriTop.`}
            </span>
          </div>
        </div>

        {/* Quick Inquiry Options */}
        <div className="space-y-4">
          <div className="text-right">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'اختر نوع الاستفسار للمحادثة الفورية المباشرة:' : 'Choisissez le motif de votre contact :'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? 'اضغط على أي قسم لفتح محادثة واتساب مخصصة جاهزة للإرسال مباشرة' : 'Cliquez sur une catégorie pour démarrer la discussion'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {quickInquiries.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => openWhatsApp(item.message)}
                  className="group bg-[#0B1220] hover:bg-[#0F192C] p-4 sm:p-5 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition-all shadow-md flex items-start gap-3.5 cursor-pointer active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <IconComp className="w-5 h-5 stroke-[1.8]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {isAr ? item.titleAr : item.titleFr}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {isAr ? item.descAr : item.descFr}
                    </p>
                    <span className="text-[11px] text-emerald-400 font-bold inline-flex items-center gap-1 mt-2">
                      <span>{isAr ? 'تواصل الآن عبر واتساب' : 'Envoyer un message'}</span>
                      {isRtl ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back Link to Home */}
        <div className="pt-4 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0B1220] hover:bg-[#101A2D] border border-white/10 text-white rounded-xl font-bold text-xs transition-all shadow-xs"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" strokeWidth={1.8} /> : <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />}
            <span>{isAr ? 'العودة للصفحة الرئيسية والمشتريات' : 'Retour à l\'accueil'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
