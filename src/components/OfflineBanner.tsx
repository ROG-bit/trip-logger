import React from 'react';
import { Sparkles, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface OfflineBannerProps {
  message?: string | null;
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
  onDismiss?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  message,
  pendingCount,
  isSyncing,
  onSync,
  onDismiss,
}) => {
  if (!message && pendingCount === 0) return null;

  return (
    <div className="rounded-3xl bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50 border border-rose-200/80 p-4 shadow-chic-sm animate-bounce-slight transition-all">
      <div className="flex items-start gap-3">
        {/* Soft icon pod */}
        <div className="w-10 h-10 rounded-2xl bg-rose-200/60 border border-rose-300/40 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
          {pendingCount > 0 ? (
            <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
          ) : (
            <Sparkles className="w-5 h-5 text-rose-500" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>Защита за подземен гараж</span>
              <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
            </h4>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-slate-400 hover:text-rose-600 text-xs font-bold px-1"
              >
                ✕
              </button>
            )}
          </div>

          <p className="text-xs font-medium text-rose-700 mt-1 leading-relaxed">
            {message ||
              'Няма връзка (подземен гараж?). Данните са запазени, опитай отново горе на светло! ✨'}
          </p>

          {pendingCount > 0 && (
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-rose-200/60">
              <span className="text-[11px] font-semibold text-rose-600">
                {pendingCount === 1
                  ? '1 чакащ запис в офлайн опашката'
                  : `${pendingCount} чакащи записа в офлайн опашката`}
              </span>

              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-rose-600 border border-rose-300 shadow-sm hover:bg-rose-50 touch-bouncy disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Синхронизиране...' : 'Синхронизирай сега'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

