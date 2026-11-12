import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Skeleton, DashboardSkeleton as SkeletonDashboardContent } from './Skeleton';

export default function DashboardSkeleton() {
  const { isRtl } = useLanguage();
  return (
    <div className="w-full text-right relative min-h-screen" dir={isRtl ? "rtl" : "ltr"}>
      <SkeletonDashboardContent />
    </div>
  );
}
