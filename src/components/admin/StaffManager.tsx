import React, { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  where 
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/useAuth";
import { useToast } from "../../contexts/ToastContext";
import { logAuditEvent } from "../../lib/auditLogger";
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  UserCheck, 
  UserX, 
  Clock, 
  ShieldAlert, 
  Activity, 
  Search, 
  AlertTriangle,
  Lock,
  ListOrdered,
  Sliders,
  Eye,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { cn, formatDateSafe } from "../../lib/utils";

export interface StaffMember {
  id: string;
  uid?: string;
  email: string;
  name: string;
  role: "orders_manager" | "services_manager" | "support_agent";
  active: boolean;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export function StaffManager() {
  const { user, isOwner } = useAuth();
  const { showToast } = useToast();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "audit">("members");

  // Add form fields
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"orders_manager" | "services_manager" | "support_agent">("orders_manager");
  const [newNotes, setNewNotes] = useState("");

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      // Fetch staff collection
      const staffSnap = await getDocs(collection(db, "staff"));
      const members: StaffMember[] = [];
      staffSnap.forEach((d) => {
        members.push({ id: d.id, ...d.data() } as StaffMember);
      });
      setStaffList(members);

      // Fetch audit logs (latest 50)
      try {
        const auditQuery = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(50));
        const auditSnap = await getDocs(auditQuery);
        const logs: any[] = [];
        auditSnap.forEach((d) => {
          logs.push({ id: d.id, ...d.data() });
        });
        setAuditLogs(logs);
      } catch (auditErr) {
        console.warn("Could not fetch audit logs with timestamp ordering:", auditErr);
      }
    } catch (err: any) {
      console.error("Fetch staff error:", err);
      showToast("تعذر تحميل قائمة الموظفين", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    const cleanName = newName.trim();

    if (!cleanEmail || !cleanName) {
      showToast("يرجى إدخال اسم الموظف والبريد الإلكتروني", "error");
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      showToast("صيغة البريد الإلكتروني غير صحيحة", "error");
      return;
    }

    try {
      setSubmitting(true);

      // 1. Check if user already in staff
      const existing = staffList.find((s) => s.email.toLowerCase() === cleanEmail);
      if (existing) {
        showToast("هذا الموظف مضاف بالفعل في قائمة الموظفين", "error");
        setSubmitting(false);
        return;
      }

      // Check if user exists in 'users' collection to link UID and role
      let linkedUid = "";
      try {
        const usersQuery = query(collection(db, "users"), where("email", "==", cleanEmail));
        const userSnap = await getDocs(usersQuery);
        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          linkedUid = userDoc.id;
          // Synchronize user role in their document
          await updateDoc(doc(db, "users", linkedUid), {
            staffRole: newRole,
            role: newRole,
            updatedAt: serverTimestamp()
          });
        }
      } catch (uErr) {
        console.warn("User lookup for staff sync:", uErr);
      }

      // Staff doc id: use linkedUid if found, or sanitized email
      const staffDocId = linkedUid || cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
      const newStaffData: StaffMember = {
        id: staffDocId,
        uid: linkedUid || undefined,
        email: cleanEmail,
        name: cleanName,
        role: newRole,
        active: true,
        notes: newNotes.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "staff", staffDocId), newStaffData);

      // Audit Log
      await logAuditEvent({
        action: "staff_member_added",
        performedBy: user?.email || "المالك",
        performedByUid: user?.uid || "",
        targetId: staffDocId,
        targetTitle: cleanName,
        details: `تم تعيين الموظف ${cleanName} (${cleanEmail}) برتبة: ${getRoleTitleArabic(newRole)}`
      });

      showToast(`تم تعيين الموظف "${cleanName}" وتفعيل صلاحياته بنجاح`, "success");
      setIsAddModalOpen(false);
      setNewEmail("");
      setNewName("");
      setNewNotes("");
      setNewRole("orders_manager");
      await fetchStaffData();
    } catch (err: any) {
      console.error("Add staff error:", err);
      showToast(`فشل إضافة الموظف: ${err.message || "خطأ غير متوقع"}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStaffStatus = async (staff: StaffMember) => {
    const nextStatus = !staff.active;
    try {
      await updateDoc(doc(db, "staff", staff.id), {
        active: nextStatus,
        updatedAt: serverTimestamp()
      });

      if (staff.uid) {
        try {
          await updateDoc(doc(db, "users", staff.uid), {
            blocked: !nextStatus,
            staffActive: nextStatus,
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.warn("User active toggle sync:", e);
        }
      }

      await logAuditEvent({
        action: "staff_member_updated",
        performedBy: user?.email || "المالك",
        performedByUid: user?.uid || "",
        targetId: staff.id,
        targetTitle: staff.name,
        details: `${nextStatus ? "تفعيل" : "تعليق / إيقاف مؤقت"} لحساب الموظف (${staff.email})`
      });

      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, active: nextStatus } : s))
      );
      showToast(nextStatus ? `تم تفعيل حساب ${staff.name}` : `تم إيقاف حساب ${staff.name} مؤقتاً`, "info");
    } catch (err: any) {
      console.error("Toggle staff status error:", err);
      showToast("فشل تحديث حالة الموظف", "error");
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!window.confirm(`هل أنت متأكد من سحب كافة الصلاحيات وحذف الموظف "${staff.name}" نهائياً؟`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "staff", staff.id));

      if (staff.uid) {
        try {
          await updateDoc(doc(db, "users", staff.uid), {
            staffRole: "user",
            role: "user",
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.warn("User role reset:", e);
        }
      }

      await logAuditEvent({
        action: "staff_member_removed",
        performedBy: user?.email || "المالك",
        performedByUid: user?.uid || "",
        targetId: staff.id,
        targetTitle: staff.name,
        details: `تم إلغاء توظيف وسحب صلاحيات الموظف (${staff.email})`
      });

      setStaffList((prev) => prev.filter((s) => s.id !== staff.id));
      showToast(`تم حذف الموظف ${staff.name} وسحب كافة الصلاحيات`, "success");
    } catch (err: any) {
      console.error("Delete staff error:", err);
      showToast("فشل حذف الموظف", "error");
    }
  };

  const getRoleTitleArabic = (role: string) => {
    switch (role) {
      case "orders_manager":
        return "مدير معالجة الطلبات";
      case "services_manager":
        return "مدير المنتجات والخدمات";
      case "support_agent":
        return "وكيل الدعم والاستفسارات";
      default:
        return "موظف مخصص";
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "orders_manager":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-cyan-50 text-cyan-700 border border-cyan-200">
            <ListOrdered size={13} />
            مدير الطلبات (Orders)
          </span>
        );
      case "services_manager":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
            <Sliders size={13} />
            مدير الخدمات (Services)
          </span>
        );
      case "support_agent":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
            <Eye size={13} />
            وكيل دعم (Read-Only)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-slate-800" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-cyan-900/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/30">
                <ShieldCheck size={24} />
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white">
                نظام إدارة الموظفين وتوزيع الصلاحيات (RBAC)
              </h2>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              تحكم دقيق بصلاحيات طاقم العمل في منصة موري توب. يمكنك تعيين مديري طلبات لمعالجة الشحنات، أو مديري خدمات لتحديث الأسعار والبطاقات، مع حماية تامة لحسابات الدفع وإعدادات الإدارة الحساسة.
            </p>
          </div>

          {isOwner && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] flex-shrink-0"
            >
              <UserPlus size={18} />
              <span>إضافة موظف جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("members")}
            className={cn(
              "flex items-center gap-2 px-5 py-3 font-black text-sm border-b-2 transition-all",
              activeTab === "members"
                ? "border-cyan-600 text-cyan-700 bg-cyan-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <ShieldCheck size={18} />
            <span>طاقم الموظفين النشط ({staffList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={cn(
              "flex items-center gap-2 px-5 py-3 font-black text-sm border-b-2 transition-all",
              activeTab === "audit"
                ? "border-cyan-600 text-cyan-700 bg-cyan-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <Activity size={18} />
            <span>سجل الرقابة والعمليات الإدارية ({auditLogs.length})</span>
          </button>
        </div>

        <button
          onClick={fetchStaffData}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="تحديث البيانات"
        >
          <RefreshCw size={18} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      {/* Tab 1: Staff Members */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="animate-spin mx-auto mb-3" size={28} />
              <p className="font-bold">جارٍ تحميل بيانات الموظفين...</p>
            </div>
          ) : staffList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">لا يوجد موظفون إضافيون حالياً</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                أنت المدير والمالك الوحيد حالياً. يمكنك تفويض مهام محددة لمديري طلبات أو مديري خدمات بأمان عبر زر «إضافة موظف جديد».
              </p>
              {isOwner && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl font-bold text-sm hover:bg-cyan-700 transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  <span>إضافة أول موظف</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((member) => (
                <div
                  key={member.id}
                  className={cn(
                    "bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between",
                    member.active ? "border-slate-200" : "border-red-200 bg-red-50/20"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h4 className="font-black text-slate-900 text-base">{member.name}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{member.email}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {member.active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-50 text-red-700 border border-red-200">
                            موقوف
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      {getRoleBadge(member.role)}
                    </div>

                    {member.notes && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 mb-4">
                        <span className="font-bold text-slate-700 block mb-0.5">ملاحظات / المهام:</span>
                        {member.notes}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                      <Clock size={12} />
                      {formatDateSafe(member.createdAt)}
                    </span>

                    {isOwner && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleStaffStatus(member)}
                          className={cn(
                            "p-2 rounded-lg text-xs font-bold transition-colors",
                            member.active 
                              ? "text-amber-600 hover:bg-amber-50" 
                              : "text-emerald-600 hover:bg-emerald-50"
                          )}
                          title={member.active ? "تعليق الموظف" : "تفعيل الموظف"}
                        >
                          {member.active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(member)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف وسحب الصلاحية نهائياً"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Role Explanations Box */}
          <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-6 mt-6">
            <h4 className="font-black text-slate-800 text-sm mb-4 flex items-center gap-2">
              <Lock size={16} className="text-cyan-700" />
              <span>جدول الصلاحيات المقيدة والأمان الهرمي</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-1.5 font-black text-cyan-700 mb-1.5">
                  <ListOrdered size={14} />
                  <span>مدير الطلبات (Orders Manager)</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-2">
                  معالجة الطلبات، تغيير الحالة إلى مكتمل أو مرفوض، إرفاق إيصالات وأكواد الشحن، إرسال إشعارات للعملاء.
                </p>
                <span className="text-[10px] font-bold text-red-600 block">
                  ⛔ محظور: تعديل أرقام الدفع، تغيير أسعار الخدمات، أو حذف الموظفين.
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-1.5 font-black text-purple-700 mb-1.5">
                  <Sliders size={14} />
                  <span>مدير الخدمات (Services Manager)</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-2">
                  إضافة وتعديل الخدمات وبطاقات الشحن، تعديل الأسعار، شريط الإعلانات، وعروض الواتساب.
                </p>
                <span className="text-[10px] font-bold text-red-600 block">
                  ⛔ محظور: تعديل حسابات وتطبيقات الدفع أو الاطلاع على الطلبات المالية.
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-1.5 font-black text-blue-700 mb-1.5">
                  <Eye size={14} />
                  <span>وكيل دعم (Support Agent)</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-2">
                  معاينة الطلبات والزوار فقط (Read-Only) لمساعدة العملاء عبر الواتساب في متابعة شحناتهم.
                </p>
                <span className="text-[10px] font-bold text-red-600 block">
                  ⛔ محظور: أي تعديل أو حذف لأي سجل في المنصة.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === "audit" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-cyan-700" />
              <span className="font-black text-slate-800 text-sm">سجل التدقيق والحركات الإدارية</span>
            </div>
            <span className="text-xs text-slate-500 font-bold">آخر 50 عملية مسجلة</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Activity size={32} className="mx-auto mb-2 opacity-50" />
              <p className="font-bold text-sm">لا توجد سجلات بعد في سجل التدقيق</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{log.targetTitle || log.action}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 font-mono">
                        {log.action}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-slate-600">{log.details}</p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>المنفذ: <strong className="text-slate-700">{log.performedBy}</strong></span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">
                    {formatDateSafe(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-cyan-50 text-cyan-700 rounded-xl">
                  <UserPlus size={20} />
                </span>
                <h3 className="text-lg font-black text-slate-900">تعيين موظف جديد بصلاحيات محددة</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">اسم الموظف الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد ولد محمد"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">البريد الإلكتروني لحساب الموظف</label>
                <input
                  type="email"
                  required
                  placeholder="employee@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:border-cyan-500 outline-none dir-ltr text-left"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  * يجب أن يستخدم الموظف هذا البريد عند تسجيل الدخول في المنصة للوصول للوحة التحكم.
                </span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">الدور والصلاحية الممنوحة</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:border-cyan-500 outline-none bg-white"
                >
                  <option value="orders_manager">مدير معالجة الطلبات (معالجة وإكمال وإلغاء الطلبات فقط)</option>
                  <option value="services_manager">مدير الخدمات والمنتجات (الأسعار، الصور، عروض واتساب، شريط الإعلانات)</option>
                  <option value="support_agent">وكيل دعم (معاينة وقراءة الطلبات والزوار فقط)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">ملاحظات أو مهام خاصة (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="مثال: مسؤول عن وردية المساء لشحن بطاقات فري فاير وببجي..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:border-cyan-500 outline-none resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-sm rounded-xl shadow-lg shadow-cyan-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <span>تأكيد تعيين الموظف</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
