import React, { useState, useEffect } from 'react';
import { SheetTripEntry, TripLogEntry, SubmitPayload } from '../types';
import { updateTripLog, formatBulgarianTripDate } from '../services/api';
import { CONFIG } from '../config';
import {
  X,
  Pencil,
  Save,
  Sparkles,
  MapPin,
  Calendar,
  Fuel,
  UserCheck,
  Gauge,
  AlertCircle,
} from 'lucide-react';

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: SheetTripEntry | TripLogEntry | null;
  onSuccess: () => void;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({
  isOpen,
  onClose,
  entry,
  onSuccess,
}) => {
  const [startKm, setStartKm] = useState<number>(0);
  const [endKm, setEndKm] = useState<string>('');
  const [route, setRoute] = useState<string>('София');
  const [personalKm, setPersonalKm] = useState<string>('0');
  const [fuelLitres, setFuelLitres] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill form when entry changes or modal opens
  useEffect(() => {
    if (entry) {
      setStartKm(entry.startKm || 0);
      setEndKm(entry.endKm ? String(entry.endKm) : '');
      setRoute(entry.route || 'София');
      setPersonalKm(entry.personalKm ? String(entry.personalKm) : '0');
      setFuelLitres(entry.fuelLitres ? String(entry.fuelLitres) : '');
      setErrorMessage(null);
    }
  }, [entry, isOpen]);

  if (!isOpen || !entry) return null;

  const parsedEnd = parseInt(endKm, 10);
  const liveDistance = !isNaN(parsedEnd) && parsedEnd >= startKm ? parsedEnd - startKm : 0;
  const isInvalid = !endKm || isNaN(parsedEnd) || parsedEnd < startKm;

  // Determine row and sheetName if available
  const row = 'row' in entry ? entry.row : undefined;
  const sheetName = 'sheetName' in entry ? entry.sheetName : undefined;

  // Resolve ISO date YYYY-MM-DD
  let isoDate = 'isoDate' in entry && entry.isoDate ? entry.isoDate : '';
  if (!isoDate && 'date' in entry) {
    if (entry.date.includes('-') && entry.date.length === 10) {
      isoDate = entry.date;
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalid) {
      setErrorMessage('Крайният километраж не може да е по-малък от началния.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload: SubmitPayload = {
      action: 'updateLog',
      date: isoDate || entry.date,
      startKm,
      endKm: parsedEnd,
      distance: liveDistance,
      route: route.trim() || 'София',
      personalKm: parseFloat(personalKm) || 0,
      fuelLitres: parseFloat(fuelLitres) || null,
      driver: entry.driver || CONFIG.VEHICLE.driver,
      plate: CONFIG.VEHICLE.plate,
      timestamp: new Date().toISOString(),
      sheetName,
      row,
      isEdit: true,
    };

    const res = await updateTripLog(payload);
    setIsSaving(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white/90 rounded-t-3xl sm:rounded-3xl shadow-chic-hover max-h-[92vh] flex flex-col overflow-hidden transition-all duration-300 animate-slide-up"
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/80 via-pink-50/60 to-amber-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center shadow-inner">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <span>Редакция на пътен лист</span>
              </h3>
              <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatBulgarianTripDate(entry.date)}</span>
                {row && <span className="text-slate-400 font-normal">• Ред {row}</span>}
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Odometer Row (Start KM & End KM + live difference) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Km */}
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Начален км
              </label>
              <div className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="number"
                  value={startKm}
                  onChange={(e) => setStartKm(parseInt(e.target.value, 10) || 0)}
                  className="w-full font-mono text-base font-black text-slate-800 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* End Km */}
            <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-3 focus-within:ring-2 focus-within:ring-rose-300 transition-all">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                  Краен км
                </label>
                {liveDistance > 0 && (
                  <span className="text-[10px] font-black text-rose-600 bg-rose-100/90 px-1.5 py-0.5 rounded-full font-mono">
                    +{liveDistance} км
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-rose-400 shrink-0" />
                <input
                  type="number"
                  value={endKm}
                  onChange={(e) => setEndKm(e.target.value)}
                  placeholder={String(startKm + 50)}
                  className="w-full font-mono text-base font-black text-rose-700 bg-transparent focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Route selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              <span>Маршрут</span>
            </label>

            {/* Quick Pills */}
            <div className="flex flex-wrap gap-1.5">
              {CONFIG.FREQUENT_ROUTES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoute(r)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all touch-bouncy ${
                    route === r
                      ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Custom Route Input */}
            <input
              type="text"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="Въведете маршрут..."
              className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50/70 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-300 focus:bg-white transition-all"
            />
          </div>

          {/* Secondary Row: Personal KM & Fuel */}
          <div className="grid grid-cols-2 gap-3">
            {/* Personal Km */}
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-teal-500" />
                <span>Лични км</span>
              </label>
              <input
                type="number"
                value={personalKm}
                onChange={(e) => setPersonalKm(e.target.value)}
                placeholder="0"
                className="w-full font-mono text-sm font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>

            {/* Fuel Litres */}
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-amber-500" />
                <span>Гориво (л)</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={fuelLitres}
                onChange={(e) => setFuelLitres(e.target.value)}
                placeholder="0"
                className="w-full font-mono text-sm font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-full text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all touch-bouncy"
            >
              Отказ
            </button>

            <button
              type="submit"
              disabled={isSaving || isInvalid}
              className={`flex-1 py-3 px-4 rounded-full text-xs font-extrabold text-white transition-all flex items-center justify-center gap-1.5 shadow-md ${
                isSaving || isInvalid
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-rose-400 via-pink-400 to-rose-400 hover:opacity-95 active:scale-95 shadow-rose-300/40 touch-bouncy'
              }`}
            >
              {isSaving ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Запазване...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Запази промените 💾</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

