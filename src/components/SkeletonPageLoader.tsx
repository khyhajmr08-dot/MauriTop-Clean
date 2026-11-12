import React from "react";
import { motion } from "motion/react";

export default function SkeletonPageLoader() {
  return (
    <div className="w-full min-h-[70vh] flex flex-col justify-start p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Top Ambient Glowing Loading Bar (Vercel / Stripe Style) */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-[9999] overflow-hidden bg-slate-900">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
          initial={{ x: "-100%" }}
          animate={{ x: ["-100%", "0%", "100%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Subtle Central Glowing Ring (No Text, Ultra-Minimal) */}
      <div className="flex items-center justify-center py-6">
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          />
        </div>
      </div>

      {/* Fast, Elegant Skeleton Page Structure */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl mx-auto space-y-5"
      >
        {/* Page Title & Controls Skeleton */}
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <div className="space-y-2">
            <div className="w-36 h-6 rounded-lg bg-slate-800/80 animate-pulse" />
            <div className="w-24 h-3 rounded-md bg-slate-800/50 animate-pulse" />
          </div>
          <div className="w-20 h-8 rounded-xl bg-slate-800/60 animate-pulse" />
        </div>

        {/* Top Metric Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-900/60 border border-white/5 p-3 flex flex-col justify-between animate-pulse">
              <div className="w-16 h-3 rounded bg-slate-800/80" />
              <div className="w-24 h-5 rounded-md bg-slate-800" />
            </div>
          ))}
        </div>

        {/* List Content Items Skeleton */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-900/40 border border-white/5 p-3.5 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 shrink-0" />
                <div className="space-y-2">
                  <div className="w-32 sm:w-44 h-3.5 rounded bg-slate-800/90" />
                  <div className="w-20 h-2.5 rounded bg-slate-800/50" />
                </div>
              </div>
              <div className="w-16 h-6 rounded-lg bg-slate-800/70" />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}


