import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/useAuth";
import { useLanguage } from "../contexts/LanguageContext";
import { playNotificationChime } from "../lib/notificationSound";
import { 
  Zap, 
  ShieldCheck, 
  User, 
  LogOut, 
  Globe, 
  MessageCircle, 
  Menu, 
  X,
  ClipboardList,
  Bell,
  Home,
  PhoneCall,
  FileText
} from "lucide-react";
import { OFFICIAL_PHONE } from "../constants";
import { formatNumberSpacing } from "../lib/utils";

export const Navbar: React.FC = () => {
  const { user, profile, isAdmin, logout } = useAuth();
  const { language, toggleLanguage, isRtl } = useLanguage();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const initialLoadRef = useRef(true);
  const prevCountRef = useRef<number>(0);

  const isArabic = language === "ar";
  const formattedPhone = formatNumberSpacing(OFFICIAL_PHONE);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      initialLoadRef.current = true;
      prevCountRef.current = 0;
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const count = snapshot.size;
        setUnreadCount(count);

        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          prevCountRef.current = count;
        } else {
          if (count > prevCountRef.current) {
            playNotificationChime();
          }
          prevCountRef.current = count;
        }
      },
      (err) => {
        console.warn("Notifications count listener skipped:", err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const closeDrawer = () => setMobileDrawerOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#070B14]/95 backdrop-blur-md border-b border-[#243247] select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        
        {/* Left Side: Mobile Menu Button + Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#111B2E] border border-white/5 active:scale-95 transition-all shrink-0 cursor-pointer"
            aria-label={isArabic ? "فتح القائمة" : "Ouvrir le menu"}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Logo - Never clipped */}
          <Link 
            to="/" 
            onClick={closeDrawer}
            className="flex items-center gap-2 group focus:outline-none shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform shrink-0">
              <Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-slate-950" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-lg font-black tracking-wider text-white leading-tight">
                MAURI<span className="text-emerald-400">TOP</span>
              </span>
              <span className="text-[8px] sm:text-[9px] text-emerald-400 font-bold -mt-0.5 hidden xs:block truncate">
                {isArabic ? "متجر الخدمات الرقمية 🇲🇷" : "Services Digitaux 🇲🇷"}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              location.pathname === "/" 
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30" 
                : "text-slate-300 hover:text-white hover:bg-[#111B2E]"
            }`}
          >
            {isArabic ? "الرئيسية" : "Accueil"}
          </Link>
          <a
            href="/#services"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-[#111B2E] transition-all"
          >
            {isArabic ? "الخدمات" : "Services"}
          </a>
          <Link
            to="/orders"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              location.pathname === "/orders" 
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30" 
                : "text-slate-300 hover:text-white hover:bg-[#111B2E]"
            }`}
          >
            {isArabic ? (user ? "طلباتي" : "تتبع الطلبات") : (user ? "Commandes" : "Suivi")}
          </Link>
          <Link
            to="/contact"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              location.pathname === "/contact" 
                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30" 
                : "text-slate-300 hover:text-white hover:bg-[#111B2E]"
            }`}
          >
            {isArabic ? "تواصل معنا" : "Contact"}
          </Link>
        </nav>

        {/* Right Header Actions: Compact hierarchy on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Admin badge if admin (Desktop only in header, visible in drawer on mobile) */}
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-colors shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{isArabic ? "المشرف" : "Admin"}</span>
            </Link>
          )}

          {/* Desktop WhatsApp Support Link */}
          <a
            href={`https://wa.me/222${OFFICIAL_PHONE}?text=${encodeURIComponent(isArabic ? 'السلام عليكم MAURITOP' : 'Bonjour MAURITOP')}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp Support"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-xs font-bold transition-all active:scale-95 shrink-0"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{isArabic ? "دعم واتساب" : "Support"}</span>
          </a>

          {/* Desktop Language Switcher */}
          <button
            onClick={toggleLanguage}
            type="button"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#111B2E] hover:bg-[#16223B] text-slate-300 hover:text-white border border-[#243247] text-xs font-bold transition-colors shrink-0 cursor-pointer"
            title={isArabic ? "Changer en Français" : "التبديل إلى العربية"}
          >
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{isArabic ? "FR" : "عربي"}</span>
          </button>

          {/* Notifications Bell (Desktop & Tablet) */}
          {user && (
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl bg-[#111B2E] hover:bg-[#16223B] text-slate-300 hover:text-white border border-[#243247] transition-all cursor-pointer flex items-center justify-center shrink-0"
              title={isArabic ? "مركز الإشعارات" : "Notifications"}
              aria-label={isArabic ? "مركز الإشعارات" : "Notifications"}
            >
              <Bell className="w-4 h-4 text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* User Account / Login Button */}
          {user ? (
            <div className="flex items-center gap-1 shrink-0">
              <Link
                to="/profile"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#111B2E] hover:bg-[#16223B] border border-[#243247] text-xs font-bold text-white transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                </div>
                <span className="hidden sm:inline max-w-[70px] truncate">
                  {profile?.name || user.email?.split("@")[0]}
                </span>
              </Link>
              <button
                onClick={() => logout()}
                title={isArabic ? "تسجيل الخروج" : "Déconnexion"}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors hidden sm:flex shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-sm transition-all active:scale-95 shrink-0"
            >
              <User className="w-3.5 h-3.5 text-slate-950" />
              <span>{isArabic ? "دخول" : "Connexion"}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Professional RTL/LTR Slide-over Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end rtl:justify-start">
          {/* Backdrop overlay */}
          <div 
            onClick={closeDrawer}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity duration-200"
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div 
            className={`relative z-10 w-[min(88vw,360px)] h-[100dvh] bg-[#070B14] border-l rtl:border-r rtl:border-l-0 border-[#243247] flex flex-col shadow-2xl overflow-y-auto ${isRtl ? 'text-right' : 'text-left'}`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#243247] flex items-center justify-between shrink-0 bg-[#0B1120]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
                  <Zap className="w-4 h-4 fill-slate-950" />
                </div>
                <span className="text-base font-black text-white tracking-wider">
                  MAURI<span className="text-emerald-400">TOP</span>
                </span>
              </div>
              <button
                onClick={closeDrawer}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 cursor-pointer"
                aria-label={isArabic ? "إغلاق القائمة" : "Fermer le menu"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div className="flex-1 p-3 space-y-1 overflow-y-auto">
              
              {/* Main Links */}
              <Link
                to="/"
                onClick={closeDrawer}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-xs font-bold text-white hover:bg-[#111B2E] transition-colors"
              >
                <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isArabic ? "الرئيسية" : "Accueil"}</span>
              </Link>

              <a
                href="/#services"
                onClick={closeDrawer}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-xs font-bold text-white hover:bg-[#111B2E] transition-colors"
              >
                <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isArabic ? "جميع الخدمات والألعاب" : "Tous les services"}</span>
              </a>

              <Link
                to="/orders"
                onClick={closeDrawer}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-xs font-bold text-white hover:bg-[#111B2E] transition-colors"
              >
                <ClipboardList className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isArabic ? "تتبع الطلبات" : "Suivi de commandes"}</span>
              </Link>

              <Link
                to="/contact"
                onClick={closeDrawer}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-xs font-bold text-white hover:bg-[#111B2E] transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isArabic ? "تواصل معنا والدعم الفني" : "Contact & Support"}</span>
              </Link>

              {user && (
                <Link
                  to="/notifications"
                  onClick={closeDrawer}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl text-xs font-bold text-white hover:bg-[#111B2E] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isArabic ? "مركز الإشعارات" : "Notifications"}</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={closeDrawer}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{isArabic ? "لوحة المشرف والإدارة" : "Panneau d'administration"}</span>
                </Link>
              )}

              {/* Direct Support Section inside Drawer */}
              <div className="pt-3 pb-1 border-t border-white/5 my-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-3 block mb-1">
                  {isArabic ? "خدمة العملاء المباشرة" : "Support Client"}
                </span>
                <a
                  href={`https://wa.me/222${OFFICIAL_PHONE}?text=${encodeURIComponent(isArabic ? 'السلام عليكم MAURITOP' : 'Bonjour MAURITOP')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2 px-3 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>واتساب: {formattedPhone}</span>
                </a>
              </div>

              {/* Legal and Information Links */}
              <div className="pt-2 border-t border-white/5 space-y-1">
                <Link
                  to="/privacy"
                  onClick={closeDrawer}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#111B2E] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{isArabic ? "سياسة الخصوصية" : "Politique de confidentialité"}</span>
                </Link>
                <Link
                  to="/terms"
                  onClick={closeDrawer}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#111B2E] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{isArabic ? "الشروط والأحكام" : "Conditions d'utilisation"}</span>
                </Link>
              </div>

            </div>

            {/* Drawer Footer Actions: Language switcher & user state */}
            <div className="p-3 border-t border-[#243247] bg-[#0B1120] space-y-2 shrink-0">
              {/* Language Switch button in drawer */}
              <button
                onClick={() => {
                  toggleLanguage();
                  closeDrawer();
                }}
                type="button"
                className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-[#070B14] border border-[#243247] text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>{isArabic ? "اللغة الحالية: العربية" : "Langue: Français"}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {isArabic ? "التبديل إلى FR" : "Changer en Arabe"}
                </span>
              </button>

              {user ? (
                <button
                  onClick={() => {
                    logout();
                    closeDrawer();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center justify-center gap-2 transition-colors cursor-pointer border border-rose-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isArabic ? "تسجيل الخروج" : "Déconnexion"}</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={closeDrawer}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <User className="w-4 h-4" />
                  <span>{isArabic ? "تسجيل الدخول / إنشاء حساب" : "Connexion / Inscription"}</span>
                </Link>
              )}
            </div>

          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
