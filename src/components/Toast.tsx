import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm transition-all duration-300 animate-slide-down">
      <div
        className={`px-4 py-3 rounded-2xl shadow-chic-hover border backdrop-blur-xl flex items-center justify-between gap-3 ${
          isSuccess
            ? 'bg-rose-50/95 border-rose-300 text-rose-900'
            : isError
            ? 'bg-red-50/95 border-red-300 text-red-900'
            : 'bg-white/95 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isSuccess && <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0" />}
          {isError && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
          {!isSuccess && !isError && <Info className="w-5 h-5 text-rose-400 shrink-0" />}
          <p className="text-xs font-bold leading-snug">{toast.message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg touch-bouncy shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

