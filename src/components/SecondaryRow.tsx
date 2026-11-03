import React from 'react';
import { Fuel, UserCheck } from 'lucide-react';

interface SecondaryRowProps {
  personalKm: string;
  fuelLitres: string;
  onPersonalKmChange: (val: string) => void;
  onFuelLitresChange: (val: string) => void;
}

export const SecondaryRow: React.FC<SecondaryRowProps> = ({
  personalKm,
  fuelLitres,
  onPersonalKmChange,
  onFuelLitresChange,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {/* Лични километри */}
      <div className="glass-card rounded-3xl p-4 transition-all">
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/50 flex items-center justify-center text-teal-600 shadow-inner">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Лични километри
            </div>
            <div className="text-[11px] text-slate-400">
              (ако има частно каране)
            </div>
          </div>
        </div>

        <div className="flex items-baseline bg-white/70 border border-slate-200/70 rounded-2xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-teal-200 focus-within:bg-white transition-all">
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={personalKm}
            onChange={(e) => onPersonalKmChange(e.target.value)}
            className="w-full text-lg font-bold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-300 font-mono"
          />
          <span className="text-xs font-semibold text-slate-400 ml-1">км</span>
        </div>
      </div>

      {/* Заредено гориво (л) */}
      <div className="glass-card rounded-3xl p-4 transition-all">
        <div className="flex items-center gap-3 mb-2.5">
          {/* Pale Coral pastel pod for fuel */}
          <div className="w-9 h-9 rounded-xl bg-rose-100/70 border border-rose-200/50 flex items-center justify-center text-rose-500 shadow-inner">
            <Fuel className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Заредено гориво
            </div>
            <div className="text-[11px] text-slate-400">
              (незадължително)
            </div>
          </div>
        </div>

        <div className="flex items-baseline bg-white/70 border border-slate-200/70 rounded-2xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-rose-200 focus-within:bg-white transition-all">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="напр. 35.5"
            value={fuelLitres}
            onChange={(e) => onFuelLitresChange(e.target.value)}
            className="w-full text-lg font-bold text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-300 font-mono"
          />
          <span className="text-xs font-semibold text-slate-400 ml-1">литра</span>
        </div>
      </div>
    </div>
  );
};

