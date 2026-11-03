import { CONFIG } from '../config';
import { SubmitPayload, TripLogEntry } from '../types';

export function getStoredApiUrl(): string {
  const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.API_URL);
  if (stored && !stored.includes('PLACEHOLDER_FOR_GOOGLE_APPS_SCRIPT')) {
    return stored;
  }
  return CONFIG.DEFAULT_API_URL;
}

export function setStoredApiUrl(url: string): void {
  localStorage.setItem(CONFIG.STORAGE_KEYS.API_URL, url.trim());
}

export function getStoredLastKm(): number {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_KM);
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return CONFIG.VEHICLE.initialKm;
}

export function setStoredLastKm(km: number): void {
  localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_KM, km.toString());
}

export function getStoredHistory(): TripLogEntry[] {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse history:', e);
  }
  return [];
}

export function saveTripToHistory(trip: TripLogEntry): void {
  const history = getStoredHistory();
  // Check if already in history by id
  const index = history.findIndex(h => h.id === trip.id);
  if (index >= 0) {
    history[index] = trip;
  } else {
    history.unshift(trip);
  }
  // Keep last 100 entries
  localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(history.slice(0, 100)));
}

export function getStoredQueue(): TripLogEntry[] {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.PENDING_QUEUE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse queue:', e);
  }
  return [];
}

export function saveQueue(queue: TripLogEntry[]): void {
  localStorage.setItem(CONFIG.STORAGE_KEYS.PENDING_QUEUE, JSON.stringify(queue));
}

export function addToPendingQueue(trip: TripLogEntry): void {
  const queue = getStoredQueue().filter(q => q.id !== trip.id);
  queue.push({ ...trip, status: 'pending' });
  saveQueue(queue);
  saveTripToHistory({ ...trip, status: 'pending' });
}

export function removeFromPendingQueue(id: string): void {
  const queue = getStoredQueue().filter(q => q.id !== id);
  saveQueue(queue);
}

/**
 * Fetch latest odometer km from Google Apps Script Web App
 */
export async function fetchLatestKmFromApi(): Promise<{ km: number; isOnline: boolean }> {
  const apiUrl = getStoredApiUrl();
  const cachedKm = getStoredLastKm();

  // If still placeholder or browser is offline
  if (!navigator.onLine || apiUrl.includes('PLACEHOLDER_FOR_GOOGLE_APPS_SCRIPT')) {
    return { km: cachedKm, isOnline: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const separator = apiUrl.includes('?') ? '&' : '?';
    const response = await fetch(`${apiUrl}${separator}action=getLatestKm`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.latestKm === 'number' && data.latestKm > 0) {
        setStoredLastKm(data.latestKm);
        return { km: data.latestKm, isOnline: true };
      }
    }
  } catch (err) {
    console.warn('Could not fetch latest KM from server, using cached:', err);
  }

  return { km: cachedKm, isOnline: false };
}

/**
 * Submit trip log to Google Apps Script.
 * Uses text/plain;charset=utf-8 to avoid CORS preflight options issues in Apps Script.
 */
export async function sendTripLog(entry: TripLogEntry): Promise<{ success: boolean; isOffline: boolean; message?: string }> {
  const apiUrl = getStoredApiUrl();

  const payload: SubmitPayload = {
    action: 'addLog',
    date: entry.date,
    startKm: entry.startKm,
    endKm: entry.endKm,
    distance: entry.distance,
    route: entry.route,
    personalKm: entry.personalKm,
    fuelLitres: entry.fuelLitres || null,
    driver: entry.driver,
    plate: entry.plate,
    timestamp: entry.timestamp,
  };

  // If network is offline or no real API URL, save to pending queue immediately
  if (!navigator.onLine || apiUrl.includes('PLACEHOLDER_FOR_GOOGLE_APPS_SCRIPT')) {
    addToPendingQueue(entry);
    setStoredLastKm(entry.endKm);
    return {
      success: false,
      isOffline: true,
      message: 'Няма връзка (подземен гараж?). Данните са запазени, опитай отново горе на светло! ✨',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.type !== 'opaque') {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const result = await response.json().catch(() => ({ status: 'success' }));

    // Mark as synced and update cached last km
    const syncedEntry: TripLogEntry = { ...entry, status: 'synced' };
    saveTripToHistory(syncedEntry);
    removeFromPendingQueue(entry.id);
    setStoredLastKm(entry.endKm);

    return {
      success: true,
      isOffline: false,
      message: result.message || 'Пътуването е записано успешно в Google Таблицата! 💖',
    };
  } catch (error: any) {
    console.error('Submission failed:', error);
    // Queue offline for later
    addToPendingQueue(entry);
    setStoredLastKm(entry.endKm);

    return {
      success: false,
      isOffline: true,
      message: 'Няма връзка (подземен гараж?). Данните са запазени, опитай отново горе на светло! ✨',
    };
  }
}

/**
 * Retry syncing all pending offline logs
 */
export async function syncPendingQueue(): Promise<{ syncedCount: number; failedCount: number }> {
  const queue = getStoredQueue();
  if (queue.length === 0) return { syncedCount: 0, failedCount: 0 };

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    const res = await sendTripLog(item);
    if (res.success) {
      syncedCount++;
    } else {
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}

/**
 * Recommended Google Apps Script Code snippet that user can copy
 */
export const GOOGLE_APPS_SCRIPT_SAMPLE = `// ==========================================
// Google Apps Script Web App за Пътен Лист
// Volkswagen Taigo (СВ 8529 XH)
// ==========================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Ако таблицата е празна, създай заглавен ред:
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Дата",
        "Начален км",
        "Краен км",
        "Пробег (км)",
        "Маршрут",
        "Лични км",
        "Заредено гориво (л)",
        "Водач",
        "Рег. номер",
        "Време на запис"
      ]);
      // Форматиране на хедъра
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#FDF5F2");
    }
    
    // Добавяне на новия ред с данни
    sheet.appendRow([
      data.date,
      Number(data.startKm),
      Number(data.endKm),
      Number(data.distance),
      data.route,
      Number(data.personalKm || 0),
      data.fuelLitres ? Number(data.fuelLitres) : "",
      data.driver,
      data.plate,
      new Date().toLocaleString("bg-BG")
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Записът бе добавен успешно!",
      latestKm: Number(data.endKm)
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var latestKm = 0;
    
    if (lastRow > 1) {
      // Колона 3 е "Краен км"
      latestKm = sheet.getRange(lastRow, 3).getValue();
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      latestKm: Number(latestKm)
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

