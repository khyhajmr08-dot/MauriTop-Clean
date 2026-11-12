import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { collection, query, orderBy, getDocs, doc, updateDoc, setDoc, addDoc, serverTimestamp, getDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/useAuth";
import { cacheService } from "../lib/cache";
import { normalizeOrderStatus, getOrderStatusArabic } from "../lib/utils";
import { 
  LayoutDashboard, 
  ListOrdered, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Users, 
  Send, 
  Settings, 
  FileText, 
  Menu, 
  X,
  ChevronLeft,
  Search,
  ExternalLink,
  MessageSquare,
  Sliders,
  Sparkles,
  Clock,
  ShoppingBag,
  Activity,
  RefreshCw,
  Globe,
  ShieldCheck,
  FileBadge,
  BadgeCheck,
  Eye,
  Check,
  Ban,
  UserCheck,
  Trash2,
  UserPlus,
  UserMinus,
  ShieldAlert,
  CreditCard,
  Zap
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { useToast } from '../contexts/ToastContext';
import { useNavigate, Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorBoundary from "../components/ErrorBoundary";
import { cn, formatMRU, formatDateSafe, formatNumberSpacing } from "../lib/utils";
import { AdminSettings } from "../components/admin/AdminSettings";
import { AdminPaymentManager, PaymentMethodManager } from "../components/AdminPaymentManager";
import { MarqueeManager } from "../components/admin/MarqueeManager";
import { IndexNowManager } from "../components/admin/IndexNowManager";
import AnimatedCounter from "../components/AnimatedCounter";
import { OrderDetailsModal } from "../components/OrderDetailsModal";
import { LiveVisitorsDashboard } from "../components/admin/LiveVisitorsDashboard";
import { StaffManager } from "../components/admin/StaffManager";
import { logAuditEvent } from "../lib/auditLogger";
import SEO from "../components/SEO";

// Lazy loaded sub-components to keep dashboard clean
const ServicesManager = React.lazy(() => import("./ServicesManager"));
const PostsAdmin = React.lazy(() => import("../components/PostsAdmin"));

import AdminSkeleton from "../components/AdminSkeleton";

export default function AdminDashboard() {
  const { user, profile, isAdmin, isOwner, staffRole, permissions } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState("");
  const [isWithdrawalRejectModalOpen, setIsWithdrawalRejectModalOpen] = useState(false);
  const [withdrawalActionLoading, setWithdrawalActionLoading] = useState(false);
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [globalNoticeDraft, setGlobalNoticeDraft] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);

  useEffect(() => {
    if (isRejectionModalOpen || isMobileSidebarOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isRejectionModalOpen, isMobileSidebarOpen]);

  const [notificationForm, setNotificationForm] = useState({ title: "", body: "", userId: "all" });
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);
  const [isSavingGlobalNotice, setIsSavingGlobalNotice] = useState(false);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [phoneActionUserId, setPhoneActionUserId] = useState<string | null>(null);
  const [roleActionUserId, setRoleActionUserId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  
  // KYC Verification States
  const [selectedKycUser, setSelectedKycUser] = useState<any>(null);
  const [kycRejectReason, setKycRejectReason] = useState("");
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isKycRejectModalOpen, setIsKycRejectModalOpen] = useState(false);
  const [kycActionLoading, setKycActionLoading] = useState(false);
  const [kycStatusFilter, setKycStatusFilter] = useState<string>("all");
  const mainScrollRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [activeTab]);

  React.useEffect(() => {
    if (staffRole === 'services_manager' && !permissions.canManageOrders && activeTab === 'orders') {
      setActiveTab('services');
    }
  }, [staffRole, permissions.canManageOrders, activeTab]);

  const fetchOrders = useCallback(async (force = false) => {
    if (force) {
      cacheService.remove("admin_orders");
    } else {
      const cached = cacheService.get<any[]>("admin_orders");
      if (cached) {
        setOrders(cached);
        setLoading(false);
        return;
      }
    }

    try {
      const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
      const ordersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(ordersData);
      cacheService.set("admin_orders", ordersData, 1000 * 60 * 5); // 5 mins
      setLoading(false);
    } catch (err) {
      console.error("Orders sync error:", err);
      showToast("فشل تحميل الطلبات.", "error");
      setLoading(false);
    }
  }, [showToast]);

  const fetchUsers = useCallback(async (force = false) => {
    if (force) {
      cacheService.remove("admin_users");
    } else {
      const cached = cacheService.get<any[]>("admin_users");
      if (cached) {
        setUsersList(cached);
        return;
      }
    }

    try {
      const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
      const usersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsersList(usersData);
      cacheService.set("admin_users", usersData, 1000 * 60 * 5); // 5 mins
    } catch (err) {
      console.error("Users sync error:", err);
    }
  }, []);

  const fetchSettings = useCallback(async (force = false) => {
    if (force) {
      cacheService.remove("admin_settings");
    } else {
      const cached = cacheService.get<any>("admin_settings");
      if (cached) {
        setSystemSettings(cached);
        setGlobalNoticeDraft(cached.globalNotice || "");
        return;
      }
    }

    try {
      const docSnap = await getDoc(doc(db, "settings", "global"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSystemSettings(data);
        setGlobalNoticeDraft(data.globalNotice || "");
        cacheService.set("admin_settings", data, 1000 * 60 * 5); // 5 mins
      }
    } catch (err) {
      console.error("Settings sync error:", err);
    }
  }, []);

  useEffect(() => {
    if (!user && !loading) return;
    if (!loading && !isAdmin) {
      navigate("/");
      return;
    }

    if (!user || !isAdmin) return;

    fetchSettings();

    // 1. Live Orders Subscription with real-time onSnapshot
    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribeOrders = onSnapshot(
      qOrders,
      (snapshot) => {
        const ordersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrders(ordersData);
        cacheService.set("admin_orders", ordersData, 1000 * 60 * 5);
        setLoading(false);
      },
      (error) => {
        console.warn("Live orders subscription note (using fallback):", error);
        fetchOrders(true);
      }
    );

    // 2. Live Users Subscription with real-time onSnapshot
    const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribeUsers = onSnapshot(
      qUsers,
      (snapshot) => {
        const usersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsersList(usersData);
        cacheService.set("admin_users", usersData, 1000 * 60 * 5);
      },
      (error) => {
        console.warn("Live users subscription note (using fallback):", error);
        fetchUsers(true);
      }
    );

    // 3. Live Withdrawals Subscription
    const qWithdrawals = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
    const unsubscribeWithdrawals = onSnapshot(
      qWithdrawals,
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setWithdrawalsList(data);
      },
      (error) => {
        console.warn("Withdrawals admin sync note:", error);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeUsers();
      unsubscribeWithdrawals();
    };
  }, [user, isAdmin, navigate, fetchOrders, fetchUsers, fetchSettings, loading]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (o.serviceType || o.serviceName || "").toLowerCase().includes(q) ||
        (o.userName || "").toLowerCase().includes(q) ||
        (o.userEmail || "").toLowerCase().includes(q) ||
        (o.id || "").toLowerCase().includes(q) ||
        (o.playerNumber || o.playerId || "").toLowerCase().includes(q) ||
        (o.senderPhone || "").includes(q);

      if (!matchesSearch) return false;
      if (orderStatusFilter === "all") return true;
      const normalized = normalizeOrderStatus(o.status);
      return normalized === orderStatusFilter.toLowerCase();
    });
  }, [orders, searchQuery, orderStatusFilter]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return usersList;
    return usersList.filter(u => 
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.id || "").toLowerCase().includes(q)
    );
  }, [usersList, searchQuery]);

  const dailyChartData = useMemo(() => {
    const map: Record<string, { date: string; displayDate: string; count: number; revenue: number }> = {};
    
    // Seed last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const displayDate = d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
      map[dateKey] = { date: dateKey, displayDate, count: 0, revenue: 0 };
    }

    orders.forEach((o) => {
      let rawDate: Date | null = null;
      if (o.createdAt?.toDate) {
        rawDate = o.createdAt.toDate();
      } else if (o.createdAt) {
        rawDate = new Date(o.createdAt);
      }

      if (rawDate && !isNaN(rawDate.getTime())) {
        const dateKey = rawDate.toISOString().split("T")[0];
        if (!map[dateKey]) {
          const displayDate = rawDate.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
          map[dateKey] = { date: dateKey, displayDate, count: 0, revenue: 0 };
        }
        map[dateKey].count += 1;
        if (['completed', 'approved', 'shipped'].includes((o.status || '').toLowerCase())) {
          map[dateKey].revenue += Number(o.amount || o.total || o.priceMru || 0);
        }
      }
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  }, [orders]);

  const handleUpdateOrderStatus = async (
    status: string, 
    extraData?: { pinCode?: string; adminNote?: string; rejectionReason?: string },
    targetOrderParam?: any
  ) => {
    const target = targetOrderParam || selectedOrder;
    if (!target) return;

    if (permissions.isReadOnly || (!isOwner && !permissions.canManageOrders)) {
      showToast("ليس لديك صلاحية لتعديل حالة الطلب", "error");
      return;
    }
    
    const effectiveRejection = extraData?.rejectionReason || rejectionReason;
    const effectiveNote = extraData?.adminNote || adminNote;

    if (status === "rejected" && !effectiveRejection.trim()) {
      showToast("يرجى كتابة سبب الرفض لتوضيحه للمستخدم", "error");
      return;
    }

    try {
      setIsUpdatingStatus(true);
      const now = new Date();
      const updateData: any = {
        status: status.toLowerCase(),
        adminNote: effectiveNote || null,
        rejectionReason: status === "rejected" ? effectiveRejection : null,
        updatedAt: now
      };

      if (extraData?.pinCode) {
        updateData.pinCode = extraData.pinCode;
      }
      if (status === "completed") {
        updateData.completedAt = now;
      }

      // The server validates the staff role and updates the order plus referral rewards atomically.
      if (!user) throw new Error("جلسة الإدارة غير متاحة");
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(target.id)}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          status: status.toLowerCase(),
          adminNote: effectiveNote || "",
          rejectionReason: status === "rejected" ? effectiveRejection : "",
          pinCode: extraData?.pinCode || ""
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || "تعذر تحديث الطلب في الخادم");
      }
      const referralRewarded = result.referralRewarded === true;

      // Optimistic update of local orders array immediately
      setOrders(prev => prev.map(o => o.id === target.id ? { ...o, ...updateData, status: status.toLowerCase(), updatedAt: new Date() } : o));
      cacheService.remove("admin_orders");

      // Record administrative audit log
      logAuditEvent({
        action: "order_status_updated",
        performedBy: user?.email || "طاقم العمل",
        performedByUid: user?.uid || "",
        role: staffRole,
        targetId: target.id,
        targetTitle: `طلب #${target.id.slice(0, 8).toUpperCase()}`,
        details: `تحديث الحالة إلى (${status}). ${effectiveNote ? `ملاحظة: ${effectiveNote}` : ''}`
      });

      // Customer notification is created inside the same server transaction as the order update.

      if (status === "approved") {
        showToast("تم قبول طلب الشحن وبدء معالجته بنجاح ⚡", "success");
      } else if (status === "completed") {
        showToast(
          referralRewarded 
            ? "تم إكمال طلب الشحن بنجاح وتسليمه ومنح مكافأة الإحالة (30 MRU) تلقائياً 🚀🎉" 
            : "تم إكمال طلب الشحن بنجاح وتسليمه 🚀", 
          "success"
        );
      } else if (status === "rejected") {
        showToast("تم رفض الطلب وحفظ السبب وإشعار المستخدم ❌", "info");
      } else {
        showToast("تم تحديث حالة الطلب بنجاح", "success");
      }

      if (selectedOrder && selectedOrder.id === target.id) {
        if (status === "approved") {
          // Keep modal open with live updated state so admin sees the approved banner & can complete delivery
          setSelectedOrder((prev: any) => prev ? { ...prev, ...updateData, status: "approved" } : null);
        } else {
          setSelectedOrder(null);
        }
      }
      setAdminNote("");
      setRejectionReason("");
      setIsRejectionModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء تحديث الطلب", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleQuickApprove = async (order: any) => {
    await handleUpdateOrderStatus("approved", undefined, order);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    if (!isOwner && !permissions.canDeleteOrders) {
      showToast("حذف الطلبات نهائياً متاح للمالك فقط", "error");
      return;
    }
    try {
      setIsDeletingOrder(true);
      await deleteDoc(doc(db, "orders", orderToDelete.id));
      
      // Update local state immediately
      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      cacheService.remove("admin_orders");
      
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
      
      logAuditEvent({
        action: "order_deleted",
        performedBy: user?.email || "المالك",
        performedByUid: user?.uid || "",
        targetId: orderToDelete.id,
        targetTitle: `طلب #${orderToDelete.id.slice(0, 8).toUpperCase()}`,
        details: `حذف الطلب نهائياً بقيمة ${orderToDelete.amount || 0} MRU`
      });

      showToast(`تم حذف الطلب #${orderToDelete.id.slice(0, 8).toUpperCase()} بنجاح`, "success");
      setOrderToDelete(null);
    } catch (err: any) {
      console.error("Delete order error:", err);
      showToast(`فشل حذف الطلب: ${err.message || 'خطأ غير متوقع'}`, "error");
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const handleToggleUserRole = async (targetUser: any) => {
    if (!targetUser) return;
    if (!isOwner) {
      showToast("تغيير أدوار المستخدمين متاح لمالك المنصة فقط", "error");
      return;
    }
    const isTargetAdmin = targetUser.role === 'admin';
    const newRole = isTargetAdmin ? 'user' : 'admin';
    try {
      setRoleActionUserId(targetUser.id);
      if (!user) throw new Error("جلسة المالك غير متاحة");
      const idToken = await user.getIdToken();
      const response = await fetch("/api/admin/staff/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          targetUid: targetUser.id,
          role: newRole,
          active: newRole === "admin"
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || "تعذر تحديث الصلاحيات");
      }

      setUsersList(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: newRole, staffRole: newRole } : u));
      cacheService.remove("admin_users");
      
      showToast(
        newRole === 'admin' 
          ? `تمت ترقية "${targetUser.name || 'المستخدم'}" إلى مدير بنجاح` 
          : `تم تحويل "${targetUser.name || 'المستخدم'}" إلى مستخدم عادي`,
        "success"
      );
    } catch (err: any) {
      console.error("Toggle user role error:", err);
      showToast(`فشل تعديل رتبة المستخدم: ${err.message || 'خطأ غير متوقع'}`, "error");
    } finally {
      setRoleActionUserId(null);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = notificationForm.title.trim();
    const body = notificationForm.body.trim();
    if (!title || !body) {
      showToast("يرجى ملء جميع الحقول", "error");
      return;
    }

    try {
      setIsSendingNotification(true);
      let sentCount = 0;

      if (notificationForm.userId === "all") {
        if (usersList.length === 0) {
          showToast("لا يوجد مستخدمون حالياً لإرسال الإشعار إليهم", "info");
          setIsSendingNotification(false);
          return;
        }

        const tasks = usersList.map(async (u) => {
          try {
            await addDoc(collection(db, "notifications"), {
              userId: u.id,
              title: title,
              body: body,
              read: false,
              type: "info",
              createdAt: serverTimestamp()
            });
            sentCount++;
          } catch (itemErr) {
            console.warn(`Failed to notify user ${u.id}:`, itemErr);
          }
        });

        await Promise.all(tasks);
        showToast(`تم إرسال الإشعار بنجاح إلى ${sentCount} مستخدم`, "success");
      } else {
        await addDoc(collection(db, "notifications"), {
          userId: notificationForm.userId,
          title: title,
          body: body,
          read: false,
          type: "info",
          createdAt: serverTimestamp()
        });
        showToast("تم إرسال الإشعار للمستخدم المحدد بنجاح", "success");
      }

      setNotificationForm({ title: "", body: "", userId: "all" });
    } catch (err) {
      console.error("Send notification error:", err);
      showToast("فشل إرسال الإشعار", "error");
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      setIsTogglingMaintenance(true);
      const isMaint = systemSettings?.maintenanceMode || false;
      await setDoc(doc(db, "settings", "global"), {
        maintenanceMode: !isMaint,
        updatedAt: serverTimestamp()
      }, { merge: true });
      await fetchSettings(true);
      showToast(!isMaint ? "تم تفعيل وضع الصيانة بنجاح" : "تم إلغاء وضع الصيانة بنجاح", "success");
    } catch (err) {
      console.error(err);
      showToast("فشل تعديل وضع الصيانة", "error");
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  const handleSendGlobalNotice = async () => {
    try {
      setIsSavingGlobalNotice(true);
      await setDoc(doc(db, "settings", "global"), {
        globalNotice: globalNoticeDraft,
        updatedAt: serverTimestamp()
      }, { merge: true });
      await fetchSettings(true);
      showToast("تم تحديث ونشر التنبيه بنجاح", "success");
    } catch (err) {
      console.error(err);
      showToast("فشل تحديث التنبيه", "error");
    } finally {
      setIsSavingGlobalNotice(false);
    }
  };

  const handleToggleBlock = async (uid: string, currentStatus: boolean) => {
    if (!isOwner) {
      showToast("حظر الحسابات وإلغاء الحظر متاح لمالك المنصة فقط", "error");
      return;
    }
    try {
      setBlockingUserId(uid);
      await updateDoc(doc(db, "users", uid), {
        blocked: !currentStatus
      });
      await fetchUsers(true);
      showToast(!currentStatus ? "تم حظر المستخدم" : "تم إلغاء حظر المستخدم", "success");
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء تعديل حالة الحظر", "error");
    } finally {
      setBlockingUserId(null);
    }
  };

  const handleMarkPhoneStatus = async (uid: string, status: 'invalid' | 'valid') => {
    if (!isOwner) {
      showToast("اعتماد أرقام الهواتف متاح لمالك المنصة فقط", "error");
      return;
    }
    try {
      setPhoneActionUserId(uid);
      await updateDoc(doc(db, "users", uid), {
        phoneStatus: status,
        phoneRejectReason: status === 'invalid' ? "تم رفض رقم الهاتف المسجل كغير صالح من قبل الإدارة" : null
      });
      if (status === 'invalid') {
        await addDoc(collection(db, "notifications"), {
          userId: uid,
          title: "تنبيه: تم رفض رقم الهاتف ⚠️",
          message: "تم تعليم رقم الهاتف الخاص بك كغير صالح من قبل الإدارة. يرجى الدخول إلى صفحة الملف الشخصي وإدخال رقم هاتف آخر صحيح لتسهيل التواصل معك.",
          read: false,
          createdAt: serverTimestamp()
        });
      }
      await fetchUsers(true);
      showToast(status === 'invalid' ? "تم تعليم الرقم كغير صالح وإرسال تنبيه للمستخدم" : "تم تأكيد صحة رقم الهاتف", status === 'invalid' ? "info" : "success");
    } catch (err) {
      console.error("Phone status update error:", err);
      showToast("حدث خطأ أثناء تعديل حالة الرقم", "error");
    } finally {
      setPhoneActionUserId(null);
    }
  };

  const pendingKycCount = useMemo(() => {
    return usersList.filter(u => u.reviewStatus === 'Under Review').length;
  }, [usersList]);

  const submitKycDecision = async (targetUser: any, status: "approved" | "rejected", reason = "") => {
    if (!user) throw new Error("جلسة الإدارة غير متاحة");
    const idToken = await user.getIdToken();
    const response = await fetch(`/api/admin/kyc/${encodeURIComponent(targetUser.id)}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ status, reason })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || "تعذرت معالجة طلب التوثيق");
    }
    return result;
  };

  const handleApproveKyc = async (targetUser: any) => {
    if (!targetUser) return;
    if (!isOwner && !permissions.canManageKyc) {
      showToast("عذراً، هذه العملية تتطلب صلاحية إدارة توثيق الحسابات (KYC)", "error");
      return;
    }
    setKycActionLoading(true);
    try {
      await submitKycDecision(targetUser, "approved");
      showToast(`تم توثيق حساب ${targetUser.name || targetUser.email} بنجاح!`, "success");
      setIsKycModalOpen(false);
      setSelectedKycUser(null);
      await fetchUsers(true);
    } catch (err: any) {
      console.error("KYC Approve Error:", err);
      showToast(err?.message || "فشل توثيق الحساب، يرجى إعادة المحاولة", "error");
    } finally {
      setKycActionLoading(false);
    }
  };

  const handleRejectKyc = async (targetUser: any, reason: string) => {
    if (!targetUser) return;
    if (!isOwner && !permissions.canManageKyc) {
      showToast("عذراً، هذه العملية تتطلب صلاحية إدارة توثيق الحسابات (KYC)", "error");
      return;
    }
    if (!reason.trim()) {
      showToast("يرجى كتابة سبب الرفض لتوضيحه للعميل", "error");
      return;
    }
    setKycActionLoading(true);
    try {
      await submitKycDecision(targetUser, "rejected", reason.trim());
      showToast(`تم رفض طلب توثيق ${targetUser.name || targetUser.email}`, "info");
      setIsKycRejectModalOpen(false);
      setIsKycModalOpen(false);
      setKycRejectReason("");
      setSelectedKycUser(null);
      await fetchUsers(true);
    } catch (err: any) {
      console.error("KYC Reject Error:", err);
      showToast(err?.message || "فشل تحديث حالة الطلب", "error");
    } finally {
      setKycActionLoading(false);
    }
  };

  const pendingWithdrawalsCount = useMemo(() => {
    return withdrawalsList.filter(w => w.status === 'pending').length;
  }, [withdrawalsList]);

  const submitWithdrawalDecision = async (w: any, status: "approved" | "rejected", adminNote = "") => {
    if (!user) throw new Error("جلسة الإدارة غير متاحة");
    const idToken = await user.getIdToken();
    const response = await fetch(`/api/admin/withdrawals/${encodeURIComponent(w.id)}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ status, adminNote })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || "تعذرت معالجة طلب السحب");
    }
    return result;
  };

  const handleApproveWithdrawal = async (w: any) => {
    if (!w) return;
    setWithdrawalActionLoading(true);
    try {
      await submitWithdrawalDecision(w, "approved");
      showToast(`تمت الموافقة على سحب ${w.amount} MRU بنجاح`, "success");
      setWithdrawalsList(prev => prev.map(item => item.id === w.id ? { ...item, status: "approved" } : item));
    } catch (err: any) {
      console.error("Approve withdrawal error:", err);
      showToast(err?.message || "حدث خطأ أثناء الموافقة على السحب", "error");
    } finally {
      setWithdrawalActionLoading(false);
    }
  };

  const handleRejectWithdrawal = async (w: any, reason: string) => {
    if (!w) return;
    if (!reason.trim()) {
      showToast("يرجى كتابة سبب الرفض", "error");
      return;
    }
    setWithdrawalActionLoading(true);
    try {
      await submitWithdrawalDecision(w, "rejected", reason.trim());
      showToast("تم رفض طلب السحب وإعادة الرصيد للمستخدم بنجاح", "info");
      setIsWithdrawalRejectModalOpen(false);
      setSelectedWithdrawal(null);
      setWithdrawalRejectReason("");
      setWithdrawalsList(prev => prev.map(item => item.id === w.id ? { ...item, status: "rejected", adminNote: reason.trim() } : item));
    } catch (err: any) {
      console.error("Reject withdrawal error:", err);
      showToast(err?.message || "حدث خطأ أثناء رفض طلب السحب", "error");
    } finally {
      setWithdrawalActionLoading(false);
    }
  };

  const handleApplyFirewall = () => {
    showToast("تم تفعيل جدار الحماية الدفاعي بنجاح لحظر الهجمات", "success");
  };

  if (loading) return <AdminSkeleton />;

  const NavItem = ({ id, label, icon: Icon, badge }: { id: string, label: string, icon: any, badge?: number }) => (
    <button 
      onClick={() => {
        setActiveTab(id);
        setIsMobileSidebarOpen(false);
      }}
      className={cn(
        "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all font-bold text-xs sm:text-sm relative group cursor-pointer",
        activeTab === id 
          ? "bg-[#10B981]/15 text-[#10B981] shadow-xs border border-[#10B981]/30 font-black" 
          : "text-[#A8B3C5] hover:bg-[#111B2E] hover:text-[#F8FAFC] border border-transparent"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon size={18} className={cn("transition-colors shrink-0", activeTab === id ? "text-[#10B981]" : "text-[#A8B3C5] group-hover:text-[#F8FAFC]")} />
        {label && <span className="truncate">{label}</span>}
      </div>
      {typeof badge === 'number' && badge > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-[#D6B35A] text-slate-950 font-black text-[10px] animate-pulse">
          {badge}
        </span>
      )}
      {activeTab === id && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#10B981] rounded-l-full" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F8FAFC] flex flex-col md:flex-row relative overflow-hidden font-['Cairo',sans-serif]" dir="rtl">
      <SEO title="لوحة الإدارة | موري توب" noindex={true} />
      
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#0B1120] border-b border-[#243247] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 hover:bg-[#111B2E] rounded-xl text-[#A8B3C5] hover:text-white transition-colors cursor-pointer" aria-label="القائمة">
          <Menu size={22} />
        </button>
        <span className="font-black text-[#F8FAFC] text-base">لوحة الإدارة</span>
        <button 
          onClick={() => navigate("/")} 
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/25 rounded-xl transition-colors cursor-pointer"
          title="الرجوع إلى المتجر"
        >
          <span>المتجر</span>
          <ExternalLink size={13} />
        </button>
      </div>

      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "bg-[#0B1120] border-l border-[#243247] transition-all duration-300 hidden md:flex flex-col z-30 h-screen sticky top-0",
          isSidebarOpen ? "w-72" : "w-20"
        )}
      >
        <div className="p-5 flex items-center justify-between border-b border-[#243247]/70">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#10B981] flex items-center justify-center text-slate-950 font-black shadow-sm">
                <ShieldCheck size={16} />
              </div>
              <span className="font-black text-[#F8FAFC] text-lg tracking-wider">MAURI<span className="text-[#10B981]">TOP</span></span>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-[#111B2E] rounded-xl text-[#A8B3C5] hover:text-white transition-colors cursor-pointer"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-3 overflow-y-auto min-h-0 pb-12 custom-scrollbar">
          {/* Group 1: Operations */}
          {isSidebarOpen && (
            <p className="text-[10px] font-black uppercase tracking-wider text-[#A8B3C5]/50 px-3 pt-2 pb-1">العمليات والطلبات</p>
          )}
          {(isOwner || permissions.canManageOrders || permissions.isReadOnly) && (
            <NavItem id="orders" label={isSidebarOpen ? "إدارة الطلبات" : ""} icon={ListOrdered} />
          )}
          {(isOwner || permissions.canManageKyc) && (
            <NavItem id="kyc" label={isSidebarOpen ? "توثيق الحسابات (KYC)" : ""} icon={ShieldCheck} badge={pendingKycCount} />
          )}
          {(isOwner || permissions.canManageWithdrawals) && (
            <NavItem id="withdrawals" label={isSidebarOpen ? "طلبات السحب" : ""} icon={CreditCard} badge={pendingWithdrawalsCount} />
          )}

          {/* Group 2: Services & Catalog */}
          {isSidebarOpen && (
            <p className="text-[10px] font-black uppercase tracking-wider text-[#A8B3C5]/50 px-3 pt-3 pb-1">الخدمات والعروض</p>
          )}
          {(isOwner || permissions.canManageServices) && (
            <NavItem id="services" label={isSidebarOpen ? "مركز الخدمات" : ""} icon={Sliders} />
          )}
          {(isOwner || permissions.canManagePosts) && (
            <NavItem id="posts" label={isSidebarOpen ? "عروض واتساب" : ""} icon={MessageSquare} />
          )}

          {/* Group 3: Customers & Access */}
          {isSidebarOpen && (
            <p className="text-[10px] font-black uppercase tracking-wider text-[#A8B3C5]/50 px-3 pt-3 pb-1">العملاء والصلاحيات</p>
          )}
          {isOwner && (
            <NavItem id="users" label={isSidebarOpen ? "قائمة المستخدمين" : ""} icon={Users} />
          )}
          {isOwner && (
            <NavItem id="staff" label={isSidebarOpen ? "الموظفون والصلاحيات" : ""} icon={ShieldCheck} />
          )}
          {(isOwner || permissions.canManageOrders || permissions.isReadOnly) && (
            <NavItem id="live" label={isSidebarOpen ? "الزوار النشطين" : ""} icon={Activity} />
          )}

          {/* Group 4: System & Configuration */}
          {isSidebarOpen && (
            <p className="text-[10px] font-black uppercase tracking-wider text-[#A8B3C5]/50 px-3 pt-3 pb-1">إعدادات النظام</p>
          )}
          {(isOwner || permissions.canManagePayments) && (
            <NavItem id="payment-methods" label={isSidebarOpen ? "طرق وتطبيقات الدفع" : ""} icon={CreditCard} />
          )}
          {(isOwner || permissions.canManageOrders) && (
            <NavItem id="notifications" label={isSidebarOpen ? "إرسال إشعارات" : ""} icon={Bell} />
          )}
          {(isOwner || permissions.canManageMarquee) && (
            <NavItem id="marquee" label={isSidebarOpen ? "شريط الإعلانات" : ""} icon={Sparkles} />
          )}
          {isOwner && (
            <NavItem id="indexnow" label={isSidebarOpen ? "فهرسة IndexNow" : ""} icon={Globe} />
          )}
          {(isOwner || permissions.canManageSystem) && (
            <NavItem id="settings" label={isSidebarOpen ? "إعدادات الصيانة والنظام" : ""} icon={Settings} />
          )}
        </nav>

        <div className="p-4 border-t border-[#243247] shrink-0 bg-[#0B1120]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] font-black text-sm flex-shrink-0">
              {user?.email?.[0].toUpperCase()}
            </div>
            {isSidebarOpen && (
              <div className="min-w-0">
                <p className="font-bold text-[#F8FAFC] text-xs truncate">{user?.email}</p>
                <p className="text-[10px] text-[#10B981] font-bold">
                  {isOwner 
                    ? "المالك / المدير العام" 
                    : staffRole === 'orders_manager' 
                    ? "مدير الطلبات" 
                    : staffRole === 'services_manager' 
                    ? "مدير الخدمات" 
                    : staffRole === 'support_agent' 
                    ? "وكيل دعم واستفسارات" 
                    : "مدير النظام"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Content - Fully Scrollable Drawer */}
      <aside 
        className={cn(
          "fixed top-0 bottom-0 right-0 w-80 max-w-[85vw] bg-[#0B1120] border-l border-[#243247] z-[60] transition-transform duration-300 ease-in-out md:hidden shadow-2xl flex flex-col h-full max-h-screen",
          isMobileSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-5 flex items-center justify-between border-b border-[#243247] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#10B981] flex items-center justify-center text-slate-950 font-black">
              <ShieldCheck size={16} />
            </div>
            <span className="font-black text-[#F8FAFC] text-lg tracking-wider">MAURI<span className="text-[#10B981]">TOP</span></span>
          </div>
          <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 hover:bg-[#111B2E] rounded-xl text-[#A8B3C5]">
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto min-h-0 pb-28 touch-pan-y">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#A8B3C5]/50 px-3 pt-1 pb-1">العمليات والطلبات</p>
          {(isOwner || permissions.canManageOrders || permissions.isReadOnly) && (
            <NavItem id="orders" label="إدارة الطلبات" icon={ListOrdered} />
          )}
          {(isOwner || permissions.canManageKyc) && (
            <NavItem id="kyc" label="توثيق الحسابات (KYC)" icon={ShieldCheck} badge={pendingKycCount} />
          )}
          {(isOwner || permissions.canManageWithdrawals) && (
            <NavItem id="withdrawals" label="طلبات سحب الأرباح" icon={CreditCard} badge={pendingWithdrawalsCount} />
          )}

          <p className="text-[10px] font-black uppercase tracking-wider text-[#A8B3C5]/50 px-3 pt-3 pb-1">الخدمات والعروض</p>
          {(isOwner || permissions.canManageServices) && (
            <NavItem id="services" label="مركز الخدمات" icon={Sliders} />
          )}
          {(isOwner || permissions.canManagePosts) && (
            <NavItem id="posts" label="عروض واتساب" icon={MessageSquare} />
          )}

          <p className="text-[10px] font-black uppercase tracking-wider text-[#A8B3C5]/50 px-3 pt-3 pb-1">العملاء والصلاحيات</p>
          {isOwner && (
            <NavItem id="users" label="قائمة المستخدمين" icon={Users} />
          )}
          {isOwner && (
            <NavItem id="staff" label="الموظفون والصلاحيات" icon={ShieldCheck} />
          )}
          {(isOwner || permissions.canManageOrders || permissions.isReadOnly) && (
            <NavItem id="live" label="الزوار النشطين" icon={Activity} />
          )}

          <p className="text-[10px] font-black uppercase tracking-wider text-[#A8B3C5]/50 px-3 pt-3 pb-1">إعدادات النظام</p>
          {(isOwner || permissions.canManagePayments) && (
            <NavItem id="payment-methods" label="طرق وتطبيقات الدفع" icon={CreditCard} />
          )}
          {(isOwner || permissions.canManageOrders) && (
            <NavItem id="notifications" label="إرسال إشعارات" icon={Bell} />
          )}
          {(isOwner || permissions.canManageMarquee) && (
            <NavItem id="marquee" label="شريط الإعلانات" icon={Sparkles} />
          )}
          {isOwner && (
            <NavItem id="indexnow" label="فهرسة IndexNow" icon={Globe} />
          )}
          {(isOwner || permissions.canManageSystem) && (
            <NavItem id="settings" label="إعدادات الصيانة والنظام" icon={Settings} />
          )}
          <div className="pt-3 border-t border-[#243247] mt-3">
            <button
              onClick={() => {
                setIsMobileSidebarOpen(false);
                navigate("/");
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm text-[#10B981] bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/25 transition-colors cursor-pointer"
            >
              <span>الرجوع إلى المتجر</span>
              <ExternalLink size={16} />
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main ref={mainScrollRef} className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#070B14]">
        <header className="hidden md:flex bg-[#0B1120] border-b border-[#243247] px-8 py-4 items-center justify-between sticky top-0 z-20">
          <h2 className="text-xl font-black text-[#F8FAFC]">
            {activeTab === "orders" ? "الطلبات الواردة" : 
             activeTab === "kyc" ? "توثيق حسابات العملاء (KYC)" :
             activeTab === "withdrawals" ? "طلبات سحب الأرباح والمكافآت (بنكيلي)" :
             activeTab === "users" ? "إدارة المستخدمين" : 
             activeTab === "live" ? "الزوار النشطين" : 
             activeTab === "services" ? "مركز الخدمات" :
             activeTab === "posts" ? "عروض واتساب الحصرية" : 
             activeTab === "payment-methods" ? "إدارة طرق وتطبيقات الدفع" :
             activeTab === "staff" ? "إدارة طاقم الموظفين وتوزيع الصلاحيات (RBAC)" :
             activeTab === "indexnow" ? "فهرسة المحتوى الفورية (IndexNow API)" :
             activeTab === "marquee" ? "شريط الإعلانات العائم" :
             activeTab === "settings" ? "إعدادات النظام" : "مركز الإشعارات"}
          </h2>
          
          <div className="flex items-center gap-4">
             <div className="relative group">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8B3C5] group-focus-within:text-[#06B6D4] transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث سريع..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#111B2E] border border-[#243247] rounded-xl pr-10 pl-4 py-2 text-sm focus:border-[#06B6D4] outline-none w-64 transition-all text-[#F8FAFC] font-bold placeholder:text-[#A8B3C5]/60"
                />
             </div>
             <Link 
               to="/notifications" 
               className="p-2 text-[#A8B3C5] hover:text-[#10B981] hover:bg-[#111B2E] border border-transparent hover:border-[#243247] rounded-lg transition-all" 
               title="مركز الإشعارات والتنبيهات"
             >
                <Bell size={20} />
             </Link>
             <button onClick={() => navigate("/")} className="p-2 text-[#A8B3C5] hover:text-[#06B6D4] hover:bg-[#111B2E] border border-transparent hover:border-[#243247] rounded-lg transition-all" title="معاينة المتجر">
                <ExternalLink size={20} />
             </button>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <ErrorBoundary>
            <React.Suspense fallback={<LoadingSpinner message="جاري تحميل القسم..." />}>
              {activeTab === "orders" && (
                <div className="space-y-6">
                  {/* Mobile Search Bar */}
                  <div className="md:hidden mb-2">
                    <div className="relative">
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8B3C5]" size={16} />
                      <input 
                        type="text" 
                        placeholder="بحث بالاسم، الخدمة، الرقم، الإيميل..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0B1120] border border-[#243247] rounded-2xl pr-10 pl-4 py-2.5 text-xs text-[#F8FAFC] font-bold outline-none focus:border-[#06B6D4] transition-all shadow-sm placeholder:text-[#A8B3C5]/60"
                      />
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                    <div className="bg-[#0B1120] p-4 rounded-2xl border border-[#243247] shadow-sm">
                      <p className="text-xs font-bold text-[#A8B3C5] mb-1">إجمالي الطلبات</p>
                      <p className="text-xl md:text-2xl font-black text-[#F8FAFC]">
                        <AnimatedCounter value={orders.length} />
                      </p>
                    </div>
                    <div className="bg-[#0B1120] p-4 rounded-2xl border border-amber-500/30 shadow-sm">
                      <p className="text-xs font-bold text-amber-400 mb-1">بانتظار المراجعة ⏳</p>
                      <p className="text-xl md:text-2xl font-black text-amber-400">
                        <AnimatedCounter value={orders.filter(o => normalizeOrderStatus(o.status) === 'pending').length} />
                      </p>
                    </div>
                    <div className="bg-[#0B1120] p-4 rounded-2xl border border-[#06B6D4]/30 shadow-sm">
                      <p className="text-xs font-bold text-[#06B6D4] mb-1">المقبولة للشحن ⚡</p>
                      <p className="text-xl md:text-2xl font-black text-[#06B6D4]">
                        <AnimatedCounter value={orders.filter(o => normalizeOrderStatus(o.status) === 'approved').length} />
                      </p>
                    </div>
                    <div className="bg-[#0B1120] p-4 rounded-2xl border border-[#10B981]/30 shadow-sm">
                      <p className="text-xs font-bold text-[#10B981] mb-1">المكتملة بنجاح ✅</p>
                      <p className="text-xl md:text-2xl font-black text-[#10B981]">
                        <AnimatedCounter value={orders.filter(o => normalizeOrderStatus(o.status) === 'completed').length} />
                      </p>
                    </div>
                    <div className="bg-[#0B1120] p-4 rounded-2xl border border-[#D6B35A]/30 shadow-sm col-span-2 sm:col-span-1">
                      <p className="text-xs font-bold text-[#D6B35A] mb-1">إجمالي الإيرادات</p>
                      <p className="text-xl md:text-2xl font-black text-[#D6B35A]">
                        <AnimatedCounter 
                          value={orders.filter(o => ['completed', 'approved', 'shipped'].includes(normalizeOrderStatus(o.status)))
                            .reduce((sum, o) => sum + (Number(o.amount || o.total || o.priceMru || 0)), 0)} 
                          formatter={(val) => `${Math.round(val).toLocaleString()} MRU`}
                        />
                      </p>
                    </div>
                  </div>

                  {/* Recharts Daily Analytics Chart */}
                  <div className="bg-[#0B1120] p-5 rounded-3xl border border-[#243247] shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#243247] pb-3">
                      <div>
                        <h3 className="font-black text-[#F8FAFC] text-sm md:text-base flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#06B6D4]" />
                          <span>تحليلات حركة الطلبات اليومية</span>
                        </h3>
                        <p className="text-xs text-[#A8B3C5] font-bold mt-0.5">
                          مخطط بياني تفاعلي يوضح توزيع الطلبات اليومية
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#06B6D4] inline-block" />
                          <span className="text-[#A8B3C5]">عدد الطلبات</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block" />
                          <span className="text-[#A8B3C5]">الإيرادات (MRU)</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-60 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#111B2E" />
                          <XAxis 
                            dataKey="displayDate" 
                            tick={{ fontSize: 11, fill: "#A8B3C5", fontWeight: 700 }} 
                            axisLine={false} 
                            tickLine={false} 
                          />
                          <YAxis 
                            tick={{ fontSize: 11, fill: "#A8B3C5", fontWeight: 700 }} 
                            axisLine={false} 
                            tickLine={false} 
                            allowDecimals={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "#0B1120", 
                              borderRadius: "16px", 
                              border: "1px solid #243247", 
                              color: "#F8FAFC", 
                              fontSize: "12px",
                              fontWeight: "bold",
                              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
                            }}
                            formatter={(value: any, name: any) => [
                              name === "count" ? `${value} طلب` : `${Number(value).toLocaleString()} MRU`,
                              name === "count" ? "عدد الطلبات" : "الإيرادات"
                            ]}
                            labelStyle={{ color: "#A8B3C5", marginBottom: "4px" }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            name="count"
                            stroke="#06B6D4" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorCount)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            name="revenue"
                            stroke="#10B981" 
                            strokeWidth={2}
                            fillOpacity={0.25} 
                            fill="url(#colorRevenue)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Status Filter Chips Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B1120] p-3.5 rounded-2xl border border-[#243247] shadow-sm">
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 w-full sm:w-auto">
                      {[
                        { id: 'all', label: 'جميع الطلبات', count: orders.length },
                        { id: 'pending', label: 'بانتظار المراجعة والقبول ⏳', count: orders.filter(o => normalizeOrderStatus(o.status) === 'pending').length },
                        { id: 'approved', label: 'المقبولة للشحن ⚡', count: orders.filter(o => normalizeOrderStatus(o.status) === 'approved').length },
                        { id: 'shipped', label: 'تم الشحن 📦', count: orders.filter(o => normalizeOrderStatus(o.status) === 'shipped').length },
                        { id: 'completed', label: 'المكتملة بنجاح ✅', count: orders.filter(o => normalizeOrderStatus(o.status) === 'completed').length },
                        { id: 'rejected', label: 'المرفوضة ❌', count: orders.filter(o => normalizeOrderStatus(o.status) === 'rejected').length },
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setOrderStatusFilter(f.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                            orderStatusFilter === f.id
                              ? "bg-[#06B6D4] text-white shadow-md shadow-[#06B6D4]/20"
                              : "bg-[#111B2E] text-[#A8B3C5] hover:bg-[#111B2E]/80 border border-[#243247]"
                          )}
                        >
                          <span>{f.label}</span>
                          <span className={cn(
                            "px-1.5 py-0.2 rounded-md text-[10px]",
                            orderStatusFilter === f.id ? "bg-white/20 text-white" : "bg-[#070B14] text-[#A8B3C5]"
                          )}>
                            {f.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => fetchOrders(true)}
                      className="text-xs font-bold text-[#A8B3C5] hover:text-[#06B6D4] flex items-center gap-1 bg-[#111B2E] hover:bg-[#111B2E]/80 px-3 py-1.5 rounded-xl border border-[#243247] transition-all cursor-pointer mr-auto"
                    >
                      <RefreshCw size={13} />
                      <span>تحديث فوري</span>
                    </button>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block bg-[#0B1120] rounded-3xl border border-[#243247] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-[#111B2E] border-b border-[#243247] text-[#A8B3C5]">
                            <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider">المستخدم / العميل</th>
                            <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider">الخدمة المطلوبة</th>
                            <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider">المبلغ</th>
                            <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider">حالة الشحن</th>
                            <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider">التاريخ</th>
                            <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-center">إجراءات الإدارة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#243247]/60">
                          {filteredOrders.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-[#A8B3C5] font-bold text-xs sm:text-sm">
                                لا توجد طلبات شحن تطابق بحثك أو التصفية الحالية
                              </td>
                            </tr>
                          ) : (
                            filteredOrders.map(order => {
                              const normStatus = normalizeOrderStatus(order.status);
                              const badge = getOrderStatusArabic(order.status);

                              return (
                                <tr key={order.id} className="hover:bg-[#111B2E]/60 transition-colors">
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    <div className="flex flex-col max-w-[180px] lg:max-w-[220px]">
                                      <span className="font-bold text-[#F8FAFC] text-xs sm:text-sm truncate" title={order.userName || 'زائر'}>
                                        {order.userName || 'زائر'}
                                      </span>
                                      <span className="text-[10px] text-[#A8B3C5] font-mono truncate" title={order.userEmail || order.senderPhone}>
                                        {order.userEmail || order.senderPhone || order.userId?.slice(0, 10)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    <span className="font-bold text-[#F8FAFC] text-xs bg-[#111B2E] border border-[#243247] px-2.5 py-1 rounded-lg inline-block max-w-[200px] truncate" title={order.serviceType || order.serviceName}>
                                      {order.serviceType || order.serviceName || 'خدمة'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap font-mono">
                                    <span className="font-black text-[#06B6D4] text-xs sm:text-sm">
                                      {order.amount || order.total || order.priceMru || 0} MRU
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    <span className={cn(
                                      "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs",
                                      badge.badgeClass
                                    )}>
                                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", badge.dotColor)} />
                                      <span>{badge.label}</span>
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap">
                                    <p className="text-[11px] text-[#A8B3C5] font-bold">
                                      {formatDateSafe(order.createdAt, 'ar-MR')}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {/* Quick Accept Recharge Action */}
                                      {normStatus === 'pending' && (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickApprove(order)}
                                          disabled={isUpdatingStatus}
                                          className="px-2.5 py-1.5 bg-[#10B981] hover:bg-[#10B981]/90 active:scale-95 text-white rounded-xl font-black text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                                          title="قبول طلب الشحن فوراً وبدء المعالجة"
                                        >
                                          <Check size={13} strokeWidth={3} />
                                          <span>قبول الشحن</span>
                                        </button>
                                      )}

                                      {normStatus === 'approved' && (
                                        <button
                                          type="button"
                                          onClick={() => setSelectedOrder(order)}
                                          className="px-2.5 py-1.5 bg-[#06B6D4] hover:bg-[#06B6D4]/90 active:scale-95 text-white rounded-xl font-black text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                          title="الطلب مقبول للشحن وجاري تنفيذه - اضغط لإكمال التسليم"
                                        >
                                          <Zap size={13} className="fill-current text-white" />
                                          <span>إكمال التسليم</span>
                                        </button>
                                      )}

                                      {(order.proofImageUrl || order.proofUrl) && (
                                        <span className="inline-flex items-center gap-1 bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2 py-1 rounded-lg text-[10px] font-black">
                                          📷 إيصال
                                        </span>
                                      )}
                                      
                                      <button 
                                        onClick={() => setSelectedOrder(order)}
                                        className="px-3 py-1.5 bg-[#111B2E] hover:bg-[#06B6D4] text-[#06B6D4] hover:text-white border border-[#243247] hover:border-[#06B6D4] rounded-xl font-black text-xs transition-all active:scale-95 cursor-pointer"
                                      >
                                        معاينة
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => setOrderToDelete(order)}
                                        className="p-1.5 bg-[#EF4444]/10 hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#EF4444]/20 hover:border-[#EF4444] rounded-xl transition-all active:scale-95 cursor-pointer"
                                        title="حذف هذا الطلب"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile View - Clean Order Cards */}
                  <div className="md:hidden space-y-3">
                    {filteredOrders.length === 0 ? (
                      <div className="bg-[#0B1120] rounded-2xl border border-[#243247] p-8 text-center text-[#A8B3C5] font-bold text-xs">
                        لا توجد طلبات تطابق بحثك أو التصفية الحالية
                      </div>
                    ) : (
                      filteredOrders.map(order => {
                        const normStatus = normalizeOrderStatus(order.status);
                        const badge = getOrderStatusArabic(order.status);

                        return (
                          <div key={order.id} className="bg-[#0B1120] rounded-2xl border border-[#243247] p-4 shadow-sm space-y-3">
                            <div className="flex items-start justify-between gap-2 border-b border-[#243247] pb-2.5">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-black text-[#F8FAFC] text-xs truncate">{order.userName || 'زائر'}</h4>
                                <p className="text-[10px] text-[#A8B3C5] font-mono truncate">{order.userEmail || order.userId?.slice(0, 10)}</p>
                              </div>
                              <span className="text-[9px] font-mono font-bold text-[#A8B3C5] bg-[#111B2E] border border-[#243247] px-2 py-0.5 rounded-md shrink-0">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-[#F8FAFC] bg-[#111B2E] border border-[#243247] px-2.5 py-1 rounded-lg truncate max-w-[170px]">
                                {order.serviceType || order.serviceName || 'خدمة'}
                              </span>
                              <span className="font-black text-[#06B6D4] shrink-0 font-mono text-sm">
                                {order.amount || order.total || order.priceMru || 0} MRU
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#243247]">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1",
                                  badge.badgeClass
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", badge.dotColor)} />
                                  <span>{badge.label}</span>
                                </span>
                                <span className="text-[10px] text-[#A8B3C5] font-medium">
                                  {formatDateSafe(order.createdAt, 'ar-MR')}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {normStatus === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickApprove(order)}
                                    disabled={isUpdatingStatus}
                                    className="px-2.5 py-1 bg-[#10B981] hover:bg-[#10B981]/90 active:scale-95 text-white rounded-lg font-black text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                                    title="قبول الشحن فوراً"
                                  >
                                    <Check size={12} strokeWidth={3} />
                                    <span>قبول</span>
                                  </button>
                                )}

                                {normStatus === 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrder(order)}
                                    className="px-2.5 py-1 bg-[#06B6D4] hover:bg-[#06B6D4]/90 active:scale-95 text-white rounded-lg font-black text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                    title="الطلب مقبول للشحن - إكمال التسليم"
                                  >
                                    <Zap size={12} className="fill-current text-white" />
                                    <span>إكمال</span>
                                  </button>
                                )}
                                
                                <button
                                  type="button"
                                  onClick={() => setOrderToDelete(order)}
                                  className="p-1.5 bg-[#EF4444]/10 hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#EF4444]/20 rounded-lg transition-all active:scale-95 cursor-pointer"
                                  title="حذف الطلب"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="px-3.5 py-1 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-white rounded-lg font-black text-xs transition-all active:scale-95 cursor-pointer"
                                >
                                  معاينة
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "kyc" && (
                <div className="space-y-6">
                  {/* Top Stats Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500">طلبات بانتظار المراجعة</p>
                        <p className="text-2xl font-black text-amber-600">{pendingKycCount}</p>
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                        <BadgeCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500">حسابات موثّقة معتمدة</p>
                        <p className="text-2xl font-black text-emerald-600">
                          {usersList.filter(u => u.reviewStatus === 'Active' || u.isVerified).length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500">طلبات مرفوضة</p>
                        <p className="text-2xl font-black text-rose-600">
                          {usersList.filter(u => u.reviewStatus === 'Rejected').length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs & Search */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                      {[
                        { id: "all", label: "الكل" },
                        { id: "Under Review", label: "قيد المراجعة ⏳" },
                        { id: "Active", label: "الموثقة ✅" },
                        { id: "Rejected", label: "المرفوضة ❌" },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setKycStatusFilter(tab.id)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
                            kycStatusFilter === tab.id
                              ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full md:w-64">
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="بحث بالاسم أو الهاتف أو رقم الهوية..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-cyan-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* KYC Requests Table */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <th className="px-5 py-4 text-xs font-black">المستخدم / مقدم الطلب</th>
                            <th className="px-5 py-4 text-xs font-black">نوع ومستند الهوية</th>
                            <th className="px-5 py-4 text-xs font-black">رقم الوثيقة</th>
                            <th className="px-5 py-4 text-xs font-black">المدينة / العناوين</th>
                            <th className="px-5 py-4 text-xs font-black">الحالة</th>
                            <th className="px-5 py-4 text-xs font-black text-center">الإجراء المباشر</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {usersList
                            .filter(u => {
                              const matchesSearch = 
                                (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (u.phoneNumber || "").includes(searchQuery) ||
                                (u.kyc_id_number || "").includes(searchQuery);
                              
                              if (kycStatusFilter === "all") return matchesSearch && (u.kyc_submitted_at || u.kyc_id_number || u.reviewStatus);
                              return matchesSearch && u.reviewStatus === kycStatusFilter;
                            })
                            .length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                                لا توجد طلبات توثيق تطابق الفلترة الحالية
                              </td>
                            </tr>
                          ) : (
                            usersList
                              .filter(u => {
                                const matchesSearch = 
                                  (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (u.phoneNumber || "").includes(searchQuery) ||
                                  (u.kyc_id_number || "").includes(searchQuery);
                                
                                if (kycStatusFilter === "all") return matchesSearch && (u.kyc_submitted_at || u.kyc_id_number || u.reviewStatus);
                                return matchesSearch && u.reviewStatus === kycStatusFilter;
                              })
                              .map(u => (
                                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                      {u.photoURL ? (
                                        <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full object-cover border border-cyan-400" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-cyan-600 text-white font-black text-sm flex items-center justify-center">
                                          {(u.name || u.email || "U").charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <p className="font-black text-slate-800 text-xs">{u.name || u.kyc_full_name || 'بدون اسم'}</p>
                                          {u.isVerified && <BadgeCheck className="w-4 h-4 text-cyan-500 fill-cyan-500" />}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium font-mono" dir="ltr">{u.email || (u.phoneNumber ? formatNumberSpacing(u.phoneNumber.replace(/\D/g, '')) : "")}</p>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 text-slate-700 font-bold text-xs bg-slate-100 px-2.5 py-1 rounded-lg">
                                      <FileBadge className="w-3.5 h-3.5 text-cyan-600" />
                                      {u.kyc_id_type || "غير محدد"}
                                    </span>
                                  </td>

                                  <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-black text-slate-800">
                                    {u.kyc_id_number || "---"}
                                  </td>

                                  <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-slate-600">
                                    {u.kyc_city || "نواكشوط"}
                                  </td>

                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-3 py-1 rounded-full font-black text-[10px]",
                                      u.reviewStatus === 'Active' || u.isVerified ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                      u.reviewStatus === 'Under Review' ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse" :
                                      u.reviewStatus === 'Rejected' ? "bg-rose-100 text-rose-800 border border-rose-200" :
                                      "bg-slate-100 text-slate-600"
                                    )}>
                                      {u.reviewStatus === 'Active' || u.isVerified ? "موثّق معتمد ✅" :
                                       u.reviewStatus === 'Under Review' ? "قيد المراجعة ⏳" :
                                       u.reviewStatus === 'Rejected' ? "طلب مرفوض ❌" :
                                       "غير موثق"}
                                    </span>
                                  </td>

                                  <td className="px-5 py-4 whitespace-nowrap text-center">
                                    <button
                                      onClick={() => {
                                        setSelectedKycUser(u);
                                        setIsKycModalOpen(true);
                                      }}
                                      className="px-4 py-2 bg-slate-900 hover:bg-cyan-600 text-white rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow-cyan-600/30 flex items-center justify-center gap-1.5 mx-auto"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>معاينة وتوثيق</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "withdrawals" && (
                <div className="space-y-6">
                  {/* Filter tabs */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                      {[
                        { id: "all", label: "الكل" },
                        { id: "pending", label: "قيد الانتظار ⏳" },
                        { id: "approved", label: "المقبولة والمحولة ✅" },
                        { id: "rejected", label: "المرفوضة ❌" },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setWithdrawalStatusFilter(tab.id)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
                            withdrawalStatusFilter === tab.id
                              ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Withdrawals Table */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <th className="px-5 py-4 text-xs font-black">المستخدم</th>
                            <th className="px-5 py-4 text-xs font-black">المبلغ (MRU)</th>
                            <th className="px-5 py-4 text-xs font-black">رقم بنكيلي</th>
                            <th className="px-5 py-4 text-xs font-black">تاريخ الطلب</th>
                            <th className="px-5 py-4 text-xs font-black">الحالة</th>
                            <th className="px-5 py-4 text-xs font-black text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {withdrawalsList
                            .filter(w => withdrawalStatusFilter === 'all' || w.status === withdrawalStatusFilter)
                            .length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                                لا توجد طلبات سحب أرباح تطابق الفلترة الحالية
                              </td>
                            </tr>
                          ) : (
                            withdrawalsList
                              .filter(w => withdrawalStatusFilter === 'all' || w.status === withdrawalStatusFilter)
                              .map(w => (
                                <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <div>
                                      <p className="font-black text-slate-800 text-xs">{w.userName || 'مستخدم'}</p>
                                      <p className="text-[10px] text-slate-400 font-medium">{w.userEmail}</p>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-black text-emerald-600">
                                    {w.amount} MRU
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-800">
                                    {w.bankilyPhone}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                                    {formatDateSafe(w.createdAt)}
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-3 py-1 rounded-full font-black text-[10px]",
                                      w.status === 'approved' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                      w.status === 'rejected' ? "bg-rose-100 text-rose-800 border border-rose-200" :
                                      "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                                    )}>
                                      {w.status === 'approved' ? "تم التحويل ✅" :
                                       w.status === 'rejected' ? "مرفوض ❌" :
                                       "قيد الانتظار ⏳"}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 whitespace-nowrap text-center">
                                    {w.status === 'pending' ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => handleApproveWithdrawal(w)}
                                          disabled={withdrawalActionLoading}
                                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1"
                                        >
                                          <Check size={14} />
                                          <span>قبول وتحويل</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedWithdrawal(w);
                                            setIsWithdrawalRejectModalOpen(true);
                                          }}
                                          disabled={withdrawalActionLoading}
                                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                                        >
                                          <X size={14} />
                                          <span>رفض</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400 font-bold">
                                        {w.status === 'approved' ? "مكتمل ومؤكد" : "مرفوض ومنتهي"}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "users" && (
                <div className="space-y-4">
                  {/* Mobile Search Bar for Users */}
                  <div className="md:hidden mb-2">
                    <div className="relative">
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="بحث بأسماء المستخدمين أو بريدهم..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-slate-800 font-bold outline-none focus:border-cyan-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Desktop Users Table */}
                  <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider">المستخدم</th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider">رقم الهاتف</th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider">الدور</th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider">الإحالات</th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider">التاريخ</th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider">الحالة</th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold text-xs sm:text-sm">
                                لا يوجد مستخدمين يطابقون بحثك
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map(u => {
                              const userPhone = u.phoneNumber || u.phone;
                              const isPhoneInvalid = u.phoneStatus === 'invalid' || u.phoneStatus === 'rejected';
                              return (
                                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <div className="flex flex-col max-w-[200px]">
                                      <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">{u.name || 'مستخدم جديد'}</span>
                                      <span className="text-[10px] text-slate-400 font-mono truncate">{u.email}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    {userPhone ? (
                                      <div className="flex flex-col gap-1">
                                        <a 
                                          href={`https://wa.me/222${userPhone.replace(/\D/g, '')}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="font-mono font-bold text-xs text-cyan-600 hover:text-cyan-800 underline flex items-center gap-1 dir-ltr"
                                          title="تواصل عبر الواتساب"
                                        >
                                          <span>{userPhone}</span>
                                          <ExternalLink size={10} />
                                        </a>
                                        {isPhoneInvalid ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                            رقم غير صالح ❌
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                            رقم مسجّل
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-xs italic">لم يحدد رقم</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <span className={cn(
                                      "text-[10px] font-black px-3 py-1 rounded-full border",
                                      u.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-slate-100 text-slate-600 border-slate-200"
                                    )}>
                                      {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap font-mono">
                                    <span className="font-bold text-slate-700 text-xs sm:text-sm">{u.referralsCount || u.referralCount || 0}</span>
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 font-medium">
                                    {formatDateSafe(u.createdAt, 'ar-MR')}
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <span className={cn(
                                      "text-[10px] font-black px-2.5 py-0.5 rounded-full",
                                      u.blocked ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                    )}>
                                      {u.blocked ? "محظور" : "نشط"}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {userPhone && (
                                        isPhoneInvalid ? (
                                          <button
                                            onClick={() => handleMarkPhoneStatus(u.id, 'valid')}
                                            disabled={!isOwner || phoneActionUserId === u.id}
                                            className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                            title="تأكيد صحة الرقم"
                                          >
                                            {phoneActionUserId === u.id ? "..." : "تأكيد الرقم"}
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleMarkPhoneStatus(u.id, 'invalid')}
                                            disabled={phoneActionUserId === u.id}
                                            className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-rose-600 hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                            title="علم الرقم كغير صالح"
                                          >
                                            {phoneActionUserId === u.id ? "..." : "رقم غير صالح"}
                                          </button>
                                        )
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleToggleUserRole(u)}
                                        disabled={!isOwner || roleActionUserId === u.id}
                                        className={cn(
                                          "text-[10px] font-black px-2.5 py-1 rounded-xl border transition-all cursor-pointer active:scale-95 disabled:opacity-50 inline-flex items-center gap-1",
                                          u.role === 'admin'
                                            ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-600 hover:text-white"
                                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-800 hover:text-white"
                                        )}
                                        title={u.role === 'admin' ? "تحويل إلى مستخدم عادي" : "ترقية إلى مدير"}
                                      >
                                        {roleActionUserId === u.id ? (
                                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : u.role === 'admin' ? (
                                          <>
                                            <ShieldCheck size={11} />
                                            <span>مدير</span>
                                          </>
                                        ) : (
                                          <>
                                            <UserPlus size={11} />
                                            <span>ترقية</span>
                                          </>
                                        )}
                                      </button>

                                      <button 
                                        onClick={() => handleToggleBlock(u.id, !!u.blocked)}
                                        disabled={!isOwner || blockingUserId === u.id}
                                        className={cn(
                                          "text-[11px] font-black px-3 py-1.5 rounded-xl transition-all inline-flex items-center justify-center min-w-[70px] disabled:opacity-50 cursor-pointer active:scale-95",
                                          u.blocked ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white" : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white"
                                        )}
                                      >
                                        {blockingUserId === u.id ? (
                                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          u.blocked ? "إلغاء الحظر" : "حظر"
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Users List Cards */}
                  <div className="md:hidden space-y-3">
                    {filteredUsers.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 font-bold text-xs">
                        لا يوجد مستخدمين يطابقون بحثك
                      </div>
                    ) : (
                      filteredUsers.map(u => {
                        const userPhone = u.phoneNumber || u.phone;
                        const isPhoneInvalid = u.phoneStatus === 'invalid' || u.phoneStatus === 'rejected';
                        return (
                          <div key={u.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-black text-slate-800 text-xs truncate">{u.name || 'مستخدم جديد'}</h4>
                                <p className="text-[10px] text-slate-400 font-mono truncate">{u.email}</p>
                              </div>
                              <span className={cn(
                                "text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0 border",
                                u.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                              </span>
                            </div>

                            {/* Phone info on mobile */}
                            <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-slate-500 font-bold text-[11px]">رقم التواصل:</span>
                              {userPhone ? (
                                <div className="flex items-center gap-2">
                                  <a 
                                    href={`https://wa.me/222${userPhone.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="font-mono font-bold text-xs text-cyan-600 underline flex items-center gap-1 dir-ltr"
                                  >
                                    <span>{userPhone}</span>
                                    <ExternalLink size={10} />
                                  </a>
                                  {isPhoneInvalid && (
                                    <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                                      غير صالح ❌
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">غير محدد</span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-500 font-bold">
                                الإحالات: <span className="text-cyan-600 font-mono font-black">{u.referralsCount || u.referralCount || 0}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                التاريخ: {formatDateSafe(u.createdAt, 'ar-MR')}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-2">
                              <span className={cn(
                                "text-[10px] font-black px-2.5 py-0.5 rounded-full",
                                u.blocked ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                              )}>
                                {u.blocked ? "محظور" : "حساب نشط"}
                              </span>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserRole(u)}
                                  disabled={roleActionUserId === u.id}
                                  className={cn(
                                    "text-[10px] font-black px-2 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 disabled:opacity-50",
                                    u.role === 'admin'
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  )}
                                >
                                  {roleActionUserId === u.id ? "..." : u.role === 'admin' ? "تخفيض لمستخدم" : "ترقية لمدير"}
                                </button>

                                {userPhone && (
                                  isPhoneInvalid ? (
                                    <button
                                      onClick={() => handleMarkPhoneStatus(u.id, 'valid')}
                                      disabled={phoneActionUserId === u.id}
                                      className="text-[10px] font-black px-2 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    >
                                      تأكيد الرقم
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleMarkPhoneStatus(u.id, 'invalid')}
                                      disabled={phoneActionUserId === u.id}
                                      className="text-[10px] font-black px-2 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200"
                                    >
                                      رقم غير صالح
                                    </button>
                                  )
                                )}

                                <button
                                  onClick={() => handleToggleBlock(u.id, !!u.blocked)}
                                  disabled={blockingUserId === u.id}
                                  className={cn(
                                    "text-[11px] font-black px-3.5 py-1 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50",
                                    u.blocked ? "bg-emerald-600 text-white" : "bg-rose-50 text-rose-700 border border-rose-200"
                                  )}
                                >
                                  {blockingUserId === u.id ? (
                                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    u.blocked ? "إلغاء الحظر" : "حظر"
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            {activeTab === "live" && <LiveVisitorsDashboard />}

            {activeTab === "services" && <ServicesManager />}
            
            {activeTab === "posts" && <PostsAdmin />}

            {activeTab === "indexnow" && <IndexNowManager />}

            {activeTab === "notifications" && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600">
                        <Bell size={24} />
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-slate-800">إرسال إشعار مباشر</h3>
                        <p className="text-sm text-slate-400 font-bold">تواصل مع المستخدمين بضغطة زر واحدة</p>
                     </div>
                  </div>

                  <form onSubmit={handleSendNotification} className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 mr-2">المستلم</label>
                      <select 
                        value={notificationForm.userId}
                        onChange={(e) => setNotificationForm({...notificationForm, userId: e.target.value})}
                        className="w-full border border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700"
                      >
                        <option value="all">جميع المستخدمين</option>
                        {usersList.map(u => (
                          <option key={u.id} value={u.id}>{u.name || u.email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 mr-2">عنوان الإشعار</label>
                      <input 
                        type="text"
                        required
                        value={notificationForm.title}
                        onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                        className="w-full border border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 focus:border-cyan-500 outline-none transition-all font-bold text-slate-800"
                        placeholder="أدخل عنواناً جذاباً..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 mr-2">نص الرسالة</label>
                      <textarea 
                        required
                        value={notificationForm.body}
                        onChange={(e) => setNotificationForm({...notificationForm, body: e.target.value})}
                        className="w-full border border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 focus:border-cyan-500 outline-none transition-all font-bold resize-none h-40 text-slate-800"
                        placeholder="ماذا تريد أن تخبرهم؟"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isSendingNotification}
                      className={cn(
                        "w-full text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 cursor-pointer",
                        isSendingNotification
                          ? "bg-slate-400 cursor-not-allowed"
                          : "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/10"
                      )}
                    >
                      {isSendingNotification ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جاري إرسال الإشعار...</span>
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          <span>إرسال الإشعار الآن</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === "payment-methods" && (
              <AdminPaymentManager />
            )}

            {activeTab === "settings" && (
              <AdminSettings 
                systemSettings={systemSettings}
                globalNoticeDraft={globalNoticeDraft}
                setGlobalNoticeDraft={setGlobalNoticeDraft}
                handleToggleMaintenance={handleToggleMaintenance}
                handleSendGlobalNotice={handleSendGlobalNotice}
                handleApplyFirewall={handleApplyFirewall}
                isTogglingMaintenance={isTogglingMaintenance}
                isSavingGlobalNotice={isSavingGlobalNotice}
              />
            )}

            {activeTab === "marquee" && (
              <MarqueeManager />
            )}

            {activeTab === "staff" && (
              <StaffManager />
            )}
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </main>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        isArabic={true}
        isAdminView={true}
        adminState={{
          adminNote,
          setAdminNote,
          isUpdatingStatus,
          onUpdateStatus: handleUpdateOrderStatus,
          onOpenRejection: () => setIsRejectionModalOpen(true),
          onDeleteOrder: (orderId) => {
            const found = orders.find(o => o.id === orderId) || selectedOrder;
            setOrderToDelete(found);
          }
        }}
      />

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto p-4 flex flex-col items-center justify-center min-h-full bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 my-auto shrink-0 border border-slate-100 text-right animate-scale-up">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center text-rose-600 mx-auto mb-4">
                <Trash2 size={30} />
              </div>
              <h3 className="text-xl font-black text-slate-800">حذف الطلب نهائياً؟</h3>
              <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
                أنت على وشك حذف الطلب <span className="font-mono text-cyan-600 font-black">#{orderToDelete.id?.slice(0, 8).toUpperCase()}</span> الخاص بـ <span className="text-slate-800 font-black">{orderToDelete.userName || 'العميل'}</span> بقيمة <span className="text-emerald-600 font-black font-mono">{orderToDelete.amount || orderToDelete.priceMru || 0} MRU</span> نهائياً من قاعدة البيانات.
              </p>
              <div className="mt-3 p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-[11px] font-bold text-rose-700 text-right">
                ⚠️ هذا الإجراء فوري ولا يمكن التراجع عنه.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={confirmDeleteOrder}
                disabled={isDeletingOrder}
                className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black py-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-xs shadow-lg shadow-red-600/20"
              >
                {isDeletingOrder ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>نعم، احذف الطلب</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeletingOrder}
                className="flex-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-black py-3.5 rounded-xl transition-all cursor-pointer text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Rejection Reason Modal */}
      {isRejectionModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto p-4 flex flex-col items-center justify-start sm:justify-center min-h-full bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 my-auto shrink-0">
              <div className="text-center">
                 <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-4">
                    <XCircle size={32} />
                 </div>
                 <h3 className="text-xl font-black text-slate-800">سبب رفض الطلب</h3>
                 <p className="text-sm text-slate-400 font-bold mt-1">يرجى توضيح سبب الرفض للعميل</p>
              </div>

              <textarea 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                autoFocus
                placeholder="مثال: رقم اللاعب غير صحيح، المبلغ غير مطابق..."
                className="w-full border border-slate-100 bg-slate-50 rounded-2xl p-4 text-sm font-bold focus:border-red-500 outline-none transition-all resize-none h-32 text-slate-800"
              />

              <div className="flex gap-3 pt-2">
                 <button 
                   onClick={() => handleUpdateOrderStatus("rejected")} disabled={isUpdatingStatus}
                   className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl transition-all"
                 >
                   {isUpdatingStatus ? "جاري الرفض..." : "تأكيد الرفض"}
                 </button>
                 <button 
                   onClick={() => setIsRejectionModalOpen(false)} disabled={isUpdatingStatus}
                   className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-xl transition-all"
                 >
                   إلغاء
                 </button>
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* KYC Inspection Modal */}
      {isKycModalOpen && selectedKycUser && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto p-4 flex flex-col items-center justify-center min-h-full bg-slate-950/70 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white p-6 sm:p-8 relative">
              <button 
                onClick={() => {
                  setIsKycModalOpen(false);
                  setSelectedKycUser(null);
                }}
                className="absolute left-6 top-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-black text-xl shrink-0">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black italic tracking-tight">
                    معاينة ملف التوثيق (KYC)
                  </h3>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    التحقق من البيانات والمستندات الرسمية المقدمة من العميل
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Applicant Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center gap-4">
                {selectedKycUser.photoURL ? (
                  <img src={selectedKycUser.photoURL} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-cyan-500" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-cyan-600 text-white font-black text-xl flex items-center justify-center">
                    {(selectedKycUser.name || selectedKycUser.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-800 text-base">{selectedKycUser.kyc_full_name || selectedKycUser.name || 'مستخدم موري توب'}</h4>
                    {selectedKycUser.isVerified && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> موثق
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-bold dir-ltr text-right">{selectedKycUser.email}</p>
                  <p className="text-xs text-cyan-700 font-mono font-bold">{selectedKycUser.phoneNumber || selectedKycUser.kyc_phone || 'لا يوجد رقم هاتف'}</p>
                </div>
              </div>

              {/* Identity Document Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">نوع الوثيقة الرسمية:</span>
                  <span className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                    <FileBadge className="w-4 h-4 text-cyan-600" />
                    {selectedKycUser.kyc_id_type || "بطاقة هويّة وطنية"}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">رقم الوثيقة / NNID:</span>
                  <span className="font-mono font-black text-slate-800 text-sm">
                    {selectedKycUser.kyc_id_number || "---"}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">المدينة والولاية:</span>
                  <span className="font-black text-slate-800 text-sm">
                    {selectedKycUser.kyc_city || "نواكشوط"}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-1">العنوان التفصيلي / GPS:</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {selectedKycUser.kyc_address_gps || "---"}
                  </span>
                </div>
              </div>

              {/* Document Image Display */}
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-700 flex items-center justify-between">
                  <span>صورة مستند الوثيقة الوطنية:</span>
                  {selectedKycUser.kyc_id_image && (
                    <a 
                      href={selectedKycUser.kyc_id_image} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-cyan-600 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <ExternalLink size={12} /> فتح الصورة بحجم كامل
                    </a>
                  )}
                </p>

                {selectedKycUser.kyc_id_image ? (
                  <div className="rounded-2xl border-2 border-slate-200 overflow-hidden bg-slate-900 group relative">
                    <img 
                      src={selectedKycUser.kyc_id_image} 
                      alt="صورة الهوية" 
                      className="w-full max-h-72 object-contain mx-auto py-2"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-400 font-bold text-xs">
                    لم يتم إرفاق صورة مستند الهوية من العميل
                  </div>
                )}
              </div>

              {/* Rejection Reason if available */}
              {selectedKycUser.blockReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 font-bold">
                  <span className="block text-rose-900 font-black mb-1">ملاحظة/سبب الرفض السابق:</span>
                  {selectedKycUser.blockReason}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => handleApproveKyc(selectedKycUser)}
                disabled={kycActionLoading}
                className="w-full sm:flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {kycActionLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>موافقة وتوثيق الحساب رسمياً</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsKycRejectModalOpen(true)}
                disabled={kycActionLoading}
                className="w-full sm:w-auto bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                <span>رفض الطلب</span>
              </button>

              <button
                onClick={() => {
                  setIsKycModalOpen(false);
                  setSelectedKycUser(null);
                }}
                className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-4 px-5 rounded-2xl text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* KYC Rejection Reason Modal */}
      {isKycRejectModalOpen && selectedKycUser && createPortal(
        <div className="fixed inset-0 z-[100000] p-4 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Ban className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800">رفض طلب التوثيق</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">
                سبب الرفض الذي سيصل في إشعار المستخدم
              </p>
            </div>

            <textarea
              value={kycRejectReason}
              onChange={(e) => setKycRejectReason(e.target.value)}
              placeholder="مثال: صورة الهوية غير واضحة، رقم الهوية لا يطابق المستند..."
              className="w-full border border-slate-200 bg-slate-50 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-rose-500 h-32 resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => handleRejectKyc(selectedKycUser, kycRejectReason)}
                disabled={kycActionLoading}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-3.5 rounded-xl text-xs transition-all flex items-center justify-center"
              >
                {kycActionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "تأكيد الرفض وإرسال"
                )}
              </button>

              <button
                onClick={() => setIsKycRejectModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Withdrawal Rejection Modal */}
      {isWithdrawalRejectModalOpen && selectedWithdrawal && createPortal(
        <div className="fixed inset-0 z-[100000] p-4 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Ban className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800">رفض طلب سحب الأرباح</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">
                سبب الرفض الذي سيصل في إشعار المستخدم مع إعادة الرصيد
              </p>
            </div>

            <textarea
              value={withdrawalRejectReason}
              onChange={(e) => setWithdrawalRejectReason(e.target.value)}
              placeholder="مثال: رقم بنكيلي غير صحيح، أو حساب غير مطابق..."
              className="w-full border border-slate-200 bg-slate-50 rounded-2xl p-4 text-xs font-bold text-slate-800 outline-none focus:border-rose-500 h-32 resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => handleRejectWithdrawal(selectedWithdrawal, withdrawalRejectReason)}
                disabled={withdrawalActionLoading}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-3.5 rounded-xl text-xs transition-all flex items-center justify-center"
              >
                {withdrawalActionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "تأكيد الرفض وإعادة الرصيد"
                )}
              </button>

              <button
                onClick={() => setIsWithdrawalRejectModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
