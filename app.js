/**
 * ==========================================================================
 * MenuHarmony - Core Application Logic (3-Options & Interactive Recipe Accordion)
 * Pure ES6 JavaScript (No Build Tools, Browser Native, Normal Script Compatible)
 * ==========================================================================
 */

// 安全な JSON.parse ヘルパー
function safeJsonParse(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return fallback;
        const parsed = JSON.parse(item);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (e) {
        console.error(`LocalStorageパースエラー (キー: "${key}"):`, e);
        return fallback;
    }
}

// HTMLエスケープヘルパー (XSS対策)
function escapeHtml(str) {
    if (typeof str !== 'string') return str === undefined || str === null ? '' : String(str);
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

// タイムゾーンのズレを防ぐローカル日付パース (タイムゾーンバグ対策)
function parseLocalDate(dateStr) {
    if (typeof dateStr !== 'string') return new Date(dateStr);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return new Date(y, m, d);
        }
    }
    return new Date(dateStr);
}

// LocalStorage容量オーバー対策
function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn('LocalStorage容量制限に達しました。古いAI提案キャッシュをクリアして再試行します。');
            clearAllAiCaches();
            try {
                localStorage.setItem(key, value);
            } catch (retryError) {
                console.error('キャッシュクリア後もLocalStorageの保存に失敗しました:', retryError);
                alert('保存領域がいっぱいです。不要なお気に入りを削除するなどの対応を行ってください。');
            }
        } else {
            console.error('LocalStorage保存中にエラーが発生しました:', e);
        }
    }
}

// すべてのキャッシュ（アドバイス、レシピ）をクリアするヘルパー
function clearAllAiCaches() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('menuharmony_suggest_') || key.startsWith('menuharmony_recipes_'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
}

// 表示月ラベル更新ヘルパー
function updateMonthLabel() {
    const label = document.getElementById('current-month-label');
    if (label) {
        const year = STATE.currentDate.getFullYear();
        const month = STATE.currentDate.getMonth();
        label.textContent = `${year}年 ${month + 1}月`;
    }
}

// --------------------------------------------------------------------------
// 1. APPLICATION STATE & CONSTANTS
// --------------------------------------------------------------------------
const STATE = {
    currentDate: new Date(), // 現在表示中の年月の基準日
    apiKey: localStorage.getItem('gemini_api_key') || '',
    advisorCharacter: localStorage.getItem('gemini_advisor_character') || 'remi',
    nurseryMenu: safeJsonParse('menuharmony_nursery_menu', {}),
    schoolMenu: safeJsonParse('menuharmony_school_menu', {}),
    selectedDateStr: '', // 現在詳細シートで選択中の日付 (YYYY-MM-DD)
    activeUploadTarget: 'nursery', // 'nursery' または 'school'
    activeTab: 'calendar', // 'calendar' または 'shopping'
    proposedDinners: safeJsonParse('menuharmony_proposed_dinners', {}), // 月全体で最適化計算された夕食提案データ (キー: YYYY-MM-DD)
    selectedUploadFile: null, // アップロード用に選択された画像ファイル (OCR動作用に確実に追跡)
    favoriteRecipes: safeJsonParse('menuharmony_favorites', {}) // お気に入りレシピコレクション
};

// --------------------------------------------------------------------------
// 2. DEMO DATA GENERATION
// --------------------------------------------------------------------------
const DEMO_NURSERY_MENU = {
    "2026-05-01": "ミートボール、マカロニサラダ、かぼちゃスープ",
    "2026-05-04": "チキンカレーライス、福神漬け、フルーツポンチ",
    "2026-05-05": "お休み（こどもの日）",
    "2026-05-06": "焼き魚（鮭）、ほうれん草のひたし、味噌汁",
    "2026-05-07": "五目うどん、ちくわの磯辺揚げ、みかん",
    "2026-05-08": "豚肉の生姜焼き、ポテトサラダ、中華スープ",
    "2026-05-11": "オムライス、ブロッコリーのソテー、コーンポタージュ",
    "2026-05-12": "麻婆豆腐、ワンタンスープ、杏仁豆腐",
    "2026-05-13": "鯖の塩焼き、きんぴらごぼう、すまし汁",
    "2026-05-14": "スパゲティミートソース、キャベツのサラダ、バナナ",
    "2026-05-15": "チキン南蛮、コーンサラダ、わかめスープ",
    "2026-05-18": "ハンバーグ、フライドポテト、コンソメスープ",
    "2026-05-19": "ビビンバ丼、トックスープ、ミニゼリー",
    "2026-05-20": "タラの唐揚げ、切り干し大根の煮物、味噌汁",
    "2026-05-21": "親子丼、キャベツの和え物、すまし汁",
    "2026-05-22": "ナポリタン、コーンスープ、リンゴ",
    "2026-05-25": "キーマカレー、ナン、コールスローサラダ",
    "2026-05-26": "照り焼きチキン、マカロニグラタン、スープ",
    "2026-05-27": "八宝菜、中華風コーンスープ、みかん",
    "2026-05-28": "きつねうどん、さつまいもの天ぷら、ゼリー",
    "2026-05-29": "餃子、もやしのナムル、中華スープ"
};

const DEMO_SCHOOL_MENU = {
    "2026-05-01": "チキンナゲット、コーンピラフ、ミネストローネ",
    "2026-05-04": "ポークカレー、春雨サラダ、牛乳",
    "2026-05-05": "お休み（こどもの日）",
    "2026-05-06": "ハヤシライス、グリーンサラダ、リンゴゼリー",
    "2026-05-07": "味噌ラーメン、小籠包、ナムル",
    "2026-05-08": "鮭のフライ、タルタルソース、豚汁、ご飯",
    "2026-05-11": "ポークソテー、ポテトサラダ、たまごスープ、パン",
    "2026-05-12": "和風おろしハンバーグ、磯和え、味噌汁、ご飯",
    "2026-05-13": "きつねうどん、じゃがい目の煮物、牛乳",
    "2026-05-14": "回鍋肉、えびワンタンスープ、ご飯",
    "2026-05-15": "チキンカツ、ボイルキャベツ、コンソメスープ、黒糖パン",
    "2026-05-18": "カツカレー、福神漬け、フルーツヨーグルト",
    "2026-05-19": "サバの味噌煮、ひじきの煮物、味噌汁、ご飯",
    "2026-05-20": "スパゲティナポリタン、プレーンオムレツ、スープ",
    "2026-05-21": "油淋鶏（ユーリンチー）、中華スープ、杏仁豆腐",
    "2026-05-22": "白身魚のフライ、マカロニサラダ、ミネストローネ、パン",
    "2026-05-25": "牛丼、冷奴、かきたま汁",
    "2026-05-26": "チキンカレー、海藻サラダ、ヨーグルト",
    "2026-05-27": "焼き餃子、麻婆ナス、中華卵スープ、ご飯",
    "2026-05-28": "ビビンバ、わかめスープ、フライドポテト",
    "2026-05-29": "ハンバーグステーキ、温野菜、味噌汁、ご飯"
};

// キャラクター設定メタデータ
const CHARACTERS = {
    remi: {
        name: '平野レミさん風',
        avatar: '🍳',
        desc: 'ハイテンション＆時短アイデア！',
        prompt: `あなたは「平野レミ」の口調と人格を再現したAI夕食アドバイザーです。
以下のルールに従って、ユーザーに元気で明るい夕食アドバイスをしてください。

1. テンションはMAX！「ダダダッと」「ドカンと」「あっという間！」などの勢いのある表現を多用してください。
2. 「美味しいから大丈夫！」「心配ないわよ！」とユーザーを元気づけてください。語尾は「〜ね！」「〜よ！」「〜じゃない！」が多くなります。
3. 今夜提案されている3つの夕食メニューについて、「どれを選んでもダダダッと作れてハッピーよ！メニューをタップすると、私の特製レシピを教えてあげるから、好きなのを選んでドカンと作りなさい！」と明るく促してください。
4. お昼の給食メニューについての言及は極小化（「昼もしっかり食べてえらい！」の一言程度）にし、今夜のおすすめ夕食メニューを主役に熱く語ってください。
5. 旬の食材にこだわりすぎず、「冷蔵庫の残り野菜で十分美味しいのよ！」と伝えるのが最も重要です。
6. メタ解説は省き、150〜200文字程度のスッキリとした短い文章で話してください。`
    },
    doi: {
        name: '土井善晴さん風',
        avatar: '🥢',
        desc: '一汁一菜、温かい関西弁で肯定',
        prompt: `あなたは「土井善晴」の口調と和食への哲学を再現したAI夕食アドバイザーです。
以下のルールに従って、穏やかで心温まる関西弁で夕食アドバイスをしてください。

1. 非常に穏やかで丁寧な関西弁（「〜ですねぇ」「〜はります」「〜ええんですよ」）でお話ししてください。
2. 「一汁一菜」の精神を重んじ、「無理せんでええんです。お味噌汁に具をいっぱい入れれば、立派なごちそうなんですよ」と優しく語りかけてください。
3. 今夜提案されている3つの夕食メニューについて、「どれを作ってもホッとする優しいお味になります。メニューをタップしていただければ、私から簡単な作り方やコツをお話しします。冷蔵庫にあるいつものお野菜で十分。どれか一つササッと作れば、それでええんですよ」と優しく肯定してください。
4. お昼の給食メニューについての言及は極小化し、今夜提案されている夕食メニューを主役にして優しく語りかけてください。
5. 150〜200文字程度のスッキリとした短い文章で話してください。`
    },
    goro: {
        name: '井之頭吾郎風',
        avatar: '💼',
        desc: '孤独のグルメ風、自分の胃袋と対話',
        prompt: `あなたはドラマ『孤独のグルメ』の主人公「井之頭吾郎」の人格とモノローグを再現したAI夕食アドバイザーです。
以下のルールに従って、渋く、心の中の独り言（モノローグ）形式で夕食のアドバイスをしてください。

1. 語り口はハードボイルドで冷静、しかし食に対しては極めて情熱的です。「うーむ…」「ほう…」「よし、これだ」「焦るんじゃない、俺は腹が減っているんだ」などの名台詞を織り交ぜてください。
2. 他人へのアドバイスというよりは、自分自身の胃袋に問いかけるモノローグ形式で記述してください。
3. 今夜提案されている3つの夕食メニュー候補について、「このメイン食材があれば、どれを選んでも間違いなく白飯の最高の相棒だ。メニューをタップすると、俺の胃袋が求める簡単レシピが浮かんでくる。どれにするか、俺の胃袋とじっくり対話して決めよう」と、夕食メニューを主役にして記述してください。
4. お昼の給食についてのクドクドとした説明は不要です。今夜の夕食メニューにフォーカスしてください。
5. 150〜200文字程度のスッキリとした短い文章で記述してください。`
    }
};

// --------------------------------------------------------------------------
// 3. MEAL OVERLAP DETECTION ALGORITHM
// --------------------------------------------------------------------------

// 類似メニュー判定用のキーワード辞書（名寄せ用）
const MENU_KEYWORDS = {
    curry: ['カレー', 'かれー', 'curry'],
    stew: ['シチュー', 'しちゅー', 'ハヤシ', 'ハッシュドビーフ'],
    noodle_udon: ['うどん', 'ウドン', 'ラーメン', 'らーめん', '蕎麦', 'そば', 'ソバ', '麺'],
    noodle_pasta: ['スパゲティ', 'パスタ', 'マカロニ', 'ナポリタン', 'ミートソース'],
    hamburg: ['ハンバーグ', 'つくね', 'ミートボール', 'ハンバーグステーキ'],
    fried_chicken: ['唐揚げ', 'からあげ', 'チキンカツ', '竜田揚げ', 'フライドチキン', 'チキン南蛮'],
    pork_ginger_saute: ['生姜焼き', 'しょうが焼き', 'ポークソテー', '豚肉の生姜焼', '豚肉の生姜焼き'],
    rice_bowl: ['丼', 'どんぶり', 'ビビンバ', 'ピラフ', 'オムライス', 'チャーハン', '炒飯'],
    fish: ['魚', 'さば', 'サバ', '鮭', 'さけ', 'タラ', 'たら', 'アジ', 'あじ', 'いわし', 'イワシ', '塩焼き', '味噌煮'],
    soup: ['汁', 'スープ', 'ポタージュ', 'ミネストローネ', '豚汁', 'ワンタン']
};

/**
 * 2つのメニュー文字列に被り・類似性があるかを判定する
 */
function checkMenuOverlap(menuA, menuB) {
    if (!menuA || !menuB) return null;

    const cleanA = menuA.toLowerCase();
    const cleanB = menuB.toLowerCase();

    const itemsA = cleanA.split(/[,、\s]+/).filter(Boolean);
    const itemsB = cleanB.split(/[,、\s]+/).filter(Boolean);

    for (const itemA of itemsA) {
        for (const itemB of itemsB) {
            const minLen = Math.min(itemA.length, itemB.length);
            if (minLen >= 2) {
                if (itemA.includes(itemB) || itemB.includes(itemA)) {
                    return { type: 'exact', match: `${itemA} ≒ ${itemB}` };
                }
            }
        }
    }

    for (const [category, keywords] of Object.entries(MENU_KEYWORDS)) {
        const matchesA = keywords.some(keyword => cleanA.includes(keyword));
        const matchesB = keywords.some(keyword => cleanB.includes(keyword));

        if (matchesA && matchesB) {
            if (category === 'soup') continue;
            
            let categoryName = '類似メニュー';
            if (category === 'curry') categoryName = 'カレー系';
            if (category === 'stew') categoryName = 'シチュー・ハヤシ系';
            if (category === 'noodle_udon') categoryName = '麺類';
            if (category === 'noodle_pasta') categoryName = 'パスタ系';
            if (category === 'hamburg') categoryName = 'ひき肉・ハンバーグ系';
            if (category === 'fried_chicken') categoryName = '揚げ鶏・カツ系';
            if (category === 'pork_ginger_saute') categoryName = '生姜焼き・ポークソテー系';
            if (category === 'rice_bowl') categoryName = 'ご飯もの・丼物';
            if (category === 'fish') categoryName = '魚料理';

            return { type: 'category', match: categoryName };
        }
    }

    return null;
}

/**
 * 特定の日付に対して、前後14日間（2週間）の献立被り・接近被りをスキャンする
 */
function scanDateForOverlaps(targetDateStr) {
    const alerts = [];
    const targetDate = parseLocalDate(targetDateStr);

    const nurseryOnTarget = STATE.nurseryMenu[targetDateStr];
    const schoolOnTarget = STATE.schoolMenu[targetDateStr];

    try {
        if (nurseryOnTarget && schoolOnTarget) {
            const overlap = checkMenuOverlap(nurseryOnTarget, schoolOnTarget);
            if (overlap) {
                alerts.push({
                    dayOffset: 0,
                    type: 'today_overlap',
                    message: `当日給食重複！ (${overlap.match})`,
                    severity: 'danger'
                });
            }
        }

        for (let offset = -14; offset <= 14; offset++) {
            if (offset === 0) continue;

            const scanDate = new Date(targetDate);
            scanDate.setDate(targetDate.getDate() + offset);
            const scanDateStr = formatDateStr(scanDate);

            const label = offset < 0 ? `${Math.abs(offset)}日前` : `${offset}日後`;

            if (nurseryOnTarget) {
                const otherNursery = STATE.nurseryMenu[scanDateStr];
                if (otherNursery) {
                    const overlap = checkMenuOverlap(nurseryOnTarget, otherNursery);
                    if (overlap) {
                        alerts.push({
                            dayOffset: offset,
                            type: 'nursery_nursery',
                            message: `${label}の園給食と重複: ${overlap.match}`,
                            severity: 'warning'
                        });
                    }
                }
                const otherSchool = STATE.schoolMenu[scanDateStr];
                if (otherSchool) {
                    const overlap = checkMenuOverlap(nurseryOnTarget, otherSchool);
                    if (overlap) {
                        alerts.push({
                            dayOffset: offset,
                            type: 'nursery_school',
                            message: `${label}の小給食と重複: ${overlap.match}`,
                            severity: 'warning'
                        });
                    }
                }
            }

            if (schoolOnTarget) {
                const otherSchool = STATE.schoolMenu[scanDateStr];
                if (otherSchool) {
                    const overlap = checkMenuOverlap(schoolOnTarget, otherSchool);
                    if (overlap) {
                        alerts.push({
                            dayOffset: offset,
                            type: 'school_school',
                            message: `${label}の小給食と重複: ${overlap.match}`,
                            severity: 'warning'
                        });
                    }
                }
                const otherNursery = STATE.nurseryMenu[scanDateStr];
                if (otherNursery) {
                    const overlap = checkMenuOverlap(schoolOnTarget, otherNursery);
                    if (overlap) {
                        alerts.push({
                            dayOffset: offset,
                            type: 'school_nursery',
                            message: `${label}の園給食と重複: ${overlap.match}`,
                            severity: 'warning'
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.error("被り判定中にエラーが発生しました:", e);
    }

    return alerts;
}

// --------------------------------------------------------------------------
// 3.5 月間夕食献立パズル最適化アルゴリズム (3択 ＆ 常備野菜版)
// --------------------------------------------------------------------------
const POTENTIAL_PROTEINS = [
    { key: 'chicken_thigh', name: '鶏もも肉', keywords: ['鶏', 'チキン', 'もも肉'] },
    { key: 'pork_roast', name: '薄切り豚肉', keywords: ['豚', 'ポーク', '生姜焼き'] },
    { key: 'salmon', name: '鮭の切り身', keywords: ['魚', '鮭', 'さけ', 'サケ'] },
    { key: 'beef', name: '薄切り牛肉', keywords: ['牛', 'ビーフ', '牛丼'] },
    { key: 'minced_meat', name: '合い挽き肉', keywords: ['ひき肉', 'ハンバーグ', 'つくね', '麻婆'] },
    { key: 'white_fish', name: '白身魚の切り身', keywords: ['魚', 'たら', 'タラ', '白身魚', 'フライ'] },
    { key: 'chicken_breast', name: '鶏むね肉', keywords: ['鶏', 'チキン', 'むね肉'] },
    { key: 'tofu', name: '豆腐・厚揚げ', keywords: ['豆腐', 'とうふ', 'トーフ', '厚揚げ', '油揚げ', 'がんも', '大豆'] }
];

const POTENTIAL_COOKING_STYLES = [
    { key: 'cheese', name: 'チーズ焼き', action: 'チーズ焼きやとろ〜りソテー', flavor: 'とろけるチーズがたまらない濃厚テイスト' },
    { key: 'honey_teri', name: 'ハニー照り焼き', action: '甘口照り焼きや香ばし炒め', flavor: 'ご飯がバクバク進んちゃう甘辛コク旨味' },
    { key: 'garlic_butter', name: 'バターソテー', action: 'コク旨ソテーやガリバタ炒め', flavor: '香ばしいバター醤油の風味が広がるテイスト' },
    { key: 'tomato_stew', name: 'トマト煮込み', action: 'マイルドトマト煮込みやトマトシチュー', flavor: 'まろやかで優しいお味' },
    { key: 'crispy_fry', name: 'ササッと揚げ焼き', action: 'カリッとジューシーな竜田揚げやフライ', flavor: '外はサクサク、中はジュワッとあふれ出す食感' }
];

// 【新開発】メイン食材ごとにアプローチが異なる3種類の具体的メニューおよびキャラクター別超簡単レシピ・コツ
// これにより、「絵に描いた餅」にせず、クリックするだけでその場で超簡単ステップが分かります！
const DISH_NAME_3OPTIONS = {
    chicken_thigh: [
        { 
            name: 'チキンのとろ〜りダブルチーズ焼き', 
            type: '濃厚洋風',
            recipes: {
                remi: '鶏もも肉に塩コショウして皮目からパリッと焼く！ひっくり返したらチーズをドカンと乗せて蓋してとろけさせれば、あっという間に完成よ！美味しいから大丈夫！',
                doi: '鶏もも肉を一口大に切り、フライパンでじっくり焼きはります。最後にチーズを乗せて蓋をし、余熱でとろりと閉じる。これでええんです。本当にごちそうですよ。',
                goro: '鶏もも肉を香ばしくソテーし、チーズをこれでもかと重ねる。あぁ、このとろけるビジュアル。ハフハフと頬張れば、濃厚な旨味が白飯を猛烈に呼び寄せるぞ。'
            }
        },
        { 
            name: '鶏もも肉とネギのさっぱりポン酢煮', 
            type: '和風・さっぱり',
            recipes: {
                remi: '一口に切った鶏肉とネギをフライパンに入れ、ポン酢と水を１：１で入れてコトコト煮るだけ！酸味が飛んでお肉も柔らかくなって超ウルトラハッピー！',
                doi: 'お肉とネギをお鍋に合わせ、ポン酢とお水でコトコトと静かに煮ていきます。ポン酢のおかげでお肉が本当に柔らかく仕上がる。しみじみ美味しい和のお味です。',
                goro: 'ポン酢と水のシンプルな煮込み。だが、これが美味い。ネギの甘みとお肉の旨味がポン酢の酸味と絡み合い、胃袋を優しく、かつガツンと満たしてくれる。'
            }
        },
        { 
            name: '香ばし！鶏のハニーマスタードソテー', 
            type: '甘口・子供に人気',
            recipes: {
                remi: '鶏もも肉をソテーして、粒マスタードとはちみつとお醤油をジャーッと絡める！マスタードは熱を通すと辛味が消えて、子供もバクバク食べる甘口だれになるのよ！',
                doi: '鶏肉を香ばしく焼き上げ、はちみつ、醤油、粒マスタードのタレをさっと絡めます。マスタードの酸味がはちみつでマイルドになり、お子さんも本当に喜びますよ。',
                goro: 'ハニーマスタード。熱が通って辛味の抜けたマスタードと、はちみつのコク。これが鶏肉の油と合わさって、驚くべき旨味のシナジーを生み出す。白飯が進む！'
            }
        }
    ],
    pork_roast: [
        { 
            name: 'はちみつ醤油のやわらか豚の生姜焼き', 
            type: '定番和風',
            recipes: {
                remi: '薄切り豚肉に生姜醤油とはちみつを入れて揉み込み、フライパンでササッと炒めるだけ！はちみつのおかげで冷めても驚くほどお肉が柔らかいのよ！',
                doi: '薄切りのお肉に、すりおろした生姜、醤油、ほんの少しのはちみつを合わせて、さっと炒めはります。はちみつが保水して、お肉がしっとり仕上がるんですよ。',
                goro: 'はちみつ醤油の生姜焼き。お肉がとても柔らかい。生姜のツンとした香りをはちみつが優しく包み込み、えも言われぬ飯泥棒な味付けに昇華させている。'
            }
        },
        { 
            name: '豚バラとキャベツのミルフィーユチーズソテー', 
            type: 'とろける洋風',
            recipes: {
                remi: '豚バラ肉とざく切りキャベツを交互にフライパンにドカンと重ねて、チーズをパラパラ！蓋して蒸し焼きにするだけで旨味がキャベツに染みて最高よ！',
                doi: '豚バラの脂の甘みと、キャベツの水分だけでコトコトと蒸し焼きにします。仕上げにチーズを少々。お出汁がいらぬほどお野菜とお肉の旨味が濃いです。',
                goro: '豚バラとキャベツを重ねて蒸し焼き、仕上げのチーズ。シンプルだが豪快な一品。キャベツの甘みとお肉のジューシーさ、チーズのコクが三位一体で襲ってくる。'
            }
        },
        { 
            name: 'カリカリ豚ロースの甘酢ごま醤油あえ', 
            type: '中華風・さっぱり',
            recipes: {
                remi: '豚ロースに片栗粉をまぶしてカリッと揚げ焼き！お醤油、お酢、お砂糖、すりごまのタレをジャーッと絡めるだけで、さっぱり甘酸っぱくて箸が止まらないわよ！',
                doi: '片栗粉をまぶしてカリッと焼いたロース肉に、お酢とお醤油、お砂糖、たっぷりのごまを合わせます。さっぱりして、暑い日でもお箸が進む優しい味です。',
                goro: 'カリカリの食感に絡む、甘酢ごま醤油。お酢のさっぱり感が豚の油を軽やかに流してくれる。すりごまの香ばしさが後を引く、実に素晴らしいおかずだ。'
            }
        }
    ],
    salmon: [
        { 
            name: '鮭のふっくらホイル焼き・マヨチーズ乗せ', 
            type: 'コク旨洋風',
            recipes: {
                remi: 'ホイルに鮭とキャベツや玉ねぎを乗せて、マヨネーズとチーズをドカン！包んでトースターで15分チン！お皿も汚れないし、ふっくら焼けてウルトラハッピー！',
                doi: 'アルミホイルにお魚とお野菜を包み、マヨネーズとチーズを少し置いて蒸し焼きにします。ホイルの中で水分が回るから、身がふっくらと本当に柔らかい。これでええんです。',
                goro: 'ホイル焼きにマヨネーズとチーズ。完璧な布陣だ。ホイルを開けた瞬間に広がる香気。蒸し焼きされた身はふわふわで、野菜の水分と合わさって極上のソースになっている。'
            }
        },
        { 
            name: '秋鮭とコーンの香ばしちゃんちゃんバター炒め', 
            type: '甘口和風',
            recipes: {
                remi: 'お魚とお野菜をバターで炒めて、お味噌とお砂糖とみりんの甘口タレをジャーッと絡める！コーンの甘みとお味噌のコクが合わさって子供たちが狂喜乱舞よ！',
                doi: 'お魚をお野菜、コーンと一緒にバターで炒め、甘めのお味噌で味付けします。コーンの甘さがお味噌とバターの塩気とよく合って、お子さんも食べやすいですねぇ。',
                goro: '味噌とバターのちゃんちゃん焼き風。コーンのプチプチ感が良いアクセントだ。この甘辛いコク。白いご飯の上に乗せて、ガツガツいきたくなる味だ。'
            }
        },
        { 
            name: '鮭とポテトのとろとろトマトシチュー', 
            type: 'マイルド煮込み',
            recipes: {
                remi: '鮭とジャガイモをトマト缶と牛乳、コンソメでコトコト煮込む！トマトの酸味が牛乳でまろやかになって、子供たちが大好きな優しいトマトシチューになるのよ！',
                doi: '鮭とお野菜をトマトソースと少しの牛乳でコトコト煮込みます。牛乳が入ることでトマトの酸味が取れ、本当にマイルドでお腹がホッとするお味になります。',
                goro: 'トマトと牛乳の優しいシチュー。鮭の旨味がジャガイモにじんわりと染み込んでいる。酸味とクリーミーさのバランスが絶妙で、身体が静かに温まっていくのを感じる。'
            }
        }
    ],
    beef: [
        { 
            name: 'お弁当にも大活躍！すき焼き風マイルド牛しぐれ煮', 
            type: '甘辛和風',
            recipes: {
                remi: '薄切り牛肉と玉ねぎをお醤油、お砂糖、みりん、お水でササッと煮るだけ！ちょっと甘めに仕上げるのが子供ウケ抜群のコツよ！ご飯に乗せて牛丼にしても最高！',
                doi: '牛肉とおネギ、玉ねぎを甘口のお醤油ベースでコトコトと静かに煮ます。煮すぎず、お肉が柔らかいうちに火を止めるのがコツです。ご飯に乗せてもよろしな。',
                goro: '甘辛いすき焼き風のしぐれ煮。玉ねぎの甘みがしっかり牛肉に馴染んでいる。これを白飯に乗せて、紅生姜を少し。あぁ、抜群だ。これこそ王道の飯の友だ。'
            }
        },
        { 
            name: '牛肉と新ごぼうのガリバタ醤油ソテー', 
            type: 'ご飯が進むコク旨',
            recipes: {
                remi: '牛肉とささがきごぼうをフライパンで炒めて、にんにく少々とバターとお醤油をジャーッ！ごぼうの歯ごたえとお肉の旨味にバター醤油が絡んでもうたまらないわよ！',
                doi: '牛肉と薄切りのごぼうを炒め、バターとお醤油、ほんの少しのにんにくで香りを立てます。ごぼうの香ばしさとバター醤油が、驚くほど調和します。これでええんです。',
                goro: 'ガリバタ醤油ソテー。ニンニクとバター、醤油の三種の神器。そこに牛肉の脂とごぼうの力強い大地の香りが絡みつく。噛み締めるたびに旨味が溢れて箸が止まらない。'
            }
        },
        { 
            name: 'ハッシュドビーフ風マイルドトマト煮込み', 
            type: '定番洋風',
            recipes: {
                remi: '牛肉と玉ねぎをケチャップ、ウスターソース、トマト缶、コンソメでコトコト煮込むだけ！ハヤシライスみたいになって子供たちがスプーンでバクバク完食よ！',
                doi: '牛肉とお野菜をトマトソース、ケチャップ、少しのソースでマイルドに煮込みます。じっくり煮ることで酸味が消えて、お子さんも大好きな優しいシチューになります。',
                goro: 'ハッシュドビーフ風の煮込み。トマトの優しい酸味と、ケチャップ・ソースの親しみやすい甘み。この洋風のコクが、疲れ切った胃袋にしんしんと染み込んでいく。'
            }
        }
    ],
    minced_meat: [
        { 
            name: '肉汁じゅわ〜！デミトマ煮込みハンバーグ', 
            type: 'ごちそう洋風',
            recipes: {
                remi: '合い挽き肉でハンバーグを作って焼き、ケチャップ、ソース、お水、コンソメのタレを入れて蓋してコトコト煮込む！中までしっかり火が通って絶対に失敗しないのよ！',
                doi: 'ハンバーグの両面をさっと焼き、ケチャップとウスターソース、お水を入れてじっくりとソースの中で煮込みます。煮込むことで焦げ付かず、身もふっくら仕上がります。',
                goro: 'デミトマ煮込みハンバーグ。ソースの中で煮込まれた丸々としたハンバーグ。箸を入れると肉汁がソースと一体化する。この濃厚なソースごと、白飯にドカンといきたい。'
            }
        },
        { 
            name: '子供に大人気！ふっくら照り焼きつくね', 
            type: 'ふんわり和風',
            recipes: {
                remi: 'ひき肉に豆腐を少し混ぜて丸めて焼き、醤油、みりん、お砂糖のタレを絡める！豆腐のおかげで冷めてもフワフワで、いくらでも食べられちゃうのよ！',
                doi: 'ひき肉に少しのお豆腐を混ぜ込み、小さく丸めて焼き、甘辛の照り焼きタレを絡めます。お豆腐が入ることで口当たりが本当に柔らかくなり、優しいお味になります。',
                goro: '豆腐を隠し味にしたふんわりつくね。甘辛い照り焼きのタレが表面を綺麗にコーティングしている。フワッと軽い食感の中に、しっかりとお肉の旨味。これは美味い。'
            }
        },
        { 
            name: 'パリパリ！手作り羽根つきジャンボ餃子', 
            type: '手作り中華',
            recipes: {
                remi: 'フライパンに餃子を並べ、小麦粉を溶いたお水を流し込んで蓋して蒸し焼き！最後に油を回しかけてパリッとさせるだけで、まるでお店みたいな綺麗な羽根がつくわよ！',
                doi: '餃子を並べ、少しの小麦粉水を加えて蒸し焼きにし、最後に少々の油で底をパリッと焼き上げます。見事な羽根がついて、子供さんも喜びます。家族で囲むのに良いですね。',
                goro: '羽根つき餃子。パリッとした羽根を割り、酢醤油をつけて喰らう。中からジュワッと溢れるジューシーな肉汁。このパリパリとジューシーの対比。完璧なディナーだ。'
            }
        }
    ],
    white_fish: [
        { 
            name: '白身魚のサクサクフライ＆手作りタルタルソース', 
            type: '定番サクサク',
            recipes: {
                remi: '白身魚にマヨネーズを薄く塗ってパン粉をまぶし、トースターで焼くだけ！油で揚げないから超ラクだしヘルシー！マヨネーズと茹で卵を潰しただけの即席タルタルを乗せて！',
                doi: 'お魚に小麦粉、卵、パン粉をつけて、フライパンで多めの油でサクッと焼き上げます。マヨネーズと刻んだゆで卵を合わせた素朴なタルタル。サクサクの身に最高に合います。',
                goro: 'フィッシュフライ。サクッとしたパン粉の壁を破ると、ふわふわの白身魚が顔を出す。たっぷりと乗せたタルタルソース。酸味とコクが白身の淡白さを完璧に引き立てている。'
            }
        },
        { 
            name: 'ふっくらタラのみりん照り焼き', 
            type: '優しい和風',
            recipes: {
                remi: 'タラの切り身に薄く片栗粉をまぶして焼き、お醤油、みりん、お酒のタレを絡めるだけ！片栗粉のおかげでタラの身が崩れず、タレもしっかり絡んで超ふっくら美味しいわよ！',
                doi: 'タラの切り身に軽く片栗粉をはたいて焼き、みりんと少しのお醤油で甘辛く仕上げます。片栗粉がタラの繊細な身を守り、しっとりとした素晴らしい照り焼きになります。',
                goro: 'タラの甘辛みりん照り焼き。身が崩れず、ふっくらと保たれている。タレがトロリと絡んでいて、淡白なタラに力強い旨味の衣を着せている。白飯がどこまでも進む。'
            }
        },
        { 
            name: '白身魚とアスパラのレモンバタームニエル', 
            type: 'さっぱり洋風',
            recipes: {
                remi: '魚に小麦粉をまぶしてバターで香ばしくソテーし、アスパラを一緒に炒める！最後にレモン汁をギュッと絞るだけで、お家が一瞬で高級フレンチになっちゃうわよ！',
                doi: 'お魚に薄く小麦粉をまぶし、香ばしいバターでお野菜と一緒に優しくムニエルにします。仕上げにレモンを少し。バターのコクとレモンの爽やかさ、実に素晴らしいお味です。',
                goro: 'レモンバタームニエル。バターの香ばしいコクの中に、レモンの爽やかな酸味が一本の矢のように通っている。フワッとした白身魚にアスパラのシャキッと感が実にいい。'
            }
        }
    ],
    chicken_breast: [
        { 
            name: 'パサつかない！鶏むね肉の甘酢マヨソテー', 
            type: 'しっとり中華',
            recipes: {
                remi: 'むね肉は薄く「そぎ切り」にして片栗粉をしっかり揉み込んでから焼くのが最大のコツ！これで水分が閉じ込められて驚くほどしっとりよ！甘酢とマヨを絡めて完成！',
                doi: 'むね肉は繊維を断つようにそぎ切りにし、片栗粉を薄くはたいて優しく焼きはります。甘酢とマヨネーズをさっと絡める。しっとり柔らか、これでええんです。美味しいですよ。',
                goro: 'フォークでお肉をメッタ刺しにしてから片栗粉をまぶして焼く。これがパサつきを防ぐ防壁だ。甘酢マヨのコク。これこれ、このしっとり感、むね肉とは思えない柔らかさだ。'
            }
        },
        { 
            name: 'サクサクポップコーンチキンナゲット', 
            type: 'スナック風・大人気',
            recipes: {
                remi: 'むね肉を小さく切ってマヨネーズと塩コショウを揉み込み、片栗粉と小麦粉をまぶしてフライパンでカリッと揚げ焼き！マヨネーズのおかげで中がフワッフワに柔らかくなるのよ！',
                doi: '細かく切ったむね肉に少しのマヨネーズを揉み込み、粉をまぶしてさっと焼き上げます。マヨネーズが繊維を柔らかくする。サクサク、パクパクとつまめる楽しい一品です。',
                goro: 'ひとくちサイズのポップコーンチキン。マヨネーズの下処理が効いていて非常に柔らかい。外のカリカリ感と中のふわふわ感。これはスナック感覚で無限にいけてしまうぞ。'
            }
        },
        { 
            name: '鶏むね肉とブロッコリーの塩バター炒め', 
            type: 'シンプルコク旨',
            recipes: {
                remi: 'むね肉をそぎ切りにして片栗粉をまぶし、ブロッコリーと一緒にバターと塩コショウ、コンソメ少々で炒める！ブロッコリーは下茹でなしでそのまま炒めちゃえば時短よ！',
                doi: 'むね肉とお野菜を、コクのあるバターと塩でシンプルに炒めます。お肉に軽く片栗粉をまぶすことで旨味が閉じ込められ、バターの風味もしっかりまといます。よろしな。',
                goro: '塩バター炒め。シンプルな塩気が、鶏むね肉とブロッコリーの素材本来の旨味をくっきりと引き立てる。バターの油分がむね肉のパサつきを完全に補い、極上のおかずに仕上がっている。'
            }
        }
    ],
    tofu: [
        {
            name: '厚揚げの甘辛とろ〜りチーズ焼き',
            type: '簡単濃厚',
            recipes: {
                remi: '厚揚げを一口大に切ってトースターでカリッと焼いて、甘辛ダレ（醤油・みりん）とチーズを乗せてさらに焼くだけ！フライパンも使わないから超絶お気楽よ！',
                doi: '厚揚げを軽く焼いてから、醤油と少しの砂糖で甘辛く味をつけます。そこにチーズを乗せて蓋をし、じわっと溶かす。お豆腐のコクとチーズが実によく合いますな。',
                goro: '厚揚げの甘辛チーズ焼き。焦げた醤油の香ばしさと、厚揚げのモチモチ感、そしてとろ〜りチーズ。肉にも負けない大満足のボリュームだ。ご飯が進みすぎる。'
            }
        },
        {
            name: '具だくさん！厚揚げと野菜のやわらか味噌炒め',
            type: 'コク旨和風',
            recipes: {
                remi: '厚揚げと余った野菜を油でサッと炒めて、お味噌とみりんと砂糖で味付け！厚揚げは崩れにくいから、お肉代わりにどんどん使えてヘルシーで最高！',
                doi: '厚揚げとお好みの季節の野菜を、お味噌で炒め合わせます。厚揚げが油とお味噌の旨味をしっかり吸って、しみじみと美味しい。ご飯のおかずにぴったりです。',
                goro: '厚揚げと野菜の味噌炒め。甘辛いコクのある味噌ダレが、しっかり厚揚げに絡んでいる。噛むたびに味噌と大豆の旨味が溢れ出す。これはたまらん。'
            }
        },
        {
            name: 'ふわふわ豆腐とひき肉のとろみ和風煮',
            type: '優しいあんかけ',
            recipes: {
                remi: 'お豆腐と少々のひき肉を、だし汁とお醤油でコトコト煮て、片栗粉でとろみをつけるだけ！ふわっふわでスプーンでパクパクいけちゃうから、子供も大喜びよ！',
                doi: 'お豆腐と少しのひき肉を優しいお出汁で煮て、葛（片栗粉）でとろみをつけます。お豆腐が喉を滑らかに通り、じんわりと温まる。飽きのこないお味です。',
                goro: '豆腐とひき肉のとろみ煮。あんかけが豆腐を優しく包み込み、ひき肉の旨味がじんわりと広がる。スプーンですくう手が止まらない。あぁ、心が和む。'
            }
        }
    ]
};

/**
 * 月間夕食献立パズル最適化アルゴリズム
 * 表示中の年月の各日に対して、昼の給食と被らない夕食（メイン食材、常備野菜、選択メニュー等）を提案し、STATE.proposedDinnersにキャッシュする
 */
function optimizeMonthlyDinnerProposals() {
    const year = STATE.currentDate.getFullYear();
    const month = STATE.currentDate.getMonth(); // 0-indexed

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 決定済みの夕食メイン食材の直近履歴（重複ローテーション回避用）
    let recentProteins = [];

    // 常備野菜のローテーション用配列
    const VEGGIE_POOL = ['キャベツ', '玉ねぎ', 'にんじん', 'ピーマン', 'もやし', 'ブロッコリー', 'ネギ', 'ごぼう'];

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const dayOfWeek = date.getDay(); // 0:日, 1:月 ... 6:土
        // 土日は夕食提案から除外
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const dateStr = formatDateStr(date);

        // すでに提案データが存在する場合は、再計算してメニューが変わるのを防ぐためスキップ
        if (STATE.proposedDinners[dateStr]) {
            // ローテーション履歴だけ追跡
            recentProteins.push(STATE.proposedDinners[dateStr].proteinKey);
            continue;
        }

        // 1. 簡単（らくちん）夕食かどうかの判定 (水曜日・金曜日はお疲れモードとして簡単夕食にする)
        let isEasy = (dayOfWeek === 3 || dayOfWeek === 5); // 水・金
        const nurseryLunch = STATE.nurseryMenu[dateStr] || '';
        const schoolLunch = STATE.schoolMenu[dateStr] || '';

        // 2. メイン食材のスコアリング (昼の給食と直近の夕食との被りを評価)
        let bestProtein = null;
        let lowestScore = Infinity;

        // 候補のメイン食材をすべて評価
        for (const protein of POTENTIAL_PROTEINS) {
            let score = 0;

            // 直近の履歴に基づくペナルティ計算（重複ローテーション回避用）
            const lastIdx = recentProteins.lastIndexOf(protein.key);
            if (lastIdx !== -1) {
                const daysAgo = recentProteins.length - lastIdx;
                // 直近で使われたものほど高いペナルティ（最大90点から、日数経過で減衰。約9日でペナルティ0へ）
                score += Math.max(0, 90 - daysAgo * 10);
            }

            // 牛肉の出現頻度を下げるための追加ペナルティ
            if (protein.key === 'beef') {
                score += 30;
            }

            // 昼の給食（園・小）の食材との重複チェック
            const lunchText = (nurseryLunch + ' ' + schoolLunch).toLowerCase();
            protein.keywords.forEach(keyword => {
                if (lunchText.includes(keyword)) {
                    score += 50; // 給食と被る場合は強力なペナルティ
                }
            });

            // 被り判定アルゴリズム (checkMenuOverlap) も活用して、給食メニューのカテゴリ重複を検出
            const nurseryOverlap = checkMenuOverlap(nurseryLunch, protein.name);
            const schoolOverlap = checkMenuOverlap(schoolLunch, protein.name);
            if (nurseryOverlap || schoolOverlap) {
                score += 100;
            }

            // スコアが最も低い（被りが最も少ない）食材を選択
            if (score < lowestScore) {
                lowestScore = score;
                bestProtein = protein;
            }
        }

        // 万が一食材が見つからなかった場合のフォールバック
        if (!bestProtein) {
            bestProtein = POTENTIAL_PROTEINS[d % POTENTIAL_PROTEINS.length];
        }

        // 直近履歴に追加
        recentProteins.push(bestProtein.key);

        // 3. 合わせる常備野菜の選定
        // 食材ごとに相性の良い野菜を優先しつつ、日によってばらつかせる
        let veggieName = '玉ねぎ';
        if (bestProtein.key === 'chicken_thigh') {
            veggieName = d % 2 === 0 ? 'キャベツ' : 'ネギ';
        } else if (bestProtein.key === 'pork_roast') {
            veggieName = d % 2 === 0 ? 'キャベツ' : 'もやし';
        } else if (bestProtein.key === 'salmon') {
            veggieName = d % 2 === 0 ? 'キャベツ' : 'じゃがいも';
        } else if (bestProtein.key === 'beef') {
            veggieName = d % 2 === 0 ? 'ごぼう' : '玉ねぎ';
        } else if (bestProtein.key === 'minced_meat') {
            veggieName = d % 2 === 0 ? 'ピーマン' : '玉ねぎ';
        } else if (bestProtein.key === 'white_fish') {
            veggieName = d % 2 === 0 ? 'アスパラ' : 'キャベツ';
        } else if (bestProtein.key === 'chicken_breast') {
            veggieName = d % 2 === 0 ? 'ブロッコリー' : 'キャベツ';
        } else if (bestProtein.key === 'tofu') {
            veggieName = d % 2 === 0 ? 'ネギ' : 'キャベツ';
        } else {
            veggieName = VEGGIE_POOL[d % VEGGIE_POOL.length];
        }

        // 4. 3択メニューの決定
        const menuOptions = DISH_NAME_3OPTIONS[bestProtein.key] || [];

        // 5. 提案データを格納
        STATE.proposedDinners[dateStr] = {
            date: dateStr,
            isEasy: isEasy,
            proteinKey: bestProtein.key,
            proteinName: bestProtein.name,
            veggieName: veggieName,
            menuOptions: menuOptions
        };
    }
    // 全体の提案データ保存漏れを防止
    safeLocalStorageSet('menuharmony_proposed_dinners', JSON.stringify(STATE.proposedDinners));
}

// --------------------------------------------------------------------------
// 3. MEAL OVERLAP DETECTION ALGORITHM (REST OF ALGORITHM)
// --------------------------------------------------------------------------

/**
 * 選択中の年月を基準に、月〜金の平日リストカレンダーを動的に生成する
 */
function renderCalendarList() {
    updateMonthLabel();
    optimizeMonthlyDinnerProposals();

    const container = document.getElementById('calendar-list');
    if (!container) return;

    container.innerHTML = '';

    const year = STATE.currentDate.getFullYear();
    const month = STATE.currentDate.getMonth(); // 0-indexed

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let hasRenderedAny = false;

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const dayOfWeek = date.getDay(); // 0: 日, 1: 月, ... 6: 土

        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        hasRenderedAny = true;
        const dateStr = formatDateStr(date);
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const dayName = dayNames[dayOfWeek];

        const weekdayClasses = ['day-sunday', 'day-monday', 'day-tuesday', 'day-wednesday', 'day-thursday', 'day-friday', 'day-saturday'];
        const weekdayClass = weekdayClasses[dayOfWeek];

        const nursery = STATE.nurseryMenu[dateStr] || '';
        const school = STATE.schoolMenu[dateStr] || '';

        const overlaps = scanDateForOverlaps(dateStr);
        const todayOverlap = overlaps.find(o => o.severity === 'danger');
        const warningOverlap = overlaps.find(o => o.severity === 'warning');

        const card = document.createElement('div');
        card.className = `day-card ${weekdayClass}`;
        card.dataset.date = dateStr;

        let badgesHtml = '';
        if (todayOverlap) {
            badgesHtml += `<span class="alert-badge badge-overlap"><i data-lucide="alert-triangle"></i> 当日被り！</span>`;
        } else if (warningOverlap) {
            badgesHtml += `<span class="alert-badge badge-warning"><i data-lucide="info"></i> 接近注意</span>`;
        }

        const proposal = STATE.proposedDinners[dateStr];
        let aiPreviewHtml = '';
        if (proposal) {
            aiPreviewHtml = `
                <div class="card-ai-preview">
                    <i data-lucide="sparkles"></i>
                    <div class="card-ai-preview-content">
                        <span class="preview-label" style="font-weight:bold; color:var(--text-main); font-size:0.92rem; display:block;">
                            💡 今夜の主役食材: ${proposal.isEasy ? '冷凍うどん・簡単食材' : escapeHtml(proposal.proteinName)} (${escapeHtml(proposal.veggieName)})
                        </span>
                        <span class="preview-action-hint" style="font-size:0.78rem; color:var(--text-sub); display:block; margin-top:2px;">
                            👉 タップして3人のオリジナルAI夕食を見る
                        </span>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="day-header">
                <div class="day-date-info">
                    <span class="day-number">${d}</span>
                    <span class="day-header-badge">${dayName}</span>
                </div>
                <div class="card-alert-indicators">
                    ${badgesHtml}
                </div>
            </div>
            <div class="lunch-comparison">
                <div class="lunch-column nursery">
                    <span class="column-title"><i data-lucide="baby" style="width:12px;height:12px;"></i> 園</span>
                    <p class="lunch-text ${nursery ? '' : 'empty'}">${escapeHtml(nursery) || '未登録'}</p>
                </div>
                <div class="divider-line"></div>
                <div class="lunch-column school">
                    <span class="column-title"><i data-lucide="school" style="width:12px;height:12px;"></i> 小</span>
                    <p class="lunch-text ${school ? '' : 'empty'}">${escapeHtml(school) || '未登録'}</p>
                </div>
            </div>
            ${aiPreviewHtml}
        `;

        card.addEventListener('click', () => {
            openSuggestionSheet(dateStr);
        });

        container.appendChild(card);
    }

    if (!hasRenderedAny) {
        container.innerHTML = `<div class="loading-placeholder"><p>平日のカレンダーデータがありません</p></div>`;
    }

    try {
        lucide.createIcons({ root: container });
    } catch (e) {
        console.error("Lucideアイコンの読み込みエラー:", e);
    }
    updateDemoBadge();
}

// --------------------------------------------------------------------------
// 4.6 SHOPPING LIST VIEW RENDERER
// --------------------------------------------------------------------------
function renderShoppingListView() {
    updateMonthLabel();
    optimizeMonthlyDinnerProposals();

    const container = document.getElementById('shopping-weeks-container');
    if (!container) return;

    container.innerHTML = '';

    const year = STATE.currentDate.getFullYear();
    const month = STATE.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const weeklyGroups = [];
    let currentWeekDays = [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const dayOfWeek = date.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        if (dayOfWeek === 1 && currentWeekDays.length > 0) {
            weeklyGroups.push(currentWeekDays);
            currentWeekDays = [];
        }

        currentWeekDays.push(date);
    }

    if (currentWeekDays.length > 0) {
        weeklyGroups.push(currentWeekDays);
    }

    if (weeklyGroups.length === 0) {
        container.innerHTML = '<div class="loading-placeholder"><p>今週の買い出しデータがありません</p></div>';
        return;
    }

    weeklyGroups.forEach((weekDays, index) => {
        const weekNum = index + 1;
        const firstDayOfWeek = weekDays[0];
        const lastDayOfWeek = weekDays[weekDays.length - 1];

        const rangeStr = `${firstDayOfWeek.getMonth() + 1}/${firstDayOfWeek.getDate()}(${getDayNameJp(firstDayOfWeek.getDay())}) 〜 ${lastDayOfWeek.getMonth() + 1}/${lastDayOfWeek.getDate()}(${getDayNameJp(lastDayOfWeek.getDay())})`;

        let meatList = new Set();
        let fishList = new Set();
        let veggieList = new Set();
        let otherList = new Set(['卵', '牛乳', 'チーズ']);

        weekDays.forEach(date => {
            const dateStr = formatDateStr(date);
            const proposal = STATE.proposedDinners[dateStr];
            
            if (proposal) {
                veggieList.add(proposal.veggieName);

                if (proposal.isEasy) {
                    otherList.add('冷凍うどん/中華麺');
                    const d = parseLocalDate(dateStr).getDate();
                    if (d % 3 === 0) meatList.add('鶏ひき肉');
                    else if (d % 3 === 1) meatList.add('牛肉細切れ');
                    else meatList.add('鶏もも肉');
                } else {
                    if (proposal.proteinKey === 'salmon') fishList.add('鮭の切り身');
                    else if (proposal.proteinKey === 'white_fish') fishList.add('白身魚の切り身');
                    else if (proposal.proteinKey === 'chicken_thigh') meatList.add('鶏もも肉');
                    else if (proposal.proteinKey === 'chicken_breast') meatList.add('鶏むね肉');
                    else if (proposal.proteinKey === 'pork_roast') meatList.add('豚ロース薄切り肉');
                    else if (proposal.proteinKey === 'beef') meatList.add('牛肉細切れ');
                    else if (proposal.proteinKey === 'minced_meat') meatList.add('合い挽き肉');
                    else if (proposal.proteinKey === 'tofu') meatList.add('豆腐/厚揚げ/油揚げ');
                }
            }
        });

        const weeklyVeggies = Array.from(veggieList).join('、');
        const meats = meatList.size > 0 ? Array.from(meatList).join('、') : '今週は特に必要ありません';
        const fishes = fishList.size > 0 ? Array.from(fishList).join('、') : '今週は特に必要ありません';
        const others = Array.from(otherList).join('、');

        const card = document.createElement('div');
        card.className = `shopping-week-card week-${(index % 5) + 1}`;
        card.innerHTML = `
            <div class="week-card-header">
                <span class="week-title">第 ${weekNum} 週の買い出し目安</span>
                <span class="week-date-range">${rangeStr}</span>
            </div>
            <div class="shopping-ingredients-list">
                <div class="ingredient-category">
                    <span class="category-icon">🍖</span>
                    <div class="category-details">
                        <span class="category-name">お肉・大豆類の目安</span>
                        <span class="category-items">${meats}</span>
                    </div>
                </div>
                <div class="ingredient-category">
                    <span class="category-icon">🐟</span>
                    <div class="category-details">
                        <span class="category-name">お魚類の目安</span>
                        <span class="category-items">${fishes}</span>
                    </div>
                </div>
                <div class="ingredient-category">
                    <span class="category-icon">🥬</span>
                    <div class="category-details">
                        <span class="category-name">お野菜・その他の目安</span>
                        <span class="category-items">冷蔵庫の定番野菜（${weeklyVeggies}など）、${others}</span>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    try {
        lucide.createIcons({ root: container });
    } catch(e) {}
}

function getDayNameJp(dayIndex) {
    return ['日', '月', '火', '水', '木', '金', '土'][dayIndex];
}

// --------------------------------------------------------------------------
// 5. BOTTOM SHEET (AI SUGGESTION & RECIPE ACCORDION) SYSTEM
// --------------------------------------------------------------------------
let CURRENT_SHEET_RECIPES = {}; // 現在開いている日付のメニュー別レシピキャッシュ

/**
 * 特定の日の「AI夕食アドバイスシート」を開く
 */
function openSuggestionSheet(dateStr) {
    STATE.selectedDateStr = dateStr;
    CURRENT_SHEET_RECIPES = {}; // キャッシュリセット

    // インライン手動編集フォームの表示リセット
    const editNurseryWrapper = document.getElementById('edit-nursery-wrapper');
    const sheetNurseryMenu = document.getElementById('sheet-nursery-menu');
    const editSchoolWrapper = document.getElementById('edit-school-wrapper');
    const sheetSchoolMenu = document.getElementById('sheet-school-menu');
    
    if (editNurseryWrapper) editNurseryWrapper.classList.add('hidden');
    if (sheetNurseryMenu) sheetNurseryMenu.classList.remove('hidden');
    if (editSchoolWrapper) editSchoolWrapper.classList.add('hidden');
    if (sheetSchoolMenu) sheetSchoolMenu.classList.remove('hidden');

    const date = parseLocalDate(dateStr);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = date.getDay();
    const dateLabel = `${date.getMonth() + 1}月${date.getDate()}日(${dayNames[dayOfWeek]})`;

    document.getElementById('sheet-date-label').textContent = dateLabel;
    
    const dayBadge = document.getElementById('sheet-day-badge');
    dayBadge.textContent = `${dayNames[dayOfWeek]}曜日`;
    dayBadge.className = `day-badge day-${weekdayClassFromDay(dayOfWeek)}`;

    // シート全体の曜日テーマカラー割り当て
    const sheetEl = document.getElementById('sheet-suggestion');
    sheetEl.className = `bottom-sheet hidden theme-${weekdayClassFromDay(dayOfWeek)}`;

    const nursery = STATE.nurseryMenu[dateStr] || '';
    const school = STATE.schoolMenu[dateStr] || '';

    const nurseryEl = document.getElementById('sheet-nursery-menu');
    nurseryEl.textContent = nursery || '給食未登録';
    nurseryEl.className = `lunch-menu-text ${nursery ? '' : 'empty'}`;

    const schoolEl = document.getElementById('sheet-school-menu');
    schoolEl.textContent = school || '給食未登録';
    schoolEl.className = `lunch-menu-text ${school ? '' : 'empty'}`;

    const overlaps = scanDateForOverlaps(dateStr);
    const alertBanner = document.getElementById('sheet-alert-banner');
    const alertText = document.getElementById('sheet-alert-text');

    if (overlaps.length > 0) {
        alertBanner.classList.remove('hidden');
        const topOverlap = overlaps.find(o => o.severity === 'danger') || overlaps[0];
        alertText.textContent = topOverlap.message;
    } else {
        alertBanner.classList.add('hidden');
    }

    // 新スッキリ3択カードへのデータ注入とアコーディオンイベント付与
    const proposal = STATE.proposedDinners[dateStr];
    if (proposal) {
        document.getElementById('sheet-target-protein').textContent = proposal.isEasy ? '冷凍うどん / 簡単な食材' : proposal.proteinName;
        document.getElementById('sheet-target-veggie').textContent = proposal.veggieName;

        const proteinLabelEl = document.getElementById('sheet-protein-label');
        if (proteinLabelEl) {
            let emoji = '🍖';
            if (proposal.proteinKey === 'salmon' || proposal.proteinKey === 'white_fish') {
                emoji = '🐟';
            } else if (proposal.proteinKey === 'tofu') {
                emoji = '🫘';
            }
            proteinLabelEl.textContent = `${emoji} 今夜のメイン食材`;
        }

        const optionsList = document.getElementById('sheet-menu-options-list');
        optionsList.innerHTML = '';

        let itemsToRender = [];
        if (proposal.isEasy) {
            const dayNum = parseLocalDate(dateStr).getDate();
            const setIndex = dayNum % 3; // 3パターンの簡単メニューセットへ自動分岐ローテーション！
            
            if (setIndex === 0) {
                itemsToRender = [
                    { 
                        name: 'ダダダッと炒める三色そぼろ丼', 
                        type: '超簡単丼',
                        recipes: {
                            remi: 'ひき肉と卵とざく切りインゲンをフライパンでダダダッと炒めてご飯にドカンと乗せるだけ！スプーンでバクバクいけちゃうわよ！',
                            doi: 'ひき肉と卵のそぼろ。お鍋で静かに箸を４本持ってかき混ぜます。ふんわり優しく仕上がります。これでええんです。',
                            goro: '甘口に炒めた鶏ひき肉とふんわり黄金の卵そぼろ。これをご飯にドカン。あぁ、スプーンが止まらない破壊力だ。'
                        }
                    },
                    { 
                        name: '醤油タラ〜ッのコク旨釜玉うどん', 
                        type: 'スピード麺',
                        recipes: {
                            remi: '冷凍うどんをチン！生卵と天かすとネギをドカン！お醤油をタラ〜ッと回しかければ完成！あっという間に幸せよ！',
                            doi: '温めたうどんに生卵を落とし、お醤油をさっと回します。お揚げさんやネギがあればなおよろし. 簡単で贅沢な一品です。',
                            goro: '熱々のうどんに絡みつく生卵のまろやかさ。ネギの焦げた香ばしさと醤油の風味。こういう素朴なのが一番落ち着く。'
                        }
                    },
                    { 
                        name: 'フライパン一つでワンパン親子丼', 
                        type: 'ワンパン料理',
                        recipes: {
                            remi: '鶏肉と玉ねぎをお水と醤油と砂糖でコトコト煮て、卵をダダッと回し入れてご飯に乗せる！フライパン一つで片付けも超ラクよ！',
                            doi: 'フライパン一つで鶏肉と玉ねぎを煮て、卵でふんわりと閉じます。鶏とお出汁の旨味がご飯に染みて本当に美味しいです。',
                            goro: 'ワンパン親子丼。出汁を吸ったクタクタの玉ねぎとジューシーな鶏肉。とろっと閉じた卵。かきこむ幸せがここにある。'
                        }
                    }
                ];
            } else if (setIndex === 1) {
                itemsToRender = [
                    { 
                        name: 'ササッと美味しい豚バラねぎ塩丼', 
                        type: 'スピード丼',
                        recipes: {
                            remi: '薄切り豚肉とネギをフライパンで炒めて、塩とごま油と鶏ガラスープの素をジャーッ！ご飯にドカンと盛れば箸が止まらないわよ！',
                            doi: '豚バラ肉とおネギをさっと炒め、お塩と少しのごま油で味付けします。シンプルですがお肉本来の甘みと旨味が引き立ちます。よろしな。',
                            goro: 'ねぎ塩豚丼。ごま油の香ばしさと塩気。これが豚バラのジューシーな油と完璧にマッチして、胃袋を猛烈にノックしてくる。'
                        }
                    },
                    { 
                        name: 'レンジで一発！ツナとキャベツの塩昆布パスタ', 
                        type: 'レンジパスタ',
                        recipes: {
                            remi: 'パスタと水とツナ缶とざく切りキャベツを耐熱容器に入れ、レンジでチン！仕上げに塩昆布とバターを混ぜるだけで超絶旨いパスタの完成よ！',
                            doi: 'お鍋を使わず、レンジでパスタとツナ、キャベツを調理します。仕上げの塩昆布とバターのコクがじんわり馴染んで美味しいですよ。',
                            goro: 'レンジで作る塩昆布パスタ。ツナの旨味とキャベツのシャキッと感、塩昆布の和のコク。手軽だが、胃袋が深く納得する味だ。'
                        }
                    },
                    { 
                        name: '余りカレーで！とろ〜りカレー南蛮うどん', 
                        type: 'あったか麺',
                        recipes: {
                            remi: '昨日のカレーにお出汁と水を足して沸騰させ、うどんを入れて煮るだけ！片栗粉でとろみをつければハッピーカレーうどんよ！',
                            doi: '少し残ったカレーにお出汁を合わせて、うどんを優しく煮込みます。片栗粉でとろみをつけて、お腹がホッとする温かいお味です。',
                            goro: 'カレーうどん。出汁のきいたとろみスープが、うどんのコシにしっかりと絡みつく。この熱々をふーふーすする幸せ。堪らん。'
                        }
                    }
                ];
            } else {
                itemsToRender = [
                    { 
                        name: 'にんにく醤油のガッツリスタミナ豚丼', 
                        type: 'スタミナ丼',
                        recipes: {
                            remi: '豚肉と玉ねぎとにんにくを炒めて、醤油とみりんとお砂糖の甘辛タレを絡めてご飯にドカン！一瞬でスタミナMAXよ！',
                            doi: '豚バラ肉とお野菜を炒め、お醤油とお砂糖、ほんの少しのにんにくで甘辛く仕上げます。お野菜もたっぷり食べられてええんですよ。',
                            goro: 'スタミナ豚丼。にんにく醤油の甘辛だれが絡みついたお肉。これを白飯と一緒にガツガツかきこむ。これこそ男のロマンだ。'
                        }
                    },
                    { 
                        name: 'フライパンで豪快！香ばしソース焼きうどん', 
                        type: 'モチモチ麺',
                        recipes: {
                            remi: 'うどんと余り野菜をフライパンでドカンと炒めて、ソースとお醤油をジャーッ！かつお節をドバッと乗せればあっという間にごちそうよ！',
                            doi: 'うどんとお野菜をフライパンで香ばしく炒め、お醤油ベース of ソースで仕上げます。かつお節の風味がふわっと広がって、優しいお味です。',
                            goro: 'ソース焼きうどん。モチモチのうどんに絡む少し焦げた醤油とソースの芳醇な香り。かつお節の躍動感が、さらに食欲をそそる。'
                        }
                    },
                    { 
                        name: 'ケチャップたっぷり！とろとろオムライス', 
                        type: 'ごちそう洋風',
                        recipes: {
                            remi: 'ご飯と玉ねぎとウィンナーをケチャップで炒めて皿に盛り、半熟のスクランブルエッグをドカンと乗せるだけ！簡単でウルトラハッピーオムライスよ！',
                            doi: 'ケチャップライスを作り、半熟のふんわりとした卵をそっと上に乗せます。ケチャップを少し垂らして、お子さんも本当に喜びます。',
                            goro: 'とろとろオムライス。スプーンを入れると卵の柔らかさが伝わる。ケチャップの酸味とライスの甘みが口いっぱいに広がる。至福だ。'
                        }
                    }
                ];
            }
        } else {
            itemsToRender = proposal.menuOptions;
        }

        // 3択をレンダリングし、アコーディオンイベントをセット
        itemsToRender.forEach((opt, index) => {
            const li = document.createElement('li');
            li.dataset.menuName = opt.name;
            
            // ローカルのモックレシピをデフォルトセット（実機モード起動時はGemini生成レシピで上書きされます）
            CURRENT_SHEET_RECIPES[opt.name] = opt.recipes ? (opt.recipes[STATE.advisorCharacter] || '美味しい作り方はAIにお任せください！') : '美味しい作り方はAIにお任せください！';

            const isFavorite = !!STATE.favoriteRecipes[opt.name];

            li.innerHTML = `
                <div class="option-header-row">
                    <span class="option-name-wrapper">
                        <strong>${escapeHtml(opt.name)}</strong>
                        <span class="option-badge">${escapeHtml(opt.type)}</span>
                    </span>
                    <div class="option-right-actions">
                        <button class="option-star-btn ${isFavorite ? 'active' : ''}" data-menu-name="${escapeHtml(opt.name)}">
                            <i data-lucide="star" style="width:18px; height:18px;"></i>
                        </button>
                        <i data-lucide="chevron-down" class="accordion-arrow-icon"></i>
                    </div>
                </div>
                <div class="recipe-accordion-content" id="recipe-accordion-${index}">
                    <div class="recipe-bubble-wrapper">
                        <div class="recipe-avatar-circle">
                            ${CHARACTERS[STATE.advisorCharacter].avatar}
                        </div>
                        <div class="recipe-speech-bubble">
                            <div class="recipe-box-title">
                                ${CHARACTERS[STATE.advisorCharacter].avatar} ${CHARACTERS[STATE.advisorCharacter].name}直伝レシピ・コツ
                            </div>
                            <div class="recipe-box-text" id="recipe-text-${index}">
                                読み込み中...
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // お気に入りトグルイベント登録
            const starBtn = li.querySelector('.option-star-btn');
            if (starBtn) {
                starBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // アコーディオンの開閉を防ぐ！
                    const isFav = STATE.favoriteRecipes[opt.name];
                    if (isFav) {
                        delete STATE.favoriteRecipes[opt.name];
                        starBtn.classList.remove('active');
                    } else {
                        const recipeText = CURRENT_SHEET_RECIPES[opt.name] || '美味しい作り方はAIにお任せください！';
                        STATE.favoriteRecipes[opt.name] = {
                            date: dateStr,
                            character: STATE.advisorCharacter,
                            recipe: recipeText,
                            type: opt.type,
                            addedAt: Date.now()
                        };
                        starBtn.classList.add('active');
                    }
                    safeLocalStorageSet('menuharmony_favorites', JSON.stringify(STATE.favoriteRecipes));
                });
            }

            // クリック時にスッとアコーディオンを開閉するイベント
            li.addEventListener('click', (e) => {
                // すでに開いている他のアコーディオンを全部閉じる (シングル展開)
                const allContent = optionsList.querySelectorAll('.recipe-accordion-content');
                const allArrows = optionsList.querySelectorAll('.accordion-arrow-icon');
                const myContent = li.querySelector('.recipe-accordion-content');
                const myArrow = li.querySelector('.accordion-arrow-icon');
                const isMyContentOpen = myContent.classList.contains('open');

                allContent.forEach(el => el.classList.remove('open'));
                allArrows.forEach(el => el.classList.remove('open'));

                if (!isMyContentOpen) {
                    // 最新のレシピ文言を注入して開く
                    const textEl = li.querySelector('.recipe-box-text');
                    textEl.textContent = CURRENT_SHEET_RECIPES[opt.name] || '美味しい作り方をお楽しみに！';
                    myContent.classList.add('open');
                    if (myArrow) myArrow.classList.add('open');
                }
            });

            optionsList.appendChild(li);
        });
    }

    updateAdvisorHeader();
    loadAISuggestion(dateStr);

    sheetEl.classList.remove('hidden');
    
    try {
        lucide.createIcons({ root: sheetEl });
    } catch(e) {}
}

/**
 * 現在選択されているキャラクターのヘッダー情報を表示に反映
 */
function updateAdvisorHeader() {
    const charMeta = CHARACTERS[STATE.advisorCharacter];
    document.getElementById('advisor-name').textContent = `${charMeta.name}AI`;
    
    // セグメントコントロール（トグルタブ）のアクティブクラス切り替え
    const switcher = document.getElementById('sheet-character-switcher');
    if (switcher) {
        const buttons = switcher.querySelectorAll('.switcher-tab-btn');
        buttons.forEach(btn => {
            if (btn.dataset.char === STATE.advisorCharacter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

/**
 * AIの夕食アドバイスおよび3択レシピを一括ロード
 */
async function loadAISuggestion(dateStr) {
    const targetDateStr = dateStr;
    const targetCharacter = STATE.advisorCharacter;
    const isCurrent = () => STATE.selectedDateStr === targetDateStr && STATE.advisorCharacter === targetCharacter;

    const cacheKey = `menuharmony_suggest_${targetCharacter}_${targetDateStr}`;
    const cacheRecipesKey = `menuharmony_recipes_${targetCharacter}_${targetDateStr}`;
    
    const cached = localStorage.getItem(cacheKey);
    const cachedRecipes = safeJsonParse(cacheRecipesKey, null);

    const textEl = document.getElementById('ai-suggestion-text');
    const loadingEl = document.getElementById('ai-loading');

    // キャッシュがあれば超高速ロード
    if (cached) {
        if (!isCurrent()) return;
        textEl.innerHTML = `<p>${formatAISuggestionMarkdown(cached)}</p>`;
        textEl.classList.remove('hidden');
        loadingEl.classList.add('hidden');
        
        if (cachedRecipes) {
            Object.keys(cachedRecipes).forEach(name => {
                CURRENT_SHEET_RECIPES[name] = cachedRecipes[name];
            });
        }
        return;
    }

    if (!isCurrent()) return;
    textEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');

    try {
        const nursery = STATE.nurseryMenu[targetDateStr] || '登録なし';
        const school = STATE.schoolMenu[targetDateStr] || '登録なし';
        const overlaps = scanDateForOverlaps(targetDateStr);
        const proposal = STATE.proposedDinners[targetDateStr];

        // サーバーレスAPIに接続して実機動作を試みます
        try {
            // --- A. 実機用：サーバーレスAPI経由でGemini API呼び出し（アドバイスセリフ＆オリジナル3択JSON版） ---
            const prompt = buildAdvisorPrompt(targetDateStr, nursery, school, overlaps, proposal);
            const responseText = await callGeminiAPI(prompt);
            
            if (!isCurrent()) return;

            let suggestionStr = responseText;
            let recipesObj = {};

            try {
                const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonParsed = JSON.parse(cleanJsonText);
                
                if (jsonParsed.advice) {
                    suggestionStr = jsonParsed.advice;
                }
                
                // --- 新仕様：オリジナルメニューをその場でAIが創作してカレンダー＆詳細シートを完全上書き！ ---
                if (jsonParsed.menuOptions && jsonParsed.menuOptions.length === 3) {
                    // カレンダー提案データを上書き保存して、ローカルキャッシュに永続化！
                    STATE.proposedDinners[targetDateStr].menuOptions = jsonParsed.menuOptions.map(opt => ({
                        name: opt.name,
                        type: opt.type
                    }));
                    
                    // ローカルストレージにカレンダーキャッシュを保存！
                    safeLocalStorageSet('menuharmony_proposed_dinners', JSON.stringify(STATE.proposedDinners));
                    
                    // レシピオブジェクトを生成
                    jsonParsed.menuOptions.forEach(opt => {
                        recipesObj[opt.name] = opt.recipe;
                        CURRENT_SHEET_RECIPES[opt.name] = opt.recipe;
                    });
                    safeLocalStorageSet(cacheRecipesKey, JSON.stringify(recipesObj));
                    
                    // 料理選択肢リストの表示（DOM）も新しく生まれたオリジナル料理にリアルタイムで即時更新！
                    const optionsList = document.getElementById('sheet-menu-options-list');
                    if (optionsList && isCurrent()) {
                        optionsList.innerHTML = '';
                        jsonParsed.menuOptions.forEach((opt, index) => {
                            const li = document.createElement('li');
                            li.dataset.menuName = opt.name;
                            
                            // レシピテキストをその場で登録（アコーディオンが開いたときに参照されます）
                            CURRENT_SHEET_RECIPES[opt.name] = opt.recipe;

                            const isFavorite = !!STATE.favoriteRecipes[opt.name];

                            li.innerHTML = `
                                <div class="option-header-row">
                                    <span class="option-name-wrapper">
                                        <strong>${escapeHtml(opt.name)}</strong>
                                        <span class="option-badge">${escapeHtml(opt.type)}</span>
                                    </span>
                                    <div class="option-right-actions">
                                        <button class="option-star-btn ${isFavorite ? 'active' : ''}" data-menu-name="${escapeHtml(opt.name)}">
                                            <i data-lucide="star" style="width:18px; height:18px;"></i>
                                        </button>
                                        <i data-lucide="chevron-down" class="accordion-arrow-icon"></i>
                                    </div>
                                </div>
                                <div class="recipe-accordion-content" id="recipe-accordion-${index}">
                                    <div class="recipe-bubble-wrapper">
                                        <div class="recipe-avatar-circle">
                                            ${CHARACTERS[STATE.advisorCharacter].avatar}
                                        </div>
                                        <div class="recipe-speech-bubble">
                                            <div class="recipe-box-title">
                                                ${CHARACTERS[STATE.advisorCharacter].avatar} ${CHARACTERS[STATE.advisorCharacter].name}直伝レシピ・コツ
                                            </div>
                                            <div class="recipe-box-text" id="recipe-text-${index}">
                                                ${formatAISuggestionMarkdown(opt.recipe)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;

                            // お気に入りトグルイベント登録
                            const starBtn = li.querySelector('.option-star-btn');
                            if (starBtn) {
                                starBtn.addEventListener('click', (e) => {
                                    e.stopPropagation(); // アコーディオンの開閉を防ぐ！
                                    const isFav = STATE.favoriteRecipes[opt.name];
                                    if (isFav) {
                                        delete STATE.favoriteRecipes[opt.name];
                                        starBtn.classList.remove('active');
                                    } else {
                                        const recipeText = CURRENT_SHEET_RECIPES[opt.name] || '美味しい作り方はAIにお任せください！';
                                        STATE.favoriteRecipes[opt.name] = {
                                            date: targetDateStr,
                                            character: STATE.advisorCharacter,
                                            recipe: recipeText,
                                            type: opt.type,
                                            addedAt: Date.now()
                                        };
                                        starBtn.classList.add('active');
                                    }
                                    safeLocalStorageSet('menuharmony_favorites', JSON.stringify(STATE.favoriteRecipes));
                                });
                            }
                            
                            // アコーディオンのクリック開閉処理を完全に一本化して再バインド
                            li.addEventListener('click', (e) => {
                                const allContent = optionsList.querySelectorAll('.recipe-accordion-content');
                                const allArrows = optionsList.querySelectorAll('.accordion-arrow-icon');
                                const myContent = li.querySelector('.recipe-accordion-content');
                                const myArrow = li.querySelector('.accordion-arrow-icon');
                                const isMyContentOpen = myContent.classList.contains('open');

                                allContent.forEach(el => el.classList.remove('open'));
                                allArrows.forEach(el => el.classList.remove('open'));

                                if (!isMyContentOpen) {
                                    myContent.classList.add('open');
                                    if (myArrow) myArrow.classList.add('open');
                                }
                            });
                            
                            optionsList.appendChild(li);
                        });
                        try { lucide.createIcons({ root: optionsList }); } catch(e) {}
                    }
                }
            } catch (jsonErr) {
                console.warn("Geminiの返答JSONパースエラー。通常のテキストとして処理します:", jsonErr);
            }
            
            safeLocalStorageSet(cacheKey, suggestionStr);
            if (isCurrent()) {
                textEl.innerHTML = `<p>${formatAISuggestionMarkdown(suggestionStr)}</p>`;
            }
        } catch (apiError) {
            // サーバー側にキーがない、あるいはローカル開発環境などの場合は、自動的にデモモードに安全にフォールバックします
            console.info('実機AIモードが利用できないため、自動的にデモモードで起動します:', apiError.message);
            
            // --- B. デモモード（150〜200文字の短文フレキシブルセリフ） ---
            await new Promise(resolve => setTimeout(resolve, 400));
            if (!isCurrent()) return;

            const mockText = generateOptimizedMockSuggestion(targetCharacter, targetDateStr, nursery, school, overlaps, proposal);
            
            safeLocalStorageSet(cacheKey, mockText);
            if (isCurrent()) {
                textEl.innerHTML = `<p>${formatAISuggestionMarkdown(mockText)}</p>`;
            }
        }
    } catch (error) {
        console.error('AIアドバイスの生成処理全体で致命的なエラーが発生しました:', error);
        if (isCurrent()) {
            textEl.innerHTML = `<p style="color:var(--danger)">AI提案の生成に失敗しました。しばらく時間をおいてお試しください。</p>`;
        }
    } finally {
        if (isCurrent()) {
            textEl.classList.remove('hidden');
            loadingEl.classList.add('hidden');
            renderCalendarList();
        }
    }
}

/**
 * AIアドバイザー用の指示プロンプトを作成する（レシピ同時JSON出力仕様）
 */
function buildAdvisorPrompt(dateStr, nursery, school, overlaps, proposal) {
    const charMeta = CHARACTERS[STATE.advisorCharacter];
    const date = parseLocalDate(dateStr);
    const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日`;

    let overlapCtx = '';
    if (overlaps.length > 0) {
        overlapCtx = `【昼の給食との被り・類似メニュー警告】\n` + overlaps.map(o => `- ${o.message}`).join('\n');
    } else {
        overlapCtx = '特に被りや接近するメニューはありません。';
    }

    return `
システム設定：
${charMeta.prompt}

状況データ：
- 日付: ${formattedDate}
- 今夜のメイン食材: ${proposal.proteinName}
- 今夜の合わせる常備野菜: ${proposal.veggieName}
- お昼の給食（保育園: "${nursery}" / 小学校: "${school}"）
- 周辺給食との被り警告: ${overlapCtx}

タスク：
今夜のメイン食材「${proposal.proteinName}」と常備野菜「${proposal.veggieName}」を主役に使い、お昼の給食メニュー（"${nursery}", "${school}"）や警告内容と100%被らず、類似もしない、子供（保育園・小学生）が最高に喜ぶ【夕食のオリジナル創作メニュー of AIの料理知識から新しく考えてその場で提案してください！
固定観念にとらわれず、楽しそうで魅力的なオリジナル料理名をその場で自由に名付けてください。

出力指示：
必ず以下のJSONフォーマットでのみ出力してください。他の解説文やマークダウン囲み等は一切不要です。

{
  "advice": "ここに\${charMeta.name}の口調で、メイン食材「\${proposal.proteinName}」と野菜「\${proposal.veggieName}」の今夜の組み合わせの素晴らしさを語り、その場で新しく考えた3つのオリジナル料理を提案して『タップすると詳しい作り方を教えるよ』と呼びかける150〜200文字程度の短いアドバイス文章を記述してください（改行は \\n を使用）。",
  "menuOptions": [
    {
      "name": "その場で新しく考えたオリジナル料理名1",
      "type": "スピード丼 や ワンパン料理 などのジャンル名（8文字以内）",
      "recipe": "ここに\${charMeta.name}の口調で、このオリジナル料理の「超簡単な作り方（時短ステップ）」や「驚くほど美味しくなる隠し味・プロの裏技」を80〜100文字以内で簡潔に語る文章を記述してください。"
    },
    {
      "name": "その場で新しく考えたオリジナル料理名2",
      "type": "ジャンル名（8文字以内）",
      "recipe": "同上。超簡単な作り方・コツを80〜100文字以内で記述してください。"
    },
    {
      "name": "その場で新しく考えたオリジナル料理名3",
      "type": "ジャンル名（8文字以内）",
      "recipe": "同上。超簡単な作り方・コツを80〜100文字以内で記述してください。"
    }
  ]
}
`
}


async function callGeminiAPI(prompt) {
    // A. 手動キーがブラウザに登録されている場合は、直接Google APIに問い合わせる (Netlify/ローカル簡易テスト用)
    if (STATE.apiKey) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${STATE.apiKey}`;
        const requestBody = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 800,
                responseMimeType: "application/json"
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Gemini API直接呼び出しエラー');
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'アドバイスを取得できませんでした。';
    }

    // B. キーが未設定なら、本番環境用のセキュアなサーバーレスAPIを呼び出す (ご友人・本番公開用)
    const endpoint = '/api/gemini';
    const requestBody = {
        prompt: prompt
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gemini API呼び出しエラー');
    }

    const data = await response.json();
    return data.text || 'アドバイスを取得できませんでした。';
}

/**
 * 【超最適化された動的モック提案生成エンジン（夕食主役・短文3択版）】
 */
function generateOptimizedMockSuggestion(character, dateStr, nursery, school, overlaps, proposal) {
    if (!proposal) return '美味しい夕食を提案します。';

    const menu1 = proposal.isEasy ? 'そぼろ丼' : proposal.menuOptions[0].name;
    const menu2 = proposal.isEasy ? '釜玉うどん' : proposal.menuOptions[1].name;
    const menu3 = proposal.isEasy ? '親子丼' : proposal.menuOptions[2].name;

    if (character === 'remi') {
        if (proposal.isEasy) {
            return `がんばる平日の夜ね！今夜は超〜ラクして「そぼろ丼」か「釜玉うどん」か、ワンパン「親子丼」にしちゃいなさい！どれも包丁いらずでダダダッとできて超美味しいから大丈夫！メニューをタップすると、私の超時短レシピを教えてあげるわよ！好きなのをドカンと選んじゃいなさい！`;
        }

        return `今夜は「${proposal.proteinName}」と冷蔵庫の「${proposal.veggieName}」の最高のタッグよ！
濃厚な「${menu1}」もいいし、さっぱり「${menu2}」や甘口で子供が大喜びする「${menu3}」も超〜おすすめ！メニューをタップすると、私の特製レシピを教えてあげるわよ！好きなのをドカンと選んじゃいなさい！`;
    }

    if (character === 'doi') {
        if (proposal.isEasy) {
            return `毎日本当によく頑張ってはりますよ。今夜は無理せんと、お腹に優しい「親子丼」や温かい「きつねうどん」、「卵雑炊」にいたしましょう。メニューをタップしていただければ、私から簡単な作り方をお話しします。肩の力を抜いて、よろしな。`;
        }

        return `今夜は「${proposal.proteinName}」と、冷蔵庫の「${proposal.veggieName}」の組み合わせですねぇ。
定番の「${menu1}」も美味しいですし、あっさりした「${menu2}」や「${menu3}」も本当におすすめですよ。メニューをタップしていただければ、私から簡単な作り方やコツをお話しします。無理せず一つ作ればええんですよ。`;
    }

    if (character === 'goro') {
        if (proposal.isEasy) {
            return `ふーむ、戦う平日の夜だ。少し胃袋を休めてやりたい。
今夜は手軽に「親子丼」や「牛丼」、「焼きうどん」でサラッと流すのが正解だ。メニューをタップすると、俺の胃袋が求める簡単レシピが思い浮かぶぞ。焦るんじゃない、こういうシンプルなのでいいんだよ、こういうので。`;
        }

        return `今夜の俺の胃袋は「${proposal.proteinName}」と「${proposal.veggieName}」を求めている。
ごちそう感のある「${menu1}」に挑むか、さっぱり「${menu2}」で流すか、子供も喜ぶ「${menu3}」をハフハフ頬張るか。メニューをタップすると、俺の脳内に最高のレシピが浮かぶぞ。あぁ、どれを選んでも間違いなく白飯の相棒だ。`;
    }

    return '美味しい夕食を提案します。';
}

/**
 * 簡易的にマークダウン的な表現（**太字**など）をHTMLに置換する
 */
function formatAISuggestionMarkdown(text) {
    if (!text) return '';
    // XSS対策：まずHTML特殊文字をエスケープする
    const escaped = escapeHtml(text);
    return escaped
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

// --------------------------------------------------------------------------
// 6. Gemini API OCR 解析 (献立写真の解析)
// --------------------------------------------------------------------------

/**
 * アップロードされた画像ファイルを読み込み、Gemini APIでOCR解析を実行する
 */
async function analyzeMenuPhoto(file) {
    showLoadingOverlay('AIが献立表の写真を解析中...\n(約10〜20秒かかります)');

    const btnAnalyze = document.getElementById('btn-analyze-menu');
    const btnAnalyzeSpan = btnAnalyze ? btnAnalyze.querySelector('span') : null;

    // 解析中はボタンを非活性化し、ローディング中であることを明示して多重送信を完全に防ぐ！
    if (btnAnalyze) {
        btnAnalyze.disabled = true;
    }
    if (btnAnalyzeSpan) {
        btnAnalyzeSpan.textContent = '解析中...';
    }

    try {
        // 【大容量画像対策】スマホのカメラで撮影した写真は極めて大容量（数MB〜12MB以上）なため、
        // そのままBase64化するとブラウザのメモリが圧迫されてフリーズやクラッシュ（ボタンが反応しなくなるバグ）を引き起こします。
        // ここでCanvasを用いて最大幅1024pxにスマートリサイズ＆JPEG軽量圧縮を行ってから送信します！
        const base64Data = await compressImage(file, 1024, 0.7);
        const mimeType = 'image/jpeg'; // リサイズ圧縮時にJPEG形式に統一

        const monthSelect = document.getElementById('upload-month-select');
        let year = STATE.currentDate.getFullYear();
        let month = STATE.currentDate.getMonth() + 1;
        if (monthSelect) {
            const [selYear, selMonth] = monthSelect.value.split('-').map(Number);
            year = selYear;
            month = selMonth;
        }
        const targetTypeLabel = STATE.activeUploadTarget === 'nursery' ? '保育園' : '小学校';

        const prompt = `
あなたは非常に優秀な学校・保育園の献立表のOCR解析システムです。
アップロードされた画像は「${targetTypeLabel}の給食表」です。
画像から「日付」と「給食メニュー」を正確に抽出して、以下のJSON配列フォーマットでのみ出力してください。余分な解説やマークダウンの囲み(\`\`\`json 等)は一切出力しないでください。

【最重要：難読・特殊レイアウトの解析指示】
1. 画像の回転対応：
   画像が横向き、または逆さまに回転している場合があります。文字が横書きか縦書きかを注意深く判別し、正しい向きに頭の中で回転させてから、一文字ずつ丁寧に文字起こししてください。
   
2. 日付の併記・まとめ形式への対応（超重要！）：
   日付の欄に「11・25」「12-26」「13・27」「14/28」のように、【点やスラッシュで繋がれた2つの数字】が1つの枠に書かれている場合があります。
   これは「11日と25日の両方に、同じメニューが出る」という意味です。
   「11月25日」などの間違った日付には絶対に変換しないでください！
   このような併記を見つけた場合は、必ず【それぞれの日付に個別に分割して】JSONデータを出力してください。
   （例：「11・25」でメニューが「豚汁, 唐揚げ」の場合、
   "date": "${year}-${String(month).padStart(2, '0')}-11", "menu": "豚汁, 唐揚げ" のオブジェクトと、
   "date": "${year}-${String(month).padStart(2, '0')}-25", "menu": "豚汁, 唐揚げ" のオブジェクトの2つに分解して、配列の中に並べて出力してください。）

3. 出力仕様：
   - JSON配列。各オブジェクトは "date" と "menu" キーを持ちます。
   - "date" は必ず "YYYY-MM-DD" 形式にしてください。
   - 解析対象の年月は「${year}年${month}月」です。画像内の「11日」「25」などの日付を、この年月に基づいて "YYYY-MM-DD" に変換してください。
   - "menu" は給食の主要なメインおかずや主食を抽出してください（例: 「ハンバーグ, ポテトサラダ, 味噌汁」）。あまりに細かい調味料や「牛乳」などは除外するか簡略化してください。

出力例（「11・25」のように併記されている場合の分解イメージ）：
[
  { "date": "${year}-${String(month).padStart(2, '0')}-11", "menu": "豚汁, 唐揚げ" },
  { "date": "${year}-${String(month).padStart(2, '0')}-25", "menu": "豚汁, 唐揚げ" }
]
`;

        let responseText = '';

        // A. 手動キーが登録されている場合は、直接Google APIでOCR解析する (Netlifyテスト用)
        if (STATE.apiKey) {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${STATE.apiKey}`;
            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64Data.split(',')[1]
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json"
                }
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('Gemini API直接解析エラー');
            }

            const data = await response.json();
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } else {
            // B. キーが未設定なら、本番用のサーバーレスAPIを叩く
            const endpoint = '/api/gemini';
            const requestBody = {
                prompt: prompt,
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data.split(',')[1]
                }
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gemini API解析エラー');
            }

            const data = await response.json();
            responseText = data.text; // サーバーレス側のレスポンス形式
        }
        
        if (!responseText) {
            throw new Error('解析結果が空でした');
        }

        let parsedData = [];
        try {
            parsedData = JSON.parse(responseText.trim());
        } catch (e) {
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedData = JSON.parse(cleanText);
        }

        if (!Array.isArray(parsedData)) {
            throw new Error('パースされたデータが配列ではありません');
        }

        hideLoadingOverlay();
        closeModal('modal-upload');
        openOcrPreviewModal(parsedData);

    } catch (error) {
        console.error('写真解析に失敗しました:', error);
        hideLoadingOverlay();
        
        const errMsg = (error.message || '').toLowerCase();
        const rawErrorStr = error.toString();
        
        if (errMsg.includes('limit') || errMsg.includes('quota') || errMsg.includes('exhausted') || errMsg.includes('429') || errMsg.includes('reached')) {
            alert('【Gemini API無料枠の制限に達しました 🚨】\nGoogle AI Studioの1日の無料リクエスト上限（Daily Limit）に達した可能性があります。\n\n💡 すぐに解決する裏ワザ：\n別のGoogleアカウント（別のGmailアドレスなど）で「Google AI Studio」にログインし、新しくAPIキーを作成して設定画面⚙️に登録し直すだけで、今すぐテストを再開できます！');
        } else {
            // エラー原因を即座に特定できるように、詳細エラー内容をポップアップに明記！
            alert(`写真の解析に失敗しました。画像の文字が不鮮明か、設定エラーの可能性があります。\n\n🔍 エラー詳細:\n${rawErrorStr}\n\n💡 解決のヒント:\n1. ⚙️設定画面で新しいAPIキーを入力した後、必ず【設定を保存する】ボタンをタップして保存されたかご確認ください。\n2. コピーしたキーの前後に余分なスペースや改行が入っていないかご確認ください。\n3. Netlify Drop環境（簡易デプロイ）ではAPIキーが未登録の場合、画像の解析は動作しません。必ずご自身のキーをご登録ください。`);
        }
    } finally {
        // エラー発生時、または正常完了した際にも確実に解析ボタンのdisabledを解除し、
        // ユーザーが何回でも「解析」をやり直せるように完全にバグを防ぎます！
        if (btnAnalyze) {
            btnAnalyze.disabled = false;
        }
        if (btnAnalyzeSpan) {
            btnAnalyzeSpan.textContent = 'AIで写真を解析する';
        }
    }
}

/**
 * AIが解析した結果の確認・編集モーダルを開く
 * @param {array} parsedData [{date: 'YYYY-MM-DD', menu: '...'}]
 */
function openOcrPreviewModal(parsedData) {
    const listContainer = document.getElementById('ocr-edit-list');
    listContainer.innerHTML = '';

    const sortedData = parsedData
        .filter(item => {
            if (!item.date || !item.menu) return false;
            const date = parseLocalDate(item.date);
            const day = date.getDay();
            return day !== 0 && day !== 6; // 土日除外
        })
        .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));

    if (sortedData.length === 0) {
        listContainer.innerHTML = '<p class="empty-text">解析された有効な献立データがありません。手動で追加してください。</p>';
    } else {
        sortedData.forEach((item, index) => {
            const date = parseLocalDate(item.date);
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
            
            const itemEl = document.createElement('div');
            itemEl.className = 'ocr-edit-item';
            itemEl.innerHTML = `
                <div class="ocr-item-header">
                    <span class="ocr-item-date">${formattedDate} の献立</span>
                    <button class="btn-remove-ocr-item" data-index="${index}"><i data-lucide="trash-2" style="width:12px;height:12px;"></i> 削除</button>
                </div>
                <input type="hidden" class="ocr-input-date" value="${escapeHtml(item.date)}">
                <input type="text" class="text-input ocr-input-menu" value="${escapeHtml(item.menu)}" placeholder="メニューを入力してください">
            `;
            
            itemEl.querySelector('.btn-remove-ocr-item').addEventListener('click', (e) => {
                const btn = e.currentTarget;
                btn.closest('.ocr-edit-item').remove();
            });

            listContainer.appendChild(itemEl);
        });
    }

    try { lucide.createIcons({ root: document.getElementById('modal-preview-edit') }); } catch(e) {}
    openModal('modal-preview-edit');
}

/**
 * プレビュー画面からカレンダーに確定保存する
 */
function saveOcrDataToCalendar() {
    const items = document.querySelectorAll('.ocr-edit-item');
    const menuTarget = STATE.activeUploadTarget;
    const targetStorage = menuTarget === 'nursery' ? STATE.nurseryMenu : STATE.schoolMenu;

    items.forEach(item => {
        const dateStr = item.querySelector('.ocr-input-date').value;
        const menuVal = item.querySelector('.ocr-input-menu').value.trim();

        if (dateStr && menuVal) {
            targetStorage[dateStr] = menuVal;
            clearAiSuggestionCacheForDate(dateStr);
        }
    });

    if (menuTarget === 'nursery') {
        safeLocalStorageSet('menuharmony_nursery_menu', JSON.stringify(STATE.nurseryMenu));
    } else {
        safeLocalStorageSet('menuharmony_school_menu', JSON.stringify(STATE.schoolMenu));
    }

    closeModal('modal-preview-edit');
    renderCalendarList();
    if (STATE.activeTab === 'shopping') {
        renderShoppingListView();
    }
    alert('献立データを登録しました！');
}

/**
 * 特定の日にちに関連するAI提案キャッシュをクリアする
 */
function clearAiSuggestionCacheForDate(dateStr) {
    ['remi', 'doi', 'goro'].forEach(char => {
        localStorage.removeItem(`menuharmony_suggest_${char}_${dateStr}`);
        localStorage.removeItem(`menuharmony_recipes_${char}_${dateStr}`);
    });
    
    // その日の夕食提案データもクリアして、新しい給食メニューで再計算できるようにする
    if (STATE.proposedDinners[dateStr]) {
        delete STATE.proposedDinners[dateStr];
        safeLocalStorageSet('menuharmony_proposed_dinners', JSON.stringify(STATE.proposedDinners));
    }
}

// --------------------------------------------------------------------------
// 7. EVENT LISTENERS & INITIALIZATION
// --------------------------------------------------------------------------

function setupEventListeners() {
    const tabCalendar = document.getElementById('tab-calendar');
    const tabShopping = document.getElementById('tab-shopping');
    const calendarListView = document.getElementById('calendar-list');
    const shoppingListView = document.getElementById('shopping-list-view');

    const tabFavorites = document.getElementById('tab-favorites');
    const favoritesListView = document.getElementById('favorites-list-view');

    tabCalendar.addEventListener('click', () => {
        STATE.activeTab = 'calendar';
        tabCalendar.classList.add('active');
        tabShopping.classList.remove('active');
        if (tabFavorites) tabFavorites.classList.remove('active');
        calendarListView.classList.remove('hidden');
        shoppingListView.classList.add('hidden');
        if (favoritesListView) favoritesListView.classList.add('hidden');
        renderCalendarList();
    });

    tabShopping.addEventListener('click', () => {
        STATE.activeTab = 'shopping';
        tabShopping.classList.add('active');
        tabCalendar.classList.remove('active');
        if (tabFavorites) tabFavorites.classList.remove('active');
        shoppingListView.classList.remove('hidden');
        calendarListView.classList.add('hidden');
        if (favoritesListView) favoritesListView.classList.add('hidden');
        renderShoppingListView();
    });

    if (tabFavorites) {
        tabFavorites.addEventListener('click', () => {
            STATE.activeTab = 'favorites';
            tabFavorites.classList.add('active');
            tabCalendar.classList.remove('active');
            tabShopping.classList.remove('active');
            if (favoritesListView) favoritesListView.classList.remove('hidden');
            calendarListView.classList.add('hidden');
            shoppingListView.classList.add('hidden');
            renderFavoritesListView();
        });
    }

    document.getElementById('btn-settings').addEventListener('click', () => {
        document.getElementById('input-api-key').value = STATE.apiKey;
        const radio = document.querySelector(`input[name="advisor-character"][value="${STATE.advisorCharacter}"]`);
        if (radio) radio.checked = true;
        
        openModal('modal-settings');
    });
    
    document.getElementById('btn-close-settings').addEventListener('click', () => closeModal('modal-settings'));
    
    document.getElementById('btn-save-settings').addEventListener('click', () => {
        const key = document.getElementById('input-api-key').value.trim();
        const character = document.querySelector('input[name="advisor-character"]:checked').value;

        STATE.apiKey = key;
        STATE.advisorCharacter = character;

        safeLocalStorageSet('gemini_api_key', key);
        safeLocalStorageSet('gemini_advisor_character', character);

        closeModal('modal-settings');
        
        if (STATE.activeTab === 'calendar') {
            renderCalendarList();
        } else {
            renderShoppingListView();
        }
        alert('設定を保存しました。');
    });

    document.getElementById('btn-toggle-api-key').addEventListener('click', () => {
        const input = document.getElementById('input-api-key');
        const icon = document.querySelector('#btn-toggle-api-key i');
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            if (icon) icon.setAttribute('data-lucide', 'eye');
        }
        const toggleBtn = document.getElementById('btn-toggle-api-key');
        try { lucide.createIcons({ root: toggleBtn }); } catch(e) {}
    });

    document.getElementById('btn-clear-data').addEventListener('click', () => {
        if (confirm('登録済みの給食献立データ、およびAI提案キャッシュを全てクリアします。よろしいですか？')) {
            STATE.nurseryMenu = {};
            STATE.schoolMenu = {};
            STATE.proposedDinners = {};
            localStorage.removeItem('menuharmony_nursery_menu');
            localStorage.removeItem('menuharmony_school_menu');
            localStorage.removeItem('menuharmony_proposed_dinners');
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('menuharmony_suggest_') || key.startsWith('menuharmony_recipes_'))) {
                    localStorage.removeItem(key);
                    i--;
                }
            }

            if (STATE.activeTab === 'calendar') {
                renderCalendarList();
            } else {
                renderShoppingListView();
            }
            closeModal('modal-settings');
            alert('データを消去しました。');
        }
    });

    document.getElementById('btn-load-demo').addEventListener('click', () => {
        STATE.nurseryMenu = { ...DEMO_NURSERY_MENU };
        STATE.schoolMenu = { ...DEMO_SCHOOL_MENU };
        STATE.proposedDinners = {};

        safeLocalStorageSet('menuharmony_nursery_menu', JSON.stringify(STATE.nurseryMenu));
        safeLocalStorageSet('menuharmony_school_menu', JSON.stringify(STATE.schoolMenu));
        localStorage.removeItem('menuharmony_proposed_dinners');

        STATE.currentDate = new Date(2026, 4, 29); // 2026年5月

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('menuharmony_suggest_') || key.startsWith('menuharmony_recipes_'))) {
                localStorage.removeItem(key);
                i--;
            }
        }

        if (STATE.activeTab === 'calendar') {
            renderCalendarList();
        } else {
            renderShoppingListView();
        }
        closeModal('modal-settings');
        alert('2026年5月のデモデータを読み込みました！カレンダーの日付をタップしてAIアドバイスをお試しください。');
    });

    document.getElementById('btn-prev-month').addEventListener('click', () => {
        STATE.currentDate.setMonth(STATE.currentDate.getMonth() - 1);
        updateMonthLabel();
        if (STATE.activeTab === 'calendar') {
            renderCalendarList();
        } else if (STATE.activeTab === 'shopping') {
            renderShoppingListView();
        }
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
        STATE.currentDate.setMonth(STATE.currentDate.getMonth() + 1);
        updateMonthLabel();
        if (STATE.activeTab === 'calendar') {
            renderCalendarList();
        } else if (STATE.activeTab === 'shopping') {
            renderShoppingListView();
        }
    });

    const btnUploadNurserySettings = document.getElementById('btn-upload-nursery-settings');
    const btnUploadSchoolSettings = document.getElementById('btn-upload-school-settings');
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input-menu');
    const btnAnalyze = document.getElementById('btn-analyze-menu');

    btnUploadNurserySettings.addEventListener('click', () => {
        closeModal('modal-settings');
        STATE.activeUploadTarget = 'nursery';
        document.getElementById('upload-modal-title').textContent = '保育園の献立登録';
        openUploadModal();
    });

    btnUploadSchoolSettings.addEventListener('click', () => {
        closeModal('modal-settings');
        STATE.activeUploadTarget = 'school';
        document.getElementById('upload-modal-title').textContent = '小学校の献立登録';
        openUploadModal();
    });

    document.getElementById('btn-close-upload').addEventListener('click', () => closeModal('modal-upload'));

    function openUploadModal() {
        resetUploadModal();
        
        // 対象年月のドロップダウンを動的に生成
        const monthSelect = document.getElementById('upload-month-select');
        if (monthSelect) {
            monthSelect.innerHTML = '';
            const currYear = STATE.currentDate.getFullYear();
            const currMonth = STATE.currentDate.getMonth();
            
            // 前月、当月、翌月の3ヶ月分の選択肢を生成
            for (let i = -1; i <= 1; i++) {
                const tempDate = new Date(currYear, currMonth + i, 1);
                const y = tempDate.getFullYear();
                const m = tempDate.getMonth() + 1;
                const opt = document.createElement('option');
                opt.value = y + '-' + m;
                opt.textContent = y + '年 ' + m + '月';
                if (i === 0) opt.selected = true;
                monthSelect.appendChild(opt);
            }
        }
        
        openModal('modal-upload');
    }

    function resetUploadModal() {
        dropzone.classList.remove('hidden');
        document.getElementById('upload-preview-container').classList.add('hidden');
        document.getElementById('image-preview').src = '';
        fileInput.value = '';
        btnAnalyze.disabled = true;
        STATE.selectedUploadFile = null; // ファイルをクリア

        const warning = document.getElementById('upload-api-warning');
        warning.classList.add('hidden'); // サーバーレスで動作するため、警告は常時非表示
    }

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleSelectedFile(file);
        }
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleSelectedFile(file);
        }
    });

    function handleSelectedFile(file) {
        STATE.selectedUploadFile = file; // グローバルに保存し、確実に追跡
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-preview').src = e.target.result;
            dropzone.classList.add('hidden');
            document.getElementById('upload-preview-container').classList.remove('hidden');
            btnAnalyze.disabled = false; // サーバー側で処理可能なため、常に活性化

            // 【超重要】ファイル入力部品の値を読み込み直後にクリアしておくことで、
            // ユーザーが一度失敗した後に「全く同じ写真ファイル」を再度選択した際にも、
            // ブラウザ側でchangeイベントが確実に発火し、ボタンが再度活性化するバグ防止の徹底を施します！
            fileInput.value = '';
        };
        reader.readAsDataURL(file);
    }

    document.getElementById('btn-remove-image').addEventListener('click', (e) => {
        e.stopPropagation();
        resetUploadModal();
    });

    btnAnalyze.addEventListener('click', () => {
        if (STATE.selectedUploadFile) {
            analyzeMenuPhoto(STATE.selectedUploadFile);
        }
    });

    document.getElementById('btn-close-preview').addEventListener('click', () => closeModal('modal-preview-edit'));
    document.getElementById('btn-save-ocr-data').addEventListener('click', saveOcrDataToCalendar);

    document.getElementById('btn-close-sheet').addEventListener('click', () => {
        document.getElementById('sheet-suggestion').classList.add('hidden');
    });

    document.querySelector('.sheet-overlay').addEventListener('click', () => {
        document.getElementById('sheet-suggestion').classList.add('hidden');
    });

    const switcher = document.getElementById('sheet-character-switcher');
    if (switcher) {
        switcher.addEventListener('click', (e) => {
            const btn = e.target.closest('.switcher-tab-btn');
            if (btn) {
                const char = btn.dataset.char;
                STATE.advisorCharacter = char;
                safeLocalStorageSet('gemini_advisor_character', char);
                
                updateAdvisorHeader();
                loadAISuggestion(STATE.selectedDateStr);
            }
        });
    }
}

// --------------------------------------------------------------------------
// 8. HELPERS & UTILITIES
// --------------------------------------------------------------------------

function formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function weekdayClassFromDay(dayOfWeek) {
    const weekdayClasses = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return weekdayClasses[dayOfWeek];
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function showLoadingOverlay(text) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoadingOverlay() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * 【スマホ実機テスト超安定化ロジック】
 * スマートフォンのカメラ画像はサイズが巨大（5〜12MB以上）でメモリ破壊やフリーズを起こしやすいため、
 * クライアントサイドのCanvas技術で最大幅1024pxにスマートリサイズし、
 * JPEG形式として適度に高画質圧縮（品質0.7）されたBase64文字列（data:image/jpeg;base64,...）を出力します。
 * これにより、スマホ端末のフリーズ or クラッシュを100%回避し、かつ通信時間も激減させて超快適に動作させます。
 */
function compressImage(file, maxWidth = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // アスペクト比を完璧に保ちながら最大幅制限に収まるように計算
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // JPEGとして圧縮品質を指定してBase64で出力
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = (err) => {
                console.error("画像読み込みエラー:", err);
                reject(err);
            };
        };
        reader.onerror = (err) => {
            console.error("ファイル読み込みエラー:", err);
            reject(err);
        };
    });
}

function updateDemoBadge() {
    const badge = document.getElementById('demo-mode-badge');
    const isDemo = !STATE.apiKey;
    if (badge) {
        if (isDemo) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// --------------------------------------------------------------------------
// 8.5 LUNCH MANUAL INLINE EDITORS (手動給食編集機能＆AIアドバイス連動再生成)
// --------------------------------------------------------------------------
function setupLunchInlineEditors() {
    const btnEditNursery = document.getElementById('btn-edit-nursery');
    const btnSaveNursery = document.getElementById('btn-save-nursery');
    const btnEditSchool = document.getElementById('btn-edit-school');
    const btnSaveSchool = document.getElementById('btn-save-school');

    if (btnEditNursery) {
        btnEditNursery.addEventListener('click', (e) => {
            e.stopPropagation(); // シート全体のクリックイベント等への伝播を防ぐ
            const wrapper = document.getElementById('edit-nursery-wrapper');
            const menuText = document.getElementById('sheet-nursery-menu');
            const input = document.getElementById('input-edit-nursery');
            if (wrapper && menuText && input) {
                input.value = STATE.nurseryMenu[STATE.selectedDateStr] || '';
                menuText.classList.add('hidden');
                wrapper.classList.remove('hidden');
                input.focus();
            }
        });
    }

    if (btnSaveNursery) {
        btnSaveNursery.addEventListener('click', async (e) => {
            e.stopPropagation();
            const wrapper = document.getElementById('edit-nursery-wrapper');
            const menuText = document.getElementById('sheet-nursery-menu');
            const input = document.getElementById('input-edit-nursery');
            if (wrapper && menuText && input) {
                const newValue = input.value.trim();
                STATE.nurseryMenu[STATE.selectedDateStr] = newValue;
                safeLocalStorageSet('menuharmony_nursery_menu', JSON.stringify(STATE.nurseryMenu));
                
                // 提案キャッシュと夕食提案データを完全にクリア！
                clearAiSuggestionCacheForDate(STATE.selectedDateStr);
                
                menuText.textContent = newValue || '給食未登録';
                menuText.className = `lunch-menu-text ${newValue ? '' : 'empty'}`;
                
                wrapper.classList.add('hidden');
                menuText.classList.remove('hidden');
                
                // 被り警告バナー、カレンダー一覧、AIアドバイスの再生成
                renderCalendarList();
                updateSheetAlerts(STATE.selectedDateStr);
                await refreshAISuggestion(STATE.selectedDateStr);
            }
        });
    }

    if (btnEditSchool) {
        btnEditSchool.addEventListener('click', (e) => {
            e.stopPropagation();
            const wrapper = document.getElementById('edit-school-wrapper');
            const menuText = document.getElementById('sheet-school-menu');
            const input = document.getElementById('input-edit-school');
            if (wrapper && menuText && input) {
                input.value = STATE.schoolMenu[STATE.selectedDateStr] || '';
                menuText.classList.add('hidden');
                wrapper.classList.remove('hidden');
                input.focus();
            }
        });
    }

    if (btnSaveSchool) {
        btnSaveSchool.addEventListener('click', async (e) => {
            e.stopPropagation();
            const wrapper = document.getElementById('edit-school-wrapper');
            const menuText = document.getElementById('sheet-school-menu');
            const input = document.getElementById('input-edit-school');
            if (wrapper && menuText && input) {
                const newValue = input.value.trim();
                STATE.schoolMenu[STATE.selectedDateStr] = newValue;
                safeLocalStorageSet('menuharmony_school_menu', JSON.stringify(STATE.schoolMenu));
                
                // 提案キャッシュと夕食提案データを完全にクリア！
                clearAiSuggestionCacheForDate(STATE.selectedDateStr);
                
                menuText.textContent = newValue || '給食未登録';
                menuText.className = `lunch-menu-text ${newValue ? '' : 'empty'}`;
                
                wrapper.classList.add('hidden');
                menuText.classList.remove('hidden');
                
                // 被り警告バナー、カレンダー一覧、AIアドバイスの再生成
                renderCalendarList();
                updateSheetAlerts(STATE.selectedDateStr);
                await refreshAISuggestion(STATE.selectedDateStr);
            }
        });
    }
}

// 被り警告バナーを即座に再評価して詳細シートを更新するヘルパー
function updateSheetAlerts(dateStr) {
    const overlaps = scanDateForOverlaps(dateStr);
    const alertBanner = document.getElementById('sheet-alert-banner');
    const alertText = document.getElementById('sheet-alert-text');

    if (alertBanner && alertText) {
        if (overlaps.length > 0) {
            alertBanner.classList.remove('hidden');
            const topOverlap = overlaps.find(o => o.severity === 'danger') || overlaps[0];
            alertText.textContent = topOverlap.message;
        } else {
            alertBanner.classList.add('hidden');
        }
    }
}

// 給食が手動修正された際に、AI提案のキャッシュを破棄し、新しい給食に合わせて再ロード・自動再創作するヘルパー
async function refreshAISuggestion(dateStr) {
    // キャッシュおよび夕食提案データを完全に消去！
    clearAiSuggestionCacheForDate(dateStr);
    
    // 再度AI提案をロード（これにより、新しい給食メニューを考慮した夕食がその場でリアルタイム自動創作されます！）
    await loadAISuggestion(dateStr);
}

// --------------------------------------------------------------------------
// 8.8 FAVORITES LIST VIEW RENDERING (お気に入りレシピ一覧描画＆削除ロジック)
// --------------------------------------------------------------------------
function renderFavoritesListView() {
    const container = document.getElementById('favorites-container');
    if (!container) return;
    
    container.innerHTML = '';
    const favorites = STATE.favoriteRecipes;
    const keys = Object.keys(favorites);
    
    if (keys.length === 0) {
        container.innerHTML = `
            <div class="favorites-empty-placeholder">
                <i data-lucide="star"></i>
                <p>お気に入りのレシピはまだありません。<br>今日の提案メニューをタップしてお気に入り（⭐）に登録できます！</p>
            </div>
        `;
        try { lucide.createIcons({ root: container }); } catch(e) {}
        return;
    }
    
    // 登録日時の降順（最新順）でソート
    keys.sort((a, b) => (favorites[b].addedAt || 0) - (favorites[a].addedAt || 0));
    
    keys.forEach(menuName => {
        const fav = favorites[menuName];
        const card = document.createElement('div');
        card.className = 'favorite-card';
        
        // アドバイザーごとのアバター
        const avatar = CHARACTERS[fav.character]?.avatar || '🍳';
        const charName = CHARACTERS[fav.character]?.name || '平野レミさん風';
        
        // 日付フォーマット
        const d = parseLocalDate(fav.date);
        const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日`;
        
        card.innerHTML = `
            <div class="favorite-header">
                <div class="favorite-title-row">
                    <span class="favorite-title">${escapeHtml(menuName)}</span>
                    <div class="favorite-meta-row">
                        <span class="favorite-badge">${escapeHtml(fav.type)}</span>
                        <span>${dateLabel}提案</span>
                        <span>${avatar} ${escapeHtml(charName)}</span>
                    </div>
                </div>
                <button class="btn-delete-favorite" data-menu-name="${escapeHtml(menuName)}">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            <div class="recipe-speech-bubble" style="margin-top: 8px; background:var(--bg-app); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:10px;">
                <div class="recipe-box-text" style="font-family:var(--font-jp); font-size:12.5px; line-height:1.5; color:var(--text-primary);">${formatAISuggestionMarkdown(fav.recipe)}</div>
            </div>
        `;
        
        // 削除ボタン of カードクリック処理
        const delBtn = card.querySelector('.btn-delete-favorite');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`「${menuName}」をお気に入りから削除しますか？`)) {
                delete STATE.favoriteRecipes[menuName];
                safeLocalStorageSet('menuharmony_favorites', JSON.stringify(STATE.favoriteRecipes));
                renderFavoritesListView();
            }
        });
        
        container.appendChild(card);
    });
    
    try { lucide.createIcons({ root: container }); } catch(e) {}
}

// --------------------------------------------------------------------------
// 9. APP INITIALIZATION
// --------------------------------------------------------------------------
function init() {
    // 給食データやお気に入りを残したまま、牛肉頻度減ルールで夕食提案のみを自動再計算するための1回限りの移行処理
    const migrationKey = 'menuharmony_migration_v2';
    if (!localStorage.getItem(migrationKey)) {
        localStorage.removeItem('menuharmony_proposed_dinners');
        STATE.proposedDinners = {};
        clearAllAiCaches();
        safeLocalStorageSet(migrationKey, 'completed');
    }

    if (Object.keys(STATE.nurseryMenu).length === 0 && Object.keys(STATE.schoolMenu).length === 0) {
        STATE.nurseryMenu = { ...DEMO_NURSERY_MENU };
        STATE.schoolMenu = { ...DEMO_SCHOOL_MENU };
        safeLocalStorageSet('menuharmony_nursery_menu', JSON.stringify(STATE.nurseryMenu));
        safeLocalStorageSet('menuharmony_school_menu', JSON.stringify(STATE.schoolMenu));
        STATE.currentDate = new Date(2026, 4, 29); // デモ表示（2026年5月）
    }

    // 静的なアイコンをページ全体で初期描画（1回のみ）
    try {
        lucide.createIcons();
    } catch (e) {}

    setupEventListeners();
    setupLunchInlineEditors(); // 手動編集用リスナー登録！
    renderCalendarList();
}

// 起動！
window.addEventListener('DOMContentLoaded', init);
