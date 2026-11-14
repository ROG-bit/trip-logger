import React, { useState, useEffect, useCallback } from 'react';
import { TripLogEntry, SheetTripEntry, SheetHistoryTotals } from '../types';
import {
  fetchTripHistoryFromSheet,
  getCachedSheetHistory,
  formatBulgarianTripDate,
  triggerFixDatesOnSheet,
  deleteTripLog,
} from '../services/api';
import { EditTripModal } from './EditTripModal';
import {
  X,
  History,
  CheckCircle2,
  Clock,
  MapPin,
  Fuel,
  Calendar,
  RefreshCw,
  Table,
  Gauge,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  Pencil,
  Trash2,
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'sheet' | 'local'>('sheet');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFixingDates, setIsFixingDates] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Edit & Delete modal states
  const [editingEntry, setEditingEntry] = useState<SheetTripEntry | TripLogEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<SheetTripEntry | TripLogEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Sheet data state
  const [sheetEntries, setSheetEntries] = useState<SheetTripEntry[]>([]);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [currentSheetName, setCurrentSheetName] = useState<string>('');
  const [totals, setTotals] = useState<SheetHistoryTotals>({
    totalDistance: 0,
    totalPersonalKm: 0,
    totalFuel: 0,
    tripCount: 0,
  });
  const [scope, setScope] = useState<'month' | 'all'>('month');

  // Load from sheet function
  const loadSheetData = useCallback(
    async (sheetToFetch?: string, scopeToFetch?: 'month' | 'all') => {
      setIsLoading(true);
      setError(null);

      const targetScope = scopeToFetch || scope;
      const targetSheet = targetScope === 'all' ? undefined : (sheetToFetch || currentSheetName || undefined);

      const res = await fetchTripHistoryFromSheet(targetSheet, targetScope);

      if (res.success && res.data) {
        setSheetEntries(res.data.entries || []);
        setAvailableSheets(res.data.availableSheets || []);
        if (res.data.sheetName) {
          setCurrentSheetName(res.data.sheetName);
        }
        setTotals(
          res.data.totals || {
            totalDistance: 0,
            totalPersonalKm: 0,
            totalFuel: 0,
            tripCount: (res.data.entries || []).length,
          }
        );
      } else {
        setError(res.error || 'Грешка при зареждане на данните от Google Таблицата');
        // Fallback to cache if available
        const cached = getCachedSheetHistory();
        if (cached) {
          setSheetEntries(cached.entries || []);
          setAvailableSheets(cached.availableSheets || []);
          if (cached.sheetName) setCurrentSheetName(cached.sheetName);
          setTotals(cached.totals);
        }
      }

      setIsLoading(false);
    },
    [currentSheetName, scope]
  );

  const handleFixDates = async () => {
    setIsFixingDates(true);
    setError(null);
    const res = await triggerFixDatesOnSheet(currentSheetName);
    if (res.success) {
      await loadSheetData(currentSheetName, scope);
    } else {
      setError(res.message);
    }
    setIsFixingDates(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEntry) return;
    setIsDeleting(true);
    setError(null);

    const row = 'row' in deletingEntry ? deletingEntry.row : undefined;
    const sheetName = 'sheetName' in deletingEntry ? deletingEntry.sheetName : undefined;
    let isoDate = 'isoDate' in deletingEntry && deletingEntry.isoDate ? deletingEntry.isoDate : '';
    if (!isoDate && deletingEntry.date.includes('-') && deletingEntry.date.length === 10) {
      isoDate = deletingEntry.date;
    }

    const res = await deleteTripLog({
      sheetName,
      row,
      date: isoDate || deletingEntry.date,
      id: deletingEntry.id,
    });

    setIsDeleting(false);
    setDeletingEntry(null);

    if (res.success) {
      await loadSheetData(currentSheetName, scope);
    } else {
      setError(res.message);
    }
  };

  // Fetch when opened
  useEffect(() => {
    if (isOpen) {
      // First populate with cached if present for instant rendering
      const cached = getCachedSheetHistory();
      if (cached) {
        setSheetEntries(cached.entries || []);
        setAvailableSheets(cached.availableSheets || []);
        if (cached.sheetName) setCurrentSheetName(cached.sheetName);
        setTotals(cached.totals);
      }
      // Then fetch fresh online data
      loadSheetData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingItems = history.filter((h) => h.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white/95 backdrop-blur-xl border border-white/80 rounded-t-3xl sm:rounded-3xl shadow-chic-hover max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 animate-slide-up"
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-gradient-to-r from-rose-50/70 via-pink-50/50 to-amber-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <span>Дневник на пътуванията</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-100/80 text-rose-600 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Директно четене от Google Sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => loadSheetData(currentSheetName, scope)}
              disabled={isLoading}
              title="Опресни данните от Google Sheets"
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-rose-500 flex items-center justify-center border border-slate-200/60 touch-bouncy shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center border border-slate-200/60 touch-bouncy shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-5 pt-3 pb-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-2xl w-full">
            <button
              type="button"
              onClick={() => setActiveTab('sheet')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'sheet'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-rose-500" />
              <span>Google Таблица ({sheetEntries.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('local')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'local'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5 text-purple-500" />
              <span>Телефон / Офлайн</span>
              {pendingItems.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Pending sync banner if any */}
        {pendingItems.length > 0 && (
          <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500 animate-spin" />
              {pendingItems.length} {pendingItems.length === 1 ? 'офлайн запис чака' : 'офлайн записа чакат'} връзка
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

        {/* TAB 1: GOOGLE SHEETS LIVE DATA */}
        {activeTab === 'sheet' && (
          <>
            {/* Sheet Selector & Scope Controls */}
            <div className="px-5 py-2.5 bg-white border-b border-rose-100/60 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Таб:</span>
                {availableSheets.length > 0 ? (
                  <select
                    value={scope === 'all' ? '__all__' : currentSheetName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__all__') {
                        setScope('all');
                        loadSheetData(undefined, 'all');
                      } else {
                        setScope('month');
                        setCurrentSheetName(val);
                        loadSheetData(val, 'month');
                      }
                    }}
                    className="text-xs font-bold text-slate-800 bg-rose-50/70 border border-rose-200/80 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  >
                    {availableSheets.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="__all__">Всички табове заедно</option>
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-slate-700">
                    {currentSheetName || 'Текущ месец'}
                  </span>
                )}
              </div>

              {/* Quick totals badge & Fix dates button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFixDates}
                  disabled={isFixingDates || isLoading}
                  title="Поправи дните и форматирай датите в Google Таблицата (напр. 01/Ноември/2026, Неделя)"
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/90 px-2 py-1 rounded-xl border border-rose-200/80 flex items-center gap-1 transition-all touch-bouncy disabled:opacity-50"
                >
                  <Calendar className={`w-3 h-3 ${isFixingDates ? 'animate-spin' : ''}`} />
                  <span>{isFixingDates ? 'Поправяне...' : 'Поправи датите'}</span>
                </button>
                <div className="text-[11px] font-extrabold text-slate-600 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
                  {totals.tripCount} {totals.tripCount === 1 ? 'запис' : 'записа'}
                </div>
              </div>
            </div>

            {/* Monthly Totals Dashboard Mini-Cards */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-rose-50/40 via-pink-50/30 to-amber-50/30 border-b border-rose-100/60 grid grid-cols-3 gap-2">
              <div className="bg-white/80 p-2 rounded-xl border border-rose-100 shadow-chic-sm text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 mb-0.5">
                  <Gauge className="w-3 h-3 text-rose-400" />
                  <span>Общо км</span>
                </div>
                <div className="text-sm font-extrabold text-slate-800 font-mono">
                  {totals.totalDistance.toLocaleString('bg-BG')} <span className="text-[10px] text-rose-500 font-normal">км</span>
                </div>
              </div>

              <div className="bg-white/80 p-2 rounded-xl border border-rose-100 shadow-chic-sm text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 mb-0.5">
                  <Fuel className="w-3 h-3 text-amber-500" />
                  <span>Гориво</span>
                </div>
                <div className="text-sm font-extrabold text-amber-600 font-mono">
                  {totals.totalFuel > 0 ? totals.totalFuel : '0'} <span className="text-[10px] font-normal">л</span>
                </div>
              </div>

              <div className="bg-white/80 p-2 rounded-xl border border-rose-100 shadow-chic-sm text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 mb-0.5">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Лични</span>
                </div>
                <div className="text-sm font-extrabold text-teal-600 font-mono">
                  {totals.totalPersonalKm > 0 ? totals.totalPersonalKm : '0'} <span className="text-[10px] font-normal">км</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center gap-2 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold">{error}</span>
                  <div className="text-[11px] text-amber-700 mt-0.5">
                    Показани са последно кешираните записи в телефона.
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Sheet List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading && sheetEntries.length === 0 ? (
                <div className="py-14 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 mx-auto mb-3 text-rose-400 animate-spin" />
                  <p className="text-sm font-semibold text-slate-600">
                    Четене на редовете от Google Таблицата...
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Свързване с таб „{currentSheetName || 'Текущ месец'}“ ✨
                  </p>
                </div>
              ) : sheetEntries.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-50 flex items-center justify-center text-rose-300">
                    <Table className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    Няма намерени попълнени записи в този таб
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Попълни форма от главното меню или избери друг месец отгоре! ✨
                  </p>
                </div>
              ) : (
                sheetEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white/90 border border-rose-100/90 rounded-2xl p-3.5 shadow-chic-sm space-y-2 hover:border-rose-300 transition-all"
                  >
                    {/* Top Row: Date & Sheet/Row Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-rose-400" />
                        <span>{entry.date}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                          {entry.sheetName ? `${entry.sheetName} • Ред ${entry.row}` : `Ред ${entry.row}`}
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Google Sheet</span>
                        </span>
                      </div>
                    </div>

                    {/* Route & Distance */}
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                        <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="truncate max-w-[210px]">{entry.route}</span>
                      </div>
                      <div className="text-base font-extrabold text-rose-500 font-mono">
                        +{entry.distance} км
                      </div>
                    </div>

                    {/* Meter Details */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="font-mono text-slate-600">{entry.startKm.toLocaleString('bg-BG')}</span>
                        {' → '}
                        <span className="font-mono font-bold text-slate-800">{entry.endKm.toLocaleString('bg-BG')}</span>
                        {' км'}
                        {entry.personalKm > 0 && (
                          <span className="ml-1.5 text-[11px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md font-semibold">
                            (лични: {entry.personalKm} км)
                          </span>
                        )}
                      </div>

                      {entry.fuelLitres && entry.fuelLitres > 0 && (
                        <div className="flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md">
                          <Fuel className="w-3 h-3 text-amber-500" />
                          <span>{entry.fuelLitres} л</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons: Edit & Delete */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingEntry(entry)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 transition-all touch-bouncy"
                      >
                        <Pencil className="w-3 h-3 text-rose-400" />
                        <span>Редактирай</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntry(entry)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200/80 hover:border-red-200 transition-all touch-bouncy"
                      >
                        <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                        <span>Изтрий</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* TAB 2: LOCAL PHONE HISTORY / OFFLINE QUEUE */}
        {activeTab === 'local' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-rose-50 flex items-center justify-center text-rose-300">
                  <History className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  Няма локални записи на този телефон
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Прегледай данните от Google Таблицата в първия раздел! ✨
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
                        <span>{formatBulgarianTripDate(trip.date)}</span>
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

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                        <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{trip.route}</span>
                      </div>
                      <div className="text-sm font-extrabold text-rose-500 font-mono">
                        +{trip.distance} км
                      </div>
                    </div>

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

                    {/* Action buttons: Edit & Delete */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingEntry(trip)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 transition-all touch-bouncy"
                      >
                        <Pencil className="w-3 h-3 text-rose-400" />
                        <span>Редактирай</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntry(trip)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200/80 hover:border-red-200 transition-all touch-bouncy"
                      >
                        <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                        <span>Изтрий</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-center flex items-center justify-between px-5 text-[11px] text-slate-400">
          <span>Volkswagen Taigo • СВ 8529 XH</span>
          <span className="text-rose-500 font-medium">Мая Атанасова 💖</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingEntry && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-chic-hover border border-rose-100 space-y-4 animate-slide-up text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">
                Изтриване на пътен лист?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Сигурни ли сте, че искате да изтриете записа за{' '}
                <b className="text-slate-800">{formatBulgarianTripDate(deletingEntry.date)}</b>?
              </p>
              <div className="text-[11px] text-rose-500 font-medium mt-1 bg-rose-50 p-2 rounded-xl">
                Това ще изчисти километража и маршрута в таблицата (формулите в колона F остават защитени).
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-full text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all touch-bouncy"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-full text-xs font-bold text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-200 transition-all touch-bouncy flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Изтриване...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Да, изтрий 🗑️</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      <EditTripModal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        entry={editingEntry}
        onSuccess={() => {
          loadSheetData(currentSheetName, scope);
        }}
      />
    </div>
  );
};
