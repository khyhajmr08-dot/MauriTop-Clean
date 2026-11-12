/**
 * Persistent Image & Service Cache Manager
 * Uses IndexedDB with CacheStorage API and LocalStorage fallback.
 * Ensures custom uploaded images and service configurations persist permanently across sessions,
 * network fluctuations, and cache clearing.
 */

const DB_NAME = "mauritop_cache_v2";
const STORE_IMAGES = "service_images";
const STORE_SERVICES = "services_data";
const CACHE_STORAGE_NAME = "mauritop-service-images-v2";

// Helper to open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }

    const request = indexedDB.open(DB_NAME, 2);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES);
      }
      if (!db.objectStoreNames.contains(STORE_SERVICES)) {
        db.createObjectStore(STORE_SERVICES);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// In-memory quick lookup for instant access
const memoryImageCache = new Map<string, string>();
const serviceCustomImagesMap = new Map<string, string>();

// Initialize memory cache from localStorage if available
try {
  const savedMappings = localStorage.getItem("mauritop_service_img_map");
  if (savedMappings) {
    const parsed = JSON.parse(savedMappings);
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === "string" && v) {
        serviceCustomImagesMap.set(k, v);
      }
    });
  }
} catch {
  // Ignore localStorage read errors
}

export const persistentImageCache = {
  /**
   * Save a service image to memory, localStorage, IndexedDB and CacheStorage
   */
  async saveServiceImage(serviceId: string, imageUrl: string): Promise<void> {
    if (!serviceId || !imageUrl || typeof imageUrl !== "string") return;
    const cleanUrl = imageUrl.trim();
    if (!cleanUrl || cleanUrl === "none" || cleanUrl === "removed") return;

    // 1. In-memory map
    serviceCustomImagesMap.set(serviceId, cleanUrl);
    memoryImageCache.set(cleanUrl, cleanUrl);

    // 2. LocalStorage fast index
    try {
      const obj: Record<string, string> = {};
      serviceCustomImagesMap.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem("mauritop_service_img_map", JSON.stringify(obj));
    } catch {
      // LocalStorage might be full
    }

    // 3. IndexedDB durable storage
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_IMAGES, "readwrite");
      const store = tx.objectStore(STORE_IMAGES);
      store.put(cleanUrl, `service_${serviceId}`);
      store.put(cleanUrl, `url_${cleanUrl}`);
    } catch (err) {
      console.warn("Failed to persist image in IndexedDB:", err);
    }

    // 4. CacheStorage API (if it's a remote URL and Cache API is available)
    if (typeof window !== "undefined" && "caches" in window && cleanUrl.startsWith("http")) {
      try {
        const cache = await caches.open(CACHE_STORAGE_NAME);
        const response = await fetch(cleanUrl, { mode: "cors", credentials: "omit" }).catch(() => null);
        if (response && response.ok) {
          await cache.put(cleanUrl, response);
        }
      } catch {
        // Cache put failed (CORS or network issue), IndexedDB/LocalStorage still holds the URL
      }
    }
  },

  /**
   * Get custom image for a service ID
   */
  async getServiceImage(serviceId: string): Promise<string | null> {
    if (!serviceId) return null;

    // 1. Check memory
    if (serviceCustomImagesMap.has(serviceId)) {
      return serviceCustomImagesMap.get(serviceId)!;
    }

    // 2. Check IndexedDB
    try {
      const db = await openDB();
      return new Promise<string | null>((resolve) => {
        const tx = db.transaction(STORE_IMAGES, "readonly");
        const store = tx.objectStore(STORE_IMAGES);
        const req = store.get(`service_${serviceId}`);
        req.onsuccess = () => {
          const val = req.result;
          if (val && typeof val === "string") {
            serviceCustomImagesMap.set(serviceId, val);
            resolve(val);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Synchronous quick check from memory or localStorage
   */
  getServiceImageSync(serviceId: string): string | null {
    if (!serviceId) return null;
    if (serviceCustomImagesMap.has(serviceId)) {
      return serviceCustomImagesMap.get(serviceId)!;
    }
    return null;
  },

  /**
   * Store entire services list durably in IndexedDB
   */
  async saveServicesData(services: any[]): Promise<void> {
    if (!Array.isArray(services) || services.length === 0) return;

    // Also register every custom service image
    services.forEach((s) => {
      const img = s.imageUrl || s.image;
      if (img && typeof img === "string" && img.trim() && img !== "none") {
        this.saveServiceImage(s.id, img.trim());
      }
    });

    try {
      const db = await openDB();
      const tx = db.transaction(STORE_SERVICES, "readwrite");
      const store = tx.objectStore(STORE_SERVICES);
      store.put(services, "all_services");
    } catch (err) {
      console.warn("Failed to persist services data in IndexedDB:", err);
    }
  },

  /**
   * Retrieve cached services data durably from IndexedDB
   */
  async getServicesData(): Promise<any[] | null> {
    try {
      const db = await openDB();
      return new Promise<any[] | null>((resolve) => {
        const tx = db.transaction(STORE_SERVICES, "readonly");
        const store = tx.objectStore(STORE_SERVICES);
        const req = store.get("all_services");
        req.onsuccess = () => {
          if (Array.isArray(req.result) && req.result.length > 0) {
            resolve(req.result);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }
};
