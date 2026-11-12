import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { initializeApp, applicationDefault, getApps, App } from "firebase-admin/app";
import * as admin from "firebase-admin";
import crypto from "crypto";
import fs from "fs";

import firebaseConfig from "./firebase-applet-config.json";

async function startServer() {
  let adminApp: App | undefined;
  let adminInitStatus: 'initialized' | 'missing_credentials' | 'invalid_credentials' | 'project_mismatch' | 'error' = 'missing_credentials';
  let adminInitErrorMsg: string | null = null;
  const targetProjectId = firebaseConfig.projectId;

  const rawServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;

  if (rawServiceAccountJson && rawServiceAccountJson.trim()) {
    try {
      let parsedCred: any;
      try {
        parsedCred = typeof rawServiceAccountJson === "string" ? JSON.parse(rawServiceAccountJson.trim()) : rawServiceAccountJson;
      } catch (jsonErr: any) {
        adminInitStatus = "invalid_credentials";
        adminInitErrorMsg = "Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: Invalid JSON structure";
        console.warn("[Firebase Admin] Service account JSON parse error (credentials not logged)");
      }

      if (parsedCred && typeof parsedCred === "object") {
        if (!parsedCred.project_id || !parsedCred.client_email || !parsedCred.private_key) {
          adminInitStatus = "invalid_credentials";
          adminInitErrorMsg = "Service account JSON is missing required fields (project_id, client_email, or private_key)";
          console.warn("[Firebase Admin] Service account JSON missing required fields");
        } else if (parsedCred.project_id !== targetProjectId) {
          adminInitStatus = "project_mismatch";
          adminInitErrorMsg = `Service account project_id (${parsedCred.project_id}) does not match configured applet project_id (${targetProjectId})`;
          console.warn("[Firebase Admin] Project ID mismatch between service account and applet config");
        } else {
          // Normalize private_key newline formatting (escaped newlines in environment variables)
          if (typeof parsedCred.private_key === "string" && parsedCred.private_key.includes("\\n")) {
            parsedCred.private_key = parsedCred.private_key.replace(/\\n/g, "\n");
          }

          if (getApps().length === 0) {
            adminApp = initializeApp({
              credential: admin.credential.cert(parsedCred),
              projectId: targetProjectId
            });
          } else {
            adminApp = getApps()[0];
          }

          adminInitStatus = "initialized";
          adminInitErrorMsg = null;
          console.log("[Firebase Admin] Successfully initialized with verified service account for project:", targetProjectId);
        }
      }
    } catch (certErr: any) {
      adminInitStatus = "error";
      adminInitErrorMsg = certErr?.message || "Failed to initialize Firebase Admin with service account";
      console.warn("[Firebase Admin] Service account initialization error:", adminInitErrorMsg);
    }
  } else {
    // Attempt Application Default Credentials (e.g. Google Cloud Run or local dev environment)
    try {
      const cred = applicationDefault();
      if (getApps().length === 0) {
        adminApp = initializeApp({
          credential: cred,
          projectId: targetProjectId
        });
      } else {
        adminApp = getApps()[0];
      }
      adminInitStatus = "initialized";
      adminInitErrorMsg = null;
      console.log("[Firebase Admin] Initialized with Application Default Credentials for project:", targetProjectId);
    } catch (adcErr: any) {
      adminInitStatus = "missing_credentials";
      adminInitErrorMsg = "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not configured on the server";
      console.warn("[Firebase Admin] ADC unavailable and FIREBASE_SERVICE_ACCOUNT_JSON is missing");
    }
  }

  let db: Firestore | null = null;
  const getDb = () => {
    if (!db) {
      if (!adminApp || adminInitStatus !== "initialized") {
        throw new Error(adminInitErrorMsg || "Firebase Admin service account credential is not configured on the server. Please configure FIREBASE_SERVICE_ACCOUNT_JSON.");
      }
      try {
        db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
      } catch (e: any) {
        console.error("Failed to get Firestore instance:", e);
        throw new Error(`Firestore not initialized: ${e?.message || "Check Firebase Admin setup"}`);
      }
    }
    return db;
  };

  const firestoreRestBase = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId || '(default)'}/documents`;

  function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
    const fields: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) {
        fields[key] = { nullValue: null };
      } else if (typeof value === "string") {
        fields[key] = { stringValue: value };
      } else if (typeof value === "number") {
        if (Number.isInteger(value)) {
          fields[key] = { integerValue: String(value) };
        } else {
          fields[key] = { doubleValue: value };
        }
      } else if (typeof value === "boolean") {
        fields[key] = { booleanValue: value };
      } else if (Array.isArray(value)) {
        fields[key] = {
          arrayValue: {
            values: value.map(v => {
              if (typeof v === "object" && v !== null) {
                return { mapValue: { fields: toFirestoreFields(v) } };
              }
              return toFirestoreFields({ v }).v;
            })
          }
        };
      } else if (typeof value === "object") {
        fields[key] = { mapValue: { fields: toFirestoreFields(value) } };
      }
    }
    return fields;
  }

  function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
    const res: Record<string, any> = {};
    if (!fields) return res;
    for (const [key, valObj] of Object.entries(fields)) {
      if (valObj.stringValue !== undefined) res[key] = valObj.stringValue;
      else if (valObj.integerValue !== undefined) res[key] = Number(valObj.integerValue);
      else if (valObj.doubleValue !== undefined) res[key] = Number(valObj.doubleValue);
      else if (valObj.booleanValue !== undefined) res[key] = valObj.booleanValue;
      else if (valObj.nullValue !== undefined) res[key] = null;
      else if (valObj.timestampValue !== undefined) res[key] = valObj.timestampValue;
      else if (valObj.mapValue?.fields) res[key] = fromFirestoreFields(valObj.mapValue.fields);
      else if (valObj.arrayValue?.values) {
        res[key] = valObj.arrayValue.values.map((v: any) => {
          if (v.mapValue?.fields) return fromFirestoreFields(v.mapValue.fields);
          return fromFirestoreFields({ v }).v;
        });
      }
    }
    return res;
  }

  const getDocRest = async (collectionName: string, docId: string): Promise<any | null> => {
    try {
      const url = `${firestoreRestBase}/${collectionName}/${docId}?key=${firebaseConfig.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.fields) return null;
      return fromFirestoreFields(data.fields);
    } catch {
      return null;
    }
  };

  const setDocRest = async (collectionName: string, docId: string, data: Record<string, any>): Promise<boolean> => {
    try {
      const cleanData = { ...data };
      if (!cleanData.createdAt) cleanData.createdAt = new Date().toISOString();
      cleanData.updatedAt = new Date().toISOString();

      const url = `${firestoreRestBase}/${collectionName}/${docId}?key=${firebaseConfig.apiKey}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(cleanData) })
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const app = express();

  // CORS: Allow MAURITOP Vercel production frontend, AI Studio preview, and local development
  const allowedOrigins = [
    "https://mauritop-v2-4ozx.vercel.app",
    "http://localhost:3000"
  ];

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") || origin.endsWith(".ai.studio") || origin.endsWith(".run.app")) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

  // Durable upload endpoint: always writes to the configured Firebase Storage bucket.
  // The local filesystem is intentionally not used because serverless instances are ephemeral.
  app.post("/api/upload", async (req, res) => {
    try {
      const body = req.body || {};
      const data = body.data;
      const requestedPath = body.path;

      if (typeof data !== "string" || typeof requestedPath !== "string") {
        return res.status(400).json({ error: "DATA_REQUIRED", message: "بيانات الصورة ومسار التخزين مطلوبان" });
      }

      const pathParts = requestedPath.split("/");
      if (pathParts.length !== 2) {
        return res.status(400).json({ error: "INVALID_UPLOAD_PATH", message: "مسار رفع الملف غير صالح" });
      }

      const folder = pathParts[0];
      const requestedName = pathParts[1];
      const allowedFolders = ["services", "posts", "receipts", "kyc"];
      if (!allowedFolders.includes(folder) || !/^[A-Za-z0-9_-]{1,140}\.(?:webp|jpe?g|png|gif)$/i.test(requestedName)) {
        return res.status(400).json({ error: "INVALID_UPLOAD_PATH", message: "نوع أو اسم مسار الملف غير مسموح" });
      }

      const matches = data.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/i);
      if (!matches) {
        return res.status(415).json({ error: "UNSUPPORTED_FILE_TYPE", message: "يسمح فقط بصور JPEG وPNG وWEBP وGIF" });
      }

      const mimeType = matches[1].toLowerCase();
      const base64Payload = matches[2].replace(/\s/g, "");
      const buffer = Buffer.from(base64Payload, "base64");
      if (!buffer.length || buffer.toString("base64").replace(/=+$/, "") !== base64Payload.replace(/=+$/, "")) {
        return res.status(400).json({ error: "INVALID_FILE_DATA", message: "بيانات الصورة غير مكتملة أو غير صالحة" });
      }

      const maxBytes = 8 * 1024 * 1024;
      if (buffer.length > maxBytes) {
        return res.status(413).json({ error: "FILE_TOO_LARGE", message: "الحد الأقصى لحجم الصورة هو 8 ميجابايت" });
      }

      const hasSignature = (
        (mimeType === "image/jpeg" && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
        (mimeType === "image/png" && buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
        (mimeType === "image/webp" && buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") ||
        (mimeType === "image/gif" && buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.toString("ascii", 0, 6)))
      );
      if (!hasSignature) {
        return res.status(415).json({ error: "FILE_SIGNATURE_MISMATCH", message: "محتوى الملف لا يطابق نوع الصورة المعلن" });
      }

      // Receipts may be attached by guests. Every other folder requires a verified Firebase identity.
      const tokenSupplied = hasSuppliedAuthToken(req);
      const decoded = await verifyAuthToken(req);
      if (tokenSupplied && !decoded) {
        return res.status(401).json({ error: "TOKEN_INVALID", message: "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً." });
      }

      if (folder !== "receipts" && !decoded) {
        return res.status(401).json({ error: "AUTH_REQUIRED", message: "يجب تسجيل الدخول قبل رفع هذا الملف" });
      }

      if (folder === "kyc") {
        if (!decoded || !requestedName.startsWith(`${decoded.uid}_`)) {
          return res.status(403).json({ error: "UPLOAD_FORBIDDEN", message: "لا يمكنك رفع مستندات تخص حساباً آخر" });
        }
      }

      if (folder === "services" || folder === "posts") {
        if (!decoded) {
          return res.status(401).json({ error: "AUTH_REQUIRED", message: "تسجيل دخول الإدارة مطلوب" });
        }
        if (!isOwnerUser(decoded)) {
          const firestore = getDb();
          const [staffSnap, userSnap] = await Promise.all([
            firestore.collection("staff").doc(decoded.uid).get(),
            firestore.collection("users").doc(decoded.uid).get()
          ]);
          const staffRole = staffSnap.exists && staffSnap.data()?.active === true ? staffSnap.data()?.role : null;
          const userData = userSnap.exists ? userSnap.data() : {};
          const userRole = userData?.staffRole || userData?.role;
          const allowedStaffRoles = folder === "services"
            ? ["admin", "services_manager"]
            : ["admin", "services_manager", "content_manager"];
          if (!allowedStaffRoles.includes(staffRole) && userRole !== "admin" && userRole !== "services_manager") {
            return res.status(403).json({ error: "UPLOAD_FORBIDDEN", message: "ليست لديك صلاحية رفع ملفات الإدارة" });
          }
        }
      }

      if (!adminApp || adminInitStatus !== "initialized") {
        return res.status(503).json({ error: "STORAGE_BACKEND_UNAVAILABLE", message: "التخزين السحابي غير مهيأ على الخادم. يرجى المحاولة لاحقاً." });
      }

      const bucketName = firebaseConfig.storageBucket;
      if (!bucketName) {
        return res.status(503).json({ error: "STORAGE_BUCKET_NOT_CONFIGURED", message: "لم يتم ضبط حاوية تخزين Firebase لهذا المشروع" });
      }

      const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : mimeType === "image/gif" ? "gif" : "webp";
      const requestedBase = requestedName.replace(/\.[^.]+$/, "");
      const safeBase = requestedBase.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100) || "image";
      const randomSuffix = crypto.randomBytes(12).toString("hex");
      const finalFileName = `${safeBase}_${Date.now()}_${randomSuffix}.${extension}`;
      const objectPath = `${folder}/${finalFileName}`;
      const downloadToken = crypto.randomUUID();
      const bucket = getStorage(adminApp).bucket(bucketName);
      const fileRef = bucket.file(objectPath);

      await fileRef.save(buffer, {
        resumable: false,
        metadata: {
          contentType: mimeType,
          cacheControl: folder === "services" || folder === "posts" ? "public, max-age=31536000, immutable" : "private, no-store",
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
            uploadedBy: decoded?.uid || "guest",
            uploadedAt: new Date().toISOString()
          }
        }
      });

      const encodedObjectPath = encodeURIComponent(objectPath);
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedObjectPath}?alt=media&token=${downloadToken}`;
      return res.json({ success: true, url: downloadUrl, size: buffer.length, storage: "firebase" });
    } catch (err: any) {
      console.error("[Upload Error]:", err?.message || err);
      if (err?.code === 7 || err?.code === 403 || err?.code === 404) {
        return res.status(503).json({ error: "STORAGE_ACCESS_FAILED", message: "تعذر الوصول إلى حاوية التخزين. تحقق الإدارة من إعدادات Firebase Storage." });
      }
      return res.status(500).json({ error: "UPLOAD_FAILED", message: "فشل حفظ الصورة في التخزين السحابي" });
    }
  });

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/live' });
  const PORT = 3000;
  
  // Lazy init Gemini client to avoid crashes if API_KEY is missing
  let ai: GoogleGenAI | null = null;
  const getAi = () => {
    if (!ai) {
      if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY environment variable is required");
      ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
    return ai;
  };

  // Diagnostic routes with honest verification of Firebase Admin & Firestore
  app.get("/api/health", async (req, res) => {
    if (adminInitStatus !== "initialized" || !adminApp) {
      return res.status(503).json({
        status: "degraded",
        error: "FIREBASE_ADMIN_CREDENTIALS_MISSING",
        message: adminInitErrorMsg || "Firebase Admin service account credential is not configured on the server. Please configure FIREBASE_SERVICE_ACCOUNT_JSON in environment variables.",
        projectId: firebaseConfig.projectId,
        targetDatabase: firebaseConfig.firestoreDatabaseId,
        nodeEnv: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString()
      });
    }

    try {
      const firestore = getDb();
      // Quick non-blocking ping to verify Firestore can be reached
      await Promise.race([
        firestore.collection("settings").doc("global").get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 3000))
      ]);

      return res.json({
        status: "ok",
        firestore: "connected",
        projectId: firebaseConfig.projectId,
        targetDatabase: firebaseConfig.firestoreDatabaseId,
        nodeEnv: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString()
      });
    } catch (pingErr: any) {
      console.warn("[Health Check] Firestore connectivity warning:", pingErr?.message);
      return res.status(503).json({
        status: "degraded",
        error: "FIRESTORE_CONNECTIVITY_ERROR",
        message: pingErr?.message === "FIRESTORE_TIMEOUT" ? "Firestore connection timed out" : "Firestore backend unreachable with current credentials",
        projectId: firebaseConfig.projectId,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Safe minimal status endpoint (internal runtime info protected, no secrets leaked)
  app.get("/api/diagnostic/firebase-admin", (req, res) => {
    return res.json({
      status: adminInitStatus === "initialized" ? "ready" : "unconfigured",
      initialized: adminInitStatus === "initialized",
      targetProject: firebaseConfig.projectId,
      targetDatabase: firebaseConfig.firestoreDatabaseId,
      timestamp: new Date().toISOString()
    });
  });

  // Helper to verify Firebase ID Token (for authenticated user or admin requests)
  const verifyAuthToken = async (req: express.Request): Promise<admin.auth.DecodedIdToken | null> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split("Bearer ")[1];
    try {
      if (adminApp) {
        return await admin.auth(adminApp).verifyIdToken(token);
      }
    } catch (e) {
      console.warn("[Auth] Failed to verify ID token:", e);
    }
    return null;
  };

  const hasSuppliedAuthToken = (req: express.Request): boolean => {
    const authHeader = req.headers.authorization;
    return Boolean(authHeader && authHeader.startsWith("Bearer ") && authHeader.split("Bearer ")[1]?.trim());
  };

  const isOwnerUser = (decoded: admin.auth.DecodedIdToken | null) => {
    if (!decoded) return false;
    const email = (decoded.email || "").toLowerCase().trim();
    return email === "khyhajmr08@gmail.com" || decoded.uid === "PqXqqCgdC1eYPz4HKHHLtDRejPD3";
  };

  // Maintenance Middleware for Order Endpoints (Resilient check with REST fallback)
  const checkMaintenance = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const firestore = getDb();
      const settingsDoc = await firestore.collection("settings").doc("global").get();
      const isMaintenance = settingsDoc.exists && settingsDoc.data()?.maintenanceMode === true;

      if (isMaintenance) {
        const decoded = await verifyAuthToken(req);
        if (decoded && isOwnerUser(decoded)) return next();
        return res.status(503).json({
          error: "MAINTENANCE_MODE",
          message: "المنصة قيد الصيانة المجدولة حالياً لتحسين الخدمات. لا يمكن قبول طلبات جديدة في الوقت الحالي."
        });
      }
      return next();
    } catch (err: any) {
      console.error("[Maintenance Check] Could not verify platform status:", err?.message || err);
      return res.status(503).json({
        error: "MAINTENANCE_STATUS_UNAVAILABLE",
        message: "تعذر التحقق من حالة المنصة حالياً. لم يتم قبول الطلب، يرجى المحاولة لاحقاً."
      });
    }
  };

  // Server-authoritative reward withdrawal request. The balance deduction and request creation are atomic.
  app.post("/api/withdrawals", async (req, res) => {
    try {
      const decoded = await verifyAuthToken(req);
      if (!decoded) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "يرجى تسجيل الدخول قبل طلب سحب الأرباح" });
      }

      const amount = Number(req.body?.amount);
      const bankilyPhone = String(req.body?.bankilyPhone || "").replace(/\D/g, "").slice(-8);
      if (!Number.isSafeInteger(amount) || amount < 500) {
        return res.status(400).json({ error: "INVALID_WITHDRAWAL_AMOUNT", message: "الحد الأدنى للسحب هو 500 أوقية جديدة" });
      }
      if (!/^\d{8}$/.test(bankilyPhone)) {
        return res.status(400).json({ error: "INVALID_WITHDRAWAL_PHONE", message: "يرجى إدخال رقم بنكيلي صحيح مكوّن من 8 أرقام" });
      }

      const firestore = getDb();
      const userRef = firestore.collection("users").doc(decoded.uid);
      const withdrawalLockRef = firestore.collection("withdrawal_locks").doc(decoded.uid);
      const legacyUserWithdrawals = firestore.collection("withdrawals")
        .where("userId", "==", decoded.uid);

      const result = await firestore.runTransaction(async (transaction) => {
        const [userSnap, lockSnap, previousWithdrawalsSnap] = await Promise.all([
          transaction.get(userRef),
          transaction.get(withdrawalLockRef),
          transaction.get(legacyUserWithdrawals)
        ]);
        if (!userSnap.exists) throw new Error("WITHDRAWAL_USER_NOT_FOUND");
        const userData = userSnap.data() || {};
        if (userData.blocked === true) throw new Error("WITHDRAWAL_USER_BLOCKED");

        const hasPendingLock = lockSnap.exists && lockSnap.data()?.status === "pending";
        const hasLegacyPending = previousWithdrawalsSnap.docs.some((withdrawal) => withdrawal.data()?.status === "pending");
        if (hasPendingLock || hasLegacyPending) throw new Error("WITHDRAWAL_ALREADY_PENDING");

        const currentPoints = Number(userData.loyaltyPoints || 0);
        if (!Number.isSafeInteger(currentPoints) || currentPoints < amount) {
          throw new Error("WITHDRAWAL_INSUFFICIENT_POINTS");
        }

        const withdrawalRef = firestore.collection("withdrawals").doc();
        transaction.update(userRef, {
          loyaltyPoints: currentPoints - amount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.set(withdrawalRef, {
          userId: decoded.uid,
          userName: userData.name || decoded.name || decoded.email?.split("@")[0] || "مستخدم",
          userEmail: userData.email || decoded.email || "",
          amount,
          bankilyPhone,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          adminNote: ""
        });
        transaction.set(withdrawalLockRef, {
          withdrawalId: withdrawalRef.id,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { withdrawalId: withdrawalRef.id, remainingPoints: currentPoints - amount };
      });

      return res.status(201).json({ success: true, ...result });
    } catch (err: any) {
      if (err.message === "WITHDRAWAL_USER_NOT_FOUND") {
        return res.status(404).json({ error: err.message, message: "ملف المستخدم غير موجود" });
      }
      if (err.message === "WITHDRAWAL_USER_BLOCKED") {
        return res.status(403).json({ error: err.message, message: "الحساب محظور من طلب سحب الأرباح" });
      }
      if (err.message === "WITHDRAWAL_ALREADY_PENDING") {
        return res.status(409).json({ error: err.message, message: "لديك طلب سحب قيد المراجعة بالفعل" });
      }
      if (err.message === "WITHDRAWAL_INSUFFICIENT_POINTS") {
        return res.status(400).json({ error: err.message, message: "رصيد المكافآت غير كافٍ لإتمام هذا السحب" });
      }
      console.error("[Withdrawal Request Error]:", err?.message || err);
      return res.status(503).json({ error: "WITHDRAWAL_UNAVAILABLE", message: "تعذر إنشاء طلب السحب حالياً. لم يتم خصم أي رصيد." });
    }
  });

  // Owner-only withdrawal approval/rejection. Rejections refund the held balance exactly once.
  app.post("/api/admin/withdrawals/:withdrawalId/status", async (req, res) => {
    try {
      const decoded = await verifyAuthToken(req);
      if (!decoded) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "تسجيل الدخول الإداري مطلوب" });
      }
      const firestore = getDb();
      if (!isOwnerUser(decoded)) {
        const [staffSnap, userSnap] = await Promise.all([
          firestore.collection("staff").doc(decoded.uid).get(),
          firestore.collection("users").doc(decoded.uid).get()
        ]);
        const staffRole = staffSnap.exists && staffSnap.data()?.active === true ? staffSnap.data()?.role : null;
        const userRole = userSnap.exists ? userSnap.data()?.role : null;
        if (!["admin", "finance_manager"].includes(staffRole) && userRole !== "admin") {
          return res.status(403).json({ error: "FORBIDDEN", message: "ليست لديك صلاحية إدارة طلبات السحب" });
        }
      }

      const targetStatus = String(req.body?.status || "").toLowerCase();
      const adminNote = String(req.body?.adminNote || "").trim();
      if (!["approved", "rejected"].includes(targetStatus)) {
        return res.status(400).json({ error: "INVALID_WITHDRAWAL_STATUS", message: "حالة طلب السحب غير صالحة" });
      }
      if (targetStatus === "rejected" && !adminNote) {
        return res.status(400).json({ error: "REJECTION_REASON_REQUIRED", message: "سبب رفض طلب السحب إلزامي" });
      }

      const withdrawalRef = firestore.collection("withdrawals").doc(req.params.withdrawalId);
      const result = await firestore.runTransaction(async (transaction) => {
        const withdrawalSnap = await transaction.get(withdrawalRef);
        if (!withdrawalSnap.exists) throw new Error("WITHDRAWAL_NOT_FOUND");
        const withdrawal = withdrawalSnap.data() || {};
        if (withdrawal.status !== "pending") throw new Error("WITHDRAWAL_ALREADY_PROCESSED");

        const withdrawalLockRef = firestore.collection("withdrawal_locks").doc(String(withdrawal.userId || ""));
        const withdrawalLockSnap = await transaction.get(withdrawalLockRef);

        if (targetStatus === "rejected") {
          const userRef = firestore.collection("users").doc(String(withdrawal.userId || ""));
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists) throw new Error("WITHDRAWAL_USER_NOT_FOUND");
          const currentPoints = Number(userSnap.data()?.loyaltyPoints || 0);
          const amount = Number(withdrawal.amount || 0);
          if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("WITHDRAWAL_AMOUNT_INVALID");
          transaction.update(userRef, {
            loyaltyPoints: currentPoints + amount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        transaction.update(withdrawalRef, {
          status: targetStatus,
          adminNote: targetStatus === "rejected" ? adminNote : "",
          processedBy: decoded.uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        if (withdrawalLockSnap.exists && withdrawalLockSnap.data()?.withdrawalId === withdrawalSnap.id) {
          transaction.delete(withdrawalLockRef);
        }

        const notificationRef = firestore.collection("notifications").doc();
        transaction.set(notificationRef, {
          userId: withdrawal.userId,
          title: targetStatus === "approved" ? "تم سحب الأرباح بنجاح" : "تم رفض طلب سحب الأرباح",
          body: targetStatus === "approved"
            ? `تمت الموافقة على تحويل مبلغ ${withdrawal.amount} أوقية إلى حساب بنكيلي المنتهي بـ ${String(withdrawal.bankilyPhone || "").slice(-4)}.`
            : `تم رفض طلب السحب وإعادة ${withdrawal.amount} أوقية إلى رصيدك. السبب: ${adminNote}`,
          read: false,
          type: targetStatus === "approved" ? "success" : "error",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, status: targetStatus, refunded: targetStatus === "rejected" };
      });

      return res.json(result);
    } catch (err: any) {
      if (err.message === "WITHDRAWAL_NOT_FOUND") {
        return res.status(404).json({ error: err.message, message: "طلب السحب غير موجود" });
      }
      if (err.message === "WITHDRAWAL_ALREADY_PROCESSED") {
        return res.status(409).json({ error: err.message, message: "تمت معالجة طلب السحب مسبقاً" });
      }
      if (err.message === "WITHDRAWAL_USER_NOT_FOUND") {
        return res.status(409).json({ error: err.message, message: "لا يمكن استرجاع الرصيد لأن ملف المستخدم غير موجود" });
      }
      if (err.message === "WITHDRAWAL_AMOUNT_INVALID") {
        return res.status(409).json({ error: err.message, message: "قيمة طلب السحب المخزنة غير صالحة" });
      }
      console.error("[Withdrawal Processing Error]:", err?.message || err);
      return res.status(503).json({ error: "WITHDRAWAL_PROCESSING_UNAVAILABLE", message: "تعذرت معالجة طلب السحب حالياً، لم يتم تأكيد أي تغيير." });
    }
  });

  // Secure Server-Authoritative Order Creation API (Supports Guests and Authenticated Users with Atomic Idempotency)
  app.post("/api/orders", checkMaintenance, async (req, res) => {
    try {
      const { 
        serviceId, 
        amount: requestedAmount, 
        fields: clientFields, 
        paymentMethod, 
        senderPhone, 
        proofImageUrl, 
        attemptId,
        guestEmail,
        guestName
      } = req.body;

      if (!serviceId) {
        return res.status(400).json({ error: "SERVICE_REQUIRED", message: "معرّف الخدمة مطلوب" });
      }

      if (!attemptId || typeof attemptId !== "string" || attemptId.trim().length < 8) {
        return res.status(400).json({ error: "ATTEMPT_ID_REQUIRED", message: "رمز المحاولة (attemptId) غير صالح" });
      }

      const clientAttemptId = attemptId.trim();
      if (!/^[A-Za-z0-9_-]{8,128}$/.test(clientAttemptId)) {
        return res.status(400).json({ error: "ATTEMPT_ID_INVALID", message: "رمز المحاولة يحتوي على أحرف غير مسموح بها" });
      }

      let firestore: Firestore;
      try {
        firestore = getDb();
      } catch (dbErr: any) {
        console.error("[Order Creation] Admin Firestore is unavailable:", dbErr?.message || dbErr);
        return res.status(503).json({
          error: "ORDER_BACKEND_UNAVAILABLE",
          message: "خدمة حفظ الطلبات غير جاهزة حالياً. لم يتم تسجيل طلبك، يرجى المحاولة لاحقاً."
        });
      }

      // Server-side fallback catalog mirrors the current public SERVICES catalog.
      // Firestore records override these defaults whenever an administrator has customized a service.
      const defaultServices: Record<string, any> = {
        pubg: {
          name: "PUBG Mobile", nameAr: "شحن شدات ببجي موبايل (PUBG UC)", status: "active", pricingMode: "package",
          packages: [
            { amount: 55, quantity: 60, title: "60 UC" },
            { amount: 240, quantity: 325, title: "325 UC" },
            { amount: 470, quantity: 660, title: "660 UC" },
            { amount: 1190, quantity: 1800, title: "1800 UC" },
            { amount: 2290, quantity: 3850, title: "3850 UC" },
            { amount: 4490, quantity: 8100, title: "8100 UC" }
          ],
          fields: [
            { id: "playerId", labelAr: "معرف اللاعب", required: true, pattern: "^[0-9]+$" },
            { id: "phone", labelAr: "رقم الهاتف", required: true, pattern: "^[0-9]{8,15}$" }
          ]
        },
        freefire: {
          name: "Free Fire", nameAr: "شحن جواهر فري فاير (Free Fire)", status: "active", pricingMode: "package",
          packages: [
            { amount: 45, quantity: 100, title: "100 جوهرة" },
            { amount: 135, quantity: 310, title: "310 جوهرة" },
            { amount: 220, quantity: 520, title: "520 جوهرة" },
            { amount: 440, quantity: 1060, title: "1060 جوهرة" },
            { amount: 880, quantity: 2180, title: "2180 جوهرة" }
          ],
          fields: [
            { id: "playerId", labelAr: "معرف اللاعب", required: true, pattern: "^[0-9]+$" },
            { id: "phone", labelAr: "رقم الهاتف", required: true, pattern: "^[0-9]{8,15}$" }
          ]
        },
        "cod-mobile": {
          name: "Call of Duty Mobile", nameAr: "شحن CP كول أوف ديوتي موبايل", status: "active", pricingMode: "package",
          packages: [
            { amount: 55, quantity: 80, title: "80 CP" },
            { amount: 260, quantity: 420, title: "420 CP" },
            { amount: 520, quantity: 880, title: "880 CP" }
          ],
          fields: [
            { id: "playerId", labelAr: "معرف اللاعب", required: true, pattern: "^[0-9]+$" },
            { id: "phone", labelAr: "رقم الهاتف", required: true, pattern: "^[0-9]{8,15}$" }
          ]
        },
        "snapchat-plus": {
          name: "Snapchat Plus", nameAr: "اشتراك سناب شات بلس (Snapchat+)", status: "active", pricingMode: "package",
          packages: [
            { amount: 250, quantity: 3, title: "اشتراك 3 أشهر" },
            { amount: 490, quantity: 6, title: "اشتراك 6 أشهر" },
            { amount: 990, quantity: 12, title: "اشتراك سنة كاملة (12 شهر)" }
          ],
          fields: [
            { id: "username", labelAr: "اسم المستخدم", required: true },
            { id: "phone", labelAr: "رقم الهاتف", required: true, pattern: "^[0-9]{8,15}$" }
          ]
        },
        "tod-vip": {
          name: "TOD VIP - 1 Mois", nameAr: "تود VIP - شهر واحد", status: "active", pricingMode: "fixed", priceMru: 180,
          fields: [{ id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }]
        },
        "shahid-vip": {
          name: "Shahid VIP - 1 Mois", nameAr: "شاهد VIP - شهر واحد", status: "active", pricingMode: "fixed", priceMru: 150,
          fields: [{ id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }]
        },
        netflix: {
          name: "Netflix - 1 Mois", nameAr: "نتفليكس - شهر واحد", status: "active", pricingMode: "fixed", priceMru: 250,
          fields: [{ id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }]
        },
        "spotify-premium": {
          name: "Spotify Premium - 1 Mois", nameAr: "سبوتيفاي بريميوم - شهر واحد", status: "active", pricingMode: "fixed", priceMru: 120,
          fields: [{ id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }]
        },
        "apple-10": {
          name: "Apple Gift Card 10$ (US)", nameAr: "بطاقة آبل 10 دولار (متجر أمريكي US)", status: "active", pricingMode: "fixed", priceMru: 450,
          packages: [{ amount: 450, quantity: 1, title: "بطاقة 10$ (متجر US)" }],
          fields: [
            { id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
            { id: "phone", labelAr: "رقم الهاتف", required: true, pattern: "^[0-9]{8,15}$" }
          ]
        },
        "chatgpt-plus": {
          name: "ChatGPT Plus", nameAr: "اشتراك شات جي بي تي بلس (ChatGPT Plus)", status: "active", pricingMode: "fixed", priceMru: 850,
          packages: [{ amount: 850, quantity: 30, title: "اشتراك 30 يوماً" }],
          fields: [
            { id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
            { id: "phone", labelAr: "رقم الهاتف", required: true, pattern: "^[0-9]{8,15}$" }
          ]
        },
        "apple-25": {
          name: "Apple Gift Card 25$", nameAr: "بطاقة آبل 25 دولار", status: "active", pricingMode: "fixed", priceMru: 1250,
          fields: [{ id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }]
        },
        "playstation-10": {
          name: "PlayStation Card 10$", nameAr: "بطاقة بلايستيشن 10 دولار", status: "active", pricingMode: "fixed", priceMru: 520,
          fields: [{ id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }]
        },
        "googleplay-10": {
          name: "Google Play Card 10$", nameAr: "بطاقة جوجل بلاي 10 دولار", status: "active", pricingMode: "fixed", priceMru: 520,
          fields: [{ id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }]
        },
        "fb-ads": {
          name: "Facebook Ads", nameAr: "إعلانات فيسبوك", status: "active", pricingMode: "range", minAmountMru: 100, maxAmountMru: 10000,
          fields: [
            { id: "pageLink", labelAr: "رابط الصفحة", required: true, pattern: "^https://.*$" },
            { id: "budgetMru", labelAr: "الميزانية", required: true, pattern: "^[0-9]+$" },
            { id: "objective", labelAr: "هدف الحملة", required: true },
            { id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }
          ]
        },
        "fb-verification": {
          name: "Facebook Verification Help", nameAr: "مساعدة طلب توثيق فيسبوك", status: "active", pricingMode: "quote",
          fields: [
            { id: "profileLink", labelAr: "رابط الحساب", required: true, pattern: "^https://.*$" },
            { id: "username", labelAr: "اسم المستخدم", required: true },
            { id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }
          ]
        },
        "icloud-service": {
          name: "iCloud Service", nameAr: "خدمة آي كلاود", status: "active", pricingMode: "fixed", priceMru: 150,
          fields: [{ id: "appleIdEmail", labelAr: "بريد Apple ID", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }]
        },
        "visa-recharge": {
          name: "Visa Virtual Recharge", nameAr: "شحن فيزا افتراضية", status: "active", pricingMode: "range", minAmountMru: 100, maxAmountMru: 5000,
          fields: [
            { id: "cardId", labelAr: "رقم البطاقة", required: true, pattern: "^[0-9A-Za-z]+$" },
            { id: "amountMru", labelAr: "المبلغ", required: true, pattern: "^[0-9]+$" },
            { id: "email", labelAr: "البريد الإلكتروني", required: true, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" }
          ]
        },
        // Legacy built-in game services retained for records/catalog compatibility.
        mobilelegends: {
          name: "Mobile Legends", nameAr: "شحن ماسات موبايل ليجندز", status: "active", pricingMode: "packages",
          packages: [
            { amount: 50, quantity: 80, title: "80 ماسة" },
            { amount: 100, quantity: 160, title: "160 ماسة" }
          ],
          fields: [{ id: "playerId", labelAr: "معرف اللاعب", required: true }]
        },
        fifa: {
          name: "EA Sports FC", nameAr: "نقاط FC Mobile (فيفا موبايل)", status: "active", pricingMode: "packages",
          packages: [
            { amount: 100, quantity: 500, title: "500 نقطة FC" },
            { amount: 200, quantity: 1200, title: "1200 نقطة FC" }
          ],
          fields: [{ id: "playerId", labelAr: "معرف اللاعب", required: true }]
        }
      };


      // 1. Fetch Trusted Service Configuration
      let serviceData: any = null;
      let serviceHasDbRecord = false;
      try {
        const serviceDoc = await firestore.collection("services").doc(serviceId).get();
        if (serviceDoc.exists) {
          serviceData = serviceDoc.data();
          serviceHasDbRecord = true;
        }
      } catch (serviceErr: any) {
        console.error("[Order Creation] Service lookup failed:", serviceErr?.message || serviceErr);
        return res.status(503).json({ error: "SERVICE_LOOKUP_UNAVAILABLE", message: "تعذر التحقق من الخدمة حالياً. يرجى المحاولة لاحقاً." });
      }

      if (!serviceData && defaultServices[serviceId]) {
        serviceData = defaultServices[serviceId];
      }

      if (!serviceData || serviceData.isDeleted === true || ['deleted', 'inactive', 'draft', 'unavailable', 'غير متوفر', 'متوقف', 'متوقفة', 'صيانة'].includes((serviceData.status || '').toLowerCase())) {
        return res.status(400).json({ error: "SERVICE_UNAVAILABLE", message: "هذه الخدمة غير متوفرة حالياً ولا يمكن قبول طلبات جديدة لها" });
      }

      const pricingMode = serviceData.pricingMode || "fixed";
      const isQuoteMode = pricingMode === "quote";

      // 2. Validate Payment Method Configuration
      let trustedPaymentMethod = paymentMethod;
      if (isQuoteMode) {
        trustedPaymentMethod = "quote";
      } else {
        if (!paymentMethod || typeof paymentMethod !== "string") {
          return res.status(400).json({ error: "PAYMENT_METHOD_REQUIRED", message: "يرجى تحديد طريقة دفع صالحة" });
        }

        let paymentMethods: any = null;
        try {
          const paymentSettingsDoc = await firestore.collection("settings").doc("payment_methods").get();
          paymentMethods = paymentSettingsDoc.exists ? paymentSettingsDoc.data()?.methods || paymentSettingsDoc.data() : null;
        } catch (paymentErr: any) {
          console.error("[Order Creation] Payment settings lookup failed:", paymentErr?.message || paymentErr);
          return res.status(503).json({ error: "PAYMENT_SETTINGS_UNAVAILABLE", message: "تعذر التحقق من طرق الدفع حالياً. لم يتم قبول الطلب." });
        }

        // Match the application's configured defaults; never activate unknown wallets implicitly.
        if (!paymentMethods) {
          paymentMethods = {
            bankily: { enabled: true, labelAr: "بنكيلي", labelFr: "Bankily" },
            sadad: { enabled: true, labelAr: "سداد", labelFr: "Sedad" },
            gaza: { enabled: false, labelAr: "غزة باي", labelFr: "GazaPay" }
          };
        }

        const methodConfig = paymentMethods ? paymentMethods[paymentMethod] : null;

        if (!methodConfig) {
          return res.status(400).json({ error: "PAYMENT_METHOD_INVALID", message: "طريقة الدفع المحددة غير معروفة" });
        }

        if (methodConfig.enabled === false) {
          return res.status(400).json({ 
            error: "PAYMENT_METHOD_DISABLED", 
            message: `طريقة الدفع (${methodConfig.labelAr || paymentMethod}) معطلة حالياً. يرجى اختيار وسيلة أخرى.` 
          });
        }
      }

      // 3. Compute and Validate the amount using trusted server-side configuration only.
      let finalAmount = 0;
      if (!isQuoteMode) {
        const parsedClientAmount = Number(requestedAmount);
        if (!Number.isSafeInteger(parsedClientAmount) || parsedClientAmount <= 0) {
          return res.status(400).json({ error: "INVALID_AMOUNT", message: "المبلغ المطلوب يجب أن يكون رقماً صحيحاً موجباً بالأوقية MRU" });
        }

        // Use the server catalog only when no admin Firestore record exists.
        // An explicit empty package list in Firestore must not be overridden by stale built-in packages.
        const configuredPackages = Array.isArray(serviceData.packages)
          ? serviceData.packages
          : (!serviceHasDbRecord ? (defaultServices[serviceId]?.packages || []) : []);
        const hasCustomBounds = serviceData.minAmountMru !== undefined || serviceData.minAmount !== undefined ||
          serviceData.maxAmountMru !== undefined || serviceData.maxAmount !== undefined;

        if (pricingMode === "range" || pricingMode === "custom" || serviceData.allowCustomAmount === true) {
          const rawMin = serviceData.minAmountMru ?? serviceData.minAmount;
          const rawMax = serviceData.maxAmountMru ?? serviceData.maxAmount;
          const min = Number(rawMin);
          const max = Number(rawMax);
          if (!hasCustomBounds || !Number.isSafeInteger(min) || min <= 0 || !Number.isSafeInteger(max) || max < min) {
            return res.status(409).json({ error: "SERVICE_PRICING_NOT_CONFIGURED", message: "نطاق سعر هذه الخدمة غير مكتمل. يرجى مراجعة الإدارة قبل الشراء." });
          }
          if (parsedClientAmount < min || parsedClientAmount > max) {
            return res.status(400).json({
              error: "AMOUNT_OUT_OF_RANGE",
              message: `المبلغ يجب أن يكون بين ${min} و ${max} MRU`
            });
          }
          finalAmount = parsedClientAmount;
        } else if (configuredPackages.length > 0) {
          const validPackage = configuredPackages.find((p: any) => Number(p.amount) === parsedClientAmount);
          if (!validPackage) {
            return res.status(400).json({
              error: "INVALID_PACKAGE_PRICE",
              message: `المبلغ المطلوب (${parsedClientAmount} MRU) لا يتطابق مع باقات الخدمة الحالية.`
            });
          }
          finalAmount = parsedClientAmount;
        } else if (pricingMode === "fixed") {
          const expectedPrice = Number(serviceData.priceMru ?? serviceData.suggestedPrice ?? serviceData.price ?? 0);
          if (!Number.isSafeInteger(expectedPrice) || expectedPrice <= 0) {
            return res.status(409).json({ error: "SERVICE_PRICE_NOT_CONFIGURED", message: "لم يتم ضبط سعر صالح لهذه الخدمة. يرجى مراجعة الإدارة." });
          }
          if (parsedClientAmount !== expectedPrice) {
            return res.status(400).json({ error: "PRICE_MISMATCH", message: `سعر الخدمة الرسمي هو ${expectedPrice} MRU` });
          }
          finalAmount = expectedPrice;
        } else {
          return res.status(409).json({ error: "UNSUPPORTED_PRICING_MODE", message: "طريقة تسعير هذه الخدمة غير مهيأة بشكل آمن. يرجى مراجعة الإدارة." });
        }

        // Paid orders must reference a completed Firebase Storage receipt upload.
        if (!proofImageUrl || typeof proofImageUrl !== "string" || proofImageUrl.trim() === "" || proofImageUrl === "receipt_attached") {
          return res.status(400).json({
            error: "RECEIPT_REQUIRED",
            message: "إيصال التحويل البنكي مطلوب. يرجى إرفاق صورة إيصال الدفع."
          });
        }

        try {
          const receiptUrl = new URL(proofImageUrl.trim());
          const bucketPrefix = `/v0/b/${firebaseConfig.storageBucket}/o/`;
          const objectName = receiptUrl.pathname.startsWith(bucketPrefix)
            ? decodeURIComponent(receiptUrl.pathname.slice(bucketPrefix.length))
            : "";
          const downloadToken = receiptUrl.searchParams.get("token") || "";
          if (receiptUrl.origin !== "https://firebasestorage.googleapis.com" ||
              !objectName.startsWith(`receipts/${clientAttemptId}_`) ||
              receiptUrl.searchParams.get("alt") !== "media" ||
              !downloadToken ||
              !adminApp ||
              !firebaseConfig.storageBucket) {
            throw new Error("INVALID_RECEIPT_URL");
          }

          // Verify the uploaded receipt really exists, is an image, and owns the supplied download token.
          const receiptFile = getStorage(adminApp).bucket(firebaseConfig.storageBucket).file(objectName);
          const [receiptMetadata] = await receiptFile.getMetadata();
          const storedTokens = String(receiptMetadata.metadata?.firebaseStorageDownloadTokens || "")
            .split(",")
            .map((value: string) => value.trim())
            .filter(Boolean);
          if (!String(receiptMetadata.contentType || "").startsWith("image/") || !storedTokens.includes(downloadToken)) {
            throw new Error("INVALID_RECEIPT_METADATA");
          }
        } catch {
          return res.status(400).json({
            error: "INVALID_RECEIPT_URL",
            message: "تعذر التحقق من إيصال الدفع أو أنه لا يخص محاولة الطلب الحالية. يرجى إعادة رفع الإيصال."
          });
        }
      }

      // 4. Validate required service fields from the trusted Firestore record or the server catalog.
      const fieldPatternById: Record<string, string> = {
        playerId: "^[0-9]+$",
        gameId: "^[0-9]+$",
        email: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
        appleIdEmail: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
        phone: "^[0-9]{8,15}$",
        amountMru: "^[0-9]+$",
        budgetMru: "^[0-9]+$",
        cardId: "^[0-9A-Za-z]+$",
        pageLink: "^https://.*$",
        profileLink: "^https://.*$"
      };
      const fallbackFields = defaultServices[serviceId]?.fields || [];
      const declaredRequiredIds = Array.isArray(serviceData.requiredFields) ? serviceData.requiredFields : [];
      const declaredOptionalIds = Array.isArray(serviceData.optionalFields) ? serviceData.optionalFields : [];
      const declaredFieldIds = Array.from(new Set([...declaredRequiredIds, ...declaredOptionalIds]));
      const serviceFields = Array.isArray(serviceData.fields) && serviceData.fields.length > 0
        ? serviceData.fields
        : (declaredFieldIds.length > 0
            ? declaredFieldIds.map((id: string) => ({
                id,
                labelAr: id,
                required: declaredRequiredIds.includes(id),
                pattern: fieldPatternById[id]
              }))
            : fallbackFields);

      if (!clientFields || typeof clientFields !== "object" || Array.isArray(clientFields)) {
        return res.status(400).json({ error: "FIELDS_INVALID", message: "بيانات حقول الخدمة غير صالحة" });
      }

      const safeFields: Record<string, any> = {};
      for (const field of serviceFields) {
        if (!field || typeof field.id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(field.id)) continue;
        const value = clientFields[field.id] !== undefined ? String(clientFields[field.id]).trim() : "";
        const label = field.labelAr || field.label || field.id;

        if (field.required && !value) {
          return res.status(400).json({ error: "FIELD_REQUIRED", message: `الحقل (${label}) مطلوب` });
        }

        const pattern = field.pattern || fieldPatternById[field.id];
        if (pattern && value) {
          try {
            if (!new RegExp(pattern).test(value)) {
              return res.status(400).json({ error: "FIELD_INVALID", message: `صيغة الحقل (${label}) غير صحيحة` });
            }
          } catch {
            console.error("[Order Creation] Invalid configured validation pattern for field:", field.id);
            return res.status(409).json({ error: "SERVICE_FIELD_RULE_INVALID", message: "إعدادات أحد حقول الخدمة غير صالحة. يرجى مراجعة الإدارة." });
          }
        }
        if (field.minLength && value.length < Number(field.minLength)) {
          return res.status(400).json({ error: "FIELD_INVALID", message: `الحقل (${label}) أقصر من الحد المسموح` });
        }
        if (field.maxLength && value.length > Number(field.maxLength)) {
          return res.status(400).json({ error: "FIELD_INVALID", message: `الحقل (${label}) أطول من الحد المسموح` });
        }
        safeFields[field.id] = value;
      }

      // 5. Determine Authenticated User or Guest identity
      const tokenSupplied = hasSuppliedAuthToken(req);
      const decodedUser = await verifyAuthToken(req);

      // If token was supplied but invalid/expired: reject with 401 instead of silent downgrade
      if (tokenSupplied && !decodedUser) {
        return res.status(401).json({
          error: "TOKEN_INVALID",
          message: "جلسة تسجيل الدخول منتهية الصلاحية أو غير صالحة. يرجى إعادة تسجيل الدخول أو إتمام الطلب كزائر."
        });
      }

      const isGuest = !decodedUser;
      const effectiveUserId = decodedUser ? decodedUser.uid : `guest_${clientAttemptId.slice(0, 16)}`;
      const effectiveUserEmail = decodedUser ? (decodedUser.email || "") : (guestEmail ? String(guestEmail).trim() : "");
      const effectiveUserName = decodedUser 
        ? (decodedUser.name || decodedUser.email?.split('@')[0] || "عميل مسجل") 
        : (guestName ? String(guestName).trim() : "زائر ضيف");

      // Verify not blocked if authenticated
      if (decodedUser) {
        try {
          const userDoc = await firestore.collection("users").doc(decodedUser.uid).get();
          if (userDoc.exists && userDoc.data()?.blocked === true) {
            return res.status(403).json({ error: "USER_BLOCKED", message: "حسابك محظور من إجراء طلبات جديدة" });
          }
        } catch (authDocErr: any) {
          console.error("[Order Creation] Could not verify user status:", authDocErr?.message || authDocErr);
          return res.status(503).json({ error: "USER_STATUS_UNAVAILABLE", message: "تعذر التحقق من حالة الحساب. لم يتم قبول الطلب." });
        }
      }

      // Check if phone number is blocked across users
      if (senderPhone) {
        const cleanPhone = String(senderPhone).replace(/[^0-9]/g, '');
        if (cleanPhone.length >= 8) {
          try {
            const blockedPhoneSnap = await firestore.collection("users")
              .where("phoneNumber", "==", cleanPhone)
              .where("blocked", "==", true)
              .limit(1)
              .get();
            if (!blockedPhoneSnap.empty) {
              return res.status(403).json({ error: "PHONE_BLOCKED", message: "هذا الرقم محظور من إجراء طلبات جديدة" });
            }
          } catch (phoneErr: any) {
            console.error("[Order Creation] Could not verify sender phone status:", phoneErr?.message || phoneErr);
            return res.status(503).json({ error: "PHONE_STATUS_UNAVAILABLE", message: "تعذر التحقق من رقم المرسل. لم يتم قبول الطلب." });
          }
        }
      }

      // Concurrency-safe Active Duplicate Order Guard:
      // Prevent duplicate pending orders with identical service and recipient identifier
      const recipientId = safeFields.playerId || safeFields.email || safeFields.phone || safeFields.cardId || safeFields.username || senderPhone;
      if (recipientId && effectiveUserId) {
        try {
          const activeOrdersQuery = await firestore.collection("orders")
            .where("serviceId", "==", serviceId)
            .where("status", "==", "pending")
            .where("userId", "==", effectiveUserId)
            .limit(6)
            .get();

          const hasDuplicateActive = activeOrdersQuery.docs.some(docSnap => {
            const d = docSnap.data();
            if (d.attemptId === clientAttemptId) return false; // Handled by idempotency replay
            const prevRecipient = d.fields?.playerId || d.fields?.email || d.fields?.phone || d.fields?.cardId || d.fields?.username || d.senderPhone;
            return prevRecipient === recipientId;
          });

          if (hasDuplicateActive) {
            return res.status(409).json({
              error: "DUPLICATE_ACTIVE_ORDER",
              message: "يوجد طلب نشط قيد التنفيذ حالياً لنفس الحساب أو المستلم. يرجى الانتظار حتى اكتمال معالجة الطلب السابق."
            });
          }
        } catch (activeErr: any) {
          console.error("[Order Creation] Active order check failed:", activeErr?.message || activeErr);
          return res.status(503).json({ error: "ACTIVE_ORDER_CHECK_UNAVAILABLE", message: "تعذر التحقق من الطلبات النشطة. لم يتم قبول الطلب لتجنب التكرار." });
        }
      }

      // 6. Compute Cryptographic Payload Hash for Idempotency Protection
      const payloadString = JSON.stringify({
        serviceId,
        finalAmount,
        safeFields,
        trustedPaymentMethod,
        senderPhone: senderPhone ? String(senderPhone).trim() : "",
        effectiveUserId
      });
      const payloadHash = crypto.createHash("sha256").update(payloadString).digest("hex");

      // Stable cryptographic tracking token and secure hash for guest orders
      const trackingToken = crypto.randomBytes(24).toString("hex");
      const trackingTokenHash = crypto.createHash("sha256").update(trackingToken).digest("hex");

      // 7. Atomic Idempotency Check & Order Insertion (Admin SDK only).
      // Never fall back to client-rule REST writes: they are not atomic and can duplicate orders.
      let orderId = "";
      let trackingTokenResult: string | null = null;
      let isReplay = false;

      try {
        const idempotencyRef = firestore.collection("order_idempotency").doc(clientAttemptId);
        const transactionResult = await firestore.runTransaction(async (transaction) => {
          const idempSnap = await transaction.get(idempotencyRef);

          if (idempSnap.exists) {
            const prev = idempSnap.data();
            if (prev?.payloadHash !== payloadHash) {
              throw new Error("IDEMPOTENCY_PAYLOAD_MISMATCH");
            }
            return {
              isReplay: true,
              orderId: prev.orderId,
              trackingToken: prev.trackingToken || null
            };
          }

          const newOrderRef = firestore.collection("orders").doc();
          const newOrderId = newOrderRef.id;

          const orderData = {
            id: newOrderId,
            userId: effectiveUserId,
            isGuest: isGuest,
            userName: effectiveUserName,
            userEmail: effectiveUserEmail,
            serviceId: serviceId,
            serviceName: serviceData.nameAr || serviceData.name || "خدمة رقمية",
            serviceType: serviceData.nameAr || serviceData.name || "خدمة رقمية",
            amount: finalAmount,
            total: finalAmount,
            fee: 0,
            status: "pending",
            fields: safeFields,
            paymentMethod: trustedPaymentMethod,
            senderPhone: isQuoteMode ? "" : (senderPhone ? String(senderPhone).trim() : ""),
            proofImageUrl: proofImageUrl || "",
            proofUrl: proofImageUrl || "",
            attemptId: clientAttemptId,
            trackingToken: isGuest ? trackingToken : null,
            trackingTokenHash: isGuest ? trackingTokenHash : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          transaction.set(newOrderRef, orderData);

          transaction.set(idempotencyRef, {
            attemptId: clientAttemptId,
            orderId: newOrderId,
            payloadHash: payloadHash,
            trackingToken: isGuest ? trackingToken : null,
            trackingTokenHash: isGuest ? trackingTokenHash : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          return {
            isReplay: false,
            orderId: newOrderId,
            trackingToken: isGuest ? trackingToken : null
          };
        });

        orderId = transactionResult.orderId;
        trackingTokenResult = transactionResult.trackingToken;
        isReplay = transactionResult.isReplay;
      } catch (txErr: any) {
        if (txErr.message === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
          return res.status(409).json({
            error: "IDEMPOTENCY_CONFLICT",
            message: "رمز المحاولة هذا تم استخدامه مسبقاً ببيانات مختلفة. يرجى تحديث الصفحة وإعادة المحاولة."
          });
        }
        console.error("[Order Creation] Atomic Firestore transaction failed:", txErr?.message || txErr);
        return res.status(503).json({
          error: "ORDER_SAVE_UNAVAILABLE",
          message: "تعذر تأكيد حفظ الطلب في قاعدة البيانات. لم يتم اعتبار الطلب ناجحاً؛ يمكنك إعادة المحاولة بنفس الصفحة."
        });
      }

      return res.status(200).json({
        success: true,
        orderId: orderId,
        trackingToken: trackingTokenResult,
        isReplay: isReplay,
        serviceName: serviceData.nameAr || serviceData.name,
        amount: finalAmount,
        trackingUrl: trackingTokenResult ? `/orders?token=${trackingTokenResult}` : `/orders`
      });

    } catch (err: any) {
      if (err.message === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
        return res.status(409).json({ 
          error: "IDEMPOTENCY_CONFLICT", 
          message: "رمز المحاولة هذا تم استخدامه مسبقاً ببيانات مختلفة. يرجى تحديث الصفحة وإعادة المحاولة." 
        });
      }
      console.error("[Create Order Error]:", err);
      return res.status(500).json({ error: "INTERNAL_ERROR", message: "حدث خطأ غير متوقع أثناء حفظ الطلب" });
    }
  });

  // Guest Order Tracking Endpoint (Protected by Cryptographically Hashed Tracking Token)
  app.get("/api/orders/track", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string" || token.length < 16) {
        return res.status(400).json({ error: "TOKEN_REQUIRED", message: "رمز التتبع غير صالح" });
      }

      const cleanToken = token.trim();
      const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");
      const firestore = getDb();

      // Query by secure hash first, fallback to raw token for older historical orders
      let snapshot = await firestore.collection("orders")
        .where("trackingTokenHash", "==", tokenHash)
        .limit(1)
        .get();

      if (snapshot.empty) {
        snapshot = await firestore.collection("orders")
          .where("trackingToken", "==", cleanToken)
          .limit(1)
          .get();
      }

      if (snapshot.empty) {
        return res.status(404).json({ error: "ORDER_NOT_FOUND", message: "لم يتم العثور على طلب مطابق لرمز التتبع" });
      }

      const orderData = snapshot.docs[0].data();
      const toIso = (value: any) => {
        if (!value) return null;
        if (typeof value.toDate === "function") return value.toDate().toISOString();
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "string") return value;
        if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toISOString();
        return null;
      };

      return res.json({
        success: true,
        order: {
          id: snapshot.docs[0].id,
          isGuest: orderData.isGuest === true,
          userName: orderData.userName || "زائر",
          userEmail: orderData.userEmail || "",
          serviceId: orderData.serviceId || "",
          serviceName: orderData.serviceName || orderData.serviceType || "خدمة رقمية",
          serviceType: orderData.serviceType || orderData.serviceName || "خدمة رقمية",
          amount: orderData.amount,
          total: orderData.total ?? orderData.amount,
          status: orderData.status,
          fields: orderData.fields || {},
          paymentMethod: orderData.paymentMethod || "",
          senderPhone: orderData.senderPhone || "",
          proofImageUrl: orderData.proofImageUrl || orderData.proofUrl || "",
          pinCode: orderData.pinCode || null,
          adminNote: orderData.adminNote || null,
          rejectionReason: orderData.rejectionReason || null,
          createdAt: toIso(orderData.createdAt),
          updatedAt: toIso(orderData.updatedAt)
        }
      });
    } catch (err) {
      console.error("[Track Order Error]:", err);
      return res.status(500).json({ error: "INTERNAL_ERROR", message: "فشل التحقق من حالة الطلب" });
    }
  });

  // Privileged Order Status Update & Atomic Referral Reward Processing
  app.post("/api/admin/orders/:orderId/status", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, adminNote, rejectionReason, pinCode } = req.body;

      const decoded = await verifyAuthToken(req);
      if (!decoded) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "تسجيل الدخول الإداري مطلوب" });
      }

      const firestore = getDb();
      const isOwner = isOwnerUser(decoded);

      // Check staff role if not owner
      if (!isOwner) {
        const staffDoc = await firestore.collection("staff").doc(decoded.uid).get();
        const role = staffDoc.exists && staffDoc.data()?.active ? staffDoc.data()?.role : null;
        if (!['orders_manager', 'admin'].includes(role)) {
          return res.status(403).json({ error: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل حالة الطلب" });
        }
      }

      const validStatuses = ['pending', 'approved', 'shipped', 'completed', 'rejected'];
      const targetStatus = (status || '').toLowerCase();
      if (!validStatuses.includes(targetStatus)) {
        return res.status(400).json({ error: "INVALID_STATUS", message: "حالة الطلب غير صالحة" });
      }

      if (targetStatus === 'rejected' && (!rejectionReason || !String(rejectionReason).trim())) {
        return res.status(400).json({ error: "REJECTION_REASON_REQUIRED", message: "سبب الرفض إلزامي للعميل" });
      }

      const orderRef = firestore.collection("orders").doc(orderId);

      // Atomic Update with Referral Rewarding
      const updateResult = await firestore.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) {
          throw new Error("ORDER_NOT_FOUND");
        }
        const currentData = orderSnap.data() || {};
        const currentStatus = (currentData.status || "pending").toLowerCase();

        // Valid status transition rule enforcement:
        // Do not allow completed orders to be reverted to pending or approved without owner
        if (currentStatus === "completed" && targetStatus !== "completed" && !isOwner) {
          throw new Error("COMPLETED_ORDER_IMMUTABLE");
        }

        const updates: any = {
          status: targetStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (adminNote !== undefined) updates.adminNote = adminNote ? String(adminNote).trim() : null;
        if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason ? String(rejectionReason).trim() : null;
        if (pinCode !== undefined) updates.pinCode = pinCode ? String(pinCode).trim() : null;
        if (targetStatus === "completed") {
          updates.completedAt = admin.firestore.FieldValue.serverTimestamp();
        }

        transaction.update(orderRef, updates);

        // Atomic Referral Rewarding: Only on genuinely completed order, exactly once, 30 MRU
        let referralRewarded = false;
        if (targetStatus === "completed" && currentData.userId && !currentData.isGuest) {
          const userRef = firestore.collection("users").doc(currentData.userId);
          const userSnap = await transaction.get(userRef);
          if (userSnap.exists) {
            const userData = userSnap.data() || {};
            if (userData.referredBy && !userData.isReferralRewarded) {
              const referrerRef = firestore.collection("users").doc(userData.referredBy);
              const referrerSnap = await transaction.get(referrerRef);
              if (referrerSnap.exists) {
                const referrerData = referrerSnap.data() || {};
                const currentEarnings = Number(referrerData.referralEarnings || 0);
                const currentCount = Number(referrerData.referralsCount || 0);
                const currentPoints = Number(referrerData.loyaltyPoints || 0);

                transaction.update(userRef, {
                  isReferralRewarded: true,
                  firstCompletedOrderAt: admin.firestore.FieldValue.serverTimestamp()
                });

                transaction.update(referrerRef, {
                  referralsCount: currentCount + 1,
                  referralEarnings: currentEarnings + 30,
                  loyaltyPoints: currentPoints + 30,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                referralRewarded = true;
              }
            }
          }
        }

        return { success: true, referralRewarded };
      });

      return res.json({ success: true, status: targetStatus, referralRewarded: updateResult.referralRewarded });

    } catch (err: any) {
      if (err.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({ error: "ORDER_NOT_FOUND", message: "الطلب غير موجود" });
      }
      if (err.message === "COMPLETED_ORDER_IMMUTABLE") {
        return res.status(400).json({ error: "COMPLETED_ORDER_IMMUTABLE", message: "الطلب المكتمل لا يمكن تعديله إلا بواسطة المالك" });
      }
      console.error("[Admin Update Order Error]:", err);
      return res.status(500).json({ error: "INTERNAL_ERROR", message: "فشل تحديث حالة الطلب" });
    }
  });

  // Privileged Staff Role Management (Strictly restricted to project owner)
  app.post("/api/admin/staff/roles", async (req, res) => {
    try {
      const decoded = await verifyAuthToken(req);
      if (!decoded) {
        return res.status(401).json({ error: "UNAUTHORIZED", message: "تسجيل الدخول الإداري مطلوب" });
      }

      if (!isOwnerUser(decoded)) {
        return res.status(403).json({ error: "FORBIDDEN", message: "تعديل رتب وصلاحيات الطاقم محصور بمالك المنصة حصرياً" });
      }

      const { targetUid, role, permissions, active } = req.body;
      if (!targetUid || typeof targetUid !== "string") {
        return res.status(400).json({ error: "TARGET_UID_REQUIRED", message: "معرف المستخدم المستهدف مطلوب" });
      }

      const allowedRoles = ['user', 'support', 'orders', 'finance', 'catalog', 'content', 'analytics', 'admin'];
      if (role && !allowedRoles.includes(role)) {
        return res.status(400).json({ error: "INVALID_ROLE", message: "الرتبة المحددة غير صالحة" });
      }

      const firestore = getDb();
      const staffRef = firestore.collection("staff").doc(targetUid);
      const updateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: decoded.email || decoded.uid
      };
      if (role !== undefined) updateData.role = role;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (active !== undefined) updateData.active = Boolean(active);

      await staffRef.set(updateData, { merge: true });

      // Sync role into users document
      if (role !== undefined) {
        await firestore.collection("users").doc(targetUid).set({
          role: role === 'admin' ? 'admin' : (role === 'user' ? 'user' : 'staff'),
          staffRole: role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      // Append-only audit record
      await firestore.collection("audit_logs").add({
        action: "STAFF_ROLE_MODIFIED",
        targetUid,
        newRole: role || null,
        performedBy: decoded.email || decoded.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      }).catch(err => console.warn("[Audit Log] Staff role change log error:", err));

      return res.json({ success: true, message: "تم تحديث رتبة وصلاحيات المستخدم بنجاح" });
    } catch (err: any) {
      console.error("[Staff Role Update Error]:", err);
      return res.status(500).json({ error: "INTERNAL_ERROR", message: "فشل تحديث الصلاحيات" });
    }
  });

  // Cloud Messaging Dispatch Route for Status Updates
  app.post("/api/send-fcm", async (req, res) => {
    try {
      const { token, title, body } = req.body;
      if (!token) {
        return res.status(400).json({ error: "FCM Token is required." });
      }

      console.log(`[Cloud Messaging Server] Triggered Notification dispatch:`);
      console.log(`- Token: ${token.substring(0, 20)}...`);
      console.log(`- Title: "${title}"`);
      console.log(`- Body: "${body}"`);

      // Real integration check: If the developer provides an FCM service key, we can execute OAuth to send a real Web Push
      let isRealSendAttempted = false;
      const fcmKey = process.env.FCM_SERVER_KEY;
      if (fcmKey) {
        try {
          // This allows users to test real push notifications when they configure the FCM server key
          const response = await fetch(`https://fcm.googleapis.com/fcm/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `key=${fcmKey}`
            },
            body: JSON.stringify({
              to: token,
              notification: { title, body, sound: "default" },
              data: { click_action: "FLUTTER_NOTIFICATION_CLICK" }
            })
          });
          if (response.ok) {
            isRealSendAttempted = true;
          }
        } catch (fcmErr) {
          console.warn("[Cloud Messaging Server] Failed real FCM sending:", fcmErr);
        }
      }

      return res.json({
        success: true,
        message: "Notification dispatched successfully",
        isDemoMock: !isRealSendAttempted,
        details: {
          title,
          body,
          tokenPreview: `${token.substring(0, 15)}...`,
          systemTimestamp: new Date().toISOString(),
          status: isRealSendAttempted ? "Real FCM Delivered" : "Pre-production simulation (Please configure FCM_SERVER_KEY in settings to establish direct socket line)"
        }
      });
    } catch (err: any) {
      console.error("Error in /api/send-fcm:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  const getCanonicalHostUrl = (req?: express.Request) => {
    if (req) {
      const headerHost = req.get("host");
      if (headerHost && !headerHost.includes("localhost") && !headerHost.includes("127.0.0.1")) {
        const proto = req.get("x-forwarded-proto") || req.protocol || "https";
        return `${proto}://${headerHost}`;
      }
    }
    return "https://mauritop-v2-4ozx.vercel.app";
  };

  // Dynamic Sitemap Generator for Search Engines
  const generateSitemapXml = async (hostUrl: string = "https://mauritop-v2-4ozx.vercel.app") => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const lastMod = new Date().toISOString().split('T')[0];

    // Static primary pages
    const staticPages = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: '/service-cards', priority: '0.9', changefreq: 'weekly' },
      { path: '/faq', priority: '0.8', changefreq: 'weekly' },
      { path: '/contact', priority: '0.7', changefreq: 'monthly' },
      { path: '/assistant', priority: '0.7', changefreq: 'weekly' },
      { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
      { path: '/terms', priority: '0.3', changefreq: 'yearly' },
    ];

    staticPages.forEach(p => {
      const fullUrl = p.path === '' ? `${hostUrl}/` : `${hostUrl}${p.path}`;
      xml += `  <url>\n    <loc>${fullUrl}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
    });

    // Default core real service IDs matching actual catalog
    const defaultServiceIds = [
      'pubg', 'freefire', 'cod-mobile', 'tod-vip', 'shahid-vip', 
      'netflix', 'spotify-premium', 'apple-10', 'apple-25', 'playstation-10', 
      'googleplay-10', 'fb-ads', 'fb-verification', 'icloud-service', 'visa-recharge'
    ];

    const serviceIdsSet = new Set<string>(defaultServiceIds);

    try {
      const firestore = getDb();
      const servicesSnapshot = await firestore.collection("services").get();
      servicesSnapshot.forEach(doc => {
        const data = doc.data();
        // Only index active services
        if (doc.id && data.status !== 'Deleted' && data.status !== 'deleted' && data.status !== 'Draft') {
          serviceIdsSet.add(doc.id);
        }
      });
    } catch (e) {
      console.warn("Firestore services fetch for sitemap failed, using catalog:", e);
    }

    serviceIdsSet.forEach(sId => {
      xml += `  <url>\n    <loc>${hostUrl}/services/${sId}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    xml += '</urlset>';
    return xml;
  };

  const handleSitemapRequest = async (req: express.Request, res: express.Response) => {
    try {
      const hostUrl = getCanonicalHostUrl(req);
      const xml = await generateSitemapXml(hostUrl);
      res.header('Content-Type', 'application/xml; charset=utf-8');
      res.status(200).send(xml);
    } catch (e) {
      console.error("Error generating dynamic sitemap:", e);
      res.status(500).send("Error generating sitemap");
    }
  };

  app.get("/sitemap.xml", handleSitemapRequest);
  app.get("/api/sitemap.xml", handleSitemapRequest);

  // Serve IndexNow Key file directly at both standard locations
  const handleIndexNowKey = (_req: express.Request, res: express.Response) => {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send("mauritop2026indexnowkey884729");
  };
  app.get("/mauritop2026indexnowkey.txt", handleIndexNowKey);
  app.get("/mauritop2026indexnowkey884729.txt", handleIndexNowKey);

  // Local SEO & IndexNow Health Check
  app.get("/api/indexnow/verify-local", async (req, res) => {
    try {
      const apiKey = "mauritop2026indexnowkey884729";
      const hostUrl = getCanonicalHostUrl(req);
      return res.json({
        ok: true,
        key: apiKey,
        keyFileExpected: "/mauritop2026indexnowkey.txt",
        keyFileAltExpected: "/mauritop2026indexnowkey884729.txt",
        keyContentMatches: true,
        sitemapUrl: `${hostUrl}/sitemap.xml`,
        robotsUrl: `${hostUrl}/robots.txt`,
        gscVerificationFile: "/googleriFWxrL7v_Sp3WfPE6csBOVKzakjy3ROeZIhwOZxHFA.html",
        status: "Local verification files and routes are active and ready"
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // IndexNow & Instant SEO Indexing API Route
  app.post("/api/indexnow/submit", express.json(), async (req, res) => {
    try {
      const { urls, host } = req.body || {};
      const targetHost = host || (req.get('host') || "mauritop-v2-4ozx.vercel.app");
      const apiKey = "mauritop2026indexnowkey884729";
      const keyLocation = `https://${targetHost}/mauritop2026indexnowkey.txt`;

      let urlList: string[] = [];
      if (Array.isArray(urls) && urls.length > 0) {
        urlList = urls.map((u: string) => u.startsWith("http") ? u : `https://${targetHost}${u.startsWith("/") ? "" : "/"}${u}`);
      } else {
        urlList = [
          `https://${targetHost}/`,
          `https://${targetHost}/service-cards`,
          `https://${targetHost}/calculator`,
          `https://${targetHost}/contact`,
          `https://${targetHost}/assistant`,
          `https://${targetHost}/services/freefire`,
          `https://${targetHost}/services/pubg`,
          `https://${targetHost}/services/netflix`,
          `https://${targetHost}/services/canva`,
          `https://${targetHost}/services/spotify`
        ];
      }

      const payload = {
        host: targetHost,
        key: apiKey,
        keyLocation: keyLocation,
        urlList: urlList
      };

      const results: Record<string, any> = {};

      // 1. Submit to IndexNow Protocol central endpoint (api.indexnow.org)
      try {
        const indexNowRes = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload)
        });
        const status = indexNowRes.status;
        const isOk = status === 200 || status === 202;
        let message = "";
        let explanation = "";

        if (status === 200) {
          message = "تم استلام الروابط ومعالجتها بنجاح بواسطة بروتوكول IndexNow (200 OK)";
        } else if (status === 202) {
          message = "تم قبول الطلب بنجاح وهو قيد التحقق وتوزيع الروابط على المحركات (202 Accepted)";
        } else if (status === 400) {
          message = "طلب غير صالح: بنية البيانات غير صحيحة (400 Bad Request)";
          explanation = "تحقق من صحة أسماء الحقول ومحتوى JSON.";
        } else if (status === 403) {
          message = "تم رفض الطلب لتعذر التحقق من المفتاح الخارجي (403 Forbidden)";
          explanation = `محركات البحث تحاول تنزيل ملف المفتاح من https://${targetHost}/mauritop2026indexnowkey.txt للتحقق من ملكيتك للنطاق. في بيئة التطوير أو المعاينة المؤقتة، لا يمكن لمحركات البحث الوصول إلى نطاق الإنتاج حتى يتم ربط وتفعيل DNS الرسمي لـ ${targetHost}.`;
        } else if (status === 422) {
          message = "الروابط لا تنتمي للمجال المحدد أو بنية المفتاح غير صحيحة (422 Unprocessable Entity)";
          explanation = `تأكد من أن جميع الروابط تبدأ بـ https://${targetHost}/`;
        } else if (status === 429) {
          message = "تم تجاوز حد الطلبات المسموح به مؤقتاً (429 Too Many Requests)";
          explanation = "يرجى الانتظار بضع دقائق قبل إرسال دفعة جديدة.";
        } else {
          message = `استجابة خادم IndexNow: كود ${status}`;
        }

        results.indexNowOrg = {
          endpoint: "https://api.indexnow.org/indexnow",
          status,
          ok: isOk,
          message,
          explanation
        };
      } catch (err: any) {
        results.indexNowOrg = {
          endpoint: "https://api.indexnow.org/indexnow",
          status: 0,
          ok: false,
          error: err?.message || "تعذر الاتصال بـ api.indexnow.org",
          explanation: "تحقق من اتصال الشبكة بالخادم المركزي لـ IndexNow."
        };
      }

      // 2. Submit to Microsoft Bing IndexNow endpoint
      try {
        const bingRes = await fetch("https://www.bing.com/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload)
        });
        const status = bingRes.status;
        const isOk = status === 200 || status === 202;
        let message = "";
        let explanation = "";

        if (status === 200) {
          message = "تم قبول الروابط بنجاح في محرك بحث Bing (200 OK)";
        } else if (status === 202) {
          message = "تم استلام الطلب بنجاح وهو قيد المعالجة في Bing (202 Accepted)";
        } else if (status === 403) {
          message = "تعذر التحقق من ملكية النطاق في Bing (403 Forbidden)";
          explanation = `Bing يبحث عن المفتاح على https://${targetHost}/mauritop2026indexnowkey.txt للتحقق من ملكية الموقع.`;
        } else {
          message = `استجابة Bing: كود ${status}`;
        }

        results.bing = {
          endpoint: "https://www.bing.com/indexnow",
          status,
          ok: isOk,
          message,
          explanation
        };
      } catch (err: any) {
        results.bing = {
          endpoint: "https://www.bing.com/indexnow",
          status: 0,
          ok: false,
          error: err?.message || "تعذر الاتصال بـ Bing IndexNow"
        };
      }

      // 3. Google Search Console & Sitemap Discovery Status (Google Ping is deprecated since 2024)
      results.google = {
        method: "Google Search Console & Sitemap.xml",
        status: "Active",
        ok: true,
        deprecatedPingRemoved: true,
        sitemapUrl: `https://${targetHost}/sitemap.xml`,
        gscSitemapsUrl: `https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2F${encodeURIComponent(targetHost)}%2F`,
        gscInspectUrl: `https://search.google.com/search-console/inspect?resource_id=https%3A%2F%2F${encodeURIComponent(targetHost)}%2F`,
        verificationFile: `https://${targetHost}/googleriFWxrL7v_Sp3WfPE6csBOVKzakjy3ROeZIhwOZxHFA.html`,
        message: "تم إلغاء نظام Google Ping القديم رسمياً من قبل شركة Google. تعتمد الفهرسة المعتمدة على تقديم sitemap.xml عبر Google Search Console واكتشاف robots.txt التلقائي."
      };

      const accepted = !!(results.indexNowOrg?.ok || results.bing?.ok);

      return res.json({
        success: accepted,
        accepted: accepted,
        submittedUrlsCount: urlList.length,
        submittedUrls: urlList,
        keyUsed: apiKey,
        keyLocation: keyLocation,
        timestamp: new Date().toISOString(),
        results
      });
    } catch (error: any) {
      console.error("IndexNow submission error:", error);
      return res.status(500).json({ success: false, accepted: false, error: error?.message || "خطأ في السيرفر الداخلي" });
    }
  });

  app.get("/api/chat", (req, res) => {
    return res.json({ message: "Mouri Top Gemini API chat endpoint is active. Use POST to communicate." });
  });

  // Secure context-aware text chatbot route
  app.post("/api/chat", async (req, res) => {
    try {
      const { contents } = req.body;
      if (!contents || !Array.isArray(contents)) {
        return res.status(400).json({ error: "Invalid contents parameter. Must be an array." });
      }

      const client = getAi();
      const response = await client.models.generateContent({
        model: "gemini-1.5-flash",
        contents,
        config: {
          systemInstruction: `أنت "المساعد الذكي" الرسمي لمنصة موري توب (MAURITOP) لخدمات الشحن الرقمي والاشتراكات في موريتانيا.

هويتك وأسلوبك:
- أنت خبير مبيعات ودعم فني محترف، دقيق، ودود، وواضح.
- تتحدث بلغة عربية مبسطة وواضحة ممزوجة بعبارات حسانية مهذبة، أو بالفرنسية إذا بدأ المستخدم بها.
- هدفك هو مساعدة المستخدمين في اختيار الخدمات المتاحة، توضيح خطوات الشحن، وحل الاستفسارات بدقة وواقعية دون وعود زائفة.
- **تجنب التكرار**: نوع في الردود واجعلها طبيعية وسلسة ومباشرة.

معلومات التواصل والعمليات:
1. رقم الإدارة والدعم الفني المعتمد (واتساب): 32014902 (أو +22232014902).
2. طرق الدفع المعتمدة محلياً: بنكيلي (32014902) والسداد (27329380). المعاملات الدولية تتم بالتنسيق اليدوي مع الإدارة.
3. أهم الخدمات المدعومة:
   - الألعاب: شحن فري فاير (Free Fire) بالـ ID، ببجي موبايل (PUBG Mobile UC)، روبلوكس، وموبايل ليجندز.
   - الاشتراكات: نتفليكس (Netflix)، كانفا برو، يوتيوب بريميوم، سبوتيفاي، وتود (TOD).
   - البطاقات الرقمية: جوجل بلاي، آبل، وبلايستيشن.

قواعد الاستجابة الموثوقة:
- الأسعار: وجه المستخدم دائماً لصفحة الخدمة للاطلاع على السعر الدقيق والمحدث في النظام.
- مدة التنفيذ: الطلبات تعالج فور تأكيد التحويل المالي وإرفاق الإيصال الصحيح، وغالباً خلال دقائق وجيزة.
- خطوات الطلب: اختيار الخدمة -> إدخال معرّف الحساب بدقة -> تحديد المبلغ/الباقة -> التحويل عبر بنكيلي أو السداد -> إرفاق صورة إشعار التحويل -> متابعة الطلب برقم المعاملة.
- الأمان: المنصة لا تطلب أبداً كلمة المرور (Password) لحساب العميل. الشحن يتم بالمعرّف العلني (ID) أو عبر الرموز الرسمية.`,
          temperature: 0.7,
        },
      });

      return res.json({ text: response.text });
    } catch (err: any) {
      console.error("Error in /api/chat:", err);
      
      const fallbackText = `🤖 **مساعد موري توب**\n\nأهلاً بك! نحن هنا لمساعدتك في شحن الألعاب والاشتراكات. يرجى التواصل معنا عبر واتساب للحصول على دعم فوري ومباشر.`;

      return res.json({ 
        text: fallbackText,
        isFallback: true 
      });
    }
  });

  wss.on("connection", async (clientWs) => {
    console.log("Client connected");
    try {
      const session = await getAi().live.connect({
        model: "gemini-3.8-live",
        callbacks: {
          onmessage: (message: any) => {
            const audioParts = message.serverContent?.modelTurn?.parts || [];
            for (const part of audioParts) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (message.serverContent?.interrupted)
              clientWs.send(JSON.stringify({ interrupted: true }));
          },
        },
        config: {
          responseModalities: ["AUDIO" as any],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "أنت المساعد الرقمي لمنصة 'موري توب' (Mouri Top). ساعد المستخدمين بوضوح وود في استفساراتهم المتعلقة بالخدمات الرقمية وشحن الألعاب.",
        },
      });

      clientWs.on("message", (data: any) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Error processing client audio message", e);
        }
      });

      clientWs.on("close", () => {
        session.close();
      });
    } catch (e) {
      console.error("Error establishing Gemini Live session", e);
      clientWs.close();
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ 
      server: { middlewareMode: true, hmr: false }, 
      appType: "spa" 
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  server.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
