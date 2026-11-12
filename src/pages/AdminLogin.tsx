import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { ShieldCheck, Lock, Mail, AlertTriangle, ArrowRight } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'motion/react';
import SEO from '../components/SEO';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { language } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Double check role in Firestore to ensure extra security
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (userData?.role === 'admin' || email === 'khyhajmr08@gmail.com') {
        showToast(language === 'ar' ? 'مرحباً بك في لوحة التحكم الإدارية' : 'Bienvenue sur le panneau d\'administration', 'success');
        navigate('/admin');
      } else {
        setError('ليس لديك صلاحيات كافية للوصول إلى هنا.');
        await auth.signOut();
      }
    } catch (err: any) {
      console.error(err);
      setError('بيانات الدخول غير صحيحة أو حدث خطأ في الخادم.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a192f] flex flex-col items-center justify-center p-4 rtl font-sans" dir="rtl">
      <SEO title="تسجيل دخول الإدارة | موري توب" noindex={true} />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-full -mr-16 -mt-16" />
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-900/40">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">دخول الإدارة العليا</h2>
          <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">MauriTop Secure Access</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
          >
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-2">البريد الإلكتروني</label>
            <div className="relative">
              <input 
                type="email"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-cyan-500 pr-12 text-right"
                placeholder="admin@mauripay.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="absolute right-4 top-4 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-2">كلمة المرور</label>
            <div className="relative">
              <input 
                type="password"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-cyan-500 pr-12 text-right"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="absolute right-4 top-4 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-cyan-900/20 transition-all flex items-center justify-center gap-3 text-lg"
          >
            {loading ? (
              <LoadingSpinner size="sm" message="" className="p-0 min-h-0 w-auto" />
            ) : (
              <>
                <ArrowRight className="w-6 h-6" />
                تحميل لوحة التحكم
              </>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">تحذير أمني: يراقب النظام جميع محاولات الدخول</p>
        </div>
      </motion.div>

      <button onClick={() => navigate('/')} className="mt-8 text-gray-500 hover:text-cyan-400 transition-colors font-bold text-sm">
        العودة للموقع الرئيسي
      </button>
    </div>
  );
}
