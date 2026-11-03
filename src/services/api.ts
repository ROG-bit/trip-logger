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
// Volkswagen Taigo (СВ 8529 XH) - Мая Атанасова
// ТОЧНО СЪОТВЕТСТВИЕ С ФИРМЕНИЯ ДОКУМЕНТ (A до H):
// A: Име на водача | B: Дата | C: Начален | D: Краен | E: Лични | F: Общо за деня | G: Гориво (л) | H: Маршрут
// ==========================================

var SPREADSHEET_ID = ""; // Оставете празно, ако е пуснат от самата таблица

var MONTHS_BG = [
  "Януари", "Февруари", "Март", "Април", "Май", "Юни",
  "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"
];

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("Не е намерена свързана Google Таблица. Въведете SPREADSHEET_ID в кода.");
  }
  return ss;
}

function formatTripDate(dateStr) {
  if (!dateStr) return "";
  try {
    var parts = dateStr.split("-");
    if (parts.length === 3) {
      var y = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10) - 1;
      var d = parseInt(parts[2], 10);
      var dateObj = new Date(y, m, d);
      var daysEng = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      var dayName = daysEng[dateObj.getDay()];
      var dd = ("0" + d).slice(-2);
      var mm = ("0" + (m + 1)).slice(-2);
      var yy = String(y).slice(-2);
      return dd + "/" + mm + "/" + yy + " " + dayName;
    }
  } catch (e) {}
  return dateStr;
}

function getMonthlySheetName(dateStr) {
  try {
    if (dateStr && typeof dateStr === "string" && dateStr.indexOf("-") > -1) {
      var parts = dateStr.split("-");
      var year = parts[0];
      var monthIndex = parseInt(parts[1], 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return MONTHS_BG[monthIndex] + " " + year;
      }
    }
  } catch (e) {}
  var now = new Date();
  return MONTHS_BG[now.getMonth()] + " " + now.getFullYear();
}

function getOrCreateMonthlySheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName, 0);
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
    
    sheet.getRange("A1:H2")
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(true)
      .setBackground("#FDFBF7");
      
    sheet.setFrozenRows(2);
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 115);
    sheet.setColumnWidth(3, 110);
    sheet.setColumnWidth(4, 110);
    sheet.setColumnWidth(5, 75);
    sheet.setColumnWidth(6, 95);
    sheet.setColumnWidth(7, 125);
    sheet.setColumnWidth(8, 260);
  }
  return sheet;
}

function findLatestKm(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    var lastRow = s.getLastRow();
    if (lastRow > 2) {
      var val = s.getRange(lastRow, 4).getValue();
      var num = Number(String(val).replace(/,/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return 0;
}

function doPost(e) {
  try {
    var ss = getSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var sheetName = getMonthlySheetName(data.date);
    var sheet = getOrCreateMonthlySheet(ss, sheetName);
    
    var formattedDate = formatTripDate(data.date);
    var startKm = Number(data.startKm);
    var endKm = Number(data.endKm);
    var distance = Number(data.distance);
    var personalKm = (data.personalKm && Number(data.personalKm) > 0) ? Number(data.personalKm) : "";
    var fuel = (data.fuelLitres && Number(data.fuelLitres) > 0) ? Number(data.fuelLitres) : "";
    var driver = data.driver || "Мая Атанасова";
    var route = data.route || "София";
    
    sheet.appendRow([
      driver,
      formattedDate,
      startKm,
      endKm,
      personalKm,
      distance,
      fuel,
      route
    ]);
    
    var newRowIdx = sheet.getLastRow();
    sheet.getRange(newRowIdx, 1).setHorizontalAlignment("left");
    sheet.getRange(newRowIdx, 2).setHorizontalAlignment("center");
    sheet.getRange(newRowIdx, 3, 1, 4).setHorizontalAlignment("right").setNumberFormat("#,##0");
    sheet.getRange(newRowIdx, 7).setHorizontalAlignment("right");
    sheet.getRange(newRowIdx, 8).setHorizontalAlignment("left");
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Записът бе добавен успешно в таб '" + sheetName + "'! 💖",
      sheetName: sheetName,
      latestKm: endKm
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
    var ss = getSpreadsheet();
    var latestKm = findLatestKm(ss);
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      latestKm: latestKm,
      spreadsheetName: ss.getName()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

