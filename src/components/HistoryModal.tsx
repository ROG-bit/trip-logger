import React from 'react';
import { TripLogEntry } from '../types';
import { X, History, CheckCircle2, Clock, MapPin, Fuel, Calendar, RefreshCw } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TripLogEntry[];
  onSyncAll: () => void;
  isSyncing: boolean;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSyncAll,
  isSyncing,
}) => {
  if (!isOpen) return null;

  const pendingItems = history.filter((h) => h.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white/95 backdrop-blur-xl border border-white/80 rounded-t-3xl sm:rounded-3xl shadow-chic-hover max-h-[88vh] flex flex-col overflow-hidden transition-all duration-300 animate-slide-up"
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/70 to-pink-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shadow-inner">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Дневник на пътуванията
              </h3>
              <p className="text-xs text-slate-400">
                {history.length} {history.length === 1 ? 'запис' : 'записа'} в локалната памет
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center border border-slate-200/60 touch-bouncy shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sync pending button if any */}
        {pendingItems.length > 0 && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500 animate-spin" />
              {pendingItems.length} {pendingItems.length === 1 ? 'офлайн запис' : 'офлайн записа'}
            </span>
            <button
              type="button"
              onClick={onSyncAll}
              disabled={isSyncing}
              className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-xs font-bold shadow-sm touch-bouncy flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Синхронизиране...' : 'Синхронизирай'}</span>
            </button>
          </div>
        )}

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-50 flex items-center justify-center text-rose-300">
                <History className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Все още няма запазени записи</p>
              <p className="text-xs text-slate-400 mt-1">
                Попълни и изпрати първия си пътен лист горе! ✨
              </p>
            </div>
          ) : (
            history.map((trip) => {
              const isSynced = trip.status === 'synced';
              return (
                <div
                  key={trip.id}
                  className="bg-white/85 border border-rose-100/80 rounded-2xl p-3.5 shadow-chic-sm space-y-2 hover:border-rose-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-rose-400" />
                      <span>{trip.date}</span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isSynced
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                          : 'bg-amber-50 text-amber-600 border border-amber-200/60'
                      }`}
                    >
                      {isSynced ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Синхронизиран</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Чака връзка</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Route & Distance */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                      <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{trip.route}</span>
                    </div>
                    <div className="text-sm font-extrabold text-rose-500 font-mono">
                      +{trip.distance} км
                    </div>
                  </div>

                  {/* Meter Details */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <div>
                      {trip.startKm} → <span className="font-bold text-slate-700">{trip.endKm}</span> км
                      {trip.personalKm > 0 && (
                        <span className="ml-1.5 text-[11px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md">
                          (лични: {trip.personalKm} км)
                        </span>
                      )}
                    </div>

                    {trip.fuelLitres && trip.fuelLitres > 0 && (
                      <div className="flex items-center gap-1 text-rose-500 font-semibold">
                        <Fuel className="w-3 h-3" />
                        <span>{trip.fuelLitres} л</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-center">
          <p className="text-[11px] text-slate-400">
            Всички записи се съхраняват локално в браузъра за надеждност в офлайн условия.
          </p>
        </div>
      </div>
    </div>
  );
};
