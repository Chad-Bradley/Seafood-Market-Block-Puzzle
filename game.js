// ============================================================
//  BLOCK PUZZLE  -  game.js
//  替换素材指引：
//    填充方块 →  drawFilledCell()  中将 fillStyle 替换为 drawImage
//    方块预览 →  renderPreviewCanvases()  中替换绘制逻辑
//    所有素材放在  assets/  目录下即可
// ============================================================

// ========== 主题 ==========
let currentTheme = localStorage.getItem('blockPuzzleTheme') || 'dark';
function applyTheme(t) {
  currentTheme = t;
  document.body.classList.toggle('light', t === 'light');
  localStorage.setItem('blockPuzzleTheme', t);
  // 更新主题按钮选中态
  document.querySelectorAll('#themeToggle .theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === t);
  });
}

/** 获取当前主题下的渲染颜色 */
function themeColors() {
  return currentTheme === 'light'
    ? { gridBg:'#dde0ea', emptyCell:'#e8eaf2', gridLine:'#c5c8d4', gridBorder:'#b0b5cc', cellHighlight:'rgba(255,255,255,0.25)', cellShadow:'rgba(0,0,0,0.1)', cellBorder:'rgba(0,0,0,0.07)', previewValidFill:'rgba(80,200,100,0.3)', previewValidStroke:'rgba(80,200,100,0.55)', previewInvalidFill:'rgba(255,90,80,0.25)', previewInvalidStroke:'rgba(255,90,80,0.45)' }
    : { gridBg:'#13132c', emptyCell:'#1c1c3a', gridLine:'#2a2a52', gridBorder:'#3a3a65', cellHighlight:'rgba(255,255,255,0.2)', cellShadow:'rgba(0,0,0,0.18)', cellBorder:'rgba(255,255,255,0.12)', previewValidFill:'rgba(80,220,120,0.35)', previewValidStroke:'rgba(80,220,120,0.6)', previewInvalidFill:'rgba(255,90,90,0.3)', previewInvalidStroke:'rgba(255,90,90,0.5)' };
}
let audioCtx = null;
let isMuted = localStorage.getItem('blockPuzzleMuted') === '1';
function syncSoundToggleUI() {
  const toggle = document.getElementById('soundToggle');
  const icon = document.getElementById('soundIcon');
  if (toggle) toggle.checked = !isMuted;
  if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
}
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(freq, duration, type = 'sine', vol = 0.08) {
  if (isMuted || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) { /* 忽略音频错误 */ }
}

function sfxSelect()  { playTone(600, 0.06, 'sine', 0.04); }
function sfxPlace()   { playTone(440, 0.1,  'triangle', 0.07); }
function sfxClear(n)  {
  for (let i = 0; i < Math.min(n, 5); i++) {
    setTimeout(() => playTone(520 + i * 120, 0.12, 'triangle', 0.08), i * 70);
  }
}
function sfxInvalid() { playTone(180, 0.15, 'square', 0.03); }
function sfxGameOver() {
  [300, 250, 200].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.06), i * 150)
  );
}

// ===== 常量 =====
const GRID_SIZE  = 8;
const CELL_SIZE  = 58;
const PADDING    = 18;
const CANVAS_SIZE = PADDING * 2 + GRID_SIZE * CELL_SIZE; // 500

// ===== 方块颜色（后期替换为图片时此处改为素材路径） =====
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471',
  '#82E0AA', '#F1948A', '#AED6F1', '#D7BDE2', '#A3E4D7',
];

// ===== 方块形状定义（0=空, 1=填充） =====
const SHAPES = [
  /*  0 */ { name:'1x1',    shape:[[1]] },
  /*  1 */ { name:'1x2',    shape:[[1,1]] },
  /*  2 */ { name:'2x1',    shape:[[1],[1]] },
  /*  3 */ { name:'1x3',    shape:[[1,1,1]] },
  /*  4 */ { name:'3x1',    shape:[[1],[1],[1]] },
  /*  5 */ { name:'2x2',    shape:[[1,1],[1,1]] },
  /*  6 */ { name:'1x4',    shape:[[1,1,1,1]] },
  /*  7 */ { name:'4x1',    shape:[[1],[1],[1],[1]] },
  /*  8 */ { name:'1x5',    shape:[[1,1,1,1,1]] },
  /*  9 */ { name:'5x1',    shape:[[1],[1],[1],[1],[1]] },
  /* 10 */ { name:'L3-a',   shape:[[1,1],[1,0]] },
  /* 11 */ { name:'L3-b',   shape:[[1,1],[0,1]] },
  /* 12 */ { name:'L3-c',   shape:[[1,0],[1,1]] },
  /* 13 */ { name:'L3-d',   shape:[[0,1],[1,1]] },
  /* 14 */ { name:'T4',     shape:[[1,1,1],[0,1,0]] },
  /* 15 */ { name:'T4-v',   shape:[[0,1],[1,1],[0,1]] },
  /* 16 */ { name:'L4-a',   shape:[[1,1,1],[1,0,0]] },
  /* 17 */ { name:'L4-b',   shape:[[1,1,1],[0,0,1]] },
  /* 18 */ { name:'L4-c',   shape:[[1,0,0],[1,1,1]] },
  /* 19 */ { name:'L4-d',   shape:[[0,0,1],[1,1,1]] },
  /* 20 */ { name:'Z4-a',   shape:[[1,1,0],[0,1,1]] },
  /* 21 */ { name:'Z4-b',   shape:[[0,1,1],[1,1,0]] },
  /* 22 */ { name:'U5',     shape:[[1,1,1],[1,0,1]] },
  /* 23 */ { name:'X5',     shape:[[0,1,0],[1,1,1],[0,1,0]] },
  /* 24 */ { name:'W5',     shape:[[1,0,0],[1,1,0],[0,1,1]] },
  /* 25 */ { name:'2x3',    shape:[[1,1],[1,1],[1,1]] },
  /* 26 */ { name:'3x2',    shape:[[1,1,1],[1,1,1]] },
  /* 27 */ { name:'2x4',    shape:[[1,1],[1,1],[1,1],[1,1]] },
  /* 28 */ { name:'U5-u',   shape:[[1,0,1],[1,1,1]] },   // 带鱼 开口上
  /* 29 */ { name:'U5-l',   shape:[[1,1],[0,1],[1,1]] },  // 带鱼 开口左
  /* 30 */ { name:'U5-r',   shape:[[1,1],[1,0],[1,1]] },  // 带鱼 开口右
];

// ===== 海鲜棋子（Market Mode） =====
// 数组：每条目 { shapeIdx, name, emoji, key, imgSrc? }
const SEAFOOD_PIECES = [
  { shapeIdx:0,  name:'蛤蜊 (Clam)',             emoji:'🐚', key:'clam',            imgSrc:'assets/seafood/clam_1x1.png' },
  { shapeIdx:2,  name:'蛏子横 (Razor Clam H)',    emoji:'🦪', key:'razor_clam_h',    imgSrc:'assets/seafood/razor_clam_1x2.png' },
  { shapeIdx:1,  name:'蛏子竖 (Razor Clam V)',    emoji:'🦪', key:'razor_clam_v',    imgSrc:'assets/seafood/razor_clam_2x1.png' },
  { shapeIdx:1,  name:'梅鱼 (Mei Fish)',          emoji:'🐟', key:'mei_fish',        imgSrc:'assets/seafood/mei_2x1.png' },
  { shapeIdx:4,  name:'皮皮虾横 (Mantis Shrimp H)',emoji:'🦐', key:'mantis_shrimp_h', imgSrc:'assets/seafood/mantisshrimp_1x3.png' },
  { shapeIdx:3,  name:'皮皮虾竖 (Mantis Shrimp V)',emoji:'🦐', key:'mantis_shrimp_v', imgSrc:'assets/seafood/mantisshrimp_3x1.png' },
  { shapeIdx:13, name:'对虾 LU (Shrimp)',          emoji:'🦐', key:'shrimp_LU',       imgSrc:'assets/seafood/shrimp_LU.png' },
  { shapeIdx:12, name:'对虾 RU (Shrimp)',          emoji:'🦐', key:'shrimp_RU',       imgSrc:'assets/seafood/shrimp_RU.png' },
  { shapeIdx:11, name:'对虾 LB (Shrimp)',          emoji:'🦐', key:'shrimp_LB',       imgSrc:'assets/seafood/shrimp_LB.png' },
  { shapeIdx:10, name:'对虾 RB (Shrimp)',          emoji:'🦐', key:'shrimp_RB',       imgSrc:'assets/seafood/shrimp_RB.png' },
  { shapeIdx:5,  name:'海蜇皮 (Jellyfish)',        emoji:'🫧', key:'jellyfish',       imgSrc:'assets/seafood/jellyfish_2x2.png' },
  { shapeIdx:28, name:'带鱼 U (Hairtail)',         emoji:'🐍', key:'hairtail_U',      imgSrc:'assets/seafood/Hairtail_up.png' },
  { shapeIdx:22, name:'带鱼 D (Hairtail)',         emoji:'🐍', key:'hairtail_D',      imgSrc:'assets/seafood/Hairtail_down.png' },
  { shapeIdx:29, name:'带鱼 L (Hairtail)',         emoji:'🐍', key:'hairtail_L',      imgSrc:'assets/seafood/Hairtail_left.png' },
  { shapeIdx:30, name:'带鱼 R (Hairtail)',         emoji:'🐍', key:'hairtail_R',      imgSrc:'assets/seafood/Hairtail_right.png' },
  { shapeIdx:25, name:'鲳鱼 2x3 (Pomfret)',        emoji:'🐠', key:'pomfret_2x3',     imgSrc:'assets/seafood/Pomfret_2x3.png' },
  { shapeIdx:26, name:'鲳鱼 3x2 (Pomfret)',        emoji:'🐠', key:'pomfret_3x2',     imgSrc:'assets/seafood/Pomfret_3x2.png' },
  { shapeIdx:26, name:'梭子蟹 (Swimming Crab)',     emoji:'🦀', key:'crab',            imgSrc:'assets/seafood/crab_3x2.png' },
  { shapeIdx:25, name:'鱿鱼 (Squid)',              emoji:'🦑', key:'squid',           imgSrc:'assets/seafood/squid_2x3.png' },
];
// 所有海鲜 ID（数组索引）
const SEAFOOD_IDS = SEAFOOD_PIECES.map((_, i) => i);

// 海鲜图片缓存：key → Image
const seafoodImages = {};

/** 预加载海鲜图片 */
function loadSeafoodImages() {
  for (const info of SEAFOOD_PIECES) {
    if (info.imgSrc) {
      const img = new Image();
      img.src = info.imgSrc;
      seafoodImages[info.key] = img;
      img.onload = () => {
        render();
        renderPreviewCanvases();
      };
    }
  }
}

// ===== 游戏状态 =====
let grid;           // 8x8, 0=空, 颜色字符串=已填充
let seafoodGrid;    // 8x8, null=普通/空, { key, emoji, originR, originC, cols, rows }=海鲜格子
let score;
let bestScore;
let combo;
let blocks;         // [{ shape, color, placed }] x3
let selectedIdx;    // -1 或 0~2
let gameOver;
let hoverCell;      // { row, col } | null
let history;        // 用于撤销 { grid, blocks, score, combo, selectedIdx }

// 消除动画
let clearingCells;     // [{ row, col }]
let clearTimer;        // 帧计数
let clearingParticles = []; // 金色粒子 { x, y, vx, vy, life, size, hue }
let scoreFloats = [];       // 得分飘字 { x, y, text, life }

// 模式
let gameMode = 'freePlay';     // 'freePlay' | 'market'

// 顾客系统（Market Mode）
const CUSTOMER_ICONS = ['🦀','🦐','🦑','🐟','🐙','🦞','🐠','🐡','🦪','🐚'];
const BASKET_TYPES = [
  { w:2, h:3, shells:5  },  // 6 cells
  { w:3, h:2, shells:5  },  // 6 cells
  { w:4, h:4, shells:10 },  // 16 cells
  { w:5, h:3, shells:10 },  // 15 cells
  { w:3, h:5, shells:10 },  // 15 cells
  { w:5, h:5, shells:20 },  // 25 cells
];
let shells = 0;
let sessionShells = 0; // 本局赚到的 shell
let bestSessionShells = 0; // 历史单局最佳贝壳
let placedSeafoodPieces = []; // 已放置海鲜棋子列表 [{ key, originR, originC, rows, cols }]
let customerQueue = [];
let activeCustomer = null;   // { icon, type }
let basketZone = null;       // { row, col, rows, cols, shells }
let pendingBasketClear = null; // 篮区消除等待动画完成

// 道具系统
let powerUps = { bomb: 3, shuffle: 3, undoStep: 3 };
let powerUpMode = null;  // 'bomb' | null（shuffle / undoStep 瞬发）
let rescueMode = false;  // 救援模式（允许用贝壳购买的炸弹）

// ===== Canvas 引用 =====
let canvas, ctx;
let previewCanvases = [];

// ===== 初始化 =====
function init() {
  canvas = document.getElementById('gameCanvas');
  canvas.width  = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  ctx = canvas.getContext('2d');

  loadSeafoodImages();

  // 方块预览小画布
  document.querySelectorAll('.block-card canvas').forEach(c => {
    c.width  = 120;
    c.height = 120;
    previewCanvases.push(c);
  });

  bestScore = parseInt(localStorage.getItem('blockPuzzleBest') || '0');
  document.getElementById('best').textContent = bestScore;
  shells = parseInt(localStorage.getItem('blockPuzzleShells') || '0');
  document.getElementById('shells').textContent = `🐚 ${shells}`;

  // 开始页显示最高分 + 贝壳
  updateStartHint();

  // 背景浮动方块装饰
  createBgBlocks();

  setupEvents();
  requestAnimationFrame(gameLoop);

  // Play 按钮 → 打开模式选择
  document.getElementById('btnPlay').addEventListener('click', () => {
    initAudio();
    document.getElementById('startOverlay').classList.add('hidden');
    document.getElementById('modeSelectOverlay').classList.remove('hidden');
  });

  // 模式选择 - Free Play
  document.getElementById('btnFreePlay').addEventListener('click', () => {
    gameMode = 'freePlay';
    document.getElementById('modeSelectOverlay').classList.add('hidden');
    document.getElementById('bgBlocks').classList.add('hidden');
    switchPanel('freePlay');
    startNewGame();
    render();
  });

  // 模式选择 - Market Mode
  document.getElementById('btnMarketMode').addEventListener('click', () => {
    gameMode = 'market';
    document.getElementById('modeSelectOverlay').classList.add('hidden');
    document.getElementById('bgBlocks').classList.add('hidden');
    switchPanel('market');
    startNewGame();
    render();
  });

  // 点击模式选择外部关闭 → 回到开始页
  document.getElementById('modeSelectOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
      document.getElementById('startOverlay').classList.remove('hidden');
    }
  });

  // SHOP 按钮（开始页） → 打开商店弹窗
  document.getElementById('btnShopStart').addEventListener('click', () => {
    initAudio();
    updateShopOverlay();
    document.getElementById('shopOverlay').classList.remove('hidden');
  });

  // SETTINGS 按钮（开始页） → 打开设置弹窗
  document.getElementById('btnSettingsStart').addEventListener('click', () => {
    initAudio();
    syncSoundToggleUI();
    document.getElementById('settingsOverlay').classList.remove('hidden');
  });

  // 关闭商店弹窗
  document.getElementById('btnCloseShop').addEventListener('click', () => {
    document.getElementById('shopOverlay').classList.add('hidden');
  });

  // 商店购买按钮
  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.dataset.item;
      const cost = parseInt(btn.dataset.cost);
      if (shells >= cost) {
        shells -= cost;
        powerUps[item] = (powerUps[item] || 0) + 1;
        marketSaveShells();
        savePowerUps();
        updatePowerUpUI();
        updateScoreUI();
        updateShopOverlay();
        sfxClear(3);
      }
    });
  });

  // 商店 Tab 切换
  document.querySelectorAll('.shop-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.shop-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      const content = document.querySelector(`.shop-tab-content[data-tab="${target}"]`);
      if (content) content.classList.add('active');
    });
  });

  // 关闭设置弹窗
  document.getElementById('btnCloseSettings').addEventListener('click', () => {
    document.getElementById('settingsOverlay').classList.add('hidden');
  });

  // 点击遮罩外部关闭弹窗
  document.getElementById('settingsOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
    }
  });
  document.getElementById('shopOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
    }
  });
  document.getElementById('helpOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
    }
  });

  // 返回主页按钮 → 打开确认弹窗
  document.getElementById('btnBackHome').addEventListener('click', () => {
    initAudio();
    document.getElementById('confirmBackOverlay').classList.remove('hidden');
  });

  // 确认弹窗 - 继续游戏
  document.getElementById('btnContinue').addEventListener('click', () => {
    document.getElementById('confirmBackOverlay').classList.add('hidden');
  });

  // 确认弹窗 - 返回主页
  document.getElementById('btnConfirmBack').addEventListener('click', () => {
    document.getElementById('confirmBackOverlay').classList.add('hidden');
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('startOverlay').classList.remove('hidden');
    document.getElementById('bgBlocks').classList.remove('hidden');
    // 重置游戏状态
    grid = null;
    gameOver = false;
    clearingCells = [];
    clearTimer = 0;
    customerQueue = [];
    activeCustomer = null;
    basketZone = null;
    updateStartHint();
  });

  // 点击确认弹窗外部关闭
  document.getElementById('confirmBackOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
    }
  });

  // ESC 关闭所有弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modeSel = document.getElementById('modeSelectOverlay');
      if (!modeSel.classList.contains('hidden')) {
        modeSel.classList.add('hidden');
        document.getElementById('startOverlay').classList.remove('hidden');
        return;
      }
      document.getElementById('settingsOverlay').classList.add('hidden');
      document.getElementById('shopOverlay').classList.add('hidden');
      document.getElementById('confirmBackOverlay').classList.add('hidden');
    }
  });
}

/** 开始页背景浮动方块 + seafood 贴图 */
function createBgBlocks() {
  const container = document.getElementById('bgBlocks');
  const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#DDA0DD','#FFEAA7','#82E0AA'];
  const seafood = [
    'assets/seafood/clam_1x1.png',
    'assets/seafood/razor_clam_1x2.png',
    'assets/seafood/razor_clam_2x1.png',
    'assets/seafood/shrimp_LU.png',
    'assets/seafood/shrimp_RU.png',
    'assets/seafood/shrimp_LB.png',
    'assets/seafood/shrimp_RB.png',
    'assets/seafood/squid_2x3.png',
  ];
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'bg-block';
    const size = 30 + Math.random() * 50;
    el.style.width  = size + 'px';
    el.style.height = size + 'px';
    el.style.left   = Math.random() * 100 + '%';
    el.style.animationDuration = (12 + Math.random() * 18) + 's';
    el.style.animationDelay    = Math.random() * 15 + 's';

    // 一半概率用海鲜贴图
    if (Math.random() < 0.5) {
      el.style.background = 'transparent';
      const img = document.createElement('img');
      img.src = seafood[Math.floor(Math.random() * seafood.length)];
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      el.appendChild(img);
    } else {
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
    }
    container.appendChild(el);
  }
}

/** 更新开始页提示（最高分 + 贝壳） */
function updateStartHint() {
  const hint = document.getElementById('startBestHint');
  let parts = [];
  if (bestScore > 0) {
    parts.push('Best: <span>' + bestScore + '</span>');
  }
  const s = parseInt(localStorage.getItem('blockPuzzleShells') || '0');
  if (s > 0 || bestScore === 0) {
    parts.push('<span>🐚 ' + s + '</span>');
  }
  if (parts.length === 0) {
    hint.textContent = '';
  } else {
    hint.innerHTML = parts.join(' &nbsp;·&nbsp; ');
  }
}

/** 检查形状所有格子是否都在篮区内 */
function isInsideBasketZone(shape, row, col) {
  if (!basketZone) return false;
  const rows = shape.length;
  const cols = shape[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!shape[r][c]) continue;
      const gr = row + r;
      const gc = col + c;
      if (gr < basketZone.row || gr >= basketZone.row + basketZone.rows) return false;
      if (gc < basketZone.col || gc >= basketZone.col + basketZone.cols) return false;
    }
  }
  return true;
}

function startNewGame() {
  grid         = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  seafoodGrid  = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  score        = 0;
  combo        = 0;
  selectedIdx  = -1;
  gameOver     = false;
  history      = null;
  hoverCell    = null;
  clearingCells = [];
  clearTimer   = 0;
  clearingParticles = [];
  scoreFloats = [];
  pendingBasketClear = null;
  powerUpMode  = null;
  rescueMode   = false;

  // 顾客系统（Market Mode）
  shells = marketLoadShells();
  sessionShells = 0;
  placedSeafoodPieces = [];
  customerQueue = [];
  activeCustomer = null;
  basketZone = null;
  if (gameMode === 'market') {
    initCustomerQueue();
    nextCustomer();
  }

  generateBlocks();
  updateScoreUI();
  updateBlockCards();
  renderPreviewCanvases();
  updatePowerUpUI();
  document.getElementById('powerupHint').style.display = 'none';
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('rescueOverlay').classList.add('hidden');
}

// ===== 方块生成 =====
function generateBlocks() {
  blocks = [];
  const used = new Set();

  // Market Mode: 生成海鲜棋子（最多 N-1 个，保证至少 1 个普通棋子）
  let seafoodCount = 0;
  const maxSeafood = 2; // 3 个候选位中最多 2 个海鲜

  // 根据当前篮区大小，筛选能放进去的海鲜
  let availableSeafood = SEAFOOD_IDS;
  if (basketZone) {
    availableSeafood = SEAFOOD_IDS.filter(sid => {
      const s = SHAPES[SEAFOOD_PIECES[sid].shapeIdx].shape;
      return s.length <= basketZone.rows && s[0].length <= basketZone.cols;
    });
  }

  for (let i = 0; i < 3; i++) {
    // 剩余槽位必须留一个给普通棋子
    const remaining = 3 - i;
    const canFitSeafood = gameMode === 'market'
      && seafoodCount < maxSeafood
      && availableSeafood.length > 0
      && (seafoodCount < remaining); // 保证至少 1 个普通棋子

    if (canFitSeafood && Math.random() < 0.6) {
      const sid = availableSeafood[Math.floor(Math.random() * availableSeafood.length)];
      const info = SEAFOOD_PIECES[sid];
      blocks.push({
        shape:  SHAPES[info.shapeIdx].shape,
        color:  COLORS[info.shapeIdx % COLORS.length],
        placed: false,
        isSeafood: true,
        seafoodKey: info.key,
        seafoodEmoji: info.emoji,
      });
      seafoodCount++;
      used.add(-1);
    } else {
      let idx;
      do {
        idx = Math.floor(Math.random() * SHAPES.length);
      } while (used.has(idx) && used.size < SHAPES.length);
      used.add(idx);
      blocks.push({
        shape:  SHAPES[idx].shape,
        color:  COLORS[idx % COLORS.length],
        placed: false,
      });
    }
  }
  selectedIdx = -1;
  updateBlockCards();
}

/** Market Mode：立即补充放置后的空位 */
function refillBlockSlot(index) {
  // 统计当前已有的海鲜棋子数量
  const currentSeafoodCount = blocks.filter(b => b.isSeafood && !b.placed).length;

  // 根据当前篮区大小，筛选能放进去的海鲜
  let availableSeafood = SEAFOOD_IDS;
  if (basketZone) {
    availableSeafood = SEAFOOD_IDS.filter(sid => {
      const s = SHAPES[SEAFOOD_PIECES[sid].shapeIdx].shape;
      return s.length <= basketZone.rows && s[0].length <= basketZone.cols;
    });
  }
  // 最多 2 个海鲜，保证至少 1 个普通棋子
  const makeSeafood = currentSeafoodCount < 2 && Math.random() < 0.6 && availableSeafood.length > 0;

  if (makeSeafood) {
    const sid = availableSeafood[Math.floor(Math.random() * availableSeafood.length)];
    const info = SEAFOOD_PIECES[sid];
    blocks[index] = {
      shape: SHAPES[info.shapeIdx].shape,
      color: COLORS[info.shapeIdx % COLORS.length],
      placed: false,
      isSeafood: true,
      seafoodKey: info.key,
      seafoodEmoji: info.emoji,
    };
  } else {
    const ri = Math.floor(Math.random() * SHAPES.length);
    blocks[index] = {
      shape: SHAPES[ri].shape,
      color: COLORS[ri % COLORS.length],
      placed: false,
    };
  }
}

// ===== 核心逻辑 =====

/** 检查方块能否放在 (row,col) 位置 */
function canPlace(shape, row, col) {
  const rows = shape.length;
  const cols = shape[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!shape[r][c]) continue;
      const gr = row + r;
      const gc = col + c;
      if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
      if (grid[gr][gc] !== 0) return false;
    }
  }
  return true;
}

/** 计算方块包含的格子数 */
function cellCount(shape) {
  let n = 0;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) n++;
  return n;
}

/** 放置方块到棋盘 */
function placeBlock(row, col) {
  if (selectedIdx < 0 || gameOver) return false;
  if (clearingCells.length > 0) return false;

  const block = blocks[selectedIdx];
  if (!block || block.placed) return false;
  if (!canPlace(block.shape, row, col)) {
    sfxInvalid();
    return false;
  }

  // 海鲜棋子只能放在篮区内
  if (block.isSeafood && !isInsideBasketZone(block.shape, row, col)) {
    sfxInvalid();
    return false;
  }

  // 保存状态用于撤销
  history = {
    grid:        grid.map(r => [...r]),
    seafoodGrid: seafoodGrid.map(r => [...r]),
    blocks:      blocks.map(b => ({ ...b })),
    score:       score,
    combo:       combo,
    selectedIdx: selectedIdx,
    // Market mode
    shells:              shells,
    placedSeafoodPieces: placedSeafoodPieces.map(p => ({ ...p })),
    customerQueue:       customerQueue.map(c => ({ ...c, type: { ...c.type } })),
    activeCustomer:      activeCustomer ? { ...activeCustomer, type: { ...activeCustomer.type } } : null,
    basketZone:          basketZone ? { ...basketZone } : null,
  };

  // 放置
  const shapeCols = block.shape[0].length;
  const shapeRows = block.shape.length;
  for (let r = 0; r < shapeRows; r++) {
    for (let c = 0; c < shapeCols; c++) {
      if (block.shape[r][c]) {
        grid[row + r][col + c] = block.color;
        if (block.isSeafood) {
          seafoodGrid[row + r][col + c] = {
            key: block.seafoodKey,
            emoji: block.seafoodEmoji,
            originR: row, originC: col,
            cols: shapeCols, rows: shapeRows,
          };
        }
      } else if (block.isSeafood) {
        // 空缺格也记录，防止 drawEmptyCell 覆盖图片透明区
        seafoodGrid[row + r][col + c] = {
          key: block.seafoodKey,
          isGap: true,
          originR: row, originC: col,
          cols: shapeCols, rows: shapeRows,
        };
      }
    }
  }
  if (block.isSeafood) {
    placedSeafoodPieces.push({
      key: block.seafoodKey,
      originR: row, originC: col,
      rows: shapeRows, cols: shapeCols,
    });
  }
  block.placed = true;

  const placed = cellCount(block.shape);
  if (gameMode === 'freePlay') {
    score += placed;
  }

  // 检查消除（海鲜格子不参与消除）
  const rowsToClear = [];
  const colsToClear = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every(cell => cell !== 0)) rowsToClear.push(r);
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    if (grid.every(row => row[c] !== 0)) colsToClear.push(c);
  }

  const lineCount = rowsToClear.length + colsToClear.length;

  if (lineCount > 0) {
    // 构建消除格子集合（去重，排除海鲜格子）
    const ccSet = new Set();
    for (let r of rowsToClear) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!seafoodGrid[r][c]) ccSet.add(`${r},${c}`);
      }
    }
    for (let c of colsToClear) {
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!seafoodGrid[r][c]) ccSet.add(`${r},${c}`);
      }
    }

    clearingCells = [...ccSet].map(s => {
      const [r, c] = s.split(',').map(Number);
      return { row: r, col: c };
    });
    clearTimer = 22; // ~360ms @60fps

    if (gameMode === 'freePlay') {
      combo++;
      score += lineCount * 10 * combo;
    } else {
      combo++;
    }
    sfxClear(lineCount);
    spawnClearEffects(lineCount, combo, gameMode === 'freePlay' ? lineCount * 10 * combo : 0);
    
    // 消除期间不调用 checkGameOver，
    // 等动画结束、格子真正清空后由 gameLoop 统一判定
  } else {
    combo = 0;
    sfxPlace();
    
    // Market Mode: 检查是否完成篮区服务
    if (gameMode === 'market') {
      checkBasketServe();
    }

    // Free Play: 没有消除动画，直接判定 game over
    // Market Mode 延后到 refill 之后判定（避免因海鲜格限制误判）
    if (gameMode === 'freePlay' && !blocks.every(b => b.placed)) {
      checkGameOver();
    }
  }

  updatePowerUpUI(); // 放置方块后刷新道具按钮状态（刚有了 history，Undo 按钮可以启用了）

  // 更新最高分（仅 Free Play）
  if (gameMode === 'freePlay' && score > bestScore) {
    bestScore = score;
    localStorage.setItem('blockPuzzleBest', bestScore);
    document.getElementById('best').textContent = bestScore;
  }

  const placedSlot = selectedIdx;
  selectedIdx = -1;
  hoverCell   = null;
  updateScoreUI();
  updateBlockCards();
  renderPreviewCanvases();

  if (gameMode === 'market') {
    // Market Mode: 立即补充棋子，候选区永远保持3个
    refillBlockSlot(placedSlot);
    updateBlockCards();
    renderPreviewCanvases();
    // 有消除动画时不立即判定 game over，等动画结束格子清空后由 gameLoop 检查
    if (!gameOver && lineCount === 0 && clearTimer === 0 && !pendingBasketClear) checkGameOver();
  } else if (blocks.every(b => b.placed)) {
    setTimeout(() => {
      if (!gameOver) {
        generateBlocks();
        renderPreviewCanvases();
        checkGameOver(); // 新方块能否放置？
      }
    }, lineCount > 0 ? 420 : 150);
  }

  return true;
}

/** 游戏结束判定 */
function checkGameOver() {
  if (gameOver) return;
  // 还有未放置的方块
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].placed) continue;
    // 遍历所有可能的位置
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!canPlace(blocks[i].shape, r, c)) continue;
        // 海鲜棋子：只检查篮区内位置
        if (blocks[i].isSeafood && !isInsideBasketZone(blocks[i].shape, r, c)) continue;
        return; // 还有位置可放
      }
  }
  // 无处可放 → 弹出救援
  sfxGameOver();
  showRescueOverlay();
}

function showGameOver() {
  document.getElementById('rescueOverlay').classList.add('hidden');
  const overlayCard = document.querySelector('#overlay .overlay-card');
  const h2 = overlayCard.querySelector('h2');
  const p = overlayCard.querySelector('p');
  if (gameMode === 'market') {
    h2.textContent = 'Shift Over!';
    p.textContent = 'Shells earned';
    document.getElementById('finalScore').textContent = `🐚 ${sessionShells}`;
    const newBestEl = document.getElementById('newBest');
    if (sessionShells > bestSessionShells && sessionShells > 0) {
      bestSessionShells = sessionShells;
      localStorage.setItem('blockPuzzleBestShells', bestSessionShells);
      newBestEl.textContent = 'New Best! 🏆';
      newBestEl.classList.remove('hidden');
    } else if (bestSessionShells > 0) {
      newBestEl.textContent = `Best: 🐚 ${bestSessionShells}`;
      newBestEl.classList.remove('hidden');
    } else {
      newBestEl.classList.add('hidden');
    }
  } else {
    h2.textContent = 'Game Over';
    p.textContent = 'Final Score';
    document.getElementById('finalScore').textContent = score;
    const newBestEl = document.getElementById('newBest');
    if (score >= bestScore && score > 0) {
      newBestEl.classList.remove('hidden');
    } else {
      newBestEl.classList.add('hidden');
    }
  }
  document.getElementById('overlay').classList.remove('hidden');
}

// ===== 救援系统 =====

function showRescueOverlay() {
  gameOver = true;
  const ov = document.getElementById('rescueOverlay');
  ov.classList.remove('hidden');

  // Bomb 救援
  const bombCost = 10;
  const hasBomb = powerUps.bomb > 0;
  const canBuyBomb = shells >= bombCost;
  const bombBtn = ov.querySelector('[data-action="bomb"]');
  const bombCostEl = document.getElementById('rescueBombCost');
  if (hasBomb) {
    bombCostEl.textContent = `x${powerUps.bomb}`;
    bombBtn.classList.remove('disabled');
  } else if (canBuyBomb) {
    bombCostEl.textContent = `🐚${bombCost}`;
    bombBtn.classList.remove('disabled');
  } else {
    bombCostEl.textContent = `🐚${bombCost}`;
    bombBtn.classList.add('disabled');
  }

  // Shuffle 救援
  const shuffleCost = 8;
  const hasShuffle = powerUps.shuffle > 0;
  const canBuyShuffle = shells >= shuffleCost;
  const shuffleBtn = ov.querySelector('[data-action="shuffle"]');
  const shuffleCostEl = document.getElementById('rescueShuffleCost');
  if (hasShuffle) {
    shuffleCostEl.textContent = `x${powerUps.shuffle}`;
    shuffleBtn.classList.remove('disabled');
  } else if (canBuyShuffle) {
    shuffleCostEl.textContent = `🐚${shuffleCost}`;
    shuffleBtn.classList.remove('disabled');
  } else {
    shuffleCostEl.textContent = `🐚${shuffleCost}`;
    shuffleBtn.classList.add('disabled');
  }

  // Undo 救援
  const undoCost = 5;
  const hasUndo = powerUps.undoStep > 0;
  const canBuyUndo = shells >= undoCost;
  const undoBtn = ov.querySelector('[data-action="undo"]');
  const undoCostEl = document.getElementById('rescueUndoCost');
  if (hasUndo) {
    undoCostEl.textContent = `x${powerUps.undoStep}`;
    undoBtn.classList.remove('disabled');
  } else if (canBuyUndo) {
    undoCostEl.textContent = `🐚${undoCost}`;
    undoBtn.classList.remove('disabled');
  } else {
    undoCostEl.textContent = `🐚${undoCost}`;
    undoBtn.classList.add('disabled');
  }

  document.getElementById('rescueOverlay').onclick = (e) => {
    const action = e.target.closest('[data-action]');
    if (action) {
      const type = action.dataset.action;
      handleRescue(type);
    }
    if (e.target.id === 'btnRescueGiveUp') {
      giveUpAndSettle();
    }
  };
}

function handleRescue(type) {
  document.getElementById('rescueOverlay').classList.add('hidden');
  gameOver = false;

  if (type === 'bomb') {
    if (powerUps.bomb > 0) {
      powerUps.bomb--;
    } else if (shells >= 10) {
      shells -= 10;
      marketSaveShells();
      updateShellsUI();
    } else {
      gameOver = true;
      return;
    }
    savePowerUps();
    powerUpMode = 'bomb';
    rescueMode = true;
  } else if (type === 'shuffle') {
    if (powerUps.shuffle > 0) {
      powerUps.shuffle--;
    } else if (shells >= 8) {
      shells -= 8;
      marketSaveShells();
      updateShellsUI();
    } else {
      gameOver = true;
      return;
    }
    savePowerUps();
    rescueShuffle();
  } else if (type === 'undo') {
    if (!history) { gameOver = true; return; }
    if (powerUps.undoStep > 0) {
      powerUps.undoStep--;
    } else if (shells >= 5) {
      shells -= 5;
      marketSaveShells();
      updateShellsUI();
    } else {
      gameOver = true;
      return;
    }
    savePowerUps();
    undo();
  }
  updatePowerUpUI();
}

function rescueShuffle() {
  const usedShapes = new Set();
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].placed) continue;
    if (blocks[i].isSeafood) {
      const sid = SEAFOOD_IDS[Math.floor(Math.random() * SEAFOOD_IDS.length)];
      const info = SEAFOOD_PIECES[sid];
      blocks[i] = {
        shape: SHAPES[info.shapeIdx].shape,
        color: COLORS[info.shapeIdx % COLORS.length],
        placed: false,
        isSeafood: true,
        seafoodKey: info.key,
        seafoodEmoji: info.emoji,
      };
    } else {
      let idx;
      do { idx = Math.floor(Math.random() * SHAPES.length); }
      while (usedShapes.has(idx) && usedShapes.size < SHAPES.length);
      usedShapes.add(idx);
      blocks[i] = {
        shape: SHAPES[idx].shape,
        color: COLORS[idx % COLORS.length],
        placed: false,
      };
    }
  }
  selectedIdx = null;
  updateBlockCards();
  renderPreviewCanvases();
  render();
}

function giveUpAndSettle() {
  document.getElementById('rescueOverlay').classList.add('hidden');
  showGameOver();
}

// ===== 消除特效 =====

function spawnClearEffects(lineCount, combo, scoreEarned) {
  // 金色粒子：每个消除格为中心迸发粒子
  for (const cell of clearingCells) {
    const cx = gx(cell.col) + CELL_SIZE / 2;
    const cy = gy(cell.row) + CELL_SIZE / 2;
    const count = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      const hue = 38 + Math.random() * 22; // 金色系
      clearingParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1,
        size: 2 + Math.random() * 4,
        hue,
      });
    }
  }

  // 得分飘字
  if (scoreEarned > 0) {
    const avgR = clearingCells.reduce((s, c) => s + c.row, 0) / clearingCells.length;
    const avgC = clearingCells.reduce((s, c) => s + c.col, 0) / clearingCells.length;
    scoreFloats.push({
      x: gx(avgC) + CELL_SIZE / 2,
      y: gy(avgR) + CELL_SIZE / 2,
      text: `+${scoreEarned}`,
      life: 1,
    });
  }
}

/** 撤销 */
function undo() {
  if (!history || gameOver || clearingCells.length > 0) return;
  grid        = history.grid;
  seafoodGrid = history.seafoodGrid ? history.seafoodGrid.map(r => [...r]) : Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  score       = history.score;
  combo       = history.combo;
  blocks      = history.blocks;
  selectedIdx = history.selectedIdx;
  // Market mode
  if (history.shells !== undefined)        shells        = history.shells;
  if (history.placedSeafoodPieces)         placedSeafoodPieces = history.placedSeafoodPieces.map(p => ({ ...p }));
  if (history.customerQueue)               customerQueue = history.customerQueue.map(c => ({ ...c, type: { ...c.type } }));
  if (history.activeCustomer !== undefined) activeCustomer = history.activeCustomer ? { ...history.activeCustomer, type: { ...history.activeCustomer.type } } : null;
  if (history.basketZone !== undefined)    basketZone    = history.basketZone ? { ...history.basketZone } : null;
  history     = null;
  hoverCell   = null;

  updateScoreUI();
  updateBlockCards();
  renderPreviewCanvases();
  if (gameMode === 'market') updateCustomerUI();
}

// ===== 渲染 =====

/** 辅助：圆角矩形 */
function roundRect(ctx, x, y, w, h, r) {
  if (w < 0 || h < 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** 网格坐标 → 画布像素 */
function gx(col) { return PADDING + col * CELL_SIZE; }
function gy(row) { return PADDING + row * CELL_SIZE; }

/** ★ 绘制填充方块（替换素材改这里） */
function drawFilledCell(ctx, x, y, size, color) {
  const tm = themeColors();
  // -- 主色块 --
  ctx.fillStyle = color;
  roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 5);
  ctx.fill();

  // -- 高光（左上）--
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 5);
  ctx.clip();
  ctx.fillStyle = tm.cellHighlight;
  ctx.fillRect(x + 2, y + 2, size - 4, (size - 4) * 0.45);
  // -- 阴影（右下）--
  ctx.fillStyle = tm.cellShadow;
  ctx.fillRect(x + 2, y + 2 + (size - 4) * 0.55, size - 4, (size - 4) * 0.45);
  ctx.restore();

  // -- 细边框 --
  ctx.strokeStyle = tm.cellBorder;
  ctx.lineWidth = 0.8;
  roundRect(ctx, x + 1.5, y + 1.5, size - 3, size - 3, 5);
  ctx.stroke();
}

/** 绘制空格子 */
function drawEmptyCell(ctx, x, y, size) {
  ctx.fillStyle = themeColors().emptyCell;
  roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 4);
  ctx.fill();
}

/** 绘制篮区高亮（Market Mode） */
function drawBasketZone(ctx, zone) {
  const { row, col, rows, cols } = zone;
  const x = gx(col);
  const y = gy(row);
  const w = cols * CELL_SIZE;
  const h = rows * CELL_SIZE;

  // 半透明填充
  ctx.fillStyle = 'rgba(250,200,80,0.15)';
  roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 8);
  ctx.fill();

  // 虚线边框
  ctx.save();
  ctx.strokeStyle = 'rgba(250,200,80,0.7)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = Date.now() / 200; // 流动动画
  roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 大小标签
  ctx.fillStyle = 'rgba(250,200,80,0.9)';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${cols}×${rows}`, x + w / 2, y + h / 2 + 5);
}

/** 绘制悬停预览 */
function drawPreview(ctx, shape, row, col, valid) {
  const tm = themeColors();
  const rows = shape.length;
  const cols = shape[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!shape[r][c]) continue;
      const px = gx(col + c);
      const py = gy(row + r);

      if (valid) {
        ctx.fillStyle   = tm.previewValidFill;
        ctx.strokeStyle = tm.previewValidStroke;
      } else {
        ctx.fillStyle   = tm.previewInvalidFill;
        ctx.strokeStyle = tm.previewInvalidStroke;
      }
      roundRect(ctx, px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 5);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

/** 主渲染 */
function render() {
  if (!grid) return; // 游戏未开始时跳过
  
  const tm = themeColors();
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 棋盘背景
  ctx.fillStyle = tm.gridBg;
  roundRect(ctx, PADDING - 4, PADDING - 4,
            GRID_SIZE * CELL_SIZE + 8, GRID_SIZE * CELL_SIZE + 8, 14);
  ctx.fill();

  // 正在消除的格子
  const clearingSet = new Set();
  if (clearTimer > 0 && clearingCells.length > 0) {
    for (const c of clearingCells) clearingSet.add(`${c.row},${c.col}`);
  }

  // 绘制每个格子
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const x = gx(c);
      const y = gy(r);
      const key = `${r},${c}`;

      if (clearingSet.has(key)) {
        // 消除动画：白闪 + 缩放淡出
        const progress = 1 - clearTimer / 22;
        const scale = 1 + progress * 0.15;
        const alpha = 1 - progress;
        ctx.save();
        ctx.translate(x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + alpha * 0.7})`;
        roundRect(ctx, -CELL_SIZE / 2 + 1, -CELL_SIZE / 2 + 1, CELL_SIZE - 2, CELL_SIZE - 2, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      } else if (grid[r][c] !== 0) {
        if (seafoodGrid[r][c]) {
          const sd = seafoodGrid[r][c];
          // ★ 逐格单独绘制背景（和普通棋子一致），然后贴图
          drawFilledCell(ctx, x, y, CELL_SIZE, '#C5E8F7');

          if (!seafoodImages[sd.key]) {
            // 无图片素材：每格画 emoji
            ctx.font = `${CELL_SIZE * 0.55}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sd.emoji, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
          }
        } else {
          ctx.globalAlpha = 0.65;
          drawFilledCell(ctx, x, y, CELL_SIZE, grid[r][c]);
          ctx.globalAlpha = 1;
        }
      } else {
        // 空缺格
        drawEmptyCell(ctx, x, y, CELL_SIZE);
      }
    }
  }

  // 海鲜棋子整图贴图（最后一层，PNG透明像素处理缺口）
  for (const piece of placedSeafoodPieces) {
    const img = seafoodImages[piece.key];
    if (!img || !img.complete || !img.naturalWidth) continue;
    const x = gx(piece.originC);
    const y = gy(piece.originR);
    ctx.drawImage(img, x, y, piece.cols * CELL_SIZE, piece.rows * CELL_SIZE);
  }

  // 篮区高亮（Market Mode）
  if (gameMode === 'market' && basketZone && clearingCells.length === 0) {
    drawBasketZone(ctx, basketZone);
  }

  // 悬停预览
  if (selectedIdx >= 0 && hoverCell && !gameOver && clearingCells.length === 0) {
    const block = blocks[selectedIdx];
    if (block && !block.placed) {
      let valid = canPlace(block.shape, hoverCell.row, hoverCell.col);
      // 海鲜棋子额外检查篮区
      if (valid && block.isSeafood && !isInsideBasketZone(block.shape, hoverCell.row, hoverCell.col)) {
        valid = false;
      }
      drawPreview(ctx, block.shape, hoverCell.row, hoverCell.col, valid);
    }
  }

  // Bomb 预览
  if (powerUpMode === 'bomb' && hoverCell && !gameOver && clearingCells.length === 0) {
    const R = 1;
    for (let r = hoverCell.row - R; r <= hoverCell.row + R; r++) {
      for (let c = hoverCell.col - R; c <= hoverCell.col + R; c++) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          const px = gx(c); const py = gy(r);
          ctx.fillStyle = 'rgba(255,80,50,0.25)';
          roundRect(ctx, px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 5);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,80,50,0.7)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
  }

  // 网格线
  ctx.strokeStyle = tm.gridLine;
  ctx.lineWidth   = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    const pos = PADDING + i * CELL_SIZE;
    // 竖线
    ctx.beginPath();
    ctx.moveTo(pos, PADDING);
    ctx.lineTo(pos, PADDING + GRID_SIZE * CELL_SIZE);
    ctx.stroke();
    // 横线
    ctx.beginPath();
    ctx.moveTo(PADDING, pos);
    ctx.lineTo(PADDING + GRID_SIZE * CELL_SIZE, pos);
    ctx.stroke();
  }

  // 外框
  ctx.strokeStyle = tm.gridBorder;
  ctx.lineWidth   = 2;
  ctx.strokeRect(PADDING, PADDING, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

  // 金色粒子
  for (const p of clearingParticles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = `hsl(${p.hue}, 90%, 62%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    // 光晕
    ctx.fillStyle = `hsl(${p.hue}, 100%, 80%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 得分飘字
  for (const s of scoreFloats) {
    const alpha = Math.min(1, s.life * 1.5);
    ctx.globalAlpha = alpha;
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text, s.x + 1, s.y + 1);
    // 主体金色
    ctx.fillStyle = '#FFD700';
    ctx.fillText(s.text, s.x, s.y);
    // 描边
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 1;
    ctx.strokeText(s.text, s.x, s.y);
  }
  ctx.globalAlpha = 1;
}

/** ★ 绘制方块预览（替换素材改这里） */
const PREVIEW_CELL = 22; // 统一的预览格大小，所有方块等比例

function renderPreviewCanvases() {
  for (let i = 0; i < 3; i++) {
    const pc   = previewCanvases[i];
    const pctx = pc.getContext('2d');
    pctx.clearRect(0, 0, pc.width, pc.height);

    const block = blocks[i];
    if (!block || block.placed) continue;

    const shape  = block.shape;
    const rows   = shape.length;
    const cols   = shape[0].length;
    const totalW = cols * PREVIEW_CELL;
    const totalH = rows * PREVIEW_CELL;
    const offX   = (pc.width  - totalW) / 2;
    const offY   = (pc.height - totalH) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!shape[r][c]) continue;
        const px = offX + c * PREVIEW_CELL;
        const py = offY + r * PREVIEW_CELL;

        if (block.isSeafood) {
          // 海鲜棋子：逐格画背景（和普通棋子一致）
          pctx.fillStyle = '#C5E8F7';
          roundRect(pctx, px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2, 3);
          pctx.fill();

          if (!seafoodImages[block.seafoodKey]) {
            // 无图片：emoji 逐格绘制
            pctx.font = `${PREVIEW_CELL * 0.6}px sans-serif`;
            pctx.textAlign = 'center';
            pctx.textBaseline = 'middle';
            pctx.fillText(block.seafoodEmoji, px + PREVIEW_CELL / 2, py + PREVIEW_CELL / 2);
          }
        } else {
          pctx.fillStyle = block.color;
          roundRect(pctx, px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2, 3);
          pctx.fill();
        }

        // 高光
        pctx.fillStyle = 'rgba(255,255,255,0.2)';
        pctx.fillRect(px + 1, py + 1, PREVIEW_CELL - 2, (PREVIEW_CELL - 2) * 0.4);
      }
    }

    // 海鲜棋子整图贴图（在 origin 位置叠一层，覆盖 bounding box）
    if (block.isSeafood && block.seafoodKey) {
      const img = seafoodImages[block.seafoodKey];
      if (img && img.complete && img.naturalWidth) {
        pctx.drawImage(img, offX, offY, totalW, totalH);
      }
    }
  }
}

/** 生成拖拽时跟随鼠标的方块缩略图 */
function createDragImage(block) {
  const shape  = block.shape;
  const rows   = shape.length;
  const cols   = shape[0].length;
  const pad    = 4;
  const totalW = cols * PREVIEW_CELL + pad * 2;
  const totalH = rows * PREVIEW_CELL + pad * 2;
  const c      = document.createElement('canvas');
  c.width  = totalW;
  c.height = totalH;
  const cx = c.getContext('2d');

  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      if (!shape[r][cc]) continue;
      const px = pad + cc * PREVIEW_CELL;
      const py = pad + r  * PREVIEW_CELL;

      if (block.isSeafood) {
        // 逐格画背景（和普通棋子一致）
        cx.fillStyle = '#C5E8F7';
        roundRect(cx, px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2, 3);
        cx.fill();

        if (!seafoodImages[block.seafoodKey]) {
          cx.font = `${PREVIEW_CELL * 0.6}px sans-serif`;
          cx.textAlign = 'center';
          cx.textBaseline = 'middle';
          cx.fillText(block.seafoodEmoji, px + PREVIEW_CELL / 2, py + PREVIEW_CELL / 2);
        }
      } else {
        cx.fillStyle = block.color;
        roundRect(cx, px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2, 3);
        cx.fill();
      }

      cx.fillStyle = 'rgba(255,255,255,0.25)';
      cx.fillRect(px + 1, py + 1, PREVIEW_CELL - 2, (PREVIEW_CELL - 2) * 0.4);
    }
  }

  // 海鲜棋子整图贴图（在 origin 位置叠一层）
  if (block.isSeafood && block.seafoodKey) {
    const img = seafoodImages[block.seafoodKey];
    if (img && img.complete && img.naturalWidth) {
      cx.drawImage(img, pad, pad, totalW - pad * 2, totalH - pad * 2);
    }
  }

  return c;
}

// ===== UI 更新 =====
function updateScoreUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('combo').textContent = combo > 0 ? `x${combo}` : '-';
  document.getElementById('shells').textContent = `🐚 ${shells}`;
}

function updateBlockCards() {
  const cards = document.querySelectorAll('.block-card');
  cards.forEach((card, i) => {
    card.classList.remove('selected', 'placed');
    if (blocks[i] && blocks[i].placed) {
      card.classList.add('placed');
      card.draggable = false;
    } else {
      card.draggable = true;
    }
    if (i === selectedIdx) card.classList.add('selected');
  });
}
// ===== 帮助弹窗 =====
function showHelp() {
  const container = document.getElementById('helpContent');
  if (gameMode === 'freePlay') {
    container.innerHTML = `
      <div class="help-section">
        <h3>🎯 Goal</h3>
        <p>Drag blocks from the tray to the 8×8 board. Fill a full row or column to clear it. Keep playing as long as there's room!</p>
      </div>
      <div class="help-section">
        <h3>🖱 Controls</h3>
        <p><b>Mouse:</b> Click a piece to pick it up, move it over the board, click again to place.</p>
        <p><b>Keyboard:</b> Use <b>1–3</b> to select pieces, <b>Arrow keys</b> to nudge on the board.</p>
      </div>
      <div class="help-section">
        <h3>💣 Power-ups</h3>
        <p><b>Bomb</b> — destroys a 3×3 area.<br><b>Shuffle</b> — replaces all unplaced pieces.<br><b>Undo+</b> — reverses your last placement.</p>
      </div>
      <div class="help-section">
        <h3>🏆 Scoring</h3>
        <p>Each cell placed = <b>1 point</b>. Each row/column cleared = <b>bonus points</b>. Score as high as you can!</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="help-section">
        <h3>🎯 Goal</h3>
        <p>Serve customers by filling their <b>basket zone</b> — the highlighted area on the board. Match blocks into the basket to complete orders and earn <b>🐚 Shells</b>!</p>
      </div>
      <div class="help-section">
        <h3>📦 Basket Zone</h3>
        <p>Watch for a colored rectangle on the board. Fill every cell inside it with blocks to serve the customer.</p>
      </div>
      <div class="help-section">
        <h3>🍣 Seafood Pieces</h3>
        <p>Irregularly shaped seafood pieces appear on the board. They are <b>immune to row/column clears</b> — only disappear when included in a basket serve!</p>
      </div>
      <div class="help-section">
        <h3>🐚 Earning Shells</h3>
        <p>Each basket serve = <b>5 shells</b>. Each seafood cell in the basket = <b>+3 bonus shells</b>. Use shells to buy power-ups in the <b>Shop</b>.</p>
      </div>
      <div class="help-section">
        <h3>💡 Tips</h3>
        <p>Aim to include seafood in your basket serves for maximum shells. Buy <b>Bomb</b> or <b>Shuffle</b> when you're stuck!</p>
      </div>
    `;
  }
}

// ===== 面板模式切换 =====
function switchPanel(mode) {
  const isFree = mode === 'freePlay';
  document.getElementById('scoreRow').style.display       = isFree ? '' : 'none';
  document.getElementById('comboRow').style.display       = isFree ? '' : 'none';
  document.getElementById('bestRow').style.display        = isFree ? '' : 'none';
  document.getElementById('shellsRow').style.display      = isFree ? 'none' : '';
  document.getElementById('customerSide').style.display = isFree ? 'none' : '';
  // 更新主面板标题
  document.getElementById('overlayTitle').textContent = isFree ? 'Free Play' : 'Market Mode';
}

// ===== 道具系统 =====
function loadPowerUps() {
  const saved = localStorage.getItem('blockPuzzlePowerUps');
  if (saved) {
    try { powerUps = JSON.parse(saved); } catch(e) {}
  }
}

function savePowerUps() {
  localStorage.setItem('blockPuzzlePowerUps', JSON.stringify(powerUps));
}

function updatePowerUpUI() {
  document.getElementById('bombCount').textContent   = powerUps.bomb;
  document.getElementById('shuffleCount').textContent = powerUps.shuffle;
  document.getElementById('undoStepCount').textContent = powerUps.undoStep;
  const busy = gameOver || (clearingCells && clearingCells.length > 0);
  const noUnplaced = blocks && blocks.every(b => b.placed);
  document.getElementById('btnBomb').disabled      = powerUps.bomb <= 0 || busy;
  document.getElementById('btnShuffle').disabled   = powerUps.shuffle <= 0 || busy;
  document.getElementById('btnUndoStep').disabled  = powerUps.undoStep <= 0 || busy || !history;
  document.getElementById('btnBomb').classList.toggle('active', powerUpMode === 'bomb');
}

function deactivatePowerUp() {
  if (powerUpMode) {
    powerUpMode = null;
    selectedIdx = -1;
    updatePowerUpUI();
    updateBlockCards();
    document.getElementById('powerupHint').style.display = 'none';
  }
}

/** Bomb：点击棋盘 3×3 爆破 */
function activateBomb() {
  if (powerUps.bomb <= 0 || gameOver || (clearingCells && clearingCells.length > 0)) return;
  if (powerUpMode === 'bomb') { deactivatePowerUp(); return; }
  powerUpMode = 'bomb';
  selectedIdx = -1;
  updatePowerUpUI();
  updateBlockCards();
  document.getElementById('powerupHint').textContent = '💣 Click the board to blast a 3×3 area';
  document.getElementById('powerupHint').style.display = 'block';
}

function useBomb(row, col) {
  if (powerUpMode !== 'bomb') return;
  if (!rescueMode && powerUps.bomb <= 0) return;
  const R = 1; // 3×3
  const targets = [];
  for (let r = row - R; r <= row + R; r++) {
    for (let c = col - R; c <= col + R; c++) {
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && grid[r][c] !== 0) {
        targets.push({ row: r, col: c });
      }
    }
  }
  if (targets.length === 0) { sfxInvalid(); return; }

  if (!rescueMode) {
    powerUps.bomb--;
    savePowerUps();
  }
  rescueMode = false;
  powerUpMode = null;
  history = null; // 爆破不可撤销
  hoverCell = null;
  clearingCells = targets;
  clearTimer = 22;
  sfxClear(2);
  spawnClearEffects(0, 0, 0); // 炸弹只产生粒子，无得分飘字
  updatePowerUpUI();
  document.getElementById('powerupHint').style.display = 'none';
}

/** Shuffle：刷新未放置的方块 */
function activateShuffle() {
  if (powerUps.shuffle <= 0 || gameOver || (clearingCells && clearingCells.length > 0)) return;
  powerUps.shuffle--;
  savePowerUps();
  deactivatePowerUp();
  history = null;

  const unplaced = [];
  for (let i = 0; i < blocks.length; i++) { if (!blocks[i].placed) unplaced.push(i); }
  if (unplaced.length === 0) {
    // 全部已放置，强制刷新全部
    generateBlocks();
  } else {
    const usedSet = new Set();
    for (const i of unplaced) {
      let si;
      do { si = Math.floor(Math.random() * SHAPES.length); } while (usedSet.has(si) && usedSet.size < SHAPES.length);
      usedSet.add(si);
      blocks[i] = { shape: SHAPES[si].shape, color: COLORS[si % COLORS.length], placed: false };
    }
  }
  selectedIdx = -1;
  playTone(440, 0.08, 'sine', 0.06);
  setTimeout(() => playTone(550, 0.08, 'sine', 0.06), 80);
  setTimeout(() => playTone(660, 0.08, 'sine', 0.06), 160);
  updatePowerUpUI();
  updateBlockCards();
  renderPreviewCanvases();
  checkGameOver();
}

/** Undo+：消耗一个道具撤销 */
function activateUndoStep() {
  if (powerUps.undoStep <= 0 || !history || gameOver || (clearingCells && clearingCells.length > 0)) return;
  powerUps.undoStep--;
  savePowerUps();
  deactivatePowerUp();
  undo();
  updatePowerUpUI();
}

/** 更新商店弹窗余额 */
function updateShopOverlay() {
  const bal = parseInt(localStorage.getItem('blockPuzzleShells') || '0');
  document.getElementById('shopShells').textContent = bal;
  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.disabled = bal < parseInt(btn.dataset.cost);
  });
}

// ===== 顾客系统（Market Mode）=====
function marketLoadShells() {
  bestSessionShells = parseInt(localStorage.getItem('blockPuzzleBestShells') || '0');
  return parseInt(localStorage.getItem('blockPuzzleShells') || '0');
}

function marketSaveShells() {
  localStorage.setItem('blockPuzzleShells', shells);
}

function randomCustomerIcon() {
  return CUSTOMER_ICONS[Math.floor(Math.random() * CUSTOMER_ICONS.length)];
}

function randomBasketType() {
  return BASKET_TYPES[Math.floor(Math.random() * BASKET_TYPES.length)];
}

/** 初始化顾客队列 */
function initCustomerQueue() {
  customerQueue = [];
  // 填充 4 个顾客（1 个活跃 + 3 个排队）
  for (let i = 0; i < 4; i++) {
    customerQueue.push({
      icon: randomCustomerIcon(),
      type: randomBasketType(),
    });
  }
}

/** 下一位顾客 */
function nextCustomer() {
  if (customerQueue.length === 0) {
    initCustomerQueue();
  }
  activeCustomer = customerQueue.shift();
  // 补充一个新顾客
  customerQueue.push({
    icon: randomCustomerIcon(),
    type: randomBasketType(),
  });

  // 放置篮区
  placeBasketZone();
  updateCustomerUI();
}

/** 在棋盘上放置篮区 */
function placeBasketZone() {
  if (!activeCustomer) return;

  const { w, h } = activeCustomer.type;
  let tries = 0;

  while (tries < 50) {
    const row = Math.floor(Math.random() * (GRID_SIZE - h + 1));
    const col = Math.floor(Math.random() * (GRID_SIZE - w + 1));

    // 检查区域内是否有已填充的格子
    let occupied = false;
    for (let r = row; r < row + h; r++) {
      for (let c = col; c < col + w; c++) {
        if (grid[r][c] !== 0) { occupied = true; break; }
      }
      if (occupied) break;
    }

    if (!occupied) {
      basketZone = {
        row, col, rows: h, cols: w,
        shells: activeCustomer.type.shells,
        total: w * h,
      };
      return;
    }
    tries++;
  }

  // 回退：尝试缩小篮区
  const fallbackTypes = [
    { w: 2, h: 3, shells: 5 },
    { w: 3, h: 2, shells: 5 },
  ];
  for (let ft of fallbackTypes) {
    tries = 0;
    while (tries < 50) {
      const row = Math.floor(Math.random() * (GRID_SIZE - ft.h + 1));
      const col = Math.floor(Math.random() * (GRID_SIZE - ft.w + 1));

      let occupied = false;
      for (let r = row; r < row + ft.h; r++) {
        for (let c = col; c < col + ft.w; c++) {
          if (grid[r][c] !== 0) { occupied = true; break; }
        }
        if (occupied) break;
      }

      if (!occupied) {
        basketZone = {
          row, col, rows: ft.h, cols: ft.w,
          shells: ft.shells,
          total: ft.w * ft.h,
        };
        return;
      }
      tries++;
    }
  }

  // 实在没有位置，跳过该顾客
  basketZone = null;
}

/** 计算篮区已填充格子数 */
function countBasketFilled() {
  if (!basketZone) return 0;
  let filled = 0;
  const { row, col, rows, cols } = basketZone;
  for (let r = row; r < row + rows; r++) {
    for (let c = col; c < col + cols; c++) {
      if (grid[r][c] !== 0) filled++;
    }
  }
  return filled;
}

/** 检查是否完成篮区服务 */
function checkBasketServe() {
  if (!basketZone || !activeCustomer || pendingBasketClear || clearTimer > 0) return;

  const filled = countBasketFilled();
  const total = basketZone.total;

  if (filled >= total) {
    const { row, col, rows, cols } = basketZone;

    // 统计篮区内海鲜格子数
    let seafoodCount = 0;
    for (let r = row; r < row + rows; r++) {
      for (let c = col; c < col + cols; c++) {
        if (seafoodGrid[r][c]) seafoodCount++;
      }
    }

    // 收集篮区所有格子作为消除动画目标
    clearingCells = [];
    for (let r = row; r < row + rows; r++) {
      for (let c = col; c < col + cols; c++) {
        clearingCells.push({ row: r, col: c });
      }
    }
    clearTimer = 22;

    // 延迟到动画完成后实际清除
    pendingBasketClear = { row, col, rows, cols, seafoodCount, reward: 5 + seafoodCount * 3 };

    // 生成金色粒子（无得分飘字）
    spawnClearEffects(0, 0, 0);

    // 音效
    playTone(660, 0.1, 'sine', 0.08);
    setTimeout(() => playTone(880, 0.12, 'sine', 0.08), 100);
    setTimeout(() => playTone(1100, 0.15, 'sine', 0.08), 200);
    if (seafoodCount > 0) {
      playTone(440 + seafoodCount * 55, 0.08, 'sine', 0.06);
    }
    // 注意: nextCustomer + rewards 移到 gameLoop 动画完成后
  } else {
    updateCustomerProgressUI();
  }
}

/** 更新顾客UI */
function updateCustomerUI() {
  if (!activeCustomer) return;
  document.getElementById('custIcon').textContent = activeCustomer.icon;
  document.getElementById('custBasketHint').textContent =
    `Fill ${activeCustomer.type.w}×${activeCustomer.type.h} area!`;
  updateCustomerProgressUI();

  // 更新队列
  const queueRow = document.getElementById('queueRow');
  queueRow.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const slot = document.createElement('div');
    slot.className = 'queue-slot';
    if (i < customerQueue.length) {
      slot.innerHTML = `<span>${customerQueue[i].icon}</span>`;
    }
    queueRow.appendChild(slot);
  }
}

function updateCustomerProgressUI() {
  const filled = countBasketFilled();
  let seafoodCount = 0;
  if (basketZone) {
    const { row, col, rows, cols } = basketZone;
    for (let r = row; r < row + rows; r++)
      for (let c = col; c < col + cols; c++)
        if (seafoodGrid[r][c]) seafoodCount++;
  }
  const txt = seafoodCount > 0
    ? `${filled} / ${basketZone ? basketZone.total : '?'} 🦞${seafoodCount}`
    : `${filled} / ${basketZone ? basketZone.total : '?'}`;
  document.getElementById('custProgress').textContent = txt;
}

// ===== 事件 =====
function getGridCell(e) {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = CANVAS_SIZE / rect.width;
  const scaleY = CANVAS_SIZE / rect.height;
  const mx     = (e.clientX - rect.left) * scaleX;
  const my     = (e.clientY - rect.top)  * scaleY;

  const col = Math.floor((mx - PADDING) / CELL_SIZE);
  const row = Math.floor((my - PADDING) / CELL_SIZE);

  if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE) {
    return { row, col };
  }
  return null;
}

function setupEvents() {
  // ---- 画布鼠标 ----
  canvas.addEventListener('mousemove', (e) => {
    hoverCell = getGridCell(e);
  });
  canvas.addEventListener('mouseleave', () => {
    hoverCell = null;
  });
  canvas.addEventListener('click', (e) => {
    if (gameOver || clearingCells.length > 0) return;
    initAudio();

    const cell = getGridCell(e);
    if (!cell) return;

    // Bomb mode
    if (powerUpMode === 'bomb') {
      useBomb(cell.row, cell.col);
      return;
    }

    if (selectedIdx >= 0 && blocks[selectedIdx] && !blocks[selectedIdx].placed) {
      deactivatePowerUp(); // 任何正常放置取消道具激活
      placeBlock(cell.row, cell.col);
    } else {
      sfxInvalid();
    }
  });

  // ---- 画布拖拽接收 ----
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault(); // 必须阻止默认行为才能 drop
    e.dataTransfer.dropEffect = 'move';
    hoverCell = getGridCell(e);
  });
  canvas.addEventListener('dragleave', () => {
    hoverCell = null;
  });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    hoverCell = null;
    if (gameOver || clearingCells.length > 0) return;

    const idx = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(idx) || !blocks[idx] || blocks[idx].placed) return;

    const cell = getGridCell(e);
    if (!cell) return;

    deactivatePowerUp();
    selectedIdx = idx;
    updateBlockCards();
    placeBlock(cell.row, cell.col);
  });

  // ---- 选方块卡片 ----
  document.querySelectorAll('.block-card').forEach(card => {
    card.addEventListener('click', () => {
      if (gameOver || clearingCells.length > 0) return;
      initAudio();
      const idx = parseInt(card.dataset.idx);
      if (!blocks[idx] || blocks[idx].placed) return;

      // 道具模式激活时，点击方块卡片取消道具模式
      deactivatePowerUp();

      if (selectedIdx === idx) {
        selectedIdx = -1;     // 再次点击取消选中
      } else {
        selectedIdx = idx;
        sfxSelect();
      }
      updateBlockCards();
    });

    // ---- 拖拽开始 ----
    card.addEventListener('dragstart', (e) => {
      if (gameOver || clearingCells.length > 0) { e.preventDefault(); return; }
      const idx = parseInt(card.dataset.idx);
      if (!blocks[idx] || blocks[idx].placed) { e.preventDefault(); return; }
      initAudio();
      deactivatePowerUp();

      e.dataTransfer.setData('text/plain', idx.toString());
      e.dataTransfer.effectAllowed = 'move';

      // 生成拖拽时跟随鼠标的缩略图
      const img = createDragImage(blocks[idx]);
      e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);

      // 自动选中
      selectedIdx = idx;
      sfxSelect();
      updateBlockCards();
    });

    card.addEventListener('dragend', () => {
      hoverCell = null;
    });
  });

  // ---- 键盘快捷键 ----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // 取消道具模式优先
      if (powerUpMode) { deactivatePowerUp(); return; }
      selectedIdx = -1;
      updateBlockCards();
    }
    if (e.key >= '1' && e.key <= '3' && !e.ctrlKey && !e.metaKey) {
      deactivatePowerUp(); // 选块时取消道具模式
      const idx = parseInt(e.key) - 1;
      if (blocks[idx] && !blocks[idx].placed) {
        selectedIdx = (selectedIdx === idx) ? -1 : idx;
        updateBlockCards();
      }
    }
  });

  // ---- 按钮 ----
  document.getElementById('btnNewGame').addEventListener('click', () => {
    initAudio();
    startNewGame();
  });
  document.getElementById('btnRestart').addEventListener('click', () => {
    initAudio();
    startNewGame();
  });

  // ---- 设置按钮 (in-game) → 打开设置弹窗 ----
  document.getElementById('settingsBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    syncSoundToggleUI();
    document.getElementById('settingsOverlay').classList.remove('hidden');
  });

  // ---- 帮助按钮 ----
  document.getElementById('helpBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    showHelp();
    document.getElementById('helpOverlay').classList.remove('hidden');
  });
  document.getElementById('btnCloseHelp').addEventListener('click', () => {
    initAudio();
    document.getElementById('helpOverlay').classList.add('hidden');
  });

  // ---- 道具按钮 ----
  document.getElementById('btnBomb').addEventListener('click', () => {
    initAudio();
    activateBomb();
  });
  document.getElementById('btnShuffle').addEventListener('click', () => {
    initAudio();
    activateShuffle();
  });
  document.getElementById('btnUndoStep').addEventListener('click', () => {
    initAudio();
    activateUndoStep();
  });

  // 主题切换
  document.querySelectorAll('#themeToggle .theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
    });
  });

  // 音效开关
  syncSoundToggleUI();
  document.getElementById('soundToggle').addEventListener('change', () => {
    isMuted = !document.getElementById('soundToggle').checked;
    localStorage.setItem('blockPuzzleMuted', isMuted ? '1' : '0');
    syncSoundToggleUI();
  });

  // 应用保存的主题 & 加载道具
  applyTheme(currentTheme);
  loadPowerUps();
  updatePowerUpUI();
}

// ===== 主循环 =====
function gameLoop() {
  // 消除动画计时
  if (clearTimer > 0) {
    clearTimer--;
    if (clearTimer === 0 && clearingCells.length > 0) {
      // 篮区消除：清除所有格子（含海鲜）
      if (pendingBasketClear) {
        const bc = pendingBasketClear;
        for (let r = bc.row; r < bc.row + bc.rows; r++) {
          for (let c = bc.col; c < bc.col + bc.cols; c++) {
            grid[r][c] = 0;
            seafoodGrid[r][c] = null;
          }
        }
        // 清理已消除的海鲜棋子贴图
        placedSeafoodPieces = placedSeafoodPieces.filter(piece => {
          for (let sr = 0; sr < piece.rows; sr++) {
            for (let sc = 0; sc < piece.cols; sc++) {
              const cell = seafoodGrid[piece.originR + sr] && seafoodGrid[piece.originR + sr][piece.originC + sc];
              if (cell && !cell.isGap) return true;
            }
          }
          return false;
        });
        // 奖励
        shells += bc.reward;
        sessionShells += bc.reward;
        marketSaveShells();
        updateScoreUI();
        nextCustomer();
        pendingBasketClear = null;
        clearingCells = [];
      } else {
        // 行/列消除：海鲜格子保留不动
        for (const { row, col } of clearingCells) {
          if (!seafoodGrid[row][col]) {
            grid[row][col] = 0;
          }
        }
        clearingCells = [];
      }

      // Market Mode: 清除动画后检查篮区服务
      if (gameMode === 'market') {
        checkBasketServe();
      }

      // 消除后可能腾出新空间，重新判定剩余方块能否放置
      if (!gameOver && !blocks.every(b => b.placed)) {
        checkGameOver();
      }
      updatePowerUpUI(); // 动画结束后按钮解除禁用
    }
  }

  // 粒子动画更新
  for (let i = clearingParticles.length - 1; i >= 0; i--) {
    const p = clearingParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // 微重力
    p.life -= 0.025;
    if (p.life <= 0) clearingParticles.splice(i, 1);
  }
  for (let i = scoreFloats.length - 1; i >= 0; i--) {
    const s = scoreFloats[i];
    s.y -= 0.8;
    s.life -= 0.018;
    if (s.life <= 0) scoreFloats.splice(i, 1);
  }

  render();
  requestAnimationFrame(gameLoop);
}

// ===== 启动 =====
window.addEventListener('DOMContentLoaded', init);
