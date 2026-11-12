import freefireImg from "../assets/images/freefire_service_1779283121131.png";
import pubgImg from "../assets/images/pubg_service_1779283143166.png";
import codMobileImg from "../assets/images/cod_mobile_official.jpg";
import snapchatPlusImg from "../assets/images/snapchat_plus_official.jpg";
import netflixImg from "../assets/images/netflix_service_1779283170112.png";
import todImg from "../assets/images/tod_vip_official.jpg";
import shahidImg from "../assets/images/shahid_vip_official.jpg";
import spotifyImg from "../assets/images/spotify_official.jpg";
import googleplayImg from "../assets/images/googleplay_service_1779283248304.png";
import playstationImg from "../assets/images/playstation_official.jpg";
import appleImg from "../assets/images/apple_official.jpg";
import defaultLogoImg from "../assets/images/mauritop_app_icon_1786294243072.jpg";
import { persistentImageCache } from "./persistentImageCache";

export const getFallbackServiceImage = (serviceName: string, serviceId?: string): string => {
  if (serviceId) {
    const persisted = persistentImageCache.getServiceImageSync(serviceId);
    if (persisted && persisted !== "none" && persisted !== "removed" && !persisted.startsWith("blob:")) {
      return persisted;
    }
  }

  const name = (serviceName || "").toLowerCase();
  const id = (serviceId || "").toLowerCase();

  if (name.includes("snapchat") || name.includes("سناب") || id.includes("snapchat")) {
    return snapchatPlusImg;
  }
  if (name.includes("pubg") || name.includes("ببجي") || name.includes("ببج") || name.includes("شدات") || id.includes("pubg")) {
    return pubgImg;
  }
  if (name.includes("free") || name.includes("فري") || name.includes("جواهر") || id.includes("freefire")) {
    return freefireImg;
  }
  if (name.includes("cod") || name.includes("كول أوف") || name.includes("duty") || id.includes("cod")) {
    return codMobileImg;
  }
  if (name.includes("netflix") || name.includes("نتفليكس") || id.includes("netflix")) {
    return netflixImg;
  }
  if (name.includes("tod") || name.includes("تود") || id.includes("tod")) {
    return todImg;
  }
  if (name.includes("shahid") || name.includes("شاهد") || id.includes("shahid")) {
    return shahidImg;
  }
  if (name.includes("spotify") || name.includes("سبوتيفاي") || id.includes("spotify")) {
    return spotifyImg;
  }
  if (name.includes("google") || name.includes("جوجل") || name.includes("play") || id.includes("googleplay")) {
    return googleplayImg;
  }
  if (name.includes("playstation") || name.includes("بلايستيشن") || name.includes("psn") || id.includes("playstation")) {
    return playstationImg;
  }
  if (name.includes("apple") || name.includes("آبل") || name.includes("itunes") || id.includes("apple") || id.includes("icloud")) {
    return appleImg;
  }

  return defaultLogoImg;
};

export function resolveServiceImage(dbDoc?: any, staticService?: any): { resolvedImageUrl: string; resolvedImage: string } {
  const fallback = getFallbackServiceImage(
    dbDoc?.nameAr || dbDoc?.name || staticService?.nameAr || staticService?.name || "",
    dbDoc?.id || staticService?.id
  );

  if (!dbDoc) {
    const defaultUrl = staticService?.imageUrl || staticService?.image || fallback;
    return { resolvedImageUrl: defaultUrl, resolvedImage: defaultUrl };
  }

  const rawUrl = typeof dbDoc.imageUrl === "string" ? dbDoc.imageUrl.trim() : "";
  const rawImage = typeof dbDoc.image === "string" ? dbDoc.image.trim() : "";
  const candidate = rawUrl || rawImage;

  // Reject invalid, empty, or ephemeral URLs that die on page reload
  const isInvalid = !candidate || 
    candidate === "none" || 
    candidate === "removed" || 
    candidate === "undefined" || 
    candidate === "null" ||
    candidate === "receipt_attached" ||
    candidate.startsWith("blob:");

  if (isInvalid) {
    // Check persistent cache for a genuine URL
    if (dbDoc.id) {
      const persisted = persistentImageCache.getServiceImageSync(dbDoc.id);
      if (persisted && !persisted.startsWith("blob:") && (persisted.startsWith("http") || persisted.startsWith("/uploads/"))) {
        return { resolvedImageUrl: persisted, resolvedImage: persisted };
      }
    }
    return { resolvedImageUrl: fallback, resolvedImage: fallback };
  }

  // If candidate is a valid permanent remote URL or server upload
  if (dbDoc.id && (candidate.startsWith("http") || candidate.startsWith("/uploads/"))) {
    persistentImageCache.saveServiceImage(dbDoc.id, candidate);
  }

  return { resolvedImageUrl: candidate, resolvedImage: candidate };
}
