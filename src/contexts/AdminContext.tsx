import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { User } from 'firebase/auth';

interface AdminContextProps {
    isAdmin: boolean;
    handleApprove: (itemId: string) => Promise<void>;
    handleReject: (itemId: string) => Promise<void>;
    openWhatsApp: (phoneNumber: string) => void;
}

const AdminContext = createContext<AdminContextProps | undefined>(undefined);

export const AdminProvider = ({ children, user }: { children: ReactNode, user: User | null }) => {
    
    // 1. التحقق من صلاحية الأدمن (Trigger)
    const isAdmin = user?.email === 'khyhajmr08@gmail.com';

    // 2. منطق الموافقة (Action Approve)
    const handleApprove = useCallback(async (itemId: string) => {
        try {
            const itemRef = doc(db, "posts", itemId);
            await updateDoc(itemRef, {
                status: 'approved',
                publishedAt: new Date()
            });
        } catch (error) {
            console.error("خطأ في الموافقة:", error);
        }
    }, []);

    // 3. منطق الرفض والحذف (Action Reject)
    const handleReject = useCallback(async (itemId: string) => {
        try {
            await deleteDoc(doc(db, "posts", itemId));
        } catch (error) {
            console.error("خطأ في الحذف:", error);
        }
    }, []);

    // 4. منطق التواصل عبر واتساب (Interaction Flow)
    const openWhatsApp = useCallback((phoneNumber: string) => {
        const url = `https://wa.me/${phoneNumber}`;
        window.open(url, '_blank');
    }, []);

    const value = useMemo(() => ({
        isAdmin,
        handleApprove,
        handleReject,
        openWhatsApp
    }), [isAdmin, handleApprove, handleReject, openWhatsApp]);

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};


export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error("useAdmin must be used within an AdminProvider");
    }
    return context;
};
