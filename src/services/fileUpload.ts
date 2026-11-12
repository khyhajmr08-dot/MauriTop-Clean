import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { fileToBase64 } from '../lib/utils';
import { persistentImageCache } from '../lib/persistentImageCache';

/**
 * Converts a base64 / data URL string to a standard Blob safely.
 */
export function dataURLtoBlob(dataurl: string): Blob {
  try {
    if (!dataurl || typeof dataurl !== 'string') {
      return new Blob([], { type: 'image/webp' });
    }
    if (!dataurl.includes(',')) {
      return new Blob([dataurl], { type: 'image/webp' });
    }
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.warn("[Upload] dataURLtoBlob conversion warning:", e);
    return new Blob([], { type: 'image/webp' });
  }
}

/**
 * Converts a Blob or File to a Data URL string.
 */
export async function blobToDataURL(file: File | Blob | string): Promise<string> {
  if (typeof file === 'string') return file;
  if (!file) return '';
  
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
  let dataUrl: string = '';
  if (typeof file === 'string') {
    dataUrl = file;
  } else {
    dataUrl = await blobToDataURL(file);
  }

  if (!dataUrl) {
    throw new Error("تعذر قراءة بيانات الملف المرفق");
  }

  onProgress?.(50);
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: dataUrl,
      path: path,
      filename: (file as any)?.name || path
    })
  });

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

  // 1. Direct Firebase Storage Resumable Upload
  try {
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/webp',
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
      if (serverUrl && (serverUrl.startsWith("http") || serverUrl.startsWith("/uploads/"))) {
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
    const firebasePromise = new Promise<string>((resolve, reject) => {
      let uploadTarget: Blob;
      if (typeof file === 'string') {
        uploadTarget = dataURLtoBlob(file);
      } else {
        uploadTarget = file;
      }

      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, uploadTarget, {
        contentType: (file as any)?.type || 'image/webp'
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
      if (serverUrl && (serverUrl.startsWith("http") || serverUrl.startsWith("/uploads/"))) {
        return serverUrl;
      }
      throw new Error("لم يتم استلام رابط صالح من الخادم");
    } catch (serverErr: any) {
      console.error("[Upload] Server /api/upload also failed:", serverErr);
      throw new Error(`تعذر رفع إيصال الدفع: ${serverErr?.message || "يرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة."}`);
    }
  }
}
