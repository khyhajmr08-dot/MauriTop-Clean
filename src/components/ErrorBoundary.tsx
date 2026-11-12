// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Custom error logging for easier discovery in production
    console.error(
      '%c[MauriTop Error Logger]', 
      'background: #ef4444; color: white; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
      '\nMessage:', error.message,
      '\nStack:', error.stack,
      '\nComponent Stack:', errorInfo.componentStack
    );
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-main-bg p-4" dir="rtl">
          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-lg border border-gray-100 max-w-sm w-full text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-3">خطأ غير متوقع</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              عذراً، حدث خطأ أثناء تحميل الصفحة. يرجى محاولة التحديث أو العودة للرئيسية.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" /> تحديث الصفحة
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" /> العودة للرئيسية
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 text-left bg-gray-900 p-4 rounded-xl overflow-auto text-xs font-mono text-emerald-400">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
