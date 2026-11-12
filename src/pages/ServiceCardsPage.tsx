import React, { useMemo, useState, useEffect } from "react";
import {
  CalendarDays,
  CreditCard,
  LayoutGrid,
  Sparkles,
  History,
  Check,
} from "lucide-react";

import { ServiceSubscriptionCard, type SubscriptionService as ServiceCardData } from "../components/ServiceSubscriptionCard";
import { ServiceActivityList } from "../components/ServiceActivityList";
import { useAuth } from "../lib/useAuth";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { motion } from "motion/react";
import { getFallbackServiceImage } from "../lib/serviceImages";
import { cacheService } from "../lib/cache";
import SEO from "../components/SEO";
import { SubscriptionCardSkeleton } from "../components/Skeleton";
import { useNavigate } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";

type ServiceType = "all" | "netflix" | "pubg" | "freefire" | "apple" | "prime" | "other";

const services: ServiceCardData[] = [
  {
    id: "netflix-1",
    type: "netflix",
    title: "نتفلكس بريميوم",
    subtitle: "اشتراك شهري فاخر",
    logo: "/assets/netflix.png",
    status: "active",
    pinCode: "RX2UXHXZ#",
    amount: "500",
    currency: "أوقية",
    paymentMethod: "bankily",
    transactionId: "31317724",
    activatedAt: "2026-06-12",
    expiresAt: "2026-07-12",
    note: "اشتراك نشط وصالح لمدة شهر كامل.",
    showCard: true,
    showPin: true,
    showDates: true,
    showAmount: true,
    showPayment: true,
    showTransactionId: true,
    showAction: true,
  },
  {
    id: "pubg-1",
    type: "pubg",
    title: "شحن CP ببجي موبايل",
    subtitle: "بطاقة رقمية صالحة",
    logo: "/assets/pubg.png",
    status: "active",
    amount: "10",
    currency: "دولار",
    paymentMethod: "مباشر",
    activatedAt: "2026-06-12",
    expiresAt: "2026-06-22",
    note: "بطاقة شحن جاهزة للاستخدام فوراً.",
    showCard: true,
    showPin: false,
    showDates: false,
    showAmount: true,
    showPayment: true,
    showTransactionId: false,
    showAction: true,
  },
  {
    id: "apple-1",
    type: "apple",
    title: "آبل ميوزك",
    subtitle: "اشتراك مميز",
    logo: "/assets/apple.png",
    status: "pending",
    amount: "250",
    currency: "أوقية",
    paymentMethod: "Bankily",
    activatedAt: "2026-06-12",
    expiresAt: "2026-07-12",
    note: "بانتظار التفعيل النهائي.",
    showCard: true,
    showPin: true,
    showDates: true,
    showAmount: true,
    showPayment: true,
    showTransactionId: true,
    showAction: true,
    pinCode: "JWMQ62K#",
    transactionId: "A27TT#",
  },
  {
    id: "freefire-1",
    type: "freefire",
    title: "فري فاير",
    showCard: false,
  },
];

const activities = [
  {
    id: "1",
    title: "بطاقة جديدة",
    desc: "تمت إضافة بطاقة آبل ميوزك وتفعيلها.",
    time: "قبل 5 دقائق",
    status: "success" as const,
  },
  {
    id: "2",
    title: "عملية مدفوعة",
    desc: "تمت معالجة دفع bankily بنجاح.",
    time: "قبل 18 دقيقة",
    status: "done" as const,
  },
  {
    id: "3",
    title: "بطاقة قيد المراجعة",
    desc: "اشتراك نتفلكس بانتظار التحقق النهائي.",
    time: "قبل ساعة",
    status: "pending" as const,
  },
];

function StatTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
      <div className="text-[11px] text-white/45">{label}</div>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
    </div>
  );
}

function ServiceCardSkeleton() {
  return <SubscriptionCardSkeleton />;
}

const getServiceType = (serviceId: string, serviceName: string): ServiceType => {
  const id = (serviceId || "").toLowerCase();
  const name = (serviceName || "").toLowerCase();
  if (id.includes("netflix") || name.includes("netflix") || name.includes("نتفليكس")) return "netflix";
  if (id.includes("pubg") || name.includes("pubg") || name.includes("ببجي")) return "pubg";
  if (id.includes("freefire") || id.includes("free") || name.includes("freefire") || name.includes("فري فاير") || id.includes("ff")) return "freefire";
  if (id.includes("apple") || name.includes("apple") || name.includes("آبل") || id.includes("itunes")) return "apple";
  if (id.includes("prime") || name.includes("prime") || name.includes("برايم") || name.includes("amazon")) return "prime";
  return "other";
};

const staggerContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
} as const;

const staggerItemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 15 
    } 
  }
} as const;

export default function ServiceCardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeType, setActiveType] = useState<ServiceType>("all");
  const [realServices, setRealServices] = useState<ServiceCardData[]>([]);
  const [realActivities, setRealActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const fetchData = async () => {
      try {
        // 1. Fetch services
        const servicesSnap = await getDocs(collection(db, "services"));
        const servicesMap: Record<string, any> = {};
        servicesSnap.docs.forEach((doc) => {
          servicesMap[doc.id] = doc.data();
        });

        // 2. Fetch user's orders
        const qOrders = query(
          collection(db, "orders"),
          where("userId", "==", user.uid)
        );
        const ordersSnap = await getDocs(qOrders);
        const orderDocs = ordersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
        
        // Sort orders newest first
        orderDocs.sort((a, b) => {
          const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        // Map completed orders to SubscriptionService cards
        const completedOrders = orderDocs.filter((o) => o.status?.toLowerCase() === "completed");
        
        if (completedOrders.length > 0) {
          const mapped: ServiceCardData[] = completedOrders.map((o) => {
            const serviceName = o.serviceType || o.serviceName || "خدمة رقمية";
            const dbService = servicesMap[o.serviceId || ""];
            const finalImage = dbService?.image || getFallbackServiceImage(serviceName, o.serviceId);
            const type = getServiceType(o.serviceId || "", serviceName) as any;
            
            const purchaseTime = o.updatedAt?.toMillis?.() || o.createdAt?.toMillis?.() || Date.now();
            const pDate = new Date(purchaseTime);
            
            const isSubscription =
              type === "netflix" ||
              type === "apple" ||
              type === "prime" ||
              serviceName.toLowerCase().includes("netflix") ||
              serviceName.toLowerCase().includes("نتفليكس") ||
              serviceName.toLowerCase().includes("سناب") ||
              serviceName.toLowerCase().includes("snapchat") ||
              serviceName.toLowerCase().includes("chatgpt") ||
              serviceName.toLowerCase().includes("gpt") ||
              serviceName.toLowerCase().includes("اشتراك");

            const expiryTime = purchaseTime + 30 * 24 * 60 * 60 * 1000;
            const expDate = new Date(expiryTime);
            const isExpired = Date.now() > expiryTime;

            const playerId = o.fields ? (o.fields.id || o.fields.ID || o.fields["معرف اللاعب"] || o.fields["ID اللاعب"] || o.fields["رقم الحساب"] || Object.values(o.fields)[0]) : undefined;
            const subtitle = playerId ? `ID: ${playerId}` : (dbService?.descriptionAr || dbService?.description || "بطاقة رقمية صالحة");

            return {
              id: o.id,
              type,
              title: serviceName,
              subtitle,
              logo: finalImage,
              status: isExpired ? "expired" : "active",
              pinCode: o.pinCode || o.adminNote || "",
              amount: String(o.amount || 0),
              currency: "أوقية",
              paymentMethod: o.paymentMethod || "bankily",
              transactionId: o.id,
              activatedAt: pDate.toISOString().split('T')[0],
              expiresAt: isSubscription ? expDate.toISOString().split('T')[0] : undefined,
              note: o.adminNote || "",
              showCard: true,
              showPin: !!(o.pinCode || o.adminNote),
              showDates: isSubscription,
              showAmount: true,
              showPayment: true,
              showTransactionId: true,
              showAction: true,
              imageFit: dbService?.imageFit || "cover",
              imagePadding: dbService?.imagePadding,
            };
          });

          setRealServices(mapped);
        } else {
          setRealServices([]);
        }

        // Map latest orders to activities list
        const latestOrders = orderDocs.slice(0, 5);
        if (latestOrders.length > 0) {
          const mappedActivities = latestOrders.map((o) => {
            const serviceName = o.serviceName || o.serviceType || "طلب خدمة";
            const isCompleted = o.status?.toLowerCase() === "completed";
            const isPending = o.status?.toLowerCase() === "pending" || o.status?.toLowerCase() === "processing" || o.status?.toLowerCase() === "approved";
            const statusText = isCompleted ? "مكتمل" : isPending ? "قيد المراجعة" : "ملغى";
            const statusType = isCompleted ? ("success" as const) : isPending ? ("pending" as const) : ("done" as const);
            
            return {
              id: o.id,
              title: serviceName,
              desc: `طلب شحن بقيمة ${o.amount || 0} أوقية - الحالة: ${statusText}`,
              time: o.createdAt ? "مؤخراً" : "قبل قليل",
              status: statusType,
            };
          });
          setRealActivities(mappedActivities);
        } else {
          setRealActivities([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000 * 60 * 30); // Poll every 30 minutes
    return () => clearInterval(interval);
  }, [user]);

  const displayedServices = realServices.length > 0 ? realServices : services;
  const displayedActivities = realActivities.length > 0 ? realActivities : activities;

  const filtered = useMemo(() => {
    return displayedServices.filter((s) => {
      if (s.showCard === false) return false;
      if (activeType === "all") return true;
      return s.type === activeType;
    });
  }, [activeType, displayedServices]);

  const visible = filtered.slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-bottom-nav md:pb-8">
      <SEO 
        title="بطاقات شحن الألعاب والاشتراكات في موريتانيا | موري توب" 
        description="استعرض وأدر بطاقات شحن الألعاب (ببجي، فري فاير) وااشتراكات الترفيه (نتفليكس، شاهد) الخاصة بك في موريتانيا. تسليم فوري للأكواد والرموز."
        keywords="بطاقات ألعاب موريتانيا, كروت شحن ببجي, أكواد فري فاير, بطاقات جوجل بلاي موريتانيا, MauriTop cards, MauriPay"
        url="/service-cards"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.20),transparent_35%),radial-gradient(circle_at_right,rgba(236,72,153,0.12),transparent_30%)]" />

      <div className="relative w-full px-4 py-5 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-12">
        {/* Hero */}
        <section className="rounded-3xl border border-white/8 bg-white/5 p-5 sm:p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                بطاقات الخدمات والاشتراكات
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">
                تصميم راقٍ ونظيف لعرض البطاقات
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                كل خدمة تظهر بشكل منفصل حسب نوعها، مع بطاقة خفيفة وواضحة ومناسبة للهاتف.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]">
              <StatTile label="البطاقات" value={filtered.length} />
              <StatTile
                label="النشطة"
                value={filtered.filter((s) => s.status === "active").length}
              />
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mt-5 rounded-3xl border border-white/8 bg-white/5 p-3 backdrop-blur-xl">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: "all", label: "الكل", icon: <LayoutGrid className="h-4 w-4" /> },
              { key: "netflix", label: "نتفلكس", icon: <CreditCard className="h-4 w-4" /> },
              { key: "pubg", label: "PUBG", icon: <CreditCard className="h-4 w-4" /> },
              { key: "apple", label: "آبل", icon: <CreditCard className="h-4 w-4" /> },
              { key: "prime", label: "برايم", icon: <CreditCard className="h-4 w-4" /> },
            ].map((item) => {
              const isActive = activeType === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveType(item.key as ServiceType)}
                  className={[
                    "inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition shadow-xs cursor-pointer select-none active:scale-95",
                    isActive
                      ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 ring-2 ring-amber-300/60"
                      : "bg-white/8 text-white/75 hover:bg-white/12 border border-white/8",
                  ].join(" ")}
                >
                  {isActive ? <Check className="h-4 w-4 stroke-[3] text-slate-950" /> : item.icon}
                  {item.label}
                  {isActive && (
                    <span className="text-[10px] bg-slate-950/20 text-slate-950 px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      <span>نشط</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>


        {/* Cards */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black">البطاقات الحالية</h2>
              <p className="mt-1 text-sm text-white/55">
                عرض بسيط ومرتب دون ازدحام أو بطاقات متداخلة.
              </p>
            </div>
            {!loading && (
              <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-xs font-bold text-white/70">
                {visible.length} عرض
              </div>
            )}
          </div>

          {loading ? (
            <motion.div 
              variants={staggerContainerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col md:grid md:grid-cols-2 gap-4 items-stretch"
            >
              {[1, 2, 3].map((idx) => (
                <motion.div key={idx} variants={staggerItemVariants} className="h-full">
                  <ServiceCardSkeleton />
                </motion.div>
              ))}
            </motion.div>
          ) : visible.length > 0 ? (
            <motion.div 
              variants={staggerContainerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col md:grid md:grid-cols-2 gap-4 items-stretch"
            >
              {visible.map((service) => (
                <motion.div key={service.id} variants={staggerItemVariants} className="h-full flex flex-col">
                  <ServiceSubscriptionCard
                    service={service}
                    onCopyCode={(code) => {
                      navigator.clipboard.writeText(code);
                      showToast("تم نسخ الكود بنجاح 📋", "success");
                    }}
                    onAction={(svc) => {
                      if (svc.id && svc.id.startsWith("netflix")) {
                        navigate("/services/netflix-premium");
                      } else if (svc.id) {
                        navigate(`/services/${svc.id}`);
                      } else {
                        navigate("/#services");
                      }
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12 rounded-3xl border border-white/5 bg-slate-900/40">
              <p className="text-white/45 font-bold">لا توجد بطاقات حالية متاحة.</p>
            </div>
          )}
        </section>

        {/* Activity log */}
        <section className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl border border-white/8 bg-white/5 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/70">
                  <History className="h-3.5 w-3.5" />
                  سجل العمليات
                </div>
                <h3 className="mt-3 text-xl font-black">آخر النشاطات</h3>
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <div className="h-10 w-10 bg-white/5 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/10 rounded-md w-1/4" />
                        <div className="h-3 bg-white/5 rounded-md w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <motion.div
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <ServiceActivityList items={displayedActivities} />
                </motion.div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/5 p-5 backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/70">
              <CalendarDays className="h-3.5 w-3.5" />
              ملخص سريع
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <div className="text-xs text-white/45">بطاقات نشطة</div>
                <div className="mt-1 text-2xl font-black text-white">
                  {filtered.filter((s) => s.status === "active").length}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <div className="text-xs text-white/45">بطاقات مفعلة حديثاً</div>
                <div className="mt-1 text-2xl font-black text-white">
                  {filtered.filter((s) => s.status === "active").length > 0 ? "نعم" : "لا"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <div className="text-xs text-white/45">معلومة</div>
                <div className="mt-1 text-sm leading-relaxed text-white/65">
                  Free Fire مخفية، وPUBG وNetflix وApple تظهر كخدمات مستقلة ببطاقاتها الخاصة.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
