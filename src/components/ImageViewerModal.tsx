import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, ZoomIn, ZoomOut, Download, Copy, Check } from "lucide-react";
import { useToast } from "../contexts/ToastContext";

interface ImageViewerModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  isArabic?: boolean;
  subtitle?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl,
  isOpen,
  onClose,
  title = "صورة إثبات التحويل",
  isArabic = true,
  subtitle
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const { showToast } = useToast();

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleCopyLink = () => {
    if (!imageUrl) return;
    navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    showToast(isArabic ? "تم نسخ رابط الصورة!" : "Lien de l'image copié !", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `transfer_receipt_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(isArabic ? "جاري جلب الصورة للتنزيل..." : "Téléchargement de l'image...", "info");
  };

  if (!isOpen || !imageUrl) return null;

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100000] flex flex-col items-center justify-between p-3 sm:p-6 bg-[#070B14]/90 backdrop-blur-xs select-none"
        dir={isArabic ? "rtl" : "ltr"}
      >
        {/* Top Header Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="w-full max-w-3xl flex items-center justify-between bg-[#0E1626] border border-white/10 p-3 sm:p-4 rounded-2xl shadow-xl shrink-0 z-20"
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] font-mono text-emerald-400 font-bold truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 mr-2">
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all disabled:opacity-30 cursor-pointer"
              title={isArabic ? "تكبير" : "Zoom +"}
            >
              <ZoomIn className="w-4 h-4" strokeWidth={1.6} />
            </button>
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all disabled:opacity-30 cursor-pointer"
              title={isArabic ? "تصغير" : "Zoom -"}
            >
              <ZoomOut className="w-4 h-4" strokeWidth={1.6} />
            </button>
            <button
              onClick={handleCopyLink}
              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all cursor-pointer"
              title={isArabic ? "نسخ الرابط" : "Copier le lien"}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" strokeWidth={1.6} /> : <Copy className="w-4 h-4" strokeWidth={1.6} />}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all cursor-pointer"
              title={isArabic ? "تحميل الصورة" : "Télécharger"}
            >
              <Download className="w-4 h-4" strokeWidth={1.6} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl transition-all cursor-pointer ml-1"
              title={isArabic ? "إغلاق" : "Fermer"}
            >
              <X className="w-4 h-4" strokeWidth={1.6} />
            </button>
          </div>
        </motion.div>

        {/* Center Image Container */}
        <div className="flex-1 w-full max-w-4xl flex items-center justify-center p-4 overflow-hidden relative my-auto">
          <motion.div
            animate={{ scale: zoomLevel }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="max-h-full max-w-full flex items-center justify-center"
          >
            <img
              src={imageUrl}
              alt="Verification"
              className="max-h-[75vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
