import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface AuditLogEntry {
  action: 
    | "order_status_updated"
    | "order_deleted"
    | "service_created"
    | "service_updated"
    | "service_deleted"
    | "payment_settings_updated"
    | "payment_method_created"
    | "staff_member_added"
    | "staff_member_updated"
    | "staff_member_removed"
    | "system_settings_updated"
    | "kyc_status_updated"
    | "withdrawal_status_updated";
  performedBy: string; // email or username
  performedByUid: string;
  role?: string;
  targetId?: string;
  targetTitle?: string;
  details?: string;
  metadata?: Record<string, any>;
  timestamp?: any;
}

export async function logAuditEvent(entry: Omit<AuditLogEntry, "timestamp">): Promise<void> {
  try {
    await addDoc(collection(db, "audit_logs"), {
      ...entry,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString()
    });
  } catch (err) {
    // Audit logging should never block the primary operation, but log error
    console.warn("[AuditLogger] Failed to write audit log entry:", err);
  }
}
