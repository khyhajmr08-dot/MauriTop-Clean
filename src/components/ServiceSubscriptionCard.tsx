import React from "react";
import { getFallbackServiceImage } from "../lib/serviceImages";
import { haptic } from "../lib/utils";
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Copy,
  CreditCard,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export type ServiceType = "netflix" | "pubg" | "freefire" | "apple" | "prime" | "other";
export type ServiceStatus = "active" | "expired" | "pending" | "paused";

export type SubscriptionService = {
  id: string;
  type: ServiceType;
  title: string;
  subtitle?: string;
  logo?: string;
  status?: ServiceStatus;
  pinCode?: string;
  amount?: string;
  currency?: string;
  paymentMethod?: string;
  transactionId?: string;
  activatedAt?: string;
  expiresAt?: string;
  note?: string;
  showCard?: boolean;
  showPin?: boolean;
  showDates?: boolean;
  showAmount?: boolean;
  showPayment?: boolean;
  showTransactionId?: boolean;
  showAction?: boolean;
  codeLabel?: string;
  imageFit?: 'cover' | 'contain';
  imagePadding?: number;
};

const metaMap: Record<ServiceType, { accent: string; chip: string }> = {
  netflix: {
    accent: "from-rose-500 to-fuchsia-500",
    chip: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  },
  pubg: {
    accent: "from-amber-500 to-orange-500",
    chip: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  freefire: {
    accent: "from-cyan-500 to-blue-500",
    chip: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  },
  apple: {
    accent: "from-slate-400 to-zinc-400",
    chip: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
  prime: {
    accent: "from-blue-500 to-indigo-500",
    chip: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  other: {
    accent: "from-indigo-500 to-purple-500",
    chip: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  },
};

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

function statusLabel(status?: ServiceStatus) {
  switch (status) {
    case "active":
      return "مفعّل";
    case "expired":
      return "منتهي";
    case "pending":
      return "قيد المراجعة";
    case "paused":
      return "موقوف";
    default:
      return "غير محدد";
  }
}

function statusIcon(status?: ServiceStatus) {
  switch (status) {
    case "active":
      return <BadgeCheck className="h-3.5 w-3.5" />;
    case "expired":
      return <Clock3 className="h-3.5 w-3.5" />;
    case "pending":
      return <ShieldCheck className="h-3.5 w-3.5" />;
    case "paused":
      return <Clock3 className="h-3.5 w-3.5" />;
    default:
      return <Sparkles className="h-3.5 w-3.5" />;
  }
}

export const ServiceSubscriptionCard: React.FC<{
  service: SubscriptionService;
  onCopyCode?: (code: string) => void;
  onAction?: (service: SubscriptionService) => void;
  footer?: React.ReactNode;
}> = ({
  service,
  onCopyCode,
  onAction,
  footer,
}) => {
  if (service.showCard === false) return null;

  const meta = metaMap[service.type] || metaMap.other;

  const lowercaseTitle = (service.title || "").toLowerCase();
  const lowercaseSubtitle = (service.subtitle || "").toLowerCase();
  const lowercaseId = (service.id || "").toLowerCase();
  
  const isDirectGame = 
    service.type === "pubg" || 
    service.type === "freefire" ||
    lowercaseTitle.includes("pubg") || 
    lowercaseTitle.includes("ببجي") || 
    lowercaseTitle.includes("ببج") || 
    lowercaseTitle.includes("free fire") || 
    lowercaseTitle.includes("فري فاير") || 
    lowercaseTitle.includes("جواهر") || 
    lowercaseTitle.includes("شدات") || 
    lowercaseTitle.includes("cod") || 
    lowercaseTitle.includes("ديوتي") || 
    lowercaseTitle.includes("legends") || 
    lowercaseTitle.includes("fifa") || 
    lowercaseTitle.includes("فيفا") ||
    lowercaseId.includes("pubg") ||
    lowercaseId.includes("freefire") ||
    lowercaseId.includes("cod") ||
    lowercaseId.includes("legends") ||
    lowercaseId.includes("fifa") ||
    lowercaseSubtitle.includes("لاعب") ||
    lowercaseSubtitle.includes("player");

  const shouldShowPin = service.showPin !== false && !isDirectGame;

  return (
    <div
      className="overflow-hidden rounded-3xl border border-border-light bg-card-bg shadow-lg hover:shadow-primary-main/10 hover:border-primary-main/30 transition-all flex flex-col relative group"
      id={`sub-card-${service.id}`}
    >
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 bg-gradient-to-br ${meta.accent}`} />
      
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Header Section */}
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div 
            className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl bg-main-bg border border-border-light shadow-inner flex items-center justify-center z-10 overflow-hidden p-0"
          >
            {service.logo ? (
                <img 
                   src={service.logo} 
                   alt={service.title} 
                   className="w-full h-full object-cover rounded-xl transition-all duration-300 group-hover:scale-105" 
                   referrerPolicy="no-referrer"
                   onError={(e) => {
                     const target = e.target as HTMLImageElement;
                     if (!target.dataset.failed) {
                       target.dataset.failed = 'true';
                       target.src = getFallbackServiceImage(service.title, service.id);
                     } else {
                       target.style.display = 'none';
                     }
                   }}
                />
            ) : (
              <CreditCard className="h-6 w-6 text-text-secondary" />
            )}
          </div>
          <div className="min-w-0 flex-1 z-10">
            <div className="flex justify-between items-center mb-0.5 gap-2">
               <h3 className="truncate text-xs sm:text-sm font-black text-text-primary leading-snug tracking-normal">
                 {service.title}
               </h3>
               <span className={`shrink-0 inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[8px] sm:text-[9px] font-black whitespace-nowrap leading-none ${meta.chip}`}>
                 {statusLabel(service.status)}
               </span>
            </div>
            {service.subtitle && (
              <p className="truncate text-[10px] sm:text-[11px] text-text-secondary font-bold leading-none">
                {service.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Pin Code Box (If applicable) */}
        {shouldShowPin && service.pinCode && (
          <div className="mb-3 sm:mb-4 rounded-xl border border-primary-main/20 bg-primary-main/5 p-2 sm:p-3 relative z-10 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary-main leading-none">
                <KeyRound className="h-3 w-3" /> 
                {service.codeLabel || "كود التفعيل"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2.5 bg-main-bg border border-border-light/50 px-2.5 py-1.5 sm:py-2 rounded-lg">
               <span className="text-xs sm:text-sm font-mono tracking-wider font-black text-text-primary truncate select-all">{service.pinCode}</span>
               <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyCode?.(service.pinCode || "");
                  }}
                  className="flex items-center justify-center rounded-md bg-card-bg hover:bg-border-light p-1.5 text-text-secondary hover:text-text-primary border border-border-light transition-colors shrink-0"
               >
                 <Copy className="h-3.5 w-3.5" />
               </button>
            </div>
          </div>
        )}

        {/* Info inline (Dates / Price) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-auto relative z-10">
          {service.showDates !== false && service.expiresAt && (
             <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-text-secondary bg-main-bg/50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-border-light/50">
               <Clock3 className="h-3 w-3 opacity-70" />
               ينتهي: <span className="text-text-primary whitespace-nowrap">{formatDate(service.expiresAt)}</span>
             </div>
          )}
          {service.showAmount !== false && service.amount && (
             <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black text-emerald-400 bg-emerald-500/5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border border-emerald-500/10">
               {service.amount} {service.currency || ""}
             </div>
          )}
        </div>
      </div>

      {/* Action / Footer */}
      {(footer || (service.showAction !== false && onAction)) && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 z-10">
          {footer ? footer : (
            service.showAction !== false && onAction && (
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  onAction?.(service);
                }}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-main-bg hover:bg-primary-main/10 border border-border-light hover:border-primary-main/20 py-2 sm:py-2.5 text-[11px] sm:text-xs font-black text-text-primary hover:text-primary-main transition-all shadow-sm"
              >
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                عرض التفاصيل
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};
