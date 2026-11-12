import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, History, ClipboardList, User } from "lucide-react";
import { useAuth } from "../lib/useAuth";
import { useLanguage } from "../contexts/LanguageContext";
import { cn } from "../lib/utils";
import { motion } from "motion/react";
import { useHapticFeedback } from "../hooks/useHapticFeedback";

export default function BottomNavigation() {
  const { user } = useAuth();
  const location = useLocation();
  const { language } = useLanguage();
  const triggerHaptic = useHapticFeedback();

  const isArabic = language === "ar";

  // Hide BottomNavigation on admin routes, checkout/order flows, and auth pages
  const shouldHide = 
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/services/") ||
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/kyc" ||
    location.pathname === "/privacy" ||
    location.pathname === "/terms";

  if (shouldHide) {
    return null;
  }

  // Extremely clear, concise names using Tajawal font, tailored for mobile screens
  const navItems = [
    {
      id: "home",
      path: "/",
      label: isArabic ? "الرئيسية" : "Accueil",
      icon: Home,
      exact: true,
    },
    ...(user ? [
      {
        id: "orders",
        path: "/orders",
        label: isArabic ? "طلباتي" : "Commandes",
        icon: ClipboardList,
      },
      {
        id: "profile",
        path: "/profile",
        label: isArabic ? "حسابي" : "Profil",
        icon: User,
      }
    ] : [
      {
        id: "login",
        path: "/login",
        label: isArabic ? "دخول" : "Connexion",
        icon: User,
      }
    ])
  ];

  return (
    <motion.nav 
      aria-label={isArabic ? "شريط التنقل السفلي" : "Navigation inférieure"}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-4 sm:right-4 z-40 md:hidden pointer-events-auto"
    >
      {/* Floating Deep Navy Luxury Glassmorphism container */}
      <div className="relative overflow-hidden rounded-2xl border border-[#243247] bg-[#070B14]/95 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around shadow-[0_12px_40px_rgba(0,0,0,0.85)] gpu-accelerated">
        {/* Ambient background accent light */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              onClick={() => triggerHaptic("light")}
              className="relative flex flex-col items-center justify-center min-h-[48px] py-1 px-2 flex-1 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl"
            >
              {/* Highlight sliding background pill for smooth transitions */}
              {isActive && (
                <motion.div
                  layoutId="activeBottomTabPill"
                  className="absolute inset-0 bg-emerald-500/10 rounded-xl border border-emerald-500/20 pointer-events-none"
                  transition={{ duration: 0.15, ease: "easeOut" }}
                />
              )}

              {/* Icon container */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300",
                  isActive
                    ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-[#111B2E] border border-[#243247] text-[#A8B3C5] hover:text-[#F8FAFC]"
                )}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.6}
                  className="transition-all duration-300"
                />
                
                {/* Active pulse glow dot */}
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                )}
              </motion.div>

              {/* Concise Arabic Tajawal Font Label */}
              <span 
                className={cn(
                  "text-[11px] select-none transition-colors duration-300 text-center truncate w-full max-w-[70px]",
                  isActive 
                    ? "text-emerald-400 font-bold" 
                    : "text-slate-400 font-medium"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}

