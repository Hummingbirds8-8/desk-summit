/**
 * DeskSummit - Google Apps Script (Code.gs)
 * 
 * このスクリプトは、連携先のスプレッドシートの「拡張機能」->「Apps Script」に貼り付けて使用します。
 * ウェブアプリとしてデプロイし、アクセスできるユーザーを「全員」に設定してください。
 */

// 特定のGoogleカレンダーID
const CALENDAR_ID = "b46412104ad9a088693c1f37cf40b2181e540964b2005c2427107edba7c2d6c5@group.calendar.google.com";

/**
 * データの追記を行うPOSTエンドポイント (運動記録の送信時)
 */
function doPost(e) {
  try {
    // 1. リクエストボディのパース
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
    var timestamp = data.timestamp;
    var exercise = data.exercise;
    var amount = data.amount;
    var elevation = data.elevation;
    
    // 2. スプレッドシートへのデータ追記
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // シートが完全に空の場合はヘッダー行を作成
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["タイムスタンプ", "種目", "数値/時間", "獲得標高(m)"]);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
    }
    
    // データを末尾に追加
    sheet.appendRow([timestamp, exercise, amount, elevation]);
    
    // 3. Googleカレンダーへの実績登録 (指定されたカレンダーIDを使用)
    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
      calendar = CalendarApp.getDefaultCalendar();
    }
    
    if (calendar) {
      var now = new Date();
      var startTime = new Date(now.getTime());
      var endTime = new Date(now.getTime() + 15 * 60 * 1000); // 15分間の予定
      
      var title = "🏔️ [済] " + exercise + " " + amount;
      var description = "DeskSummit からフィットネス実績が記録されました。\n\n" +
                        "■ 種目: " + exercise + "\n" +
                        "■ 数値: " + amount + "\n" +
                        "■ 獲得標高: " + elevation + "m\n" +
                        "■ 記録日時: " + timestamp;
      
      calendar.createEvent(title, startTime, endTime, {
        description: description
      });
    }
    
    // 4. 成功レスポンスの返却（GASは自動でCORSに対応するためsetHeaderは不要です）
    var responseObj = { "status": "success", "message": "Logged successfully" };
    return ContentService.createTextOutput(JSON.stringify(responseObj))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // エラー発生時のレスポンス
    var errorObj = { "status": "error", "message": error.toString() };
    return ContentService.createTextOutput(JSON.stringify(errorObj))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 過去ログデータを全件取得するGETエンドポイント (PC・スマホ間同期用)
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var lastRow = sheet.getLastRow();
    var logs = [];
    
    // ヘッダー行以外のデータが存在する場合に読み込み
    if (lastRow > 1) {
      var range = sheet.getRange(2, 1, lastRow - 1, 4);
      var values = range.getValues();
      
      for (var i = 0; i < values.length; i++) {
        var dateVal = values[i][0];
        var formattedDate = "";
        
        if (dateVal instanceof Date) {
          var yyyy = dateVal.getFullYear();
          var mm = ("0" + (dateVal.getMonth() + 1)).slice(-2);
          var dd = ("0" + dateVal.getDate()).slice(-2);
          var hh = ("0" + dateVal.getHours()).slice(-2);
          var min = ("0" + dateVal.getMinutes()).slice(-2);
          var ssVal = ("0" + dateVal.getSeconds()).slice(-2);
          formattedDate = yyyy + "-" + mm + "-" + dd + "T" + hh + ":" + min + ":" + ssVal;
        } else {
          formattedDate = String(dateVal);
        }

        logs.push({
          timestamp: formattedDate,
          exercise: String(values[i][1]),
          amount: String(values[i][2]),
          elevation: Number(values[i][3]) || 0
        });
      }
    }
    
    var responseObj = {
      "status": "success",
      "logs": logs
    };
    
    return ContentService.createTextOutput(JSON.stringify(responseObj))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    var errorObj = { "status": "error", "message": error.toString() };
    return ContentService.createTextOutput(JSON.stringify(errorObj))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
