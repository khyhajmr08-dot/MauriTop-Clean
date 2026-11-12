import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Sparkles } from "lucide-react";
import mauritopLogo from "../assets/images/mauritop_logo_premium_1786293887874.jpg";

interface SplashScreenProps {
  onFinish?: () => void;
  minimumDurationMs?: number;
}

export default function SplashScreen({ onFinish, minimumDurationMs = 450 }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onFinish) onFinish();
    }, minimumDurationMs);

    return () => clearTimeout(timer);
  }, [minimumDurationMs, onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-[#070B14] text-white p-6 sm:p-8 select-none overflow-hidden"
          dir="rtl"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Country Badge */}
          <div className="w-full flex justify-end">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E1626] border border-white/10 text-xs text-emerald-400 font-bold shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.6} />
              <span>موريتانيا 🇲🇷</span>
            </div>
          </div>

          {/* Center Brand Identity */}
          <div className="flex flex-col items-center text-center space-y-5 relative z-20 my-auto">
            {/* Logo Container */}
            <div className="relative flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#0E1626] p-1 border border-emerald-500/30 shadow-xl flex items-center justify-center overflow-hidden"
              >
                <div className="w-full h-full bg-white rounded-xl flex items-center justify-center overflow-hidden p-1">
                  <img
                    src={mauritopLogo}
                    alt="MauriTop Logo"
                    className="w-full h-full object-contain rounded-lg bg-white"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </motion.div>
            </div>

            {/* Brand Title and Slogan */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="space-y-1.5"
            >
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                <span>موري توب</span>
                <span className="text-emerald-400 font-bold">|</span>
                <span className="text-emerald-400">MauriTop</span>
              </h1>
              <p className="text-xs text-slate-400 font-normal">
                منصة شحن الألعاب والخدمات الرقمية الأولى
              </p>
            </motion.div>

            {/* Progress Line */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "140px" }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="h-1 bg-[#0E1626] rounded-full overflow-hidden relative border border-white/10 shadow-inner mt-3"
            >
              <motion.div
                className="absolute top-0 bottom-0 bg-emerald-400 rounded-full"
                initial={{ left: "-100%", right: "100%" }}
                animate={{
                  left: ["-100%", "0%", "100%"],
                  right: ["100%", "0%", "-100%"]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </div>

          {/* Footer Security Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 relative z-20 pb-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.6} />
            <span>شحن فوري وآمن 100% | Mauritania</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
