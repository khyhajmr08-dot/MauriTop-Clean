import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { updateUserLoginMetadata } from '../lib/authUtils';
import { AlertCircle, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import SEO from '../components/SEO';
import mauritopLogo from '../assets/images/mauritop_logo_premium_1786293887874.jpg';

// Official Multi-color Google SVG Icon Component
function GoogleIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export default function Register() {
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
        // Ensure user document exists in firestore
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const isOwner = result.user.email?.toLowerCase().trim() === 'khyhajmr08@gmail.com';
          const role = isOwner ? 'admin' : 'user';
          const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const referrerId = localStorage.getItem('referrerId');
          const safeReferrerId = referrerId && referrerId !== result.user.uid ? referrerId : null;

          await setDoc(userRef, {
            uid: result.user.uid,
            name: result.user.displayName || 'مستخدم موري توب',
            email: result.user.email,
            role,
            blocked: false,
            isVerified: false,
            reviewStatus: 'Active',
            createdAt: serverTimestamp(),
            referralCode,
            referredBy: safeReferrerId,
            referralsCount: 0,
            referralEarnings: 0,
            loyaltyPoints: 0,
            isReferralRewarded: false
          });

          // Referral credit is added by the trusted server only after the first completed order.
          localStorage.removeItem('referrerId');
        } else {
           localStorage.removeItem('referrerId');
        }

        await updateUserLoginMetadata(result.user);
        showToast(language === 'ar' ? 'تم التسجيل بنجاح عبر حساب Google 🚀' : 'Inscription réussie via Google', 'success');
        if (result.user.email?.toLowerCase().trim() === 'khyhajmr08@gmail.com') {
          navigate('/admin');
        } else {
          navigate('/orders');
        }
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error(err);
      }
      if (err.code === 'auth/unauthorized-domain') {
        setError(`عذراً، النطاق (${window.location.hostname}) غير مصرح به في إعدادات Firebase.`);
      } else if (err.code === 'auth/popup-blocked') {
        setError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة للاتصال بجوجل.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // Silent error
      } else if (err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request')) {
        setError('تم إلغاء عملية التسجيل. يرجى المحاولة مجدداً.');
      } else {
        setError('فشل التسجيل عبر Google. يرجى إعادة المحاولة.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070C18] py-12 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden" dir="rtl">
      <SEO 
        title="إنشاء حساب جديد | موري توب"
        description="أنشئ حسابك الجديد في منصة موري توب لشحن الألعاب والخدمات الرقمية في موريتانيا."
        noindex={true}
      />

      {/* Decorative ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-md w-full glass-card p-8 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-cyan-950/40 border border-white/10 relative overflow-hidden z-10 text-center"
      >
        {loading && (
          <div className="absolute inset-0 z-50 bg-[#070B14]/95 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center p-6 text-center">
            <div className="relative flex items-center justify-center mb-5">
              <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center absolute shadow-lg">
                <GoogleIcon className="w-7 h-7" />
              </div>
            </div>
            <h4 className="text-lg font-black text-white">جاري الاتصال بـ Google...</h4>
            <p className="text-xs text-slate-400 mt-1 font-medium">يرجى الانتظار لحظة واحدة</p>
          </div>
        )}
        
        {/* Header - Brand Title & Bright White Logo Tile */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5 group">
            <div className="w-22 h-22 rounded-3xl bg-white border-2 border-white ring-4 ring-cyan-500/30 flex items-center justify-center shadow-2xl shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-300 overflow-hidden p-1.5">
              <img 
                src={mauritopLogo} 
                alt="MauriTop Logo" 
                className="w-full h-full object-contain rounded-2xl bg-white" 
              />
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-slate-950 rounded-full flex items-center justify-center text-slate-950 shadow-md">
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug mb-2">
            إنشاء حساب جديد
          </h2>
          <p className="text-xs sm:text-sm font-bold text-cyan-400 leading-relaxed">
            منصة موري توب الرقمية | MauriTop 🇲🇷
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 p-4 flex items-center gap-3 text-rose-300 rounded-2xl text-right animate-in fade-in duration-300">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <p className="text-xs font-black leading-relaxed">{error}</p>
          </div>
        )}

        {/* Single Premium Google Sign-Up Button */}
        <div className="space-y-4">
          <div className="p-0.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 shadow-xl shadow-cyan-500/25 group hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-[1.02]">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-16 bg-slate-950 hover:bg-slate-900 text-white rounded-[14px] font-black text-sm transition-all active:scale-[0.98] flex items-center justify-between px-5 cursor-pointer border border-white/10"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <GoogleIcon className="w-6 h-6" />
                </div>
                <div className="text-right flex flex-col justify-center">
                  <span className="text-sm sm:text-base font-black text-white group-hover:text-cyan-300 transition-colors leading-tight">
                    التسجيل السريع بـ Google
                  </span>
                  <span className="text-[11px] text-slate-300 font-medium leading-tight mt-1">
                    تسجيل فوري بلمسة واحدة
                  </span>
                </div>
              </div>

              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:translate-x-[-3px] transition-transform shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </div>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>حسابك مفعل ومحمي بأعلى المعايير</span>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-white/10 text-center">
          <p className="text-xs text-slate-400 font-bold">
            مرحباً بك في منصة موري توب لشحن الألعاب والخدمات الرقمية ⚡
          </p>
        </div>
      </motion.div>
    </div>
  );
}



