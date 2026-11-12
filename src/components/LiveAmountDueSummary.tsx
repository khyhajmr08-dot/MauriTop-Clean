import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles, CheckCircle2, AlertCircle, Tag, Layers, CreditCard } from 'lucide-react';
import { formatMRU, cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

export interface LiveAmountDueSummaryProps {
  /**
   * Service name in Arabic/French/English
   */
  serviceName: string;
  /**
   * Optional package label (e.g. "60 شدة" or "100+10 جوهرة")
   */
  packageLabel?: string;
  /**
   * Unit price or base price
   */
  unitPrice?: number;
  /**
   * Selected quantity (default 1)
   */
  quantity?: number;
  /**
   * Calculated subtotal in MRU
   */
  subtotal: number;
  /**
   * Applicable fee (0 if none)
   */
  fee?: number;
  /**
   * Applicable discount (0 if none)
   */
  discount?: number;
  /**
   * Final amount due in MRU (must equal subtotal + fee - discount)
   */
  amountDue: number;
  /**
   * Is this a quote-based service where pricing is negotiated?
   */
  isQuoteMode?: boolean;
  /**
   * Selected payment method label (e.g. "بنكيلي", "سداد", "غزة باي")
   */
  paymentMethodLabel?: string;
  /**
   * Any validation warning (e.g. below min amount or above max)
   */
  warningMessage?: string;
  /**
   * Optional custom CSS class
   */
  className?: string;
}

export const LiveAmountDueSummary: React.FC<LiveAmountDueSummaryProps> = ({
  serviceName,
  packageLabel,
  unitPrice,
  quantity = 1,
  subtotal,
  fee = 0,
  discount = 0,
  amountDue,
  isQuoteMode = false,
  paymentMethodLabel,
  warningMessage,
  className,
}) => {
  const { language, isRtl } = useLanguage();
  const isArabic = language === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={cn(
        "relative rounded-2xl bg-[#0B1120] border border-[#243247] p-4 sm:p-5 shadow-xl overflow-hidden select-none",
        "transition-all duration-200",
        className
      )}
    >
      {/* Top subtle emerald gradient wash */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#10B981] to-transparent opacity-80" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center border border-[#10B981]/30">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-200">
            {isArabic ? 'ملخص الحساب والتكلفة' : 'Récapitulatif financier'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{isArabic ? 'حساب فوري مباشر' : 'Calcul direct'}</span>
        </div>
      </div>

      {/* Breakdown Rows */}
      <div className="space-y-2 text-xs">
        {/* Service */}
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{isArabic ? 'الخدمة' : 'Service'}</span>
          </span>
          <span className="font-bold text-slate-100 truncate max-w-[200px] sm:max-w-xs text-left" dir="auto">
            {serviceName}
          </span>
        </div>

        {/* Package / Quantity */}
        {packageLabel && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{isArabic ? 'الباقة المحددة' : 'Forfait choisi'}</span>
            </span>
            <span className="font-semibold text-cyan-300 text-left" dir="auto">
              {packageLabel}
            </span>
          </div>
        )}

        {/* Quantity (if > 1) */}
        {quantity > 1 && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">{isArabic ? 'الكمية' : 'Quantité'}</span>
            <span className="font-bold font-mono text-slate-100">×{quantity}</span>
          </div>
        )}

        {/* Unit Price (if applicable and positive) */}
        {unitPrice !== undefined && unitPrice > 0 && quantity > 1 && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">{isArabic ? 'سعر الوحدة' : 'Prix unitaire'}</span>
            <span className="font-mono text-slate-200">{formatMRU(unitPrice)}</span>
          </div>
        )}

        {/* Subtotal */}
        {!isQuoteMode && (
          <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/[0.04]">
            <span className="text-slate-400">{isArabic ? 'المجموع الفرعي' : 'Sous-total'}</span>
            <span className="font-mono font-semibold text-slate-200">{formatMRU(subtotal)}</span>
          </div>
        )}

        {/* Fees (if any) */}
        {fee > 0 && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">{isArabic ? 'الرسوم' : 'Frais'}</span>
            <span className="font-mono text-slate-300">+{formatMRU(fee)}</span>
          </div>
        )}

        {/* Discount (if any) */}
        {discount > 0 && (
          <div className="flex items-center justify-between text-emerald-400 font-semibold">
            <span>{isArabic ? 'الخصم المطبق' : 'Remise'}</span>
            <span className="font-mono">-{formatMRU(discount)}</span>
          </div>
        )}

        {/* Payment Method */}
        {paymentMethodLabel && (
          <div className="flex items-center justify-between text-slate-300 pt-1">
            <span className="text-slate-400">{isArabic ? 'طريقة الدفع' : 'Mode de paiement'}</span>
            <span className="font-bold text-slate-200">{paymentMethodLabel}</span>
          </div>
        )}
      </div>

      {/* Warning if any */}
      <AnimatePresence>
        {warningMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{warningMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Major Highlight: المبلغ المستحق (Amount Due) */}
      <div className="mt-4 pt-3.5 border-t border-[#243247] flex items-center justify-between gap-3 bg-[#111B2E] -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
            {isArabic ? 'المبلغ المستحق' : 'Montant à payer'}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{isArabic ? 'شامل وبدون أي رسوم إضافية' : 'Total net sans frais cachés'}</span>
          </span>
        </div>

        <div className="text-right">
          {isQuoteMode ? (
            <span className="text-base sm:text-lg font-black text-amber-400">
              {isArabic ? 'طلب تسعير' : 'Sur devis'}
            </span>
          ) : (
            <motion.div
              key={amountDue}
              initial={{ scale: 0.94, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-baseline gap-1"
            >
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#10B981] tracking-tight">
                {amountDue > 0 ? amountDue.toLocaleString() : '0'}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-300">
                MRU
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAmountDueSummary;
