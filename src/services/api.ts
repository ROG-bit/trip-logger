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
// ЗАЩИТА НА ФОРМУЛАТА В КОЛОНА F & ПЛАВЕН МЕСЕЧЕН ПРЕХОД
// ==========================================

var SPREADSHEET_ID = ""; // Оставете празно, ако е пуснат от самата таблица

var MONTHS_BG = [
  "Януари", "Февруари", "Март", "Април", "Май", "Юни",
  "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"
];

var MONTHS_EN_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var MONTHS_BG_SHORT = ["Яну", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"];
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
  var dd = ("0" + day).slice(-2);
  var mm = ("0" + (monthIndex + 1)).slice(-2);
  var yy = String(year).slice(-2);
  return dd + "/" + mm + "/" + yy + " " + DAYS_EN_SHORT[dateObj.getDay()];
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
  sheet.setColumnWidth(2, 115);
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
    var parts = data.date.split("-");
    var year = parseInt(parts[0], 10);
    var monthIndex = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    var targetRow = 9 + day;
    
    var sheet = getOrCreateMonthSheet(ss, year, monthIndex);
    
    sheet.getRange(targetRow, 1).setValue(data.driver || "Мая Атанасова").setHorizontalAlignment("left");
    sheet.getRange(targetRow, 2).setValue(formatTripDate(year, monthIndex, day)).setHorizontalAlignment("center");
    sheet.getRange(targetRow, 3).setValue(Number(data.startKm)).setHorizontalAlignment("right").setNumberFormat("#,##0");
    sheet.getRange(targetRow, 4).setValue(Number(data.endKm)).setHorizontalAlignment("right").setNumberFormat("#,##0");
    sheet.getRange(targetRow, 5).setValue(data.personalKm > 0 ? Number(data.personalKm) : "").setHorizontalAlignment("right").setNumberFormat("#,##0");
    
    // Запазване на формулата в колона F:
    var formulaF = '=IF(OR(ISBLANK(C' + targetRow + '), ISBLANK(D' + targetRow + ')), "", D' + targetRow + '-C' + targetRow + ')';
    sheet.getRange(targetRow, 6).setFormula(formulaF).setHorizontalAlignment("right").setNumberFormat("#,##0");
    
    sheet.getRange(targetRow, 7).setValue(data.fuelLitres > 0 ? Number(data.fuelLitres) : "").setHorizontalAlignment("right");
    sheet.getRange(targetRow, 8).setValue(data.route || "София").setHorizontalAlignment("left");
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Записът бе добавен успешно в таб '" + sheet.getName() + "' (ред " + targetRow + ")! 💖",
      sheetName: sheet.getName(),
      latestKm: Number(data.endKm)
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = getSpreadsheet();
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    if (e && e.parameter && e.parameter.date) {
      var dParts = e.parameter.date.split("-");
      if (dParts.length >= 2) { y = parseInt(dParts[0], 10); m = parseInt(dParts[1], 10) - 1; }
    }
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

