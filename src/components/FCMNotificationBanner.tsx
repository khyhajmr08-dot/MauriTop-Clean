import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, X, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

interface FCMNotificationBannerProps {
  isOpen: boolean;
  title: string;
  body: string;
  onClose: () => void;
  onClick: () => void;
}

export default function FCMNotificationBanner({
  isOpen,
  title,
  body,
  onClose,
  onClick
}: FCMNotificationBannerProps) {
  
  const notificationType = useMemo(() => {
    const text = (title + " " + body).toLowerCase();
    if (text.includes("نجاح") || text.includes("مكتمل") || text.includes("اكتمل") || text.includes("موافقة") || text.includes("success") || text.includes("complétée") || text.includes("approuvée")) {
      return "success";
    }
    if (text.includes("رفض") || text.includes("إلغاء") || text.includes("مرفوض") || text.includes("rejected") || text.includes("cancelled") || text.includes("annulée") || text.includes("refusée") || text.includes("خطأ") || text.includes("فشل")) {
      return "warning";
    }
    return "info";
  }, [title, body]);

  const IconComponent = notificationType === "success" ? CheckCircle2 : notificationType === "warning" ? AlertCircle : Bell;
  const iconColor = notificationType === "success" ? "text-emerald-400" : notificationType === "warning" ? "text-rose-400" : "text-emerald-400";
  const iconBg = notificationType === "success" ? "bg-emerald-500/10 border-emerald-500/20" : notificationType === "warning" ? "bg-rose-500/10 border-rose-500/20" : "bg-emerald-500/10 border-emerald-500/20";
  const borderColor = notificationType === "success" ? "border-emerald-500/30" : notificationType === "warning" ? "border-rose-500/30" : "border-white/10";
  
  // Synthesize notification chime
  useEffect(() => {
    if (isOpen) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const audioCtx = new AudioContextClass();
        const mainGain = audioCtx.createGain();
        mainGain.connect(audioCtx.destination);
        mainGain.gain.setValueAtTime(0.06, audioCtx.currentTime);

        const osc1 = audioCtx.createOscillator();
        const oscGain1 = audioCtx.createGain();
        osc1.connect(oscGain1);
        oscGain1.connect(mainGain);
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        oscGain1.gain.setValueAtTime(1, audioCtx.currentTime);
        
        const osc2 = audioCtx.createOscillator();
        const oscGain2 = audioCtx.createGain();
        osc2.connect(oscGain2);
        oscGain2.connect(mainGain);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.08);
        oscGain2.gain.setValueAtTime(0.7, audioCtx.currentTime + 0.08);

        osc1.start();
        osc2.start();

        mainGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.0);

        osc1.stop(audioCtx.currentTime + 1.1);
        osc2.stop(audioCtx.currentTime + 1.1);
      } catch (audioErr) {
        // audio fail silent
      }
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-[350px] z-[9999] cursor-pointer"
        >
          <div 
            onClick={onClick}
            className={`relative overflow-hidden rounded-2xl border bg-[#0E1626] backdrop-blur-md p-3.5 shadow-2xl transition-all ${borderColor}`}
          >
            <div className="flex gap-3 items-center">
              {/* Notification icon */}
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                <IconComponent className="w-4 h-4" strokeWidth={1.6} />
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0 text-right" dir="rtl">
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 mb-0.5">
                  <Sparkles className="w-2.5 h-2.5" strokeWidth={1.6} />
                  <span>إشعار فوري</span>
                </div>
                <h4 className="text-xs font-bold text-white truncate">
                  {title}
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal truncate">
                  {body}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
