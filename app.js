/* ==========================================
   DESKSUMMIT - LEGENDARY CLIMBER GAME LOGIC
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. STATE & DATASETS
  // ==========================================
  
  let state = {
    activeMountainId: 'kailash',
    mountainProgress: {
      kailash: 0,
      kawagarbo: 0,
      machapuchare: 0,
      nangaparbat: 0,
      kangchenjunga: 0,
      everest: 0
    },
    coins: 0, // Climbing Points (pts)
    level: 1, // Mountaineer Rank
    exp: 0,
    fat: 25.0, // Used internally to calculate ab definition percentage
    coreLevel: 1,
    streak: 0,
    lastActiveDate: null,
    purchasedItems: [], // e.g. ["headband"] (backpack), ["dumbbells"] (iceaxe), ["yogamat"] (oxygen)
    totalExercisesDone: 0,
    totalCoinsEarned: 0, // Total points earned
    totalCalories: 0,
    
    // Consumables state
    vitaminBoostActive: false, // Doubles the next exercise's climbing meters
    
    // Timer configurations
    timerIntervalMinutes: 30,
    timerState: 'stopped', // 'stopped' | 'running' | 'paused'
    timerTimeRemaining: 1800, // in seconds (30 mins default)
    timerMode: 'work',
    
    // Active exercise configurations
    activeExerciseId: null,
    exerciseTimeRemaining: 0,
    exerciseTotalDuration: 0,
    completedClimbs: [] // Array of { mountainId, dateStr, rank }
  };

  // 6 Unreachable/Legendary Mountains Dataset
  const MOUNTAINS = {
    kailash: {
      name: "カイラス山",
      height: 6638,
      difficulty: "★☆☆☆",
      desc: "チベット西部にそびえる聖峰。4つの宗教の最も神聖な聖地であり、信仰の尊厳を守るため歴史上未だ誰も登頂していない、立ち入りすら完全禁止の「生涯未踏の聖山」。"
    },
    kawagarbo: {
      name: "カワカブ/梅里雪山",
      height: 6740,
      difficulty: "★★☆☆",
      desc: "チベット仏教の八大聖山の一つ。1991年の大規模遭難事故以降、地元の強い信仰心と安全確保のため、法的に登山が永久に完全禁止された「不可侵の美しき処女峰」。"
    },
    machapuchare: {
      name: "マチャプチャレ",
      height: 6993,
      difficulty: "★★☆☆",
      desc: "ネパール・ヒマラヤ山脈の聖峰。「魚の尾」を意味する双耳峰。ヒンドゥー教の主神シヴァが住むとされ、1957年以降すべての立ち入り・登山が完全禁止されている幻の山。"
    },
    nangaparbat: {
      name: "ナンガ・パルバット",
      height: 8126,
      difficulty: "★★★☆",
      desc: "パキスタンにある世界第9位の高峰。「人喰い山」とも恐れられ、標高差4,600mにも及ぶルパール絶壁を抱える、世界で最も過酷かつ危険極まりない難関巨峰。"
    },
    kangchenjunga: {
      name: "カンチェンジュンガ",
      height: 8586,
      difficulty: "★★★★",
      desc: "ネパールとインドの国境にまたがる世界第3位の高峰。「5つの雪の宝庫」を意味し、強烈な雪崩、強風、そして極限の気象変化がクライマーを阻み続けるヒマラヤの超巨大峰。"
    },
    everest: {
      name: "エベレスト",
      height: 8848,
      difficulty: "★★★★☆",
      desc: "ネパールとチベットにまたがる世界最高峰（チョモランマ）。全人類の最高到達点であり、デスゾーン（極限の超高所）がそびえる地球上で最も宇宙に近い頂き。"
    }
  };

  // Seated Core Exercises Dataset
  const EXERCISES = {
    drawin: {
      name: "ドローイン (Stomach Vacuum)",
      desc: "背筋を伸ばし、息を吐きながら極限までお腹を凹ませてキープ！",
      duration: 30,
      climb: 200, // +200 meters base
      exp: 15,
      calories: 10,
      breathPattern: [
        { phase: '鼻から大きく息を吸う', duration: 4, type: 'inhale' },
        { phase: '細く長く吐き、お腹を凹ます', duration: 6, type: 'exhale' },
        { phase: '凹ませたまま！浅く呼吸してキープ！', duration: 10, type: 'hold' },
        { phase: 'ゆっくり力を抜いて息を吸う', duration: 4, type: 'inhale' },
        { phase: 'もう一度吐いてさらに極限まで凹ます！', duration: 6, type: 'exhale' }
      ]
    },
    kneeup: {
      name: "シーテッド・ニーアップ (Knee Raises)",
      desc: "椅子の端を手で支え、背筋を伸ばしたまま両膝を引き上げてキープ！",
      duration: 40,
      climb: 350, // +350 meters base
      exp: 20,
      calories: 15,
      breathPattern: [
        { phase: '息を吸って姿勢を整える', duration: 4, type: 'inhale' },
        { phase: 'ゆっくり吐きながら両膝を引き上げる', duration: 6, type: 'exhale' },
        { phase: '引き上げた最高点でキープ！耐える！', duration: 10, type: 'hold' },
        { phase: '吸いながらゆっくり膝を下ろす', duration: 4, type: 'inhale' },
        { phase: 'もう一度吐きながら膝を上げる！', duration: 6, type: 'exhale' },
        { phase: 'お腹を意識してキープ！頑張って！', duration: 10, type: 'hold' }
      ]
    },
    twist: {
      name: "体幹ツイスト (Seated Trunk Twist)",
      desc: "両腕を胸の前で組み、背筋を伸ばしてお腹を左右に深くねじります。",
      duration: 40,
      climb: 350,
      exp: 20,
      calories: 12,
      breathPattern: [
        { phase: '正面で息を吸う', duration: 4, type: 'inhale' },
        { phase: '吐きながら右に限界まで深く捻る', duration: 6, type: 'exhale' },
        { phase: '捻りきった場所でキープ！', duration: 10, type: 'hold' },
        { phase: '吸いながらゆっくり正面に戻す', duration: 4, type: 'inhale' },
        { phase: '吐きながら左に限界まで深く捻る', duration: 6, type: 'exhale' },
        { phase: '左端でしっかりキープ！', duration: 10, type: 'hold' }
      ]
    },
    sidecrunch: {
      name: "サイド・シットクランチ (Side Crunches)",
      desc: "背筋を伸ばし、上半身を真横に倒して脇腹のくびれ筋肉を縮めます。",
      duration: 40,
      climb: 350,
      exp: 20,
      calories: 14,
      breathPattern: [
        { phase: '息を吸って背すじを伸ばす', duration: 4, type: 'inhale' },
        { phase: 'ゆっくり吐きながら体を右真横に倒す', duration: 6, type: 'exhale' },
        { phase: '右脇腹をギューッと縮めてキープ！', duration: 10, type: 'hold' },
        { phase: '吸いながら上体をまっすぐ戻す', duration: 4, type: 'inhale' },
        { phase: 'ゆっくり吐きながら左真横に倒す', duration: 6, type: 'exhale' },
        { phase: '左脇腹を縮めてキープ！', duration: 10, type: 'hold' }
      ]
    },
    bicycle: {
      name: "シーテッド・バイシクル (Seated Bicycle)",
      desc: "頭の後ろで手を組み、対角線上のひじとひざを深く引き寄せてひねります。",
      duration: 50,
      climb: 500, // +500 meters base
      exp: 30,
      calories: 22,
      breathPattern: [
        { phase: '息を吸って体幹を固定する', duration: 5, type: 'inhale' },
        { phase: '右肘と左膝を引き寄せ、吐ききる', duration: 8, type: 'exhale' },
        { phase: 'ひねった状態でピタッとキープ！', duration: 12, type: 'hold' },
        { phase: '吸いながら姿勢を戻す', duration: 5, type: 'inhale' },
        { phase: '左肘と右膝を引き寄せ、吐ききる', duration: 8, type: 'exhale' },
        { phase: '限界までひねってキープ！お腹に効かせる！', duration: 12, type: 'hold' }
      ]
    },
    abroller: {
      name: "膝つきアブローラー (Knee Ab Roller)",
      desc: "【自宅・超高負荷】四つん這いからアブローラーを前方へ転がし、お腹の力で引き戻します！",
      duration: 45,
      climb: 600,
      exp: 35,
      calories: 25,
      breathPattern: [
        { phase: '四つん這いで息を大きく吸う', duration: 5, type: 'inhale' },
        { phase: '吐きながらゆっくり前方に押し出す', duration: 10, type: 'exhale' },
        { phase: '限界の地点で一瞬キープ！耐える！', duration: 5, type: 'hold' },
        { phase: '吸いながらお腹の力で手元に引き戻す', duration: 8, type: 'inhale' },
        { phase: 'もう一度吐きながら前方に滑り出す！', duration: 10, type: 'exhale' },
        { phase: '全身を強固に支えてキープ！', duration: 7, type: 'hold' }
      ]
    },
    squat: {
      name: "スロースクワット (Slow Squats)",
      desc: "【自宅・立位】足を肩幅に開き、太ももが床と平行になるまでゆっくり腰を落とします。",
      duration: 40,
      climb: 300,
      exp: 18,
      calories: 20,
      breathPattern: [
        { phase: '背筋を伸ばし、深く息を吸う', duration: 5, type: 'inhale' },
        { phase: 'ゆっくり吐きながら腰を落とす', duration: 8, type: 'exhale' },
        { phase: 'お尻を引いた最深部でキープ！', duration: 7, type: 'hold' },
        { phase: '吸いながらゆっくり立ち上がる', duration: 5, type: 'inhale' },
        { phase: 'もう一度吐きながら深く腰を落とす！', duration: 8, type: 'exhale' },
        { phase: '体幹と下半身を意識して耐える！', duration: 7, type: 'hold' }
      ]
    },
    standingtwist: {
      name: "スタンディング・クロスツイスト (Standing Cross Twist)",
      desc: "【自宅・立位】立った姿勢から、対角のひじとひざを交互に力強く引き寄せてねじります。",
      duration: 40,
      climb: 400,
      exp: 22,
      calories: 18,
      breathPattern: [
        { phase: '頭の後ろで手を組み、息を吸う', duration: 5, type: 'inhale' },
        { phase: '吐きながら右肘と左膝を力強く引き寄せる', duration: 8, type: 'exhale' },
        { phase: 'お腹をしっかり捻ってピタッと停止！', duration: 7, type: 'hold' },
        { phase: '吸いながら元の立ち姿勢に戻す', duration: 5, type: 'inhale' },
        { phase: '吐きながら左肘と右膝を引き寄せる！', duration: 8, type: 'exhale' },
        { phase: '脇腹を限界まで絞り込んでキープ！', duration: 7, type: 'hold' }
      ]
    },
    deepsquat: {
      name: "ディープ・スクワット (Deep Squats)",
      desc: "【自宅・高負荷】太ももとお尻を床の平行よりさらに深く落とし、下半身全体を強烈に刺激！",
      duration: 45,
      climb: 450,
      exp: 25,
      calories: 25,
      breathPattern: [
        { phase: '息を吸いながらゆっくり深く沈み込む', duration: 6, type: 'inhale' },
        { phase: 'お尻を極限まで落とした最深部でキープ！', duration: 10, type: 'hold' },
        { phase: '息を吐きながら力強く地面を押して立ち上がる', duration: 6, type: 'exhale' },
        { phase: '立ち上がった姿勢で一瞬息を整える', duration: 4, type: 'inhale' },
        { phase: 'もう一度深く沈み込み、大腿を追い込む！', duration: 12, type: 'hold' },
        { phase: '吐きながら最後まで立ち上がる！頑張って！', duration: 7, type: 'exhale' }
      ]
    },
    calfraise: {
      name: "カーフレイズ (Calf Raises)",
      desc: "【自宅・立位】かかとを限界まで高く引き上げてつま先立ちになり、第二の心臓「ふくらはぎ」を鍛えます。",
      duration: 35,
      climb: 250,
      exp: 15,
      calories: 12,
      breathPattern: [
        { phase: '両足を揃え、背筋を伸ばして吸う', duration: 4, type: 'inhale' },
        { phase: 'ゆっくり吐きながらかかとを限界まで上げる', duration: 6, type: 'exhale' },
        { phase: 'つま先立ちの最高到達点でキープ！', duration: 8, type: 'hold' },
        { phase: '吸いながら床ギリギリまでかかとを下ろす', duration: 4, type: 'inhale' },
        { phase: 'もう一度吐きながら高くかかとを上げる！', duration: 6, type: 'exhale' },
        { phase: 'ふくらはぎをギュッと収縮させて耐える！', duration: 7, type: 'hold' }
      ]
    },
    stepper: {
      name: "つま先固定足踏み (Silent Stepper)",
      desc: "【自宅・静音有酸素】つま先を床につけたまま、かかとを左右交互にリズムよく上下させてステップを踏みます。",
      duration: 40,
      climb: 300,
      exp: 18,
      calories: 16,
      breathPattern: [
        { phase: '姿勢を正し、リズミカルにステップ開始', duration: 6, type: 'inhale' },
        { phase: 'つま先を軸にしてかかとを交互に上下！', duration: 10, type: 'exhale' },
        { phase: 'ふくらはぎを動かしたままリズム維持！', duration: 8, type: 'hold' },
        { phase: '深く大きく呼吸しながらステップ', duration: 6, type: 'inhale' },
        { phase: 'かかとを踏み込み続け、下半身を活性化！', duration: 10, type: 'exhale' }
      ]
    }
  };

  // Climbing Gear Shop Items
  const SHOP_ITEMS = {
    protein: {
      cost: 50,
      type: "food",
      name: "高エネルギー携帯食 (エナジーバー)",
      desc: "食べるだけで、瞬時に高度が **+500m** 上昇します！"
    },
    salad: {
      cost: 40,
      type: "food",
      name: "高度障害防止ビタミンサプリ",
      desc: "飲むと、**次の腹筋運動で獲得できる標高（m）が2倍**になります！"
    },
    headband: {
      cost: 100,
      type: "gear",
      name: "超軽量アルパインバックパック",
      class: "has-backpack",
      visualId: "gear-backpack-visual"
    },
    dumbbells: {
      cost: 200,
      type: "gear",
      name: "カーボン製軽量アイスアックス",
      class: "has-iceaxe",
      visualId: "gear-iceaxe-visual"
    },
    yogamat: {
      cost: 300,
      type: "gear",
      name: "極地順応・酸素ボンベマスク",
      class: "has-oxygen",
      visualId: "gear-oxygen-visual"
    }
  };

  // Supportive, encouraging mountain-guide messages (Zero-guilt, high comfort)
  const GUIDE_MESSAGES = {
    bc: [
      "デスクワークお疲れ様です！山頂は逃げません。まずは背筋を伸ばし、お水を一口飲んで英気を養いましょう！",
      "「とりあえずドローインを30秒」だけでも、標高200m分を登る素晴らしいクライミングになりますよ！",
      "山はいつでもここで、静かにあなたを待っています。サボったなんて思わないで、今日のアタックを自分のペースで！",
      "プロフェッショナルな登山ギアをショップで買い揃えると、登頂スピードがどんどん上がっていきますよ。"
    ],
    c1: [
      "第1キャンプ（標高約2,000m〜3,000m付近）に到着です！素晴らしい足取りですね。少し肩の力を抜いて、深呼吸しましょう！",
      "順調に登れていますよ！お腹周りの筋肉（腹直筋）が活性化し、姿勢を支える力が鍛えられています。",
      "標高が高くなってきました。椅子の上で一度ぎゅっと肩をすくめて、ストンと下ろすストレッチがおすすめです。",
      "無理は禁物です。マイペースが、最も確実にサミット（登頂）へ至る一番の近道ですよ！"
    ],
    c2: [
      "第2キャンプ（標高4,000m〜5,000m付近）に到着！雲が眼下に広がっています。ここまでの努力は本当に素晴らしいです！",
      "お腹の内側（インナーマッスル）がしっかりと使えていますよ。腰痛予防や美しい立ち姿のベースができています！",
      "ここまで順調に登ってきましたね。ちょっと首を左右に優しく回して、デスクワークのコリをほぐしましょう。",
      "山頂がだんだん近づいてきましたね。あなたの頑張りを、私はいつでも心から応援し、称賛し続けます！"
    ],
    c3: [
      "第3キャンプ（標高6,000m〜7,000m付近）突破！いよいよ極地（極高所）に入りました。息を深く吐ききって、体幹をリフレッシュ！",
      "すごい！これほど高い場所まで自分の運動で登りつめるとは！お腹の引き締め度も最高潮に達しつつあります！",
      "少し息が上がってきたら、ゆっくり長めに息を吐く『サイレント呼吸』が効果的です。リラックスしていきましょう！",
      "山頂の輪郭が見えてきました！ここまで来られたのは、あなたの日々のコツコツとした積み重ねの証拠です。"
    ],
    summit: [
      "🎉 おめでとうございます！！！伝説の名峰の頂き（サミット）に到達しました！地球のてっぺんからの美しい景色を静かに味わいましょう！",
      "見事な登頂です！あなたの体幹と腹筋は、文字通り名峰をねじ伏せるほどに強靭に鍛え上げられました！",
      "登頂の栄誉を称え、星と金の紙吹雪が降り注いでいます！素晴らしい偉業です。次の山にアタックするか、さらに高みを目指しましょう！",
      "あなたはやり遂げました！サボることなく（自分のペースを守り抜いて）ここまで来られた経験は、最高の宝物です。"
    ]
  };

  // Periodic quotes
  const ADVICE_QUOTES = [
    "山はどれだけサボっても、あなたを辛抱強く待っています。無理せず、自分のペースでお腹を引き締めていきましょう！",
    "椅子に座る際、背もたれを使わずに骨盤を立てるだけで、腹直筋と背筋が刺激され、常に微弱な筋トレ状態を作れます！",
    "深く息を吐ききるドローインは、呼吸を深くし、仕事の集中力を高めるメンタルケア効果も兼ね備えています。",
    "酸素を十分に取り入れることが脂肪燃焼の最大の鍵。お腹をへこませながらも、肩の力を抜いて深く静かに呼吸を続けましょう！",
    "「バイシクル」は腹直筋、腹斜筋、腸腰筋をまとめて動かす最強の座り筋トレ。1回で標高500mもの岩壁を登破できます！"
  ];

  let timerInterval = null;
  let exerciseInterval = null;

  // ==========================================
  // 2. DOM ELEMENTS SELECTORS
  // ==========================================
  
  const els = {
    appWrapper: document.getElementById('app-wrapper'),
    toggleWidgetBtn: document.getElementById('toggle-widget-btn'),
    
    // Header Stats
    streakCount: document.getElementById('header-streak-count'),
    levelVal: document.getElementById('header-level-val'),
    coinsVal: document.getElementById('header-coins-val'),
    
    // Left Panel: Mountain Climb Display
    mountainSelect: document.getElementById('mountain-select'),
    climbHeightFill: document.getElementById('climb-height-fill'),
    hikerPin: document.getElementById('hiker-pin'),
    mountainZone: document.getElementById('mountain-interactive-zone'),
    summitFlag: document.getElementById('summit-flag'),
    guideBalloon: document.getElementById('avatar-balloon'), // Shared dialog bubble
    pokeBtn: document.getElementById('poke-avatar-btn'),
    
    // Horizontal height display
    currentElevationVal: document.getElementById('current-elevation-val'),
    targetElevationVal: document.getElementById('target-elevation-val'),
    heightHorizontalFill: document.getElementById('height-horizontal-fill'),
    
    // Progress Indicators (Ab Definition, Core, EXP)
    fatFill: document.getElementById('fat-progress-fill'), // Maps to ab definition
    fatVal: document.getElementById('fat-percentage-val'),  // Displays ab definition text
    coreFill: document.getElementById('core-progress-fill'),
    coreVal: document.getElementById('core-power-val'),
    expFill: document.getElementById('exp-progress-fill'),
    expVal: document.getElementById('exp-val'),
    
    // Navigation Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Timer Tab
    timerRingBar: document.getElementById('timer-ring-bar'),
    timerModeTitle: document.getElementById('timer-mode-title'),
    timerCountdown: document.getElementById('timer-countdown'),
    timerStartStopBtn: document.getElementById('timer-start-stop-btn'),
    instantBreakBtn: document.getElementById('instant-break-btn'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    adviceQuote: document.getElementById('advice-quote'),
    
    // Exercise Running Panel
    runExerciseTitle: document.getElementById('run-exercise-title'),
    runExerciseDesc: document.getElementById('run-exercise-desc'),
    breathGuideCircle: document.getElementById('breath-guide-circle'),
    breathGuideText: document.getElementById('breath-guide-text'),
    runTimerCountdown: document.getElementById('run-timer-countdown'),
    runProgressFill: document.getElementById('run-progress-fill'),
    runCancelBtn: document.getElementById('run-cancel-btn'),
    runCompleteBtn: document.getElementById('run-complete-btn'),
    
    // Shop Tab
    shopCards: document.querySelectorAll('.shop-card'),
    buyBtns: document.querySelectorAll('.buy-btn'),
    
    // Records Tab
    recordTotalDone: document.getElementById('record-total-done'),
    recordTotalCoins: document.getElementById('record-total-coins'),
    recordCalories: document.getElementById('record-estimated-calories'),
    rmSteps: document.querySelectorAll('.roadmap-step'),
    resetSaveBtn: document.getElementById('reset-save-btn'),
    exportSaveBtn: document.getElementById('export-save-btn'),
    importSaveBtn: document.getElementById('import-save-btn'),
    transferCodeArea: document.getElementById('transfer-code-area'),
    
    // Confetti canvas
    canvas: document.getElementById('particle-canvas')
  };

  // Canvas particle state
  const ctx = els.canvas.getContext('2d');
  let particles = [];
  let animationFrameId = null;

  // ==========================================
  // 3. INITIALIZATION & LOCAL STORAGE PERSISTENCE
  // ==========================================

  function loadSavedData() {
    try {
      const saved = localStorage.getItem('DeskSummit_SaveData');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        state.activeMountainId = parsed.activeMountainId || 'kailash';
        state.mountainProgress = parsed.mountainProgress || {
          kailash: 0, kawagarbo: 0, machapuchare: 0, nangaparbat: 0, kangchenjunga: 0, everest: 0
        };
        state.coins = parsed.coins || 0;
        state.level = parsed.level || 1;
        state.exp = parsed.exp || 0;
        state.fat = typeof parsed.fat === 'number' ? parsed.fat : 25.0;
        state.coreLevel = parsed.coreLevel || 1;
        state.streak = parsed.streak || 0;
        state.lastActiveDate = parsed.lastActiveDate || null;
        state.purchasedItems = parsed.purchasedItems || [];
        state.totalExercisesDone = parsed.totalExercisesDone || 0;
        state.totalCoinsEarned = parsed.totalCoinsEarned || 0;
        state.totalCalories = parsed.totalCalories || 0;
        state.timerIntervalMinutes = parsed.timerIntervalMinutes || 30;
        state.completedClimbs = parsed.completedClimbs || [];
      }
      
      state.timerTimeRemaining = state.timerIntervalMinutes * 60;
      
      // Sync dropdown select element
      els.mountainSelect.value = state.activeMountainId;
      
      verifyStreak();
      applyShopItemsToMountain();
      updateUI();
    } catch (e) {
      console.error("Save load failed:", e);
    }
  }

  function saveGameData() {
    try {
      const dataToSave = {
        activeMountainId: state.activeMountainId,
        mountainProgress: state.mountainProgress,
        coins: state.coins,
        level: state.level,
        exp: state.exp,
        fat: state.fat,
        coreLevel: state.coreLevel,
        streak: state.streak,
        lastActiveDate: state.lastActiveDate,
        purchasedItems: state.purchasedItems,
        totalExercisesDone: state.totalExercisesDone,
        totalCoinsEarned: state.totalCoinsEarned,
        totalCalories: state.totalCalories,
        timerIntervalMinutes: state.timerIntervalMinutes,
        completedClimbs: state.completedClimbs
      };
      localStorage.setItem('DeskSummit_SaveData', JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Save save failed:", e);
    }
  }

  function verifyStreak() {
    const todayStr = new Date().toDateString();
    
    if (state.lastActiveDate) {
      const lastActive = new Date(state.lastActiveDate);
      const diffTime = Math.abs(new Date(todayStr) - lastActive);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        state.streak = 0;
      }
    } else {
      state.streak = 0;
    }
  }

  function recordActivityCompletion() {
    const todayStr = new Date().toDateString();
    
    if (state.lastActiveDate !== todayStr) {
      if (state.lastActiveDate) {
        const lastActive = new Date(state.lastActiveDate);
        const diffTime = Math.abs(new Date(todayStr) - lastActive);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          state.streak += 1;
        } else {
          state.streak = 1;
        }
      } else {
        state.streak = 1;
      }
      state.lastActiveDate = todayStr;
    }
    
    saveGameData();
    updateUI();
  }

  // ==========================================
  // 4. CORE UI UPDATE ENGINE
  // ==========================================

  function updateUI() {
    const activeMt = MOUNTAINS[state.activeMountainId];
    const currentHeight = state.mountainProgress[state.activeMountainId] || 0;
    const targetHeight = activeMt.height;
    
    // Dynamic time gradient and death zone snow check
    updateSkyTimeOfDay();
    checkDeathZone();

    // Dynamic mountain shape class toggling
    if (els.mountainZone) {
      els.mountainZone.classList.remove('mt-kailash', 'mt-kawagarbo', 'mt-machapuchare', 'mt-nangaparbat', 'mt-kangchenjunga', 'mt-everest');
      els.mountainZone.classList.add('mt-' + state.activeMountainId);
    }
    
    // 1. Header indicators
    if (els.streakCount) els.streakCount.textContent = state.streak;
    if (els.levelVal) els.levelVal.textContent = state.level;
    if (els.coinsVal) els.coinsVal.textContent = state.coins;
    
    // 2. Records indicators
    if (els.recordTotalDone) els.recordTotalDone.textContent = state.totalExercisesDone;
    if (els.recordTotalCoins) els.recordTotalCoins.textContent = state.totalCoinsEarned;
    if (els.recordCalories) els.recordCalories.textContent = Math.round(state.totalCalories);

    // 3. Mountain selective targets display
    if (els.currentElevationVal) els.currentElevationVal.textContent = Math.round(currentHeight);
    if (els.targetElevationVal) els.targetElevationVal.textContent = targetHeight;

    const climbPercent = Math.min(100, (currentHeight / targetHeight) * 100);
    if (els.climbHeightFill) els.climbHeightFill.style.height = climbPercent + "%";
    if (els.hikerPin) els.hikerPin.style.bottom = `calc(${climbPercent}% - 10px)`; // Offset for pin emoji base
    if (els.heightHorizontalFill) els.heightHorizontalFill.style.width = climbPercent + "%";

    // Dynamic glowing flag at summit on complete climb
    if (els.summitFlag) {
      if (climbPercent >= 100) {
        els.summitFlag.style.display = 'block';
        els.summitFlag.style.filter = 'drop-shadow(0 0 10px #f59e0b)';
      } else {
        els.summitFlag.style.display = 'block';
        els.summitFlag.style.filter = 'none';
      }
    }

    // 4. "Ab Definition" (変換した綺麗な表示)
    // fat starts at 25.0% and drops to 6.0%. 
    // We map it: 25% fat -> 10% Ab definition, 6% fat -> 100% Ab definition!
    let abDef = Math.max(10, Math.round((25.0 - state.fat) * 4.7 + 10));
    abDef = Math.min(100, abDef);
    if (els.fatVal) els.fatVal.textContent = abDef + "%";
    if (els.fatFill) els.fatFill.style.width = abDef + "%";

    // 5. Core level
    if (els.coreVal) els.coreVal.textContent = "Lv " + state.coreLevel;
    if (els.coreFill) els.coreFill.style.width = Math.min(100, (state.coreLevel / 20) * 100) + "%";

    // 6. Mountaineer EXP
    const nextExpGoal = state.level * 100;
    if (els.expVal) els.expVal.textContent = `${state.exp} / ${nextExpGoal}`;
    if (els.expFill) els.expFill.style.width = Math.min(100, (state.exp / nextExpGoal) * 100) + "%";

    // 7. Evolution Stages in Records
    updateAbdominalEvolutionStage(abDef);

    // 8. Shop Buttons
    updateShopCardsState();

    // 9. Advice Quote
    updateAdviceDisplay();

    // 10. Certificates List
    renderCertificatesList();
  }

  function updateAbdominalEvolutionStage(abDef) {
    let tierIndex = 0;
    if (abDef <= 20) {
      tierIndex = 0;
    } else if (abDef > 20 && abDef <= 50) {
      tierIndex = 1;
    } else if (abDef > 50 && abDef <= 80) {
      tierIndex = 2;
    } else {
      tierIndex = 3;
    }

    // Active evolution stages in records
    els.rmSteps.forEach((step, idx) => {
      step.classList.remove('active', 'completed');
      if (idx === tierIndex) {
        step.classList.add('active');
      } else if (idx < tierIndex) {
        step.classList.add('completed');
      }
    });
  }

  function applyShopItemsToMountain() {
    // Add classes on parent zone to render gear visually
    els.mountainZone.classList.remove('has-backpack', 'has-iceaxe', 'has-oxygen');
    
    state.purchasedItems.forEach(itemId => {
      const itemConfig = SHOP_ITEMS[itemId];
      if (itemConfig && itemConfig.class) {
        els.mountainZone.classList.add(itemConfig.class);
      }
    });
  }

  function updateShopCardsState() {
    els.shopCards.forEach(card => {
      const itemId = card.getAttribute('data-item-id');
      const itemConfig = SHOP_ITEMS[itemId];
      
      if (state.purchasedItems.includes(itemId) && itemConfig.type === 'gear') {
        card.classList.add('purchased');
        const btn = card.querySelector('.buy-btn');
        btn.textContent = "装備中";
        btn.disabled = true;
      } else {
        card.classList.remove('purchased');
        const btn = card.querySelector('.buy-btn');
        if (itemConfig.type === 'food') {
          btn.textContent = itemId === 'protein' ? '食べる' : '飲む';
        } else {
          btn.textContent = '購入・装備';
        }
        btn.disabled = false;
      }
    });
  }

  function updateAdviceDisplay() {
    const idx = Math.floor((state.totalExercisesDone) % ADVICE_QUOTES.length);
    els.adviceQuote.textContent = ADVICE_QUOTES[idx];
  }

  // ==========================================
  // 5. PERIODIC WORK/BREAK TIMER SYSTEM
  // ==========================================

  function updateTimerCircle() {
    const totalSecs = state.timerIntervalMinutes * 60;
    const offset = 596.9 - (state.timerTimeRemaining / totalSecs) * 596.9;
    els.timerRingBar.style.strokeDashoffset = offset;
    
    const mins = Math.floor(state.timerTimeRemaining / 60);
    const secs = state.timerTimeRemaining % 60;
    els.timerCountdown.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function startTimer() {
    if (state.timerState === 'running') return;
    
    state.timerState = 'running';
    els.timerStartStopBtn.textContent = "タイマー一時停止";
    els.timerStartStopBtn.classList.remove('pulse-glow');
    els.appWrapper.classList.remove('silent-timer-alert');

    timerInterval = setInterval(() => {
      if (state.timerTimeRemaining > 0) {
        state.timerTimeRemaining--;
        updateTimerCircle();
      } else {
        completeWorkSegment();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (state.timerState !== 'running') return;
    
    state.timerState = 'paused';
    clearInterval(timerInterval);
    els.timerStartStopBtn.textContent = "タイマー再開";
    els.timerStartStopBtn.classList.add('pulse-glow');
  }

  function stopTimer() {
    state.timerState = 'stopped';
    clearInterval(timerInterval);
    state.timerTimeRemaining = state.timerIntervalMinutes * 60;
    els.timerStartStopBtn.textContent = "集中タイマースタート";
    els.timerStartStopBtn.classList.add('pulse-glow');
    els.appWrapper.classList.remove('silent-timer-alert');
    updateTimerCircle();
  }

  function completeWorkSegment() {
    clearInterval(timerInterval);
    state.timerState = 'stopped';
    
    // Visual Pulse Alarm Alert
    els.appWrapper.classList.add('silent-timer-alert');
    els.timerCountdown.textContent = "CLIMB!";
    els.timerModeTitle.textContent = "登頂の時間です！";
    els.timerStartStopBtn.textContent = "運動を開始してください";
    els.timerStartStopBtn.classList.add('pulse-glow');
    
    switchTab('exercise-tab');
    triggerWebNotification();
  }

  function triggerWebNotification() {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
      new Notification("DeskSummit: 登山の時間です！", {
        body: "座ったままお腹を引き締め、霊峰の頂きをさらに登り進めましょう！",
        silent: true
      });
    }
  }

  els.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      els.presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const mins = parseFloat(btn.getAttribute('data-time'));
      state.timerIntervalMinutes = mins;
      
      stopTimer();
      saveGameData();
    });
  });

  els.timerStartStopBtn.addEventListener('click', () => {
    if (state.timerState === 'running') {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  els.instantBreakBtn.addEventListener('click', () => {
    stopTimer();
    switchTab('exercise-tab');
  });

  // ==========================================
  // 6. EXERCISE RUNNER ENGINE
  // ==========================================

  function switchTab(tabId) {
    els.tabButtons.forEach(btn => {
      if (btn.getAttribute('data-target') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    els.tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === tabId) {
        content.classList.add('active');
      }
    });
  }

  els.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.activeExerciseId) return;
      
      const target = btn.getAttribute('data-target');
      switchTab(target);
    });
  });

  document.querySelectorAll('.exercise-card-item').forEach(card => {
    const startBtn = card.querySelector('.ex-start-btn');
    const exId = card.getAttribute('data-ex-id');
    
    startBtn.addEventListener('click', () => {
      startExerciseSession(exId);
    });
  });

  function startExerciseSession(exId) {
    const ex = EXERCISES[exId];
    if (!ex) return;

    els.appWrapper.classList.remove('silent-timer-alert');

    state.activeExerciseId = exId;
    state.exerciseTimeRemaining = ex.duration;
    state.exerciseTotalDuration = ex.duration;
    
    els.runExerciseTitle.textContent = ex.name;
    els.runExerciseDesc.textContent = ex.desc;
    
    switchTab('exercise-run-tab');
    
    updateExerciseRunTimerUI();
    runBreathingGuideTick();

    exerciseInterval = setInterval(() => {
      if (state.exerciseTimeRemaining > 0) {
        state.exerciseTimeRemaining--;
        updateExerciseRunTimerUI();
        runBreathingGuideTick();
      } else {
        completeExerciseSession();
      }
    }, 1000);
  }

  function updateExerciseRunTimerUI() {
    const mins = Math.floor(state.exerciseTimeRemaining / 60);
    const secs = state.exerciseTimeRemaining % 60;
    els.runTimerCountdown.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    const fillPercent = (state.exerciseTimeRemaining / state.exerciseTotalDuration) * 100;
    els.runProgressFill.style.width = fillPercent + "%";
  }

  function runBreathingGuideTick() {
    const ex = EXERCISES[state.activeExerciseId];
    const elapsed = state.exerciseTotalDuration - state.exerciseTimeRemaining;
    
    let patternTimeSum = 0;
    let currentPattern = ex.breathPattern[0];
    
    for (let p of ex.breathPattern) {
      patternTimeSum += p.duration;
      if (elapsed < patternTimeSum) {
        currentPattern = p;
        break;
      }
    }

    els.breathGuideText.textContent = currentPattern.phase;
    
    // Scale guide bubbles dynamically
    if (currentPattern.type === 'inhale') {
      els.breathGuideCircle.style.transform = 'scale(1.1)';
      els.breathGuideCircle.style.borderColor = 'rgba(59, 130, 246, 0.6)';
      els.breathGuideCircle.style.background = 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(59, 130, 246, 0.05) 70%, transparent 100%)';
    } else if (currentPattern.type === 'exhale') {
      els.breathGuideCircle.style.transform = 'scale(0.6)';
      els.breathGuideCircle.style.borderColor = 'rgba(236, 72, 153, 0.6)';
      els.breathGuideCircle.style.background = 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, rgba(236, 72, 153, 0.05) 70%, transparent 100%)';
    } else if (currentPattern.type === 'hold') {
      els.breathGuideCircle.style.transform = 'scale(0.9)';
      els.breathGuideCircle.style.borderColor = 'rgba(13, 148, 136, 0.6)';
      els.breathGuideCircle.style.background = 'radial-gradient(circle, rgba(13, 148, 136, 0.25) 0%, rgba(13, 148, 136, 0.05) 70%, transparent 100%)';
    }
  }

  function completeExerciseSession() {
    clearInterval(exerciseInterval);
    
    const ex = EXERCISES[state.activeExerciseId];
    state.activeExerciseId = null;

    // Multipliers from climbing gear
    let climbMult = 1.0;
    if (state.purchasedItems.includes('headband')) climbMult += 0.1; // +10% backpack
    if (state.purchasedItems.includes('dumbbells')) climbMult += 0.2; // +20% ice axe
    if (state.purchasedItems.includes('yogamat')) climbMult += 0.3; // +30% oxygen mask
    
    // Suppli multiplier boost (Active Vitamin)
    if (state.vitaminBoostActive) {
      climbMult *= 2.0;
      state.vitaminBoostActive = false; // consume it
    }

    // Climb elevation progress
    let metersClimbed = Math.round(ex.climb * climbMult);
    const activeMt = MOUNTAINS[state.activeMountainId];
    const prevHeight = state.mountainProgress[state.activeMountainId] || 0;
    const targetHeight = activeMt.height;
    
    // Add point rewards (points = 1/10th of meters climbed, very satisfying!)
    const ptsEarned = Math.round(ex.climb / 10);
    state.coins += ptsEarned;
    state.totalCoinsEarned += ptsEarned;
    
    // Check camp crossing triggers before applying new height
    const newHeight = Math.min(targetHeight, prevHeight + metersClimbed);
    state.mountainProgress[state.activeMountainId] = newHeight;

    // Check if summit completed for first time, to grant certificate!
    if (prevHeight < targetHeight && newHeight >= targetHeight) {
      const alreadyOwned = state.completedClimbs.some(c => c.mountainId === state.activeMountainId);
      if (!alreadyOwned) {
        state.completedClimbs.push({
          mountainId: state.activeMountainId,
          dateStr: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
          rank: state.level
        });
        saveGameData();
      }
    }

    state.totalExercisesDone += 1;
    state.totalCalories += ex.calories;
    
    // Ab core muscles strengthen
    state.coreLevel = parseFloat((state.coreLevel + 0.1).toFixed(1));
    
    // Fat rate drops
    state.fat = Math.max(6.0, parseFloat((state.fat - 0.2).toFixed(2)));

    // Mountaineer level up
    addEXP(ex.exp);
    
    // Trigger Camp arrival responses!
    checkForCampCheckpoints(prevHeight, newHeight, targetHeight);
    
    recordActivityCompletion();
    switchTab('timer-tab');
    stopTimer();

    // Visual star bursts
    triggerCanvasConfetti();
  }

  function checkForCampCheckpoints(prev, next, max) {
    const prevPct = prev / max;
    const nextPct = next / max;

    let triggerCamp = null;

    if (prevPct < 1.0 && nextPct >= 1.0) {
      triggerCamp = 'summit';
    } else if (prevPct < 0.75 && nextPct >= 0.75) {
      triggerCamp = 'c3';
    } else if (prevPct < 0.50 && nextPct >= 0.50) {
      triggerCamp = 'c2';
    } else if (prevPct < 0.25 && nextPct >= 0.25) {
      triggerCamp = 'c1';
    }

    if (triggerCamp) {
      const messages = GUIDE_MESSAGES[triggerCamp];
      const selectedMsg = messages[Math.floor(Math.random() * messages.length)];
      
      els.guideBalloon.textContent = selectedMsg;
      els.guideBalloon.classList.add('pop-balloon');
      
      // Slide tent balloon down after 8 seconds
      setTimeout(() => {
        els.guideBalloon.classList.remove('pop-balloon');
      }, 9500);
    }
  }

  function cancelActiveExercise() {
    clearInterval(exerciseInterval);
    state.activeExerciseId = null;
    switchTab('exercise-tab');
    stopTimer();
  }

  if (els.runCancelBtn) els.runCancelBtn.addEventListener('click', cancelActiveExercise);
  if (els.runCompleteBtn) {
    els.runCompleteBtn.addEventListener('click', completeExerciseSession);
  }

  function addEXP(amt) {
    state.exp += amt;
    let maxExp = state.level * 100;
    
    while (state.exp >= maxExp) {
      state.exp -= maxExp;
      state.level += 1;
      maxExp = state.level * 100;
      
      // Mountaineer Rank Level Up Flash
      triggerLevelUpVisualEffect();
    }
  }

  function triggerLevelUpVisualEffect() {
    els.hikerPin.classList.remove('squish-bounce');
    void els.hikerPin.offsetWidth;
    els.hikerPin.classList.add('squish-bounce');
    
    els.guideBalloon.textContent = "登山家ランクがアップしました！🧗✨";
    els.guideBalloon.classList.add('pop-balloon');
    
    setTimeout(() => {
      els.guideBalloon.classList.remove('pop-balloon');
    }, 3500);
  }

  // ==========================================
  // 7. MOUNTAIN SELECTION DYNAMICS
  // ==========================================

  if (els.mountainSelect) {
    els.mountainSelect.addEventListener('change', (e) => {
      state.activeMountainId = e.target.value;
      
      // Show supportive welcome message from guide about the selected peak
      const selectedMt = MOUNTAINS[state.activeMountainId];
      if (els.guideBalloon) {
        els.guideBalloon.textContent = `${selectedMt.name}（標高${selectedMt.height}m）への挑戦ですね！${selectedMt.desc} 安全第一で一歩一歩いきましょう。`;
        els.guideBalloon.classList.add('pop-balloon');
        
        setTimeout(() => {
          els.guideBalloon.classList.remove('pop-balloon');
        }, 7000);
      }

      saveGameData();
      updateUI();
    });
  }

  // ==========================================
  // 8. INTERACTIVE SHOP LOGIC
  // ==========================================

  els.buyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.shop-card');
      const itemId = card.getAttribute('data-item-id');
      const itemConfig = SHOP_ITEMS[itemId];

      if (state.coins < itemConfig.cost) {
        // Can't afford visual shake
        card.classList.add('insufficient-funds');
        setTimeout(() => card.classList.remove('insufficient-funds'), 500);
        
        els.guideBalloon.textContent = "クライムポイント(pts)が不足しています。運動をクリアして稼ぎましょう！";
        els.guideBalloon.classList.add('pop-balloon');
        setTimeout(() => els.guideBalloon.classList.remove('pop-balloon'), 3000);
        return;
      }

      // Deduct ClimbPoints
      state.coins -= itemConfig.cost;

      if (itemConfig.type === 'food') {
        // Consumables consumed instantly
        if (itemId === 'protein') {
          // Energy Bar: +500m instant height climbing!
          const activeMt = MOUNTAINS[state.activeMountainId];
          const prevHeight = state.mountainProgress[state.activeMountainId] || 0;
          const targetHeight = activeMt.height;
          const newHeight = Math.min(targetHeight, prevHeight + 500);
          
          state.mountainProgress[state.activeMountainId] = newHeight;
          els.guideBalloon.textContent = "エネルギーバーを補給！体力が回復し、一気に高度が **+500m** 進みました！🔋";
          els.guideBalloon.classList.add('pop-balloon');
          
          checkForCampCheckpoints(prevHeight, newHeight, targetHeight);
          
        } else if (itemId === 'salad') {
          // Vitamin Suppli: Next exercise gives x2 height meters!
          state.vitaminBoostActive = true;
          els.guideBalloon.textContent = "ビタミンサプリを摂取！高度障害が防止され、**次の運動で獲得できる標高(m)が2倍**になります！🧪";
          els.guideBalloon.classList.add('pop-balloon');
        }
        
        setTimeout(() => {
          els.guideBalloon.classList.remove('pop-balloon');
        }, 5500);

      } else if (itemConfig.type === 'gear') {
        // Permanent mountaineering equipment
        state.purchasedItems.push(itemId);
        applyShopItemsToMountain();

        els.guideBalloon.textContent = `プロ仕様ギア「${itemConfig.name}」を装備しました！今後の登山効率がアップします！🎒⛏️`;
        els.guideBalloon.classList.add('pop-balloon');
        setTimeout(() => els.guideBalloon.classList.remove('pop-balloon'), 4000);
      }

      saveGameData();
      updateUI();
      triggerCanvasConfetti(40); // small celebratory particle burst
    });
  });

  // ==========================================
  // 9. GUIDE INTERACTIVE BALOONS
  // ==========================================

  function pokeGuide() {
    if (state.activeExerciseId) return;

    // Draw active mountain heightspct
    const activeMt = MOUNTAINS[state.activeMountainId];
    const currentHeight = state.mountainProgress[state.activeMountainId] || 0;
    const pct = currentHeight / activeMt.height;

    // Pick dynamic message based on camp range
    let campId = 'bc';
    if (pct >= 1.0) campId = 'summit';
    else if (pct >= 0.75) campId = 'c3';
    else if (pct >= 0.50) campId = 'c2';
    else if (pct >= 0.25) campId = 'c1';

    const messages = GUIDE_MESSAGES[campId];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    
    els.guideBalloon.textContent = msg;
    els.guideBalloon.classList.add('pop-balloon');

    // Bounce Pin climber
    els.hikerPin.classList.remove('squish-bounce');
    void els.hikerPin.offsetWidth;
    els.hikerPin.classList.add('squish-bounce');

    setTimeout(() => {
      els.guideBalloon.classList.remove('pop-balloon');
    }, 7000);
  }

  if (els.pokeBtn) els.pokeBtn.addEventListener('click', pokeGuide);
  if (els.mountainZone) els.mountainZone.addEventListener('click', pokeGuide);

  // ==========================================
  // 10. SILENT STAR BURST REWARD ENGINE
  // ==========================================

  function resizeCanvas() {
    els.canvas.width = window.innerWidth;
    els.canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function triggerCanvasConfetti(count = 120) {
    const colors = [
      '#2dd4bf', // cyan teal
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // gold/yellow
      '#f43f5e'  // pink
    ];
    
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.75) * 15 - 5,
        radius: Math.random() * 4 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        decay: Math.random() * 0.015 + 0.008,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        type: Math.random() > 0.45 ? 'star' : 'confetti' // Custom stars for mountain summit feeling!
      });
    }

    if (!animationFrameId) {
      updateParticles();
    }
  }

  function updateParticles() {
    ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
    
    // If in Death Zone, spawn gentle drifting snowflakes continuously!
    if (state.isDeathZone) {
      const snowCount = particles.filter(p => p.type === 'snow').length;
      if (snowCount < 30 && Math.random() > 0.4) {
        particles.push({
          x: Math.random() * els.canvas.width,
          y: -10,
          vx: (Math.random() - 0.75) * 1.5 - 0.3, // slight drift to left
          vy: Math.random() * 1.0 + 0.6, // gentle descent speed
          radius: Math.random() * 2 + 1,
          color: '#ffffff',
          opacity: Math.random() * 0.4 + 0.5,
          decay: 0, // don't decay until off-screen
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          type: 'snow'
        });
      }
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      
      if (p.type === 'snow') {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        
        // Remove off-screen snow
        if (p.y > els.canvas.height || p.x < -10 || p.x > els.canvas.width + 10) {
          particles.splice(i, 1);
          continue;
        }
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.42;
        p.vx *= 0.985;
        p.opacity -= p.decay;
        p.rotation += p.rotationSpeed;
        
        if (p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }
      }

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'snow') {
        // Draw white blurry snowflake
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'star') {
        // Draw elegant glowing star shape
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          ctx.lineTo(Math.cos((18 + j * 72) * Math.PI / 180) * p.radius, -Math.sin((18 + j * 72) * Math.PI / 180) * p.radius);
          ctx.lineTo(Math.cos((54 + j * 72) * Math.PI / 180) * (p.radius / 2.2), -Math.sin((54 + j * 72) * Math.PI / 180) * (p.radius / 2.2));
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.radius, -p.radius, p.radius * 1.8, p.radius * 1.0);
      }
      
      ctx.restore();
    }

    if (particles.length > 0 || state.isDeathZone) {
      animationFrameId = requestAnimationFrame(updateParticles);
    } else {
      animationFrameId = null;
    }
  }

  // ==========================================
  // 10.5 PREMIUM HELPER FUNCTIONS
  // ==========================================

  function updateSkyTimeOfDay() {
    const hr = new Date().getHours();
    let skyClass = 'sky-day';
    
    // Workday friendly compressed time scale (9:00 - 18:00+)
    if (hr >= 9 && hr < 11) {
      skyClass = 'sky-morning'; // 9:00 - 11:00 Morning Sunrise
    } else if (hr >= 11 && hr < 14) {
      skyClass = 'sky-day';     // 11:00 - 14:00 Bright Day
    } else if (hr >= 14 && hr < 16) {
      skyClass = 'sky-sunset';  // 14:00 - 16:00 Sunset
    } else {
      skyClass = 'sky-night';   // 16:00 onwards - Starry Night
    }
    
    els.mountainZone.classList.remove('sky-morning', 'sky-day', 'sky-sunset', 'sky-night');
    els.mountainZone.classList.add(skyClass);
  }

  function checkDeathZone() {
    const activeMt = MOUNTAINS[state.activeMountainId];
    const currentHeight = state.mountainProgress[state.activeMountainId] || 0;
    
    // Death Zone when 8000m peaks and climber height is >= 8000m
    if (activeMt.height >= 8000 && currentHeight >= 8000) {
      if (!state.isDeathZone) {
        state.isDeathZone = true;
        if (!animationFrameId) {
          updateParticles();
        }
      }
    } else {
      state.isDeathZone = false;
    }
  }

  function renderCertificatesList() {
    const container = document.getElementById('certificates-container');
    if (!container) return;
    
    if (!state.completedClimbs || state.completedClimbs.length === 0) {
      container.innerHTML = `<p class="no-certs-text" style="font-size: 0.72rem; color: hsl(var(--color-text-secondary)); text-align: center; padding: 12px; border: 1px dashed rgba(255,255,255,0.06); border-radius: 8px; grid-column: 1 / -1;">まだ登頂証明書はありません。山頂を目指して最初のアタックを開始しましょう！</p>`;
      return;
    }
    
    container.innerHTML = '';
    state.completedClimbs.forEach(cert => {
      const mt = MOUNTAINS[cert.mountainId];
      if (!mt) return;
      
      const card = document.createElement('div');
      card.className = 'cert-item-card';
      card.setAttribute('data-mt-id', cert.mountainId);
      card.innerHTML = `
        <div class="cert-item-info">
          <h5>${mt.name} 登頂</h5>
          <span>登頂日: ${cert.dateStr}</span>
        </div>
        <div class="cert-item-badge">🏅</div>
      `;
      
      card.addEventListener('click', () => {
        openCertificateModal(cert);
      });
      
      container.appendChild(card);
    });
  }

  function openCertificateModal(cert) {
    const modal = document.getElementById('cert-modal');
    const mt = MOUNTAINS[cert.mountainId];
    if (!modal || !mt) return;
    
    document.getElementById('cert-rank-val').textContent = cert.rank;
    document.getElementById('cert-mountain-name').textContent = `${mt.name} (${mt.height}m)`;
    document.getElementById('cert-date-val').textContent = cert.dateStr;
    
    modal.classList.add('active');
  }

  // ==========================================
  // 11. WIDGET MODE TOGGLER SYSTEM
  // ==========================================

  let isWidgetMode = false;
  
  if (els.toggleWidgetBtn) {
    els.toggleWidgetBtn.addEventListener('click', () => {
      isWidgetMode = !isWidgetMode;
      
      if (isWidgetMode) {
        els.appWrapper.classList.remove('dashboard-layout');
        els.appWrapper.classList.add('widget-layout');
        
        const iconWidget = els.toggleWidgetBtn.querySelector('.icon-widget');
        const iconDashboard = els.toggleWidgetBtn.querySelector('.icon-dashboard');
        const btnText = els.toggleWidgetBtn.querySelector('.btn-text');
        
        if (iconWidget) iconWidget.style.display = 'none';
        if (iconDashboard) iconDashboard.style.display = 'block';
        if (btnText) btnText.textContent = "通常表示";
        els.toggleWidgetBtn.setAttribute('title', '通常モードに切替');
        
        switchTab('timer-tab');
      } else {
        els.appWrapper.classList.remove('widget-layout');
        els.appWrapper.classList.add('dashboard-layout');
        
        const iconWidget = els.toggleWidgetBtn.querySelector('.icon-widget');
        const iconDashboard = els.toggleWidgetBtn.querySelector('.icon-dashboard');
        const btnText = els.toggleWidgetBtn.querySelector('.btn-text');
        
        if (iconWidget) iconWidget.style.display = 'block';
        if (iconDashboard) iconDashboard.style.display = 'none';
        if (btnText) btnText.textContent = "ウィジェット";
        els.toggleWidgetBtn.setAttribute('title', 'ウィジェットモードに切替');
      }
    });
  }

  // ==========================================
  // 12. DATA RESET LOGIC
  // ==========================================

  if (els.resetSaveBtn) {
    els.resetSaveBtn.addEventListener('click', () => {
      if (confirm("これまでの偉大な登山記録、レベル、獲得ギアをすべてリセットし、ベースキャンプから再スタートしますか？")) {
        localStorage.removeItem('DeskSummit_SaveData');
        
        state.activeMountainId = 'kailash';
        state.mountainProgress = {
          kailash: 0, kawagarbo: 0, machapuchare: 0, nangaparbat: 0, kangchenjunga: 0, everest: 0
        };
        state.coins = 0;
        state.level = 1;
        state.exp = 0;
        state.fat = 25.0;
        state.coreLevel = 1;
        state.streak = 0;
        state.lastActiveDate = null;
        state.purchasedItems = [];
        state.completedClimbs = [];
        state.totalExercisesDone = 0;
        state.totalCoinsEarned = 0;
        state.totalCalories = 0;
        state.timerIntervalMinutes = 30;
        state.timerTimeRemaining = 1800;
        
        if (els.mountainSelect) els.mountainSelect.value = 'kailash';
        
        stopTimer();
        verifyStreak();
        applyShopItemsToMountain();
        updateUI();
        switchTab('timer-tab');
        
        if (els.guideBalloon) {
          els.guideBalloon.textContent = "登山記録のリセットが完了しました。新たな頂を目指し出発しましょう！🏔️✨";
          els.guideBalloon.classList.add('pop-balloon');
          setTimeout(() => els.guideBalloon.classList.remove('pop-balloon'), 4000);
        }
      }
    });
  }

  // ==========================================
  // 12.5 SAVE DATA EXPORT & IMPORT (同期機能)
  // ==========================================

  if (els.exportSaveBtn) {
    els.exportSaveBtn.addEventListener('click', () => {
      try {
        const saveData = {
          activeMountainId: state.activeMountainId,
          mountainProgress: state.mountainProgress,
          coins: state.coins,
          level: state.level,
          exp: state.exp,
          fat: state.fat,
          coreLevel: state.coreLevel,
          streak: state.streak,
          lastActiveDate: state.lastActiveDate,
          purchasedItems: state.purchasedItems,
          totalExercisesDone: state.totalExercisesDone,
          totalCoinsEarned: state.totalCoinsEarned,
          totalCalories: state.totalCalories,
          timerIntervalMinutes: state.timerIntervalMinutes,
          completedClimbs: state.completedClimbs
        };

        // Base64 encode
        const jsonStr = JSON.stringify(saveData);
        const code = btoa(unescape(encodeURIComponent(jsonStr)));
        
        if (els.transferCodeArea) {
          els.transferCodeArea.value = code;
          els.transferCodeArea.select();
        }
        
        navigator.clipboard.writeText(code).then(() => {
          if (els.guideBalloon) els.guideBalloon.textContent = "引き継ぎコードを書き出し、クリップボードにコピーしました！スマホや別PCに貼り付けてください。🧗📋";
        }).catch(() => {
          if (els.guideBalloon) els.guideBalloon.textContent = "引き継ぎコードを書き出しました！下の枠内の文字をすべてコピーしてご使用ください。📝";
        });
        
        if (els.guideBalloon) {
          els.guideBalloon.classList.add('pop-balloon');
          setTimeout(() => els.guideBalloon.classList.remove('pop-balloon'), 6000);
        }
        
      } catch(e) {
        console.error(e);
        alert("コードの書き出しに失敗しました。");
      }
    });
  }

  if (els.importSaveBtn) {
    els.importSaveBtn.addEventListener('click', () => {
      const code = els.transferCodeArea ? els.transferCodeArea.value.trim() : '';
      if (!code) {
        alert("引き継ぎコードを入力欄に貼り付けてから実行してください。");
        return;
      }
      
      try {
        const jsonStr = decodeURIComponent(escape(atob(code)));
        const parsed = JSON.parse(jsonStr);
        
        if (!parsed.mountainProgress || typeof parsed.coins !== 'number' || typeof parsed.level !== 'number') {
          throw new Error("Invalid save format");
        }
        
        if (confirm("引き継ぎコードを読み込みますか？現在のセーブデータは上書きされます。")) {
          state.activeMountainId = parsed.activeMountainId || 'kailash';
          state.mountainProgress = parsed.mountainProgress;
          state.coins = parsed.coins;
          state.level = parsed.level;
          state.exp = parsed.exp || 0;
          state.fat = typeof parsed.fat === 'number' ? parsed.fat : 25.0;
          state.coreLevel = parsed.coreLevel || 1;
          state.streak = parsed.streak || 0;
          state.lastActiveDate = parsed.lastActiveDate || null;
          state.purchasedItems = parsed.purchasedItems || [];
          state.totalExercisesDone = parsed.totalExercisesDone || 0;
          state.totalCoinsEarned = parsed.totalCoinsEarned || 0;
          state.totalCalories = parsed.totalCalories || 0;
          state.timerIntervalMinutes = parsed.timerIntervalMinutes || 30;
          state.completedClimbs = parsed.completedClimbs || [];
          
          saveGameData();
          loadSavedData();
          
          if (els.mountainSelect) els.mountainSelect.value = state.activeMountainId;
          
          if (els.guideBalloon) {
            els.guideBalloon.textContent = "引き継ぎコードの読み込みに成功しました！登山の続きを開始しましょう！🎒✨";
            els.guideBalloon.classList.add('pop-balloon');
            setTimeout(() => els.guideBalloon.classList.remove('pop-balloon'), 5000);
          }
          
          if (els.transferCodeArea) els.transferCodeArea.value = '';
          triggerCanvasConfetti(80);
        }
        
      } catch(e) {
        console.error(e);
        if (els.guideBalloon) {
          els.guideBalloon.textContent = "無効な引き継ぎコードです。コピーした文字列が正しいか確認してください！⚠️";
          els.guideBalloon.classList.add('pop-balloon');
          setTimeout(() => els.guideBalloon.classList.remove('pop-balloon'), 4500);
        }
      }
    });
  }

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  // Bind modal closing clicks
  const certModal = document.getElementById('cert-modal');
  const certCloseBtn = document.getElementById('cert-close-btn');
  if (certModal && certCloseBtn) {
    certCloseBtn.addEventListener('click', () => {
      certModal.classList.remove('active');
    });
    certModal.addEventListener('click', (e) => {
      if (e.target === certModal) {
        certModal.classList.remove('active');
      }
    });
  }

  // ==========================================
  // 13. LAUNCH GAME & CUSTOM ENHANCEMENTS
  // ==========================================
  
  // Bind events to exercise card buttons
  document.querySelectorAll('.exercise-card-item').forEach(card => {
    const startBtn = card.querySelector('.ex-start-btn');
    const directBtn = card.querySelector('.ex-direct-btn');
    const exId = card.getAttribute('data-ex-id');
    
    if (startBtn && exId) {
      startBtn.textContent = startBtn.textContent.replace('スタート', 'タイマー開始');
      startBtn.addEventListener('click', () => {
        startExerciseSession(exId);
      });
    }
    
    if (directBtn && exId) {
      directBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeExerciseId = exId;
        completeExerciseSession();
        
        // Show supportive direct completion message
        if (els.guideBalloon) {
          els.guideBalloon.textContent = `「${EXERCISES[exId].name}」を完了として直接記録しました！素晴らしい体幹アプローチです！🧗✨`;
          els.guideBalloon.classList.add('pop-balloon');
          setTimeout(() => els.guideBalloon.classList.remove('pop-balloon'), 5500);
        }
      });
    }
  });

  loadSavedData();
  updateTimerCircle();

});
