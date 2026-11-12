import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ServicesSection from "../components/ServicesSection";
import Footer from "../components/Footer";
import FAQ from "../components/FAQ";
import MauriTopSEOContent from "../components/MauriTopSEOContent";
import { useLanguage } from "../contexts/LanguageContext";
import SEO from "../components/SEO";
import { WhatsAppOffers } from "../components/WhatsAppOffers";

export default function Home() {
  const { isRtl } = useLanguage();
  const location = useLocation();
  
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-main-bg text-text-primary overflow-x-clip relative pb-bottom-nav md:pb-8">
      <SEO />
      
      {/* Main Service Catalog (Header, Search, Categories, Grid) */}
      <div className="pb-4 pt-1 px-0 w-full text-center max-w-7xl mx-auto space-y-4">
        <ServicesSection />
        <WhatsAppOffers />
      </div>

      {/* Short factual SEO / About section (~85 words) */}
      <MauriTopSEOContent />

      {/* Compact 4-question FAQ */}
      <FAQ />

      {/* Small professional Footer */}
      <Footer />
    </div>
  );
}
