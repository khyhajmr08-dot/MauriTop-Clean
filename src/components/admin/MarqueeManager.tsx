import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Sparkles, Bell, AlertTriangle, Info, Megaphone, Save, Play, Pause, ChevronRight } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";

interface MarqueeSettings {
  globalNotice: string;
  globalNoticeActive: boolean;
  marqueeBg: string;
  marqueeTextColor: string;
  marqueeIcon: string;
  marqueeSpeed: number;
}

const COLOR_PRESETS = [
  { id: "cyan", name: "أزرق سماوي (Cyan)", bg: "bg-cyan-50 border-cyan-100", text: "text-cyan-600", bgClass: "bg-cyan-500/10", textClass: "text-cyan-600" },
  { id: "emerald", name: "أخضر زمردي (Emerald)", bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-600", bgClass: "bg-emerald-500/10", textClass: "text-emerald-600" },
  { id: "amber", name: "ذهبي / برتقالي (Amber)", bg: "bg-amber-50 border-amber-100", text: "text-amber-600", bgClass: "bg-amber-500/10", textClass: "text-amber-600" },
  { id: "red", name: "أحمر تحذيري (Red)", bg: "bg-red-50 border-red-100", text: "text-red-600", bgClass: "bg-red-500/10", textClass: "text-red-600" },
  { id: "purple", name: "بنفسجي ملكي (Purple)", bg: "bg-purple-50 border-purple-100", text: "text-purple-600", bgClass: "bg-purple-500/10", textClass: "text-purple-600" },
];

const ICON_PRESETS = [
  { id: "Sparkles", label: "نجوم مميزة", icon: Sparkles },
  { id: "Bell", label: "جرس إشعار", icon: Bell },
  { id: "AlertTriangle", label: "تحذير / تنبيه", icon: AlertTriangle },
  { id: "Info", label: "معلومات", icon: Info },
  { id: "Megaphone", label: "مكبر صوت", icon: Megaphone },
];

const TEMPLATES = [
  "مرحباً بكم في منصة موري توب الرسمية لشحن الألعاب والخدمات الرقمية في موريتانيا 🇲🇷 - سرعة، أمان وضمان كامل.",
  "تنبيه هام: نرجو من جميع الزبائن التأكد من كتابة معرف اللاعب (Player ID) بدقة لتفادي أي تأخير في عملية الشحن.",
  "تحديث: تم تفعيل الشحن التلقائي الفوري لشدات ببجي ومجوهرات فري فاير بأسعار مخفضة وحصرية بالعملة الوطنية MRU.",
  "عروض خاصة: بمناسبة عطلة نهاية الأسبوع، خصومات تصل إلى 10% على جميع بطاقات الهدايا الرقمية وشحن باقات الإنترنت.",
];

export const MarqueeManager: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<MarqueeSettings>({
    globalNotice: "",
    globalNoticeActive: true,
    marqueeBg: "bg-cyan-500/10",
    marqueeTextColor: "text-cyan-600",
    marqueeIcon: "Sparkles",
    marqueeSpeed: 6,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            globalNotice: data.globalNotice || "",
            globalNoticeActive: data.globalNoticeActive !== undefined ? data.globalNoticeActive : true,
            marqueeBg: data.marqueeBg || "bg-cyan-500/10",
            marqueeTextColor: data.marqueeTextColor || "text-cyan-600",
            marqueeIcon: data.marqueeIcon || "Sparkles",
            marqueeSpeed: data.marqueeSpeed || 6,
          });
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
        showToast("فشل في تحميل إعدادات الشريط الإعلاني", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        globalNotice: settings.globalNotice,
        globalNoticeActive: settings.globalNoticeActive,
        marqueeBg: settings.marqueeBg,
        marqueeTextColor: settings.marqueeTextColor,
        marqueeIcon: settings.marqueeIcon,
        marqueeSpeed: settings.marqueeSpeed,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast("تم حفظ وتحديث الشريط الإعلاني بنجاح", "success");
    } catch (err) {
      console.error(err);
      showToast("فشل في حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  };

  const getSelectedIconComponent = () => {
    const found = ICON_PRESETS.find(i => i.id === settings.marqueeIcon);
    if (found) {
      const IconComp = found.icon;
      return <IconComp className="w-4 h-4 shrink-0" />;
    }
    return <Sparkles className="w-4 h-4 shrink-0" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold text-sm">جاري تحميل إعدادات الشريط العلوي...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-right">
      
      {/* Live Interactive Preview Panel */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-600" />
            <span className="text-xs font-black text-slate-400">معاينة تفاعلية حية للشريط العلوي</span>
          </div>
          <span className="text-xs font-black text-slate-500">مظهر الشريط في تطبيق العميل</span>
        </div>

        {settings.globalNoticeActive && settings.globalNotice.trim() ? (
          <div className={`w-full overflow-hidden rounded-2xl border ${settings.marqueeBg} flex items-center p-3 gap-3 transition-all`}>
            <div className={`flex items-center gap-2 font-black px-3 py-1 bg-white/60 rounded-xl shadow-sm text-xs ${settings.marqueeTextColor}`}>
              {getSelectedIconComponent()}
              <span>إعلان عاجل</span>
            </div>
            
            {/* Standard HTML Marquee is highly performant and smooth on mobile browsers */}
            <marquee 
              scrollamount={settings.marqueeSpeed} 
              direction="right" 
              className={`text-xs font-extrabold flex-1 select-none ${settings.marqueeTextColor}`}
            >
              {settings.globalNotice}
            </marquee>
          </div>
        ) : (
          <div className="w-full bg-slate-50 border border-slate-200 border-dashed rounded-2xl py-6 text-center text-slate-400 font-bold text-xs">
            الشريط العلوي معطل حالياً أو لا يحتوي على نص نشط. قم بتفعيله وكتابة نص بالأسفل للبدء.
          </div>
        )}
      </div>

      {/* Editor Panel */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10 space-y-8">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600">
            <Megaphone size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">إدارة الشريط الإعلاني العلوي (Marquee)</h3>
            <p className="text-sm text-slate-400 font-bold">تحكم في التنبيهات الدورية والعروض المباشرة المعروضة أعلى الموقع بالكامل</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Right Column: Text & Preset Templates */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 mr-2">نص الإعلان أو الشريط العلوي</label>
              <textarea
                required
                value={settings.globalNotice}
                onChange={(e) => setSettings({ ...settings, globalNotice: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 outline-none focus:border-cyan-500/50 transition-all font-bold min-h-[120px] text-sm leading-relaxed"
                placeholder="اكتب الإعلان العاجل هنا ليظهر للعملاء في الشريط الدوار..."
              />
            </div>

            {/* Presets / Templates */}
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mr-2">قوالب إعلانات سريعة ومقترحة</label>
              <div className="space-y-2">
                {TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSettings({ ...settings, globalNotice: tmpl })}
                    className="w-full text-right p-3 bg-slate-50 hover:bg-cyan-50 border border-slate-100 hover:border-cyan-200 rounded-xl text-xs text-slate-600 hover:text-cyan-700 transition-all font-bold flex gap-2 items-start"
                  >
                    <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-cyan-500" />
                    <span>{tmpl}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Left Column: Visual Customizations & Controls */}
          <div className="space-y-6">
            {/* Toggle Status */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 mr-2">حالة شريط الإعلانات</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, globalNoticeActive: true })}
                  className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs transition-all border flex items-center justify-center gap-2 ${
                    settings.globalNoticeActive 
                      ? "bg-cyan-600 text-white border-cyan-600" 
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <Play className="w-4 h-4" />
                  نشط ومرئي للجميع
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, globalNoticeActive: false })}
                  className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs transition-all border flex items-center justify-center gap-2 ${
                    !settings.globalNoticeActive 
                      ? "bg-red-600 text-white border-red-600" 
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <Pause className="w-4 h-4" />
                  معطل ومخفي
                </button>
              </div>
            </div>

            {/* Color Presets */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 mr-2">تنسيق الألوان والنمط</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, marqueeBg: preset.bgClass, marqueeTextColor: preset.textClass })}
                    className={`p-3 border rounded-xl text-xs font-black text-right transition-all flex items-center justify-between ${preset.bg} ${
                      settings.marqueeBg === preset.bgClass ? "ring-2 ring-cyan-500 scale-[1.02]" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <span className={preset.text}>{preset.name}</span>
                    <span className={`w-3 h-3 rounded-full ${preset.text.replace("text-", "bg-")}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Presets */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 mr-2">أيقونة الإعلان المميزة</label>
              <div className="grid grid-cols-3 gap-2">
                {ICON_PRESETS.map((iconData) => {
                  const IconComp = iconData.icon;
                  return (
                    <button
                      key={iconData.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, marqueeIcon: iconData.id })}
                      className={`p-3 border rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 ${
                        settings.marqueeIcon === iconData.id 
                          ? "bg-cyan-50 border-cyan-300 text-cyan-600 scale-[1.02]" 
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                      <span>{iconData.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scroll Speed Slider */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400">سرعة التحرك: {settings.marqueeSpeed}</span>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mr-2">سرعة حركة الإعلان</label>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                step="1"
                value={settings.marqueeSpeed}
                onChange={(e) => setSettings({ ...settings, marqueeSpeed: Number(e.target.value) })}
                className="w-full accent-cyan-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1.5 px-1">
                <span>سريع جداً</span>
                <span>متوسط</span>
                <span>هادئ / بطيء</span>
              </div>
            </div>

          </div>

        </div>

        {/* Action Button */}
        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/10 active:scale-95 cursor-pointer"
          >
            <Save size={18} />
            {saving ? "جاري الحفظ والتعميم..." : "حفظ وبث الإعلان للجميع فورا"}
          </button>
        </div>

      </div>

    </div>
  );
};
