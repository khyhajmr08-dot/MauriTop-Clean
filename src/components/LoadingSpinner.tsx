import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "", 
  size = 'md',
  fullScreen = false,
  className
}) => {
  // Small inline spinner (e.g. inside buttons)
  if (size === 'sm' && !message) {
    return (
      <div className={cn("inline-flex items-center justify-center shrink-0", className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white"
        />
      </div>
    );
  }

  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-2",
    lg: "w-14 h-14 border-[2.5px]",
    xl: "w-16 h-16 border-3"
  };

  const container = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-4 text-center select-none",
      fullScreen 
        ? "fixed inset-0 z-[9999] bg-[#070B14]/90 backdrop-blur-md transition-all p-4" 
        : "w-full min-h-[160px] p-6",
      className
    )}>
      {/* Sleek Minimal Glowing Ring Spinner */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse scale-150" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          className={cn(
            "rounded-full border-transparent border-t-cyan-400 border-r-teal-400/60 shadow-[0_0_15px_rgba(6,182,212,0.4)]",
            sizeClasses[size]
          )}
        />
      </div>

      {/* Clean Optional 1-line Message (Only if explicitly provided) */}
      {message && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-bold text-slate-300 tracking-wide font-sans mt-1"
        >
          {message}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {container}
      </motion.div>
    );
  }

  return container;
};

export default LoadingSpinner;
