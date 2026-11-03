import React from 'react';
import { Car, Sparkles, SlidersHorizontal, History, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  isOnline: boolean;
  hasPendingQueue: boolean;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isOnline,
  hasPendingQueue,
  onOpenSettings,
  onOpenHistory,
}) => {
  return (
    <header className="w-full pt-2 pb-4">
      <div className="glass-card-elevated rounded-3xl p-5 relative overflow-hidden transition-all duration-300">
        {/* Soft decorative background glows */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-200/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-pink-100/60 rounded-full blur-xl pointer-events-none" />

        {/* Top bar with badge and action pills */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          {/* Pill Badge: ✨ My Taigo */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-100/90 to-pink-50/90 border border-rose-200/60 text-rose-600 text-xs font-bold tracking-wide shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>✨ My Taigo</span>
            <Car className="w-3.5 h-3.5 ml-0.5 text-rose-500" />
          </div>

          {/* Action buttons (History & Settings) */}
          <div className="flex items-center gap-2">
            {/* Online / Offline status indicator */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                  : 'bg-rose-50 text-rose-600 border-rose-200/60 animate-pulse'
              }`}
              title={isOnline ? 'Свързан с интернет' : 'Офлайн режим (Подземен гараж)'}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <Wifi className="w-3 h-3 text-emerald-600" />
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-500" />
                  <span className="text-[11px]">Офлайн</span>
                </>
              )}
            </div>

            {/* History Button */}
            <button
              onClick={onOpenHistory}
              type="button"
              className="relative p-2.5 rounded-2xl bg-white/80 hover:bg-white text-slate-600 hover:text-rose-500 border border-white/90 shadow-chic-sm touch-bouncy"
              aria-label="История на пътуванията"
            >
              <History className="w-4 h-4" />
              {hasPendingQueue && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-bounce" />
              )}
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              type="button"
              className="p-2.5 rounded-2xl bg-white/80 hover:bg-white text-slate-600 hover:text-rose-500 border border-white/90 shadow-chic-sm touch-bouncy"
              aria-label="Настройки"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title & Plate Pod */}
        <div className="relative z-10 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
              Volkswagen Taigo
            </h1>
            <p className="text-sm font-semibold text-rose-500/90 mt-0.5 flex items-center gap-1">
              Водач: Мая Атанасова 💕
            </p>
          </div>

          {/* Bulgarian EU Plate badge */}
          <div className="inline-flex items-center shadow-chic-sm border border-slate-200/80 rounded-xl overflow-hidden bg-white text-xs font-mono font-bold tracking-wider">
            <div className="bg-[#003399] text-white px-1.5 py-1 flex flex-col items-center justify-center text-[9px] leading-none">
              <span className="text-[8px] text-yellow-300">★</span>
              <span>BG</span>
            </div>
            <div className="px-2.5 py-1 text-slate-900 bg-white font-extrabold text-sm tracking-widest">
              СВ 8529 XH
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

