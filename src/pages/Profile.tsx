import React, { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { updateProfile, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import SEO from "../components/SEO";
import { 
  User, Smartphone, Save, Mail, CheckCircle2, Copy, Users, Gift, Camera, Lock, 
  Check, ShieldCheck, Crown, LogOut, Loader2, Sparkles, ChevronRight, ArrowDownToLine, Clock, X, AlertCircle
} from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { motion, AnimatePresence } from "motion/react";
import { cn, compressImage, haptic, formatDateSafe, formatNumberSpacing } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import { ProfileSkeleton } from "../components/Skeleton";

const formatPhoneNumber = (value: string): string => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("222")) {
    const rest = digits.slice(3, 11);
    const parts = rest.match(/.{1,2}/g) || [];
    return `+222 ${parts.join(" ")}`.trim();
  }
  const maxDigits = digits.slice(0, 8);
  const parts = maxDigits.match(/.{1,2}/g) || [];
  return parts.join(" ");
};

export default function Profile() {
  const { language, isRtl } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'rewards' | 'withdrawals'>('profile');
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isArabic = language === "ar";

  // Withdrawal states
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("500");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.name || user.displayName || "");
          setAvatarUrl(data.photoURL || data.avatarUrl || user.photoURL || "");
          const rawPhone = data.phoneNumber || data.phone || "";
          setPhone(formatPhoneNumber(rawPhone));
          setWithdrawPhone(rawPhone.replace(/\D/g, "").slice(-8));
          setReferralCount(data.referralCount || data.referralsCount || 0);
          setLoyaltyPoints(data.loyaltyPoints || data.points || 0);
          setIsVerified(data.isVerified === true || (data.reviewStatus === 'Active' && data.kyc_completed === true));
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();

    // Subscribe to user withdrawals
    const qWithdrawals = query(
      collection(db, "withdrawals"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubWithdrawals = onSnapshot(qWithdrawals, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWithdrawals(list);
    }, (err) => {
      console.warn("Withdrawals fetch note:", err);
    });

    return () => {
      unsubWithdrawals();
    };
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), { name: name.trim(), phoneNumber: phone.trim() }, { merge: true });
      if (auth.currentUser && name.trim()) await updateProfile(auth.currentUser, { displayName: name.trim() });
      showToast(isArabic ? "تم حفظ البيانات بنجاح!" : "Enregistré avec succès !", "success");
    } catch {
      showToast(isArabic ? "خطأ في حفظ البيانات" : "Erreur lors de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(reader.result as string, 300, 300, 0.8);
      await setDoc(doc(db, "users", user.uid), { photoURL: compressed }, { merge: true });
      setAvatarUrl(compressed);
      setAvatarUploading(false);
      showToast(isArabic ? "تم تحديث الصورة الشخصية بنجاح" : "Avatar mis à jour", "success");
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt < 500) {
      showToast(isArabic ? "الحد الأدنى للسحب هو 500 أوقية جديدة" : "Le minimum de retrait est de 500 MRU", "error");
      return;
    }
    if (amt > loyaltyPoints) {
      showToast(isArabic ? "الرصيد المتاح غير كافٍ في حسابك" : "Solde de points insuffisant", "error");
      return;
    }
    if (!withdrawPhone.trim() || withdrawPhone.replace(/\D/g, "").length < 8) {
      showToast(isArabic ? "يرجى إدخال رقم بنكيلي صحيح (8 أرقام)" : "Veuillez entrer un numéro Bankily valide", "error");
      return;
    }

    setSubmittingWithdraw(true);
    try {
      // Create the withdrawal and reserve the points in one trusted server transaction.
      const idToken = await user.getIdToken();
      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          amount: amt,
          bankilyPhone: withdrawPhone.trim()
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || "تعذر إرسال طلب السحب");
      }

      setLoyaltyPoints(Number(result.remainingPoints ?? (loyaltyPoints - amt)));

      haptic.success();
      showToast(isArabic ? "تم إرسال طلب سحب المكافآت إلى الإدارة بنجاح! 🚀" : "Demande de retrait envoyée avec succès !", "success");
      setShowWithdrawModal(false);
      setWithdrawAmount("500");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || (isArabic ? "فشل إرسال طلب السحب، يرجى المحاولة لاحقاً" : "Erreur lors de la demande de retrait"), "error");
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut(auth);
      showToast(isArabic ? "تم تسجيل الخروج بنجاح" : "Déconnexion réussie", "info");
      navigate("/");
    } catch (err: any) {
      showToast(err.message, "error");
      setLoggingOut(false);
    }
  };

  if (loading) return <main className="profile-page" dir={isRtl ? "rtl" : "ltr"}><div className="w-full max-w-lg mx-auto py-8"><ProfileSkeleton /></div></main>;

  return (
    <main className="profile-page" dir={isRtl ? "rtl" : "ltr"}>
      <SEO title={isArabic ? "حسابي الشخصي والمكافآت" : "Mon Compte & Récompenses"} noindex={true} />
      <input type="file" ref={fileInputRef} onChange={handleAvatarFileSelect} className="hidden" accept="image/*" />
      
      <div className="profile-content-stack max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* User Header Card */}
        <section className="bg-gradient-to-r from-[#0B111E] to-[#111A2D] border border-white/10 p-6 rounded-[2rem] flex items-center gap-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div 
            className="w-20 h-20 rounded-[2rem] overflow-hidden border-2 border-white/10 bg-slate-900 cursor-pointer relative group shrink-0 shadow-2xl"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} className="w-full h-full object-cover" alt="Profile Avatar" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-3xl text-emerald-400 bg-slate-800">
                {(name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-white truncate">{name || user?.displayName || (isArabic ? "مستخدم موري توب" : "Utilisateur")}</h2>
              {isVerified && (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shrink-0">
                  <ShieldCheck size={12} /> {isArabic ? "موثق" : "Vérifié"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate mb-1.5">{user?.email}</p>
            <p className="text-xs text-emerald-400 font-mono font-bold">{phone ? formatNumberSpacing(phone.replace(/\D/g, '')) : (isArabic ? "لا يوجد هاتف" : "Pas de téléphone")}</p>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-[#111A2D] to-[#0B111E] border border-white/5 p-5 rounded-3xl shadow-sm text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1">{isArabic ? "الرصيد المتاح" : "Solde disponible"}</span>
            <p className="text-2xl font-black text-white">{loyaltyPoints.toLocaleString()} <span className="text-xs text-emerald-400">MRU</span></p>
          </div>
          <div className="bg-gradient-to-br from-[#111A2D] to-[#0B111E] border border-white/5 p-5 rounded-3xl shadow-sm text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1">{isArabic ? "الأصدقاء" : "Parrainages"}</span>
            <p className="text-2xl font-black text-white">{referralCount.toLocaleString()}</p>
          </div>
        </section>

        {/* Navigation Tabs */}
        <section className="flex p-1 bg-[#0B111E] rounded-2xl border border-white/10">
          <button 
            className={cn("flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer", activeTab === 'profile' ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white")} 
            onClick={() => setActiveTab('profile')}
          >
            {isArabic ? "بيانات الحساب" : "Mon Profil"}
          </button>
          <button 
            className={cn("flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer", activeTab === 'rewards' ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white")} 
            onClick={() => setActiveTab('rewards')}
          >
            {isArabic ? "المكافآت والإحالة" : "Parrainage"}
          </button>
          <button 
            className={cn("flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer relative", activeTab === 'withdrawals' ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white")} 
            onClick={() => setActiveTab('withdrawals')}
          >
            {isArabic ? "طلبات السحب" : "Retraits"}
            {withdrawals.filter(w => w.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {withdrawals.filter(w => w.status === 'pending').length}
              </span>
            )}
          </button>
        </section>

        {/* Tab Content Panel */}
        <section className="space-y-4">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.form 
                key="profile-panel" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleUpdate} 
                className="bg-[#0B111E] border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-300">{isArabic ? "الاسم الكامل" : "Nom complet"}</label>
                  <div className="relative">
                    <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="w-full bg-slate-900/85 border border-white/15 rounded-xl pr-10 pl-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all"
                      placeholder="أدخل اسمك الكامل"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-300">{isArabic ? "رقم الهاتف / بنكيلي" : "Téléphone / Bankily"}</label>
                  <div className="relative">
                    <Smartphone className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={e => setPhone(formatPhoneNumber(e.target.value))} 
                      className="w-full bg-slate-900/85 border border-white/15 rounded-xl pr-10 pl-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all font-mono"
                      placeholder="32 XX XX XX"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-300">{isArabic ? "البريد الإلكتروني (غير قابل للتعديل)" : "Email"}</label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                      type="email" 
                      disabled
                      value={user?.email || ""} 
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-xs font-bold text-slate-400 outline-none cursor-not-allowed font-mono"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isArabic ? "حفظ التغييرات" : "Enregistrer les modifications"}</span>
                </button>
              </motion.form>
            )}

            {activeTab === 'rewards' && (
              <motion.div 
                key="rewards-panel" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#0B111E] border border-white/10 p-5 rounded-3xl space-y-5 shadow-xl"
              >
                <div className="bg-gradient-to-br from-[#111A2D] to-[#0B111E] border border-white/10 p-6 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                  
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20">
                      <Gift size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-white">{isArabic ? "دعوة الأصدقاء" : "Inviter des amis"}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {isArabic 
                          ? "شارك رابط الإحالة الخاص بك واحصل على 30 أوقية جديدة عن كل صديق يسجل ويكمل طلبه الأول!" 
                          : "Gagnez 30 MRU pour chaque ami parrainé qui effectue sa première commande."}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isArabic ? "رابطك الشخصي" : "Votre lien personnel"}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/invite/${user?.uid || ''}`}
                        className="bg-transparent text-xs text-emerald-300 outline-none w-full font-mono truncate"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/invite/${user?.uid || ''}`;
                          navigator.clipboard.writeText(url);
                          haptic.success();
                          showToast(isArabic ? "تم النسخ!" : "Copié !", "success");
                        }}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shrink-0 flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        <Copy size={14} />
                        <span>{isArabic ? "نسخ الرابط" : "Copier"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Withdraw Rewards Card & Button */}
                <div className="bg-gradient-to-br from-[#0B111E] to-[#070C18] border border-emerald-500/20 p-6 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block">{isArabic ? "الرصيد القابل للسحب" : "Solde retirable"}</span>
                      <p className="text-3xl font-black text-white mt-1">{loyaltyPoints.toLocaleString()} <span className="text-sm text-emerald-400">MRU</span></p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <ArrowDownToLine size={24} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (loyaltyPoints < 500) {
                        showToast(isArabic ? "الحد الأدنى للسحب هو 500 أوقية" : "Le minimum est de 500 MRU", "error");
                        return;
                      }
                      setShowWithdrawModal(true);
                    }}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg",
                      loyaltyPoints >= 500
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                        : "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed"
                    )}
                  >
                    <span>{isArabic ? "طلب سحب الأرباح" : "Demander le retrait"}</span>
                  </button>
                  {loyaltyPoints < 500 && (
                    <p className="text-[11px] text-amber-500/80 font-bold text-center">
                      {isArabic ? `تحتاج إلى ${500 - loyaltyPoints} أوقية للوصول للحد الأدنى (500 أوقية)` : `Il vous manque ${500 - loyaltyPoints} MRU`}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'withdrawals' && (
              <motion.div 
                key="withdrawals-panel" 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#0B111E] border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Clock className="text-emerald-400" size={18} />
                    <span>{isArabic ? "سجل طلبات سحب الأرباح" : "Historique des retraits"}</span>
                  </h3>
                  <button
                    onClick={() => {
                      if (loyaltyPoints < 500) {
                        showToast(isArabic ? "الحد الأدنى للسحب هو 500 أوقية جديدة" : "Min 500 MRU", "error");
                        return;
                      }
                      setShowWithdrawModal(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isArabic ? "+ طلب سحب جديد" : "+ Nouveau retrait"}</span>
                  </button>
                </div>

                {withdrawals.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-bold text-xs space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                    <p>{isArabic ? "لا توجد طلبات سحب أرباح سابقة" : "Aucune demande de retrait"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {withdrawals.map((w) => (
                      <div key={w.id} className="bg-slate-900/90 border border-white/10 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-emerald-400 text-base">
                            {w.amount} MRU
                          </span>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            w.status === 'approved' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                            w.status === 'rejected' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                            "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                          )}>
                            {w.status === 'approved' ? (isArabic ? "تم التحويل بنجاح ✅" : "Approuvé") :
                             w.status === 'rejected' ? (isArabic ? "مرفوض ❌" : "Rejeté") :
                             (isArabic ? "قيد الانتظار ⏳" : "En attente")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                          <span>{isArabic ? "رقم بنكيلي:" : "Bankily :"} <strong className="text-white font-mono">{w.bankilyPhone}</strong></span>
                          <span>{formatDateSafe(w.createdAt)}</span>
                        </div>

                        {w.adminNote && (
                          <p className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-white/5 mt-1">
                            <strong>{isArabic ? "ملاحظة الإدارة:" : "Note :"}</strong> {w.adminNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Logout Button */}
        <button 
          onClick={() => setShowLogoutConfirm(true)} 
          className="w-full py-3.5 flex items-center justify-center gap-2 text-xs font-black text-rose-400 hover:bg-rose-500/10 rounded-2xl border border-rose-500/20 cursor-pointer transition-all shadow-sm"
        >
          <LogOut className="w-4 h-4" /> 
          <span>{isArabic ? "تسجيل الخروج من الحساب" : "Se déconnecter"}</span>
        </button>

        {/* Withdrawal Request Modal */}
        <AnimatePresence>
          {showWithdrawModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0B111E] border border-white/15 p-6 rounded-3xl max-w-md w-full shadow-2xl text-white space-y-5"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <ArrowDownToLine size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        {isArabic ? "طلب سحب الأرباح" : "Demande de retrait"}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {isArabic ? "التحويل الفوري عبر بنكيلي (32014902)" : "Transfert Bankily"}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowWithdrawModal(false)} className="text-slate-400 hover:text-white p-1">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-300">
                      {isArabic ? "المبلغ المراد سحبه (MRU)" : "Montant à retirer (MRU)"}
                    </label>
                    <input
                      type="number"
                      min="500"
                      max={loyaltyPoints}
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-sm font-black text-emerald-400 outline-none focus:border-emerald-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-400">
                      {isArabic ? `الرصيد المتاح: ${loyaltyPoints} أوقية (الحد الأدنى 500 أوقية)` : `Solde disponible : ${loyaltyPoints} MRU`}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-300">
                      {isArabic ? "رقم حساب بنكيلي للسحب (8 أرقام)" : "Numéro Bankily (8 chiffres)"}
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="tel"
                        maxLength={8}
                        value={withdrawPhone}
                        onChange={e => setWithdrawPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="32 XX XX XX"
                        className="w-full bg-slate-900 border border-white/15 rounded-xl pr-10 pl-4 py-3 text-xs font-black text-white outline-none focus:border-emerald-500 font-mono tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-[11px] text-emerald-300 leading-relaxed">
                    {isArabic 
                      ? "⚡ ملاحظة: يتم مراجعة طلب السحب وتحويل المبلغ إلى رقم بنكيلي الخاص بك من طرف الإدارة في أقرب وقت مع إرسال إشعار فوري وتأكيد احترافي." 
                      : "⚡ Note : Les retraits sont traités rapidement."}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={submittingWithdraw}
                      onClick={() => setShowWithdrawModal(false)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      {isArabic ? "إلغاء" : "Annuler"}
                    </button>
                    <button
                      type="submit"
                      disabled={submittingWithdraw}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    >
                      {submittingWithdraw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} />}
                      <span>{isArabic ? "تأكيد وإرسال الطلب" : "Confirmer"}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Logout Confirmation Modal */}
        <AnimatePresence>
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0B111E] border border-white/15 p-6 rounded-3xl max-w-sm w-full shadow-2xl text-white space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <LogOut size={20} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {isArabic ? "تأكيد تسجيل الخروج" : "Confirmer la déconnexion"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isArabic ? "هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟" : "Êtes-vous sûr de vouloir vous déconnecter ?"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={loggingOut}
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    {isArabic ? "إلغاء" : "Annuler"}
                  </button>
                  <button
                    type="button"
                    disabled={loggingOut}
                    onClick={handleLogout}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20"
                  >
                    {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut size={14} strokeWidth={1.8} />}
                    <span>{isArabic ? "تسجيل الخروج" : "Se déconnecter"}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
