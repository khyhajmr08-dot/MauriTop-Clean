import React, { useState, useEffect, useRef } from "react";
import { cn } from "../lib/utils";
import { getFallbackServiceImage } from "../lib/serviceImages";
import { persistentImageCache } from "../lib/persistentImageCache";

export type LazyImageProps = {
  src?: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackTitle?: string;
  fallbackId?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  objectFit?: "cover" | "contain";
  padding?: number;
  lowResPlaceholder?: string;
  aspectRatio?: string | number;
  width?: number | string;
  height?: number | string;
};

export default function LazyImage({
  src,
  srcSet,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  alt,
  className,
  style,
  fallbackTitle,
  fallbackId,
  loading = "lazy",
  fetchPriority = "auto",
  referrerPolicy = "no-referrer-when-downgrade",
  objectFit = "cover",
  padding = 0,
  lowResPlaceholder,
  aspectRatio,
  width,
  height,
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(loading === "eager");
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    if (src && typeof src === "string" && src.trim() && !src.startsWith("blob:") && !src.startsWith("/uploads/")) {
      return src.trim();
    }
    if (fallbackId) {
      const persisted = persistentImageCache.getServiceImageSync(fallbackId);
      if (persisted && !persisted.startsWith("blob:") && !persisted.startsWith("/uploads/")) {
        return persisted;
      }
    }
    return getFallbackServiceImage(fallbackTitle || alt, fallbackId);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set up Intersection Observer for viewport detection
  useEffect(() => {
    if (loading === "eager") {
      setIsInView(true);
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      {
        rootMargin: "200px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [loading]);

  // Update image source when props change & consult persistent image cache
  useEffect(() => {
    setHasError(false);

    let effectiveSrc = (src && typeof src === "string" && src.trim().length > 0 && !src.startsWith("blob:") && !src.startsWith("/uploads/"))
      ? src.trim() 
      : "";

    if (effectiveSrc) {
      setCurrentSrc(effectiveSrc);
      if (fallbackId && effectiveSrc.startsWith("http")) {
        persistentImageCache.saveServiceImage(fallbackId, effectiveSrc);
      }
    } else if (fallbackId) {
      const cached = persistentImageCache.getServiceImageSync(fallbackId);
      if (cached && !cached.startsWith("blob:") && !cached.startsWith("/uploads/")) {
        setCurrentSrc(cached);
      } else {
        const fallback = getFallbackServiceImage(fallbackTitle || alt, fallbackId);
        setCurrentSrc(fallback);
      }
    } else {
      const fallback = getFallbackServiceImage(fallbackTitle || alt, "fallback");
      setCurrentSrc(fallback);
    }
  }, [src, fallbackTitle, fallbackId, alt]);

  // Automatic recovery when network fluctuates or comes back online
  useEffect(() => {
    const handleOnline = () => {
      if (hasError && (src || fallbackId)) {
        setHasError(false);
        setIsLoaded(false);
        if (src && !src.startsWith("blob:") && !src.startsWith("/uploads/")) {
          setCurrentSrc(src);
        } else if (fallbackId) {
          const cached = persistentImageCache.getServiceImageSync(fallbackId);
          if (cached) setCurrentSrc(cached);
        }
      }
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [hasError, src, fallbackId]);

  const handleImageError = () => {
    const fallback = getFallbackServiceImage(fallbackTitle || alt, fallbackId || "fallback");
    if (currentSrc !== fallback && fallback) {
      setCurrentSrc(fallback);
      setHasError(false);
      setIsLoaded(true);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  const parsedAspectRatio = aspectRatio
    ? typeof aspectRatio === "number"
      ? `${aspectRatio}`
      : aspectRatio
    : undefined;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden bg-slate-900 flex items-center justify-center select-none"
      )}
      style={{
        aspectRatio: parsedAspectRatio,
        width: width ? (typeof width === "number" ? `${width}px` : width) : undefined,
        height: height ? (typeof height === "number" ? `${height}px` : height) : undefined,
        ...style,
      }}
    >
      {/* 1. Blur-up Low-Res / Stylized Ambient Skeleton Placeholder */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none z-0",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{ aspectRatio: parsedAspectRatio }}
      >
        {lowResPlaceholder ? (
          <img
            src={lowResPlaceholder}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover filter blur-xl scale-110 opacity-70"
            style={{ aspectRatio: parsedAspectRatio }}
          />
        ) : (
          <div className="w-full h-full bg-slate-900 skeleton-shimmer" style={{ aspectRatio: parsedAspectRatio }} />
        )}
      </div>

      {/* 2. Actual Image or Neutral Branded Fallback */}
      {isInView && currentSrc && !hasError ? (
        <img
          src={currentSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          referrerPolicy={referrerPolicy}
          width={width}
          height={height}
          onLoad={() => {
            setIsLoaded(true);
            if (fallbackId && currentSrc) {
              persistentImageCache.saveServiceImage(fallbackId, currentSrc);
            }
          }}
          onError={handleImageError}
          className={cn(
            "w-full h-full transition-all duration-500 ease-out z-10",
            objectFit === "contain" ? "object-contain" : "object-cover",
            isLoaded
              ? "opacity-100 filter blur-0 scale-100"
              : "opacity-0 filter blur-md scale-105",
            className
          )}
          style={{
            aspectRatio: parsedAspectRatio,
            padding: padding ? `${padding}px` : undefined,
          }}
        />
      ) : isInView && (!currentSrc || hasError) ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#0F172A] to-[#070B14] relative z-10 select-none">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5 font-black text-xs sm:text-base shadow-sm">
            {(fallbackTitle || alt || "MT").trim().slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-slate-300 line-clamp-2 px-1">
            {fallbackTitle || alt}
          </span>
        </div>
      ) : null}
    </div>
  );
}
