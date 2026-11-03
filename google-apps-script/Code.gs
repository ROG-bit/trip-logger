/**
 * Google Apps Script Web App за Пътен Лист
 * Автомобил: Volkswagen Taigo (СВ 8529 XH)
 * Водач: Мая Атанасова
 * 
 * ВАЖНО:
 * Всеки запис автоматично се добавя в таб за съответния месец (напр. "Ноември 2026").
 * Ако такъв таб все още не съществува, скриптът го създава автоматично с форматиран хедър!
 */

// Ако скриптът е отворен от самата таблица (Extensions > Apps Script), оставете това празно "".
// Ако е standalone скрипт, поставете ID-то на таблицата от нейния URL адрес:
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
    throw new Error("Не е намерена свързана Google Таблица. Моля, въведете SPREADSHEET_ID в кода.");
  }
  return ss;
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
    
    // Създаване на елегантен заглавен ред за новия месец
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
    
    // Форматиране на хедъра (розово-вишнев акцент за Taigo)
    var headerRange = sheet.getRange(1, 1, 1, 10);
    headerRange
      .setFontWeight("bold")
      .setBackground("#FDF5F2")
      .setFontColor("#881337")
      .setHorizontalAlignment("center");
      
    sheet.setFrozenRows(1);
    
    // Форматиране на ширините на колоните за прегледност
    sheet.setColumnWidth(1, 105); // Дата
    sheet.setColumnWidth(2, 105); // Начален км
    sheet.setColumnWidth(3, 105); // Краен км
    sheet.setColumnWidth(4, 105); // Пробег (км)
    sheet.setColumnWidth(5, 230); // Маршрут
    sheet.setColumnWidth(6, 95);  // Лични км
    sheet.setColumnWidth(7, 135); // Заредено гориво (л)
    sheet.setColumnWidth(8, 140); // Водач
    sheet.setColumnWidth(9, 115); // Рег. номер
    sheet.setColumnWidth(10, 160);// Време на запис
  }
  
  return sheet;
}

function findLatestKm(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    var lastRow = s.getLastRow();
    if (lastRow > 1) {
      // Проверяваме колона 3 ("Краен км")
      var val = s.getRange(lastRow, 3).getValue();
      var num = Number(val);
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
    
    // Добавяне на реда с пътуването
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
    
    // Автоматично подравняване на числовите колони
    var newRowIdx = sheet.getLastRow();
    sheet.getRange(newRowIdx, 2, 1, 3).setHorizontalAlignment("right");
    sheet.getRange(newRowIdx, 6, 1, 2).setHorizontalAlignment("right");
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Записът бе добавен успешно в таб '" + sheetName + "'! 💖",
      sheetName: sheetName,
      spreadsheetName: ss.getName(),
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
    var ss = getSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getLatestKm";
    
    var latestKm = findLatestKm(ss);
    
    // Ако е поискан пълен дебъг, връщаме името и URL на таблицата + всички табове
    if (action === "debug") {
      var allSheets = ss.getSheets().map(function(s) {
        return { name: s.getName(), lastRow: s.getLastRow() };
      });
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        spreadsheetName: ss.getName(),
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        sheets: allSheets,
        latestKm: latestKm
      }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }
    
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
