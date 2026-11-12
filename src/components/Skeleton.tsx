import React from "react";
import { cn } from "../lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text" | "pill" | "badge" | "card";
  subtle?: boolean;
  glow?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  variant = "rect",
  subtle = false,
  glow = false
}) => {
  return (
    <div
      className={cn(
        subtle ? "skeleton-subtle" : "skeleton-shimmer",
        glow && "skeleton-glow",
        "border border-white/5",
        variant === "circle" && "rounded-full shrink-0",
        variant === "pill" && "rounded-full",
        variant === "badge" && "rounded-xl",
        variant === "card" && "rounded-2xl sm:rounded-3xl",
        variant === "rect" && "rounded-xl",
        variant === "text" && "h-4 w-full rounded-md mb-2 last:w-[75%]",
        className
      )}
    />
  );
};

// Premium Dashboard Skeleton with exact layout parity to Dashboard.tsx
export const DashboardSkeleton = () => (
  <div className="w-full text-right relative min-h-screen animate-in fade-in duration-300">
    {/* Header Skeleton */}
    <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/5 pb-6">
      <div className="flex items-center gap-4">
        {/* Avatar squircle */}
        <div className="relative shrink-0">
          <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-cyan-500/20 shadow-lg shadow-cyan-500/5" />
          <Skeleton variant="circle" className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500/40" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 sm:h-8 w-44 sm:w-56 rounded-xl" />
            <Skeleton className="w-5 h-5 rounded-md hidden sm:inline-block" />
          </div>
          <Skeleton className="h-3.5 w-36 sm:w-64 rounded-md" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      </div>
    </header>

    {/* 4 Financial Metric Stat Cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[
        { labelWidth: "w-14", glowColor: "border-white/5" },
        { labelWidth: "w-16", glowColor: "border-emerald-500/20" },
        { labelWidth: "w-18", glowColor: "border-amber-500/20" },
        { labelWidth: "w-20", glowColor: "border-rose-500/20" }
      ].map((card, i) => (
        <div
          key={i}
          className={cn(
            "bg-[#111B2E]/90 p-5 rounded-2xl border flex flex-col justify-between h-28 relative overflow-hidden shadow-lg",
            card.glowColor
          )}
        >
          <div className="flex justify-between items-center">
            <Skeleton className={cn("h-3 rounded-md", card.labelWidth)} />
            <Skeleton variant="circle" className="w-2.5 h-2.5 opacity-50" />
          </div>
          <div className="flex justify-center my-auto">
            <Skeleton className="h-9 w-16 rounded-xl" />
          </div>
        </div>
      ))}
    </div>

    {/* Quick Navigation 3-Column Grid */}
    <div className="grid grid-cols-3 gap-4 mb-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#111B2E]/80 p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-xl" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
      ))}
    </div>

    {/* Live Orders & Status Card */}
    <div className="bg-gradient-to-b from-[#0f172a] to-[#0b1120] rounded-2xl border border-cyan-500/20 p-4 sm:p-5 mb-8 shadow-xl relative overflow-hidden">
      {/* Top subtle glow bar */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      {/* Header of Section */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36 sm:w-48 rounded-md" />
            <Skeleton className="h-2.5 w-44 rounded-md hidden sm:block" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-xl shrink-0" />
      </div>

      {/* List of Orders */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-[#111B2E]/90 p-3.5 sm:p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-md"
          >
            {/* Left: Icon & Meta */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="relative shrink-0">
                <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-white/10" />
                <Skeleton variant="circle" className="absolute -bottom-1 -right-1 w-5 h-5 border-2 border-[#111B2E]" />
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <Skeleton className="h-4 w-1/3 min-w-[130px] rounded-md" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                  <Skeleton className="h-3.5 w-16 rounded-md" />
                  <Skeleton className="h-3 w-16 rounded-md hidden xs:inline-block" />
                </div>
              </div>
            </div>

            {/* Right: Status Pill & Action */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
              <Skeleton className="h-7 w-24 rounded-xl" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Premium Service Card Skeleton (for 4/5 aspect ratio cards in ServicesByCategory & Home)
export const ServiceCardSkeleton = () => (
  <div className="relative flex flex-col shrink-0 w-[45%] min-w-[160px] max-w-[210px] bg-[#0f172a] rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden border border-white/10 shadow-lg">
    {/* Image Container with notch */}
    <div className="w-full aspect-[4/5] relative bg-slate-900 overflow-hidden">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-4 sm:h-5 bg-[#0f172a] rounded-b-xl z-20 border-x border-b border-white/10" />
      <Skeleton className="w-full h-full rounded-none" />
    </div>
    {/* Content Section */}
    <div className="p-3 sm:p-4 w-full bg-[#111a2e] relative z-20 min-h-[68px] sm:min-h-[78px] flex flex-col justify-center items-center gap-2 border-t border-white/5">
      <Skeleton className="h-4 w-3/4 rounded-md" />
      <Skeleton className="h-3 w-1/2 rounded-md" />
    </div>
  </div>
);

// Premium Subscription Card Skeleton (for ServiceSubscriptionCard in ServiceCardsPage)
export const SubscriptionCardSkeleton = () => (
  <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-xl relative backdrop-blur-md">
    <div className="flex items-center gap-4 mb-4">
      {/* Logo squircle */}
      <Skeleton className="h-14 w-14 rounded-2xl shrink-0 border border-white/10" />
      {/* Title, Badge & Subtitle */}
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-1/3 min-w-[100px] rounded-md" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-1/2 rounded-md" />
      </div>
    </div>

    {/* Code / Pin box */}
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3.5 space-y-2">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-3 w-12 rounded-md" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>

    {/* Footer Info pills */}
    <div className="flex items-center justify-between pt-2 border-t border-white/5">
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20 rounded-xl" />
        <Skeleton className="h-7 w-16 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-24 rounded-xl" />
    </div>
  </div>
);

// Transaction History Skeleton
export const TransactionSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#111B2E]/90 border border-white/5 shadow-md">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0 border border-white/10" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-1/3 min-w-[120px] rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// Notification Skeleton
export const NotificationSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="p-4 rounded-2xl flex gap-4 items-start bg-[#111B2E]/80 border border-white/5 shadow-md">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="h-3 w-12 rounded-md" />
          </div>
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-3/4 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

// Services Manager / Admin Skeleton
export const ServicesManagerSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      <Skeleton className="h-12 w-44 rounded-2xl" />
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="bg-[#111B2E]/90 rounded-[2rem] overflow-hidden border border-white/5 p-4 space-y-4 shadow-lg">
          <Skeleton className="w-full aspect-[4/5] rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4 rounded-md mx-auto" />
            <Skeleton className="h-4 w-1/2 rounded-md mx-auto" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Profile Page Skeleton
export const ProfileSkeleton = () => (
  <div className="space-y-4 animate-in fade-in duration-300 w-full max-w-xl mx-auto py-2">
    {/* Identity Card Skeleton */}
    <div className="bg-[#111B2E] rounded-2xl border border-white/10 p-5 sm:p-6 flex items-center gap-4">
      <Skeleton className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <Skeleton className="h-3.5 w-48 rounded-md" />
        <Skeleton className="h-3 w-28 rounded-md" />
      </div>
    </div>

    {/* Dual Metric Cards */}
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-[#111B2E] rounded-2xl border border-white/10 p-4 space-y-2">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-6 w-24 rounded-lg" />
      </div>
      <div className="bg-[#111B2E] rounded-2xl border border-white/10 p-4 space-y-2">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-6 w-24 rounded-lg" />
      </div>
    </div>

    {/* Form Card Skeleton */}
    <div className="bg-[#111B2E] rounded-2xl border border-white/10 p-5 space-y-4">
      <Skeleton className="h-4 w-32 rounded-md" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  </div>
);

// Posts Admin Skeleton
export const PostsAdminSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-44 rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-[#111B2E]/90 rounded-2xl border border-white/5 p-4 space-y-3 shadow-lg">
          <Skeleton className="w-full h-44 rounded-xl" />
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <Skeleton className="h-3.5 w-full rounded-md" />
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-6 w-20 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

