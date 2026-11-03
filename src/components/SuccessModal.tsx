import React from 'react';
import { CheckCircle2, Sparkles, MapPin, Gauge, Calendar, Fuel, UserCheck } from 'lucide-react';
import { TripLogEntry } from '../types';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  lastTrip: TripLogEntry | null;
  serverMessage?: string | null;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  lastTrip,
  serverMessage,
}) => {
  if (!isOpen || !lastTrip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm bg-white/95 backdrop-blur-2xl border border-white/90 rounded-3xl shadow-chic-hover p-6 text-center space-y-4 transition-all duration-300 animate-slide-up relative overflow-hidden"
        role="dialog"
      >
        {/* Soft background glows */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-100/60 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-rose-100/60 rounded-full blur-2xl pointer-events-none" />

        {/* Celebration Icon Pod */}
        <div className="relative mx-auto w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-100 to-teal-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-500 shadow-md">
          <CheckCircle2 className="w-9 h-9" />
          <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '4s' }} />
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">
            Успешен запис! 🎉
          </h3>
          <p className="text-xs font-semibold text-rose-500 mt-0.5">
            {serverMessage || 'Данните са записани в Google Таблицата! 💖'}
          </p>
        </div>

        {/* Trip Summary Card */}
        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 font-bold">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>{lastTrip.date}</span>
            </span>
            <span className="font-extrabold text-rose-500 font-mono text-sm">
              +{lastTrip.distance} км
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-700 font-semibold pt-1 border-t border-slate-200/50">
            <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">{lastTrip.route}</span>
          </div>

          <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/50">
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-amber-500" />
              <span>Табло: <b>{lastTrip.endKm.toLocaleString('bg-BG')}</b> км</span>
            </span>

            {lastTrip.personalKm > 0 && (
              <span className="flex items-center gap-1 text-teal-600">
                <UserCheck className="w-3 h-3" />
                <span>Лични: {lastTrip.personalKm} км</span>
              </span>
            )}
          </div>

          {lastTrip.fuelLitres && lastTrip.fuelLitres > 0 && (
            <div className="flex items-center gap-1 text-rose-600 pt-1 border-t border-slate-200/50">
              <Fuel className="w-3.5 h-3.5" />
              <span>Заредено гориво: {lastTrip.fuelLitres} л</span>
            </div>
          )}
        </div>

        {/* Big Juicy OK Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-full text-base font-extrabold bg-gradient-to-r from-rose-400 via-pink-400 to-rose-400 hover:opacity-95 active:scale-95 text-white shadow-lg shadow-rose-300/40 touch-bouncy transition-all"
          >
            ОК ✨
          </button>
        </div>
      </div>
    </div>
  );
};
