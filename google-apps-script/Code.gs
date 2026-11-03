/**
 * Google Apps Script Web App за Пътен Лист
 * Автомобил: Volkswagen Taigo (СВ 8529 XH)
 * Водач: Мая Атанасова
 * 
 * =============================================================================
 * ОСНОВНИ ФУНКЦИОНАЛНОСТИ:
 * 1. ЗАЩИТА НА ДИНАМИЧНАТА ФОРМУЛА В КОЛОНА F (Общо за деня):
 *    - Колона F НИКОГА не се презаписва със статично число.
 *    - Всяка клетка от F10 до F40 запазва/получава нативната формула:
 *      =IF(OR(ISBLANK(C{row}), ISBLANK(D{row})), "", D{row}-C{row})
 *    - При изчистване на шаблон се изчистват само потребителските полета:
 *      C10:E40 и G10:H40. Формулите в F10:F40 остават недокоснати!
 * 
 * 2. ПЛАВЕН МЕСЕЧЕН ПРЕХОД (от 31-во число към 1-во число на новия месец):
 *    - При създаване на нов месечен таб (напр. "Декември 2026"), скриптът
 *      хронологично открива предходния месец ("Ноември 2026").
 *    - Намира последния валиден краен километраж от колона D на стария месец.
 *    - Автоматично го записва като начален километраж в C10 на новия месец.
 *    - В doGet(e) работи 3-степенна резервна логика:
 *      (1) Проверява последния попълнен краен км в колона D на текущия месец.
 *      (2) Ако няма, чете стартовия км в C10 на текущия месец.
 *      (3) Ако и C10 е празно, сканира предходния месец за последния краен км.
 *    - Така на 1-во число телефонът моментално попълва коректния начален км!
 * =============================================================================
 */

// Поставете ID-то на таблицата, ако скриптът се изпълнява самостоятелно.
// Ако е отворен директно от Extensions > Apps Script, оставете празно "".
var SPREADSHEET_ID = "";

var MONTHS_BG = [
  "Януари", "Февруари", "Март", "Април", "Май", "Юни",
  "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"
];

var MONTHS_EN_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

var MONTHS_BG_SHORT = [
  "Яну", "Фев", "Мар", "Апр", "Май", "Юни",
  "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"
];

var DAYS_EN_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Връща обекта на таблицата
 */
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

/**
 * Генерира възможни имена на таб за дадена година и месец
 * (поддържа "Ноември 2026", "Nov-26", "Ное-26", "Nov 2026" и др.)
 */
function getPossibleSheetNames(year, monthIndex) {
  var yy = String(year).slice(-2);
  var mm = ("0" + (monthIndex + 1)).slice(-2);
  var bg = MONTHS_BG[monthIndex];
  var enShort = MONTHS_EN_SHORT[monthIndex];
  var bgShort = MONTHS_BG_SHORT[monthIndex];
  
  return [
    bg + " " + year,        // "Ноември 2026" (Стандарт)
    bg + " " + yy,          // "Ноември 26"
    enShort + "-" + yy,     // "Nov-26"
    enShort + " " + year,   // "Nov 2026"
    enShort + " " + yy,     // "Nov 26"
    bgShort + "-" + yy,     // "Ное-26"
    bgShort + " " + yy,     // "Ное 26"
    bg,                     // "Ноември"
    mm + "." + year,        // "11.2026"
    mm + "-" + yy           // "11-26"
  ];
}

/**
 * Търси съществуващ таб за даден месец/година според различни конвенции
 */
function getSheetForMonth(ss, year, monthIndex) {
  var possibleNames = getPossibleSheetNames(year, monthIndex);
  for (var i = 0; i < possibleNames.length; i++) {
    var sheet = ss.getSheetByName(possibleNames[i]);
    if (sheet) return sheet;
  }
  
  // Case-insensitive fallback
  var sheets = ss.getSheets();
  for (var j = 0; j < sheets.length; j++) {
    var sName = sheets[j].getName().trim().toLowerCase();
    for (var k = 0; k < possibleNames.length; k++) {
      if (sName === possibleNames[k].toLowerCase()) {
        return sheets[j];
      }
    }
  }
  return null;
}

/**
 * Изчислява предходния месец хронологично (напр. за 2027-01 връща 2026-12)
 */
function getPreviousMonthInfo(year, monthIndex) {
  var prevMonthIndex = monthIndex - 1;
  var prevYear = year;
  if (prevMonthIndex < 0) {
    prevMonthIndex = 11;
    prevYear = year - 1;
  }
  return { year: prevYear, monthIndex: prevMonthIndex };
}

/**
 * Помощна функция за конвертиране на километраж към число
 */
function parseKmValue(val) {
  if (val === null || val === undefined || val === "") return 0;
  var str = String(val).replace(/,/g, "").trim();
  var num = Number(str);
  return (!isNaN(num) && num > 0) ? num : 0;
}

/**
 * Чете последния краен километраж от даден таб (сканира колона D от ред 40 надолу към 10)
 */
function getLastOdometerFromSheet(sheet) {
  if (!sheet) return 0;
  
  var lastRow = Math.min(sheet.getLastRow(), 45);
  var startScan = Math.max(lastRow, 40);
  
  // Сканиране от ред 40 (или lastRow) нагоре към ред 10
  for (var row = startScan; row >= 10; row--) {
    var cellVal = sheet.getRange(row, 4).getValue(); // Колона D
    var num = parseKmValue(cellVal);
    if (num > 0) {
      return num;
    }
  }
  
  // Резервен вариант: ако няма краен км в колона D, проверяваме началното поле C10
  var c10Val = parseKmValue(sheet.getRange(10, 3).getValue());
  if (c10Val > 0) {
    return c10Val;
  }
  
  return 0;
}

/**
 * Форматира датата в точния фирмен стил: "03/11/26 Tue"
 */
function formatTripDate(year, monthIndex, day) {
  var dateObj = new Date(year, monthIndex, day);
  var dayName = DAYS_EN_SHORT[dateObj.getDay()];
  
  var dd = ("0" + day).slice(-2);
  var mm = ("0" + (monthIndex + 1)).slice(-2);
  var yy = String(year).slice(-2);
  
  return dd + "/" + mm + "/" + yy + " " + dayName;
}

/**
 * Изчиства САМО потребителските полета в месечния шаблон (C10:E40 и G10:H40).
 * ФОРМУЛИТЕ В КОЛОНА F СЕ ЗАПАЗВАТ И НЕ СЕ ПИПАТ!
 */
function clearMonthUserInputs(sheet) {
  if (!sheet) return;
  sheet.getRange("C10:E40").clearContent();
  sheet.getRange("G10:H40").clearContent();
}

/**
 * Създава нов месечен таб с пълна заглавна част (редове 1-9), формули в колона F (F10:F40)
 * и автоматично пренасяне на крайния километраж от предходния месец в C10!
 */
function createNewMonthTab(ss, year, monthIndex) {
  var sheetName = MONTHS_BG[monthIndex] + " " + year;
  var sheet = ss.insertSheet(sheetName, 0); // Поставя новия месец най-отпред
  
  // 1. Хронологично намиране на предходния месец и неговия последен километраж
  var prevInfo = getPreviousMonthInfo(year, monthIndex);
  var prevSheet = getSheetForMonth(ss, prevInfo.year, prevInfo.monthIndex);
  var inheritedStartKm = getLastOdometerFromSheet(prevSheet);
  
  // 2. Създаване на двуредовата фирмена заглавка (A1:H2)
  sheet.getRange("A1").setValue("Име на водача");
  sheet.getRange("B1").setValue("Дата");
  sheet.getRange("C1:F1").merge().setValue("Пробег (км)");
  sheet.getRange("G1").setValue("Заредено гориво\n(л)");
  sheet.getRange("H1").setValue("Маршрут");
  
  sheet.getRange("C2").setValue("Начален\nкилометраж");
  sheet.getRange("D2").setValue("Краен\nкилометраж");
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
  
  // Ширини на колоните
  sheet.setColumnWidth(1, 150); // A: Име
  sheet.setColumnWidth(2, 115); // B: Дата
  sheet.setColumnWidth(3, 110); // C: Начален км
  sheet.setColumnWidth(4, 110); // D: Краен км
  sheet.setColumnWidth(5, 75);  // E: Лични
  sheet.setColumnWidth(6, 95);  // F: Общо за деня (Формула)
  sheet.setColumnWidth(7, 125); // G: Гориво (л)
  sheet.setColumnWidth(8, 260); // H: Маршрут
  
  // 3. Подготовка на дните от месеца (Редове 10 до 40)
  var daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  var totalRows = 31; // Стандартен 31-дневен капацитет (редове 10 до 40)
  
  var batchA_B = [];
  var batchF = [];
  
  for (var d = 1; d <= totalRows; d++) {
    var rowNum = 9 + d; // Ред 10 = Ден 1, Ред 11 = Ден 2 ... Ред 40 = Ден 31
    
    if (d <= daysInMonth) {
      batchA_B.push(["Мая Атанасова", formatTripDate(year, monthIndex, d)]);
    } else {
      batchA_B.push(["", ""]);
    }
    
    // ДИНАМИЧНА ФОРМУЛА В КОЛОНА F: =IF(OR(ISBLANK(C{row}), ISBLANK(D{row})), "", D{row}-C{row})
    batchF.push(['=IF(OR(ISBLANK(C' + rowNum + '), ISBLANK(D' + rowNum + ')), "", D' + rowNum + '-C' + rowNum + ')']);
  }
  
  // Пакетно записване на дните и формулите (бързо и без лимити за време)
  sheet.getRange(10, 1, totalRows, 2).setValues(batchA_B);
  sheet.getRange(10, 6, totalRows, 1).setFormulas(batchF);
  
  // 4. Наследяване на началния километраж в C10 от предходния месец
  if (inheritedStartKm > 0) {
    sheet.getRange(10, 3).setValue(inheritedStartKm);
  }
  
  // Форматиране на форматите на клетките
  sheet.getRange(10, 1, totalRows, 1).setHorizontalAlignment("left");
  sheet.getRange(10, 2, totalRows, 1).setHorizontalAlignment("center");
  sheet.getRange(10, 3, totalRows, 4).setHorizontalAlignment("right").setNumberFormat("#,##0");
  sheet.getRange(10, 7, totalRows, 1).setHorizontalAlignment("right");
  sheet.getRange(10, 8, totalRows, 1).setHorizontalAlignment("left");
  
  return sheet;
}

/**
 * Открива съществуващия таб или създава нов за дадената дата
 */
function getOrCreateMonthSheet(ss, year, monthIndex) {
  var sheet = getSheetForMonth(ss, year, monthIndex);
  if (!sheet) {
    sheet = createNewMonthTab(ss, year, monthIndex);
  }
  return sheet;
}

/**
 * 3-СТЕПЕННА РЕЗЕРВНА ЛОГИКА ЗА ИЗВЛИЧАНЕ НА ПОСЛЕДНИЯ КИЛОМЕТРАЖ:
 * 1. Проверява последния попълнен краен км (Колона D) в текущия месец.
 * 2. Ако няма, проверява стартовата клетка C10 на текущия месец.
 * 3. Ако и C10 е празно, сканира предходния месец за неговия последен краен км (Колона D).
 */
function findEffectiveLastKm(ss, targetYear, targetMonthIndex) {
  var currentSheet = getSheetForMonth(ss, targetYear, targetMonthIndex);
  
  if (currentSheet) {
    // Стъпка 1: Търси последен краен км в колона D (редове 40 надолу към 10)
    var currentLastD = getLastOdometerFromSheet(currentSheet);
    if (currentLastD > 0) {
      return { km: currentLastD, source: "current_month_column_d", sheet: currentSheet.getName() };
    }
    
    // Стъпка 2: Проверява C10 в текущия таб
    var currentC10 = parseKmValue(currentSheet.getRange(10, 3).getValue());
    if (currentC10 > 0) {
      return { km: currentC10, source: "current_month_c10", sheet: currentSheet.getName() };
    }
  }
  
  // Стъпка 3: Хронологично сканиране на предходния месец
  var prevInfo = getPreviousMonthInfo(targetYear, targetMonthIndex);
  var prevSheet = getSheetForMonth(ss, prevInfo.year, prevInfo.monthIndex);
  if (prevSheet) {
    var prevLastKm = getLastOdometerFromSheet(prevSheet);
    if (prevLastKm > 0) {
      return { km: prevLastKm, source: "previous_month_inherited", sheet: prevSheet.getName() };
    }
  }
  
  // Резерва: сканира всички табове, ако никой от горните не открие число
  var allSheets = ss.getSheets();
  for (var i = 0; i < allSheets.length; i++) {
    var anyKm = getLastOdometerFromSheet(allSheets[i]);
    if (anyKm > 0) {
      return { km: anyKm, source: "global_scan", sheet: allSheets[i].getName() };
    }
  }
  
  return { km: 0, source: "none", sheet: "" };
}

/**
 * =============================================================================
 * POST ЗАЯВКА: Запис на пътен лист от мобилното приложение
 * =============================================================================
 */
function doPost(e) {
  try {
    var ss = getSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    
    // 1. Разпознаване на датата (YYYY-MM-DD)
    var dateStr = data.date;
    var parts = dateStr.split("-");
    var year = parseInt(parts[0], 10);
    var monthIndex = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    
    // 2. Откриване или създаване на съответния месечен таб
    var sheet = getOrCreateMonthSheet(ss, year, monthIndex);
    
    // 3. Изчисляване на целевия ред: Ред 10 = 1-во число ... Ред 40 = 31-во число
    var targetRow = 9 + day;
    
    var formattedDate = formatTripDate(year, monthIndex, day);
    var startKm = Number(data.startKm);
    var endKm = Number(data.endKm);
    var personalKm = (data.personalKm && Number(data.personalKm) > 0) ? Number(data.personalKm) : "";
    var fuel = (data.fuelLitres && Number(data.fuelLitres) > 0) ? Number(data.fuelLitres) : "";
    var driver = data.driver || "Мая Атанасова";
    var route = data.route || "София";
    
    // 4. Запис на потребителските данни:
    // A: Име на водача
    sheet.getRange(targetRow, 1).setValue(driver).setHorizontalAlignment("left");
    // B: Дата
    sheet.getRange(targetRow, 2).setValue(formattedDate).setHorizontalAlignment("center");
    // C: Начален километраж
    sheet.getRange(targetRow, 3).setValue(startKm).setHorizontalAlignment("right").setNumberFormat("#,##0");
    // D: Краен километраж
    sheet.getRange(targetRow, 4).setValue(endKm).setHorizontalAlignment("right").setNumberFormat("#,##0");
    // E: Лични
    sheet.getRange(targetRow, 5).setValue(personalKm).setHorizontalAlignment("right").setNumberFormat("#,##0");
    
    // 5. ИЗИСКВАНЕ 1: ЗАПАЗВАНЕ НА ДИНАМИЧНАТА ФОРМУЛА В КОЛОНА F
    // Колона F НИКОГА не се презаписва със статично число!
    // Задаваме или запазваме нативната формула:
    var formulaF = '=IF(OR(ISBLANK(C' + targetRow + '), ISBLANK(D' + targetRow + ')), "", D' + targetRow + '-C' + targetRow + ')';
    sheet.getRange(targetRow, 6).setFormula(formulaF).setHorizontalAlignment("right").setNumberFormat("#,##0");
    
    // G: Заредено гориво (л)
    sheet.getRange(targetRow, 7).setValue(fuel).setHorizontalAlignment("right");
    // H: Маршрут
    sheet.getRange(targetRow, 8).setValue(route).setHorizontalAlignment("left");
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Записът бе добавен успешно в таб '" + sheet.getName() + "' (ред " + targetRow + ")! 💖",
      sheetName: sheet.getName(),
      row: targetRow,
      latestKm: endKm
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * =============================================================================
 * GET ЗАЯВКА: Извличане на последен километраж за мобилното приложение
 * =============================================================================
 */
function doGet(e) {
  try {
    var ss = getSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getLatestKm";
    
    // Определяне на целевата дата (по подразбиране днес)
    var now = new Date();
    var targetYear = now.getFullYear();
    var targetMonthIndex = now.getMonth();
    
    if (e && e.parameter && e.parameter.date) {
      var dParts = e.parameter.date.split("-");
      if (dParts.length >= 2) {
        targetYear = parseInt(dParts[0], 10);
        targetMonthIndex = parseInt(dParts[1], 10) - 1;
      }
    }
    
    // 3-степенна логика за намиране на последен километраж с наследяване от предходен месец
    var res = findEffectiveLastKm(ss, targetYear, targetMonthIndex);
    
    if (action === "debug") {
      var allSheets = ss.getSheets().map(function(s) {
        return { name: s.getName(), lastRow: s.getLastRow() };
      });
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        targetMonth: MONTHS_BG[targetMonthIndex] + " " + targetYear,
        effectiveLastKm: res.km,
        source: res.source,
        resolvedSheet: res.sheet,
        allSheets: allSheets
      }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      latestKm: res.km,
      lastKm: res.km,
      source: res.source,
      sheetName: res.sheet,
      spreadsheetName: ss.getName()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
