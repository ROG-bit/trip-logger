/**
 * Google Apps Script Web App за Пътен Лист
 * Автомобил: Volkswagen Taigo (СВ 8529 XH)
 * Водач: Мая Атанасова
 * 
 * Инструкции за инсталация в Google Sheets:
 * 1. Отворете Google Sheets таблица.
 * 2. Отидете в менюто: Разширения (Extensions) > Apps Script.
 * 3. Изтрийте стария код и поставете целия код от този файл.
 * 4. Натиснете бутона "Внедряване" (Deploy) в горния десен ъгъл > "Ново внедряване" (New deployment).
 * 5. Изберете тип: "Уеб приложение" (Web app).
 * 6. Изпълнявай като (Execute as): "Аз" (Me).
 * 7. Кой има достъп (Who has access): "Всеки" (Anyone) - задължително за PWA достъп от телефон.
 * 8. Копирайте генерирания Web app URL и го въведете в настройките на PWA приложението (иконката с плъзгачите горе вдясно).
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Ако таблицата е празна, създай красив заглавен ред
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
      sheet.getRange(1, 1, 1, 10)
        .setFontWeight("bold")
        .setBackground("#FDF5F2")
        .setFontColor("#881337");
      sheet.setFrozenRows(1);
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
      message: "Пътуването бе записано успешно в Google Таблицата! 💖",
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

