import React from 'react';
import { Calendar as CalendarIcon, Sparkle } from 'lucide-react';

interface DatePickerPodProps {
  date: string;
  onChange: (newDate: string) => void;
}

export const DatePickerPod: React.FC<DatePickerPodProps> = ({ date, onChange }) => {
  // Helpers for quick today / yesterday
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getYesterdayStr = () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  // Format date for Bulgarian display
  const formatDisplayDate = (dStr: string) => {
    try {
      const [year, month, day] = dStr.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return d.toLocaleDateString('bg-BG', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="glass-card rounded-3xl p-4 transition-all">
      <div className="flex items-center justify-between gap-3">
        {/* Pastel Pod Icon & Label */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-100/80 border border-rose-200/50 flex items-center justify-center text-rose-500 shadow-inner">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Дата на пътуване
            </div>
            <div className="text-sm font-bold text-slate-800 capitalize">
              {formatDisplayDate(date)}
            </div>
          </div>
        </div>

        {/* Quick buttons & Native Date Picker */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(todayStr)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold touch-bouncy border transition-all ${
              date === todayStr
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                : 'bg-white/70 text-slate-600 hover:bg-white border-slate-200/60'
            }`}
          >
            Днес
          </button>
          <button
            type="button"
            onClick={() => onChange(yesterdayStr)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold touch-bouncy border transition-all ${
              date === yesterdayStr
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                : 'bg-white/70 text-slate-600 hover:bg-white border-slate-200/60'
            }`}
          >
            Вчера
          </button>

          {/* Actual date input wrapped in a chic pill container */}
          <label className="relative p-2 rounded-2xl bg-white/90 hover:bg-white border border-rose-200/70 shadow-chic-sm cursor-pointer touch-bouncy flex items-center justify-center text-rose-500">
            <Sparkle className="w-4 h-4" />
            <input
              type="date"
              value={date}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
