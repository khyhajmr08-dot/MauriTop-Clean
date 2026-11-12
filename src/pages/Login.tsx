import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { updateUserLoginMetadata } from '../lib/authUtils';
import { AlertCircle, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import SEO from '../components/SEO';
import mauritopLogo from '../assets/images/mauritop_logo_premium_1786293887874.jpg';

// Official Multi-color Google SVG Icon Component
function GoogleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { language } = useLanguage();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        // Fast-path user creation if first time
        const userRef = doc(db, 'users', result.user.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const role = result.user.email?.toLowerCase().trim() === 'khyhajmr08@gmail.com' ? 'admin' : 'user';
            const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const referrerId = localStorage.getItem('referrerId');

            await setDoc(userRef, {
              uid: result.user.uid,
              name: result.user.displayName || 'مستخدم موري توب',
              email: result.user.email,
              role: role,
              blocked: false,
              reviewStatus: 'Active',
              createdAt: new Date(),
              referralCode: referralCode,
              referredBy: (referrerId && referrerId !== result.user.uid) ? referrerId : null,
              referralsCount: 0,
              referralEarnings: 0,
              isReferralRewarded: false
            });
            localStorage.removeItem('referrerId');
          } else {
            localStorage.removeItem('referrerId');
          }
        } catch (dbErr) {
          console.warn("User doc setup handled gracefully:", dbErr);
        }

        // Non-blocking metadata update
        updateUserLoginMetadata(result.user).catch((metaErr) => {
          console.warn("Metadata update error:", metaErr);
        });

        showToast(language === 'ar' ? 'تم تسجيل الدخول بنجاح عبر حساب Google 🚀' : 'Connexion réussie via Google', 'success');
        
        // Immediate clean navigation to avoid hanging on transition
        const destination = result.user.email?.toLowerCase().trim() === 'khyhajmr08@gmail.com' ? '/admin' : '/orders';
        navigate(destination, { replace: true });
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error("Google Auth error:", err);
      }
      if (err.code === 'auth/unauthorized-domain') {
        setError(language === 'ar' 
          ? `عذراً، النطاق (${window.location.hostname}) غير مصرح به في إعدادات Firebase.`
          : `Domaine (${window.location.hostname}) non autorisé dans Firebase.`);
      } else if (err.code === 'auth/popup-blocked') {
        setError(language === 'ar' 
          ? 'تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة (Popups) من إعدادات المتصفح وإعادة المحاولة.'
          : 'Le pop-up a été bloqué par votre navigateur. Veuillez autoriser les fenêtres contextuelles et réessayer.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup intentionally, clean reset
        setError('');
      } else if (err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request')) {
        setError(language === 'ar' ? 'تم إلغاء العملية. يرجى الضغط مرة أخرى للمحاولة.' : 'Opération annulée. Veuillez réessayer.');
      } else if (err.code === 'auth/network-request-failed') {
        setError(language === 'ar' ? 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' : 'Erreur de connexion internet.');
      } else {
        setError(language === 'ar' ? 'فشل تسجيل الدخول عبر Google. يرجى إعادة المحاولة.' : 'Échec de connexion Google. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070B14] py-12 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden" dir="rtl">
      <SEO 
        title="تسجيل الدخول | موري توب" 
        description="تسجيل الدخول إلى حسابك في موري توب لشحن الألعاب والخدمات الرقمية في موريتانيا."
        noindex={true}
      />

      {/* Decorative ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-md w-full bg-[#0E1626] p-8 sm:p-10 rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden z-10 text-center"
      >
        {/* Fullscreen Overlay Spinner during Auth Process */}
        {loading && (
          <div className="absolute inset-0 z-50 bg-[#070B14]/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center">
            <div className="relative flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full border-3 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center absolute shadow-md">
                <GoogleIcon className="w-5 h-5" />
              </div>
            </div>
            <h4 className="text-base font-bold text-white">جاري الاتصال بـ Google...</h4>
            <p className="text-xs text-slate-400 mt-1 font-medium">يرجى الانتظار لحظة واحدة</p>
          </div>
        )}

        {/* Header - Brand Title & Bright White Logo Tile */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative mb-4 group">
            <div className="w-20 h-20 rounded-2xl bg-white border border-white ring-4 ring-emerald-500/20 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-200 overflow-hidden p-1">
              <img 
                src={mauritopLogo} 
                alt="MauriTop Logo" 
                className="w-full h-full object-contain rounded-xl bg-white" 
              />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-[#0E1626] rounded-full flex items-center justify-center text-slate-950 shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug mb-1.5">
            تسجيل الدخول
          </h2>
          <p className="text-xs font-bold text-emerald-400">
            منصة موري توب الرقمية | MauriTop 🇲🇷
          </p>
        </div>

        {error && (
          <div className="mb-5 bg-rose-500/10 border border-rose-500/30 p-3.5 flex items-center gap-2.5 text-rose-300 rounded-xl text-right animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" strokeWidth={1.6} />
            <p className="text-xs font-bold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Single Premium Google Sign-In Button */}
        <div className="space-y-4">
          <div className="p-0.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 shadow-lg group hover:shadow-emerald-500/20 transition-all duration-200">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-14 bg-[#070B14] hover:bg-[#0A101C] text-white rounded-[10px] font-bold text-sm transition-all active:scale-[0.99] flex items-center justify-between px-4 cursor-pointer border border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div className="text-right flex flex-col justify-center">
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-tight">
                    تسجيل الدخول بـ Google
                  </span>
                  <span className="text-[10px] text-slate-300 font-normal leading-tight mt-0.5">
                    دخول سريع وآمن بلمسة واحدة
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:-translate-x-0.5 transition-transform shrink-0">
                <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
              </div>
            </button>
          </div>

          {/* Security & Feature Badges */}
          <div className="pt-1 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-normal">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.6} />
            <span>محمي بأعلى معايير الأمان والتشفير</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
