import { persistentImageCache } from "./persistentImageCache";

export const cacheService = {
  get<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      const { value, timestamp, ttl } = JSON.parse(cached);
      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(key);
        return null;
      }
      return value as T;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  },

  set(key: string, value: any, ttl = 1000 * 60 * 60 * 24 * 7): void { // 7 days persistent cache
    try {
      localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now(), ttl }));
    } catch (e) {
      console.warn("LocalStorage quota reached, relying on IndexedDB:", key);
    }

    // If saving services list, replicate durably to IndexedDB
    if ((key === "db_services" || key === "featured_services") && Array.isArray(value)) {
      persistentImageCache.saveServicesData(value);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },

  /**
   * Durable async fallback for services data from IndexedDB
   */
  async getDurableServices(): Promise<any[] | null> {
    const memOrLocal = cacheService.get<any[]>("db_services");
    if (memOrLocal && Array.isArray(memOrLocal) && memOrLocal.length > 0) {
      return memOrLocal;
    }
    return await persistentImageCache.getServicesData();
  }
};
