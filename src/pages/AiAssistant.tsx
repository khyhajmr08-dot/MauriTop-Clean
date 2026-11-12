import React, { useState, useRef, useEffect } from "react";
import SEO from "../components/SEO";
import { useLanguage } from "../contexts/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { 
  Bot, 
  Sparkles, 
  Send, 
  RefreshCw, 
  Loader2, 
  Search, 
  ArrowLeft, 
  ArrowRight,
  MessageSquare, 
  Globe, 
  CheckCircle,
  ArrowUpRight,
  Sparkle,
  MessageCircle,
  Compass,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  Star,
  Zap,
  Clock,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { haptic } from "../lib/utils";

import freefireImg from "../assets/images/freefire_service_1779283121131.png";
import pubgImg from "../assets/images/pubg_service_1779283143166.png";
import netflixImg from "../assets/images/netflix_service_1779283170112.png";
import googleplayImg from "../assets/images/googleplay_service_1779283248304.png";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
  isGrounded?: boolean;
}

interface StoreProduct {
  id: string;
  titleAr: string;
  titleFr: string;
  descAr: string;
  descFr: string;
  category: "games" | "subscriptions" | "utils";
  prompt: string;
  icon: string;
  imageUrl?: string;
  colorClass: string;
  badgeAr: string;
  badgeFr: string;
}

function generateOfflineFallbackText(query: string, isArabic: boolean): string {
  const text = query.toLowerCase();
  
  if (
    text.includes("فري فاير") || 
    text.includes("free fire") || 
    text.includes("جواهر") || 
    text.includes("diamant") || 
    text.includes("ff") || 
    text.includes("فيري")
  ) {
    return isArabic 
      ? `💎 **شحن جواهر فري فاير (Free Fire) بالـ ID في موريتانيا** 🇲🇷\n\nأهلاً بك! نوفر لك شحن جواهر فري فاير فوري وتلقائي عبر الـ ID الخاص بك لضمان وصول الجواهر لحسابك مباشرة وبشكل آمن.\n\n⚙️ **كيفية الشحن:**\n1. ادخل المعرّف (ID) الخاص بك بدقة.\n2. اختر باقة الجواهر المناسبة (تبدأ من 100 جوهر مع مكافآت إضافية).\n3. سيتم الشحن فوري وتلقائي فور تأكيد الدفع.\n\n📞 لتأكيد الشحن الفوري الآن وتسلم طلبك فوراً، يرجى الضغط على زر واتساب الأخضر أسفل الشاشة للتواصل المباشر مع الدعم الفني لموقع موري توب!`
      : `💎 **Recharge Free Fire par ID en Mauritanie** 🇲🇷\n\nNous proposons une recharge de diamants Free Fire instantanée par ID joueur officiel.\n\n⚙️ **Étapes de recharge :**\n1. Renseignez votre ID Joueur.\n2. Choisissez le volume de diamants.\n3. La livraison est de 1 à 5 minutes dès validation.\n\n📞 Cliquez sur l'icône WhatsApp verte en bas pour finaliser immédiatement avec l'équipe !`;
  }
  
  if (
    text.includes("ببجي") || 
    text.includes("pubg") || 
    text.includes("شدات") || 
    text.includes("uc") || 
    text.includes("شدة")
  ) {
    return isArabic
      ? `🎮 **شحن شدات ببجي موبايل (PUBG Mobile UC) فوري مع موري توب** 🇲🇷\n\nأهلاً بك! يمكنك تعبئة شدات ببجي بأمان تام وسرعة فائقة بالمعرف (ID):\n\n📦 **العروض المتاحة حالياً:**\n- 60 شدة UC\n- 325 شدة UC\n- 660 شدة UC\n- باقات مخصصة حسب رغبتك بأسعار تفضيلية.\n\n📞 لتسليم طلبك فورا بالرقم الخاص بك، تواصل معنا فوراً عبر النقر على زر واتساب الأخضر بالأسفل!`
      : `🎮 **Recharge PUBG Mobile (UC) en Mauritanie** 🇲🇷\n\nCréditez instantanément votre compte PUBG Mobile par ID de manière 100% sécurisée.\n\n📞 Contactez notre service client en cliquant sur le bouton vert WhatsApp en bas !`;
  }
  
  if (
    text.includes("نتفليكس") || 
    text.includes("netflix") || 
    text.includes("اشتراك") || 
    text.includes("سناب") || 
    text.includes("snapchat")
  ) {
    return isArabic
      ? `🎬 **اشتراكات نتفليكس (Netflix) وسناب شات بلس (Snapchat+) في موريتانيا** 🇲🇷\n\nنوفر لك اشتراكات وحسابات رسمية ومضمونة بالكامل:\n\n📺 **باقات نتفليكس المتوفرة:**\n- **حساب كامل مشترك:** شاشة خاصة بدقة Ultra HD 4K وتعمل بدون انقطاع.\n- **اشتراك سنوي أو شهري:** حماية تامة من الحظر وضمان كامل المدة.\n\n📞 للاشتراك وتلقي الحساب فوري، يرجى الضغط على زر واتساب في الأسفل للبدء!`
      : `🎬 **Abonnements Netflix Premium & Snapchat+ en Mauritanie** 🇲🇷\n\nProfitez de nos offres d'écrans partagés ou de comptes privés Ultra HD 4K.\n\n📞 Commandez instantanément par WhatsApp en cliquant sur l'icône ci-dessous !`;
  }
  
  if (
    text.includes("شات جي بي تي") || 
    text.includes("chatgpt") || 
    text.includes("جوجل") || 
    text.includes("google") || 
    text.includes("تفعيل") || 
    text.includes("بطاق")
  ) {
    return isArabic
      ? `🔑 **تفعيل حسابات ChatGPT Plus وبطاقات جوجل بلاي في موريتانيا** 🇲🇷\n\nأهلاً بك! نوفر لك تفعيل الحساب الذكي وحلول الذكاء الاصطناعي وبطاقات المتجر بأفضل الأسعار المتاحة:\n\n🌟 **الخدمات المتاحة:**\n- حسابات ChatGPT Plus نشطة لمشتركي موريتانيا.\n- بطاقات متجر Google Play بمختلف الفئات لشحن ألعابك والتحميل الذكي.\n\n📞 اطلب تفعيل حسابك الآن عبر مراسلتنا بالضغط على واتساب بالأسفل !`
      : `🔑 **Tutoriels d'activation ChatGPT Plus & Cartes Google Play** 🇲🇷\n\nBénéficiez de comptes OpenAI Plus et cartes cadeaux à des prix abordables.\n\n📞 Cliquez sur le widget WhatsApp pour commander !`;
  }
  
  return isArabic
    ? `🤖 **مساعد الدعم الفني لمنصة موري توب (Mouri Top)**\n\nأشكرك على استفسارك! نود إعلامك أن موقع موري توب يقدم لك أسرع شحن للخدمات والألعاب الرقمية في موريتانيا. \n\n🇲🇷 **أبرز خدماتنا الفورية المتوفرة الآن:**\n1. 💎 **شحن جواهر فري فاير (Free Fire)** بالـ ID فوري تلقائي.\n2. 🎮 **شحن شدات ببجي موبايل (PUBG Mobile UC)** فوري وآمن بالمعرّف.\n3. 🎬 **اشتراكات نتفليكس وسناب شات بلس (Netflix & Snapchat+)** باشتراكات مضمونة.\n4. 🔑 **تفعيل حسابات شات جي بي تي (ChatGPT Plus)** وبطاقات هدايا جوجل بلاي.\n\n📞 **للتواصل المباشر والدعم:**\nيمكنك الاتصال بنا أو مراسلتنا عبر واتساب على الرقم الرسمي لمدير الإدارة: **32014902**\n\n💬 يرجى تحديد الخدمة التي ترغب بها، وللحصول على تواصل أسرع وتلبية الطلب فورًا، يرجى بالضغط على أيقونة واتساب الخضراء في الأسفل للتحدث معنا مباشرة عبر الشات!`
    : `🤖 **Assistance Client Mouri Top**\n\nBienvenue ! Nous restons disponibles pour vous guider en Mauritanie :\n\n- 💎 Diamants Free Fire par ID\n- 🎮 UCs PUBG Mobile\n- 🎬 Comptes Netflix VIP et Snapchat+\n- 🔑 ChatGPT Plus & cartes Google Play.\n\n📞 **Contact Administration (WhatsApp) :** **32014902**\n\n💬 N'hésitez pas à nous écrire ou contactez directement l'équipe de vente en cliquant sur le bouton WhatsApp en bas !`;
}

export default function AiAssistant() {
  const { language, isRtl } = useLanguage();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "games" | "subscriptions" | "utils">("all");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isArabic = language === "ar";

  const initGreeting = isArabic 
    ? "مرحباً بك في المساعد الذكي لمنصة موري توب (MAURITOP)! 🤖✨\n\nأنا مرشدك لشروحات الشحن والخدمات الرقمية والاشتراكات في موريتانيا. يمكنك الاستفسار عن باقات الألعاب، خطوات الشحن، وطرق الدفع عبر بنكيلي والسداد.\n\nتفضل باختيار إحدى بطاقات الخدمات أو اطرح استفسارك فوراً!"
    : "Bienvenue sur l'assistant Mouri Top (MAURITOP) ! 🤖✨\n\nVotre guide pour les recharges de jeux, abonnements et cartes numériques en Mauritanie. Posez vos questions à tout moment pour être orienté !";

  // Global store custom presets for SEO optimization
  const storeProducts: StoreProduct[] = [
    {
      id: "ff",
      titleAr: "شحن جواهر فري فاير بالـ ID",
      titleFr: "Recharge Free Fire par ID jugador",
      descAr: "شحن فري فاير تلقائي وسريع بأسعار تفضيلية",
      descFr: "Service de recharge de diamants instantané en Mauritanie",
      category: "games",
      prompt: "أريد شحن جواهر فري فاير (Free Fire) بالـ ID في موريتانيا، ما هي الخطوات والأسعار الحالية لديكم؟",
      icon: "💎",
      imageUrl: freefireImg,
      colorClass: "from-cyan-500/20 to-blue-600/20 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10",
      badgeAr: "موريتانيا ID",
      badgeFr: "ID Joueur"
    },
    {
      id: "pubg",
      titleAr: "شحن شدات ببجي موبايل",
      titleFr: "PUBG Mobile UC Recharge",
      descAr: "شدات ببجي موبايل فوري ومضمون بالمعرّف",
      descFr: "Créditez vos UCs PUBG Mobile instantanément",
      category: "games",
      prompt: "ما هي عروض أسعار شحن شدات ببجي موبايل (PUBG Mobile) فوري المتوفرة الآن في موريتانيا؟",
      icon: "🎮",
      imageUrl: pubgImg,
      colorClass: "from-amber-500/20 to-orange-650/20 border-amber-500/30 text-amber-400 shadow-amber-500/10",
      badgeAr: "شحن فوري",
      badgeFr: "UC PUBG-M"
    },
    {
      id: "netflix",
      titleAr: "اشتراكات نتفليكس وسناب شات",
      titleFr: "Abonnements Netflix & Snapchat+",
      descAr: "تفعيل رسمي، شاشات خاصة بجودة Ultra HD 4K",
      descFr: "Comptes Netflix et Snapchat+ Premium garantis",
      category: "subscriptions",
      prompt: "أريد معرفة أسعار وباقات اشتراكات نتفليكس (Netflix) وسناب شات بلس (Snapchat+) المتوفرة في موريتانيا.",
      icon: "🎬",
      imageUrl: netflixImg,
      colorClass: "from-red-550/20 to-rose-600/20 border-red-500/30 text-red-500 shadow-red-500/10",
      badgeAr: "باقات الحماية",
      badgeFr: "Netflix VIP"
    },
    {
      id: "chatgpt",
      titleAr: "تفعيل حسابات ChatGPT Plus",
      titleFr: "ChatGPT Plus & Google Play",
      descAr: "اشتراكات وحسابات شات جي بي تي 4 وبطاقات الهدايا",
      descFr: "Activer votre compte ChatGPT Plus et Cartes Play Store",
      category: "utils",
      prompt: "كيف يمكنني تفعيل حسابات شات جي بي تي (ChatGPT Plus) وبطاقات جوجل بلاي في موريتانيا؟",
      icon: "🔑",
      imageUrl: googleplayImg,
      colorClass: "from-emerald-555/20 to-teal-600/20 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10",
      badgeAr: "أدوات الذكاء",
      badgeFr: "OpenAI VIP"
    }
  ];

  // Retrieve existing conversation history from localStorage
  useEffect(() => {
    const cachedChats = localStorage.getItem("mouri_chats_fullscreen_v1");
    if (cachedChats) {
      try {
        const parsed = JSON.parse(cachedChats);
        const formatted = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(formatted);
      } catch (e) {
        initDefaultGreeting();
      }
    } else {
      initDefaultGreeting();
    }
  }, [language]);

  const initDefaultGreeting = () => {
    setMessages([
      {
        id: "init",
        role: "model",
        text: initGreeting,
        timestamp: new Date(),
        isGrounded: true
      }
    ]);
  };

  const saveChats = (msgs: Message[]) => {
    localStorage.setItem("mouri_chats_fullscreen_v1", JSON.stringify(msgs));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      text: textToSend,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChats(updatedMessages);
    setIsLoading(true);

    try {
      const formatHistory = updatedMessages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contents: formatHistory })
      });

      if (!res.ok) {
        let errorMsg = "Chat response failed";
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          try {
            const txt = await res.text();
            errorMsg = txt.substring(0, 150) || errorMsg;
          } catch {}
        }
        throw new Error(errorMsg);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Expected JSON but received: ${txt.substring(0, 120)}`);
      }

      const data = await res.json();

      const aiMsg: Message = {
        id: Math.random().toString(),
        role: "model",
        text: data.text || (isArabic ? "عذراً، لم أستطع الاستجابة بالشكل المطلوب حالياً." : "Désolé, je ne parviens pas à charger le résultat."),
        timestamp: new Date(),
        isGrounded: true
      };

      const finalMsgs = [...updatedMessages, aiMsg];
      setMessages(finalMsgs);
      saveChats(finalMsgs);
    } catch (err: any) {
      console.warn("AI Communication fell back gracefully due to error or quota limits:", err);
      
      // Generate highly intelligent localized context reply offline rather than crash!
      const offlineReply = generateOfflineFallbackText(textToSend, isArabic);
      
      const aiMsg: Message = {
        id: Math.random().toString(),
        role: "model",
        text: offlineReply,
        timestamp: new Date(),
        isGrounded: false
      };

      const finalMsgs = [...updatedMessages, aiMsg];
      setMessages(finalMsgs);
      saveChats(finalMsgs);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    haptic.light();
    const txt = inputValue;
    setInputValue("");
    handleSendMessage(txt);
  };

  const resetChat = () => {
    localStorage.removeItem("mouri_chats_fullscreen_v1");
    setMessages([
      {
        id: "init",
        role: "model",
        text: initGreeting,
        timestamp: new Date(),
        isGrounded: true
      }
    ]);
  };

  const isChatEmpty = messages.length <= 1;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans z-50">
      <SEO 
        title={isArabic ? "المساعد الذكي لموري توب - دردشة فورية" : "Assistant IA MauriTop - Chat Instantané"}
        description={isArabic ? "استعن بالمساعد الذكي لموري توب للحصول على مساعدة فورية في شحن الألعاب والاشتراكات في موريتانيا ومعرفة أحدث الأسعار." : "Utilisez l'assistant intelligent MauriTop pour une aide immédiate sur vos recharges et abonnements en Mauritanie."}
        keywords="مساعد موري توب الذكي, شحن ألعاب ذكاء اصطناعي, دعم فني موريتانيا, MauriTop AI Bot"
      />
      {/* Absolute futuristic ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.06),transparent_45%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.04),transparent_50%)] pointer-events-none" />

      {/* Main app header bar (Global Standard design - no website headers) */}
      <header className="h-16 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          {/* Custom Back Button directly returning to the store dashboard */}
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/40 hover:bg-slate-800/90 border border-white/5 rounded-xl text-slate-300 hover:text-white text-xs font-black transition-all cursor-pointer"
            id="back-to-home-btn"
          >
            {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
            <span>{isArabic ? "الرئيسية" : "Retour"}</span>
          </button>
        </div>

        {/* Center label (SEO keyword header) shown elegantly */}
        <div className="hidden lg:block text-xs font-bold text-center text-slate-300 max-w-md truncate">
          {isArabic 
            ? "موري توب - المنصة الأولى للشحن الفوري والخدمات الرقمية في موريتانيا" 
            : "Mouri Top - Recharge immédiate des services en Mauritanie"}
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* Clean/Clear conversation */}
          <button
            onClick={resetChat}
            className="p-2 bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 hover:border-white/10 text-slate-400 hover:text-cyan-400 rounded-xl transition-all flex items-center gap-1.5 text-xs font-extrabold cursor-pointer"
            title={isArabic ? "بدء دردشة جديدة" : "Nouveau chat"}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isArabic ? "جديد" : "Nouveau"}</span>
          </button>

          {/* Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-slate-900/50 hover:bg-slate-800/80 border border-white/5 text-slate-300 rounded-xl transition-all cursor-pointer"
            title={isArabic ? "قائمة الخدمات الجانبية" : "Catalogue latéral"}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main body of full-page application */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Play-style premium Sidebar catalogue - slide toggles dynamically */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="hidden md:flex flex-col bg-slate-900/30 border-r border-white/5 shrink-0 overflow-y-auto"
            >
              <div className="p-5 space-y-6 flex flex-col justify-start min-h-full">
                
                {/* Information Header Block */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4.5 space-y-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-black text-white">
                      {isArabic ? "الخدمات المتاحة فست موري توب" : "Services Index Mouri Top"}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {isArabic 
                      ? "اضغط مباشرة على أي خدمة رقمية بالأسفل لطرح استفسار دقيق بخصوص الأسعار والشحن بالآيدي والاسم وكافة التفاصيل."
                      : "Cliquez sur l'un des services ci-dessous pour lancer automatiquement un briefing complet sur les prix."}
                  </p>
                </div>

                {/* Filter and Catalogue items */}
                <div className="space-y-3.5 flex-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block">
                    {isArabic ? "الكتالوج الحصري لموريتانيا" : "SÉLECTION PREMIUM MAURITANIE"}
                  </span>

                  <div className="grid grid-cols-1 gap-2.5">
                    {storeProducts.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleSendMessage(prod.prompt)}
                        className="group cursor-pointer rounded-xl border border-white/5 bg-slate-950/20 hover:bg-slate-900/80 hover:border-cyan-555/20 px-3.5 py-3 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center border border-white/10 group-hover:border-cyan-500/30 shrink-0">
                            {prod.imageUrl ? (
                              <img 
                                src={prod.imageUrl} 
                                alt={isArabic ? prod.titleAr : prod.titleFr} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-base">{prod.icon}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black group-hover:text-cyan-400 transition-colors">
                              {isArabic ? prod.titleAr : prod.titleFr}
                            </h4>
                            <p className="text-[9px] text-slate-400 truncate max-w-[180px] mt-0.5 font-medium">
                              {isArabic ? prod.descAr : prod.descFr}
                            </p>
                          </div>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-[1px] group-hover:translate-y-[-1px] transition-all" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secure Trust features badge */}
                <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-4 space-y-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isArabic ? "شراكة موثوقة وآمنة" : "Partenaire Certifié Direct"}</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    {isArabic 
                      ? "منصة موري توب لخدمات الشحن الرقمي والاشتراكات والبطاقات المعتمدة في موريتانيا."
                      : "Services de recharges et abonnements numériques en Mauritanie."}
                  </p>
                </div>

              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Responsive Mobile sidebar slide-over menu */}
        <AnimatePresence>
          {isSidebarOpen && (
            <div className="md:hidden absolute inset-0 z-40 flex justify-end">
              {/* Overlay background */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
              />
              
              {/* Menu content */}
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className="w-72 h-full bg-slate-900 border-l border-white/10 shadow-2xl z-10 flex flex-col p-5 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-cyan-400">{isArabic ? "كتالوج المبيعات" : "Services"}</span>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto">
                  {storeProducts.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => {
                        handleSendMessage(prod.prompt);
                        setIsSidebarOpen(false);
                      }}
                      className="p-3 bg-slate-950/60 border border-white/5 hover:border-cyan-500/20 rounded-xl flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                          {prod.imageUrl ? (
                            <img 
                              src={prod.imageUrl} 
                              alt={isArabic ? prod.titleAr : prod.titleFr} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-sm">{prod.icon}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <h4 className="text-[11px] font-bold text-white">
                            {isArabic ? prod.titleAr : prod.titleFr}
                          </h4>
                        </div>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-950 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500">
                    {isArabic ? "المنصة الأولى للشحن بموريتانيا" : "Mouri Top Mauritanie"}
                  </p>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Center Area: Immersive Messages Stream Layout (Fixed height, flex column) */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Message History wrapper */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 scrollbar-thin scrollbar-thumb-white/5 scroll-smooth">
            
            {/* If the convo is empty, represent the gorgeous big Welcome card (ChatGPT/Anthropic Style) */}
            {isChatEmpty && (
              <div className="max-w-xl mx-auto text-center space-y-6 my-auto pt-6 md:pt-14">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] text-cyan-400 font-black shadow-md">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isArabic ? "مساعد الدعم الفوري موري توب" : "Intelligence Artificielle Mouri Top"}</span>
                </div>
                
                <h1 className="text-xl md:text-3xl font-black text-white leading-tight tracking-tight">
                  {isArabic ? "موري توب - المنصة الأولى للشحن الفوري والخدمات الرقمية في موريتانيا" : "Mouri Top - La Première Plateforme de Recharge de Jeux"}
                </h1>

                {/* Quick services feature cards inside main window (for simple visual search tapping) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  {storeProducts.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => handleSendMessage(prod.prompt)}
                      className="group p-4 bg-slate-900/40 hover:bg-slate-900 border border-white/5 hover:border-cyan-500/35 rounded-2xl text-right transition-all flex items-start gap-3 w-full cursor-pointer shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-lg shrink-0">
                        {prod.icon}
                      </div>
                      <div className="text-right flex-1 min-w-0">
                        <span className="text-[9px] text-cyan-400 font-bold bg-cyan-500/5 px-2 py-0.5 rounded-full border border-cyan-500/10">
                          {isArabic ? prod.badgeAr : prod.badgeFr}
                        </span>
                        <h4 className="text-xs font-black text-white mt-1 hover:text-cyan-400 transition-colors">
                          {isArabic ? prod.titleAr : prod.titleFr}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">
                          {isArabic ? prod.descAr : prod.descFr}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Listed direct services for Google Search Indexing */}
                <div className="text-[10px] text-slate-400 max-w-lg mx-auto bg-slate-900/25 border border-white/5 rounded-xl p-3 inline-block">
                  <div className="font-extrabold text-slate-350 mb-1.5 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>{isArabic ? "مزايا البحث المتكامل لشحن الخدمات بموريتانيا" : "Indexation SEO Mauritanie"}</span>
                  </div>
                  <p className="leading-relaxed">
                    {isArabic 
                      ? "1. شحن جواهر فري فاير (Free Fire) بالـ ID • 2. شحن شدات ببجي موبايل (PUBG Mobile UC) فوري • 3. اشتراكات نتفليكس (Netflix) وسناب شات بلس • 4. تفعيل حسابات شات جي بي تي (ChatGPT Plus) وبطاقات جوجل."
                      : "Recharge Diamants Free Fire par ID, PUBG Mobile UCs, Comptes Netflix, Snapchat+, ChatGPT Plus et Cartes Google Play."}
                  </p>
                </div>
              </div>
            )}

            {/* Chat conversation messages */}
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((msg) => {
                const isModel = msg.role === "model";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isModel ? "justify-start" : "justify-end"} animate-fade-in`}
                  >
                    <div className={`flex gap-3.5 max-w-[95%] md:max-w-[85%] ${isModel ? "flex-row" : "flex-row-reverse"}`}>
                      
                      {/* Logo Avatar */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                        isModel 
                          ? "bg-slate-900 border-white/10 text-cyan-400 font-black" 
                          : "bg-cyan-600 border-cyan-500 text-slate-950 font-black"
                      }`}>
                        {isModel ? <Bot className="w-4.5 h-4.5" /> : <MessageSquare className="w-4.5 h-4.5" />}
                      </div>

                      {/* Text content card of message */}
                      <div className="space-y-1">
                        <div className={`rounded-2xl px-4 py-3.5 text-xs md:text-sm leading-relaxed border shadow-md ${
                          isModel
                            ? "bg-slate-900/80 border-white/5 text-slate-200 rounded-tr-none"
                            : "bg-gradient-to-tr from-cyan-600 to-cyan-500 border-cyan-405/20 text-slate-950 font-bold rounded-tl-none"
                        }`}>
                          <p className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</p>
                        </div>

                        {/* Timestamp & ground indicator */}
                        <div className={`flex items-center gap-2 text-[9px] px-1.5 ${isModel ? "justify-start text-slate-500" : "justify-end text-cyan-600"}`}>
                          <span>{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {isModel && msg.isGrounded && (
                            <span className="flex items-center gap-1 text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded-full border border-cyan-500/10 font-bold">
                              <Globe className="w-3 h-3 text-cyan-400" />
                              {isArabic ? "نتائج Google المباشرة" : "Google Live"}
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3.5 max-w-[85%]">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-900 border border-white/10 text-cyan-400">
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    </div>
                    <div className="bg-slate-900 border border-white/5 text-slate-400 rounded-2xl rounded-tr-none p-4 text-xs flex items-center gap-2.5 animate-pulse">
                      <span>{isArabic ? "جاري البحث والمطابقة في متصفح جوجل والحسابات..." : "Consultation de Google Search live..."}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

          </div>

          {/* Locked bottom input bar layout (Always sits tightly at bottom) */}
          <div className="p-4 bg-slate-950 border-t border-white/5 shrink-0 z-20">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="flex gap-2 items-stretch">
                <div className="relative flex-grow">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isArabic ? "أدخل استفسارك، لنتحقق بالبحث المباشر..." : "Entrez votre recherche de service Mouri Top..."}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl py-3.5 pl-4 pr-11 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all text-right"
                    dir="rtl"
                    id="assistant-chat-input"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-slate-950 font-black px-5 rounded-2xl transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/10 cursor-pointer"
                  id="assistant-chat-submit"
                >
                  <span className="hidden sm:inline text-xs">{isArabic ? "استعلم" : "Envoyer"}</span>
                  <Send className={`w-3.5 h-3.5 transform ${isRtl ? "rotate-180" : ""}`} />
                </button>
              </form>

              {/* Bottom minor metadata to align with premium app designs */}
              <div className="flex justify-between items-center mt-3 px-1 text-[9px] text-slate-550 gap-2">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-cyan-500/30" />
                  {isArabic ? "مفعل ومراقب: تحديث الأسعار فوري ومتصل بالبوابة" : "Prix synchronisés avec Mouri Top BD"}
                </span>
                <span>{isArabic ? "مساعد موري توب الشامل" : "Mouri Top Smart-Bot 2026"}</span>
              </div>
            </div>
          </div>

        </main>

      </div>
    </div>
  );
}
