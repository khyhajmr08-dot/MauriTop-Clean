import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Save, 
  ShieldCheck, 
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  Upload,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  X,
  Sliders,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Palette
} from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { cn } from "../lib/utils";
import { 
  PaymentMethodConfig, 
  PaymentSettingsMap, 
  DEFAULT_PAYMENT_CONFIGS, 
  subscribePaymentSettings, 
  savePaymentSettings 
} from "../lib/paymentSettings";

import bankilyLogoImg from "../assets/images/bankily_real_logo_1779370169060.png";
import sadadLogoImg from "../assets/images/sadad_real_logo_1779370189416.png";
import gazaLogoImg from "../assets/images/gaza_real_logo_1779370210822.png";

/**
 * Interactive Canvas Processor Tool Modal for Payment Logos
 */
interface CanvasProcessorModalProps {
  isOpen: boolean;
  onClose: () => void;
  methodId: string;
  methodLabel: string;
  initialImageSrc: string;
  onApply: (methodId: string, processedDataUrl: string) => void;
}

export const PaymentLogoCanvasProcessorModal: React.FC<CanvasProcessorModalProps> = ({
  isOpen,
  onClose,
  methodId,
  methodLabel,
  initialImageSrc,
  onApply
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState<number>(1.0);
  const [padding, setPadding] = useState<number>(20);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [bgStyle, setBgStyle] = useState<'dark' | 'card' | 'transparent' | 'white'>('dark');
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // Load Image
  useEffect(() => {
    if (!initialImageSrc || !isOpen) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = initialImageSrc;
    img.onload = () => {
      setLoadedImage(img);
      setScale(1.0);
      setPadding(20);
      setOffsetX(0);
      setOffsetY(0);
    };
  }, [initialImageSrc, isOpen]);

  // Render to Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const targetWidth = 400;
    const targetHeight = 200;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // 1. Fill background
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    if (bgStyle === 'dark') {
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    } else if (bgStyle === 'card') {
      ctx.fillStyle = "#091122";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    } else if (bgStyle === 'white') {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    // 2. Calculate aspect-ratio scaling
    const availW = Math.max(10, targetWidth - padding * 2);
    const availH = Math.max(10, targetHeight - padding * 2);

    const baseScale = Math.min(availW / loadedImage.width, availH / loadedImage.height);
    const finalScale = baseScale * scale;

    const drawW = loadedImage.width * finalScale;
    const drawH = loadedImage.height * finalScale;

    const posX = (targetWidth - drawW) / 2 + offsetX;
    const posY = (targetHeight - drawH) / 2 + offsetY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(loadedImage, posX, posY, drawW, drawH);
  }, [loadedImage, scale, padding, offsetX, offsetY, bgStyle]);

  useEffect(() => {
    if (isOpen && loadedImage) {
      renderCanvas();
    }
  }, [isOpen, loadedImage, renderCanvas]);

  if (!isOpen) return null;

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png", 0.95);
    onApply(methodId, dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-white shadow-2xl space-y-6 animate-in zoom-in-95 dir-rtl" dir="rtl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="text-lg font-black text-white">أداة معالجة وتكييف الشعار بالـ Canvas</h4>
              <p className="text-xs text-slate-400 font-bold">ضبط أبعاد وشعار «{methodLabel}» ليملأ البطاقة بدقة دون قص أو تشوه</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80">
            <X size={20} />
          </button>
        </div>

        {/* Live Canvas Preview */}
        <div className="space-y-2 text-center">
          <label className="text-xs font-bold text-slate-300 block text-right">
            معاينة شاشة الـ Canvas الحية (أبعاد البطاقات الرسمية 400x200):
          </label>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex justify-center items-center shadow-inner">
            <canvas 
              ref={canvasRef} 
              className="w-full max-w-sm h-auto rounded-xl border border-emerald-500/40 shadow-2xl bg-[#030712] object-contain"
            />
          </div>
        </div>

        {/* Sliders & Canvas Controls */}
        <div className="space-y-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-xs">
          
          {/* Zoom / Scale Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <ZoomIn size={14} className="text-emerald-400" />
                <span>مستوى التكبير/التصغير (Scale):</span>
              </span>
              <span className="font-mono text-emerald-400 font-black">{Math.round(scale * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0.4" 
              max="2.5" 
              step="0.05"
              value={scale} 
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Padding Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Maximize2 size={14} className="text-cyan-400" />
                <span>الهامش الداخلي (Padding):</span>
              </span>
              <span className="font-mono text-cyan-400 font-black">{padding}px</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="60" 
              step="2"
              value={padding} 
              onChange={(e) => setPadding(parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Background Style Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="font-bold text-slate-300 block flex items-center gap-1.5">
              <Palette size={14} className="text-amber-400" />
              <span>لون خلفية الـ Canvas لبطاقة الدفع:</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setBgStyle('dark')}
                className={cn(
                  "py-2 rounded-xl font-bold border transition-all text-[11px]",
                  bgStyle === 'dark' ? "bg-slate-800 border-emerald-400 text-emerald-400 font-black" : "bg-slate-900 border-slate-800 text-slate-400"
                )}
              >
                داكنة تلقائية
              </button>
              <button
                type="button"
                onClick={() => setBgStyle('card')}
                className={cn(
                  "py-2 rounded-xl font-bold border transition-all text-[11px]",
                  bgStyle === 'card' ? "bg-slate-800 border-emerald-400 text-emerald-400 font-black" : "bg-slate-900 border-slate-800 text-slate-400"
                )}
              >
                كحلي البطاقة
              </button>
              <button
                type="button"
                onClick={() => setBgStyle('transparent')}
                className={cn(
                  "py-2 rounded-xl font-bold border transition-all text-[11px]",
                  bgStyle === 'transparent' ? "bg-slate-800 border-emerald-400 text-emerald-400 font-black" : "bg-slate-900 border-slate-800 text-slate-400"
                )}
              >
                شفافة (PNG)
              </button>
              <button
                type="button"
                onClick={() => setBgStyle('white')}
                className={cn(
                  "py-2 rounded-xl font-bold border transition-all text-[11px]",
                  bgStyle === 'white' ? "bg-slate-800 border-emerald-400 text-emerald-400 font-black" : "bg-slate-900 border-slate-800 text-slate-400"
                )}
              >
                بيضاء
              </button>
            </div>
          </div>

          {/* Reset Alignment */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setScale(1.0);
                setPadding(20);
                setOffsetX(0);
                setOffsetY(0);
              }}
              className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>إعادة ضبط المحاذاة الافتراضية</span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>تطبيقات المعالجة بالـ Canvas ⚡</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export const PaymentMethodManager: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<PaymentSettingsMap>(DEFAULT_PAYMENT_CONFIGS);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewMethodKey, setPreviewMethodKey] = useState<string | null>(null);

  // Canvas Processor Modal State
  const [canvasModalState, setCanvasModalState] = useState<{
    isOpen: boolean;
    methodId: string;
    methodLabel: string;
    imageSrc: string;
  }>({
    isOpen: false,
    methodId: "",
    methodLabel: "",
    imageSrc: ""
  });

  // New payment method form draft
  const [newMethod, setNewMethod] = useState<Partial<PaymentMethodConfig>>({
    id: "",
    label: "",
    labelAr: "",
    labelFr: "",
    phone: "",
    accountHolderAr: "",
    accountHolderFr: "",
    enabled: true,
    type: "manual",
    integrationStatus: "active",
    isCustom: true,
    descAr: "",
    descFr: ""
  });

  useEffect(() => {
    const unsubscribe = subscribePaymentSettings((data) => {
      setSettings(data);
    });
    return () => unsubscribe();
  }, []);

  const handleFieldChange = (methodId: string, field: keyof PaymentMethodConfig, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [methodId]: {
        ...prev[methodId],
        [field]: value,
      },
    }));
  };

  const [togglingMethodId, setTogglingMethodId] = useState<string | null>(null);

  const handleToggleStatus = async (methodId: string) => {
    if (togglingMethodId) return;

    const prevEnabled = settings[methodId]?.enabled !== false;
    const nextEnabled = !prevEnabled;

    const updatedSettings: PaymentSettingsMap = {
      ...settings,
      [methodId]: {
        ...settings[methodId],
        enabled: nextEnabled,
      },
    };

    setSettings(updatedSettings);
    setTogglingMethodId(methodId);

    try {
      await savePaymentSettings(updatedSettings);
      showToast(
        nextEnabled 
          ? `تم تفعيل ${settings[methodId]?.labelAr || methodId} بنجاح 🟢` 
          : `تم تعطيل ${settings[methodId]?.labelAr || methodId} (سيظهر للزبائن: غير متوفر) 🔴`,
        nextEnabled ? "success" : "info"
      );
    } catch (err: any) {
      console.error("Failed to toggle payment method:", err);
      setSettings(settings);
      showToast(`فشل حفظ حالة وسيلة الدفع: ${err?.message || "خطأ في الاتصال"}`, "error");
    } finally {
      setTogglingMethodId(null);
    }
  };

  // Trigger Canvas Processor Modal when an image file is chosen
  const handleSelectImageForCanvas = (methodId: string, methodLabel: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCanvasModalState({
        isOpen: true,
        methodId,
        methodLabel,
        imageSrc: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCanvasProcessedLogo = (methodId: string, processedDataUrl: string) => {
    handleFieldChange(methodId, "logoUrl", processedDataUrl);
    showToast(`تمت معالجة شعار "${settings[methodId]?.labelAr || methodId}" بالـ Canvas بنجاح! اضغط على "حفظ في Firestore".`, "success");
  };

  const handleSaveAll = async () => {
    try {
      setIsSavingAll(true);
      await savePaymentSettings(settings);
      showToast("تم حفظ جميع تعديلات وشعارات طرق الدفع بنجاح في Firestore 🎉", "success");
    } catch (err: any) {
      console.error("Save payment settings error:", err);
      showToast(`فشل حفظ الإعدادات: ${err?.message || "خطأ غير متوقع"}`, "error");
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("هل أنت متأكد من استعادة الإعدادات الافتراضية لطرق الدفع (بنكيلي معتمد بالرقم 32014902)؟")) {
      const defaultState = { ...DEFAULT_PAYMENT_CONFIGS };
      defaultState.bankily.phone = "32014902";
      defaultState.bankily.enabled = true;
      defaultState.sadad.enabled = false;
      defaultState.gaza.enabled = false;
      defaultState.paypal.enabled = false;
      
      setSettings(defaultState);
      showToast("تمت استعادة الإعدادات، اضغط على 'حفظ في Firestore' لتأكيد التغيير.", "info");
    }
  };

  const handleAddNewMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethod.labelAr?.trim() || !newMethod.id?.trim()) {
      showToast("يرجى إدخال معرف الوسيلة واسمها بالعربية", "error");
      return;
    }

    const safeId = newMethod.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!safeId) {
      showToast("معرف الوسيلة يجب أن يحتوي على أحرف إنجليزية وأرقام فقط", "error");
      return;
    }

    if (settings[safeId]) {
      showToast("طريقة الدفع هذه موجودة مسبقاً بنفس المعرف", "error");
      return;
    }

    const added: PaymentMethodConfig = {
      id: safeId,
      label: newMethod.label?.trim() || safeId,
      labelAr: newMethod.labelAr.trim(),
      labelFr: newMethod.labelFr?.trim() || newMethod.label?.trim() || safeId,
      phone: newMethod.phone?.trim() || "",
      accountHolderAr: newMethod.accountHolderAr?.trim() || "",
      accountHolderFr: newMethod.accountHolderFr?.trim() || "",
      enabled: newMethod.enabled !== false,
      type: newMethod.type || "manual",
      integrationStatus: newMethod.integrationStatus || "active",
      isCustom: true,
      descAr: newMethod.descAr?.trim() || `الدفع عبر ${newMethod.labelAr.trim()}`,
      descFr: newMethod.descFr?.trim() || `Paiement via ${newMethod.label?.trim() || safeId}`,
    };

    setSettings((prev) => ({ ...prev, [safeId]: added }));
    setIsAddModalOpen(false);
    setNewMethod({
      id: "",
      label: "",
      labelAr: "",
      labelFr: "",
      phone: "",
      accountHolderAr: "",
      accountHolderFr: "",
      enabled: true,
      type: "manual",
      integrationStatus: "active",
      isCustom: true,
      descAr: "",
      descFr: ""
    });

    showToast(`تمت إضافة "${added.labelAr}"! اضغط على "حفظ في Firestore" لتثبيتها.`, "success");
  };

  const handleDeleteCustomMethod = (methodId: string) => {
    if (["bankily", "sadad", "gaza", "paypal"].includes(methodId)) {
      showToast("لا يمكن حذف طرق الدفع الأساسية، يمكنك تعطيلها فقط", "error");
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف وسيلة الدفع "${settings[methodId]?.labelAr || methodId}"؟`)) {
      setSettings((prev) => {
        const next = { ...prev };
        delete next[methodId];
        return next;
      });
      showToast("تم حذف وسيلة الدفع، اضغط حفظ لتأكيد التغيير.", "info");
    }
  };

  const methodLogos: Record<string, string> = {
    bankily: bankilyLogoImg,
    sadad: sadadLogoImg,
    gaza: gazaLogoImg,
  };

  const activeMethodsCount = Object.values(settings).filter((m) => m.enabled !== false).length;

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>أداة أبعاد وشعارات الدفع (Interactive Canvas Processor)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black">
                  Canvas Powered ⚡
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                معالجة وتكييف شعارات بنكيلي وسداد وغزة باي بالـ Canvas لتناسب أبعاد بطاقات الشحن بدقة دون قص أو تشوه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>المفعلة: {activeMethodsCount}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-cyan-600/20"
          >
            <Plus size={16} />
            <span>إضافة وسيلة دفع جديدة</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-slate-700"
          >
            <RotateCcw size={15} />
            <span>الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSavingAll}
            className={cn(
              "px-6 py-3.5 rounded-2xl font-black text-xs text-slate-950 transition-all flex items-center gap-2.5 shadow-lg cursor-pointer active:scale-95",
              isSavingAll 
                ? "bg-slate-600 cursor-not-allowed text-white" 
                : "bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-emerald-500/20"
            )}
          >
            <Save size={16} />
            <span>{isSavingAll ? "جاري الحفظ..." : "حفظ في Firestore"}</span>
          </button>
        </div>
      </div>

      {/* Methods Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Object.entries(settings).map(([key, method]) => {
          const isEnabled = method.enabled !== false;
          const defaultLogo = methodLogos[key];
          const activeLogo = method.logoUrl || defaultLogo;

          return (
            <div 
              key={key}
              className={cn(
                "rounded-3xl border p-5 flex flex-col justify-between transition-all shadow-lg relative overflow-hidden space-y-4",
                isEnabled 
                  ? "bg-slate-900 border-emerald-500/30 shadow-emerald-500/5" 
                  : "bg-slate-950/80 border-slate-800 opacity-90"
              )}
            >
              {/* Accent Header */}
              <div className={cn(
                "absolute top-0 inset-x-0 h-1.5",
                isEnabled ? "bg-emerald-500" : "bg-slate-700"
              )} />

              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-12 rounded-xl bg-[#020612] border border-white/10 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      {activeLogo ? (
                        <img src={activeLogo} alt={method.labelAr} className="w-full h-full object-contain filter drop-shadow" />
                      ) : (
                        <CreditCard className="w-6 h-6 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">{method.labelAr}</h4>
                      <span className="text-[11px] font-mono text-slate-400 block">{method.label}</span>
                    </div>
                  </div>

                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    disabled={togglingMethodId === key}
                    onClick={() => handleToggleStatus(key)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border",
                      togglingMethodId === key
                        ? "opacity-60 cursor-wait bg-slate-800 border-slate-700 text-slate-300"
                        : isEnabled
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                        : "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30 cursor-pointer"
                    )}
                  >
                    {isEnabled ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>{isEnabled ? "مفعل" : "معطل"}</span>
                  </button>
                </div>

                {/* Canvas Image Upload & Crop Processor Section */}
                <div className="p-3.5 rounded-2xl bg-[#050A14] border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-emerald-400" />
                      <span>معالجة الشعار بالـ Canvas (منع القص):</span>
                    </label>
                    {method.logoUrl && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange(key, "logoUrl", "")}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        إعادة الافتراضي
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-12 rounded-xl bg-[#020612] border border-white/15 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner relative">
                      <img
                        src={activeLogo || bankilyLogoImg}
                        alt={method.labelAr}
                        className="max-h-full max-w-full object-contain filter drop-shadow"
                      />
                    </div>

                    <label className="flex-1 cursor-pointer px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md">
                      <Sliders size={14} className="text-emerald-400" />
                      <span>رفع ومعالجة بالـ Canvas</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSelectImageForCanvas(key, method.labelAr, file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Account Number / Phone Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 block">
                    {key === "bankily" ? "رقم حساب بنكيلي (المعتمد: 32014902)" : "رقم حساب الاستلام / الهاتف"}
                  </label>
                  <input
                    type="text"
                    value={method.phone || ""}
                    onChange={(e) => handleFieldChange(key, "phone", e.target.value)}
                    placeholder={key === "bankily" ? "32014902" : "رقم الحساب أو الهاتف"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-emerald-400 focus:border-emerald-500 outline-none transition-all dir-ltr text-right"
                  />
                </div>

                {/* Account Holder Name Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 block">
                    اسم صاحب الحساب أو المستلم (اختياري)
                  </label>
                  <input
                    type="text"
                    value={method.accountHolderAr || ""}
                    onChange={(e) => handleFieldChange(key, "accountHolderAr", e.target.value)}
                    placeholder="اتركه فارغاً لإخفاء خانة المستلم"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 block">
                    وصف أو تعليمات تظهر للعميل
                  </label>
                  <input
                    type="text"
                    value={method.descAr || ""}
                    onChange={(e) => handleFieldChange(key, "descAr", e.target.value)}
                    placeholder="الدفع السريع والمباشر..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  {isEnabled ? "🟢 متاح في المتجر" : "🔴 غير متاح"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewMethodKey(key)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>معاينة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Save size={13} />
                    <span>حفظ</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Interactive Canvas Processor Tool Modal */}
      <PaymentLogoCanvasProcessorModal
        isOpen={canvasModalState.isOpen}
        onClose={() => setCanvasModalState(prev => ({ ...prev, isOpen: false }))}
        methodId={canvasModalState.methodId}
        methodLabel={canvasModalState.methodLabel}
        initialImageSrc={canvasModalState.imageSrc}
        onApply={handleApplyCanvasProcessedLogo}
      />

      {/* Add New Method Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-black text-white">إضافة وسيلة دفع جديدة</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddNewMethod} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">المعرف البرمجي (ID)</label>
                <input
                  type="text"
                  required
                  placeholder="masrvi أو click"
                  value={newMethod.id || ""}
                  onChange={(e) => setNewMethod({ ...newMethod, id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">الاسم بالعربية</label>
                <input
                  type="text"
                  required
                  placeholder="مصرفي أو كليك BMCI"
                  value={newMethod.labelAr || ""}
                  onChange={(e) => setNewMethod({ ...newMethod, labelAr: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">رقم الحساب أو الهاتف</label>
                <input
                  type="text"
                  placeholder="رقم الهاتف"
                  value={newMethod.phone || ""}
                  onChange={(e) => setNewMethod({ ...newMethod, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-black text-white"
                >
                  إضافة الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Preview Modal */}
      {previewMethodKey && settings[previewMethodKey] && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Eye size={16} className="text-emerald-400" />
                <span>معاينة كما يراها الزبون:</span>
              </h4>
              <button onClick={() => setPreviewMethodKey(null)} className="p-1 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-xl bg-[#020612] border border-white/10 p-1 flex items-center justify-center">
                  <img 
                    src={settings[previewMethodKey].logoUrl || methodLogos[previewMethodKey] || bankilyLogoImg} 
                    alt="" 
                    className="w-full h-full object-contain" 
                  />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{settings[previewMethodKey].labelAr}</p>
                  <p className="text-[10px] text-slate-400">{settings[previewMethodKey].descAr}</p>
                </div>
              </div>

              {settings[previewMethodKey].phone && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between font-mono">
                  <span className="text-slate-400 text-[11px]">رقم التحويل:</span>
                  <span className="font-black text-emerald-400 text-sm">{settings[previewMethodKey].phone}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPreviewMethodKey(null)}
              className="w-full py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaymentMethodManager;
