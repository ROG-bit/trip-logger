import { CONFIG } from '../config';
import { SubmitPayload, TripLogEntry, SheetHistoryResponse, SheetTripEntry } from '../types';

export const MONTHS_BG = [
  'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
  'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
];

export const DAYS_BG = [
  'Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'
];

/**
 * Format date string (YYYY-MM-DD) into Bulgarian format: "01/Ноември/2026, Неделя"
 */
export function formatBulgarianTripDate(dateStr: string): string {
  if (!dateStr) return '';
  // If already formatted like "01/Ноември/2026, Неделя"
  if (dateStr.includes('/') && dateStr.includes(',')) {
    return dateStr;
  }
  try {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const dd = String(day).padStart(2, '0');
      const mmName = MONTHS_BG[month] || '';
      const dayName = DAYS_BG[d.getDay()] || '';
      return `${dd}/${mmName}/${year}, ${dayName}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

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

export function getCachedSheetHistory(): SheetHistoryResponse | null {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.SHEET_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse cached sheet history:', e);
  }
  return null;
}

export function saveCachedSheetHistory(data: SheetHistoryResponse): void {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.SHEET_HISTORY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save cached sheet history:', e);
  }
}

/**
 * Find entry for a specific date (YYYY-MM-DD) in cached sheet history or local history
 */
export function findTripForDate(dateStr: string): SheetTripEntry | TripLogEntry | null {
  const cached = getCachedSheetHistory();
  if (cached && cached.entries) {
    const parts = dateStr.split('-');
    const day = parts.length === 3 ? parseInt(parts[2], 10) : 0;
    const targetRow = 9 + day;

    const found = cached.entries.find((e) => {
      if (e.isoDate && e.isoDate === dateStr) return true;
      if (day > 0 && e.row === targetRow) return true;
      return false;
    });
    if (found) return found;
  }

  const localHistory = getStoredHistory();
  const localFound = localHistory.find((h) => h.date === dateStr);
  if (localFound) return localFound;

  return null;
}

/**
 * Suggest starting KM for a date by finding the closest previous trip (from cached sheet and local history)
 */
export function getSuggestedStartKmForDate(dateStr: string): number | null {
  const parts = dateStr.split('-');
  if (parts.length < 3) return null;
  const targetDay = parseInt(parts[2], 10);
  const targetRow = 9 + targetDay;

  let bestKm: number | null = null;
  let bestDistanceInDays = Infinity;

  // 1. Check cached sheet entries
  const cached = getCachedSheetHistory();
  if (cached && cached.entries) {
    for (const e of cached.entries) {
      if (e.row < targetRow && e.endKm > 0) {
        const diff = targetRow - e.row;
        if (diff < bestDistanceInDays) {
          bestDistanceInDays = diff;
          bestKm = e.endKm;
        }
      }
    }
  }

  // 2. Check local history (especially useful right after submitting yesterday's trip!)
  const localHistory = getStoredHistory();
  for (const h of localHistory) {
    if (h.date && h.date < dateStr && h.endKm > 0) {
      // Calculate day difference
      const hParts = h.date.split('-');
      if (hParts.length === 3 && hParts[0] === parts[0] && hParts[1] === parts[1]) {
        const hDay = parseInt(hParts[2], 10);
        if (hDay < targetDay) {
          const diff = targetDay - hDay;
          if (diff < bestDistanceInDays) {
            bestDistanceInDays = diff;
            bestKm = h.endKm;
          }
        }
      } else {
        // Different month/year, but still in past
        if (bestKm === null) {
          bestKm = h.endKm;
        }
      }
    }
  }

  return bestKm;
}

/**
 * Returns the next day date string (YYYY-MM-DD)
 */
export function getNextDayStr(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const nextDate = new Date(y, m - 1, d + 1);
    const ny = nextDate.getFullYear();
    const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const nd = String(nextDate.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  } catch {
    return dateStr;
  }
}

/**
 * Fetch trip history entries directly from Google Sheets
 */
export async function fetchTripHistoryFromSheet(
  sheetName?: string,
  scope?: 'month' | 'all'
): Promise<{ success: boolean; data?: SheetHistoryResponse; error?: string }> {
  const apiUrl = getStoredApiUrl();
  const cached = getCachedSheetHistory();

  // If still placeholder or browser is offline
  if (!navigator.onLine || apiUrl.includes('PLACEHOLDER_FOR_GOOGLE_APPS_SCRIPT')) {
    if (cached) {
      return { success: true, data: cached };
    }
    return { success: false, error: 'Няма връзка с интернет (подземен гараж?).' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const separator = apiUrl.includes('?') ? '&' : '?';
    let query = `${separator}action=getHistory`;
    if (sheetName) {
      query += `&sheetName=${encodeURIComponent(sheetName)}`;
    }
    if (scope === 'all') {
      query += `&scope=all`;
    }

    const response = await fetch(`${apiUrl}${query}`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const json: SheetHistoryResponse = await response.json();
      if (json && json.status === 'success') {
        saveCachedSheetHistory(json);
        return { success: true, data: json };
      }
    }
    throw new Error('Неуспешен отговор от Google Таблицата');
  } catch (err: any) {
    console.warn('Could not fetch sheet history from server, using cached:', err);
    if (cached) {
      return { success: true, data: cached };
    }
    return { success: false, error: err.message || 'Грешка при зареждане на данните' };
  }
}

/**
 * Update an existing trip log in Google Sheets (and local history)
 */
export async function updateTripLog(
  payload: SubmitPayload
): Promise<{ success: boolean; message: string }> {
  const apiUrl = getStoredApiUrl();

  const body = {
    ...payload,
    action: 'updateLog',
    isEdit: true,
  };

  // Update in local history if present
  const history = getStoredHistory();
  const histIdx = history.findIndex(
    (h) => (payload.date && h.date === payload.date) || (payload.row && h.id.includes(`_r${payload.row}`))
  );
  if (histIdx >= 0) {
    history[histIdx] = {
      ...history[histIdx],
      startKm: payload.startKm,
      endKm: payload.endKm,
      distance: payload.distance,
      route: payload.route,
      personalKm: payload.personalKm,
      fuelLitres: payload.fuelLitres,
      status: 'synced',
    };
    localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }

  // Update in cached sheet history if present
  const cached = getCachedSheetHistory();
  if (cached && cached.entries) {
    const entryIdx = cached.entries.findIndex(
      (e) => (payload.row && e.row === payload.row && (!payload.sheetName || e.sheetName === payload.sheetName))
    );
    if (entryIdx >= 0) {
      cached.entries[entryIdx] = {
        ...cached.entries[entryIdx],
        startKm: payload.startKm,
        endKm: payload.endKm,
        distance: payload.distance,
        route: payload.route,
        personalKm: payload.personalKm,
        fuelLitres: payload.fuelLitres,
      };
      saveCachedSheetHistory(cached);
    }
  }

  if (!navigator.onLine || apiUrl.includes('PLACEHOLDER_FOR_GOOGLE_APPS_SCRIPT')) {
    return {
      success: true,
      message: 'Записът бе обновен локално (офлайн режим)! 📱✨',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const result = await response.json().catch(() => ({ status: 'success' }));
    return {
      success: true,
      message: result.message || 'Записът бе обновен успешно в Google Таблицата! 💾✨',
    };
  } catch (error: any) {
    console.error('Update failed:', error);
    return {
      success: false,
      message: error.message || 'Грешка при обновяване на записа.',
    };
  }
}

/**
 * Delete a trip log from Google Sheets (clears cells C, D, E, G, H) and local history
 */
export async function deleteTripLog(params: {
  sheetName?: string;
  row?: number;
  date?: string;
  id?: string;
}): Promise<{ success: boolean; message: string }> {
  const apiUrl = getStoredApiUrl();

  // Remove from local history
  if (params.id || params.date) {
    const history = getStoredHistory().filter(
      (h) => (params.id ? h.id !== params.id : true) && (params.date ? h.date !== params.date : true)
    );
    localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(history));
    
    // Also remove from pending queue if offline
    if (params.id) {
      removeFromPendingQueue(params.id);
    }
  }

  // Remove from cached sheet history
  const cached = getCachedSheetHistory();
  if (cached && cached.entries) {
    cached.entries = cached.entries.filter(
      (e) => !(params.row && e.row === params.row && (!params.sheetName || e.sheetName === params.sheetName))
    );
    cached.totals.tripCount = cached.entries.length;
    saveCachedSheetHistory(cached);
  }

  if (!navigator.onLine || apiUrl.includes('PLACEHOLDER_FOR_GOOGLE_APPS_SCRIPT')) {
    return {
      success: true,
      message: 'Записът бе изтрит локално! 🗑️',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'deleteLog',
        sheetName: params.sheetName,
        row: params.row,
        date: params.date,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const result = await response.json().catch(() => ({ status: 'success' }));
    return {
      success: true,
      message: result.message || 'Записът бе изтрит успешно от Google Таблицата! 🗑️',
    };
  } catch (error: any) {
    console.error('Delete failed:', error);
    return {
      success: false,
      message: error.message || 'Грешка при изтриване на записа.',
    };
  }
}

/**
 * Triggers server-side date fixing in the Google Sheet (formats column B correctly to "01/Ноември/2026, Неделя")
 */
export async function triggerFixDatesOnSheet(sheetName?: string): Promise<{ success: boolean; message: string }> {
  const apiUrl = getStoredApiUrl();
  if (!navigator.onLine || apiUrl.includes('PLACEHOLDER_FOR_GOOGLE_APPS_SCRIPT')) {
    return { success: false, message: 'Няма връзка с интернет (подземен гараж?).' };
  }
  try {
    const separator = apiUrl.includes('?') ? '&' : '?';
    const query = `${separator}action=fixDates${sheetName ? `&sheetName=${encodeURIComponent(sheetName)}` : ''}`;
    const response = await fetch(`${apiUrl}${query}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, message: data.message || 'Датите бяха поправени успешно в Google Таблицата! 📅✨' };
    }
    return { success: false, message: 'Грешка при комуникация с Google Таблицата.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Грешка при поправка на датите.' };
  }
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

    // Mark as synced and update local storage & cache
    const syncedEntry: TripLogEntry = { ...entry, status: 'synced' };
    saveTripToHistory(syncedEntry);
    removeFromPendingQueue(entry.id);

    // Only advance stored last km if endKm is higher than current stored
    const currentLast = getStoredLastKm();
    if (entry.endKm > currentLast) {
      setStoredLastKm(entry.endKm);
    }

    // Update cachedSheetHistory so immediate next queries see this day
    const cached = getCachedSheetHistory();
    if (cached && cached.entries) {
      const parts = entry.date.split('-');
      const day = parts.length === 3 ? parseInt(parts[2], 10) : 0;
      const row = 9 + day;
      const existingIdx = cached.entries.findIndex((e) => e.row === row || e.date === entry.date);
      const sheetItem: SheetTripEntry = {
        id: `${cached.sheetName || 'sheet'}_r${row}`,
        row,
        sheetName: cached.sheetName || '',
        date: entry.date,
        isoDate: entry.date,
        driver: entry.driver,
        startKm: entry.startKm,
        endKm: entry.endKm,
        distance: entry.distance,
        personalKm: entry.personalKm,
        fuelLitres: entry.fuelLitres,
        route: entry.route,
      };
      if (existingIdx >= 0) {
        cached.entries[existingIdx] = sheetItem;
      } else {
        cached.entries.push(sheetItem);
      }
      saveCachedSheetHistory(cached);
    }

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
// Volkswagen Taigo (СВ 8529 XH) - Мая Атанасова
// ТОЧНО СЪОТВЕТСТВИЕ С ФИРМЕНИЯ ДОКУМЕНТ (A до H):
// A: Име на водача | B: Дата | C: Начален | D: Краен | E: Лични | F: Общо за деня | G: Гориво (л) | H: Маршрут
// ЗАЩИТА НА ФОРМУЛАТА В КОЛОНА F & ПЛАВЕН МЕСЕЧЕН ПРЕХОД
// ==========================================

var SPREADSHEET_ID = ""; // Оставете празно, ако е пуснат от самата таблица

var MONTHS_BG = [
  "Януари", "Февруари", "Март", "Април", "Май", "Юни",
  "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"
];

var MONTHS_EN_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var MONTHS_BG_SHORT = ["Яну", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];
var DAYS_BG = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];
var DAYS_EN_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Не е намерена свързана Google Таблица.");
  return ss;
}

function getPossibleSheetNames(year, monthIndex) {
  var yy = String(year).slice(-2);
  var mm = ("0" + (monthIndex + 1)).slice(-2);
  return [
    MONTHS_BG[monthIndex] + " " + year,
    MONTHS_BG[monthIndex] + " " + yy,
    MONTHS_EN_SHORT[monthIndex] + "-" + yy,
    MONTHS_EN_SHORT[monthIndex] + " " + year,
    MONTHS_BG_SHORT[monthIndex] + "-" + yy,
    MONTHS_BG[monthIndex],
    mm + "." + year
  ];
}

function getSheetForMonth(ss, year, monthIndex) {
  var names = getPossibleSheetNames(year, monthIndex);
  for (var i = 0; i < names.length; i++) {
    var sheet = ss.getSheetByName(names[i]);
    if (sheet) return sheet;
  }
  var sheets = ss.getSheets();
  for (var j = 0; j < sheets.length; j++) {
    var sName = sheets[j].getName().trim().toLowerCase();
    for (var k = 0; k < names.length; k++) {
      if (sName === names[k].toLowerCase()) return sheets[j];
    }
  }
  return null;
}

function getPreviousMonthInfo(year, monthIndex) {
  var pIndex = monthIndex - 1;
  var pYear = year;
  if (pIndex < 0) { pIndex = 11; pYear = year - 1; }
  return { year: pYear, monthIndex: pIndex };
}

function parseKmValue(val) {
  if (val === null || val === undefined || val === "") return 0;
  var str = String(val).replace(/,/g, "").trim();
  var num = Number(str);
  return (!isNaN(num) && num > 0) ? num : 0;
}

function getLastOdometerFromSheet(sheet) {
  if (!sheet) return 0;
  var lastRow = Math.min(sheet.getLastRow(), 45);
  var startScan = Math.max(lastRow, 40);
  for (var row = startScan; row >= 10; row--) {
    var val = sheet.getRange(row, 4).getValue();
    var num = parseKmValue(val);
    if (num > 0) return num;
  }
  var c10 = parseKmValue(sheet.getRange(10, 3).getValue());
  return c10 > 0 ? c10 : 0;
}

function formatTripDate(year, monthIndex, day) {
  var dateObj = new Date(year, monthIndex, day);
  var dayName = DAYS_BG[dateObj.getDay()];
  var dd = ("0" + day).slice(-2);
  var monthName = MONTHS_BG[monthIndex];
  return dd + "/" + monthName + "/" + year + ", " + dayName;
}

function createNewMonthTab(ss, year, monthIndex) {
  var sheetName = MONTHS_BG[monthIndex] + " " + year;
  var sheet = ss.insertSheet(sheetName, 0);
  
  var prevInfo = getPreviousMonthInfo(year, monthIndex);
  var prevSheet = getSheetForMonth(ss, prevInfo.year, prevInfo.monthIndex);
  var inheritedStartKm = getLastOdometerFromSheet(prevSheet);
  
  sheet.getRange("A1").setValue("Име на водача");
  sheet.getRange("B1").setValue("Дата");
  sheet.getRange("C1:F1").merge().setValue("Пробег (км)");
  sheet.getRange("G1").setValue("Заредено гориво\\n(л)");
  sheet.getRange("H1").setValue("Маршрут");
  sheet.getRange("C2").setValue("Начален\\nкилометраж");
  sheet.getRange("D2").setValue("Краен\\nкилометраж");
  sheet.getRange("E2").setValue("Лични");
  sheet.getRange("F2").setValue("Общо за деня");
  
  sheet.getRange("A1:A2").merge();
  sheet.getRange("B1:B2").merge();
  sheet.getRange("G1:G2").merge();
  sheet.getRange("H1:H2").merge();
  sheet.getRange("A1:H2").setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#FDFBF7");
  sheet.setFrozenRows(2);
  
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 225);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 75);
  sheet.setColumnWidth(6, 95);
  sheet.setColumnWidth(7, 125);
  sheet.setColumnWidth(8, 260);
  
  var daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  var batchA_B = [];
  var batchF = [];
  for (var d = 1; d <= 31; d++) {
    var r = 9 + d;
    batchA_B.push(d <= daysInMonth ? ["Мая Атанасова", formatTripDate(year, monthIndex, d)] : ["", ""]);
    batchF.push(['=IF(OR(ISBLANK(C' + r + '), ISBLANK(D' + r + ')), "", D' + r + '-C' + r + ')']);
  }
  sheet.getRange(10, 1, 31, 2).setValues(batchA_B);
  sheet.getRange(10, 6, 31, 1).setFormulas(batchF);
  
  if (inheritedStartKm > 0) {
    sheet.getRange(10, 3).setValue(inheritedStartKm);
  }
  
  sheet.getRange(10, 3, 31, 4).setHorizontalAlignment("right").setNumberFormat("#,##0");
  sheet.getRange(10, 2, 31, 1).setHorizontalAlignment("center");
  return sheet;
}

function getOrCreateMonthSheet(ss, year, monthIndex) {
  var sheet = getSheetForMonth(ss, year, monthIndex);
  return sheet ? sheet : createNewMonthTab(ss, year, monthIndex);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu("🚗 Пътен Лист")
      .addItem("🗓️ Поправи датите в текущия таб", "fixDatesInActiveSheet")
      .addItem("✨ Поправи датите във ВСИЧКИ табове", "fixDatesInAllMonthSheets")
      .addToUi();
  } catch (e) {}
}

function fixDatesInActiveSheet() {
  var ss = getSpreadsheet();
  fixDatesInSheet(ss.getActiveSheet());
}

function fixDatesInAllMonthSheets() {
  var ss = getSpreadsheet();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) fixDatesInSheet(sheets[i]);
}

function fixDatesInSheet(sheet) {
  if (!sheet) return;
  var name = sheet.getName();
  var year = new Date().getFullYear();
  var monthIndex = -1;
  for (var m = 0; m < MONTHS_BG.length; m++) {
    if (name.toLowerCase().indexOf(MONTHS_BG[m].toLowerCase()) !== -1) { monthIndex = m; break; }
  }
  var yMatch = name.match(/\\b(20\\d\\d)\\b/);
  if (yMatch) year = parseInt(yMatch[1], 10);
  if (monthIndex === -1) monthIndex = new Date().getMonth();
  var daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  var batchB = [];
  for (var d = 1; d <= 31; d++) {
    batchB.push(d <= daysInMonth ? [formatTripDate(year, monthIndex, d)] : [""]);
  }
  sheet.getRange(10, 2, 31, 1).setValues(batchB).setHorizontalAlignment("center");
  sheet.setColumnWidth(2, 225);
}

function findEffectiveLastKm(ss, targetYear, targetMonthIndex) {
  var currentSheet = getSheetForMonth(ss, targetYear, targetMonthIndex);
  if (currentSheet) {
    var currentLastD = getLastOdometerFromSheet(currentSheet);
    if (currentLastD > 0) return { km: currentLastD, source: "current_month_column_d", sheet: currentSheet.getName() };
    var currentC10 = parseKmValue(currentSheet.getRange(10, 3).getValue());
    if (currentC10 > 0) return { km: currentC10, source: "current_month_c10", sheet: currentSheet.getName() };
  }
  var prevInfo = getPreviousMonthInfo(targetYear, targetMonthIndex);
  var prevSheet = getSheetForMonth(ss, prevInfo.year, prevInfo.monthIndex);
  if (prevSheet) {
    var prevLastKm = getLastOdometerFromSheet(prevSheet);
    if (prevLastKm > 0) return { km: prevLastKm, source: "previous_month_inherited", sheet: prevSheet.getName() };
  }
  return { km: 0, source: "none", sheet: "" };
}

function doPost(e) {
  try {
    var ss = getSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "addLog";
    
    // ИЗТРИВАНЕ НА РЕД
    if (action === "deleteLog") {
      var dSheet = data.sheetName ? ss.getSheetByName(data.sheetName) : null;
      var dRow = parseInt(data.row, 10);
      if (!dSheet && data.date) {
        var dp = data.date.split("-");
        dSheet = getOrCreateMonthSheet(ss, parseInt(dp[0], 10), parseInt(dp[1], 10) - 1);
        dRow = 9 + parseInt(dp[2], 10);
      }
      if (dSheet && dRow >= 10 && dRow <= 40) {
        dSheet.getRange(dRow, 3, 1, 3).clearContent();
        dSheet.getRange(dRow, 7, 1, 2).clearContent();
        var formF = '=IF(OR(ISBLANK(C' + dRow + '), ISBLANK(D' + dRow + ')), "", D' + dRow + '-C' + dRow + ')';
        dSheet.getRange(dRow, 6).setFormula(formF).setHorizontalAlignment("right").setNumberFormat("#,##0");
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: "Записът бе изтрит успешно! 🗑️",
          sheetName: dSheet.getName(),
          row: dRow
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    var sheet = (data.sheetName && data.row) ? ss.getSheetByName(data.sheetName) : null;
    var targetRow = data.row ? parseInt(data.row, 10) : 0;
    var formattedDate = "";
    
    if (data.date) {
      var parts = data.date.split("-");
      var year = parseInt(parts[0], 10);
      var monthIndex = parseInt(parts[1], 10) - 1;
      var day = parseInt(parts[2], 10);
      if (!sheet) {
        sheet = getOrCreateMonthSheet(ss, year, monthIndex);
        targetRow = 9 + day;
      }
      formattedDate = formatTripDate(year, monthIndex, day);
    }
    if (!sheet) sheet = ss.getSheets()[0];
    if (!targetRow || targetRow < 10) targetRow = 10;
    
    var sKm = Number(data.startKm);
    var eKm = Number(data.endKm);
    if ((!sKm || sKm <= 0) && targetRow > 10) {
      var pEnd = parseKmValue(sheet.getRange(targetRow - 1, 4).getValue());
      if (pEnd > 0) sKm = pEnd;
    }
    
    sheet.getRange(targetRow, 1).setValue(data.driver || "Мая Атанасова").setHorizontalAlignment("left");
    if (formattedDate) sheet.getRange(targetRow, 2).setValue(formattedDate).setHorizontalAlignment("center");
    sheet.getRange(targetRow, 3).setValue(sKm).setHorizontalAlignment("right").setNumberFormat("#,##0");
    sheet.getRange(targetRow, 4).setValue(eKm).setHorizontalAlignment("right").setNumberFormat("#,##0");
    sheet.getRange(targetRow, 5).setValue(data.personalKm > 0 ? Number(data.personalKm) : "").setHorizontalAlignment("right").setNumberFormat("#,##0");
    
    // Запазване на формулата в колона F:
    var formulaF = '=IF(OR(ISBLANK(C' + targetRow + '), ISBLANK(D' + targetRow + ')), "", D' + targetRow + '-C' + targetRow + ')';
    sheet.getRange(targetRow, 6).setFormula(formulaF).setHorizontalAlignment("right").setNumberFormat("#,##0");
    
    sheet.getRange(targetRow, 7).setValue(data.fuelLitres > 0 ? Number(data.fuelLitres) : "").setHorizontalAlignment("right");
    sheet.getRange(targetRow, 8).setValue(data.route || "София").setHorizontalAlignment("left");
    
    // Автоматично вързване към следващия ден (без конфликти)
    if (targetRow < 40 && eKm > 0) {
      var nRow = targetRow + 1;
      var nEnd = parseKmValue(sheet.getRange(nRow, 4).getValue());
      if (nEnd > 0) {
        sheet.getRange(nRow, 3).setValue(eKm).setHorizontalAlignment("right").setNumberFormat("#,##0");
        var nF = '=IF(OR(ISBLANK(C' + nRow + '), ISBLANK(D' + nRow + ')), "", D' + nRow + '-C' + nRow + ')';
        sheet.getRange(nRow, 6).setFormula(nF).setHorizontalAlignment("right").setNumberFormat("#,##0");
      }
    }
    
    var msg = (action === "updateLog" || data.isEdit)
      ? "Записът бе обновен успешно в таб '" + sheet.getName() + "' (ред " + targetRow + ")! 💾✨"
      : "Записът бе добавен успешно в таб '" + sheet.getName() + "' (ред " + targetRow + ")! 💖";
      
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: msg,
      sheetName: sheet.getName(),
      row: targetRow,
      latestKm: Number(data.endKm)
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function extractTripEntriesFromSheet(sheet) {
  if (!sheet) return [];
  var entries = [];
  var lastRow = Math.min(sheet.getLastRow(), 45);
  if (lastRow < 10) return [];
  var scanCount = Math.min(31, lastRow - 9);
  if (scanCount <= 0) return [];
  var values = sheet.getRange(10, 1, scanCount, 8).getValues();
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var startKm = parseKmValue(row[2]);
    var endKm = parseKmValue(row[3]);
    var personalKm = parseKmValue(row[4]);
    var distanceVal = parseKmValue(row[5]);
    var fuel = parseKmValue(row[6]);
    var route = String(row[7] || "").trim();
    if (endKm > 0 || (startKm > 0 && route.length > 0) || route.length > 0) {
      var dist = distanceVal > 0 ? distanceVal : (endKm >= startKm && startKm > 0 ? endKm - startKm : 0);
      var dateStr = "";
      if (row[1] instanceof Date) {
        dateStr = Utilities.formatDate(row[1], Session.getScriptTimeZone() || "GMT+2", "dd/MM/yy");
      } else {
        dateStr = String(row[1] || "").trim();
      }
      entries.push({
        id: sheet.getName() + "_r" + (10 + i),
        row: 10 + i,
        sheetName: sheet.getName(),
        date: dateStr,
        driver: String(row[0] || "Мая Атанасова").trim(),
        startKm: startKm,
        endKm: endKm,
        distance: dist,
        personalKm: personalKm,
        fuelLitres: fuel > 0 ? fuel : null,
        route: route || "София"
      });
    }
  }
  return entries;
}

function doGet(e) {
  try {
    var ss = getSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getLatestKm";
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    if (e && e.parameter && e.parameter.date) {
      var dParts = e.parameter.date.split("-");
      if (dParts.length >= 2) { y = parseInt(dParts[0], 10); m = parseInt(dParts[1], 10) - 1; }
    }
    
    // ПОПРАВКА НА ДАТИТЕ
    if (action === "fixDates") {
      var sToFix = e.parameter.sheetName ? ss.getSheetByName(e.parameter.sheetName) : getSheetForMonth(ss, y, m);
      if (!sToFix && ss.getSheets().length > 0) sToFix = ss.getSheets()[0];
      if (sToFix) fixDatesInSheet(sToFix);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Датите бяха обновени в правилния формат! 📅✨" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ИСТОРИЯ ОТ GOOGLE SHEETS
    if (action === "getHistory" || action === "getLogs") {
      var reqSheet = e.parameter.sheetName;
      var scope = e.parameter.scope;
      var allSheets = ss.getSheets();
      var available = [];
      for (var s = 0; s < allSheets.length; s++) { available.push(allSheets[s].getName()); }
      var targetSheet = reqSheet ? ss.getSheetByName(reqSheet) : getSheetForMonth(ss, y, m);
      if (!targetSheet && allSheets.length > 0) { targetSheet = allSheets[0]; }
      
      var entries = [];
      if (scope === "all") {
        for (var k = 0; k < allSheets.length; k++) {
          entries = entries.concat(extractTripEntriesFromSheet(allSheets[k]));
        }
      } else if (targetSheet) {
        entries = extractTripEntriesFromSheet(targetSheet);
      }
      entries.sort(function(a, b) { return a.sheetName === b.sheetName ? b.row - a.row : 0; });
      
      var totDist = 0, totPers = 0, totFuel = 0;
      for (var j = 0; j < entries.length; j++) {
        totDist += (entries[j].distance || 0);
        totPers += (entries[j].personalKm || 0);
        if (entries[j].fuelLitres) totFuel += Number(entries[j].fuelLitres);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        sheetName: targetSheet ? targetSheet.getName() : "",
        availableSheets: available,
        entries: entries,
        totals: {
          totalDistance: Math.round(totDist * 10) / 10,
          totalPersonalKm: Math.round(totPers * 10) / 10,
          totalFuel: Math.round(totFuel * 10) / 10,
          tripCount: entries.length
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ПОСЛЕДЕН КИЛОМЕТРАЖ
    var res = findEffectiveLastKm(ss, y, m);
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      latestKm: res.km,
      lastKm: res.km,
      source: res.source,
      sheetName: res.sheet
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

