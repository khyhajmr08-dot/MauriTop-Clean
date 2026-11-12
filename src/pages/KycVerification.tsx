import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  User, 
  Phone, 
  MapPin, 
  Upload, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Navigation,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Building2,
  IdCard,
  FileCheck2,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn, compressImage, haptic } from '../lib/utils';
import { uploadFileWithProgress } from '../services/fileUpload';
import SEO from '../components/SEO';

export default function KycVerification() {
  const { language, isRtl } = useLanguage();
  const { showToast } = useToast();
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSubmittedBefore, setIsSubmittedBefore] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string>('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState('national_id');
  const [idNumber, setIdNumber] = useState('');
  const [idImage, setIdImage] = useState<string | null>(null);
  const [city, setCity] = useState('تفرغ زينة');
  const [addressGps, setAddressGps] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const kycSteps = [
    { id: 1, title: language === 'ar' ? 'المعلومات الشخصية' : 'Informations Personnelles', subtitle: language === 'ar' ? 'الاسم ورقم الهاتف' : 'Nom & Tél' },
    { id: 2, title: language === 'ar' ? 'وثيقة الهوية' : 'Pièce d\'Identité', subtitle: language === 'ar' ? 'بطاقة التعريف/الجواز' : 'CNI / Passeport' },
    { id: 3, title: language === 'ar' ? 'موقع الوكالة' : 'Emplacement d\'Agence', subtitle: language === 'ar' ? 'المدينة والعنوان' : 'Ville & Adresse' }
  ];

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.kyc_full_name) setFullName(data.kyc_full_name);
          if (data.kyc_phone) setPhone(data.kyc_phone);
          if (data.phoneNumber && !data.kyc_phone) setPhone(data.phoneNumber);
          if (data.kyc_id_type) setIdType(data.kyc_id_type);
          if (data.kyc_id_number) setIdNumber(data.kyc_id_number);
          if (data.kyc_id_image) setIdImage(data.kyc_id_image);
          if (data.kyc_city) setCity(data.kyc_city);
          if (data.kyc_address_gps) setAddressGps(data.kyc_address_gps);
          
          if (data.reviewStatus === 'Under Review') {
            setIsSubmittedBefore(true);
            setExistingStatus('Under Review');
          } else if (data.reviewStatus === 'Suspicious' || data.reviewStatus === 'Blocked' || data.reviewStatus === 'Rejected') {
            setExistingStatus(data.reviewStatus);
          } else if (data.reviewStatus === 'Active' && data.kyc_completed) {
            setIsSubmittedBefore(true);
            setExistingStatus('Active');
          }
        }
      } catch (err) {
        showToast(language === 'ar' ? 'خطأ أثناء جلب بيانات الملف الشخصي' : 'Erreur lors de la récupération des données de profil', 'error');
      }
    };
    fetchProfile();
  }, [user, language]);

  // Validation function
  const validate = (currentStepId: number) => {
    if (currentStepId === 1) {
      if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
        showToast(
          language === 'ar' 
            ? 'يرجى إدخال الاسم الكامل ثنائياً على الأقل' 
            : 'Veuillez saisir votre nom complet (au moins 2 mots)', 'error'
        );
        return false;
      }
      if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
        showToast(
          language === 'ar' 
            ? 'يرجى إدخال رقم هاتف صحيح من 8 أرقام على الأقل' 
            : 'Veuillez saisir un numéro de téléphone valide (8 chiffres)', 'error'
        );
        return false;
      }
      return true;
    }
    if (currentStepId === 2) {
      if (!idNumber.trim()) {
        showToast(
          language === 'ar' 
            ? 'يرجى إدخال رقم الوثيقة الرسمية' 
            : 'Veuillez saisir le numéro de votre document', 'error'
        );
        return false;
      }
      if (!idImage) {
        showToast(
          language === 'ar' 
            ? 'يرجى إرفاق صورة واضحة لبطاقة الهوية أو الجواز' 
            : 'Veuillez joindre une photo de votre pièce d\'identité', 'error'
        );
        return false;
      }
      return true;
    }
    if (currentStepId === 3) {
      if (!city) {
        showToast(
          language === 'ar' 
            ? 'يرجى اختيار المقاطعة أو المدينة' 
            : 'Veuillez choisir la ville ou département', 'error'
        );
        return false;
      }
      if (!addressGps.trim()) {
        showToast(
          language === 'ar' 
            ? 'يرجى إدخال العنوان التقريبي أو إحداثيات GPS' 
            : 'Veuillez saisir l\'adresse approximative ou coordonnées GPS', 'error'
        );
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validate(step)) {
      haptic.light();
      setStep((prev) => Math.min(prev + 1, 3));
    } else {
      haptic.error();
    }
  };

  const handlePrevStep = () => {
    haptic.light();
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(
        language === 'ar' 
          ? 'يرجى اختيار ملف صور فقط (PNG, JPG, WebP)' 
          : 'Veuillez choisir un fichier image uniquement (PNG, JPG, WebP)', 'error'
      );
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      try {
        const compressed = await compressImage(rawBase64, 1200, 1200, 0.7);
        setIdImage(compressed);
        showToast(
          language === 'ar' 
            ? 'تم تحميل وثيقة الهوية بنجاح!' 
            : 'La pièce d\'identité a été chargée avec succès !', 'success'
        );
      } catch (err) {
        console.error("Compression error:", err);
        setIdImage(rawBase64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showToast(
        language === 'ar' 
          ? 'المتصفح لا يدعم تحديد الموقع الجغرافي' 
          : 'Votre navigateur ne supporte pas la géolocalisation', 'error'
      );
      return;
    }
    showToast(
      language === 'ar' 
        ? 'جاري جلب إحداثيات GPS...' 
        : 'Obtention des coordonnées GPS...', 'info'
    );
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setAddressGps(`${latitude}, ${longitude}`);
        showToast(
          language === 'ar' 
            ? 'تم جلب الموقع بنجاح!' 
            : 'Position obtenue avec succès !', 'success'
        );
      },
      () => {
        showToast(
          language === 'ar' 
            ? 'فشل جلب الموقع. يرجى إدخال العنوان يدوياً' 
            : 'Échec de localisation. Saisissez l\'adresse manuellement.', 'error'
        );
      }
    );
  };

  const handleSubmitKyc = async () => {
    if (!user) return;
    if (!validate(3)) {
      haptic.error();
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = idImage;
      if (idImage && idImage.startsWith('data:image/')) {
        const storagePath = `kyc/${user.uid}_${Date.now()}.webp`;
        finalImageUrl = await uploadFileWithProgress(idImage, storagePath);
        setIdImage(finalImageUrl);
      }

      const submittedAt = new Date().toISOString();
      const kycData = {
        userId: user.uid,
        userEmail: user.email || '',
        kyc_full_name: fullName,
        kyc_phone: phone,
        kyc_id_type: idType,
        kyc_id_number: idNumber,
        kyc_id_image: finalImageUrl,
        kyc_city: city,
        kyc_address_gps: addressGps,
        kyc_completed: false,
        reviewStatus: 'Under Review',
        kyc_submitted_at: submittedAt
      };

      await updateDoc(doc(db, 'users', user.uid), kycData);
      try {
        await setDoc(doc(db, 'kyc_requests', user.uid), kycData, { merge: true });
      } catch (e) {
        console.warn('kyc_requests collection write fallback:', e);
      }

      showToast(
        language === 'ar' 
          ? 'تم تقديم طلب التوثيق بنجاح! سيتم مراجعته وتأكيده من قبل الإدارة.' 
          : 'La demande KYC a été soumise avec succès pour examen par l\'administration !', 'success'
      );
      haptic.success();
      setIsSubmittedBefore(true);
      setExistingStatus('Under Review');
    } catch (err) {
      haptic.error();
      showToast(
        language === 'ar' 
          ? 'أخفق تقديم الطلب. يرجى المحاولة لاحقاً' 
          : 'Échec de la soumission. Veuillez réessayer ultérieurement.', 'error'
      );
    } finally {
      setLoading(false);
    }
  };

  if (isSubmittedBefore) {
    return (
      <div className={cn("min-h-screen bg-[#070B14] py-16 px-4 text-white flex flex-col items-center justify-center", isRtl ? "rtl text-right" : "ltr text-left")} dir={isRtl ? "rtl" : "ltr"}>
        <div className="max-w-xl w-full mx-auto text-center space-y-6 bg-[#0E1626] p-8 sm:p-10 rounded-2xl border border-white/10 shadow-xl">
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shadow-md">
            <ShieldCheck className="w-8 h-8" strokeWidth={1.6} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {language === 'ar' ? 'طلبك قيد المراجعة والتدقيق الإداري' : 'Votre demande est en cours d\'examen'}
            </h1>
            <p className="text-slate-400 font-normal max-w-md mx-auto leading-relaxed text-xs sm:text-sm">
              {language === 'ar'
                ? 'تم استلام مستندات التحقق المخصصة للوكيل المعتمد. يتم حالياً تدقيق الطلب ومطابقة بطاقة الهوية لضمان الأمان والمصداقية.'
                : 'Nous avons bien reçu vos documents d\'identité. L\'équipe administrative examine vos pièces.'}
            </p>
          </div>

          <div className="bg-[#070B14] p-4 rounded-xl border border-white/5 max-w-sm mx-auto space-y-1.5">
            <p className="text-xs text-slate-400 font-bold">
              {language === 'ar' ? 'الحالة الحالية للطلب' : 'Statut actuel'}
            </p>
            <span className={cn(
              "inline-flex px-3 py-1 rounded-full text-xs font-bold border",
              existingStatus === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              existingStatus === 'Suspicious' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              existingStatus === 'Blocked' || existingStatus === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
            )}>
              {existingStatus === 'Active' 
                ? (language === 'ar' ? 'حساب نشط وموثق' : 'Actif et Approuvé')
                : existingStatus === 'Suspicious'
                  ? (language === 'ar' ? 'مشتبه به' : 'Suspect')
                  : existingStatus === 'Blocked' || existingStatus === 'Rejected'
                    ? (language === 'ar' ? 'مرفوض' : 'Refusé')
                    : (language === 'ar' ? 'قيد التدقيق الإداري' : 'En cours d\'analyse')
              }
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => navigate('/profile')}
              className="px-5 py-2.5 bg-[#070B14] hover:bg-slate-800 border border-white/10 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              {language === 'ar' ? 'العودة للملف الشخصي' : 'Retour au profil'}
            </button>
            
            {(existingStatus === 'Blocked' || existingStatus === 'Rejected' || existingStatus === 'Suspicious') && (
              <button
                onClick={() => {
                  setIsSubmittedBefore(false);
                  setStep(1);
                }}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                {language === 'ar' ? 'تعديل وإعادة التقديم' : 'Modifier et ré-envoyer'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-[#070B14] py-8 px-4 sm:px-6 text-white pb-24", isRtl ? "rtl text-right" : "ltr text-left")} dir={isRtl ? "rtl" : "ltr"}>
      <SEO 
        title={isRtl ? "توثيق الهوية والحساب | موري توب" : "Vérification d'identité | MauriTop"}
        description={isRtl ? "توثيق حسابك في موري توب لزيادة الأمان ورفع حدود عمليات شحن الألعاب والخدمات." : "Vérifiez votre compte MauriTop pour sécuriser vos transactions de recharge."}
        noindex={true}
      />
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" strokeWidth={1.6} />
            <span>{language === 'ar' ? 'طلب ترقية وتوثيق الحساب' : 'Vérification de Compte Agent'}</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {language === 'ar' ? 'توثيق الهوية والاعتماد (KYC)' : 'Vérification d\'identité & KYC'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-normal max-w-md mx-auto leading-relaxed">
            {language === 'ar'
              ? 'يرجى تعبئة نموذج التوثيق للتحقق من الهوية وتفعيل حسابك المعتمد.'
              : 'Veuillez remplir le formulaire pour certifier votre identité.'}
          </p>
        </div>

        {/* Stepper Progress Visual Header */}
        <div className="bg-[#0E1626] p-3 sm:p-4 rounded-2xl border border-white/10 shadow-sm">
          <div className="grid grid-cols-3 gap-2 relative">
            {kycSteps.map((s) => {
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div 
                  key={s.id} 
                  className={cn(
                    "flex flex-col items-center text-center p-2.5 rounded-xl transition-all border",
                    isActive 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-xs" 
                      : isDone 
                        ? "bg-[#070B14] border-white/10 text-slate-300" 
                        : "bg-[#070B14]/40 border-white/5 text-slate-500"
                  )}
                >
                  <div 
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs mb-1 transition-all",
                      isActive 
                        ? "bg-emerald-500 text-slate-950" 
                        : isDone 
                          ? "bg-teal-500 text-slate-950" 
                          : "bg-slate-800 text-slate-400"
                    )}
                  >
                    {isDone ? <CheckCircle className="w-4 h-4" strokeWidth={2} /> : s.id}
                  </div>
                  <span className="text-xs font-bold truncate max-w-full">
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Form Panel */}
        <div className="bg-[#0E1626] p-5 sm:p-8 rounded-2xl border border-white/10 shadow-md relative">
          {loading && (
            <div className="absolute inset-0 z-50 bg-[#070B14]/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-2.5">
              <div className="w-8 h-8 rounded-full border-3 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              <p className="text-xs font-bold text-white">
                {language === 'ar' ? 'جاري إرسال المستندات وتأكيد الملف...' : 'Envoi des documents en cours...'}
              </p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                key="step-1"
                className="space-y-4"
              >
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    <User className="w-4 h-4" strokeWidth={1.6} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {language === 'ar' ? '1. المعلومات الشخصية' : '1. Informations Personnelles'}
                    </h3>
                    <p className="text-xs text-slate-400 font-normal">
                      {language === 'ar' ? 'البيانات الشخصية المطابقة للوثيقة الرسمية' : 'Saisissez vos identifiants réels'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      {language === 'ar' ? 'الاسم الكامل المطابق للهوية' : 'Nom complet conforme à la CNI'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        className={cn(
                          "w-full bg-[#070B14] border border-white/10 rounded-xl py-2.5 font-medium text-xs text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all placeholder:text-slate-600",
                          isRtl ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"
                        )}
                        placeholder={language === 'ar' ? 'الاسم الثلاثي كالمكتوب بالهوية' : 'Votre nom réel complet'}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                      <User className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none", isRtl ? "right-3" : "left-3")} strokeWidth={1.6} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      {language === 'ar' ? 'رقم هاتف الاتصال / الواتساب' : 'N° Téléphone ou WhatsApp'}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        className={cn(
                          "w-full bg-[#070B14] border border-white/10 rounded-xl py-2.5 font-medium text-xs text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all placeholder:text-slate-600 dir-ltr text-left",
                          isRtl ? "pr-9 pl-3" : "pl-9 pr-3"
                        )}
                        placeholder="27 XX XX XX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <Phone className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none", isRtl ? "right-3" : "left-3")} strokeWidth={1.6} />
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal block">
                      {language === 'ar' 
                        ? 'يرجى إدخال رقم هاتف يعمل لاستلام إشعار التأكيد.' 
                        : 'Assurez-vous que la ligne soit active pour la confirmation.'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Document */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                key="step-2"
                className="space-y-4"
              >
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    <FileText className="w-4 h-4" strokeWidth={1.6} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {language === 'ar' ? '2. مستندات إثبات الشخصية' : '2. Pièces Justificatives d\'Identité'}
                    </h3>
                    <p className="text-xs text-slate-400 font-normal">
                      {language === 'ar' ? 'تحميل صورة واضحة لبطاقة الهوية أو جواز السفر' : 'Joignez votre document d\'identité'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      {language === 'ar' ? 'نوع وثيقة الإثبات' : 'Type de document'}
                    </label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl py-2.5 px-3 font-bold text-xs text-white focus:border-emerald-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="national_id">
                        {language === 'ar' ? 'بطاقة تعريف وطنية (National ID)' : 'Carte Nationale d\'Identité (CNI)'}
                      </option>
                      <option value="passport">
                        {language === 'ar' ? 'جواز السفر الموريتاني (Passport)' : 'Passeport Mauritanien'}
                      </option>
                      <option value="driving_license">
                        {language === 'ar' ? 'رخصة القيادة (Driving License)' : 'Permis de Conduire'}
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      {language === 'ar' ? 'رقم الوثيقة الرسمية / NNID' : 'Numéro de pièce d\'identité'}
                    </label>
                    <input
                      type="text"
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl py-2.5 px-3 font-medium text-xs text-white focus:border-emerald-500 outline-none transition-all placeholder:text-slate-600 dir-ltr text-left"
                      placeholder={language === 'ar' ? 'أدخل الرقم الوطني أو رقم الجواز' : 'Numéro de CNI ou Passeport'}
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                    />
                  </div>

                  {/* File Upload Dropzone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      {language === 'ar' ? 'صورة واضحة كاملة للوثيقة (إجباري)' : 'Image nette et lisible du document'}
                    </label>
                    
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 transition-all ${
                        dragActive ? 'border-emerald-500 bg-emerald-950/20' : 'border-white/10 bg-[#070B14] hover:border-emerald-500/40'
                      }`}
                    >
                      {idImage ? (
                        <div className="relative group w-full max-w-xs text-center space-y-2.5">
                          <img 
                            src={idImage} 
                            alt="ID Preview" 
                            referrerPolicy="no-referrer"
                            className="rounded-xl max-h-40 w-full object-cover shadow-sm border border-white/10 mx-auto" 
                          />
                          <div className="flex items-center justify-center gap-2">
                            <label 
                              htmlFor="id-file-upload-replace"
                              className="px-3 py-1.5 bg-[#121D31] hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Upload className="w-3.5 h-3.5" strokeWidth={1.6} />
                              <span>{language === 'ar' ? 'تغيير الصورة' : 'Changer'}</span>
                            </label>
                            <input 
                              type="file" 
                              id="id-file-upload-replace"
                              className="hidden"
                              accept="image/*"
                              onChange={handleFileInput}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2 space-y-1.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-1">
                            <Upload className="w-5 h-5" strokeWidth={1.6} />
                          </div>
                          <p className="text-xs font-bold text-white">
                            {language === 'ar' ? 'اسحب صورة الهوية وأسقطها هنا' : 'Glissez-déposez la pièce d\'identité'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-normal">
                            {language === 'ar' ? 'أو اختر ملف صورة من جهازك (PNG, JPG, WebP)' : 'ou parcourez vos fichiers (PNG, JPG, WebP)'}
                          </p>
                          <input 
                            type="file" 
                            id="id-file-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileInput}
                          />
                          <div className="pt-1">
                            <label 
                              htmlFor="id-file-upload"
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm active:scale-95"
                            >
                              <Upload className="w-3.5 h-3.5" strokeWidth={1.6} />
                              <span>{language === 'ar' ? 'اختر ملف من الجهاز' : 'Parcourir les fichiers'}</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Location */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                key="step-3"
                className="space-y-4"
              >
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    <MapPin className="w-4 h-4" strokeWidth={1.6} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {language === 'ar' ? '3. موقع المقر أو منطقة النشاط' : '3. Emplacement du siège ou zone d\'activité'}
                    </h3>
                    <p className="text-xs text-slate-400 font-normal">
                      {language === 'ar' ? 'تحديد الولاية أو المقاطعة والعنوان التفصيلي' : 'Déterminez votre région et adresse GPS'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      {language === 'ar' ? 'المقاطعة / المدينة' : 'Département / Ville'}
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-[#070B14] border border-white/10 rounded-xl py-2.5 px-3 font-bold text-xs text-white focus:border-emerald-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="تفرغ زينة">{language === 'ar' ? 'تفرغ زينة (Tevragh Zeina)' : 'Tevragh Zeina'}</option>
                      <option value="لكصر">{language === 'ar' ? 'لكصر (El Ksar)' : 'El Ksar'}</option>
                      <option value="عرفات">{language === 'ar' ? 'عرفات (Arafat)' : 'Arafat'}</option>
                      <option value="دار النعيم">{language === 'ar' ? 'دار النعيم (Dar Naim)' : 'Dar Naïm'}</option>
                      <option value="نواذيبو">{language === 'ar' ? 'نواذيبو (Nouadhibou)' : 'Nouadhibou'}</option>
                      <option value="توجنين">{language === 'ar' ? 'توجنين (Toujounine)' : 'Toujounine'}</option>
                      <option value="الميناء">{language === 'ar' ? 'الميناء (El Mina)' : 'El Mina'}</option>
                      <option value="السبخة">{language === 'ar' ? 'السبخة (Sebkha)' : 'Sebkha'}</option>
                      <option value="روصو">{language === 'ar' ? 'روصو (Rosso)' : 'Rosso'}</option>
                      <option value="كيفه">{language === 'ar' ? 'كيفه (Kiffa)' : 'Kiffa'}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      {language === 'ar' ? 'العنوان أو إحداثيات GPS' : 'Adresse ou coordonnées GPS'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 min-w-0 bg-[#070B14] border border-white/10 rounded-xl py-2.5 px-3 font-medium text-xs text-white focus:border-emerald-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder={language === 'ar' ? 'الشارع الرئيسي، جوار كارفور' : 'Rue Principale'}
                        value={addressGps}
                        onChange={(e) => setAddressGps(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-1 text-xs shrink-0 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Navigation className="w-3.5 h-3.5" strokeWidth={1.6} />
                        <span>{language === 'ar' ? 'GPS' : 'GPS'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-amber-300 text-xs font-normal leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.6} />
                    <div>
                      <span className="font-bold text-amber-300">
                        {language === 'ar' ? 'تنويه إداري:' : 'Avis important :'}
                      </span>{' '}
                      {language === 'ar' 
                        ? 'يرجى إدخال عنوان دقيق حيث يساعد في سرعة اعتماد وتصنيف الوكيل حسب المنطقة.'
                        : 'Veuillez saisir une adresse précise pour accélérer l\'approbation.'}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav buttons */}
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2 bg-[#070B14] border border-white/10 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                {isRtl ? <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.6} /> : <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />}
                <span>{language === 'ar' ? 'الخطوة السابقة' : 'Précédent'}</span>
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <span>{language === 'ar' ? 'الخطوة التالية' : 'Suivant'}</span>
                {isRtl ? <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} /> : <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.6} />}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitKyc}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.6} /> : <CheckCircle className="w-4 h-4" strokeWidth={1.8} />}
                <span>{language === 'ar' ? 'إرسال طلب التوثيق' : 'Soumettre le dossier'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
