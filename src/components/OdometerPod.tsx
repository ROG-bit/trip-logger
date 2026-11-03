import React, { useState } from 'react';
import { Gauge, ArrowRight, Lock, Unlock, AlertCircle } from 'lucide-react';

interface OdometerPodProps {
  startKm: number;
  endKm: string;
  onStartKmChange: (val: number) => void;
  onEndKmChange: (val: string) => void;
}

export const OdometerPod: React.FC<OdometerPodProps> = ({
  startKm,
  endKm,
  onStartKmChange,
  onEndKmChange,
}) => {
  const [isStartLocked, setIsStartLocked] = useState(true);

  const parsedEnd = parseInt(endKm, 10);
  const isValidEnd = !isNaN(parsedEnd);
  const distance = isValidEnd ? parsedEnd - startKm : 0;
  const isDistanceNegative = isValidEnd && distance < 0;
  const isDistancePositive = isValidEnd && distance > 0;

  return (
    <div className="glass-card rounded-3xl p-5 space-y-4 transition-all">
      {/* Header with Muted Peach Pastel Pod */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100/70 border border-amber-200/50 flex items-center justify-center text-amber-600 shadow-inner">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Километраж
            </span>
            <h2 className="text-sm font-bold text-slate-800">
              Показания на таблото
            </h2>
          </div>
        </div>

        {/* Live Badge: "Днешен пробег: +XX км" */}
        <div
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1 shadow-sm ${
            isDistancePositive
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white scale-105 shadow-rose-300/40 animate-pulse-subtle'
              : isDistanceNegative
              ? 'bg-rose-100 text-rose-700 border border-rose-300'
              : 'bg-slate-100 text-slate-400 border border-slate-200'
          }`}
        >
          {isDistanceNegative ? (
            <>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Грешка: {distance} км</span>
            </>
          ) : (
            <span>Днешен пробег: {distance > 0 ? `+${distance}` : 0} км</span>
          )}
        </div>
      </div>

      {/* Dual Card Layout for Start KM and End KM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* "Начален км": Soft gray text with optional unlock button */}
        <div className="bg-white/70 border border-white/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-chic-sm relative group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Начален км
            </span>
            <button
              type="button"
              onClick={() => setIsStartLocked(!isStartLocked)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg touch-bouncy"
              title={isStartLocked ? 'Отключи за ръчна корекция' : 'Заключи'}
            >
              {isStartLocked ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>
          </div>

          <div className="relative">
            {isStartLocked ? (
              <div className="text-2xl font-extrabold text-slate-500/80 font-mono tracking-tight py-1">
                {startKm.toLocaleString('bg-BG')}
                <span className="text-xs font-normal text-slate-400 ml-1 font-sans">км</span>
              </div>
            ) : (
              <input
                type="number"
                inputMode="numeric"
                value={startKm || ''}
                onChange={(e) => onStartKmChange(parseInt(e.target.value, 10) || 0)}
                className="w-full text-2xl font-extrabold text-slate-700 font-mono tracking-tight bg-amber-50/60 rounded-xl px-2 py-0.5 border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            )}
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {isStartLocked ? 'Автоматично от последен запис' : 'Ръчно редактиране'}
            </span>
          </div>
        </div>

        {/* "Краен км *": High-focus input with bouncy border */}
        <div className="bg-white/95 border-2 border-rose-300/80 focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-200/50 rounded-2xl p-3.5 flex flex-col justify-between shadow-chic transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="endKmInput" className="text-xs font-bold text-rose-500 uppercase tracking-wide flex items-center gap-1">
              Краен км <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-500/80">
              <ArrowRight className="w-3 h-3 text-rose-400" />
              <span>на таблото</span>
            </div>
          </div>

          <div className="flex items-baseline">
            <input
              id="endKmInput"
              type="number"
              inputMode="numeric"
              placeholder={startKm ? String(startKm + 25) : '12550'}
              value={endKm}
              onChange={(e) => onEndKmChange(e.target.value)}
              className="w-full text-2xl font-black text-slate-900 font-mono tracking-tight bg-transparent focus:outline-none placeholder:text-slate-300"
              required
            />
            <span className="text-sm font-bold text-slate-400 ml-1">км</span>
          </div>
          <span className="text-[10px] text-rose-400/90 font-medium mt-0.5">
            Въведи точно числото от таблото на Taigo
          </span>
        </div>
      </div>
    </div>
  );
};
