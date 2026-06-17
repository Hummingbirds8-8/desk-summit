/**
 * DeskSummit - App Logic (Cyber Dark Edition)
 * 
 * スマホ特化のダークテーマ運動記録・登山Webアプリ。
 * スプレッドシート同期(GET/POST)、1分カウントダウンタイマー、未踏峰10選、豆知識、登頂証明書モーダル。
 */

// --- 状態管理オブジェクト ---
const state = {
  elevation: 0,       // 現在の標高 (m)
  logs: [],           // トレーニング履歴
  streak: 0,          // 連続記録日数
  gasUrl: "",         // GAS WebアプリURL
  currentMountain: "siple" // 現在挑戦中の山ID
};

// 10つの未踏峰・聖峰のデータ定義 (解説文 desc 追加)
const MOUNTAINS = {
  siple: { 
    name: "サイプル山", 
    height: 3110, 
    desc: "南極の絶海の孤島「サイプル島」にそびえる火山。極寒の吹雪とアプローチの過酷さから、人類の登頂記録が未だ存在しない完全なる未踏の極地。"
  },
  kailash: { 
    name: "カイラス山", 
    height: 6638, 
    desc: "チベット西部に位置する仏教・ヒンドゥー教等の四大宗教の聖地。神々の領域として法律で登頂が永遠に禁止されている祈りの峰。"
  },
  kawagarbo: { 
    name: "梅里雪山/カワカボ", 
    height: 6740, 
    desc: "チベット仏教の八大聖山の一つ。過去に多くの登山隊が遭難した悲劇の山であり、現在は信仰を守るため法律で永久に登頂が禁止されている。"
  },
  machapuchare: { 
    name: "マチャプチャレ", 
    height: 6993, 
    desc: "ヒンドゥー教の主神シヴァが住まうとされるネパールの聖峰。その美しい魚の尾のような山頂は神聖視され、政府により登山が完全に禁止されている。"
  },
  kangto: { 
    name: "カン・ト", 
    height: 7060, 
    desc: "インドと中国の複雑な国境に位置する未踏峰。険しい氷壁と地元の部族による熱烈な信仰により、登山ルートが未だ開拓されていない。"
  },
  thongshanjiab: { 
    name: "トンシャンジャブ", 
    height: 7207, 
    desc: "ブータンと中国の国境にまたがる峻険な未踏峰。ブータン政府の厳格な宗教・環境保護政策により、許可の下りない禁断の領域。"
  },
  karjiang: { 
    name: "カージアン", 
    height: 7221, 
    desc: "チベットにそびえる悪魔の山。絶え間なく発生する壊滅的な雪崩と、垂直に切り立つ氷壁によって人類の登頂を阻み続ける過酷な未踏峰。"
  },
  labuchekang3: { 
    name: "ラブチェ・カンIII峰", 
    height: 7250, 
    desc: "チベットにある世界最高峰クラスの難攻不落の未踏峰。極限の低酸素環境と、急激な気候変化による暴風雪が挑戦者を拒み続けている。"
  },
  muchuchhish: { 
    name: "ムチュ・チッシュ", 
    height: 7452, 
    desc: "パキスタンのカラコルム山脈にある氷壁の絶壁。数々の著名な登山家たちがアタックしたが、その極めて急峻な尾根に阻まれ全員が敗退した。"
  },
  gangkhar: { 
    name: "ガンカー・プンスム", 
    height: 7570, 
    desc: "ブータン最高峰にして、人類が登頂していない世界最高標高の未踏峰。1994年以降、信仰と自然の保護のため政府により登山活動が完全に禁止された。"
  }
};

// --- 豆知識データベース ---
const TRIVIA_DATABASE = {
  siple: [
    "サイプル山 (3,110m) は南極の孤島にそびえる。これまで人類が登頂した記録は存在しない完全な未踏峰だ。極寒の風がお前を阻む。",
    "南極の未踏峰：サイプル山は南極観測船すら接近が困難な極地にある。お前の一歩は、この過酷な極地を切り拓く先駆者の一歩だ。"
  ],
  kailash: [
    "カイラス山 (6,638m) はチベットの聖地。信仰上の理由から登頂が完全に禁止されている。神聖なる領域に精神を研ぎ澄ませ。",
    "聖峰巡礼：カイラス山の周囲を巡礼者たちは時計回りに巡る。そのストイックな歩みが、お前の体幹トレーニングに通じている。"
  ],
  kawagarbo: [
    "梅里雪山/カワカボ (6,740m) はチベット仏教の八大聖山の一つ。かつて遭難事故を生み、現在は法律で永久登頂禁止とされている。大自然への畏敬の念を忘れるな。",
    "人類を拒む山：梅里雪山の山頂は神々が住まう場所とされる。我々ができるのは麓からひれ伏し、自身の肉体を鍛え上げることだけだ。"
  ],
  machapuchare: [
    "マチャプチャレ (6,993m) はネパールのアンナプルナ山群にあり、ヒンドゥー教のシヴァ神の住処とされる。ネパール政府により登頂が固く禁じられている。",
    "神聖なる双耳峰：マチャプチャレは美しい稜線が特徴。その頂に挑むかのように、プランクの姿勢を強固に保ち続けろ。"
  ],
  kangto: [
    "カン・ト (7,060m) はインドと中国の国境地帯にあり、険しい地形と地元部族の信仰により登山ルートが確立されていない未踏峰。荒々しい大自然がお前の精神力を試している。",
    "未開の壁：カン・トの登攀は極めて過酷。このアタックで得た高度は、お前の揺るぎない粘り強さの証だ。"
  ],
  thongshanjiab: [
    "トンシャンジャブ (7,207m) はブータンと中国の国境に位置する未踏峰。政治・宗教的要因により立ち入りが極めて厳しく制限されている。隠された秘峰へと意識を向けろ。",
    "禁断の未踏峰：トンシャンジャブへの接近すら限られた者しか許されない。今日のお前の鍛錬こそが、その禁断の山嶺へ至る鍵となる。"
  ],
  karjiang: [
    "カージアン (7,221m) はチベットに位置し、極めて高い雪崩の危険と険しい垂直の氷壁によって人類の登頂を拒み続けている未踏峰。雪崩の咆哮に立ち向かう強靭な意志を持て。",
    "崩落の山嶺：カージアンの急峻な山肌は絶え間ない雪崩を引き起こす。一瞬の油断も許されない。トレーニング中も一呼吸たりなく気を抜くな。"
  ],
  labuchekang3: [
    "ラブチェ・カンIII峰 (7,250m) はチベットの過酷な気候の中にそびえる世界最高峰クラスの未踏峰。急な天候悪化と圧倒的な酸素濃度低下がお前を追い詰める。",
    "氷鎖の監獄：ラブチェ・カンIII峰の周囲は厚い氷河に覆われている。お前の足腰を鍛え、極限状態を切り抜ける強さを手に入れろ。"
  ],
  muchuchhish: [
    "ムチュ・チッシュ (7,452m) はパキスタンのカラコルム山脈にある世界屈指の未踏峰。ほぼ垂直に切り立つ長い尾根と悪天候が原因で、多くの挑戦者が敗退した地獄の山だ。",
    "絶望の連峰：ムチュ・チッシュの急峻な尾根は滑落の危険が絶えない。今日のスクワットで培った下半身の安定性が、この絶壁を越える力となる。"
  ],
  gangkhar: [
    "ガンカー・プンスム (7,570m) はブータンと中国の国境にあり、世界最高の未踏峰。ブータン政府の宗教的・環境的保護政策により現在は登山が全面禁止されている。人類最後のフロンティアだ。",
    "世界最高の未踏峰：ガンカー・プンスムの頂に立った人間は一人もいない。お前が日々の運動を積み重ねることで、この神聖にして絶対的な頂へ近づくのだ。"
  ]
};

const GENERAL_MOTIVATION = [
  "限界は頭が作り出す幻影だ。肉体はまだ動ける。次の一歩を踏み出せ！",
  "過酷な吹雪の中でも、一歩前へ進む意志が命を繋ぐ。今日のアタックも完璧だ。",
  "筋肉の焦げ付くような痛みは、お前が重力に打ち勝っている証拠。聖山の風はお前を歓迎している。",
  "呼吸を整えろ。酸素の薄いデスゾーンで生き残るには、体幹の安定がすべてだ。"
];

// --- タイマー関連変数 (1分カウントダウン) ---
let timerInterval = null;
const TIMER_DURATION_MS = 60000; // 1分
let timerRemainingTime = TIMER_DURATION_MS;
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

  // スプレッドシートからの同期
  fetchSync();
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
  state.currentMountain = savedMountain && MOUNTAINS[savedMountain] ? savedMountain : "siple";
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

  // タイマー
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
    fetchSync(); // 設定完了時に自動同期
  });

  // 手動同期ボタン (ヘッダーのアイコン)
  const syncBtn = document.getElementById("sync-status");
  syncBtn.addEventListener("click", fetchSync);

  // モーダル閉じるボタン
  const triviaCloseBtn = document.getElementById("trivia-close-btn");
  triviaCloseBtn.addEventListener("click", () => {
    document.getElementById("trivia-modal").classList.remove("show");
  });

  const conquestCloseBtn = document.getElementById("conquest-close-btn");
  conquestCloseBtn.addEventListener("click", () => {
    document.getElementById("conquest-modal").classList.remove("show");
    moveToNextMountain();
  });
}

// --- 月間カレンダーウィジェットの生成 ---
function generateCalendar() {
  const calendarWidget = document.getElementById("calendar-widget");
  calendarWidget.innerHTML = "";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 運動実績のある日付のセットを作成 (フォーマット: YYYY-MM-DD)
  const completedDates = new Set();
  state.logs.forEach(log => {
    if (log.timestamp) {
      const dateStr = log.timestamp.split("T")[0]; // YYYY-MM-DD
      completedDates.add(dateStr);
    }
  });

  // 第1日までの空セルを埋める
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty";
    calendarWidget.appendChild(emptyCell);
  }

  // 日付セルの生成
  for (let d = 1; d <= daysInMonth; d++) {
    const currentDate = new Date(year, month, d);
    const dayOfWeek = currentDate.getDay();
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const cell = document.createElement("div");
    cell.className = "calendar-day";
    cell.innerHTML = `<span class="day-num">${d}</span>`;

    if (dayOfWeek === 0) {
      cell.classList.add("sun-cell");
    }

    if (d === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
      cell.classList.add("today");
    }

    if (completedDates.has(formattedDate)) {
      cell.classList.add("done");
    }

    calendarWidget.appendChild(cell);
  }
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

  const hikerPin = document.getElementById("hiker-pin");
  const bottomVal = Math.min(68, progressPercent * 0.68);
  const leftVal = 5 + (progressPercent * 0.25);

  hikerPin.style.bottom = `${bottomVal}%`;
  hikerPin.style.left = `${leftVal}%`;

  const flag = document.getElementById("summit-flag");
  flag.style.bottom = "33%";
  flag.style.left = "30%";

  // バルーンメッセージの更新
  const balloon = document.getElementById("avatar-balloon");
  if (progressPercent >= 100) {
    balloon.textContent = `🎉 登頂成功！「${currentMountainData.name}」を完全制覇！`;
    flag.classList.add("summit-glow");
  } else if (progressPercent > 75) {
    balloon.textContent = "山頂の冷気が強まってきた。最後の障壁に挑め！";
  } else if (progressPercent > 40) {
    balloon.textContent = "デスゾーンの手前だ。強靭な意志で登り続けろ。";
  } else if (progressPercent > 10) {
    balloon.textContent = "高度が増している。過酷な環境に身体を順順させよ。";
  } else {
    balloon.textContent = "アタック開始。人類未踏の領域に一歩を刻む。";
  }
}

// --- 1分カウントダウンタイマー機能 ---
function toggleTimer() {
  const toggleBtn = document.getElementById("timer-toggle-btn");
  const resetBtn = document.getElementById("timer-reset-btn");
  const applyBtn = document.getElementById("timer-apply-btn");
  const display = document.getElementById("stopwatch-display");

  if (!isTimerRunning) {
    // スタート
    isTimerRunning = true;
    const startMs = Date.now();
    const initialRemaining = timerRemainingTime;

    timerInterval = setInterval(() => {
      const elapsed = Date.now() - startMs;
      timerRemainingTime = Math.max(0, initialRemaining - elapsed);
      display.textContent = formatTime(timerRemainingTime);

      if (timerRemainingTime <= 0) {
        // カウントダウン完了
        clearInterval(timerInterval);
        isTimerRunning = false;
        display.textContent = "00:00";
        display.classList.add("finished");
        
        toggleBtn.textContent = "スタート";
        toggleBtn.className = "btn btn-primary";
        resetBtn.disabled = false;
        applyBtn.disabled = false;
        
        showToast("限界突破！タイマー完了！");
        autoApplyOneMinute();
      }
    }, 100);

    toggleBtn.textContent = "ポーズ";
    toggleBtn.className = "btn btn-secondary";
    resetBtn.disabled = true;
    applyBtn.disabled = true;
    display.classList.remove("finished");
  } else {
    // 一時停止
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
  timerRemainingTime = TIMER_DURATION_MS;
  display.textContent = "01:00";
  display.classList.remove("finished");

  resetBtn.disabled = true;
  applyBtn.disabled = true;
}

function applyTimerToForm() {
  const amountInput = document.getElementById("exercise-amount");
  amountInput.value = 1;
  updateEstimatedElevation();
  showToast("1分間を手動入力フォームに反映しました");
}

function autoApplyOneMinute() {
  const exerciseSelect = document.getElementById("exercise-select");
  const amountInput = document.getElementById("exercise-amount");
  const currentUnit = exerciseSelect.options[exerciseSelect.selectedIndex].getAttribute("data-unit");
  if (currentUnit === "分") {
    amountInput.value = 1;
  } else {
    amountInput.value = 20; // 回数なら20回
  }
  updateEstimatedElevation();
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const minStr = String(minutes).padStart(2, "0");
  const secStr = String(seconds).padStart(2, "0");

  return `${minStr}:${secStr}`;
}

// --- 運動記録フォーム制御 ---
function handleExerciseSelectChange() {
  const select = document.getElementById("exercise-select");
  const selectedOption = select.options[select.selectedIndex];
  
  const unit = selectedOption.getAttribute("data-unit");
  const defaultValue = selectedOption.getAttribute("data-default");

  document.getElementById("exercise-unit").textContent = unit;

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

  const estimatedElevation = Math.max(0, Math.floor(amount * ratio));
  document.getElementById("estimated-elevation-val").textContent = estimatedElevation;

  return estimatedElevation;
}

// --- 記録の送信と登録 ---
function submitRecord() {
  const select = document.getElementById("exercise-select");
  const selectedOption = select.options[select.selectedIndex];
  const exerciseName = selectedOption.textContent;
  const unit = selectedOption.getAttribute("data-unit");

  const amountInput = document.getElementById("exercise-amount");
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    showToast("有効な数値を入力してください");
    return;
  }

  const elevationGained = updateEstimatedElevation();
  const timestamp = getFormattedLocalTime();

  // 1. ローカル状態の更新
  const oldElevation = state.elevation;
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

  // 3. 登頂判定 or 豆知識表示
  const currentMountainData = MOUNTAINS[state.currentMountain];
  const targetHeight = currentMountainData.height;

  if (oldElevation < targetHeight && state.elevation >= targetHeight) {
    // 新規登頂！証明書を表示
    showConquestCertificate();
  } else {
    // 通常記録：豆知識表示
    showTriviaPopup();
  }

  // 4. GASとの非同期通信
  sendToGAS(newLog);
}

// 豆知識ポップアップの表示
function showTriviaPopup() {
  const currentMountainData = MOUNTAINS[state.currentMountain];
  const mountainTriviaArray = TRIVIA_DATABASE[state.currentMountain] || ["この山の歴史は謎に包まれている。"];
  
  const trivia = mountainTriviaArray[Math.floor(Math.random() * mountainTriviaArray.length)];
  const motivation = GENERAL_MOTIVATION[Math.floor(Math.random() * GENERAL_MOTIVATION.length)];

  const titleElement = document.getElementById("trivia-title");
  const textElement = document.getElementById("trivia-text");

  titleElement.textContent = `聖峰・${currentMountainData.name}の深淵`;
  textElement.textContent = `${trivia}\n\n📝 ガイドからの伝言:\n"${motivation}"`;

  document.getElementById("trivia-modal").classList.add("show");
}

// 登頂証明書の表示
function showConquestCertificate() {
  const currentMountainData = MOUNTAINS[state.currentMountain];
  
  document.getElementById("cert-summit-name").textContent = `${currentMountainData.name} (${currentMountainData.height.toLocaleString()}m)`;
  
  // 登頂日時のフォーマット
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  document.getElementById("cert-conquest-date").textContent = dateStr;
  
  document.getElementById("cert-summit-desc").textContent = currentMountainData.desc;
  
  // 合計アタック回数
  document.getElementById("cert-total-logs").textContent = `${state.logs.length}回 のアタック`;

  // モーダル表示と紙吹雪のトリガー
  document.getElementById("conquest-modal").classList.add("show");
  triggerConfetti();
}

// 登頂完了後、次の山へ移動
function moveToNextMountain() {
  const mountainIds = Object.keys(MOUNTAINS);
  const currentIndex = mountainIds.indexOf(state.currentMountain);
  
  if (currentIndex !== -1 && currentIndex < mountainIds.length - 1) {
    const nextMountainId = mountainIds[currentIndex + 1];
    state.currentMountain = nextMountainId;
    state.elevation = 0; // 次の山は標高0からスタート
    saveState();
    
    // UI反映
    const mountainSelect = document.getElementById("mountain-select");
    mountainSelect.value = nextMountainId;
    updateMountainProgress(true);
    showToast(`次なる聖峰「${MOUNTAINS[nextMountainId].name}」へのアタックを開始します`);
  } else {
    showToast("全10峰を完全踏破しました！お前の肉体と精神は真の強さを得た。");
  }
}

// --- スプレッドシートからの過去データ自動同期 ---
function fetchSync() {
  const gasUrl = state.gasUrl;
  const syncBtn = document.getElementById("sync-status");
  
  if (!gasUrl) {
    syncBtn.className = "stat-badge sync-status-badge error";
    return;
  }

  // 同期中スタイル
  syncBtn.className = "stat-badge sync-status-badge syncing";
  
  fetch(gasUrl, {
    method: "GET",
    mode: "cors"
  })
  .then(response => {
    if (!response.ok) throw new Error("Sync GET failed");
    return response.json();
  })
  .then(data => {
    if (data.status === "success" && data.logs) {
      // ログの形式をスプレッドシートデータからマッピング
      // スプレッドシート側:[timestamp, exercise, amount, elevation]
      state.logs = data.logs.map(item => {
        // 日時のフォーマットをローカルに補正
        let localTime = item.timestamp;
        if (typeof localTime === "string" && localTime.includes(".000Z")) {
          localTime = localTime.split(".")[0];
        }
        return {
          id: new Date(localTime).getTime() || Date.now(),
          timestamp: localTime,
          exercise: item.exercise,
          amount: item.amount,
          elevation: parseInt(item.elevation, 10) || 0
        };
      });

      // 標高の累計再計算
      // 現在アタック中の山で獲得した標高ではなく、「すべてのログの総標高」を蓄積する場合
      // 登頂時に次の山へ移行し標高がリセットされる仕様であるため、
      // 同期された履歴から「現在の山の到達標高」を計算する必要がある
      recalculateCurrentElevation();

      calculateStreak();
      saveState();

      // UI再描画
      generateCalendar();
      updateMountainProgress(false);
      updateStreakDisplay();

      syncBtn.className = "stat-badge sync-status-badge success";
      showToast("スプレッドシートからデータを同期しました");
    } else {
      throw new Error(data.message || "Invalid payload");
    }
  })
  .catch(error => {
    console.error("Sync GET Error:", error);
    syncBtn.className = "stat-badge sync-status-badge error";
    showToast("データの自動同期に失敗しました（オフラインまたはGAS側設定エラー）");
  });
}

// 過去のすべての履歴から、現在の山の高度を再計算する
function recalculateCurrentElevation() {
  // 山を低い順から登っていくため、過去に登頂した分の高度を差し引くことで
  // 現在挑戦中の山での到達高度を算出する。
  const mountainIds = Object.keys(MOUNTAINS);
  let totalLogsElevation = state.logs.reduce((sum, log) => sum + (log.elevation || 0), 0);
  
  let tempMountain = "siple";
  for (let i = 0; i < mountainIds.length; i++) {
    const mId = mountainIds[i];
    const mHeight = MOUNTAINS[mId].height;
    
    if (totalLogsElevation >= mHeight) {
      // すでに登頂完了している
      totalLogsElevation -= mHeight;
      // 最後の山（ガンカー・プンスム）まで制覇している場合
      if (i === mountainIds.length - 1) {
        tempMountain = mId;
        state.elevation = mHeight; // 標高MAX固定
        break;
      }
    } else {
      // 現在挑戦中の山を発見
      tempMountain = mId;
      state.elevation = totalLogsElevation;
      break;
    }
  }

  state.currentMountain = tempMountain;
  const mountainSelect = document.getElementById("mountain-select");
  if (mountainSelect) {
    mountainSelect.value = tempMountain;
  }
}

// GASへのPOST送信
function sendToGAS(logData) {
  const gasUrl = state.gasUrl;
  if (!gasUrl) return;

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
      "Content-Type": "text/plain"
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) throw new Error("POST failed");
    return response.json();
  })
  .then(data => {
    if (data.status === "success") {
      // 送信成功時に同期完了マーク
      document.getElementById("sync-status").className = "stat-badge sync-status-badge success";
    }
  })
  .catch(error => {
    console.error("GAS Post Error:", error);
    document.getElementById("sync-status").className = "stat-badge sync-status-badge error";
  });
}

// --- 継続日数 (Streak) 計算ロジック ---
function calculateStreak() {
  if (state.logs.length === 0) {
    state.streak = 0;
    return;
  }

  const sortedDates = [...new Set(state.logs.map(log => log.timestamp.split("T")[0]))]
    .sort((a, b) => new Date(b) - new Date(a));

  const todayStr = getFormattedLocalTime().split("T")[0];
  const yesterdayStr = getFormattedDateOffset(-1);

  const latestDate = sortedDates[0];
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    state.streak = 0;
    return;
  }

  let currentStreak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = new Date(sortedDates[i]);
    const next = new Date(sortedDates[i + 1]);
    
    const diffTime = Math.abs(current - next);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
    } else if (diffDays > 1) {
      break;
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
  const existingToast = document.querySelector(".toast-msg");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast-msg";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 50);

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
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  particles = [];
  
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
