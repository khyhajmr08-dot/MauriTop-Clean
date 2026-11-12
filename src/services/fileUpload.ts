import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../lib/firebase';
import { fileToBase64 } from '../lib/utils';
import { persistentImageCache } from '../lib/persistentImageCache';

/**
 * Converts a base64 / data URL string to a standard Blob safely.
 */
export function dataURLtoBlob(dataurl: string): Blob {
  if (!dataurl || typeof dataurl !== 'string') {
    throw new Error("بيانات الصورة فارغة أو غير صالحة");
  }

  const match = dataurl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) {
    throw new Error("صيغة الصورة غير مدعومة. استخدم JPEG أو PNG أو WEBP أو GIF");
  }

  try {
    const mime = match[1].toLowerCase();
    const base64 = match[2].replace(/\s/g, "");
    const binary = atob(base64);
    if (!binary.length) throw new Error("الملف فارغ");

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch (error) {
    console.warn("[Upload] Invalid image data:", error);
    throw new Error("تعذر قراءة بيانات الصورة. يرجى اختيار الصورة مرة أخرى");
  }
}

/**
 * Converts a Blob or File to a Data URL string.
 */
export async function blobToDataURL(file: File | Blob | string): Promise<string> {
  if (typeof file === 'string') {
    if (!/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(file)) {
      throw new Error("رابط أو بيانات الصورة غير صالحين للرفع");
    }
    return file;
  }
  if (!file || file.size <= 0) throw new Error("الملف المحدد فارغ");
  
  try {
    const res = await fileToBase64(file);
    if (res && res.length > 0) return res;
  } catch (e) {
    console.warn("[Upload] fileToBase64 warning:", e);
  }

  return new Promise<string>((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error("فشل قراءة بيانات الملف"));
      reader.readAsDataURL(file as Blob);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Server upload fallback via /api/upload endpoint.
 * Throws a descriptive error on failure; never returns fake fallback tokens.
 */
async function uploadToServerApi(
  file: File | Blob | string,
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  onProgress?.(25);

  // Base64 adds roughly one third to the payload. Keep this JSON fallback below
  // Vercel's 4.5 MB function request-body ceiling; normal uploads use Firebase directly.
  const maxFallbackBytes = Math.floor(2.8 * 1024 * 1024);
  if (typeof file !== "string" && file.size > maxFallbackBytes) {
    throw new Error("تعذر استخدام مسار الرفع الاحتياطي لهذا الحجم. أعد المحاولة عبر Firebase Storage أو اختر صورة أصغر من 2.8 ميجابايت.");
  }

  let dataUrl: string = "";
  if (typeof file === "string") {
    dataUrl = file;
    const commaIndex = dataUrl.indexOf(",");
    const encodedLength = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1).replace(/\\s/g, "").length : 0;
    const estimatedBytes = Math.floor(encodedLength * 3 / 4);
    if (estimatedBytes > maxFallbackBytes) {
      throw new Error("حجم الملف يتجاوز الحد الآمن لمسار الرفع الاحتياطي (2.8 ميجابايت).");
    }
  } else {
    dataUrl = await blobToDataURL(file);
  }

  if (!dataUrl) {
    throw new Error("تعذر قراءة بيانات الملف المرفق");
  }

  onProgress?.(50);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const currentUser = auth.currentUser;
  if (currentUser) {
    // A signed-in upload must never silently lose its identity on the server fallback.
    const idToken = await currentUser.getIdToken();
    if (!idToken) throw new Error("تعذر التحقق من جلسة تسجيل الدخول قبل رفع الملف");
    headers.Authorization = `Bearer ${idToken}`;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 45000);
  let response: Response;
  try {
    response = await fetch('/api/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: dataUrl,
        path,
        filename: (file as any)?.name || path
      }),
      signal: controller.signal
    });
  } catch (networkError: any) {
    if (networkError?.name === "AbortError") {
      throw new Error("انتهت مهلة رفع الصورة إلى التخزين السحابي");
    }
    throw networkError;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `فشل حفظ الملف على الخادم (رمز الخطأ: ${response.status})`);
  }

  const result = await response.json();
  if (!result || !result.url) {
    throw new Error("لم يتم استلام رابط تخزين صالح من الخادم");
  }

  onProgress?.(100);
  return result.url;
}

/**
 * Dedicated service product image uploader.
 * Tries Firebase Storage first, falls back to server /api/upload.
 * Strictly throws if both fail; persists durable URL in persistentImageCache.
 */
export async function uploadServiceImage(
  file: File | Blob | string,
  serviceId: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const cleanId = (serviceId || 'svc').replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `services/${cleanId}_${Date.now()}.webp`;

  onProgress?.(10);
  let blob: Blob;
  if (typeof file === 'string') {
    blob = dataURLtoBlob(file);
  } else {
    blob = file;
  }

  if (!blob.size || blob.size > 8 * 1024 * 1024) {
    throw new Error("حجم صورة الخدمة يجب أن يكون أكبر من صفر وأقل من 8 ميجابايت");
  }

  // 1. Direct Firebase Storage Resumable Upload
  try {
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: blob.type || 'image/webp',
      customMetadata: { serviceId: cleanId, uploadedAt: new Date().toISOString() }
    });

    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        try { task.cancel(); } catch { /* ignore */ }
        reject(new Error("استغرق رفع الصورة السحابية وقتاً طويلاً"));
      }, 30000);

      task.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress?.(Math.min(95, Math.max(10, percent)));
          }
        },
        (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        async () => {
          clearTimeout(timeout);
          try {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            resolve(downloadUrl);
          } catch (e) {
            reject(e);
          }
        }
      );
    });

    onProgress?.(100);
    await persistentImageCache.saveServiceImage(cleanId, url);
    return url;
  } catch (storageErr: any) {
    console.warn("[UploadServiceImage] Firebase Storage unavailable, falling back to server /api/upload:", storageErr?.message || storageErr);
    
    // 2. Server upload fallback
    try {
      const serverUrl = await uploadToServerApi(file, storagePath, onProgress);
      if (serverUrl && serverUrl.startsWith("https://firebasestorage.googleapis.com/")) {
        await persistentImageCache.saveServiceImage(cleanId, serverUrl);
        return serverUrl;
      }
    } catch (serverErr: any) {
      console.error("[UploadServiceImage] Server API upload failed:", serverErr);
      throw new Error(`تعذر حفظ صورة الخدمة: ${serverErr?.message || "خطأ في الشبكة أو التخزين"}`);
    }

    throw new Error(`فشل رفع صورة الخدمة: ${storageErr?.message || "خطأ في التخزين السحابي"}`);
  }
}

/**
 * Resilient customer receipt uploader with real progress tracking.
 * Attempts Firebase Storage first. Falls back to server /api/upload.
 * Strictly throws if both fail; NEVER returns fake fallbacks like "receipt_attached" or raw base64.
 */
export async function uploadFileWithProgress(
  file: File | Blob | string,
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  // 1. First attempt: Firebase Storage
  try {
    const uploadTarget = typeof file === 'string' ? dataURLtoBlob(file) : file;
    if (!uploadTarget || uploadTarget.size <= 0 || uploadTarget.size > 8 * 1024 * 1024) {
      throw new Error("حجم الملف يجب أن يكون أكبر من صفر وأقل من 8 ميجابايت");
    }

    const firebasePromise = new Promise<string>((resolve, reject) => {
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, uploadTarget, {
        contentType: uploadTarget.type || (file as any)?.type || 'image/webp'
      });

      const timeout = setTimeout(() => {
        try { task.cancel(); } catch { /* ignore */ }
        reject(new Error("استغرق اتصال التخزين السحابي وقتاً طويلاً"));
      }, 25000);

      task.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress?.(Math.min(95, Math.max(10, percent)));
          }
        },
        (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        async () => {
          clearTimeout(timeout);
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });

    const firebaseUrl = await firebasePromise;
    onProgress?.(100);
    return firebaseUrl;
  } catch (firebaseErr: any) {
    console.warn("[Upload] Firebase Storage unavailable, falling back to server /api/upload:", firebaseErr?.message || firebaseErr);
    
    // 2. Server /api/upload fallback
    try {
      const serverUrl = await uploadToServerApi(file, path, onProgress);
      if (serverUrl && serverUrl.startsWith("https://firebasestorage.googleapis.com/")) {
        return serverUrl;
      }
      throw new Error("لم يتم استلام رابط صالح من الخادم");
    } catch (serverErr: any) {
      console.error("[Upload] Server /api/upload also failed:", serverErr);
      throw new Error(`تعذر رفع إيصال الدفع: ${serverErr?.message || "يرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة."}`);
    }
  }
}
