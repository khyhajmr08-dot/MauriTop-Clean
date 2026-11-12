import React from "react";
import { motion } from "motion/react";
import { 
  Zap, 
  ShieldCheck, 
  Receipt, 
  ArrowUpRight,
  Sparkles,
  Copy
} from "lucide-react";
import { cn } from "../lib/utils";

export interface InstructionCardProps {
  paymentMethod: "bankily" | "sadad" | string;
  amount: number | string;
  language?: "ar" | "fr" | "en";
  accountNumber?: string;
  accountHolder?: string;
  onCopySuccess?: () => void;
  className?: string;
  isAvailable?: boolean;
  unavailableReason?: string;
}

export const InstructionCard: React.FC<InstructionCardProps> = ({
  paymentMethod,
  amount,
  language = "ar",
  accountNumber = "32014902",
  accountHolder,
  onCopySuccess,
  className,
  isAvailable = true,
  unavailableReason,
}) => {
  const isArabic = language === "ar";

  // Dynamic branding per payment gateway
  const getTheme = () => {
    switch (paymentMethod) {
      case "bankily":
        return {
          label: isArabic ? "بنكيلي" : "Bankily",
          badge: isArabic ? "تحويل فوري" : "Instant",
          bgGradient: "from-[#041a13]/90 via-[#08291f]/80 to-[#03120d]/90",
          borderColor: "border-emerald-500/25",
          glowColor: "rgba(16, 185, 129, 0.12)",
          accentText: "text-emerald-400",
          stepBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          topBar: "from-transparent via-emerald-400/80 to-transparent",
          pills: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          abbr: "BPM"
        };
      case "sadad":
        return {
          label: isArabic ? "سداد" : "Sadad",
          badge: isArabic ? "دفع مباشر" : "Direct Pay",
          bgGradient: "from-[#051829]/90 via-[#092642]/80 to-[#03101c]/90",
          borderColor: "border-cyan-500/25",
          glowColor: "rgba(6, 182, 212, 0.12)",
          accentText: "text-cyan-400",
          stepBadge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
          topBar: "from-transparent via-cyan-400/80 to-transparent",
          pills: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          abbr: "BIM"
        };
      case "gaza":
      default:
        return {
          label: isArabic ? "غزة باي" : "GazaPay",
          badge: isArabic ? "حوالة آمنة" : "Secure",
          bgGradient: "from-[#1f070e]/90 via-[#2e0b17]/80 to-[#140308]/90",
          borderColor: "border-rose-500/25",
          glowColor: "rgba(244, 63, 94, 0.12)",
          accentText: "text-rose-400",
          stepBadge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
          topBar: "from-transparent via-rose-400/80 to-transparent",
          pills: "bg-rose-500/15 border-rose-500/30 text-rose-300",
          abbr: "GazaPay"
        };
    }
  };

  const theme = getTheme();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "relative w-full rounded-2xl border p-3.5 sm:p-4 backdrop-blur-xl shadow-lg transition-all duration-300 overflow-hidden space-y-3",
        theme.bgGradient,
        theme.borderColor,
        className
      )}
      style={{
        boxShadow: `0 12px 30px -10px ${theme.glowColor}, inset 0 1px 1px rgba(255, 255, 255, 0.08)`
      }}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Top Ambient Glow Line */}
      <div className={cn("absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r", theme.topBar)} />

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", theme.stepBadge)}>
            <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-1.5 leading-snug">
              <span>
                {isArabic 
                  ? `خطوات التحويل عبر ${theme.label}`
                  : `Instructions ${theme.label}`}
              </span>
              <Sparkles className={cn("w-3 h-3 shrink-0 hidden sm:inline-block", theme.accentText)} />
            </h4>
          </div>
        </div>

        <span className={cn(
          "text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 tracking-wide uppercase", 
          isAvailable ? theme.stepBadge : "bg-rose-500/20 text-rose-300 border-rose-500/40"
        )}>
          {isAvailable ? theme.badge : (unavailableReason || (isArabic ? "غير متوفر حالياً" : "Indisponible"))}
        </span>
      </div>

      {!isAvailable && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-bold text-center">
          ⚠️ {isArabic 
            ? `استقبال الشحن عبر تطبيق ${theme.label} متوقف مؤقتاً (${unavailableReason || 'صيانة'}). يرجى اختيار تطبيق بنكي آخر لإتمام طلبك.` 
            : `Le service ${theme.label} est temporairement suspendu (${unavailableReason || 'maintenance'}). Veuillez choisir un autre moyen de paiement.`}
        </div>
      )}

      {/* 3 Streamlined Compact Steps */}
      <div className={cn("space-y-2", !isAvailable && "opacity-50 pointer-events-none")}>
        
        {/* Step 1 */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className={cn("w-6 h-6 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 border", theme.stepBadge)}>
              1
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white leading-snug">
                {isArabic ? "نسخ رقم الحساب" : "Copier le numéro"}
              </p>
              <p className="text-[10px] text-text-secondary leading-normal mt-0.5">
                {isArabic 
                  ? <>استخدم زر <strong className="text-white">نسخ</strong> الموجود على البطاقة أعلاه ({accountNumber})</> 
                  : <>Utilisez le bouton copier sur la carte ci-dessus ({accountNumber})</>}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 border border-white/10 shrink-0 font-mono text-[11px] font-extrabold text-white">
            <Copy className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{accountNumber}</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className={cn("w-6 h-6 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 border", theme.stepBadge)}>
              2
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white leading-snug">
                {isArabic 
                  ? <>فتح تطبيق <strong className={theme.accentText}>{theme.label}</strong> والتحويل</> 
                  : <>Ouvrir <strong className={theme.accentText}>{theme.label}</strong> et transférer</>}
              </p>
              <p className="text-[10px] text-text-secondary leading-normal mt-0.5">
                {isArabic 
                  ? <>قم بتحويل المبلغ لحسابنا المعتمد <span className="text-white font-mono font-bold">({accountNumber})</span></> 
                  : <>Effectuez le virement vers notre compte ({accountNumber})</>}
              </p>
            </div>
          </div>

          <div className={cn("px-2 py-1 rounded-md border text-[11px] font-mono font-black shrink-0 flex items-center gap-1", theme.pills)}>
            <span>{amount}</span>
            <span className="text-[9px] text-white/80">MRU</span>
            <ArrowUpRight className="w-3 h-3 shrink-0" />
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className={cn("w-6 h-6 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 border", theme.stepBadge)}>
              3
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white leading-snug">
                {isArabic ? "تأكيد الطلب بالإيصال والهاتف" : "Confirmation avec le reçu"}
              </p>
              <p className="text-[10px] text-text-secondary leading-normal mt-0.5">
                {isArabic 
                  ? "أدخل رقم هاتفك المُرْسِل وأرفق الإيصال بالأسفل" 
                  : "Saisissez votre numéro et joignez le reçu"}
              </p>
            </div>
          </div>

          <div className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 shrink-0 flex items-center gap-1">
            <Receipt className="w-3 h-3 text-primary-main" />
            <span>{isArabic ? "تأكيد" : "Valider"}</span>
          </div>
        </div>

      </div>

      {/* Footer Security Badge */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-text-secondary">
        <span className="flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{isArabic ? "تحويل آمن ومباشر 100%" : "Paiement 100% sécurisé"}</span>
        </span>
        <span className="font-mono text-white/50 text-[9px] font-bold">
          {theme.abbr} • {accountNumber}
        </span>
      </div>
    </motion.div>
  );
};

export default InstructionCard;
