import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { Skeleton, ServiceCardSkeleton } from './Skeleton';

export default function ServicesSkeleton() {
  const { isRtl } = useLanguage();

  return (
    <div className={cn("w-full py-4 space-y-8 animate-in fade-in duration-300", isRtl ? "rtl" : "ltr")} dir={isRtl ? "rtl" : "ltr"}>
      {/* Search Bar Skeleton */}
      <div className="flex flex-col gap-3 max-w-2xl mx-auto px-1">
        <Skeleton className="w-full h-14 rounded-2xl border border-white/10 shadow-lg" />
      </div>

      {/* Category Filter Pills Bar Skeleton */}
      <div className="flex items-center sm:justify-center gap-2.5 px-1 pb-2 overflow-x-hidden w-full">
        {[
          { w: "w-28" },
          { w: "w-32" },
          { w: "w-36" },
          { w: "w-32" },
          { w: "w-32" }
        ].map((item, i) => (
          <Skeleton
            key={i}
            className={cn("h-11 rounded-2xl shrink-0 border border-white/10", item.w)}
          />
        ))}
      </div>

      {/* Category Sections */}
      {[
        { titleWidth: "w-36", subtitleWidth: "w-56", count: 4 },
        { titleWidth: "w-40", subtitleWidth: "w-64", count: 4 },
        { titleWidth: "w-32", subtitleWidth: "w-48", count: 4 }
      ].map((cat, sectionIdx) => (
        <section key={sectionIdx} className="space-y-4 w-full pt-2">
          {/* Category Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 w-full text-right pb-2 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-2xl shrink-0 border border-cyan-500/20" />
              <div className="space-y-1.5">
                <Skeleton className={cn("h-5 rounded-md", cat.titleWidth)} />
                <Skeleton className={cn("h-3 rounded-md", cat.subtitleWidth)} />
              </div>
            </div>
            <div className="self-end sm:self-center shrink-0">
              <Skeleton className="h-7 w-20 rounded-xl" />
            </div>
          </div>

          {/* Horizontal Card Row */}
          <div className="flex gap-3 px-0 pb-6 pt-2 overflow-x-hidden w-full">
            {Array.from({ length: cat.count }).map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
