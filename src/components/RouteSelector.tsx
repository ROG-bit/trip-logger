import React from 'react';
import { MapPin, Navigation, Edit3 } from 'lucide-react';
import { CONFIG } from '../config';

interface RouteSelectorProps {
  route: string;
  onChange: (route: string) => void;
}

export const RouteSelector: React.FC<RouteSelectorProps> = ({ route, onChange }) => {
  return (
    <div className="glass-card rounded-3xl p-5 space-y-3.5 transition-all">
      {/* Header with Soft Lilac Pastel Pod */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-purple-100/70 border border-purple-200/50 flex items-center justify-center text-purple-600 shadow-inner">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Маршрут
          </span>
          <h2 className="text-sm font-bold text-slate-800">
            Дестинация & Цел
          </h2>
        </div>
      </div>

      {/* Quick-tap bubbly pills for frequent routes */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
          <Navigation className="w-3 h-3 text-purple-400" />
          <span>Бърз избор с едно докосване:</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {CONFIG.FREQUENT_ROUTES.map((item) => {
            const isSelected = route === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onChange(item)}
                className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all duration-200 touch-bouncy border ${
                  isSelected
                    ? 'bg-gradient-to-r from-rose-400 via-pink-400 to-rose-400 text-white border-rose-300 shadow-md shadow-rose-300/30 scale-[1.02]'
                    : 'bg-white/80 text-slate-700 hover:bg-white border-white/90 shadow-chic-sm hover:border-rose-200'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clean text field beneath to type a custom route if needed */}
      <div className="pt-1">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Edit3 className="w-4 h-4 text-purple-400" />
          </div>
          <input
            type="text"
            placeholder="Или напиши друг маршрут (напр. София - Пловдив)..."
            value={route}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white/70 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-rose-200 focus:bg-white transition-all shadow-chic-inner"
          />
        </div>
      </div>
    </div>
  );
};
