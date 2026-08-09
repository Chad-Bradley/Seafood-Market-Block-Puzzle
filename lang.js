// ============================================================
//  TILE & TIDE  -  lang.js
//  汉化字典 — 在 zh 块内添加  "英文原文": "中文翻译", 即可
//  没有条目的文本自动保持英文，不会报错
// ============================================================

const I18N_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];
const I18N_FALLBACK = 'en';
const I18N_LANG_KEY = 'blockPuzzleLang';
let currentLang = 'en';

// ========== 翻译字典 ==========
// key = 英文原文, value = 中文翻译
const I18N_DICT = {
  en: {
    // ── 帮助内容（语义 key 的英文值）──
    'help.freeplay.goalTitle': 'Goal',
    'help.freeplay.goal': 'Drag blocks from the tray to the 8×8 board. <b>Fill a full row or column to clear it</b>. Keep playing as long as there\'s room!',
    'help.freeplay.controlsTitle': 'Controls',
    'help.freeplay.controls1': '<b>Mouse:</b> Click a piece to pick it up, move it over the board, click again to place.',
    'help.freeplay.controls2': '<b>Keyboard:</b> Use <b>1–3</b> to select pieces, <b>Arrow keys</b> to nudge on the board.',
    'help.freeplay.powerupsTitle': 'Power-ups',
    'help.freeplay.powerups': '<b>Bomb</b> — destroys a 3×3 area.<br><b>Shuffle</b> — replaces all unplaced pieces.<br><b>Undo</b> — reverses your last placement.',
    'help.freeplay.scoringTitle': 'Scoring',
    'help.freeplay.scoring': 'Each cell placed = <b>1 point</b>. Each row/column cleared = <b>bonus points</b>. Score as high as you can!',
    'help.market.goalTitle': 'Goal',
    'help.market.goal': 'Serve customers by filling their <b>basket zone</b> — the highlighted area on the board. Match blocks into the basket to complete orders and earn <b>Shells</b>!',
    'help.market.basketTitle': 'Basket Zone',
    'help.market.basket': 'Watch for a colored rectangle on the board. Fill every cell inside it with blocks to serve the customer.',
    'help.market.seafoodTitle': 'Seafood Pieces',
    'help.market.seafood': 'Irregularly shaped seafood pieces appear on the board. They are <b>immune to row/column clears</b> — only disappear when included in a basket serve!',
    'help.market.earningTitle': 'Earning Shells',
    'help.market.earning': 'Each basket serve = <b>5 shells</b>. Each seafood cell in the basket = <b>+3 bonus shells</b>. Use shells to buy power-ups in the <b>Shop</b>.',
    'help.market.tipsTitle': 'Tips',
    'help.market.tips': 'Aim to include seafood in your basket serves for maximum shells. Buy <b>Bomb</b> or <b>Shuffle</b> when you\'re stuck!',
    // ── 模式描述 ──
    'mode.market.desc': 'Seafood market sim.<br>Serve customers, earn shells!',
    'mode.classic.desc': 'Classic block puzzle.<br>Chase your high score!',
    // ── 午夜彩蛋 ──
    'midnight.subtitle': 'The market is closed for the night...',
    'You broke it!': 'YOU BROKE IT!',
    'blub blub blub...': 'blub blub blub...',
    'DJ mode activated!': 'DJ mode activated!',
    'I\'m next, right?': 'I\'m next, right?',
    'I said NO discount!': 'I said NO discount!',
    'The tide is high!': 'The tide is high!',
    'A seafood storm is coming...': 'A seafood storm is coming...',
    'The ocean provides!': 'The ocean provides!',
    'Catch of a lifetime!': 'Catch of a lifetime!',
    'Poseidon approves!': 'Poseidon approves!',
    'The sea gods are pleased.': 'The sea gods are pleased.',
    'Tsunami of flavor!': 'Tsunami of flavor!',
    'Fresh from the deep!': 'Fresh from the deep!',
    'A bountiful harvest!': 'A bountiful harvest!',
    'The nets are overflowing.': 'The nets are overflowing.',
  },
  zh: {

    // ── 按钮 (A2) ──
    'PLAY': '开始游戏',
    'SHOP': '商店',
    'SETTINGS': '设置',
    'ACHIEVEMENTS': '成就',
    'New Game': '新游戏',
    'Back to Home': '返回主页',
    'Close': '关闭',
    'Continue': '继续',
    'Return to Home': '返回主页',
    'Play Again': '再来一局',
    'Got it': '知道了',
    'Give Up': '放弃',
    'Equip': '使用',

    // ── 模式选择 (A3) ──
    'Choose Mode': '选择模式',
    'Select a game mode to begin': '选择游戏模式',
    'Market Mode': '市场模式',
    'Classic Mode': '经典模式',
    'mode.market.desc': '海鲜市场模拟。<br>服务顾客，赚取贝壳！',
    'mode.classic.desc': '经典方块拼图。<br>消除行列，冲击高分！',

    // ── 面板标签 (A4) ──
    'Score': '分数',
    'Best': '最高分',
    'Combo': '连消',
    'Shells': '贝壳',
    'Select a piece': '选择方块',
    'Power-ups': '道具',
    'Next': '下一个',

    // ── 道具 (A5) ──
    'Bomb': '炸弹',
    'Shuffle': '刷新',
    'Undo': '撤回',
    'No Fishing': '禁渔期',
    'Blast a 3×3 area on the board': '消除棋盘上 3×3 区域',
    'Reshuffle all unplaced pieces': '刷新候选块',
    'Extra undo step': '撤回上一步',
    'Remove all seafood from the board (Market only)': '移除棋盘上所有海鲜（市场模式）',
    'Blast a 3×3 area': '消除 3×3 区域',
    'New unplaced pieces': '刷新候选块',
    'Remove all seafood (Market)': '移除所有海鲜（市场模式）',

    // ── 设置 (A7) ──
    'SETTINGS': '设置',
    'Sound': '音效',
    'Volume': '音量',
    'Theme': '主题',
    'Board Theme': '棋盘主题',
    'Piece Theme': '方格主题',
    'Guest Outfit': '顾客外观',
    'Language': '语言',
    'Layout': '布局',
    'Desktop': '横屏布局',
    'Mobile': '竖屏布局',

    // ── 商店 Tab ──
    'Power-ups': '道具',
    'Skins': '皮肤',
    'Board': '棋盘',
    'Blocks': '方格',
    'Customers': '顾客',

    // ── 皮肤名称 (A6) ──
    'Dark': '暗黑',
    'Light': '明亮',
    'Deep Blue': '深海蓝',
    'Sunset Beach': '落日沙滩',
    'Arctic': '极地冰原',
    'Wood': '木纹',
    'Treasure Chest': '宝箱',
    'Classic': '经典',
    'Glass': '玻璃',
    'Metal': '金属',
    'Abalone': '鲍鱼壳',
    'Driftwood': '木板',
    'Golden Crown': '皇冠',
    'Shoppers': '顾客',
    'Merfolk': '人鱼',
    'Fishermen': '渔民',
    'Pirates': '海盗',
    'Chef Master': '后厨',
    'Forest': '森林',
    'Midnight Gold': '午夜金',
    'Candy': '糖果',
    'Ocean Depths': '深海',
    'Midnight Fishing': '午夜渔火',

    // ── 皮肤描述 ──
    'Default ocean depth': '海底两万里',
    'Warm tropical shore': '温暖的热带海岸',
    'Ice-cold underwater': '冰寒的水下世界',
    'Warm walnut frame': '温暖的胡桃木边框',
    'Earn 300 shells in one game': '单局赚取 300 贝壳',
    'Classic colored blocks': '经典的彩色方块',
    'Smooth glass finish': '光滑玻璃质感',
    'Sleek metallic blocks': '哑光金属方块',
    'Shimmering shell inlay': '珠光贝壳镶嵌',
    'Weathered wood grain': '木纹纹理',
    'Reach score ≥ 1500': '单局分数达到 1500',
    'Everyday market crowd': '日常菜市场顾客',
    'Mythical sea dwellers': '神话海洋居民',
    'Seaside anglers': '出海渔民',
    'Swashbuckling crew': '海盗船员',
    'Clear 300 seafood pieces': '累计消除 300 个海鲜棋子',
    'Deep cosmic blue-purple': '深邃星空蓝紫',
    'Clean airy gray-white': '清爽灰白',
    'Woodsy pine & moss': '松木苔藓绿',
    'Black & gilded accents': '黑底鎏金',
    'Sweet pink confection': '甜美的粉色糖果',
    'Deep sea bioluminescent cyan': '深海荧光青',
    'Night pier with lantern light': '夜幕码头，渔火点点',

    // ── 商店 ──
    '⚡ Shop': '商店',
    'Your Shells:': '贝壳：',

    // ── 帮助弹窗内容 ──
    'How to Play': '玩法说明',

    // ── 成就 ──
    'Achievements': '成就',
    '★ Active': '使用中',
    'From Achievement': '成就解锁',
    'Unlocks Skin': '解锁皮肤',
    'Completed': '已完成',
    'Unlocked {n} / {m}': '已解锁 {n} / {m}',
    '+ Exclusive Skin': '+ 专属皮肤',
    'Achievement Unlocked!': '成就解锁！',
    'Balance: {n}': '余额：{n}',

    // ── 游戏结束弹窗 (A12) ──
    'Game Over': '游戏结束',
    'Shift Over!': '换班了！',
    'Final Score': '最终得分',
    'Shells earned': '赚取贝壳',
    'New Record!': '新纪录！',
    'New Best!': '新纪录！',

    // ── 救援弹窗 (A13) ──
    'No moves left!': '已无可放置块！',
    'Use a power-up to save your game': '使用道具挽救本局',

    // ── 确认弹窗 ──
    'Leave Game?': '是否离开对局？',
    'Your progress will be lost.': '本局进度将会丢失。',
    'Start New Game?': '开启新对局？',
    'Current score will be saved, then a new game begins.': '当前分数将保存，然后开始新对局。',

    // ── 开始页 ──
    'Seafood Market': '海鲜市场',
    'Drag or click pieces onto the board': '拖拽或点击拼图块放置到棋盘上',
    'Made by Chad Bradley': '由 Chad Bradley 开发',
    'You broke it!': '赔钱！',
    'blub blub blub...': '咕噜咕噜咕噜...',
    'DJ mode activated!': '🎧 DJ， Music！',
    'I\'m next, right?': '不要戳我',
    'The tide is high!': '涨潮了！',
    'A seafood storm is coming...': '海鲜风暴即将来袭...',
    'The ocean provides!': '大自然的馈赠！',
    'Catch of a lifetime!': '千载难逢！',
    'Poseidon approves!': '风调渔顺！',
    'The sea gods are pleased.': '海味上新！',
    'Tsunami of flavor!': '网满仓盈！',
    'Fresh from the deep!': '深海直达！',
    'A bountiful harvest!': '大丰收！',
    'The nets are overflowing.': '渔网快撑破了。',
    'Tile & Tide': '海鲜大拼盘',
    'midnight.subtitle': '夜深了，收摊了...',

    // ── 面板提示 ──
    'Click to select': '点击选中',
    'Hover to preview': '悬停预览',
    'Click board to place': '点击棋盘放置',
    'ESC to deselect': '按 ESC 取消选择',
    'Fill a row or column to clear': '填满整行或整列即可消除',

    // ── 顾客面板 ──
    'Fill {w}×{h} area!': '填满 {w}×{h} 区域！',

    // ── 道具提示 ──
    'Click the board to blast a 3×3 area': '点击棋盘消除 3×3 区域',

    // ── 帮助内容（语义 key，值含 HTML 标签） ──
    'help.freeplay.goalTitle': '目标',
    'help.freeplay.goal': '把拼图块从候选区拖到 8×8 棋盘上。<b>填满整行或整列即可消除</b>。只要还有空间就能继续！',
    'help.freeplay.controlsTitle': '操作',
    'help.freeplay.controls1': '<b>鼠标：</b>点击方块拿起，移动到棋盘上，再次点击放置。',
    'help.freeplay.controls2': '<b>键盘：</b>按 <b>1–3</b> 选择方块，<b>方向键</b> 微调位置。',
    'help.freeplay.powerupsTitle': '道具',
    'help.freeplay.powerups': '<b>炸弹</b> — 清除 3×3 区域。<br><b>刷新</b> — 替换全部待放置拼图块。<br><b>撤回</b> — 撤销上一步操作。',
    'help.freeplay.scoringTitle': '计分',
    'help.freeplay.scoring': '每放置 1 个方格 = <b>1 分</b>。每消除 1 行/列 = <b>额外加分</b>。尽可能拿到更多分数！',

    'help.market.goalTitle': '目标',
    'help.market.goal': '通过填充<b>篮区</b>（棋盘上的高亮区域）接待顾客。将拼图块填入篮区完成订单，获取 <b>贝壳</b>！',
    'help.market.basketTitle': '篮区',
    'help.market.basket': '留意棋盘上的彩色框选区域。填满篮区内所有方格，即可完成顾客订单。',
    'help.market.seafoodTitle': '海鲜棋子',
    'help.market.seafood': '不规则形状的海鲜棋子会出现在棋盘上。它们<b>免疫行列消除</b>——只有在篮区结账时才会被清除！',
    'help.market.earningTitle': '获取贝壳',
    'help.market.earning': '每次篮区结账 = <b>5 贝壳</b>。篮区内每个海鲜格 = <b>+3 额外贝壳</b>。贝壳可在<b>商店</b>购买道具。',
    'help.market.tipsTitle': '小贴士',
    'help.market.tips': '尽量将海鲜拼图块放入篮区来获得更多贝壳。卡住时购买道具！',

    // ── 顾客对话气泡 ──
    // crab
    'That crab was massive!': '这螃蟹真大！',
    'Sweet crab meat~': '透鲜！',
    'Crabtastic!': '螃蟹绝了！',
    'Pinch me, that was good!': '蟹蟹！',
    // shrimp
    'Juiciest shrimp ever!': '这虾真新鲜！',
    'Shrimp so fresh it snapped!': '虾鲜得会弹！',
    'Prawn star quality!': '真鲜啊！',
    'Shell yeah!': '好耶！',
    // clam
    'Plumpest clams in town!': '花甲真好吃！',
    'Pearl of a deal!': '好肥的花甲！',
    'That clam was a gem!': '花甲！',
    'Bivalve bliss~': '新鲜的花甲~',
    // fish
    'That fish was swimming this morning!': '这鱼是从船上拿过来的吧！',
    'Fin-tastic!': '好新鲜的鱼！',
    'Straight off the boat!': '回去晒鱼干！',
    'Catch of the day!': '再来一条！',
    // hairtail
    'Slippery & delicious!': '看着就新鲜！',
    'That hairtail hit different': '这带鱼真大！',
    'Long & tasty!': '真好吃！',
    'Silver belt special!': '秋天的第一口带鱼！',
    // jellyfish
    'Jiggly & refreshing!': '脆爽解腻！',
    'That jelly had bounce!': '口感不错！',
    'Bouncy goodness!': '凉拌海蜇皮！',
    'Zingy and crisp!': '爽口！',
    // squid
    'Tender tentacles!': '嫩滑鱿鱼须！',
    'Ink-redible!': '鱿其好吃！',
    'Squid game strong!': '小鱿鱼！',
    'Not chewy at all!': '口感真棒！',
    // general
    'Hook me up another!': '再来一份！',
    'Seafood feast!': '海鲜大餐！',
    'Fresh off the dock!': '上岸了！',
    'You know your fish!': '真有眼光！',
    'Best catch today!': 'OK呀那我也是直接就买了呀',
    'Ocean to order!': '海洋直达餐桌！',
    'Taste the sea!': '现捞现煮！',
    'Five stars no cap!': '五星好评！',
    'Running this market!': '大排档我来了！',
    'Certified fresh!': '新鲜！',

    // ── 成就名称 (29 个) ──
    'Double Whammy': '一箭双雕',
    'Rising Star': '码头新星',
    'Score Expert': '得分能手',
    'Score Master': '得分大师',
    'Score Emperor': '得分大王',
    'Combo Rookie': '连消新手',
    'Combo Pro': '连消高手',
    'Line Cleaner: Bronze': '消除达人：铜',
    'Line Cleaner: Silver': '消除达人：银',
    'Line Cleaner: Gold': '消除达人：金',
    'Regular: Bronze': '熟客：铜',
    'Regular: Silver': '熟客：银',
    'Regular: Gold': '熟客：金',
    'Master Builder': '建造大师',
    'First Order': '首单成交',
    'Busy Kitchen': '忙碌厨房',
    'Hot Kitchen': '火爆厨房',
    'Shell Rookie': '贝壳新手',
    'Shell Expert': '贝壳专家',
    'Shell Tycoon': '贝壳大亨',
    'Seafood Chef: Bronze': '海鲜大厨：铜',
    'Seafood Chef: Silver': '海鲜大厨：银',
    'Seafood Chef: Gold': '海鲜大厨：金',
    'Gold Service': '金牌服务',
    'Shop Owner': '店长',
    'Bomber': '爆破能手',
    'Shuffler': '刷新能手',
    'Time Traveler': '时间旅行者',
    'Collector': '收藏家',
    'Curious Explorer': '探险家',
    'Easter Egg Hunter': '初见端倪',
    'Secret Keeper': '被发现了',
    'Easter Egg Grand Slam': '大满贯',

    // ── 成就描述 (29 个) ──
    'Clear 2+ lines in one placement': '单次放置消除 2 行以上',
    'Score ≥ 100 in one game': '单局分数 ≥ 100',
    'Score ≥ 300 in one game': '单局分数 ≥ 300',
    'Score ≥ 500 in one game': '单局分数 ≥ 500',
    'Score ≥ 1500 in one game': '单局分数 ≥ 1500',
    'Reach 3× combo in one game': '单局达成 3 连消',
    'Reach 6× combo in one game': '单局达成 6 连消',
    'Clear 50 lines in total': '累计消除 50 行',
    'Clear 200 lines in total': '累计消除 200 行',
    'Clear 500 lines in total': '累计消除 500 行',
    'Play 10 games in total': '累计 10 局',
    'Play 50 games in total': '累计 50 局',
    'Play 100 games in total': '累计 100 局',
    'Place 500 blocks in total': '累计放置 500 个方块',
    'Complete your first order': '完成第一笔订单',
    'Complete 5 orders in one game': '单局完成 5 笔订单',
    'Complete 12 orders in one game': '单局完成 12 笔订单',
    'Earn 50 shells in one game': '单局赚取 50 贝壳',
    'Earn 150 shells in one game': '单局赚取 150 贝壳',
    'Clear 30 seafood pieces in total': '累计清除 30 个海鲜棋子',
    'Clear 100 seafood pieces in total': '累计清除 100 个海鲜棋子',
    'Complete 50 orders in total': '累计完成 50 笔订单',
    'Complete 150 orders in total': '累计完成 150 笔订单',
    'Use Bomb 10 times': '使用炸弹 10 次',
    'Use Shuffle 10 times': '使用刷新10 次',
    'Use Undo 20 times': '使用撤回 20 次',
    'Own 5 skins': '拥有 5 款皮肤',
    'Find your first easter egg': '发现第一个彩蛋',
    'Discover 3 easter eggs': '发现 3 个彩蛋',
    'Discover 5 easter eggs': '发现 5 个彩蛋',
    'Find every hidden easter egg': '发现全部隐藏彩蛋',
    'I said NO discount!': '讲了不打折！',
    'Seafood Rain': '海鲜雨',
    'Click the logo 10 times': '连点 Logo 10 下',
    'Midnight Fishing': '午夜渔火',
    'Open the game late at night': '凌晨打开游戏',
    'Bubble Pop': '泡泡',
    'Tap an empty cell 5 times': '连点空格子 5 下',
    'DJ Scratch': 'DJ，Music！',
    'Scrub the volume slider': '来回滑动音量滑块',
    'Signature': '我是谁',
    'Hold the title image': '长按标题图片',
    'Impatient Customer': '不要催',
    'Poke a waiting customer 3 times': '连点排队顾客 3 下',
    'You Broke It!': '赔钱！',
    'Click the in-game title': '点击游戏内标题',
    'Dead Crab': '死蟹一只',
    'Get stuck with no moves (rare)': '走投无路时（小概率）',
    'Won\'t Fit!': '摆弗进！',
    'Try placing where it doesn\'t fit (rare)': '方块放不进时（小概率）',
    'No Discount!': '不打折！',
    'Beg for a discount 5 times': '连点灰色购买按钮 5 下',
  }
};

// ========== 运行时函数 ==========

/** 翻译查询。key 为英文原文，params 为 {placeholder: value} 替换 */
function t(key, params) {
  let s = (I18N_DICT[currentLang] && I18N_DICT[currentLang][key]) || key;
  if (params) {
    for (const k in params) {
      s = s.split('{' + k + '}').join(params[k]);
    }
  }
  return s;
}

/** 检测语言：localStorage 优先，其次浏览器 navigator.language */
function detectLanguage() {
  const saved = localStorage.getItem(I18N_LANG_KEY);
  if (saved) return saved;
  const base = (navigator.language || 'en').toLowerCase().split('-')[0];
  return I18N_LANGUAGES.some(l => l.code === base) ? base : I18N_FALLBACK;
}

/** 刷新所有 data-i18n / data-i18n-title / data-i18n-html 的 DOM 元素 */
function refreshI18nDOM() {
  // data-i18n (textContent)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  // data-i18n-html (innerHTML — 用于含 <br> 等标签的文字)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (key) el.innerHTML = t(key);
  });
  // data-i18n-title (tooltip)
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.title = t(key);
  });
}

/** 语言切换回调列表 — game.js 在此注册需要刷新 UI 的函数 */
const I18N_REFRESH_HOOKS = [];

/** 切换语言 */
function applyLanguage(code) {
  if (!I18N_LANGUAGES.some(l => l.code === code)) code = I18N_FALLBACK;
  currentLang = code;
  localStorage.setItem(I18N_LANG_KEY, code);
  document.documentElement.lang = code;

  // 刷新语言选择器
  const sel = document.getElementById('settingLanguage');
  if (sel) sel.value = code;

  // 刷新静态 DOM 文字
  refreshI18nDOM();

  // 页面标题
  document.title = t('Tile & Tide');

  // 标题图片
  document.querySelectorAll('.title-img').forEach(img => {
    img.src = `assets/title_${currentLang}.png`;
  });

  // 刷新 JS 生成内容
  I18N_REFRESH_HOOKS.forEach(fn => { try { fn(); } catch(_) {} });
}
