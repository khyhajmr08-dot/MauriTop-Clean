import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Skeleton } from './Skeleton';

export default function TransactionHistorySkeleton() {
  const { isRtl } = useLanguage();
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300" dir={isRtl ? "rtl" : "ltr"}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-[#111B2E]/90 p-5 rounded-3xl border border-white/10 h-[180px] space-y-4 shadow-lg flex flex-col justify-between">
          <div className="flex gap-4 items-center">
            <Skeleton className="w-14 h-14 rounded-2xl shrink-0 border border-white/10" />
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton className="h-4 rounded-md w-2/3" />
              <Skeleton className="h-3 rounded-md w-1/3" />
            </div>
            <Skeleton className="w-16 h-7 rounded-xl" />
          </div>
          <div className="pt-3 border-t border-white/5 space-y-2">
            <Skeleton className="h-3.5 rounded-md w-full" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 rounded-md w-1/4" />
              <Skeleton className="h-3 rounded-md w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
