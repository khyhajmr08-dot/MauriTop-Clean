import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
  key?: React.Key;
}

export default function NotificationToast({ 
  message, 
  type = 'success', 
  onClose, 
  duration = 5000 
}: ToastProps) {
  const { isRtl } = useLanguage();

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    info: <Info className="w-5 h-5 text-cyan-400" />,
  };

  const bgColors = {
    success: 'bg-emerald-950/90 border-emerald-500/25 text-emerald-100 shadow-emerald-950/40',
    error: 'bg-rose-950/90 border-rose-500/25 text-rose-100 shadow-rose-950/40',
    info: 'bg-cyan-950/90 border-cyan-500/25 text-cyan-100 shadow-cyan-950/40',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
      layout
      className={`relative pointer-events-auto flex items-center gap-3 py-3 px-4 rounded-xl border shadow-xl backdrop-blur-xl w-full border-white/10 ${bgColors[type]}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="shrink-0">
        {icons[type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold leading-tight">
          {message}
        </p>
      </div>

      <button 
        onClick={onClose}
        className="shrink-0 p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar */}
      <motion.div 
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: "linear" }}
        className={`absolute bottom-0 left-0 right-0 h-[1.5px] origin-left ${
          type === 'success' ? 'bg-emerald-500/40' : 
          type === 'error' ? 'bg-rose-500/40' : 'bg-cyan-500/40'
        }`}
      />
    </motion.div>
  );
}
