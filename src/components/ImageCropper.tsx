import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Cropper, { Point, Area } from "react-easy-crop";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  RefreshCw,
  X,
  Check,
  Eye,
  Sliders,
  Sparkles,
  Maximize2,
  ShieldCheck,
  Zap,
} from "lucide-react";

// Helper function to create Image element from URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Generates the cropped image blob from pixel crop area
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<{ blob: Blob; url: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context found");
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas center to image center on canvas
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    throw new Error("No 2d context for cropped canvas");
  }

  // Set the size of the cropped canvas
  croppedCanvas.width = Math.max(1, pixelCrop.width);
  croppedCanvas.height = Math.max(1, pixelCrop.height);

  // Draw the cropped image onto the new canvas
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const url = URL.createObjectURL(blob);
        resolve({ blob, url });
      },
      "image/webp",
      0.92
    );
  });
}

type Props = {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (blob: Blob) => void;
  aspect?: number;
};

export default function ImageCropper({
  open,
  imageSrc,
  onClose,
  onSave,
  aspect: initialAspect,
}: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [aspect, setAspect] = useState<number>(initialAspect || 16 / 11);
  const [isFreeMode, setIsFreeMode] = useState<boolean>(false);
  const [freeAspect, setFreeAspect] = useState<number>(initialAspect || 1.4);
  const [freeWidthInput, setFreeWidthInput] = useState<string>("16");
  const [freeHeightInput, setFreeHeightInput] = useState<string>("11");
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when opening modal
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      const defaultAspect = initialAspect || 16 / 11;
      setAspect(defaultAspect);
      setFreeAspect(defaultAspect);
      setIsFreeMode(false);
      setFreeWidthInput("16");
      setFreeHeightInput("11");
      setSaving(false);
      setError(null);
      setPreviewUrl(null);
    }
  }, [open, imageSrc, initialAspect]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle crop completion from react-easy-crop
  const onCropComplete = useCallback(
    (_croppedArea: Area, currentCroppedAreaPixels: Area) => {
      setCroppedAreaPixels(currentCroppedAreaPixels);

      // Debounce generating live preview
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }

      previewTimerRef.current = setTimeout(async () => {
        if (imageSrc && currentCroppedAreaPixels) {
          try {
            const { url } = await getCroppedImg(
              imageSrc,
              currentCroppedAreaPixels,
              rotation
            );
            setPreviewUrl((old) => {
              if (old && old.startsWith("blob:")) URL.revokeObjectURL(old);
              return url;
            });
          } catch (e) {
            console.warn("Failed to generate live preview", e);
          }
        }
      }, 200);
    },
    [imageSrc, rotation]
  );

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      setError("يرجى تحديد جزء من الصورة لقصها");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const { blob } = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onSave(blob);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "حدث خطأ أثناء معالجة وقص الصورة. يرجى المحاولة مجدداً.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (open && imageSrc) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [open, imageSrc]);

  if (!open || !imageSrc) return null;

  const aspectOptions = [
    { label: "بطاقة الخدمة (16:11)", val: 16 / 11, isFree: false, icon: "🃏" },
    { label: "شاشة عريضة (16:9)", val: 16 / 9, isFree: false, icon: "📺" },
    { label: "مربع (1:1)", val: 1, isFree: false, icon: "📐" },
    { label: "كلاسيك (4:3)", val: 4 / 3, isFree: false, icon: "🖼️" },
    { label: "عمودي (4:5)", val: 4 / 5, isFree: false, icon: "📱" },
    { label: "قص حر وتحديد مخصص 🔓", val: freeAspect, isFree: true, icon: "✂️" },
  ];

  const handleSelectAspect = (opt: typeof aspectOptions[0]) => {
    if (opt.isFree) {
      setIsFreeMode(true);
    } else {
      setIsFreeMode(false);
      setAspect(opt.val);
    }
  };

  const updateFreeRatioFromInputs = (wStr: string, hStr: string) => {
    setFreeWidthInput(wStr);
    setFreeHeightInput(hStr);
    const w = parseFloat(wStr);
    const h = parseFloat(hStr);
    if (!isNaN(w) && !isNaN(h) && h > 0 && w > 0) {
      setFreeAspect(w / h);
    }
  };

  const currentActiveAspect = isFreeMode ? freeAspect : aspect;

  return createPortal(
    <div className="fixed inset-0 z-[99999] p-2 sm:p-5 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl">
      <div className="w-full max-w-5xl rounded-[2rem] sm:rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden my-auto shrink-0 transition-all">
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:px-6 sm:py-4 bg-slate-900 shrink-0 z-20" dir="rtl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white truncate">قص وتعديل الصورة الذكي</h3>
              <p className="text-[11px] text-slate-400 font-bold hidden sm:block truncate">
                تحكم كامل في أبعاد وتكبير وزاوية الصورة لتظهر بشكل مثالي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Header Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-3.5 sm:px-5 py-2 sm:py-2.5 font-black text-xs sm:text-sm tracking-wide disabled:opacity-50 transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer border border-cyan-300/30"
              title="تأكيد واعتماد قص الصورة"
            >
              {saving ? (
                <>
                  <Sparkles size={15} className="animate-spin text-cyan-200" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check size={16} className="text-cyan-200" />
                  <span>حفظ الصورة</span>
                </>
              )}
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-white/10 active:scale-95 cursor-pointer shrink-0"
              title="إغلاق النافذة"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" dir="rtl">

        {error && (
          <div className="mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs sm:text-sm text-rose-400 text-right font-bold w-full" dir="rtl">
            ⚠️ {error}
          </div>
        )}

        {/* Aspect Ratio Selector Chips - Modern Glass Pills */}
        <div className="mb-4" dir="rtl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={13} />
              <span>اختر وضع أو أبعاد القص:</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-white/5">
              نسبة القص الحالية: {currentActiveAspect.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {aspectOptions.map((opt) => {
              const isSelected = opt.isFree ? isFreeMode : (!isFreeMode && Math.abs(aspect - opt.val) < 0.01);
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleSelectAspect(opt)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all duration-200 border flex items-center gap-2 cursor-pointer active:scale-95 ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/20 scale-[1.02]"
                      : "bg-slate-800/60 hover:bg-slate-800 border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/30"
                  }`}
                >
                  <span className="text-sm">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Free Crop Controls (Only shown when "قص حر" is selected) */}
          {isFreeMode && (
            <div className="mt-3 p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-cyan-300 font-black whitespace-nowrap">✂️ أبعاد القص الحر:</span>
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-white/10 font-mono text-white">
                  <span className="text-slate-400">العرض</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={freeWidthInput}
                    onChange={(e) => updateFreeRatioFromInputs(e.target.value, freeHeightInput)}
                    className="w-12 bg-slate-800 text-center rounded text-cyan-300 font-bold outline-none focus:ring-1 focus:ring-cyan-400 py-0.5 text-xs"
                  />
                  <span className="text-slate-400">:</span>
                  <span className="text-slate-400">الارتفاع</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={freeHeightInput}
                    onChange={(e) => updateFreeRatioFromInputs(freeWidthInput, e.target.value)}
                    className="w-12 bg-slate-800 text-center rounded text-cyan-300 font-bold outline-none focus:ring-1 focus:ring-cyan-400 py-0.5 text-xs"
                  />
                </div>
              </div>

              {/* Slider for smooth free aspect ratio adjustment */}
              <div className="flex items-center gap-3 w-full sm:w-1/2">
                <span className="text-slate-400 text-[11px] font-bold shrink-0">شكل مربع/عريض:</span>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.05"
                  value={freeAspect}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setFreeAspect(val);
                    setFreeWidthInput((val * 10).toFixed(1));
                    setFreeHeightInput("10");
                  }}
                  className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Main Work Area: Cropper + Live Card Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch mb-4" dir="rtl">
          
          {/* Cropper Container */}
          <div className="lg:col-span-7 bg-slate-950 border border-white/10 rounded-3xl overflow-hidden relative min-h-[320px] sm:min-h-[380px] flex flex-col justify-center">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={currentActiveAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              showGrid={true}
              objectFit="contain"
              style={{
                containerStyle: {
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#030712",
                },
                cropAreaStyle: {
                  borderColor: "#06b6d4",
                  borderWidth: 2,
                  boxShadow: "0 0 0 9999px rgba(3, 7, 18, 0.75)",
                },
              }}
            />
            <div className="absolute bottom-3 left-3 right-3 pointer-events-none flex items-center justify-between">
              <span className="bg-slate-900/80 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] font-black backdrop-blur-md">
                💡 اسحب الصورة أو استخدم الإيماءات للتحريك والتكبير
              </span>
            </div>
          </div>

          {/* Live Card Preview Section */}
          <div className="lg:col-span-5 bg-slate-950/60 border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-cyan-400 font-black text-xs">
                <Eye size={15} />
                <span>معاينة البطاقة على المنصة</span>
              </div>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                مباشر LIVE
              </span>
            </div>

            {/* Mockup MauriTop Card */}
            <div className="w-full max-w-[260px] mx-auto rounded-2xl bg-slate-900 border border-white/10 overflow-hidden shadow-xl transition-all relative group">
              <div className="relative aspect-[16/11] bg-slate-950 overflow-hidden flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Live Crop Preview"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 text-xs font-bold p-4 text-center">
                    <Sparkles size={24} className="animate-spin text-cyan-400 mb-2" />
                    <span>جاري تجهيز المعاينة...</span>
                  </div>
                )}
                
                {/* Mock Card Badges */}
                <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Zap size={9} />
                  <span>تسليم فوري</span>
                </div>
                <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-cyan-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-white/10">
                  MauriTop
                </div>
              </div>

              {/* Mock Card Details */}
              <div className="p-3 bg-slate-900 flex flex-col gap-1.5 text-right">
                <h4 className="text-xs font-black text-white truncate">اسم الخدمة أو البطاقة</h4>
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-black text-xs">1,200 MRU</span>
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <ShieldCheck size={11} className="text-emerald-400" />
                    <span>مضمون 100%</span>
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-400 text-center font-bold">
              هكذا ستظهر صورتك تماماً داخل بطاقات MauriTop للمستخدمين.
            </p>
          </div>
        </div>

        {/* Controls: Zoom & Rotation Sliders */}
        <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3.5 sm:p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4" dir="rtl">
          
          {/* Zoom Controls */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-300">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <ZoomIn size={15} />
                <span>التحكم بالتكبير (Zoom):</span>
              </span>
              <span className="text-cyan-400 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg text-[11px]">
                {zoom.toFixed(1)}x
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-black transition-all active:scale-90 cursor-pointer border border-white/10 shadow-sm"
                title="تصغير"
              >
                <ZoomOut size={15} />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-black transition-all active:scale-90 cursor-pointer border border-white/10 shadow-sm"
                title="تكبير"
              >
                <ZoomIn size={15} />
              </button>
            </div>
          </div>

          {/* Rotation Controls */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-300">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <RotateCw size={15} />
                <span>زاوية التدوير (Rotation):</span>
              </span>
              <span className="text-cyan-400 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg text-[11px]">
                {rotation}°
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotateLeft}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-white/10 shadow-sm"
                title="تدوير 90 درجة يسار"
              >
                <RotateCcw size={14} className="text-cyan-400" />
                <span>90°-</span>
              </button>
              <button
                type="button"
                onClick={handleRotateRight}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-white/10 shadow-sm"
                title="تدوير 90 درجة يمين"
              >
                <RotateCw size={14} className="text-cyan-400" />
                <span>90°+</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="mr-auto px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-white/10"
              >
                <RefreshCw size={13} />
                <span>إعادة ضبط</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Sticky Footer Actions */}
        <div className="border-t border-white/10 p-4 bg-slate-900/95 backdrop-blur-md shrink-0 z-20 flex items-center justify-between gap-3" dir="rtl">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 sm:flex-initial rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-7 py-3 font-black text-sm tracking-wide disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 active:scale-95 cursor-pointer border border-cyan-300/30"
            >
              {saving ? (
                <>
                  <Sparkles size={18} className="animate-spin text-cyan-200" />
                  <span>جاري الحفظ والقص...</span>
                </>
              ) : (
                <>
                  <Check size={18} className="text-cyan-200" />
                  <span>تأكيد واعتماد قص الصورة</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 px-6 py-3 font-black text-sm text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
            >
              تراجع
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-bold">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>سيتم استخدام الأبعاد المحددة تلقائياً</span>
          </div>
        </div>
      </div>
    </div>
  </div>,
    document.body
  );
}

