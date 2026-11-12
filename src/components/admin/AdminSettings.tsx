import React from "react";
import { AlertTriangle, Info, ShieldCheck, Lock } from "lucide-react";
import { cn } from "../../lib/utils";

interface AdminSettingsProps {
  systemSettings: any;
  globalNoticeDraft: string;
  setGlobalNoticeDraft: (notice: string) => void;
  handleToggleMaintenance: () => void;
  handleSendGlobalNotice: () => void;
  handleApplyFirewall: () => void;
  isTogglingMaintenance?: boolean;
  isSavingGlobalNotice?: boolean;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  systemSettings,
  globalNoticeDraft,
  setGlobalNoticeDraft,
  handleToggleMaintenance,
  handleSendGlobalNotice,
  handleApplyFirewall,
  isTogglingMaintenance = false,
  isSavingGlobalNotice = false,
}) => {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 lg:p-8 animate-fade-in text-right space-y-8">
      
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-lg font-black text-slate-800">إعدادات النظام وأمان الخادم الدفاعية</h3>
        <p className="text-xs text-slate-400 mt-1">تعديل وضع الصيانة، إعلانات المستخدمين العائمة، وحماية جدار الحماية للعمليات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs font-bold">
        
        {/* Maintenance Toggle Column */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-amber-50 text-amber-500 border border-amber-100">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-right">
                <h4 className="font-black text-slate-800 text-sm">تبديل وضع صيانة الخادم</h4>
                <p className="text-[10px] text-slate-400 mt-1">تجميد أوامر ومشتريات العملاء مؤقتاً</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
              تنشيط وضع الصيانة يقوم فوراً بتعليق استقبال الطلبات الجديدة مؤقتاً، مع إظهار شاشة توقف للعملاء لحماية تسعيرات الباقات ريثما تنتهي من التحديثات اللازمة.
            </p>
          </div>
          <button
            onClick={handleToggleMaintenance}
            disabled={isTogglingMaintenance}
            className={cn(
              "w-full py-3.5 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-2",
              isTogglingMaintenance
                ? "bg-slate-300 text-slate-500 border-slate-300 cursor-not-allowed"
                : systemSettings?.maintenanceMode 
                  ? "bg-red-600 hover:bg-red-700 text-white border-red-700 cursor-pointer active:scale-95" 
                  : "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700 cursor-pointer active:scale-95"
            )}
          >
            {isTogglingMaintenance ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : systemSettings?.maintenanceMode ? (
              "إيقاف وضع الصيانة الفورية"
            ) : (
              "تفعيل وبث وضع الصيانة"
            )}
          </button>
        </div>

        {/* Global Floating Notice */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-500">
                <Info className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h4 className="font-black text-slate-800 text-sm">التنبيه العائم العام الدائم</h4>
                <p className="text-[10px] text-slate-400 mt-1">تعديل شريط الإنذار والإحصارات للزبائن</p>
              </div>
            </div>
            <textarea
              value={globalNoticeDraft || ""}
              onChange={(e) => setGlobalNoticeDraft(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 text-right focus:border-cyan-500 transition-all outline-none resize-none min-h-[100px] font-bold"
              placeholder="اكتب الإشعار العاجل هنا ليظهر في أعلى صفحات الزبائن..."
            />
          </div>
          <button
            onClick={handleSendGlobalNotice}
            disabled={isSavingGlobalNotice}
            className={cn(
              "w-full text-white py-3.5 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-2",
              isSavingGlobalNotice
                ? "bg-slate-300 text-slate-500 border-slate-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer border border-blue-700 active:scale-95"
            )}
          >
            {isSavingGlobalNotice ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                <span>جاري الحفظ والنشـر...</span>
              </>
            ) : (
              "تعديل ونشر التنبيه العائم"
            )}
          </button>
        </div>

        {/* Security Firewall Column */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-red-50 border border-red-100 text-red-500 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h4 className="font-black text-slate-800 text-sm">جدار الحماية الفعال المنقذ للشبكة</h4>
                <p className="text-[10px] text-slate-400 mt-1">قطع مسار العبث حظر طلبات IP</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
              إجراء أمني طارئ في حال ملاحظة إغراق أو هجمات بوتات عابثة على قنوات الدفع. حظر فوري لعنوان المتسلل وحماية قاعدة بيانات المستخدمين تلقائياً.
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={handleApplyFirewall}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-xs font-black border border-red-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-red-500" />
              حظر ثغرة الهجوم الإلكتروني
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-white hover:bg-slate-100 text-slate-700 py-3 rounded-xl text-xs font-black border border-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              إعادة تحميل وتزامن الخوادم
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
