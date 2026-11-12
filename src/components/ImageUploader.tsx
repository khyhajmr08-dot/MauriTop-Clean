import React, { useState, useEffect, useRef } from "react";
import { cn } from "../lib/utils";
import ImageCropper from "./ImageCropper";
import { UploadCloud, X, RefreshCw, Image as ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  onImageSelected?: (base64: string) => void;
  onFileSelected?: (blob: Blob) => void;
  initialPreview?: string;
  label?: string;
  imageFit?: 'cover' | 'contain';
  aspect?: number;
}

export function ImageUploader({ 
  onImageSelected, 
  onFileSelected,
  initialPreview = "", 
  label = "ارفع صورة الخدمة", 
  imageFit = "cover",
  aspect, // Revert to flexible aspect by default
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string>(initialPreview);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(initialPreview);
  }, [initialPreview]);

  const onUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropSrc(reader.result);
        setCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onUpload(file);
    }
  };

  const triggerFileInput = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleClearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreview("");
    if (onImageSelected) {
      onImageSelected("");
    }
    // Also clear input value so uploading the same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCroppedSave = (blob: Blob) => {
    if (onFileSelected) {
      onFileSelected(blob);
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        // Maintain maximum clarity with higher resolution limit and PNG format
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          // Reduced size and switched to JPEG to stay under Firestore 1MB limit
          // Increased size and maintained high JPEG quality to stay under 1MB but ensure sharpness
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Switched to high quality webp at 0.85 for clarity and manageable size
            const compressedBase64 = canvas.toDataURL("image/webp", 0.85);
            setPreview(compressedBase64);
            if (onImageSelected) {
              onImageSelected(compressedBase64);
            }
          } else {
            setPreview(reader.result as string);
            if (onImageSelected) {
              onImageSelected(reader.result as string);
            }
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(blob);
    setCropperOpen(false);
    setCropSrc(null);
  };

  return (
    <div dir="rtl" className="rounded-[2.5rem] border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
      <span className="mb-3 block text-xs font-black text-slate-500 uppercase tracking-widest mr-1">
        {label}
      </span>

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => onUpload(e.target.files?.[0])}
        className="hidden"
      />

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={cn(
          "relative w-full rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center p-6 md:p-8 text-center transition-all duration-300 cursor-pointer min-h-[190px] select-none",
          isDragging 
            ? "border-cyan-500 bg-cyan-50/15 scale-[1.01] shadow-lg shadow-cyan-500/5" 
            : preview 
              ? "border-slate-200 bg-slate-50/20 hover:border-cyan-500/35 hover:bg-slate-50/40" 
              : "border-slate-300 bg-slate-50/50 hover:border-cyan-500/50 hover:bg-cyan-50/5"
        )}
      >
        {preview ? (
          <div className="w-full flex flex-col items-center gap-4">
            {/* Elegant Image Frame */}
            <div 
              className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden relative group/preview"
              style={{ aspectRatio: aspect ? String(aspect) : '1.6' }}
            >
              <img
                src={preview || undefined}
                alt="preview"
                referrerPolicy="no-referrer"
                className={cn(
                  "w-full h-full transition-transform duration-500 group-hover/preview:scale-105",
                  imageFit === 'contain' ? 'object-contain' : 'object-cover'
                )}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="bg-slate-900/85 text-white px-3.5 py-1.5 rounded-full text-xs font-black backdrop-blur-sm shadow-md">
                  معاينة الصورة المحددة
                </span>
              </div>
            </div>

            {/* Non-overlapping, fully responsive Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 w-full mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={triggerFileInput}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer border border-white/5"
              >
                <RefreshCw size={13} className="animate-spin-hover" />
                <span>تغيير الصورة</span>
              </button>

              <button
                type="button"
                onClick={handleClearImage}
                className="flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <X size={13} />
                <span>إزالة</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* Visual Indicator Wrapper */}
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
              isDragging ? "bg-cyan-500 text-white scale-110 shadow-lg shadow-cyan-500/25" : "bg-slate-100 text-slate-500"
            )}>
              <UploadCloud size={24} className={cn(isDragging && "animate-bounce")} />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-black text-slate-800">
                {isDragging ? "أفلت الصورة هنا الآن! 🎉" : "اسحب الصورة وأفلتها هنا"}
              </p>
              <p className="text-xs text-slate-400 font-bold">
                أو اضغط في أي مكان لتصفح الملفات من جهازك
              </p>
            </div>

            <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-slate-100/75 rounded-full text-[10px] text-slate-400 font-bold">
              <ImageIcon size={10} />
              <span>صيغ الصور المدعومة: PNG, JPG, JPEG, WEBP</span>
            </div>
          </div>
        )}
      </div>

      <ImageCropper
        open={cropperOpen}
        imageSrc={cropSrc}
        onClose={() => {
          setCropperOpen(false);
          setCropSrc(null);
        }}
        onSave={handleCroppedSave}
        aspect={aspect}
      />
    </div>
  );
}

