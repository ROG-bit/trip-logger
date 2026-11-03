/**
 * Google Apps Script Web App за Пътен Лист
 * Автомобил: Volkswagen Taigo (СВ 8529 XH)
 * Водач: Мая Атанасова
 * 
 * ТОЧНО СЪОТВЕТСТВИЕ С ОРИГИНАЛНИЯ ФИРМЕН ДОКУМЕНТ (Колони A до H):
 * A: Име на водача
 * B: Дата (формат: DD/MM/YY Ddd, напр. 03/11/26 Tue)
 * C: Начален километраж
 * D: Краен километраж
 * E: Лични
 * F: Общо за деня
 * G: Заредено гориво (л)
 * H: Маршрут
 */

// Ако скриптът е отворен директно от самата таблица (Extensions > Apps Script), оставете празно "".
// Ако е самостоятелен скрипт, поставете ID-то на таблицата от адреса ѝ:
var SPREADSHEET_ID = "";

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

// Форматира датата в точния стил от фирмения документ (напр. "03/11/26 Tue")
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
    sheet = ss.insertSheet(sheetName, 0); // Добавя новия месец най-отпред
    
    // Създаване на оригиналната двуредова заглавна структура
    sheet.getRange("A1").setValue("Име на водача");
    sheet.getRange("B1").setValue("Дата");
    sheet.getRange("C1:F1").merge().setValue("Пробег (км)");
    sheet.getRange("G1").setValue("Заредено гориво\n(л)");
    sheet.getRange("H1").setValue("Маршрут");
    
    // Подзаглавия за пробега на ред 2
    sheet.getRange("C2").setValue("Начален\nкилометраж");
    sheet.getRange("D2").setValue("Краен\nкилометраж");
    sheet.getRange("E2").setValue("Лични");
    sheet.getRange("F2").setValue("Общо за деня");
    
    // Обединяване по вертикала
    sheet.getRange("A1:A2").merge();
    sheet.getRange("B1:B2").merge();
    sheet.getRange("G1:G2").merge();
    sheet.getRange("H1:H2").merge();
    
    // Форматиране на хедъра (болд, центриран, със сива рамка)
    var headerRange = sheet.getRange("A1:H2");
    headerRange
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setWrap(true)
      .setBackground("#FDFBF7");
      
    sheet.setFrozenRows(2);
    
    // Нагласяне ширините на колоните точно като в оригинала
    sheet.setColumnWidth(1, 150); // A: Име на водача
    sheet.setColumnWidth(2, 115); // B: Дата
    sheet.setColumnWidth(3, 110); // C: Начален километраж
    sheet.setColumnWidth(4, 110); // D: Краен километраж
    sheet.setColumnWidth(5, 75);  // E: Лични
    sheet.setColumnWidth(6, 95);  // F: Общо за деня
    sheet.setColumnWidth(7, 125); // G: Заредено гориво (л)
    sheet.setColumnWidth(8, 260); // H: Маршрут
  }
  
  return sheet;
}

// Намиране на най-новия краен километраж от колона D
function findLatestKm(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    var lastRow = s.getLastRow();
    if (lastRow > 2) {
      // Колона D (4) е "Краен километраж"
      var val = s.getRange(lastRow, 4).getValue();
      var num = Number(String(val).replace(/,/g, ""));
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }
  return 0;
}

function doPost(e) {
  try {
    var ss = getSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    
    // Определяне на таба за месеца (напр. "Ноември 2026")
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
    
    // Добавяне на реда точно по структурата от оригиналния документ (A до H):
    // A: Име на водача
    // B: Дата
    // C: Начален километраж
    // D: Краен километраж
    // E: Лични
    // F: Общо за деня
    // G: Заредено гориво (л)
    // H: Маршрут
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
    
    // Форматиране на реда:
    // Колона A (Име): ляво
    sheet.getRange(newRowIdx, 1).setHorizontalAlignment("left");
    // Колона B (Дата): центрирано
    sheet.getRange(newRowIdx, 2).setHorizontalAlignment("center");
    // Колони C, D, E, F (Километри): дясно с форматиране на хилядите
    var kmRange = sheet.getRange(newRowIdx, 3, 1, 4);
    kmRange.setHorizontalAlignment("right").setNumberFormat("#,##0");
    // Колона G (Гориво): дясно
    sheet.getRange(newRowIdx, 7).setHorizontalAlignment("right");
    // Колона H (Маршрут): ляво
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
