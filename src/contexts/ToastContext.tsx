import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import NotificationToast, { ToastType } from '../components/NotificationToast';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (!message || typeof message !== 'string' || !message.trim()) return;

    // Smart Sanitization: Transform cryptic system errors into friendly, localized messages
    let friendlyMessage = message.trim();
    const isAr = localStorage.getItem('app_language') !== 'fr';

    if (type === 'error') {
      if (message.includes('permission-denied') || message.includes('Missing or insufficient permissions') || message.includes('PERMISSION_DENIED')) {
        friendlyMessage = isAr
          ? "عذراً، تم رفض الوصول. لا تملك الصلاحيات الكافية لإجراء هذه العملية."
          : "Accès refusé. Vous n'avez pas les permissions requises.";
      } else if (message.includes('network') || message.includes('failed-precondition') || message.includes('Failed to get document') || message.includes('offline')) {
        friendlyMessage = isAr
          ? "خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت وإعادة المحاولة."
          : "Erreur de connexion réseau. Veuillez vérifier votre connexion.";
      } else if (message.includes('auth/invalid-credential') || message.includes('auth/user-not-found') || message.includes('auth/wrong-password')) {
        friendlyMessage = isAr
          ? "بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور."
          : "Identifiants incorrects. Veuillez vérifier vos informations.";
      } else if (message.includes('auth/email-already-in-use')) {
        friendlyMessage = isAr
          ? "هذا البريد الإلكتروني مسجل بالفعل."
          : "Cette adresse e-mail est déjà utilisée.";
      } else if (message.includes('auth/weak-password')) {
        friendlyMessage = isAr
          ? "كلمة المرور ضعيفة جداً. يجب أن تكون 6 أحرف أو أكثر."
          : "Le mot de passe est trop faible (min 6 caractères).";
      }
    }

    const id = Math.random().toString();
    setToasts(prev => {
      // Prevent exact active duplicates to keep the interface clean and non-repetitive
      if (prev.some(t => t.message === friendlyMessage)) return prev;
      return [...prev, { id, message: friendlyMessage, type }];
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Stack Container - Positioned bottom-right on desktop & above bottom navigation bar on mobile to avoid blocking navigation */}
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-[100] w-auto max-w-sm flex flex-col gap-2.5 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <NotificationToast
              key={t.id}
              message={t.message}
              type={t.type}
              onClose={() => removeToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
