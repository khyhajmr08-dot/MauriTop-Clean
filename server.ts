import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getFirestore, Firestore } from "firebase-admin/firestore";
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

  // Serve persistent uploads statically in both dev and production
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (e) {
      console.warn("[Uploads] Directory creation warning:", e);
    }
  }
  app.use("/uploads", express.static(uploadsDir));

  // Resilient File/Image Upload Endpoint (Seamless fallback when Cloud Storage bucket is unprovisioned)
  app.post("/api/upload", async (req, res) => {
    try {
      const { data, path: desiredPath, filename } = req.body;
      if (!data || typeof data !== "string") {
        return res.status(400).json({ error: "DATA_REQUIRED", message: "بيانات الصورة مطلوبة" });
      }

      // Parse data URL: data:image/png;base64,....
      const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let extension = "webp";

      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg";
        else if (mimeType.includes("png")) extension = "png";
        else if (mimeType.includes("webp")) extension = "webp";
        else if (mimeType.includes("gif")) extension = "gif";
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(data, "base64");
      }

      if (buffer.length === 0) {
        return res.status(400).json({ error: "EMPTY_FILE", message: "الملف فارغ" });
      }

      // Max 10MB limit for safe storage
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(413).json({ error: "FILE_TOO_LARGE", message: "حجم الملف يتجاوز الحد المسموح به (10 ميجابايت)" });
      }

      const randomSuffix = crypto.randomBytes(8).toString("hex");
      let cleanBaseName = filename ? path.basename(filename, path.extname(filename)).replace(/[^a-zA-Z0-9_-]/g, "_") : "img";
      if (desiredPath) {
        const cleanDesired = path.basename(desiredPath, path.extname(desiredPath)).replace(/[^a-zA-Z0-9_-]/g, "_");
        if (cleanDesired) cleanBaseName = cleanDesired;
      }

      const finalFileName = `${cleanBaseName}_${Date.now()}_${randomSuffix}.${extension}`;
      const filePath = path.join(uploadsDir, finalFileName);

      await fs.promises.writeFile(filePath, buffer);
      const publicUrl = `/uploads/${finalFileName}`;
      console.log(`[Upload] Resilient file saved to: ${publicUrl} (${buffer.length} bytes)`);

      return res.json({ success: true, url: publicUrl, size: buffer.length });
    } catch (err: any) {
      console.error("[Upload Error]:", err);
      return res.status(500).json({ error: "UPLOAD_FAILED", message: err.message || "فشل حفظ الملف على الخادم" });
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
      let isMaintenance = false;
      try {
        const firestore = getDb();
        const settingsDoc = await firestore.collection("settings").doc("global").get();
        if (settingsDoc.exists) {
          isMaintenance = settingsDoc.data()?.maintenanceMode === true;
        }
      } catch (adminErr) {
        // Fallback to REST check with API key
        const globalData = await getDocRest("settings", "global");
        if (globalData) {
          isMaintenance = globalData.maintenanceMode === true;
        }
      }

      if (isMaintenance) {
        // Allow owner to bypass maintenance
        const decoded = await verifyAuthToken(req);
        if (decoded && isOwnerUser(decoded)) {
          return next();
        }
        return res.status(503).json({
          error: "MAINTENANCE_MODE",
          message: "المنصة قيد الصيانة المجدولة حالياً لتحسين الخدمات. لا يمكن قبول طلبات جديدة في الوقت الحالي."
        });
      }
      return next();
    } catch (err) {
      console.warn("[Maintenance Check] Pass-through on error:", err);
      return next();
    }
  };

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

      // Built-in catalog for standard services
      const defaultServices: Record<string, any> = {
        pubg: {
          name: "PUBG Mobile",
          nameAr: "شحن شدات ببجي موبايل (PUBG UC)",
          status: "active",
          pricingMode: "packages",
          packages: [
            { amount: 55, quantity: 60, title: "60 UC" },
            { amount: 240, quantity: 325, title: "325 UC" },
            { amount: 470, quantity: 660, title: "660 UC" }
          ],
          fields: [{ id: "playerId", labelAr: "معرف اللاعب", required: true }]
        },
        freefire: {
          name: "Free Fire",
          nameAr: "شحن جواهر فري فاير (Free Fire)",
          status: "active",
          pricingMode: "packages",
          packages: [
            { amount: 50, quantity: 110, title: "110 جواهر" },
            { amount: 100, quantity: 240, title: "240 جواهر" },
            { amount: 150, quantity: 380, title: "380 جواهر" }
          ],
          fields: [{ id: "playerId", labelAr: "معرف اللاعب", required: true }]
        },
        mobilelegends: {
          name: "Mobile Legends",
          nameAr: "شحن ماسات موبايل ليجندز",
          status: "active",
          pricingMode: "packages",
          packages: [
            { amount: 50, quantity: 80, title: "80 ماسة" },
            { amount: 100, quantity: 160, title: "160 ماسة" }
          ],
          fields: [{ id: "playerId", labelAr: "معرف اللاعب", required: true }]
        },
        fifa: {
          name: "EA Sports FC",
          nameAr: "نقاط FC Mobile (فيفا موبايل)",
          status: "active",
          pricingMode: "packages",
          packages: [
            { amount: 100, quantity: 500, title: "500 نقطة FC" },
            { amount: 200, quantity: 1200, title: "1200 نقطة FC" }
          ],
          fields: [{ id: "playerId", labelAr: "معرف اللاعب", required: true }]
        }
      };

      // 1. Fetch Trusted Service Configuration
      let serviceData: any = null;
      try {
        const firestore = getDb();
        const serviceDoc = await firestore.collection("services").doc(serviceId).get();
        if (serviceDoc.exists) {
          serviceData = serviceDoc.data();
        }
      } catch {
        serviceData = await getDocRest("services", serviceId);
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
          const firestore = getDb();
          const paymentSettingsDoc = await firestore.collection("settings").doc("payment_methods").get();
          paymentMethods = paymentSettingsDoc.exists ? paymentSettingsDoc.data()?.methods || paymentSettingsDoc.data() : null;
        } catch {
          const paymentData = await getDocRest("settings", "payment_methods");
          paymentMethods = paymentData?.methods || paymentData;
        }

        if (!paymentMethods) {
          paymentMethods = {
            bankily: { enabled: true, labelAr: "بنكيلي", labelFr: "Bankily" },
            sadad: { enabled: true, labelAr: "سداد", labelFr: "Sedad" },
            masrvi: { enabled: true, labelAr: "مصرفي", labelFr: "Masrvi" },
            gazapay: { enabled: true, labelAr: "غزة باي", labelFr: "GazaPay" }
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

      // 3. Compute and Validate Server-Authoritative Price
      let finalAmount = 0;
      if (!isQuoteMode) {
        const parsedClientAmount = Number(requestedAmount);
        if (isNaN(parsedClientAmount) || parsedClientAmount <= 0) {
          return res.status(400).json({ error: "INVALID_AMOUNT", message: "المبلغ المطلوب غير صالح" });
        }

        // Check package constraints
        const combinedPackages = [
          ...(Array.isArray(serviceData.packages) ? serviceData.packages : []),
          ...(defaultServices[serviceId]?.packages || [])
        ];

        if (combinedPackages.length > 0 && !serviceData.allowCustomAmount) {
          const validPackage = combinedPackages.find((p: any) => Number(p.amount) === parsedClientAmount);
          if (!validPackage) {
            return res.status(400).json({ 
              error: "INVALID_PACKAGE_PRICE", 
              message: `المبلغ المطلوب (${parsedClientAmount} MRU) لا يتطابق مع أي من باقات الخدمة المتاحة.` 
            });
          }
          finalAmount = parsedClientAmount;
        } else if (pricingMode === "fixed") {
          const expectedPrice = Number(serviceData.priceMru || serviceData.suggestedPrice || serviceData.price || 0);
          if (expectedPrice > 0 && parsedClientAmount !== expectedPrice) {
            return res.status(400).json({ error: "PRICE_MISMATCH", message: `سعر الخدمة الرسمي هو ${expectedPrice} MRU` });
          }
          finalAmount = expectedPrice > 0 ? expectedPrice : parsedClientAmount;
        } else if (pricingMode === "range") {
          const min = Number(serviceData.minAmountMru || serviceData.minAmount || 0);
          const max = Number(serviceData.maxAmountMru || serviceData.maxAmount || Infinity);
          if (parsedClientAmount < min || parsedClientAmount > max) {
            return res.status(400).json({ 
              error: "AMOUNT_OUT_OF_RANGE", 
              message: `المبلغ يجب أن يكون بين ${min} و ${max} MRU` 
            });
          }
          finalAmount = parsedClientAmount;
        } else {
          finalAmount = parsedClientAmount;
        }

        // Validate Receipt Proof for paid orders (Strict: no fake tokens or empty values)
        if (!proofImageUrl || typeof proofImageUrl !== "string" || proofImageUrl.trim() === "" || proofImageUrl === "receipt_attached") {
          return res.status(400).json({
            error: "RECEIPT_REQUIRED",
            message: "إيصال التحويل البنكي مطلوب. يرجى إرفاق صورة إيصال الدفع."
          });
        }

        const cleanProofUrl = proofImageUrl.trim();
        if (!cleanProofUrl.startsWith("http") && !cleanProofUrl.startsWith("/uploads/")) {
          return res.status(400).json({
            error: "INVALID_RECEIPT_URL",
            message: "رابط إيصال الدفع غير صالح. يرجى إعادة رفع إيصال الدفع."
          });
        }
      }

      // 4. Validate Required Service Fields
      const safeFields: Record<string, any> = {};
      if (Array.isArray(serviceData.fields)) {
        for (const f of serviceData.fields) {
          const val = (clientFields && clientFields[f.id] !== undefined) ? String(clientFields[f.id]).trim() : "";
          if (f.required && !val) {
            return res.status(400).json({ error: "FIELD_REQUIRED", message: `الحقل (${f.labelAr || f.label}) مطلوب` });
          }
          if (f.pattern && val && !new RegExp(f.pattern).test(val)) {
            return res.status(400).json({ error: "FIELD_INVALID", message: `صيغة الحقل (${f.labelAr || f.label}) غير صحيحة` });
          }
          safeFields[f.id] = val;
        }
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
          const firestore = getDb();
          const userDoc = await firestore.collection("users").doc(decodedUser.uid).get();
          if (userDoc.exists && userDoc.data()?.blocked === true) {
            return res.status(403).json({ error: "USER_BLOCKED", message: "حسابك محظور من إجراء طلبات جديدة" });
          }
        } catch (authDocErr) {
          console.warn("[Order Creation] User check notice:", authDocErr);
        }
      }

      // Check if phone number is blocked across users
      if (senderPhone) {
        const cleanPhone = String(senderPhone).replace(/[^0-9]/g, '');
        if (cleanPhone.length >= 8) {
          try {
            const firestore = getDb();
            const blockedPhoneSnap = await firestore.collection("users")
              .where("phoneNumber", "==", cleanPhone)
              .where("blocked", "==", true)
              .limit(1)
              .get();
            if (!blockedPhoneSnap.empty) {
              return res.status(403).json({ error: "PHONE_BLOCKED", message: "هذا الرقم محظور من إجراء طلبات جديدة" });
            }
          } catch (phoneErr) {
            console.warn("[Order Creation] Phone check notice:", phoneErr);
          }
        }
      }

      // Concurrency-safe Active Duplicate Order Guard:
      // Prevent duplicate pending orders with identical service and recipient identifier
      const recipientId = safeFields.playerId || safeFields.email || safeFields.phone || safeFields.cardId || safeFields.username || senderPhone;
      if (recipientId && effectiveUserId) {
        try {
          const firestore = getDb();
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
        } catch (activeErr) {
          console.warn("[Order Creation] Active orders check warning:", activeErr);
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

      // 7. Atomic Idempotency Check & Order Insertion
      let orderId = "";
      let trackingTokenResult: string | null = null;
      let isReplay = false;
      let adminSucceeded = false;

      try {
        const firestore = getDb();
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
        adminSucceeded = true;
      } catch (txErr: any) {
        if (txErr.message === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
          return res.status(409).json({ 
            error: "IDEMPOTENCY_CONFLICT", 
            message: "رمز المحاولة هذا تم استخدامه مسبقاً ببيانات مختلفة. يرجى تحديث الصفحة وإعادة المحاولة." 
          });
        }
        console.warn("[Admin Order Notice] Transaction unavailable, executing via REST fallback:", txErr?.message || txErr);
      }

      // Seamless REST Fallback when admin service account is unprovisioned
      if (!adminSucceeded) {
        const existingIdemp = await getDocRest("order_idempotency", clientAttemptId);
        if (existingIdemp) {
          if (existingIdemp.payloadHash !== payloadHash) {
            return res.status(409).json({
              error: "IDEMPOTENCY_CONFLICT",
              message: "رمز المحاولة هذا تم استخدامه مسبقاً ببيانات مختلفة. يرجى تحديث الصفحة وإعادة المحاولة."
            });
          }
          orderId = existingIdemp.orderId;
          trackingTokenResult = existingIdemp.trackingToken || null;
          isReplay = true;
        } else {
          orderId = 'ord_' + Date.now().toString(36) + '_' + crypto.randomBytes(6).toString("hex");
          const orderDocData = {
            id: orderId,
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const orderSaved = await setDocRest("orders", orderId, orderDocData);
          if (!orderSaved) {
            throw new Error("فشل حفظ الطلب في قاعدة البيانات السحابية");
          }

          await setDocRest("order_idempotency", clientAttemptId, {
            attemptId: clientAttemptId,
            orderId: orderId,
            payloadHash: payloadHash,
            trackingToken: isGuest ? trackingToken : null,
            trackingTokenHash: isGuest ? trackingTokenHash : null,
            createdAt: new Date().toISOString()
          });

          trackingTokenResult = isGuest ? trackingToken : null;
          isReplay = false;
        }
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
      return res.json({
        success: true,
        order: {
          id: snapshot.docs[0].id,
          serviceName: orderData.serviceName || orderData.serviceType,
          amount: orderData.amount,
          status: orderData.status,
          pinCode: orderData.pinCode || null,
          adminNote: orderData.adminNote || null,
          rejectionReason: orderData.rejectionReason || null,
          createdAt: orderData.createdAt
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
