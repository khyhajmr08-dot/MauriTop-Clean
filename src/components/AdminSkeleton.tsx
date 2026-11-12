import React from 'react';
import { Skeleton } from './Skeleton';

export default function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative overflow-hidden" dir="rtl">
      {/* Sidebar Skeleton */}
      <aside className="bg-white border-l border-slate-200 hidden md:flex flex-col z-30 h-screen sticky top-0 w-72">
        <div className="p-6 flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="flex-1 px-4 space-y-2 mt-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
        <div className="p-6 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-4 items-center justify-between sticky top-0 z-20">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-28 flex flex-col justify-between">
                <Skeleton className="h-3 w-1/3 rounded" />
                <Skeleton className="h-8 w-1/2 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Table Area */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <Skeleton className="h-6 w-32 rounded" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-3 w-48 rounded" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
