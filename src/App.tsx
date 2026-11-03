import { useState, useEffect, FormEvent } from 'react';
import { Header } from './components/Header';
import { DatePickerPod } from './components/DatePickerPod';
import { OdometerPod } from './components/OdometerPod';
import { RouteSelector } from './components/RouteSelector';
import { SecondaryRow } from './components/SecondaryRow';
import { OfflineBanner } from './components/OfflineBanner';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { SuccessModal } from './components/SuccessModal';
import { Toast, ToastData } from './components/Toast';
import { CONFIG } from './config';
import { TripLogEntry } from './types';
import {
  getStoredLastKm,
  setStoredLastKm,
  getStoredHistory,
  getStoredQueue,
  fetchLatestKmFromApi,
  sendTripLog,
  syncPendingQueue,
} from './services/api';
import { Send, Sparkles } from 'lucide-react';

export function App() {
  // Helper for today's date
  const getTodayDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // State
  const [date, setDate] = useState<string>(getTodayDate());
  const [startKm, setStartKm] = useState<number>(() => getStoredLastKm());
  const [endKm, setEndKm] = useState<string>('');
  const [route, setRoute] = useState<string>(CONFIG.FREQUENT_ROUTES[0]);
  const [personalKm, setPersonalKm] = useState<string>('0');
  const [fuelLitres, setFuelLitres] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [pendingQueue, setPendingQueue] = useState<TripLogEntry[]>(() => getStoredQueue());
  const [history, setHistory] = useState<TripLogEntry[]>(() => getStoredHistory());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Modals & Toast
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [lastSavedTrip, setLastSavedTrip] = useState<TripLogEntry | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(CONFIG.STORAGE_KEYS.FORM_DRAFT);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.date) setDate(parsed.date);
        if (parsed.endKm) setEndKm(parsed.endKm);
        if (parsed.route) setRoute(parsed.route);
        if (parsed.personalKm) setPersonalKm(parsed.personalKm);
        if (parsed.fuelLitres) setFuelLitres(parsed.fuelLitres);
      }
    } catch (e) {
      console.warn('Failed to load draft:', e);
    }
  }, []);

  // Save draft whenever inputs change
  useEffect(() => {
    const draft = { date, endKm, route, personalKm, fuelLitres };
    localStorage.setItem(CONFIG.STORAGE_KEYS.FORM_DRAFT, JSON.stringify(draft));
  }, [date, endKm, route, personalKm, fuelLitres]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Връзката е възстановена! Можеш да синхронизираш. 🌐', 'info');
      // Attempt auto sync if there are pending items
      const queue = getStoredQueue();
      if (queue.length > 0) {
        handleSyncPending();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setOfflineMessage('Няма връзка (подземен гараж?). Данните са запазени, опитай отново горе на светло! ✨');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for latest km from API
    fetchLatestKmFromApi().then(({ km, isOnline: apiOnline }) => {
      if (apiOnline && km > 0) {
        setStartKm(km);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncPending = async () => {
    setIsSyncing(true);
    try {
      const { syncedCount, failedCount } = await syncPendingQueue();
      setPendingQueue(getStoredQueue());
      setHistory(getStoredHistory());

      if (syncedCount > 0) {
        showToast(
          `Синхронизирани са ${syncedCount} записа с Google Таблицата! 💖`,
          'success'
        );
        if (failedCount === 0) {
          setOfflineMessage(null);
        }
      } else if (failedCount > 0) {
        showToast('Все още няма връзка със сървъра. Опитай отново малко по-късно.', 'error');
      }
    } catch {
      showToast('Грешка при синхронизация.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshSettings = () => {
    setStartKm(getStoredLastKm());
  };

  // Form Submit Handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const parsedEnd = parseInt(endKm, 10);
    if (isNaN(parsedEnd) || parsedEnd <= 0) {
      showToast('Моля, въведи коректен краен километраж от таблото!', 'error');
      return;
    }

    if (parsedEnd < startKm) {
      showToast('Крайният километраж не може да е по-малък от началния!', 'error');
      return;
    }

    const distance = parsedEnd - startKm;
    const parsedPersonal = parseInt(personalKm, 10) || 0;
    const parsedFuel = fuelLitres ? parseFloat(fuelLitres.replace(',', '.')) : null;

    // Tactile vibration if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([40, 60, 40]);
    }

    const newTrip: TripLogEntry = {
      id: `trip_${Date.now()}`,
      date,
      startKm,
      endKm: parsedEnd,
      distance,
      route: route.trim() || 'София',
      personalKm: parsedPersonal,
      fuelLitres: parsedFuel,
      driver: CONFIG.VEHICLE.driver,
      plate: CONFIG.VEHICLE.plate,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    setIsSubmitting(true);

    try {
      const result = await sendTripLog(newTrip);

      if (result.success) {
        // Online success: advance startKm and clear inputs
        setStartKm(parsedEnd);
        setStoredLastKm(parsedEnd);
        setEndKm('');
        setFuelLitres('');
        setPersonalKm('0');
        localStorage.removeItem(CONFIG.STORAGE_KEYS.FORM_DRAFT);
        setOfflineMessage(null);

        // Open permanent confirmation modal with OK button
        setLastSavedTrip(newTrip);
        setSuccessMessage(result.message || 'Данните са записани в Google Таблицата! 💖');
        setIsSuccessModalOpen(true);
      } else {
        // Underground garage / offline condition:
        // DO NOT clear inputs as per requirements!
        setOfflineMessage(result.message || 'Няма връзка (подземен гараж?). Данните са запазени, опитай отново горе на светло! ✨');
        showToast('Запазено локално (подземен гараж). Ще се изпрати при връзка! ✨', 'info');
      }

      // Update state history and queue
      setPendingQueue(getStoredQueue());
      setHistory(getStoredHistory());
    } catch {
      setOfflineMessage('Няма връзка (подземен гараж?). Данните са запазени, опитай отново горе на светло! ✨');
      setPendingQueue(getStoredQueue());
      setHistory(getStoredHistory());
      showToast('Данните са съхранени на сигурно място в телефона! 📱', 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedEnd = parseInt(endKm, 10);
  const liveDistance = !isNaN(parsedEnd) && parsedEnd >= startKm ? parsedEnd - startKm : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFBF7] via-[#FDF5F2] to-[#F9ECE8] flex flex-col justify-between pb-8 px-4 sm:px-6">
      {/* Toast Notification Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Main Container constrained to mobile phone width */}
      <div className="w-full max-w-md mx-auto space-y-4 pt-2">
        {/* Floating Top Vehicle Header Card */}
        <Header
          isOnline={isOnline}
          hasPendingQueue={pendingQueue.length > 0}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />

        {/* Offline Underground Garage Banner */}
        <OfflineBanner
          message={offlineMessage}
          pendingCount={pendingQueue.length}
          isSyncing={isSyncing}
          onSync={handleSyncPending}
          onDismiss={() => setOfflineMessage(null)}
        />

        {/* Main Smart Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Picker Pod */}
          <DatePickerPod date={date} onChange={setDate} />

          {/* Odometer Pod (Dual Card: Start KM & End KM + live difference badge) */}
          <OdometerPod
            startKm={startKm}
            endKm={endKm}
            onStartKmChange={setStartKm}
            onEndKmChange={setEndKm}
          />

          {/* Route Selection (Frequent route pills + custom input) */}
          <RouteSelector route={route} onChange={setRoute} />

          {/* Secondary Row (Personal KM & Fuel litres) */}
          <SecondaryRow
            personalKm={personalKm}
            fuelLitres={fuelLitres}
            onPersonalKmChange={setPersonalKm}
            onFuelLitresChange={setFuelLitres}
          />

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !endKm}
              className={`w-full py-4 px-6 text-base font-extrabold rounded-full transition-all duration-300 flex items-center justify-center gap-2.5 shadow-lg ${
                isSubmitting || !endKm
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-rose-400 via-pink-400 to-rose-400 hover:opacity-95 active:scale-95 text-white shadow-rose-300/40 hover:shadow-chic-hover'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Записване...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>
                    {liveDistance > 0
                      ? `Запиши пътния лист (+${liveDistance} км) ✨`
                      : 'Запиши пътен лист ✨'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer info & quick stats */}
        <div className="text-center pt-2 pb-4">
          <p className="text-[11px] font-medium text-slate-400/90 flex items-center justify-center gap-1.5">
            <span>Taigo Log</span>
            <span>•</span>
            <span>СВ 8529 XH</span>
            <span>•</span>
            <span>Мая Атанасова</span>
          </p>
        </div>
      </div>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSyncAll={handleSyncPending}
        isSyncing={isSyncing}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdated={handleRefreshSettings}
        showToast={showToast}
      />

      {/* Permanent Success Confirmation Modal with OK button */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        lastTrip={lastSavedTrip}
        serverMessage={successMessage}
      />
    </div>
  );
}

export default App;

