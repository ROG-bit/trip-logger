import React, { useRef } from 'react';
import { Calendar as CalendarIcon, CalendarDays } from 'lucide-react';
import { formatBulgarianTripDate } from '../services/api';

interface DatePickerPodProps {
  date: string;
  onChange: (newDate: string) => void;
}

export const DatePickerPod: React.FC<DatePickerPodProps> = ({ date, onChange }) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

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

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      if ('showPicker' in input && typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
        input.click();
      }
    } catch {
      input.focus();
      input.click();
    }
  };

  // Format date for Bulgarian display: "05/Ноември/2026, Четвъртък"
  const formatDisplayDate = (dStr: string) => {
    return formatBulgarianTripDate(dStr);
  };

  return (
    <div className="glass-card rounded-3xl p-4 transition-all">
      <div className="flex items-center justify-between gap-2">
        {/* Pastel Pod Icon & Label - Both clickable to open calendar */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={openDatePicker}
            title="Избери дата от календара"
            className="w-11 h-11 shrink-0 rounded-2xl bg-rose-100/80 hover:bg-rose-200/80 border border-rose-200/50 flex items-center justify-center text-rose-500 shadow-inner touch-bouncy cursor-pointer transition-all"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
          <div
            onClick={openDatePicker}
            className="min-w-0 cursor-pointer"
            title="Натисни за избор на дата"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Дата на пътуване
              </span>
              {date < todayStr && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300/60 shadow-xs whitespace-nowrap">
                  ⏪ Задна дата
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-slate-800 capitalize mt-0.5 truncate">
              {formatDisplayDate(date)}
            </div>
          </div>
        </div>

        {/* Quick buttons & Native Date Picker */}
        <div className="flex items-center gap-1.5 shrink-0">
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
          <div
            onClick={openDatePicker}
            title="Отвори календар"
            className="relative p-2 rounded-2xl bg-white/90 hover:bg-white border border-rose-200/70 shadow-chic-sm cursor-pointer touch-bouncy flex items-center justify-center text-rose-500"
          >
            <CalendarDays className="w-4 h-4 pointer-events-none" />
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) onChange(e.target.value);
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
