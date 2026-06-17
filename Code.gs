/**
 * DeskSummit - GAS integration script (Code.gs)
 * 
 * このスクリプトは、連携元のスプレッドシートの「拡張機能」->「Apps Script」に貼り付けて使用します。
 * ウェブアプリとしてデプロイし、全員（匿名ユーザー含む）にアクセス権を付与してください。
 */

function doPost(e) {
  try {
    // 1. リクエストボディのパース
    // CORSのPreflightを回避するため、Content-Type: text/plain で送られてくる JSON 文字列をパースします。
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
    var timestamp = data.timestamp;
    var exerciseName = data.exerciseName;
    var durationOrReps = data.durationOrReps;
    var earnedElevation = data.earnedElevation;
    
    // 2. スプレッドシートへのデータ追記
    // コンテナバインドスクリプトのため、紐づいているアクティブなスプレッドシートを取得
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // シートが空の場合はヘッダー行を作成
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["タイムスタンプ", "種目名", "時間・回数", "獲得標高"]);
      // ヘッダー行のデザインを調整（太字）
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#e2e8f0");
    }
    
    // データを末尾に追加
    sheet.appendRow([timestamp, exerciseName, durationOrReps, earnedElevation]);
    
    // 3. Googleカレンダーへの実績登録
    // ユーザーのデフォルトカレンダーを取得
    var calendar = CalendarApp.getDefaultCalendar();
    if (calendar) {
      var now = new Date();
      var startTime = new Date(now.getTime());
      var endTime = new Date(now.getTime() + 15 * 60 * 1000); // 15分間の予定
      
      var title = "🏔️ [済] フィットネス（" + exerciseName + "）";
      var description = "DeskSummit でフィットネスを完了しました。\n" +
                        "獲得標高: " + earnedElevation + "\n" +
                        "運動時間: " + durationOrReps + "\n" +
                        "記録日時: " + timestamp;
      
      calendar.createEvent(title, startTime, endTime, {
        description: description
      });
    }
    
    // 4. 成功レスポンスの返却（CORS対応）
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Logged successfully" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // エラー発生時のレスポンス
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
