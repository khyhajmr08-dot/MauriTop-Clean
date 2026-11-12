import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import BottomNavigation from "./BottomNavigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { LogOut, LayoutDashboard, History, ShoppingBag, UserCircle, ShieldCheck, Home, Bell, Sparkles, AlertTriangle, Info, Megaphone, ClipboardList } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { collection, query, where, doc, getDoc, getDocs } from "firebase/firestore";
import { APP_NAME } from "../constants";
import { useLanguage } from "../contexts/LanguageContext";
import { cn } from "../lib/utils";
import { cacheService } from "../lib/cache";
import FCMNotificationBanner from "./FCMNotificationBanner";
import { motion, AnimatePresence } from "motion/react";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, isRtl } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  
  // Real-time Push Notification banner states
  const [pushNotification, setPushNotification] = useState<{ title: string; body: string } | null>(null);
  const [isPushOpen, setIsPushOpen] = useState(false);
  const isInitialLoad = useRef(true);



  useEffect(() => {
    // Initial load from cache to prevent flicker
    const cached = cacheService.get<any>("global_settings");
    if (cached) setSettings(cached);

    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "global"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(data);
          cacheService.set("global_settings", data, 1000 * 60 * 5);
        } else {
          setSettings({ servicesSeeded: false, maintenanceMode: false });
        }
      } catch (error) {
        console.warn("Settings fetch error:", error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (isAdmin && settings && !settings.servicesSeeded) {
      const seedServices = async () => {
        try {
          const { setDoc, doc, getDoc, serverTimestamp } = await import("firebase/firestore");
          const { SERVICES } = await import("../data/services");
          
          for (const s of SERVICES) {
            const docRef = doc(db, "services", s.id);
            const docSnap = await getDoc(docRef);
            // Only seed if document does NOT already exist in Firestore
            if (!docSnap.exists()) {
              await setDoc(docRef, {
                name: s.name,
                nameAr: s.nameAr || s.name,
                description: s.description || "",
                descriptionAr: s.descriptionAr || "",
                image: s.image || "",
                priceMru: s.suggestedPrice || s.minAmount || 0,
                badge: s.category === "ألعاب" ? "شحن ألعاب" : s.category === "اشتراكات" ? "اشتراكات" : "خدمات رقمية",
                imageFit: s.imageFit || "cover",
                status: "نشط",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              }, { merge: true });
            }
          }
          await setDoc(doc(db, "settings", "global"), {
            servicesSeeded: true
          }, { merge: true });
          console.log("Services seeded safely without overwriting existing records.");
        } catch (e) {
          console.warn("Auto seeding services note: ", e);
        }
      };
      seedServices();
    }
  }, [settings, isAdmin]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch unread notifications count once on auth change (foreground sync is handled via FCM)
    const q = query(
      collection(db, "notifications"), 
      where("userId", "==", user.uid), 
      where("read", "==", false)
    );
    
    const fetchNotifications = async () => {
      try {
        const querySnapshot = await getDocs(q);
        setUnreadCount(querySnapshot.size);
      } catch (err) {
        console.warn("Error fetching unread count:", err);
      }
    };
    fetchNotifications();
  }, [user]);
    
  useEffect(() => {
    // Standard FCM Foreground subscription
    let fcmUnsubscribe: (() => void) | null = null;
    import("../lib/fcm").then(({ listenForForegroundMessages }) => {
      listenForForegroundMessages((payload) => {
        if (payload?.notification) {
          setPushNotification({
            title: payload.notification.title || "إشعار فوري",
            body: payload.notification.body || ""
          });
          setIsPushOpen(true);
        }
      }).then(unsubFn => {
        if (typeof unsubFn === "function") {
          fcmUnsubscribe = unsubFn;
        }
      });
    }).catch(err => console.log("FCM import skipped or unsupported on this system:", err));

    return () => {
      if (fcmUnsubscribe) fcmUnsubscribe();
    };
  }, [user]);

  const isAuthPage = ["/login", "/register", "/forgot-password"].includes(location.pathname);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className={cn("min-h-screen bg-main-bg font-sans text-text-primary overflow-x-hidden relative", isRtl ? "rtl" : "ltr")}>
      <div className="absolute inset-0 -z-10 bg-main-bg" />
      
      {/* Main Content Area with High-Performance Smooth Page Transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="layout-container layout-main-spacing"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Internal Page Footer */}
      <Footer />
    </div>
  );
}
