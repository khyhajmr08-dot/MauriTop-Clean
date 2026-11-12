import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type Language = 'ar' | 'fr';

export interface LanguageContextProps {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const translations: Record<string, Record<Language, string>> = {
  // Navigation Links
  'home': { ar: 'الرئيسية', fr: 'Accueil' },
  'our_services': { ar: 'خدماتنا', fr: 'Nos Services' },
  'calculator': { ar: 'حاسبة الكمية', fr: 'Calculateur' },
  'contact_us': { ar: 'تواصل معنا', fr: 'Contactez-nous' },
  'my_account': { ar: 'حسابي', fr: 'Mon Compte' },
  'dashboard': { ar: 'لوحة التحكم', fr: 'Tableau de bord' },
  'wallet': { ar: 'الإحالات', fr: 'Parrainages' },
  'profile': { ar: 'الملف الشخصي', fr: 'Profil' },
  'logout': { ar: 'خروج', fr: 'Déconnexion' },
  'login': { ar: 'دخول', fr: 'Connexion' },
  'register': { ar: 'حساب جديد', fr: 'Créer un compte' },
  'welcome': { ar: 'أهلاً بك', fr: 'Bienvenue' },
  'copyright': { ar: 'جميع الحقوق محفوظة © 2026', fr: 'Tous droits réservés © 2026' },
  'privacy_policy': { ar: 'سياسة الخصوصية', fr: 'Politique de Confidentialité' },
  'terms_of_service': { ar: 'شروط الخدمة', fr: 'Conditions d\'Utilisation' },

  // Home Page
  'hero_title': { ar: 'شحن ألعابك المفضلة والخدمات الرقمية في ثوانٍ', fr: 'Rechargez vos jeux préférés et services digitaux en quelques secondes' },
  'hero_subtitle': { ar: 'المنصة الموريتانية الأولى والأكثر أماناً لشحن جواهر فري فاير، شدات ببجي، وتفعيل الاشتراكات الرقمية بأسعار منافسة ومعاملات سريعة عبر تطبيقات الدفع المحلية.', fr: 'La première plateforme mauritanienne 100% sécurisée pour recharger vos diamants Free Fire, UC PUBG et services digitaux via applications de paiement locales.' },
  'order_now': { ar: 'طلب الآن', fr: 'Commander' },
  'how_it_works': { ar: 'شرح طريقة الشحن في 3 خطوات بسيطة', fr: 'Comment recharger en 3 étapes simples' },
  'step1_title': { ar: '1. اختر الخدمة', fr: '1. Choisissez le service' },
  'step1_desc': { ar: 'تصفح باقات الألعاب والخدمات المتوفرة وحدد العرض المناسب لك.', fr: 'Parcourez nos offres de jeux/services et choisissez l\'offre idéale.' },
  'step2_title': { ar: '2. ادفع محلياً بأمان', fr: '2. Payez localement' },
  'step2_desc': { ar: 'حول المبلغ الإجمالي بسهولة عبر تطبيقات الدفع إلى أرقامنا الرسمية الموضحة.', fr: 'Transférez simplement le montant par applications de paiement vers nos numéros officiels.' },
  'step3_title': { ar: '3. ارفع الإثبات واستلم', fr: '3. Envoyez la preuve' },
  'step3_desc': { ar: 'أرسل لقطة الشاشة مع معرف اللاعب أو الحساب، وسيقوم المشرفون بتأكيد الشحن فوراً.', fr: 'Téléchargez la capture d\'écran avec votre ID de joueur et recevez votre recharge.' },
  'featured_services': { ar: 'الخدمات الأكثر طلبًا', fr: 'Services les Plus Demandés' },

  // General buttons and form labels
  'email': { ar: 'البريد الإلكتروني', fr: 'Adresse Email' },
  'password': { ar: 'كلمة المرور', fr: 'Mot de passe' },
  'fullname': { ar: 'الاسم الكامل', fr: 'Nom Complet' },
  'phone_number': { ar: 'رقم الهاتف', fr: 'Numéro de téléphone' },
  'search': { ar: 'بحث...', fr: 'Recherche...' },
  'submit': { ar: 'إرسال', fr: 'Soumettre' },
  'cancel': { ar: 'إلغاء', fr: 'Annuler' },
  'confirm': { ar: 'تأكيد', fr: 'Confirmer' },
  'status': { ar: 'الحالة', fr: 'Statut' },
  'actions': { ar: 'العمليات', fr: 'Actions' },
  'amount': { ar: 'المبلغ', fr: 'Montant' },
  'mru_balance': { ar: 'مكافآت الإحالة', fr: 'Primes de parrainage' },
  'currency': { ar: 'أوقية جديدة (MRU)', fr: 'MRU Ouguiya' },
  'rate': { ar: 'سعر الصرف', fr: 'Taux de change' },

  // Wallet and Transactions
  'total_balance': { ar: 'إجمالي المكافآت', fr: 'Total des récompenses' },
  'charge_now': { ar: 'طلب شحن جديد', fr: 'Nouvelle commande' },
  'withdraw_now': { ar: 'سجل الطلبات', fr: 'Historique des commandes' },
  'deposit_history': { ar: 'سجل الإحالات', fr: 'Historique des parrainages' },
  'withdrawal_history': { ar: 'سجل العمليات', fr: 'Historique des opérations' },
  'recent_orders': { ar: 'عمليات الشحن الأخيرة', fr: 'Commandes récentes' },
  'no_orders_yet': { ar: 'لا توجد سجلات طلبات حتى الآن.', fr: 'Aucune commande enregistrée pour le moment.' },
  'start_first_order': { ar: 'ابدأ أول طلب لك الآن', fr: 'Commencez votre première commande' },
  'deposit_method': { ar: 'طريقة الدفع الرسمية:', fr: 'Moyen de paiement officiel :' },
  'amount_to_charge': { ar: 'المبلغ الإجمالي (MRU)', fr: 'Montant total (MRU)' },
  'screenshot_proof': { ar: 'صورة إثبات التحويل', fr: 'Preuve de transfert' },
  'drag_drop': { ar: 'اسحب وأفلت الملفات هنا، أو انقر للاختيار', fr: 'Faites glisser-déposer vos fichiers ici, ou cliquez pour sélectionner' },
  'submitting': { ar: 'جاري الإرسال...', fr: 'Envoi en cours...' },
  'send_charge_req': { ar: 'إرسال طلب الشحن', fr: 'Envoyer la demande' },

  // Services & Orders
  'select_package': { ar: 'اختر الباقة المناسبة لك', fr: 'Choisissez le pack idéal' },
  'price': { ar: 'السعر', fr: 'Prix' },
  'service_category': { ar: 'تصنيف الخدمة', fr: 'Catégorie de service' },
  'instant_shipping': { ar: 'شحن سريع وآمن', fr: 'Recharge rapide & sécurisée' },
  'buy_service': { ar: 'اطلب الخدمة الآن', fr: 'Demander le service maintenant' },
  'buy_whatsapp': { ar: 'اطلب فوراً عبر واتساب', fr: 'Commander via WhatsApp' },
  'limit_min_order': { ar: 'الحد الأدنى للطلب هو', fr: 'La limite minimale est de' },
  'order_details_req': { ar: 'تفاصيل طلب الشحن', fr: 'Détails de la commande' },
  'player_id_hint': { ar: 'معرف اللاعب (ID) أو اسم الحساب بدقة:', fr: 'ID du Joueur ou nom de compte précis :' },
  'input_id_placeholder': { ar: 'أدخل المعرف أو رقم الهاتف هنا...', fr: 'Saisissez l\'ID ou le numéro de téléphone ici...' },
  'notes_optional': { ar: 'ملاحظات إضافية بخصوص الطلب (اختياري):', fr: 'Remarques supplémentaires sur la commande (facultatif) :' },
  'order_confirm_pay': { ar: 'تأكيد إرسال الطلب', fr: 'Confirmer l\'envoi de la commande' },
  'order_deduct_alert': { ar: 'سيتم إرسال طلبك للمراجعة. حالة الطلب ستبقى "قيد المراجعة" حتى يتم التأكد من التحويل والتنفيذ من قبل فريقنا.', fr: 'Votre demande sera envoyée pour révision. Le statut restera "En attente" jusqu\'à la confirmation du transfert.' },

  // Calculator
  'calc_title': { ar: 'حاسبة تحويل كمية الشحن الرقمي', fr: 'Calculateur de Recharge Civile/Jeux' },
  'calc_subtitle': { ar: 'احسب عدد الوحدات أو الرسوم والمبالغ المطلوبة بدقة.', fr: 'Calculez le nombre d\'unités ou la devise requise avec précision.' },
  'select_service_calc': { ar: 'اختر الخدمة لحساب السعر', fr: 'Choisissez le service pour calculer le prix' },
  'amount_units': { ar: 'كمية الوحدات أو الجواهر المطلوبة:', fr: 'Quantité d\'unités ou diamants requis :' },
  'calculated_price': { ar: 'السعر المقابل والتقديري:', fr: 'Prix correspondant estimé :' },
  'rate_calc_hint': { ar: 'تعتمد الحسبة على سعر الصرف الحالي للوحدات. قد توجد ضريبة بسيطة أو رسوم معالجة بنسبة 5% عند تقديم الطلب الفعلي.', fr: 'Le calcul est basé sur le taux actuel. Une taxe ou des frais de traitement de 5% peuvent s\'appliquer lors de la commande.' },

  // Kyc & Analytics & Profile
  'kyc_title': { ar: 'طلب ترقية الحساب لوكيل مالي', fr: 'Demande de statut d\'Agent' },
  'kyc_subtitle': { ar: 'الرجاء توفير البيانات المطلوبة لكي تتمكن من الحصول على رتبة وكيل معتمد في المنصة.', fr: 'Veuillez fournir les documents requis pour devenir agent agréé.' },
  'contact_support': { ar: 'اتصل بنا عبر الواتساب للاستفسارات السريعة والدعم المالي على مدار الساعة.', fr: 'Contactez-nous sur WhatsApp pour une assistance financière rapide 24h/24.' },
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'fr' || saved === 'ar') ? saved : 'ar';
  });

  const [isRtl, setIsRtl] = useState<boolean>(language === 'ar');

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => {
      const next = prev === 'ar' ? 'fr' : 'ar';
      localStorage.setItem('app_language', next);
      return next;
    });
  }, []);

  useEffect(() => {
    setIsRtl(language === 'ar');
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string): string => {
    if (translations[key]) {
      return translations[key][language];
    }
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }, [language]);

  const value = useMemo(() => ({
    language,
    toggleLanguage,
    setLanguage,
    t,
    isRtl
  }), [language, toggleLanguage, setLanguage, t, isRtl]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

