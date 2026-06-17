/**
 * DeskSummit - App Logic
 * 
 * スマホ特化のライトテーマ運動記録・登山Webアプリ。
 * ローカルストレージによる状態管理、ストップウォッチ、カレンダー、山の進捗、GAS API送信機能。
 */

// --- 状態管理オブジェクト ---
const state = {
  elevation: 0,       // 現在の標高 (m)
  logs: [],           // トレーニング履歴
  streak: 0,          // 連続記録日数
  gasUrl: "",         // GAS WebアプリURL
  currentMountain: "fuji" // 現在挑戦中の山ID
};

// 山のデータ定義
const MOUNTAINS = {
  fuji: { name: "富士山", height: 3776 },
  kailash: { name: "カイラス山", height: 6638 },
  everest: { name: "エベレスト", height: 8848 }
};

// --- ストップウォッチ関連変数 ---
let timerInterval = null;
let timerStartTime = 0;
let timerElapsedTime = 0;
let isTimerRunning = false;

// --- パーティクル（紙吹雪）アニメーション関連 ---
let canvas = null;
let ctx = null;
let particles = [];
let animationFrameId = null;

// --- DOM読み込み完了時の処理 ---
document.addEventListener("DOMContentLoaded", () => {
  // ローカルストレージから状態を復元
  loadState();

  // DOM要素の初期化
  initDOMElements();

  // カレンダーウィジェットの生成
  generateCalendar();

  // 山の描画とクライマー位置の初期化
  updateMountainProgress(false);

  // フォーム初期値設定
  handleExerciseSelectChange();

  // パーティクル用キャンバス初期化
  initCanvas();

  // 連続日数の更新
  calculateStreak();
  updateStreakDisplay();
});

// --- ローカルストレージ管理 ---
function loadState() {
  const savedElevation = localStorage.getItem("desksummit_elevation");
  state.elevation = savedElevation ? parseInt(savedElevation, 10) : 0;

  const savedLogs = localStorage.getItem("desksummit_logs");
  state.logs = savedLogs ? JSON.parse(savedLogs) : [];

  const savedStreak = localStorage.getItem("desksummit_streak");
  state.streak = savedStreak ? parseInt(savedStreak, 10) : 0;

  const savedGasUrl = localStorage.getItem("desksummit_gas_url");
  state.gasUrl = savedGasUrl || "";

  const savedMountain = localStorage.getItem("desksummit_mountain");
  state.currentMountain = savedMountain && MOUNTAINS[savedMountain] ? savedMountain : "fuji";
}

function saveState() {
  localStorage.setItem("desksummit_elevation", state.elevation);
  localStorage.setItem("desksummit_logs", JSON.stringify(state.logs));
  localStorage.setItem("desksummit_streak", state.streak);
  localStorage.setItem("desksummit_gas_url", state.gasUrl);
  localStorage.setItem("desksummit_mountain", state.currentMountain);
}

// --- DOM要素とイベントリスナーの紐付け ---
function initDOMElements() {
  // 山のセレクター
  const mountainSelect = document.getElementById("mountain-select");
  mountainSelect.value = state.currentMountain;
  mountainSelect.addEventListener("change", (e) => {
    state.currentMountain = e.target.value;
    saveState();
    updateMountainProgress(true);
  });

  // ストップウォッチ
  const timerToggleBtn = document.getElementById("timer-toggle-btn");
  const timerResetBtn = document.getElementById("timer-reset-btn");
  const timerApplyBtn = document.getElementById("timer-apply-btn");

  timerToggleBtn.addEventListener("click", toggleTimer);
  timerResetBtn.addEventListener("click", resetTimer);
  timerApplyBtn.addEventListener("click", applyTimerToForm);

  // 運動フォーム
  const exerciseSelect = document.getElementById("exercise-select");
  const exerciseAmount = document.getElementById("exercise-amount");
  const submitRecordBtn = document.getElementById("submit-record-btn");

  exerciseSelect.addEventListener("change", handleExerciseSelectChange);
  exerciseAmount.addEventListener("input", updateEstimatedElevation);

  submitRecordBtn.addEventListener("click", submitRecord);

  // GAS設定アコーディオン
  const settingsTrigger = document.getElementById("settings-trigger");
  const settingsAccordion = settingsTrigger.parentElement;
  const gasUrlInput = document.getElementById("gas-url-input");
  const saveSettingsBtn = document.getElementById("save-settings-btn");

  gasUrlInput.value = state.gasUrl;

  settingsTrigger.addEventListener("click", () => {
    settingsAccordion.classList.toggle("open");
  });

  saveSettingsBtn.addEventListener("click", () => {
    state.gasUrl = gasUrlInput.value.trim();
    saveState();
    showToast("GASの接続設定を保存しました");
    settingsAccordion.classList.remove("open");
  });
}

// --- 横スクロールカレンダーウィジェットの生成 ---
function generateCalendar() {
  const calendarWidget = document.getElementById("calendar-widget");
  calendarWidget.innerHTML = "";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // 月の最初の日と最後の日
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];

  // 運動実績のある日付のセットを作成 (フォーマット: YYYY-MM-DD)
  const completedDates = new Set();
  state.logs.forEach(log => {
    if (log.timestamp) {
      const dateStr = log.timestamp.split("T")[0]; // YYYY-MM-DD
      completedDates.add(dateStr);
    }
  });

  for (let d = 1; d <= daysInMonth; d++) {
    const currentDate = new Date(year, month, d);
    const dayOfWeek = currentDate.getDay();
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    // カードの作成
    const card = document.createElement("div");
    card.className = "calendar-card";
    
    // 今日の判定
    if (d === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
      card.classList.add("today");
    }

    // 運動実績ありの判定
    if (completedDates.has(formattedDate)) {
      card.classList.add("done");
    }

    // 曜日の色分け
    let dayNameColor = "";
    if (dayOfWeek === 0) dayNameColor = "color: #ef4444;"; // 日曜日 (赤)
    if (dayOfWeek === 6) dayNameColor = "color: #3b82f6;"; // 土曜日 (青)

    card.innerHTML = `
      <span class="day-name" style="${dayNameColor}">${dayLabels[dayOfWeek]}</span>
      <span class="day-num">${d}</span>
    `;

    calendarWidget.appendChild(card);
  }

  // 今日の日付カードまで自動スクロール
  setTimeout(() => {
    const todayCard = calendarWidget.querySelector(".calendar-card.today");
    if (todayCard) {
      const container = document.querySelector(".calendar-scroll-container");
      const scrollOffset = todayCard.offsetLeft - (container.clientWidth / 2) + (todayCard.clientWidth / 2);
      container.scrollTo({ left: scrollOffset, behavior: "smooth" });
    }
  }, 100);
}

// --- 登山の進捗とクライマー（登山家）の位置の更新 ---
function updateMountainProgress(animate = true) {
  const currentMountainData = MOUNTAINS[state.currentMountain];
  const targetHeight = currentMountainData.height;

  // DOM更新
  document.getElementById("target-elevation-val").textContent = targetHeight.toLocaleString();
  document.getElementById("current-elevation-val").textContent = state.elevation.toLocaleString();
  document.getElementById("elevation-ratio-text").innerHTML = `
    <span id="current-elevation-val">${state.elevation.toLocaleString()}</span>m / 
    <span id="target-elevation-val">${targetHeight.toLocaleString()}</span>m
  `;

  // 進捗率の算出 (0%〜100%)
  const progressPercent = Math.min(100, Math.max(0, (state.elevation / targetHeight) * 100));
  const progressFill = document.getElementById("elevation-progress-fill");
  progressFill.style.width = `${progressPercent}%`;

  // クライマー (hiker-pin) の位置更新
  // 進捗に応じて、山の斜面を登るように移動
  // ボトム 0% から 68% の範囲（山頂付近）、レフト 5% から 30% の範囲（手前山の山頂位置）
  const hikerPin = document.getElementById("hiker-pin");
  const bottomVal = Math.min(68, progressPercent * 0.68);
  const leftVal = 5 + (progressPercent * 0.25); // 5% から 30%

  hikerPin.style.bottom = `${bottomVal}%`;
  hikerPin.style.left = `${leftVal}%`;

  // フラッグの位置を山の頂上に合わせる (手前山の頂上は bottom: 32%, left: 30%)
  const flag = document.getElementById("summit-flag");
  flag.style.bottom = "33%";
  flag.style.left = "30%";

  // バルーンメッセージの更新
  const balloon = document.getElementById("avatar-balloon");
  if (progressPercent >= 100) {
    balloon.textContent = `🎉 登頂成功！「${currentMountainData.name}」を制覇しました！`;
    flag.classList.add("summit-glow");
    if (animate) {
      triggerConfetti();
    }
  } else if (progressPercent > 75) {
    balloon.textContent = "山頂が見えてきました！ラストスパートです！";
  } else if (progressPercent > 40) {
    balloon.textContent = "良いペースです！半分まで来ました。水分を取りましょう。";
  } else if (progressPercent > 10) {
    balloon.textContent = "一歩ずつ、着実に登っています。その調子！";
  } else {
    balloon.textContent = "登山を開始しました！今日の運動を記録しましょう。";
  }
}

// --- ストップウォッチ機能 ---
function toggleTimer() {
  const toggleBtn = document.getElementById("timer-toggle-btn");
  const resetBtn = document.getElementById("timer-reset-btn");
  const applyBtn = document.getElementById("timer-apply-btn");
  const display = document.getElementById("stopwatch-display");

  if (!isTimerRunning) {
    // スタート
    isTimerRunning = true;
    timerStartTime = Date.now() - timerElapsedTime;
    timerInterval = setInterval(() => {
      timerElapsedTime = Date.now() - timerStartTime;
      display.textContent = formatTime(timerElapsedTime);
    }, 100);

    toggleBtn.textContent = "ストップ";
    toggleBtn.className = "btn btn-secondary";
    resetBtn.disabled = true;
    applyBtn.disabled = true;
  } else {
    // ストップ
    isTimerRunning = false;
    clearInterval(timerInterval);

    toggleBtn.textContent = "スタート";
    toggleBtn.className = "btn btn-primary";
    resetBtn.disabled = false;
    applyBtn.disabled = false;
  }
}

function resetTimer() {
  const resetBtn = document.getElementById("timer-reset-btn");
  const applyBtn = document.getElementById("timer-apply-btn");
  const display = document.getElementById("stopwatch-display");

  isTimerRunning = false;
  clearInterval(timerInterval);
  timerElapsedTime = 0;
  display.textContent = "00:00.0";

  resetBtn.disabled = true;
  applyBtn.disabled = true;
}

// ストップウォッチの経過時間を分単位に換算してフォームへ代入
function applyTimerToForm() {
  const exerciseSelect = document.getElementById("exercise-select");
  const amountInput = document.getElementById("exercise-amount");
  const currentUnit = exerciseSelect.options[exerciseSelect.selectedIndex].getAttribute("data-unit");

  // 経過時間を秒に変換
  const totalSeconds = Math.floor(timerElapsedTime / 1000);
  
  if (currentUnit === "分") {
    // 分に換算 (小数点第一位まで)
    const minutes = Math.max(1, Math.round((totalSeconds / 60) * 10) / 10);
    amountInput.value = minutes;
  } else {
    // 「回」の場合は、便宜的に「3秒につき1回」として回数を計算
    const reps = Math.max(1, Math.round(totalSeconds / 3));
    amountInput.value = reps;
  }

  updateEstimatedElevation();
  showToast("計測時間をフォームに入力しました");
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  const minStr = String(minutes).padStart(2, "0");
  const secStr = String(seconds).padStart(2, "0");

  return `${minStr}:${secStr}.${tenths}`;
}

// --- 運動記録フォーム制御 ---
function handleExerciseSelectChange() {
  const select = document.getElementById("exercise-select");
  const selectedOption = select.options[select.selectedIndex];
  
  const unit = selectedOption.getAttribute("data-unit");
  const defaultValue = selectedOption.getAttribute("data-default");

  // 単位バッジの更新
  document.getElementById("exercise-unit").textContent = unit;

  // 数値入力のデフォルト値更新
  const amountInput = document.getElementById("exercise-amount");
  amountInput.value = defaultValue;

  updateEstimatedElevation();
}

function updateEstimatedElevation() {
  const select = document.getElementById("exercise-select");
  const selectedOption = select.options[select.selectedIndex];
  const ratio = parseFloat(selectedOption.getAttribute("data-ratio"));

  const amountInput = document.getElementById("exercise-amount");
  const amount = parseFloat(amountInput.value) || 0;

  // 獲得標高の計算 (切り捨てで整数化)
  const estimatedElevation = Math.max(0, Math.floor(amount * ratio));
  document.getElementById("estimated-elevation-val").textContent = estimatedElevation;

  return estimatedElevation;
}

// --- 記録の送信と登録 ---
function submitRecord() {
  const select = document.getElementById("exercise-select");
  const selectedOption = select.options[select.selectedIndex];
  const exerciseName = selectedOption.textContent;
  const exerciseId = select.value;
  const unit = selectedOption.getAttribute("data-unit");

  const amountInput = document.getElementById("exercise-amount");
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    showToast("有効な数値を入力してください");
    return;
  }

  const elevationGained = updateEstimatedElevation();
  const timestamp = getFormattedLocalTime();

  // 1. ローカルステージの更新
  state.elevation += elevationGained;
  
  const newLog = {
    id: Date.now(),
    timestamp: timestamp,
    exercise: exerciseName,
    amount: `${amount}${unit}`,
    elevation: elevationGained
  };

  state.logs.push(newLog);
  calculateStreak();
  saveState();

  // 2. UIの更新
  updateMountainProgress(true);
  generateCalendar();
  updateStreakDisplay();

  // 入力リセット
  amountInput.value = selectedOption.getAttribute("data-default");
  updateEstimatedElevation();
  resetTimer();

  // 3. GASとの非同期通信
  sendToGAS(newLog);
}

// GASへのPOST送信
function sendToGAS(logData) {
  const gasUrl = state.gasUrl;
  if (!gasUrl) {
    showToast(`🏔️ 標高+${logData.elevation}m！ローカルに記録しました。(GAS連携は未設定)`);
    return;
  }

  showToast("GASへデータを送信中...");

  // 送信データフォーマット:
  // { "timestamp": "YYYY-MM-DDTHH:mm:ss", "exercise": "プランク", "amount": "1分", "elevation": 100 }
  const payload = {
    timestamp: logData.timestamp,
    exercise: logData.exercise,
    amount: logData.amount,
    elevation: logData.elevation
  };

  fetch(gasUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain" // CORSのプリフライト(OPTIONS)を避けるための設定
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.status === "success") {
      showToast(`🏔️ 標高+${logData.elevation}m！GAS/Googleカレンダーに同期しました！`);
    } else {
      showToast(`🏔️ 標高+${logData.elevation}m！(GASエラー: ${data.message})`);
    }
  })
  .catch(error => {
    console.error("GAS Post Error:", error);
    showToast(`🏔️ 標高+${logData.elevation}m！(通信エラー: スプレッドシート同期に失敗)`);
  });
}

// --- 継続日数 (Streak) 計算ロジック ---
function calculateStreak() {
  if (state.logs.length === 0) {
    state.streak = 0;
    return;
  }

  // 重複を排除し日付順にソートした配列を作成 (タイムゾーン考慮)
  const sortedDates = [...new Set(state.logs.map(log => log.timestamp.split("T")[0]))]
    .sort((a, b) => new Date(b) - new Date(a)); // 新しい順

  const todayStr = getFormattedLocalTime().split("T")[0];
  const yesterdayStr = getFormattedDateOffset(-1);

  // 最後に運動した日が今日または昨日でない場合、継続は途切れている
  const latestDate = sortedDates[0];
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    state.streak = 0;
    return;
  }

  let currentStreak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = new Date(sortedDates[i]);
    const next = new Date(sortedDates[i + 1]);
    
    // 日付の差を計算 (ミリ秒 -> 日)
    const diffTime = Math.abs(current - next);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
    } else if (diffDays > 1) {
      break; // 連続が途切れた
    }
  }

  state.streak = currentStreak;
}

function updateStreakDisplay() {
  document.getElementById("streak-count").textContent = state.streak;
  const badge = document.getElementById("streak-badge");
  if (state.streak > 0) {
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

// --- ヘルパー関数 ---
function getFormattedLocalTime() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
}

function getFormattedDateOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// トースト通知の表示
function showToast(message) {
  // 既存のトーストがあれば消去
  const existingToast = document.querySelector(".toast-msg");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast-msg";
  toast.textContent = message;
  document.body.appendChild(toast);

  // アニメーション表示用のトリガー
  setTimeout(() => {
    toast.classList.add("show");
  }, 50);

  // 3.5秒後に消滅
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 3500);
}

// --- パーティクル（登頂お祝い紙吹雪）アニメーション ---
function initCanvas() {
  canvas = document.getElementById("particle-canvas");
  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

class Confetti {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height - canvas.height;
    this.size = Math.random() * 8 + 5;
    this.color = `hsl(${Math.random() * 360}, 90%, 60%)`;
    this.speed = Math.random() * 3 + 2;
    this.angle = Math.random() * 360;
    this.spin = Math.random() * 4 - 2;
  }

  update() {
    this.y += this.speed;
    this.x += Math.sin(this.y / 30) * 0.5;
    this.angle += this.spin;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.angle * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

function triggerConfetti() {
  // キャンセルの初期化
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  particles = [];
  
  // 150個の紙吹雪を生成
  for (let i = 0; i < 150; i++) {
    particles.push(new Confetti());
  }

  animateConfetti();
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  let allFinished = true;
  
  particles.forEach(p => {
    p.update();
    p.draw();
    if (p.y < canvas.height) {
      allFinished = false;
    }
  });

  if (!allFinished) {
    animationFrameId = requestAnimationFrame(animateConfetti);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
