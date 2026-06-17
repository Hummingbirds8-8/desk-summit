/**
 * DeskSummit - Google Apps Script (Code.gs)
 * 
 * このスクリプトは、連携先のスプレッドシートの「拡張機能」->「Apps Script」に貼り付けて使用します。
 * ウェブアプリとしてデプロイし、アクセスできるユーザーを「全員」に設定してください。
 */

function doPost(e) {
  try {
    // 1. リクエストボディのパース
    // CORSのPreflightを回避するため、クライアントは Content-Type: text/plain でJSON文字列を送信します。
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
    var timestamp = data.timestamp;
    var exercise = data.exercise;
    var amount = data.amount;
    var elevation = data.elevation;
    
    // 2. スプレッドシートへのデータ追記
    // コンテナバインドスクリプトのため、紐づいているアクティブなスプレッドシートを取得します。
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // シートが完全に空の場合はヘッダー行を作成
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["タイムスタンプ", "種目", "数値/時間", "獲得標高(m)"]);
      // ヘッダー行を太字にし、背景に薄い水色を設定して見やすく調整
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#e0f2fe");
    }
    
    // データを末尾に追加
    sheet.appendRow([timestamp, exercise, amount, elevation]);
    
    // 3. Googleカレンダーへの実績登録
    // ユーザーのデフォルトカレンダーを取得
    var calendar = CalendarApp.getDefaultCalendar();
    if (calendar) {
      var now = new Date();
      var startTime = new Date(now.getTime());
      var endTime = new Date(now.getTime() + 15 * 60 * 1000); // 15分間のイベントとして登録
      
      // タイトルフォーマット: 🏔️ [済] 種目 数値（例: 🏔️ [済] フロント・プランク 1分）
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
    
    // 4. 成功レスポンスの返却（CORS対応ヘッダー付与）
    var responseObj = { "status": "success", "message": "Logged successfully" };
    return ContentService.createTextOutput(JSON.stringify(responseObj))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
      
  } catch (error) {
    // エラー発生時のレスポンス
    var errorObj = { "status": "error", "message": error.toString() };
    return ContentService.createTextOutput(JSON.stringify(errorObj))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}

/**
 * CORSのプリフライトリクエスト(OPTIONS)に対応するための関数
 * fetchAPIの仕様によってはOPTIONSが飛んでくる場合があるため定義しておきます
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
