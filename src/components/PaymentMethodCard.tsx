import React from "react";
import { CheckCircle2, Copy, ShieldCheck, PhoneCall, Sparkles, AlertCircle } from "lucide-react";
import { cn, formatNumberSpacing } from "../lib/utils";

// Verified official bank and wallet logo assets
import bankilyLogoImg from "../assets/images/bankily_real_logo_1779370169060.png";
import sadadLogoImg from "../assets/images/sadad_real_logo_1779370189416.png";
import gazaLogoImg from "../assets/images/gaza_real_logo_1779370210822.png";

interface PaymentMethodCardProps {
  paymentMethod: "bankily" | "sadad" | "gaza" | string;
  amount: number | string;
  language: string;
  copied: boolean;
  onCopy: () => void;
  accountNumber?: string;
  accountHolder?: string;
  serviceTitle?: string;
  serviceImage?: string;
  serviceCategory?: string;
  isAvailable?: boolean;
  unavailableReason?: string;
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  amount,
  language,
  copied,
  onCopy,
  accountNumber,
  accountHolder,
  isAvailable = true,
  unavailableReason,
}) => {
  const isArabic = language === "ar";
  const isBankily = paymentMethod === "bankily";
  const isSadad = paymentMethod === "sadad";
  const isGaza = paymentMethod === "gaza";

  // Official branding
  let methodInfo = {
    name: isArabic ? "بنكيلي (Bankily)" : "Bankily",
    subName: isArabic ? "البنك الشعبي الموريتاني (BPM)" : "Banque Populaire de Mauritanie",
    logo: bankilyLogoImg,
    badge: isArabic ? "حساب معتمد" : "Compte Vérifié",
    defaultPhone: "32014902"
  };

  if (isSadad) {
    methodInfo = {
      name: isArabic ? "سداد (Sedad)" : "Sedad",
      subName: isArabic ? "بنك المعاملات الصحيحة (BIM)" : "Banque Islamique de Mauritanie",
      logo: sadadLogoImg,
      badge: isArabic ? "حساب معتمد" : "Compte Vérifié",
      defaultPhone: "27329380"
    };
  } else if (isGaza) {
    methodInfo = {
      name: isArabic ? "غزة باي (GazaPay)" : "GazaPay",
      subName: isArabic ? "محفظة غزة كاش للحلول المالية" : "Portefeuille GazaPay",
      logo: gazaLogoImg,
      badge: isArabic ? "محفظة معتمدة" : "Portefeuille Vérifié",
      defaultPhone: "27329380"
    };
  }

  // Exact raw number for clipboard copying (no visual spaces)
  const rawNum = (accountNumber || methodInfo.defaultPhone).trim().replace(/\s+/g, "");
  const formattedNumber = formatNumberSpacing(rawNum);

  const resolvedAccountHolder = (accountHolder || "").trim();
  const hasAccountHolder = resolvedAccountHolder.length > 0;

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="w-full rounded-2xl bg-[#0B1120] border border-[#243247] p-4 sm:p-5 shadow-xl space-y-4 select-none"
    >
      {/* A. Payment Provider Header - Centered Layout */}
      <div className="flex flex-col items-center text-center gap-2.5 pb-3 border-b border-[#1F2C40]">
        {/* Provider Logo Stage: 96-112px wide, 48-60px high with object-contain */}
        <div className={cn(
          "w-28 h-14 rounded-xl p-1.5 flex items-center justify-center shrink-0 shadow-sm transition-transform",
          isGaza 
            ? "bg-[#070B14] border border-[#243247]" 
            : "bg-white/95 border border-white/20"
        )}>
          <img
            src={methodInfo.logo}
            alt={methodInfo.name}
            className="w-full h-full object-contain object-center filter drop-shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Provider Title, Subtitle & Badges */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
              {methodInfo.name}
            </h4>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
              <ShieldCheck size={11} className="text-[#10B981]" />
              <span>{methodInfo.badge}</span>
            </span>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1",
              isAvailable 
                ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25" 
                : "bg-rose-500/10 text-rose-300 border border-rose-500/25"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", isAvailable ? "bg-[#10B981] animate-pulse" : "bg-rose-400")} />
              <span>{isAvailable ? (isArabic ? "استقبال فوري" : "En service") : (isArabic ? "صيانة مؤقتة" : "Maintenance")}</span>
            </span>
          </div>

          <p className="text-xs text-[#A8B3C5]">
            {hasAccountHolder
              ? (isArabic ? `اسم المستفيد: ${resolvedAccountHolder}` : `Bénéficiaire : ${resolvedAccountHolder}`)
              : methodInfo.subName}
          </p>
        </div>
      </div>

      {/* Unavailable Warning if disabled */}
      {!isAvailable && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 text-center">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>
            {unavailableReason ||
              (isArabic
                ? "طريقة التحويل هذه متوقفة مؤقتاً للصيانة، يرجى اختيار وسيلة دفع أخرى متاحة."
                : "Ce mode de paiement est temporairement indisponible.")}
          </span>
        </div>
      )}

      {/* B. Transfer Amount - Full-Width Highlighted Section */}
      <div className="w-full bg-[#0E1626] border border-[#10B981]/35 rounded-xl p-3.5 text-center space-y-0.5 shadow-sm">
        <span className="text-xs font-bold text-[#A8B3C5] block">
          {isArabic ? "المبلغ المطلوب للتحويل" : "Montant requis pour le virement"}
        </span>
        <div className="text-2xl sm:text-3xl font-black text-[#10B981] font-mono tracking-tight dir-ltr flex items-center justify-center gap-1.5">
          <span>{amount}</span>
          <span className="text-sm font-sans font-bold text-emerald-300">MRU</span>
        </div>
      </div>

      {/* C. Full-Width Account Details Panel */}
      <div className="w-full bg-[#070B14] border border-[#243247] rounded-xl p-4 flex flex-col items-center text-center space-y-2.5">
        <div className="flex items-center justify-center gap-1.5 text-[#A8B3C5] text-xs font-bold">
          <PhoneCall size={14} className="text-[#10B981] shrink-0" />
          <span>{isArabic ? "رقم حساب التحويل:" : "Numéro de compte pour le virement :"}</span>
        </div>
        
        <span 
          onClick={onCopy}
          title={isArabic ? "اضغط لنسخ الرقم" : "Cliquer pour copier"}
          className="text-2xl sm:text-3xl font-black text-white font-mono tracking-widest tabular-nums dir-ltr select-all cursor-pointer hover:text-[#10B981] transition-colors py-0.5"
        >
          {formattedNumber}
        </span>

        {/* D. Copy Button immediately below number */}
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            "w-full sm:w-auto min-w-[180px] px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 select-none",
            copied
              ? "bg-[#10B981] text-slate-950 shadow-md shadow-[#10B981]/30 font-bold"
              : "bg-[#10B981] hover:bg-emerald-400 text-slate-950 shadow-sm"
          )}
        >
          {copied ? (
            <>
              <CheckCircle2 size={16} className="text-slate-950 stroke-[2.5]" />
              <span>{isArabic ? "تم النسخ ✓" : "Copié ✓"}</span>
            </>
          ) : (
            <>
              <Copy size={16} className="text-slate-950" />
              <span>{isArabic ? "نسخ الرقم" : "Copier le numéro"}</span>
            </>
          )}
        </button>
      </div>

      {/* E. Transfer Instructions */}
      <div className="text-[11px] text-[#A8B3C5] flex items-center justify-center gap-1.5 text-center px-1">
        <Sparkles size={13} className="text-[#D6B35A] shrink-0" />
        <p className="leading-relaxed">
          {isArabic ? (
            <>حوّل المبلغ المطلوب (<strong className="text-[#10B981] font-mono">{amount} MRU</strong>) عبر تطبيق {methodInfo.name} إلى الرقم أعلاه، ثم أرفق إشعار التحويل ورقم المرسل بالأسفل.</>
          ) : (
            <>Transférez le montant exact (<strong className="text-[#10B981] font-mono">{amount} MRU</strong>) via votre application {methodInfo.name} vers ce numéro, puis joignez le reçu ci-dessous.</>
          )}
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodCard;
