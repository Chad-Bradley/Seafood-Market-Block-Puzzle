// ============================================================
//  TILE & TIDE  -  game.js
//  替换素材指引：
//    填充方块 →  drawFilledCell()  中将 fillStyle 替换为 drawImage
//    方块预览 →  renderPreviewCanvases()  中替换绘制逻辑
//    所有素材放在  assets/  目录下即可
// ============================================================

// ========== 主题 ==========
let currentTheme = localStorage.getItem('blockPuzzleTheme') || 'dark';
function applyTheme(t) {
  currentTheme = t;
  const skin = SKIN_THEMES.find(s => s.id === t);
  // 重置 body class（清除 light、forest 等所有主题类）
  document.body.classList.remove('light');
  // 应用主体 class（dark 为默认，无需 class）
  if (skin && skin.cssClass) document.body.classList.add(skin.cssClass);
  // 自定义主题：注入 CSS 变量
  const styleEl = document.getElementById('themeVars');
  if (skin && skin.cssVars) {
    let css = ':root { ';
    for (const [k, v] of Object.entries(skin.cssVars)) css += `${k}:${v}; `;
    css += '}';
    styleEl.textContent = css;
  } else if (styleEl) {
    styleEl.textContent = '';
  }
  localStorage.setItem('blockPuzzleTheme', t);
  // 同步设置面板中的主题选择器
  const themeSel = document.getElementById('settingThemeSkin');
  if (themeSel) themeSel.value = t;
}

/** 获取当前主题下的渲染颜色 */
function themeColors() {
  const skin = SKIN_THEMES.find(s => s.id === activeSkin.theme);
  return (skin && skin.boardColors) ? skin.boardColors : SKIN_THEMES[0].boardColors;
}
let audioCtx = null;
let isMuted = localStorage.getItem('blockPuzzleMuted') === '1';
function syncSoundToggleUI() {
  const toggle = document.getElementById('soundToggle');
  const icon = document.getElementById('soundIcon');
  if (toggle) toggle.checked = !isMuted;
  if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
}
let bgm = null;
let bgmVolume = parseFloat(localStorage.getItem('blockPuzzleVolume') || '0.35');
function playBgm() {
  if (isMuted) return;
  if (!bgm) bgm = document.getElementById('bgm');
  if (!bgm) return;
  bgm.volume = bgmVolume;
  bgm.play().catch(() => {});
}
function pauseBgm() {
  if (!bgm) bgm = document.getElementById('bgm');
  if (bgm) bgm.pause();
}

function initAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  } catch (_) { /* 移动端可能不支持 */ }
  playBgm();
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
function sfxInvalid() {
  playTone(180, 0.15, 'square', 0.03);
  // 🦀 彩蛋：10% 概率显示"摆弗进！"
  if (currentLang === 'zh' && Math.random() < 0.1) {
    // 直接内联计数，不走闭包
    if (!stats._foundEggs) stats._foundEggs = {};
    if (!stats._foundEggs['baifujin']) {
      stats._foundEggs['baifujin'] = true;
      stats.easterEggsFound = (stats.easterEggsFound || 0) + 1;
      saveStats();
      checkAchievements();
    }
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:45%;left:50%;transform:translate(-50%,-50%);z-index:9999;'
      + 'font-size:22px;font-weight:800;color:#FF6B6B;text-shadow:0 0 12px rgba(255,100,100,0.4);'
      + 'pointer-events:none;animation:eeFade 1.5s ease-out forwards;font-family:inherit;';
    toast.textContent = '摆弗进！';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1600);
  }
}
function sfxGameOver() {
  [300, 250, 200].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.06), i * 150)
  );
}

// ===== 常量 =====
const GRID_SIZE  = 8;
const CELL_SIZE  = 58;
const PADDING    = 24;
const CANVAS_SIZE = PADDING * 2 + GRID_SIZE * CELL_SIZE; // 512
let dpr = window.devicePixelRatio || 1;

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
  /* 31 */ { name:'N4-a',   shape:[[1,0],[1,1],[0,1]] },  // 竖Z (N)
  /* 32 */ { name:'N4-b',   shape:[[0,1],[1,1],[1,0]] },  // 竖反Z (反N)
  /* 33 */ { name:'2x4',    shape:[[1,1,1,1],[1,1,1,1]] }, // 2行4列（方块拼图用）
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

// ===== 皮肤系统数据 =====
// id = localStorage key, imgSrc 为空表示纯色默认
const SKIN_BOARDS = [
  { id:'classic_blue',  name:'Deep Blue',    price:0,   imgSrc:null,                               desc:'Default ocean depth' },
  { id:'sunset_beach',  name:'Sunset Beach',  price:80,  imgSrc:'assets/skins/board/sunset_beach.png', desc:'Warm tropical shore' },
  { id:'arctic',        name:'Arctic',        price:100, imgSrc:'assets/skins/board/arctic.png',       desc:'Ice-cold underwater' },
  { id:'wood',          name:'Wood',          price:100, imgSrc:'assets/skins/board/wood.png',         desc:'Warm walnut frame' },
  { id:'treasure_board',name:'Treasure Chest',price:null,category:'achievement', imgSrc:'assets/skins/board/treasure_chest.png', desc:'Earn 300 shells in one game' },
];

const SKIN_PIECES = [
  { id:'classic',    name:'Classic',    price:0,   imgSrc:null,                              desc:'Classic colored blocks' },
  { id:'glass',      name:'Glass',      price:80,  imgSrc:'assets/skins/piece/glass_tile.png',   desc:'Smooth glass finish' },
  { id:'metal',      name:'Metal',      price:100, imgSrc:'assets/skins/piece/metal_tile.png',   desc:'Sleek metallic blocks' },
  { id:'abalone',    name:'Abalone',    price:120, imgSrc:'assets/skins/piece/abalone_tile.png', desc:'Shimmering shell inlay' },
  { id:'driftwood',  name:'Driftwood',  price:120, imgSrc:'assets/skins/piece/driftwood_tile.png',desc:'Weathered wood grain' },
  { id:'crown_piece', name:'Golden Crown', price:null, category:'achievement', imgSrc:'assets/skins/piece/crown_tile.png', desc:'Reach score ≥ 1500' },
];

const SKIN_CUSTOMERS = [
  { id:'shoppers',   name:'Shoppers',   price:0,   dir:'assets/skins/customer/shoppers/',  imgs:['grandma','grandpa','housewife','man'],                                    desc:'Everyday market crowd' },
  { id:'merfolk',    name:'Merfolk',    price:100, dir:'assets/skins/customer/merfolk/',   imgs:['mermaid','merman','sea_king','sea_queen'],                                   desc:'Mythical sea dwellers' },
  { id:'fishermen',  name:'Fishermen',  price:100, dir:'assets/skins/customer/fishermen/', imgs:['fisherman_old','fisherman_young','fisherwoman'],                                desc:'Seaside anglers' },
  { id:'pirates',    name:'Pirates',    price:120, dir:'assets/skins/customer/pirates/',   imgs:['pirate_captain','pirate_sailor','pirate_parrot'],                               desc:'Swashbuckling crew' },
  { id:'chef_hat',   name:'Chef Master',  price:null, category:'achievement', dir:'assets/skins/customer/chef_master/',  imgs:['head_chef','line_cook','waiter','kitchen_helper'], desc:'Clear 300 seafood pieces' },
];

const SKIN_THEMES = [
  {
    id:'dark', name:'Dark', price:0, cssClass:null,
    desc:'Deep cosmic blue-purple',
    boardColors:{ gridBg:'#13132c', emptyCell:'#1c1c3a', gridLine:'#2a2a52', gridBorder:'#3a3a65', cellHighlight:'rgba(255,255,255,0.2)', cellShadow:'rgba(0,0,0,0.18)', cellBorder:'rgba(255,255,255,0.12)', previewValidFill:'rgba(80,220,120,0.35)', previewValidStroke:'rgba(80,220,120,0.6)', previewInvalidFill:'rgba(255,90,90,0.3)', previewInvalidStroke:'rgba(255,90,90,0.5)' }
  },
  {
    id:'light', name:'Light', price:0, cssClass:'light',
    desc:'Clean airy gray-white',
    boardColors:{ gridBg:'#e5e8f2', emptyCell:'#eff2f8', gridLine:'#d0d4de', gridBorder:'#bcc0d0', cellHighlight:'rgba(255,255,255,0.3)', cellShadow:'rgba(0,0,0,0.06)', cellBorder:'rgba(0,0,0,0.05)', previewValidFill:'rgba(100,210,130,0.25)', previewValidStroke:'rgba(100,210,130,0.45)', previewInvalidFill:'rgba(255,100,90,0.2)', previewInvalidStroke:'rgba(255,100,90,0.35)' }
  },
  {
    id:'forest', name:'Forest', price:200,
    desc:'Woodsy pine & moss',
    cssVars:{ '--bg-body':'#c8e0c0', '--bg-card':'#d8edd0', '--bg-card-hover':'#e0f2d8', '--bg-card-selected':'#d4e8cc', '--border':'#a8c8a0', '--border-focus':'#8ab880', '--border-selected':'#6aac60', '--text':'#2a3a28', '--text-dim':'#5a7a55', '--text-muted':'#7a9875', '--text-best':'#4a6a45', '--score-gold':'#c8a030', '--btn-buy-bg':'#6aac60', '--btn-buy-color':'#fff', '--combo-pink':'#d06078', '--grid-bg':'#dae8d5', '--grid-line':'#c0d4ba', '--grid-border':'#a8c0a2', '--empty-cell':'#e8f2e5', '--overlay-bg':'rgba(180,210,170,0.75)', '--overlay-card-bg':'#d8edd0', '--overlay-card-border':'#b0ccaa', '--start-bg':'radial-gradient(ellipse at center,#d0e8c8 0%,#b0c8a8 100%)', '--start-card-bg':'rgba(216,237,208,0.8)', '--start-card-border':'#a8c8a0', '--start-subtitle':'#5a7a55', '--start-hint':'#7a9875', '--start-credits':'#8aaa85', '--ghost-text':'#6a8a65', '--ghost-border':'#b8d0b0', '--ghost-hover-text':'#3a4a35', '--ghost-hover-border':'#88a880', '--shadow':'rgba(150,180,140,0.25)', '--selected-glow':'rgba(106,172,96,0.25)', '--game-title-gradient':'linear-gradient(135deg,#6aac60,#90c880)', '--settings-bg':'#d8edd0', '--settings-border':'#a8c8a0', '--settings-text':'#2a3a28', '--toggle-bg':'#b0c8a8', '--toggle-dot':'#fff', '--canvas-shadow':'0 0 40px rgba(100,160,80,0.1),0 4px 20px rgba(80,120,60,0.15)' },
    boardColors:{ gridBg:'#dae8d5', emptyCell:'#e8f2e5', gridLine:'#c0d4ba', gridBorder:'#a8c0a2', cellHighlight:'rgba(255,255,255,0.25)', cellShadow:'rgba(120,150,110,0.15)', cellBorder:'rgba(120,150,110,0.12)', previewValidFill:'rgba(80,200,100,0.25)', previewValidStroke:'rgba(80,200,100,0.45)', previewInvalidFill:'rgba(255,100,90,0.2)', previewInvalidStroke:'rgba(255,100,90,0.35)' }
  },
  {
    id:'midnight_gold', name:'Midnight Gold', price:250,
    desc:'Black & gilded accents',
    cssVars:{ '--bg-body':'#1a1610', '--bg-card':'#252018', '--bg-card-hover':'#2e281e', '--bg-card-selected':'#2a241a', '--border':'#3d3528', '--border-focus':'#6a5e40', '--border-selected':'#e8c848', '--text':'#e8e0d0', '--text-dim':'#9a9080', '--text-muted':'#6a6058', '--text-best':'#a8a090', '--score-gold':'#f0d060', '--btn-buy-bg':'#f0d060', '--btn-buy-color':'#222', '--combo-pink':'#d48888', '--grid-bg':'#2a2418', '--grid-line':'#6a5e30', '--grid-border':'#8a7a40', '--empty-cell':'#383020', '--overlay-bg':'rgba(0,0,0,0.7)', '--overlay-card-bg':'#252018', '--overlay-card-border':'#4a3e30', '--start-bg':'radial-gradient(ellipse at center,#201c12 0%,#0e0c08 100%)', '--start-card-bg':'rgba(34,30,20,0.75)', '--start-card-border':'#3d3528', '--start-subtitle':'#8a7e68', '--start-hint':'#6a6050', '--start-credits':'#504838', '--ghost-text':'#807868', '--ghost-border':'#3d3528', '--ghost-hover-text':'#d4c8a8', '--ghost-hover-border':'#6a5e48', '--shadow':'rgba(0,0,0,0.45)', '--selected-glow':'rgba(232,200,72,0.35)', '--game-title-gradient':'linear-gradient(135deg,#e8c848,#f0d870)', '--settings-bg':'#252018', '--settings-border':'#3d3528', '--settings-text':'#d8d0c0', '--toggle-bg':'#4a4030', '--toggle-dot':'#fff', '--canvas-shadow':'0 0 40px rgba(220,180,60,0.15),0 4px 20px rgba(0,0,0,0.4)' },
    boardColors:{ gridBg:'#2a2418', emptyCell:'#383020', gridLine:'#6a5e30', gridBorder:'#8a7a40', cellHighlight:'rgba(255,255,255,0.15)', cellShadow:'rgba(0,0,0,0.2)', cellBorder:'rgba(255,240,200,0.1)', previewValidFill:'rgba(100,210,130,0.3)', previewValidStroke:'rgba(100,210,130,0.55)', previewInvalidFill:'rgba(255,100,90,0.25)', previewInvalidStroke:'rgba(255,100,90,0.45)' }
  },
  {
    id:'candy', name:'Candy', price:200,
    desc:'Sweet pink confection',
    cssVars:{ '--bg-body':'#fdf0f5', '--bg-card':'#ffffff', '--bg-card-hover':'#fff5f8', '--bg-card-selected':'#fff8fa', '--border':'#f4d4e2', '--border-focus':'#e8b0c8', '--border-selected':'#ee90b0', '--text':'#584048', '--text-dim':'#a08090', '--text-muted':'#c0a8b0', '--text-best':'#705060', '--score-gold':'#dcb040', '--btn-buy-bg':'#ee90b0', '--btn-buy-color':'#fff', '--combo-pink':'#e87090', '--grid-bg':'#fbe8f2', '--grid-line':'#f4dae8', '--grid-border':'#eed0e0', '--empty-cell':'#fdf2f8', '--overlay-bg':'rgba(250,235,242,0.8)', '--overlay-card-bg':'#ffffff', '--overlay-card-border':'#f4dae8', '--start-bg':'radial-gradient(ellipse at center,#faeaf4 0%,#f4e0ec 100%)', '--start-card-bg':'rgba(255,255,255,0.85)', '--start-card-border':'#f4dae8', '--start-subtitle':'#a07888', '--start-hint':'#a88890', '--start-credits':'#b098a0', '--ghost-text':'#a88890', '--ghost-border':'#ecdae4', '--ghost-hover-text':'#605060', '--ghost-hover-border':'#d0b8c4', '--shadow':'rgba(200,180,190,0.25)', '--selected-glow':'rgba(238,144,176,0.25)', '--game-title-gradient':'linear-gradient(135deg,#ee90b0,#f4b0d0)', '--settings-bg':'#ffffff', '--settings-border':'#f4dae8', '--settings-text':'#584048', '--toggle-bg':'#ecdae4', '--toggle-dot':'#fff', '--canvas-shadow':'0 0 40px rgba(230,160,190,0.12),0 4px 20px rgba(180,150,160,0.15)' },
    boardColors:{ gridBg:'#fbe8f2', emptyCell:'#fdf2f8', gridLine:'#f4dae8', gridBorder:'#eed0e0', cellHighlight:'rgba(255,255,255,0.38)', cellShadow:'rgba(200,180,190,0.12)', cellBorder:'rgba(200,180,190,0.15)', previewValidFill:'rgba(130,210,150,0.28)', previewValidStroke:'rgba(130,210,150,0.45)', previewInvalidFill:'rgba(255,110,110,0.22)', previewInvalidStroke:'rgba(255,110,110,0.4)' }
  },
  {
    id:'ocean_depths', name:'Ocean Depths', price:null, category:'achievement',
    desc:'Deep sea bioluminescent cyan',
    cssVars:{ '--bg-body':'#081420', '--bg-card':'#0e1e30', '--bg-card-hover':'#142638',
      '--bg-card-selected':'#112234', '--border':'#182d45', '--border-focus':'#1e5080',
      '--border-selected':'#0096c7', '--text':'#c8e8f8', '--text-dim':'#6898b8',
      '--text-muted':'#487090', '--text-best':'#80b8d8',
      '--score-gold':'#48b8d0', '--btn-buy-bg':'#0096c7', '--btn-buy-color':'#fff',
      '--combo-pink':'#d07090',
      '--grid-bg':'#0b1a28', '--grid-line':'#152e45', '--grid-border':'#1e4870',
      '--empty-cell':'#10202e',
      '--overlay-bg':'rgba(4,12,24,0.85)', '--overlay-card-bg':'#0e1e30',
      '--overlay-card-border':'#182d45',
      '--start-bg':'radial-gradient(ellipse at center,#0a1e35 0%,#040e1a 100%)',
      '--start-card-bg':'rgba(14,28,45,0.85)', '--start-card-border':'#182d45',
      '--start-subtitle':'#6898b8', '--start-hint':'#487090', '--start-credits':'#305068',
      '--ghost-text':'#5080a0', '--ghost-border':'#182d45',
      '--ghost-hover-text':'#a0d8f0', '--ghost-hover-border':'#1e5080',
      '--shadow':'rgba(0,30,60,0.35)', '--selected-glow':'rgba(0,150,200,0.3)',
      '--game-title-gradient':'linear-gradient(135deg,#0096c7,#48c8e8)',
      '--settings-bg':'#0e1e30', '--settings-border':'#182d45', '--settings-text':'#c8e8f8',
      '--toggle-bg':'#152e45', '--toggle-dot':'#fff',
      '--canvas-shadow':'0 0 40px rgba(0,150,200,0.18),0 4px 20px rgba(0,40,80,0.35)' },
    boardColors:{ gridBg:'#0b1a28', emptyCell:'#10202e', gridLine:'#152e45', gridBorder:'#1e4870', cellHighlight:'rgba(0,180,220,0.18)', cellShadow:'rgba(0,0,0,0.22)', cellBorder:'rgba(0,180,220,0.08)', previewValidFill:'rgba(80,230,180,0.3)', previewValidStroke:'rgba(80,230,180,0.55)', previewInvalidFill:'rgba(255,100,90,0.25)', previewInvalidStroke:'rgba(255,100,90,0.45)' }
  },
  {
    id:'midnight', name:'Midnight Fishing', price:0,
    desc:'Night pier with lantern light',
    cssVars:{ '--bg-body':'#060d18', '--bg-card':'#0c1525', '--bg-card-hover':'#111d32',
      '--bg-card-selected':'#0f182c', '--border':'#2a3040', '--border-focus':'#4a5070',
      '--border-selected':'#f0a830', '--text':'#e8d8b8', '--text-dim':'#a89068',
      '--text-muted':'#786040', '--text-best':'#b8a078',
      '--score-gold':'#f0a830', '--btn-buy-bg':'#f0a830', '--btn-buy-color':'#1a1008',
      '--combo-pink':'#e88860', '--grid-bg':'#0a1422', '--grid-line':'#1a2d42',
      '--grid-border':'#2a4060', '--empty-cell':'#0e1828',
      '--overlay-bg':'rgba(2,8,18,0.85)', '--overlay-card-bg':'#0c1525',
      '--overlay-card-border':'#2a3040',
      '--start-bg':'radial-gradient(ellipse at center,#0a1830 0%,#040a16 100%)',
      '--start-card-bg':'rgba(12,21,37,0.85)', '--start-card-border':'#2a3040',
      '--start-subtitle':'#a89068', '--start-hint':'#786040', '--start-credits':'#584020',
      '--ghost-text':'#886838', '--ghost-border':'#2a3040',
      '--ghost-hover-text':'#d8c0a0', '--ghost-hover-border':'#4a5070',
      '--shadow':'rgba(0,0,0,0.5)', '--selected-glow':'rgba(240,168,48,0.3)',
      '--game-title-gradient':'linear-gradient(135deg,#f0a830,#f8c860)',
      '--settings-bg':'#0c1525', '--settings-border':'#2a3040', '--settings-text':'#e8d8b8',
      '--toggle-bg':'#2a3040', '--toggle-dot':'#fff',
      '--canvas-shadow':'0 0 40px rgba(240,168,48,0.14),0 4px 20px rgba(0,0,0,0.5)' },
    boardColors:{ gridBg:'#0a1422', emptyCell:'#0e1828', gridLine:'#1a2d42', gridBorder:'#2a4060', cellHighlight:'rgba(240,168,48,0.14)', cellShadow:'rgba(0,0,0,0.3)', cellBorder:'rgba(240,168,48,0.08)', previewValidFill:'rgba(120,220,160,0.25)', previewValidStroke:'rgba(120,220,160,0.5)', previewInvalidFill:'rgba(255,100,90,0.22)', previewInvalidStroke:'rgba(255,100,90,0.4)' }
  },
];

/** 皮肤图片缓存 — board/piece: { [skinId]: Image }, customer: { [skinId]: Image[] } */
const skinImages = { board:{}, piece:{}, customer:{} };
// 皮肤状态（运行时）
let ownedSkins = { board:[], piece:[], customer:[], theme:[] };
let activeSkin = { board:'classic_blue', piece:'classic', customer:'shoppers', theme:'dark' };

/** 查找皮肤元数据 */
function getSkinMeta(cat, id) {
  const list = cat==='board'?SKIN_BOARDS : cat==='piece'?SKIN_PIECES : cat==='customer'?SKIN_CUSTOMERS : SKIN_THEMES;
  return list.find(s => s.id === id);
}

/** 某个类别下指定皮肤是否已拥有 */
function isSkinOwned(cat, id) {
  return ownedSkins[cat].includes(id);
}

/** 装备皮肤 */
function equipSkin(cat, id) {
  if (!isSkinOwned(cat, id)) return false;
  activeSkin[cat] = id;
  saveSkinState();
  if (cat === 'theme') {
    // 主题切换淡入淡出动画
    const wrapper = document.querySelector('.game-wrapper');
    if (wrapper) wrapper.style.opacity = '0';
    setTimeout(() => {
      applyTheme(id);
      rebuildBgBlocks();
      render();
      renderPreviewCanvases();
      if (gameMode === 'market') updateCustomerUI();
      if (wrapper) wrapper.style.opacity = '1';
    }, 150);
  } else {
    render();
    renderPreviewCanvases();
    if (gameMode === 'market') {
      if (cat === 'customer') refreshCustomerQueue();
      else updateCustomerUI();
    }
  }
  return true;
}

/** 购买皮肤 */
function purchaseSkin(cat, id) {
  const meta = getSkinMeta(cat, id);
  if (!meta || isSkinOwned(cat, id)) return false;
  if (shells < meta.price) return false;
  shells -= meta.price;
  marketSaveShells();
  ownedSkins[cat].push(id);
  saveSkinState();
  updateScoreUI();
  checkAchievements();
  return true;
}

/** 检查某张皮肤图片是否就绪（用于 customer 多图：任一张就绪即可） */
function isSkinImageReady(cat, id) {
  if (cat === 'customer') {
    const imgs = skinImages.customer[id];
    if (!imgs || !imgs.length) return false;
    return imgs.some(img => img && img.complete && img.naturalWidth > 0);
  }
  const img = skinImages[cat][id];
  return img && img.complete && img.naturalWidth > 0;
}

/** 获取当前激活皮肤的首张就绪图片（customer 专用） */
function getActiveCustomerImg() {
  const imgs = skinImages.customer[activeSkin.customer];
  if (!imgs || !imgs.length) return null;
  return imgs.find(img => img && img.complete && img.naturalWidth > 0) || null;
}

/** 随机获取当前客户皮肤下的一个角色图片（用于 spawn 新顾客时） */
function randomCustomerSkinImg() {
  const imgs = skinImages.customer[activeSkin.customer];
  if (!imgs || !imgs.length) return null;
  return imgs[Math.floor(Math.random() * imgs.length)];
}

// 海鲜图片缓存：key → Image
const seafoodImages = {};

/** 检查海鲜图片是否已加载完成（对象存在 + 加载完毕 + 图片有效） */
function isSeafoodImageReady(key) {
  const img = seafoodImages[key];
  return img && img.complete && img.naturalWidth > 0;
}

/** 预加载海鲜图片（带重试机制，解决 GitHub Pages 网络不稳定问题） */
function loadSeafoodImages() {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 800; // ms，渐进递增

  for (const info of SEAFOOD_PIECES) {
    if (!info.imgSrc) continue;

    const key = info.key;
    const src = info.imgSrc;
    // 第一次是 onload/onerror 注册前就设置 src，所以用工厂函数
    function tryLoad(attempt) {
      const img = new Image();
      seafoodImages[key] = img;

      img.onload = () => {
        if (attempt > 1) console.log(`🖼️ ${key} 第 ${attempt} 次重试成功`);
        render();
        renderPreviewCanvases();
      };

      img.onerror = () => {
        console.warn(`⚠️ ${key} 加载失败（第 ${attempt}/${MAX_RETRIES} 次）: ${src}`);
        if (attempt < MAX_RETRIES) {
          setTimeout(() => tryLoad(attempt + 1), RETRY_DELAY * attempt);
        } else {
          // 最终失败：从缓存中移除，render 会走 emoji 兜底
          delete seafoodImages[key];
          console.warn(`❌ ${key} 加载彻底失败，回退到 emoji`);
          render();
          renderPreviewCanvases();
        }
      };

      img.src = src;
    }

    tryLoad(1);
  }
}

/** 预加载皮肤图片（board/piece 单图 + customer 多图，带重试） */
function loadSkinImages() {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 800;

  function loadSingle(cat, id, src, attempt) {
    const img = new Image();
    skinImages[cat][id] = img;
    img.onload = () => {
      if (attempt > 1) console.log(`🖼️ skin ${cat}/${id} 第 ${attempt} 次重试成功`);
      render();
      renderPreviewCanvases();
    };
    img.onerror = () => {
      console.warn(`⚠️ skin ${cat}/${id} 加载失败（第 ${attempt}/${MAX_RETRIES} 次）`);
      if (attempt < MAX_RETRIES) {
        setTimeout(() => loadSingle(cat, id, src, attempt + 1), RETRY_DELAY * attempt);
      } else {
        delete skinImages[cat][id];
      }
    };
    img.src = src;
  }

  function loadMulti(id, srcs, attempt) {
    const imgs = srcs.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });
    skinImages.customer[id] = imgs;
    let loaded = 0;
    let failed = 0;
    const total = imgs.length;
    imgs.forEach((img, idx) => {
      img.onload = () => {
        loaded++;
        if (loaded === total) { render(); renderPreviewCanvases(); }
      };
      img.onerror = () => {
        failed++;
        console.warn(`⚠️ skin customer/${id}[${idx}] 加载失败（第 ${attempt}/${MAX_RETRIES} 次）`);
        if (attempt < MAX_RETRIES) {
          // 只重试失败的单张
          const retryImg = new Image();
          imgs[idx] = retryImg;
          retryImg.onload = () => {
            loaded++;
            if (loaded + failed >= total) { render(); renderPreviewCanvases(); }
          };
          retryImg.onerror = () => {
            failed++;
            console.warn(`❌ skin customer/${id}[${idx}] 彻底失败`);
          };
          setTimeout(() => { retryImg.src = srcs[idx]; }, RETRY_DELAY * attempt);
        } else {
          console.warn(`❌ skin customer/${id}[${idx}] 彻底失败`);
        }
      };
    });
  }

  // Board skins
  SKIN_BOARDS.forEach(s => { if (s.imgSrc) loadSingle('board', s.id, s.imgSrc, 1); });
  // Piece skins
  SKIN_PIECES.forEach(s => { if (s.imgSrc) loadSingle('piece', s.id, s.imgSrc, 1); });
  // Customer skins (multi-image per theme)
  SKIN_CUSTOMERS.forEach(s => {
    const srcs = s.imgs.map(fn => s.dir + fn + '.png');
    loadMulti(s.id, srcs, 1);
  });
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
let basketClearAnims = [];    // 篮消海鲜放大动画 { piece, x, y, w, h, scale, life }
let scoreFloats = [];       // 得分飘字 { x, y, text, life }

// 模式
let gameMode = 'freePlay';     // 'freePlay' | 'market'

// 顾客系统（Market Mode）
const CUSTOMER_ICONS = ['🦀','🦐','🦑','🐟','🐙','🦞','🐠','🐡','🦪','🐚'];
// 海鲜 key → 对话类别映射
const SEAFOOD_CATEGORY_MAP = {
  crab: 'crab', shrimp_LU:'shrimp', shrimp_RU:'shrimp', shrimp_LB:'shrimp', shrimp_RB:'shrimp',
  mantis_shrimp_h:'shrimp', mantis_shrimp_v:'shrimp',
  clam:'clam', razor_clam_h:'clam', razor_clam_v:'clam',
  mei_fish:'fish', pomfret_2x3:'fish', pomfret_3x2:'fish',
  hairtail_U:'hairtail', hairtail_D:'hairtail', hairtail_L:'hairtail', hairtail_R:'hairtail',
  jellyfish:'jellyfish', squid:'squid',
};
const SPEECH_CATEGORY = {
  crab:      ['That crab was massive!','Sweet crab meat~','Crabtastic!','Pinch me, that was good!'],
  shrimp:    ['Juiciest shrimp ever!','Shrimp so fresh it snapped!','Prawn star quality!','Shell yeah!'],
  clam:      ['Plumpest clams in town!','Pearl of a deal!','That clam was a gem!','Bivalve bliss~'],
  fish:      ['That fish was swimming this morning!','Fin-tastic!','Straight off the boat!','Catch of the day!'],
  hairtail:  ['Slippery & delicious!','That hairtail hit different','Long & tasty!','Silver belt special!'],
  jellyfish: ['Jiggly & refreshing!','That jelly had bounce!','Bouncy goodness!','Zingy and crisp!'],
  squid:     ['Tender tentacles!','Ink-redible!','Squid game strong!','Not chewy at all!'],
  general:   ['Hook me up another!','Seafood feast!','Fresh off the dock!','You know your fish!',
              'Best catch today!','Ocean to order!','Taste the sea!','Five stars no cap!','Running this market!','Certified fresh!'],
};
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
let powerUps = { bomb: 3, shuffle: 3, undoStep: 3, fishingBan: 1 };
let powerUpMode = null;  // 'bomb' | null（shuffle / undoStep 瞬发）
let rescueMode = false;  // 救援模式（允许用贝壳购买的炸弹）


// ============ ACHIEVEMENT SYSTEM (global scope) ============
const STATS_KEY = 'blockPuzzleStats';
let stats = {
  totalGamesPlayed: 0, totalBlocksPlaced: 0, totalLinesCleared: 0,
  totalOrdersCompleted: 0, totalSeafoodCleared: 0,
  bombUsed: 0, shuffleUsed: 0, undoUsed: 0, fishingBanUsed: 0,
  easterEggsFound: 0,
};
(function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) Object.assign(stats, JSON.parse(raw));
  } catch (_) {}
})();
function saveStats() { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }

// Session trackers for achievements
let sessionPlacedBlocks = 0, sessionMaxCombo = 0, sessionOrders = 0;
let sessionLinesInPlacement = 0; // lines cleared in current placement
let gameEnded = false; // prevent double-counting games

const ACHIEVEMENTS_KEY = 'blockPuzzleAchievements';
let unlockedAchievements = new Set();
(function loadAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (raw) JSON.parse(raw).forEach(id => unlockedAchievements.add(id));
  } catch (_) {}
})();
function saveAchievements() {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...unlockedAchievements]));
}

// Achievement exclusive skins (only obtainable via achievements)
const ACH_EXCLUSIVE_SKINS = {
  crown_piece:   { type:'piece',    name:'Golden Crown',   desc:'Reach score ≥ 1500', icon:'👑', category:'achievement' },
  treasure_board:{ type:'board',    name:'Treasure Chest', desc:'Earn 300 shells in one game', icon:'🏦', category:'achievement' },
  chef_hat:      { type:'customer', name:'Chef Master',   desc:'Clear 300 seafood pieces', icon:'👨\u200D🍳', category:'achievement' },
  ocean_depths:  { type:'theme',    name:'Ocean Depths',   desc:'Deep sea bioluminescent cyan', icon:'🌊', category:'achievement' },
};

const ACHIEVEMENTS = [
  // --- Free Play ---
  { id:'double_whammy', name:'Double Whammy', desc:'Clear 2+ lines in one placement', icon:'⚡', target:2, current:() => sessionLinesInPlacement, reward:{type:'shells',amount:50},
    check:() => sessionLinesInPlacement >= 2 },
  { id:'rising_star', name:'Rising Star', desc:'Score ≥ 100 in one game', icon:'🎯', target:100, current:() => score, reward:{type:'shells',amount:50},
    check:() => score >= 100 },
  { id:'score_expert', name:'Score Expert', desc:'Score ≥ 300 in one game', icon:'🏆', target:300, current:() => score, reward:{type:'shells',amount:80},
    check:() => score >= 300 },
  { id:'score_master', name:'Score Master', desc:'Score ≥ 500 in one game', icon:'👑', target:500, current:() => score, reward:{type:'shells',amount:100},
    check:() => score >= 500 },
  { id:'score_emperor', name:'Score Emperor', desc:'Score ≥ 1500 in one game', icon:'👑', target:1500, current:() => score, reward:{type:'skin',skinId:'crown_piece'},
    check:() => score >= 1500 },
  { id:'combo_rookie', name:'Combo Rookie', desc:'Reach 3× combo in one game', icon:'🔗', target:3, current:() => sessionMaxCombo, reward:{type:'shells',amount:50},
    check:() => sessionMaxCombo >= 3 },
  { id:'combo_pro', name:'Combo Pro', desc:'Reach 6× combo in one game', icon:'🔗', target:6, current:() => sessionMaxCombo, reward:{type:'shells',amount:80},
    check:() => sessionMaxCombo >= 6 },

  // --- Free Play cumulative ---
  { id:'line_cleaner_b', name:'Line Cleaner: Bronze', desc:'Clear 50 lines in total', icon:'🧹', target:50, current:() => stats.totalLinesCleared, reward:{type:'shells',amount:50},
    check:() => stats.totalLinesCleared >= 50 },
  { id:'line_cleaner_s', name:'Line Cleaner: Silver', desc:'Clear 200 lines in total', icon:'🧹', target:200, current:() => stats.totalLinesCleared, reward:{type:'shells',amount:80},
    check:() => stats.totalLinesCleared >= 200 },
  { id:'line_cleaner_g', name:'Line Cleaner: Gold', desc:'Clear 500 lines in total', icon:'🧹', target:500, current:() => stats.totalLinesCleared, reward:{type:'shells',amount:100},
    check:() => stats.totalLinesCleared >= 500 },
  { id:'regular_b', name:'Regular: Bronze', desc:'Play 10 games in total', icon:'🎮', target:10, current:() => stats.totalGamesPlayed, reward:{type:'shells',amount:50},
    check:() => stats.totalGamesPlayed >= 10 },
  { id:'regular_s', name:'Regular: Silver', desc:'Play 50 games in total', icon:'🎮', target:50, current:() => stats.totalGamesPlayed, reward:{type:'shells',amount:80},
    check:() => stats.totalGamesPlayed >= 50 },
  { id:'regular_g', name:'Regular: Gold', desc:'Play 100 games in total', icon:'🎮', target:100, current:() => stats.totalGamesPlayed, reward:{type:'shells',amount:100},
    check:() => stats.totalGamesPlayed >= 100 },

  // --- Market Mode ---
  { id:'first_order', name:'First Order', desc:'Complete your first order', icon:'🛒', target:1, current:() => stats.totalOrdersCompleted, reward:{type:'shells',amount:50},
    check:() => stats.totalOrdersCompleted >= 1 },
  { id:'busy_kitchen', name:'Busy Kitchen', desc:'Complete 5 orders in one game', icon:'🍳', target:5, current:() => sessionOrders, reward:{type:'shells',amount:80},
    check:() => sessionOrders >= 5 },
  { id:'hot_kitchen', name:'Hot Kitchen', desc:'Complete 12 orders in one game', icon:'🔥', target:12, current:() => sessionOrders, reward:{type:'shells',amount:100},
    check:() => sessionOrders >= 12 },
  { id:'shell_rookie', name:'Shell Rookie', desc:'Earn 50 shells in one game', icon:'🐚', target:50, current:() => sessionShells, reward:{type:'shells',amount:50},
    check:() => sessionShells >= 50 },
  { id:'shell_expert', name:'Shell Expert', desc:'Earn 150 shells in one game', icon:'💰', target:150, current:() => sessionShells, reward:{type:'shells',amount:80},
    check:() => sessionShells >= 150 },
  { id:'shell_tycoon', name:'Shell Tycoon', desc:'Earn 300 shells in one game', icon:'🏦', target:300, current:() => sessionShells, reward:{type:'skin',skinId:'treasure_board'},
    check:() => sessionShells >= 300 },

  // --- Market cumulative ---
  { id:'seafood_chef_b', name:'Seafood Chef: Bronze', desc:'Clear 30 seafood pieces in total', icon:'🍣', target:30, current:() => stats.totalSeafoodCleared, reward:{type:'shells',amount:80},
    check:() => stats.totalSeafoodCleared >= 30 },
  { id:'seafood_chef_s', name:'Seafood Chef: Silver', desc:'Clear 100 seafood pieces in total', icon:'🍣', target:100, current:() => stats.totalSeafoodCleared, reward:{type:'shells',amount:100},
    check:() => stats.totalSeafoodCleared >= 100 },
  { id:'seafood_chef_g', name:'Seafood Chef: Gold', desc:'Clear 300 seafood pieces in total', icon:'🍣', target:300, current:() => stats.totalSeafoodCleared, reward:{type:'skin',skinId:'chef_hat'},
    check:() => stats.totalSeafoodCleared >= 300 },
  { id:'gold_service', name:'Gold Service', desc:'Complete 50 orders in total', icon:'🤝', target:50, current:() => stats.totalOrdersCompleted, reward:{type:'shells',amount:80},
    check:() => stats.totalOrdersCompleted >= 50 },
  { id:'shop_owner', name:'Shop Owner', desc:'Complete 150 orders in total', icon:'🏪', target:150, current:() => stats.totalOrdersCompleted, reward:{type:'shells',amount:100},
    check:() => stats.totalOrdersCompleted >= 150 },

  // --- Power-ups ---
  { id:'bomber', name:'Bomber', desc:'Use Bomb 10 times', icon:'💣', target:10, current:() => stats.bombUsed, reward:{type:'shells',amount:50},
    check:() => stats.bombUsed >= 10 },
  { id:'shuffler', name:'Shuffler', desc:'Use Shuffle 10 times', icon:'🔀', target:10, current:() => stats.shuffleUsed, reward:{type:'shells',amount:50},
    check:() => stats.shuffleUsed >= 10 },
  { id:'time_traveler', name:'Time Traveler', desc:'Use Undo 20 times', icon:'↩️', target:20, current:() => stats.undoUsed, reward:{type:'shells',amount:50},
    check:() => stats.undoUsed >= 20 },

  // --- Collection ---
  { id:'collector', name:'Collector', desc:'Own 5 skins', icon:'🎨', target:5, current:() => ownedSkins.board.length + ownedSkins.piece.length + ownedSkins.customer.length + ownedSkins.theme.length, reward:{type:'shells',amount:80},
    check:() => ownedSkins.board.length + ownedSkins.piece.length + ownedSkins.customer.length + ownedSkins.theme.length >= 5 },
  { id:'master_builder', name:'Master Builder', desc:'Place 500 blocks in total', icon:'🏗️', target:500, current:() => stats.totalBlocksPlaced, reward:{type:'skin',skinId:'ocean_depths'},
    check:() => stats.totalBlocksPlaced >= 500 },

  // ── 隐藏彩蛋成就 — 仅在发现第一个彩蛋后显示 ──
  { id:'egg_1', name:'Curious Explorer', desc:'Find your first easter egg', icon:'🥚', target:1, current:() => stats.easterEggsFound, reward:{type:'shells',amount:30}, hidden:true,
    check:() => stats.easterEggsFound >= 1 },
  { id:'egg_3', name:'Easter Egg Hunter', desc:'Discover 3 easter eggs', icon:'🥚🥚', target:3, current:() => stats.easterEggsFound, reward:{type:'shells',amount:60}, hidden:true,
    check:() => stats.easterEggsFound >= 3 },
  { id:'egg_5', name:'Secret Keeper', desc:'Discover 5 easter eggs', icon:'🔮', target:5, current:() => stats.easterEggsFound, reward:{type:'shells',amount:100}, hidden:true,
    check:() => stats.easterEggsFound >= 5 },
  { id:'egg_all', name:'Easter Egg Grand Slam', desc:'Find every hidden easter egg', icon:'👑', target:10, current:() => stats.easterEggsFound, reward:{type:'shells',amount:200}, hidden:true,
    check:() => stats.easterEggsFound >= 10 },
];

let toastQueue = [];
let toastActive = false;

function grantReward(reward) {
  if (reward.type === 'shells') {
    shells += reward.amount;
    if (gameMode === 'market') sessionShells += reward.amount;
  } else if (reward.type === 'skin') {
    const skinDef = ACH_EXCLUSIVE_SKINS[reward.skinId];
    if (skinDef) {
      const cat = skinDef.type;
      if (!ownedSkins[cat].includes(reward.skinId)) {
        ownedSkins[cat].push(reward.skinId);
        // Push to the appropriate skin list so it appears in shop/settings
        const list = cat==='piece' ? SKIN_PIECES : cat==='board' ? SKIN_BOARDS : cat==='customer' ? SKIN_CUSTOMERS : SKIN_THEMES;
        if (list && !list.find(s => s.id === reward.skinId)) {
          list.push({ id: reward.skinId, name: skinDef.name, desc: skinDef.desc, icon: skinDef.icon, price: null, category: skinDef.category });
        }
        saveSkinState();
      }
    }
  }
  marketSaveShells();
  updateScoreUI();
}

function showToast(ach) {
  toastQueue.push(ach);
  if (!toastActive) processToastQueue();
}
function processToastQueue() {
  if (toastQueue.length === 0) { toastActive = false; return; }
  toastActive = true;
  const ach = toastQueue.shift();
  const el = document.getElementById('achToast');
  if (!el) { toastActive = false; return; }
  const iconEl = document.getElementById('achToastIcon');
  const nameEl = document.getElementById('achToastName');
  const descEl = document.getElementById('achToastDesc');
  const rewardEl = document.getElementById('achToastReward');
  iconEl.textContent = ach.icon;
  nameEl.textContent = t(ach.name);
  descEl.textContent = t(ach.desc);
  const r = ach.reward;
  rewardEl.textContent = r.type === 'shells' ? `+${r.amount} 🐚` : t('+ Exclusive Skin 🎁');
  el.classList.remove('hidden', 'ach-toast-out');
  el.classList.add('ach-toast-in');
  setTimeout(() => {
    el.classList.remove('ach-toast-in');
    el.classList.add('ach-toast-out');
    setTimeout(() => { el.classList.add('hidden'); processToastQueue(); }, 400);
  }, 3500);
}

let _achCheckTimeout = null;
function checkAchievements() {
  if (_achCheckTimeout) return;
  _achCheckTimeout = setTimeout(() => {
    _achCheckTimeout = null;
    let anyUnlocked = false;
    for (const ach of ACHIEVEMENTS) {
      if (unlockedAchievements.has(ach.id)) continue;
      try {
        if (ach.check()) {
          unlockedAchievements.add(ach.id);
          grantReward(ach.reward);
          showToast(ach);
          anyUnlocked = true;
        }
      } catch (_) {}
    }
    if (anyUnlocked) saveAchievements();
  }, 300);
}

function resetSessionTrackers() {
  sessionPlacedBlocks = 0;
  sessionMaxCombo = 0;
  sessionOrders = 0;
  sessionLinesInPlacement = 0;
  gameEnded = false;
}

// Build achievement panel HTML (called after DOM ready)
function buildAchievementPanel() {
  const container = document.getElementById('achievementList');
  if (!container) return;
  container.innerHTML = ACHIEVEMENTS.map(ach => {
    const unlocked = unlockedAchievements.has(ach.id);
    // 隐藏成就：未解锁时显示？？？
    const isHiddenLocked = ach.hidden && !unlocked;
    const r = ach.reward;
    const rewardText = r.type === 'shells' ? `+${r.amount} 🐚` : t('Unlocks Skin 🎁');

    // Progress bar
    let progressHtml = '';
    if (ach.target && ach.current) {
      const cur = Math.min(ach.current(), ach.target);
      const pct = ach.target > 0 ? Math.round((cur / ach.target) * 100) : 0;
      if (unlocked) {
        progressHtml = `<div class="ach-progress"><div class="ach-progress-bar"><div class="ach-progress-fill ach-progress-done" style="width:100%"></div></div><div class="ach-progress-text completed">${t('Completed ✓')}</div></div>`;
      } else {
        progressHtml = `<div class="ach-progress"><div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${pct}%"></div></div><div class="ach-progress-text">${isHiddenLocked ? '???' : cur + ' / ' + ach.target}</div></div>`;
      }
    }

    return `
      <div class="ach-item ${unlocked ? 'unlocked' : 'locked'}">
        <div class="ach-icon">${unlocked ? ach.icon : (isHiddenLocked ? '❓' : '🔒')}</div>
        <div class="ach-info">
          <div class="ach-name">${isHiddenLocked ? '???' : t(ach.name)}</div>
          <div class="ach-desc">${isHiddenLocked ? '???' : t(ach.desc)}</div>
          ${progressHtml}
        </div>
        <div class="ach-reward">${unlocked ? rewardText : (isHiddenLocked ? '❓' : '???')}</div>
      </div>`;
  }).join('');
  const el = document.getElementById('achProgress');
  if (el) el.textContent = t('Unlocked {n} / {m}', {n: unlockedAchievements.size, m: ACHIEVEMENTS.length});
}

let _achPanelRefreshId = null;
function startAchievementPanelRefresh() {
  stopAchievementPanelRefresh();
  _achPanelRefreshId = setInterval(buildAchievementPanel, 1200);
}
function stopAchievementPanelRefresh() {
  if (_achPanelRefreshId) { clearInterval(_achPanelRefreshId); _achPanelRefreshId = null; }
}
// ============ END ACHIEVEMENT SYSTEM ============

// ===== Canvas 引用 =====
let canvas, ctx;
let previewCanvases = [];

// ===== 初始化 =====
function init() {
  canvas = document.getElementById('gameCanvas');
  canvas.width  = CANVAS_SIZE * dpr;
  canvas.height = CANVAS_SIZE * dpr;
  canvas.style.width  = CANVAS_SIZE + 'px';
  canvas.style.height = CANVAS_SIZE + 'px';
  ctx = canvas.getContext('2d');

  loadSeafoodImages();
  loadSkinImages();
  loadSkinState();
  applyLanguage(detectLanguage()); // i18n: 必须在 updateStartHint 之前

  // 方块预览小画布
  document.querySelectorAll('.block-card canvas').forEach(c => {
    c.width  = 120 * dpr;
    c.height = 120 * dpr;
    c.style.width  = '120px';
    c.style.height = '120px';
    previewCanvases.push(c);
  });

  bestScore = parseInt(localStorage.getItem('blockPuzzleBest') || '0');
  document.getElementById('best').textContent = bestScore;
  shells = parseInt(localStorage.getItem('blockPuzzleShells') || '0');
  document.getElementById('shells').textContent = `🐚 ${shells}`;

  // 开始页显示最高分 + 贝壳
  updateStartHint();

  // 背景浮动方块装饰
  rebuildBgBlocks();

  setupEvents();
  requestAnimationFrame(gameLoop);

  // i18n: 语言切换时刷新 JS 生成内容
  I18N_REFRESH_HOOKS.push(() => {
    updateScoreUI();
    updatePowerUpUI();
    renderPreviewCanvases();
    // 帮助弹窗打开时刷新
    if (!document.getElementById('helpOverlay').classList.contains('hidden')) showHelp();
    // 成就面板打开时刷新
    if (!document.getElementById('achievementOverlay').classList.contains('hidden')) buildAchievementPanel();
    // 商店打开时刷新
    if (!document.getElementById('shopOverlay').classList.contains('hidden')) {
      renderSkinShop(currentSkinCat);
      updateShopOverlay();
    }
    // 设置打开时刷新皮肤选择器 + 布局选择器
    if (!document.getElementById('settingsOverlay').classList.contains('hidden')) {
      populateSettingsSkinSelectors();
      const ls = document.getElementById('settingLayout');
      if (ls) {
        const saved = ls.value;
        ls.innerHTML = [
          { v:'desktop', k:'Desktop' },
          { v:'mobile',  k:'Mobile' },
        ].map(o => `<option value="${o.v}">${t(o.k)}</option>`).join('');
        ls.value = saved;
      }
    }
    // 游戏结束弹窗文字
    const ov = document.getElementById('overlay');
    if (!ov.classList.contains('hidden')) updateGameOverTexts();
    // 开始页提示
    updateStartHint();
    // 顾客面板
    if (gameMode === 'market') updateCustomerUI();
  });

  // i18n: 语言选择器
  const langSel = document.getElementById('settingLanguage');
  if (langSel) {
    langSel.innerHTML = I18N_LANGUAGES.map(l =>
      `<option value="${l.code}">${l.label}</option>`
    ).join('');
    langSel.value = currentLang;
    langSel.addEventListener('change', () => applyLanguage(langSel.value));
  }

  // 布局切换
  const LAYOUT_KEY = 'blockPuzzleLayout';
  function applyLayout(v) {
    localStorage.setItem(LAYOUT_KEY, v);
    document.body.classList.toggle('layout-mobile', v === 'mobile');
    if (layoutSel) layoutSel.value = v;
    updateMobileHeader();
  }
  const layoutSel = document.getElementById('settingLayout');
  if (layoutSel) {
    layoutSel.innerHTML = [
      { v:'desktop', k:'Desktop' },
      { v:'mobile',  k:'Mobile' },
    ].map(o => `<option value="${o.v}">${t(o.k)}</option>`).join('');
    const savedLayout = localStorage.getItem(LAYOUT_KEY);
    if (savedLayout) {
      applyLayout(savedLayout);
    } else {
      // 首次访问：窄屏自动手机布局
      applyLayout(window.innerWidth < 700 ? 'mobile' : 'desktop');
    }
    layoutSel.addEventListener('change', () => applyLayout(layoutSel.value));
  }

  // 手机顶部栏：绑定按钮事件
  document.getElementById('mhSettingsBtn').addEventListener('click', () => {
    initAudio();
    syncSoundToggleUI();
    populateSettingsSkinSelectors();
    document.getElementById('settingsOverlay').classList.remove('hidden');
  });
  document.getElementById('mhHelpBtn').addEventListener('click', () => {
    initAudio();
    showHelp();
    document.getElementById('helpOverlay').classList.remove('hidden');
  });
  document.getElementById('mhAchBtn').addEventListener('click', () => {
    initAudio();
    buildAchievementPanel();
    document.getElementById('achievementOverlay').classList.remove('hidden');
  });
  // 手机菜单：↩ 按钮弹出 New Game / Back to Home
  const mhMenu = document.getElementById('mhMenu');
  const mhMenuBtn = document.getElementById('mhMenuBtn');
  mhMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    mhMenu.classList.toggle('show');
  });
  document.addEventListener('click', (e) => {
    if (!mhMenu.contains(e.target) && e.target !== mhMenuBtn) {
      mhMenu.classList.remove('show');
    }
  });
  document.getElementById('mhNewGame').addEventListener('click', () => {
    mhMenu.classList.remove('show');
    if (!gameOver) {
      document.getElementById('confirmNewGameOverlay').classList.remove('hidden');
    } else {
      startNewGame();
    }
  });
  document.getElementById('mhBackHome').addEventListener('click', () => {
    mhMenu.classList.remove('show');
    document.getElementById('confirmBackOverlay').classList.remove('hidden');
  });

  // Play 按钮 → 打开模式选择
  // ===== 彩蛋：点击 Logo 10 下触发海鲜雨 =====
  let logoTaps = 0;
  let logoTapTimer = null;
  const logoImg = document.querySelector('.logo-icon');
  // 绑定在父元素上，防止 z-index 遮挡
  const startContent = document.querySelector('.start-content');
  if (logoImg && startContent) {
    logoImg.style.cursor = 'pointer';
    startContent.addEventListener('click', (e) => {
      if (e.target !== logoImg && !logoImg.contains(e.target)) return;
      initAudio();
      logoTaps++;
      logoImg.style.transform = 'scale(1.15)';
      setTimeout(() => { logoImg.style.transform = ''; }, 100);
      playTone(880 + logoTaps * 60, 0.08, 'sine', 0.04);
      clearTimeout(logoTapTimer);
      logoTapTimer = setTimeout(() => { logoTaps = 0; }, 2000);
      if (logoTaps >= 10) {
        logoTaps = 0;
        window._markEasterEgg('seafood_rain');
        triggerSeafoodRain();
      }
    });
  }

  function triggerSeafoodRain() {
    const imgs = SEAFOOD_PIECES.map(s => s.imgSrc).filter(Boolean);
    const emojiMix = ['🫧','⭐','💎','🐚','✨','💫','🌊']; // 小点缀
    const phrases = [
      { title: 'The tide is high!', sub: 'A seafood storm is coming...' },
      { title: 'The ocean provides!', sub: 'Catch of a lifetime!' },
      { title: 'Poseidon approves!', sub: 'The sea gods are pleased.' },
      { title: 'Tsunami of flavor!', sub: 'Fresh from the deep!' },
      { title: 'A bountiful harvest!', sub: 'The nets are overflowing.' },
    ];
    const p = phrases[Math.floor(Math.random() * phrases.length)];

    // 屏幕短暂蓝闪
    document.body.style.transition = 'background 0.3s';
    const origBg = document.body.style.background;
    document.body.style.background = 'radial-gradient(circle, rgba(30,144,255,0.3), rgba(0,0,50,0.5))';
    setTimeout(() => { document.body.style.background = origBg; }, 400);

    // 中央台词
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:50%;left:50%;z-index:9999;pointer-events:none;font-family:inherit;text-align:center;'
      + 'transform:translate(-50%,-50%);';
    toast.innerHTML = `<div style="font-size:36px;font-weight:800;color:#FFD700;text-shadow:0 0 30px rgba(255,215,0,0.9),0 0 60px rgba(255,215,0,0.5),0 4px 12px rgba(0,0,0,0.6);animation:eeFade 3.5s ease-out forwards;">${t(p.title)}</div>
      <div style="font-size:16px;color:rgba(255,255,255,0.7);margin-top:8px;text-shadow:0 2px 6px rgba(0,0,0,0.5);animation:eeFade 3s ease-out forwards;">${t(p.sub)}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3600);

    // 第一波：海鲜贴图倾盆
    for (let i = 0; i < 35; i++) {
      setTimeout(() => {
        const src = imgs[Math.floor(Math.random() * imgs.length)];
        const img = document.createElement('img');
        img.className = 'seafood-rain';
        img.src = src;
        img.style.left = (5 + Math.random() * 90) + '%';
        img.style.top = -(40 + Math.random() * 120) + 'px';
        img.style.width = (40 + Math.random() * 70) + 'px';
        img.style.height = 'auto';
        img.style.setProperty('--drift', ((Math.random() - 0.5) * 250) + 'px');
        img.style.setProperty('--rotate', ((Math.random() - 0.5) * 720) + 'deg');
        img.style.animationDuration = (2 + Math.random() * 3) + 's';
        img.style.opacity = (0.75 + Math.random() * 0.25);
        document.body.appendChild(img);
        setTimeout(() => img.remove(), 6000);
      }, i * 30);
    }
    // 第二波：小点缀散落
    setTimeout(() => {
      for (let i = 0; i < 25; i++) {
        setTimeout(() => {
          const el = document.createElement('div');
          el.className = 'seafood-rain';
          el.textContent = emojiMix[Math.floor(Math.random() * emojiMix.length)];
          el.style.left = (5 + Math.random() * 90) + '%';
          el.style.top = -(20 + Math.random() * 60) + 'px';
          el.style.fontSize = (14 + Math.random() * 24) + 'px';
          el.style.setProperty('--drift', ((Math.random() - 0.5) * 120) + 'px');
          el.style.setProperty('--rotate', ((Math.random() - 0.5) * 540) + 'deg');
          el.style.animationDuration = (3 + Math.random() * 4) + 's';
          el.style.opacity = (0.5 + Math.random() * 0.4);
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 8000);
        }, i * 25);
      }
    }, 800);
    sfxClear(8);
  }

  // 🫧 气泡弹出彩蛋（全局作用域方便任何地方调用）
  // 🎚️ DJ搓碟 Toast
  window._showScratchToast = function() {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);z-index:9999;'
      + 'font-size:24px;font-weight:800;color:#FFD700;text-shadow:0 0 20px rgba(255,215,0,0.6),0 2px 6px rgba(0,0,0,0.5);'
      + 'pointer-events:none;animation:eeFade 2.5s ease-out forwards;font-family:inherit;';
    toast.textContent = t('DJ mode activated!');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  };

  // 🔍 彩蛋数据（名称+描述，仅用于展示面板）
  const EASTER_EGGS = [
    { id:'seafood_rain', name:'Seafood Rain', desc:'Click the logo 10 times', icon:'🦐' },
    { id:'midnight',     name:'Midnight Fishing', desc:'Open the game late at night', icon:'🕐' },
    { id:'bubble',       name:'Bubble Pop', desc:'Tap an empty cell 5 times', icon:'🫧' },
    { id:'dj_scratch',   name:'DJ Scratch', desc:'Scrub the volume slider', icon:'🎧' },
    { id:'title_hold',   name:'Signature', desc:'Hold the title image', icon:'🖼️' },
    { id:'queue_poke',   name:'Impatient Customer', desc:'Poke a waiting customer 3 times', icon:'👥' },
    { id:'title_fall',   name:'You Broke It!', desc:'Click the in-game title', icon:'🪧' },
    { id:'dead_crab',    name:'Dead Crab', desc:'Get stuck with no moves (rare)', icon:'🦀' },
    { id:'baifujin',     name:'Won\'t Fit!', desc:'Try placing where it doesn\'t fit (rare)', icon:'🗣️' },
    { id:'no_discount',  name:'No Discount!', desc:'Beg for a discount 5 times', icon:'🛒' },
  ];

  function buildEasterEggPanel() {
    const container = document.getElementById('easterEggList');
    if (!container) return;
    const found = stats._foundEggs || {};
    const foundCount = Object.keys(found).length;
    container.innerHTML = EASTER_EGGS.filter(e => found[e.id]).map(e => `
      <div class="ach-item unlocked">
        <div class="ach-icon">${e.icon}</div>
        <div class="ach-info">
          <div class="ach-name">${t(e.name)}</div>
          <div class="ach-desc">${t(e.desc)}</div>
        </div>
      </div>
    `).join('');
    if (foundCount === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:20px;font-size:14px;">???</div>';
    }
  }

  // 成就面板tab切换
  document.querySelectorAll('.ach-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ach-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isAch = tab.dataset.achTab === 'achievements';
      document.getElementById('achievementList').style.display = isAch ? '' : 'none';
      document.getElementById('easterEggList').style.display = isAch ? 'none' : 'flex';
      document.getElementById('achProgress').style.display = isAch ? '' : 'none';
      if (!isAch) buildEasterEggPanel();
    });
  });

  // 🔍 彩蛋计数器
  window._markEasterEgg = function(name) {
    if (!stats._foundEggs) stats._foundEggs = {};
    if (stats._foundEggs[name]) return; // 已发现过不重复计数
    stats._foundEggs[name] = true;
    stats.easterEggsFound = (stats.easterEggsFound || 0) + 1;
    saveStats();
    checkAchievements();
  };

  window._triggerBubble = function(row, col) {
    window._markEasterEgg('bubble');
    const cx = gx(col) + CELL_SIZE / 2;
    const cy = gy(row) + CELL_SIZE / 2;
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / CANVAS_SIZE;
    const scaleY = canvasRect.height / CANVAS_SIZE;
    const bx = canvasRect.left + cx * scaleX;
    const by = canvasRect.top + cy * scaleY;

    // 串小泡泡：逐个冒出，大小随机，略微偏移
    const count = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const bubble = document.createElement('div');
        bubble.className = 'bubble-pop';
        const size = 10 + Math.random() * 18;
        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';
        bubble.style.marginLeft = -(size / 2) + 'px';
        bubble.style.marginTop = -(size / 2) + 'px';
        bubble.style.left = (bx + (Math.random() - 0.5) * 30) + 'px';
        bubble.style.top = (by + (Math.random() - 0.5) * 10) + 'px';
        bubble.style.animationDuration = (0.6 + Math.random() * 0.8) + 's';
        document.body.appendChild(bubble);
        setTimeout(() => bubble.remove(), 1500);

        // 噗音效
        playTone(400 + Math.random() * 200, 0.04, 'sine', 0.015);
      }, i * 50);
    }
    // 咕噜咕噜文字
    const bt = document.createElement('div');
    bt.style.cssText = 'position:fixed;top:25%;left:50%;transform:translateX(-50%);z-index:9999;'
      + 'font-size:18px;font-weight:700;color:#FFD700;text-shadow:0 0 12px rgba(255,215,0,0.5);'
      + 'pointer-events:none;animation:eeFade 2.5s ease-out forwards;font-family:inherit;';
    bt.textContent = t('blub blub blub...');
    document.body.appendChild(bt);
    setTimeout(() => bt.remove(), 2600);
  };

  // 🖼️ 标题图长按 2 秒彩蛋
  (function() {
    const titleImgs = document.querySelectorAll('.title-img');
    if (titleImgs.length) {
      let pressTimer = null;
      function onPressStart(e) {
        pressTimer = setTimeout(() => {
          window._markEasterEgg('title_hold');
          const toast = document.createElement('div');
          toast.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);z-index:9999;'
            + 'font-size:20px;font-weight:700;color:#FFD700;text-shadow:0 0 16px rgba(255,215,0,0.6);'
            + 'pointer-events:none;animation:eeFade 3s ease-out forwards;font-family:inherit;';
          toast.textContent = t('Made by Chad Bradley');
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3100);
        }, 2000);
        e.preventDefault();
      }
      function onPressEnd() { clearTimeout(pressTimer); }
      titleImgs.forEach(img => {
        img.addEventListener('mousedown', onPressStart);
        img.addEventListener('mouseup', onPressEnd);
        img.addEventListener('mouseleave', onPressEnd);
        img.addEventListener('touchstart', onPressStart, {passive: false});
        img.addEventListener('touchend', onPressEnd);
        img.addEventListener('touchcancel', onPressEnd);
      });
    }
  })();

  // 🪧 游戏内标题图点击：掉下来 + "赔钱！"
  (function() {
    const panelTitle = document.querySelector('.panel .title-img');
    if (panelTitle) {
      panelTitle.addEventListener('click', (e) => {
        e.stopPropagation();
        window._markEasterEgg('title_fall');
        // 扣 10 贝壳，不够清零
        const deducted = Math.min(shells, 10);
        shells = Math.max(0, shells - 10);
        marketSaveShells();
        updateScoreUI();
        // -10 飘字
        const minus = document.createElement('div');
        minus.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);z-index:9999;'
          + 'font-size:22px;font-weight:800;color:#FF6B6B;text-shadow:0 0 10px rgba(255,100,100,0.5);'
          + 'pointer-events:none;animation:eeFade 2s ease-out forwards;font-family:inherit;';
        minus.textContent = '- ' + deducted + ' \u{1F41A}';
        document.body.appendChild(minus);
        setTimeout(() => minus.remove(), 2100);
        // 暂停浮动，然后掉落
        panelTitle.style.animation = 'none';
        void panelTitle.offsetWidth; // 强制重绘
        panelTitle.style.transition = 'transform 0.5s ease-in, opacity 0.5s ease-in';
        panelTitle.style.transform = 'translateY(120px) rotate(12deg)';
        panelTitle.style.opacity = '0';
        // Toast
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:35%;left:50%;transform:translate(-50%,-50%);z-index:9999;'
          + 'font-size:28px;font-weight:800;color:#FF6B6B;text-shadow:0 0 16px rgba(255,100,100,0.5),0 2px 6px rgba(0,0,0,0.5);'
          + 'pointer-events:none;animation:eeFade 2.5s ease-out forwards;font-family:inherit;';
        toast.textContent = t('You broke it!');
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2800);
        // 恢复：从上方掉下来，渐显，到位后恢复浮动
        setTimeout(() => {
          panelTitle.style.transition = 'none';
          panelTitle.style.transform = 'translateY(-80px) rotate(-5deg)';
          panelTitle.style.opacity = '0';
          void panelTitle.offsetWidth; // 强制重绘
          panelTitle.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease-in';
          panelTitle.style.transform = 'translateY(0) rotate(0deg)';
          panelTitle.style.opacity = '1';
          // 浮动动画延迟恢复
          setTimeout(() => {
            panelTitle.style.transition = '';
            panelTitle.style.animation = '';
          }, 600);
        }, 3000);
      });
    }
  })();

  document.getElementById('btnPlay').addEventListener('click', () => {
    initAudio();
    document.getElementById('startOverlay').classList.add('hidden');
    document.getElementById('modeSelectOverlay').classList.remove('hidden');
  });

  // 👥 顾客队列连点彩蛋（事件委托）
  let queueClickCounts = {};
  let queueClickTimers = {};
  document.getElementById('queueRow').addEventListener('click', (e) => {
    if (gameMode !== 'market' || gameOver) return;
    const slot = e.target.closest('.queue-slot');
    if (!slot) return;
    const idx = Array.from(slot.parentNode.children).indexOf(slot);
    if (!customerQueue[idx]) return;
    queueClickCounts[idx] = (queueClickCounts[idx] || 0) + 1;
    clearTimeout(queueClickTimers[idx]);
    queueClickTimers[idx] = setTimeout(() => { queueClickCounts[idx] = 0; }, 1500);
    if (queueClickCounts[idx] >= 3) {
      queueClickCounts[idx] = 0;
      window._markEasterEgg('queue_poke');
      // 顾客"回头"：抖动一下
      slot.style.transform = 'rotate(-8deg)';
      setTimeout(() => { slot.style.transform = 'rotate(6deg)'; }, 80);
      setTimeout(() => { slot.style.transform = ''; }, 160);
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;top:35%;left:50%;transform:translate(-50%,-50%);z-index:9999;'
        + 'font-size:18px;font-weight:700;color:#FFD700;text-shadow:0 0 14px rgba(255,215,0,0.6);'
        + 'pointer-events:none;animation:eeFade 3s ease-out forwards;font-family:inherit;';
      toast.textContent = t('I\'m next, right?') + ' \u{1F644}';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3100);
    }
  });

  // 模式选择 - Free Play
  document.getElementById('btnFreePlay').addEventListener('click', () => {
    gameMode = 'freePlay';
    document.getElementById('modeSelectOverlay').classList.add('hidden');
    switchPanel('freePlay');
    startNewGame();
    render();
  });

  // 模式选择 - Market Mode
  document.getElementById('btnMarketMode').addEventListener('click', () => {
    gameMode = 'market';
    document.getElementById('modeSelectOverlay').classList.add('hidden');
    switchPanel('market');
    startNewGame();
    render();
  });

  // 点击模式选择外部关闭 → 回到开始页
  document.getElementById('modeSelectOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
      document.getElementById('startOverlay').classList.remove('hidden');
      updateStartHint();
    }
  });

  // SHOP 按钮（开始页） → 打开商店弹窗
  document.getElementById('btnShopStart').addEventListener('click', () => {
    initAudio();
    updateShopOverlay();
    renderSkinShop('board');
    document.getElementById('shopOverlay').classList.remove('hidden');
  });

  // SETTINGS 按钮（开始页） → 打开设置弹窗
  document.getElementById('btnSettingsStart').addEventListener('click', () => {
    initAudio();
    syncSoundToggleUI();
    populateSettingsSkinSelectors();
    document.getElementById('settingsOverlay').classList.remove('hidden');
  });

  // 关闭商店弹窗
  // 🛒 商店砍价彩蛋：余额不足时连点购买按钮 5 下
  let shopPokeCount = 0, shopPokeTimer = null;
  document.getElementById('shopOverlay').addEventListener('click', (e) => {
    // 点按钮、描述、图标都算——只要容器内有禁用的购买按钮
    const container = e.target.closest('.shop-item, .skin-card');
    if (!container) { shopPokeCount = 0; return; }
    const btn = container.querySelector('.btn-buy');
    if (!btn || !btn.disabled) { shopPokeCount = 0; return; }
    shopPokeCount++;
    clearTimeout(shopPokeTimer);
    shopPokeTimer = setTimeout(() => { shopPokeCount = 0; }, 1500);
    if (shopPokeCount >= 5) {
      shopPokeCount = 0;
      window._markEasterEgg('no_discount');
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);z-index:9999;'
        + 'font-size:20px;font-weight:700;color:#FFD700;text-shadow:0 0 14px rgba(255,215,0,0.5);'
        + 'pointer-events:none;animation:eeFade 2.5s ease-out forwards;font-family:inherit;';
      toast.textContent = t('I said NO discount!');
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2600);
    }
  });

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
      // 切换到 Skins 时渲染默认子标签
      if (target === 'skins') {
        document.querySelectorAll('.skin-subtab').forEach(st => st.classList.toggle('active', st.dataset.skinCat === 'board'));
        renderSkinShop('board');
      }
    });
  });

  // 皮肤子标签切换
  document.querySelectorAll('.skin-subtab').forEach(st => {
    st.addEventListener('click', () => {
      document.querySelectorAll('.skin-subtab').forEach(s => s.classList.remove('active'));
      st.classList.add('active');
      renderSkinShop(st.dataset.skinCat);
    });
  });

  // 初始化皮肤卡片事件委托
  bindSkinShopEvents();

  // 关闭设置弹窗
  document.getElementById('btnCloseSettings').addEventListener('click', () => {
    document.getElementById('settingsOverlay').classList.add('hidden');
  });

  // 成就弹窗
  document.getElementById('btnAchievementsStart').addEventListener('click', () => {
    initAudio();
    buildAchievementPanel();
    document.getElementById('achievementOverlay').classList.remove('hidden');
    startAchievementPanelRefresh();
  });
  document.getElementById('btnCloseAchievements').addEventListener('click', () => {
    document.getElementById('achievementOverlay').classList.add('hidden');
    stopAchievementPanelRefresh();
  });
  document.getElementById('achievementOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
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

  // 确认弹窗 - 返回主页（先结算再跳到结算页）
  document.getElementById('btnConfirmBack').addEventListener('click', () => {
    document.getElementById('confirmBackOverlay').classList.add('hidden');
    gameOver = true;
    showGameOver(false);  // 隐藏 Play Again，只显示 Back to Home
  });

  // 点击确认弹窗外部关闭
  document.getElementById('confirmBackOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
    }
  });

  // 点击重新开始确认弹窗外部关闭
  document.getElementById('confirmNewGameOverlay').addEventListener('click', (e) => {
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
        updateStartHint();
        return;
      }
      document.getElementById('settingsOverlay').classList.add('hidden');
      document.getElementById('shopOverlay').classList.add('hidden');
      document.getElementById('confirmBackOverlay').classList.add('hidden');
      document.getElementById('confirmNewGameOverlay').classList.add('hidden');
    }
  });
}

/** 填充 Settings 面板的皮肤选择器 */
/** 午夜主题白天隐藏 */
function isSkinVisible(cat, id) {
  if (id === 'midnight') {
    const hour = new Date().getHours();
    return hour >= 0 && hour < 5;
  }
  return true;
}

function populateSettingsSkinSelectors() {
  const pairs = [
    { cat:'theme',    elId:'settingThemeSkin',     list:SKIN_THEMES },
    { cat:'board',    elId:'settingBoardSkin',    list:SKIN_BOARDS },
    { cat:'piece',    elId:'settingPieceSkin',     list:SKIN_PIECES },
    { cat:'customer', elId:'settingCustomerSkin',  list:SKIN_CUSTOMERS },
  ];
  for (const {cat, elId, list} of pairs) {
    const sel = document.getElementById(elId);
    if (!sel) continue;
    sel.innerHTML = '';
    for (const skin of list) {
      if (!isSkinOwned(cat, skin.id)) continue;
      if (!isSkinVisible(cat, skin.id)) continue;
      const opt = document.createElement('option');
      opt.value = skin.id;
      opt.textContent = t(skin.name);
      if (skin.id === activeSkin[cat]) opt.selected = true;
      sel.appendChild(opt);
    }
  }
  bindSettingsSkinSelectors();
}

/** 绑定设置面板皮肤选择器 change 事件 */
function bindSettingsSkinSelectors() {
  const map = { settingThemeSkin:'theme', settingBoardSkin:'board', settingPieceSkin:'piece', settingCustomerSkin:'customer' };
  Object.entries(map).forEach(([elId, cat]) => {
    const sel = document.getElementById(elId);
    if (!sel || sel._skinBound) return;
    sel._skinBound = true;
    sel.addEventListener('change', () => {
      if (equipSkin(cat, sel.value)) {
        playTone(520, 0.1, 'sine', 0.06);
      }
    });
  });
}

/** 背景浮动方块 + 主题贴图 / emoji */
const DRIFT_COLORS = {
  dark:          ['#4a90d9','#cf6679','#03dac5'],
  light:         ['#a0b0c8','#c0a8b8','#a8c8b8'],
  forest:        ['#8ab88a','#c8a870','#a0c860'],
  midnight_gold: ['#e8c848','#c0a030','#a08020'],
  candy:         ['#f4a0b8','#f4c8d8','#e8a0c8'],
  ocean_depths:  ['#00b8d4','#0097a7','#00e5ff'],
  midnight:       ['#e8a840','#f0c860','#c87820'],
};
const DRIFT_EMOJIS = {
  forest:        ['\ud83c\udf3f','\ud83c\udf42','\ud83c\udf41','\ud83c\udf30','\ud83c\udf44','\ud83c\udf40','\ud83e\udeb5','\ud83e\uded0'],
  midnight_gold: ['\ud83e\ude99','\ud83d\udc8e','\u2b50','\ud83d\udc51','\ud83d\udddd\ufe0f','\ud83c\udfc6','\ud83d\udca0','\ud83e\udee7'],
  candy:         ['\ud83c\udf6d','\ud83e\uddc1','\ud83c\udf6c','\ud83d\udc96','\ud83c\udf66','\ud83c\udf69','\ud83c\udf6b','\ud83c\udf80'],
  ocean_depths:  ['\ud83c\udf0a','\ud83e\udee7','\ud83d\udc1f','\ud83d\udc20','\ud83d\udc19','\ud83e\udd80','\ud83e\udd91','\ud83d\udc1a'],
  midnight:       ['\ud83c\udfee','\ud83e\ude94','\u2728','\ud83d\udd25','\ud83d\udcab','\ud83c\udf90','\ud83d\udd6f\ufe0f','\ud83c\udf19'],
};
const DRIFT_SEAFOOD = [
  'assets/seafood/clam_1x1.png',
  'assets/seafood/razor_clam_1x2.png',
  'assets/seafood/razor_clam_2x1.png',
  'assets/seafood/shrimp_LU.png',
  'assets/seafood/shrimp_RU.png',
  'assets/seafood/shrimp_LB.png',
  'assets/seafood/shrimp_RB.png',
  'assets/seafood/squid_2x3.png',
];

function createBgBlocks(container, theme) {
  if (!container) return;
  const colors = DRIFT_COLORS[theme] || DRIFT_COLORS['dark'];
  const emojis = DRIFT_EMOJIS[theme]; // undefined for dark/light → 用海鲜图片

  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'bg-block';
    const size = 30 + Math.random() * 50;
    el.style.width  = size + 'px';
    el.style.height = size + 'px';
    el.style.left   = Math.random() * 100 + '%';
    el.style.top    = Math.random() * 100 + '%';
    el.style.animationDuration = (12 + Math.random() * 18) + 's';
    el.style.animationDelay    = (Math.random() * -25) + 's';

    // 一半概率用贴图/emoji，一半概率用纯色方块
    if (Math.random() < 0.5) {
      el.style.background = 'transparent';
      if (emojis) {
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = size * 0.8 + 'px';
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      } else {
        const img = document.createElement('img');
        img.src = DRIFT_SEAFOOD[Math.floor(Math.random() * DRIFT_SEAFOOD.length)];
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        el.appendChild(img);
      }
    } else {
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
    }
    container.appendChild(el);
  }
}

/** 重建所有漂移背景（主题切换时调用） */
function rebuildBgBlocks() {
  const theme = activeSkin.theme || 'dark';
  ['bgBlocks', 'startBgBlocks'].forEach(id => {
    const c = document.getElementById(id);
    if (c) { c.innerHTML = ''; createBgBlocks(c, theme); }
  });
}

/** 更新开始页提示（最高分 + 贝壳） */
function updateStartHint() {
  const hint = document.getElementById('startBestHint');
  let parts = [];
  if (bestScore > 0) {
    parts.push(t('Best') + ': <span>' + bestScore + '</span>');
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
  resetSessionTrackers();
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
  sessionPlacedBlocks++;
  stats.totalBlocksPlaced++;
  saveStats();

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
  sessionLinesInPlacement = lineCount;

  if (lineCount > 0) {
    // 构建消除格子集合（去重，排除海鲜格子）
    const ccSet = new Set();
    for (let r of rowsToClear) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!seafoodGrid[r][c] || seafoodGrid[r][c].isGap) ccSet.add(`${r},${c}`);
      }
    }
    for (let c of colsToClear) {
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!seafoodGrid[r][c] || seafoodGrid[r][c].isGap) ccSet.add(`${r},${c}`);
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
    sessionMaxCombo = Math.max(sessionMaxCombo, combo);
    stats.totalLinesCleared += lineCount;
    saveStats();
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
  checkAchievements();

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

/** 仅刷新游戏结束弹窗文字（i18n 切换用，不触发统计） */
function updateGameOverTexts() {
  const h2 = document.getElementById('gameOverTitle');
  const p = document.getElementById('gameOverSubtitle');
  if (gameMode === 'market') {
    if (h2) h2.innerHTML = `<span data-i18n="Shift Over!">${t('Shift Over!')}</span>`;
    if (p) p.innerHTML = `<span data-i18n="Shells earned">${t('Shells earned')}</span>`;
  } else {
    if (h2) h2.innerHTML = `<span data-i18n="Game Over">${t('Game Over')}</span>`;
    if (p) p.innerHTML = `<span data-i18n="Final Score">${t('Final Score')}</span>`;
  }
}

function showGameOver(showRestart = true) {
  // Count game played (only once per game)
  if (!gameEnded) {
    gameEnded = true;
    stats.totalGamesPlayed++;
    saveStats();
    // Final score/order achievement check
    checkAchievements();
  }
  document.getElementById('rescueOverlay').classList.add('hidden');
  document.getElementById('btnRestart').style.display = showRestart ? '' : 'none';
  const h2 = document.getElementById('gameOverTitle');
  const p = document.getElementById('gameOverSubtitle');
  if (gameMode === 'market') {
    if (h2) h2.innerHTML = `<span data-i18n="Shift Over!">${t('Shift Over!')}</span>`;
    if (p) p.innerHTML = `<span data-i18n="Shells earned">${t('Shells earned')}</span>`;
    document.getElementById('finalScore').textContent = `🐚 ${sessionShells}`;
    const newBestEl = document.getElementById('newBest');
    if (sessionShells > bestSessionShells && sessionShells > 0) {
      bestSessionShells = sessionShells;
      localStorage.setItem('blockPuzzleBestShells', bestSessionShells);
      newBestEl.innerHTML = `🏆 <span data-i18n="New Best!">${t('New Best!')}</span>`;
      newBestEl.classList.remove('hidden');
    } else if (bestSessionShells > 0) {
      newBestEl.textContent = `${t('Best')}: 🐚 ${bestSessionShells}`;
      newBestEl.classList.remove('hidden');
    } else {
      newBestEl.classList.add('hidden');
    }
  } else {
    if (h2) h2.innerHTML = `<span data-i18n="Game Over">${t('Game Over')}</span>`;
    if (p) p.innerHTML = `<span data-i18n="Final Score">${t('Final Score')}</span>`;
    document.getElementById('finalScore').textContent = score;
    const newBestEl = document.getElementById('newBest');
    // 从未保存过的最高分（localStorage 可能为空）
    const storedBest = parseInt(localStorage.getItem('blockPuzzleBest') || '0');
    if (score > storedBest && score > 0) {
      bestScore = score;
      localStorage.setItem('blockPuzzleBest', bestScore);
      newBestEl.innerHTML = `🎉 <span data-i18n="New Record!">${t('New Record!')}</span>`;
      newBestEl.classList.remove('hidden');
    } else if (storedBest > 0) {
      newBestEl.textContent = `${t('Best')}: ${storedBest}`;
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

  // 🦀 彩蛋：中文模式 5% 概率显示舟山方言
  const h2 = ov.querySelector('h2 span');
  if (h2 && currentLang === 'zh' && Math.random() < 0.05) {
    h2.textContent = '死蟹一只！';
    window._markEasterEgg('dead_crab');
  } else if (h2) {
    h2.textContent = t('No moves left!');
  }

  // Bomb 救援
  const bombCost = 50;
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
  const shuffleCost = 50;
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
  const undoCost = 50;
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

  // No Fishing 救援（仅 Market Mode）
  const fbCost = 90;
  const hasFB = powerUps.fishingBan > 0;
  const canBuyFB = shells >= fbCost;
  const fbBtn = ov.querySelector('[data-action="fishingBan"]');
  const fbCostEl = document.getElementById('rescueFishingBanCost');
  if (gameMode === 'market') {
    fbBtn.style.display = '';
    if (hasFB) {
      fbCostEl.textContent = `x${powerUps.fishingBan}`;
      fbBtn.classList.remove('disabled');
    } else if (canBuyFB) {
      fbCostEl.textContent = `🐚${fbCost}`;
      fbBtn.classList.remove('disabled');
    } else {
      fbCostEl.textContent = `🐚${fbCost}`;
      fbBtn.classList.add('disabled');
    }
  } else {
    fbBtn.style.display = 'none';
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
  } else if (type === 'fishingBan') {
    if (powerUps.fishingBan > 0) {
      powerUps.fishingBan--;
    } else if (shells >= 90) {
      shells -= 90;
      marketSaveShells();
      updateShellsUI();
    } else {
      gameOver = true;
      return;
    }
    savePowerUps();
    // 直接清除所有海鲜
    const targets = [];
    for (const piece of placedSeafoodPieces) {
      for (let sr = 0; sr < piece.rows; sr++) {
        for (let sc = 0; sc < piece.cols; sc++) {
          const r = piece.originR + sr, c = piece.originC + sc;
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            const cell = seafoodGrid[r] && seafoodGrid[r][c];
            if (cell && !cell.isGap) targets.push({ row: r, col: c });
          }
        }
      }
    }
    for (const { row, col } of targets) {
      grid[row][col] = 0;
      seafoodGrid[row][col] = null;
    }
    placedSeafoodPieces = [];
    stats.fishingBanUsed++;
    saveStats();
    checkAchievements();
    updatePowerUpUI();
    render();
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
  const useSkin = activeSkin.piece !== 'classic'
    && isSkinImageReady('piece', activeSkin.piece)
    && color !== '#C5E8F7'; // 海鲜背景不套用棋子皮肤

  // -- 主色块（皮肤纹理 或 纯色） --
  if (useSkin) {
    const tile = skinImages.piece[activeSkin.piece];
    ctx.save();
    roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 5);
    ctx.clip();
    ctx.drawImage(tile, x + 1, y + 1, size - 2, size - 2);
    ctx.restore();
  } else {
    ctx.fillStyle = color;
    roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 5);
    ctx.fill();
  }

  // -- 高光（左上）--
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x + 1, y + 1, size - 2, size - 2, 5);
  ctx.clip();
  ctx.fillStyle = useSkin ? 'rgba(255,255,255,0.12)' : tm.cellHighlight;
  ctx.fillRect(x + 2, y + 2, size - 4, (size - 4) * 0.45);
  // -- 阴影（右下）--
  ctx.fillStyle = useSkin ? 'rgba(0,0,0,0.15)' : tm.cellShadow;
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
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 棋盘背景
  ctx.fillStyle = tm.gridBg;
  roundRect(ctx, PADDING - 4, PADDING - 4,
            GRID_SIZE * CELL_SIZE + 8, GRID_SIZE * CELL_SIZE + 8, 14);
  ctx.fill();

  // 棋盘皮肤：边框装饰（铺满画布，清空格子区域，皮肤仅留边框）
  const boardSkin = activeSkin.board;
  if (boardSkin !== 'classic_blue' && isSkinImageReady('board', boardSkin)) {
    ctx.drawImage(skinImages.board[boardSkin], 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // 清除内部格子区域，让皮肤仅环绕在棋盘点阵四周
    ctx.clearRect(PADDING - 4, PADDING - 4,
                  GRID_SIZE * CELL_SIZE + 8, GRID_SIZE * CELL_SIZE + 8);
    // 重绘棋盘背景（被 clearRect 清掉了）
    ctx.fillStyle = tm.gridBg;
    roundRect(ctx, PADDING - 4, PADDING - 4,
              GRID_SIZE * CELL_SIZE + 8, GRID_SIZE * CELL_SIZE + 8, 14);
    ctx.fill();
  }

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
        if (seafoodGrid[r][c] && !seafoodGrid[r][c].isGap) {
          const sd = seafoodGrid[r][c];
          // ★ 逐格单独绘制背景（和普通棋子一致），然后贴图
          drawFilledCell(ctx, x, y, CELL_SIZE, '#C5E8F7');

          if (!isSeafoodImageReady(sd.key)) {
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
    if (!isSeafoodImageReady(piece.key)) continue;
    // 篮子消除动画期间跳过篮区内棋子（由放大动画接管）
    if (pendingBasketClear) {
      const bc = pendingBasketClear;
      if (piece.originR < bc.row + bc.rows && piece.originR + piece.rows > bc.row &&
          piece.originC < bc.col + bc.cols && piece.originC + piece.cols > bc.col) continue;
    }
    const img = seafoodImages[piece.key];
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

  // 篮消海鲜放大动画
  for (const a of basketClearAnims) {
    const img = seafoodImages[a.piece.key];
    if (!img) continue;
    ctx.save();
    ctx.globalAlpha = a.life * 0.6;
    const cx = a.x + a.w / 2;
    const cy = a.y + a.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(a.scale, a.scale);
    ctx.drawImage(img, -a.w / 2, -a.h / 2, a.w, a.h);
    ctx.restore();
  }

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
  if (!previewCanvases.length) return;
  for (let i = 0; i < 3; i++) {
    const pc   = previewCanvases[i];
    if (!pc) continue;
    const pctx = pc.getContext('2d');
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.clearRect(0, 0, 120, 120);

    const block = blocks && blocks[i];
    if (!block || block.placed) continue;

    const shape  = block.shape;
    const rows   = shape.length;
    const cols   = shape[0].length;
    const totalW = cols * PREVIEW_CELL;
    const totalH = rows * PREVIEW_CELL;
    const offX   = (120 - totalW) / 2;
    const offY   = (120 - totalH) / 2;

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

          if (!isSeafoodImageReady(block.seafoodKey)) {
            // 无图片：emoji 逐格绘制
            pctx.font = `${PREVIEW_CELL * 0.6}px sans-serif`;
            pctx.textAlign = 'center';
            pctx.textBaseline = 'middle';
            pctx.fillText(block.seafoodEmoji, px + PREVIEW_CELL / 2, py + PREVIEW_CELL / 2);
          }
        } else {
          const usePs = activeSkin.piece !== 'classic' && isSkinImageReady('piece', activeSkin.piece);
          if (usePs) {
            pctx.save();
            roundRect(pctx, px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2, 3);
            pctx.clip();
            pctx.drawImage(skinImages.piece[activeSkin.piece], px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
            pctx.restore();
          } else {
            pctx.fillStyle = block.color;
            roundRect(pctx, px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2, 3);
            pctx.fill();
          }
        }

        // 高光
        pctx.fillStyle = 'rgba(255,255,255,0.2)';
        pctx.fillRect(px + 1, py + 1, PREVIEW_CELL - 2, (PREVIEW_CELL - 2) * 0.4);
      }
    }

    // 海鲜棋子整图贴图（在 origin 位置叠一层，覆盖 bounding box）
    if (block.isSeafood && block.seafoodKey && isSeafoodImageReady(block.seafoodKey)) {
        pctx.drawImage(seafoodImages[block.seafoodKey], offX, offY, totalW, totalH);
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

        if (!isSeafoodImageReady(block.seafoodKey)) {
          cx.font = `${PREVIEW_CELL * 0.6}px sans-serif`;
          cx.textAlign = 'center';
          cx.textBaseline = 'middle';
          cx.fillText(block.seafoodEmoji, px + PREVIEW_CELL / 2, py + PREVIEW_CELL / 2);
        }
      } else {
        const usePs = activeSkin.piece !== 'classic' && isSkinImageReady('piece', activeSkin.piece);
        if (usePs) {
          cx.save();
          roundRect(cx, px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2, 3);
          cx.clip();
          cx.drawImage(skinImages.piece[activeSkin.piece], px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2);
          cx.restore();
        } else {
          cx.fillStyle = block.color;
          roundRect(cx, px + 1, py + 1, PREVIEW_CELL - 2, PREVIEW_CELL - 2, 3);
          cx.fill();
        }
      }

      cx.fillStyle = 'rgba(255,255,255,0.25)';
      cx.fillRect(px + 1, py + 1, PREVIEW_CELL - 2, (PREVIEW_CELL - 2) * 0.4);
    }
  }

  // 海鲜棋子整图贴图（在 origin 位置叠一层）
  if (block.isSeafood && block.seafoodKey && isSeafoodImageReady(block.seafoodKey)) {
      cx.drawImage(seafoodImages[block.seafoodKey], pad, pad, totalW - pad * 2, totalH - pad * 2);
  }

  return c;
}

// ===== UI 更新 =====
/** 刷新手机顶部栏（仅在 mobile 布局有效） */
function updateMobileHeader() {
  const isMarket = gameMode === 'market';
  // Shells（市场模式显示）
  const mhShells = document.getElementById('mhShells');
  if (mhShells) mhShells.style.display = isMarket ? '' : 'none';
  if (mhShells && isMarket) mhShells.textContent = `🐚 ${shells}`;
  // 顾客信息（市场模式）
  const mhCust = document.getElementById('mhCustomer');
  if (mhCust) {
    const showCust = isMarket && activeCustomer && !gameOver;
    mhCust.style.display = showCust ? 'flex' : 'none';
    if (showCust) {
      const iconEl = document.getElementById('mhCustIcon');
      const hintEl = document.getElementById('mhCustHint');
      if (iconEl && activeCustomer) {
        const img = activeCustomer.skinImg && activeCustomer.skinImg.complete && activeCustomer.skinImg.naturalWidth
          ? activeCustomer.skinImg : null;
        if (img) {
          iconEl.innerHTML = '';
          const im = document.createElement('img');
          im.src = img.src;
          im.style.width = '100%'; im.style.height = '100%';
          im.style.objectFit = 'contain'; im.style.borderRadius = '50%';
          iconEl.appendChild(im);
        } else {
          iconEl.textContent = activeCustomer.icon;
        }
      }
      if (hintEl && activeCustomer) {
        hintEl.textContent = t('Fill {w}×{h} area!', {w: activeCustomer.type.w, h: activeCustomer.type.h});
      }
    }
  }
  // Score（经典模式显示）
  const mhScore = document.getElementById('mhScore');
  const mhScoreVal = document.getElementById('mhScoreVal');
  if (mhScore) mhScore.style.display = (!isMarket) ? '' : 'none';
  if (mhScoreVal && !isMarket) mhScoreVal.textContent = score;
}

function updateScoreUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('combo').textContent = combo > 0 ? `x${combo}` : '-';
  document.getElementById('shells').textContent = `🐚 ${shells}`;
  updateMobileHeader();
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
        <h3>${t('help.freeplay.goalTitle')}</h3>
        <p>${t('help.freeplay.goal')}</p>
      </div>
      <div class="help-section">
        <h3>${t('help.freeplay.controlsTitle')}</h3>
        <p>${t('help.freeplay.controls1')}</p>
        <p>${t('help.freeplay.controls2')}</p>
      </div>
      <div class="help-section">
        <h3>${t('help.freeplay.powerupsTitle')}</h3>
        <p>${t('help.freeplay.powerups')}</p>
      </div>
      <div class="help-section">
        <h3>${t('help.freeplay.scoringTitle')}</h3>
        <p>${t('help.freeplay.scoring')}</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="help-section">
        <h3>${t('help.market.goalTitle')}</h3>
        <p>${t('help.market.goal')}</p>
      </div>
      <div class="help-section">
        <h3>${t('help.market.basketTitle')}</h3>
        <p>${t('help.market.basket')}</p>
      </div>
      <div class="help-section">
        <h3>${t('help.market.seafoodTitle')}</h3>
        <p>${t('help.market.seafood')}</p>
      </div>
      <div class="help-section">
        <h3>${t('help.market.earningTitle')}</h3>
        <p>${t('help.market.earning')}</p>
      </div>
      <div class="help-section">
        <h3>${t('help.market.tipsTitle')}</h3>
        <p>${t('help.market.tips')}</p>
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

// ===== 皮肤持久化 =====
function loadSkinState() {
  const saved = localStorage.getItem('blockPuzzleSkins');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.owned) {
        ownedSkins = data.owned;
        // 兼容旧存档（没有 theme 字段）
        if (!ownedSkins.theme) ownedSkins.theme = [];
      }
      if (data.active) {
        activeSkin = data.active;
        if (!activeSkin.theme) activeSkin.theme = 'dark';
      }
    } catch(e) {}
  }
  // 确保默认皮肤始终拥有
  if (!ownedSkins.board.includes('classic_blue')) ownedSkins.board.push('classic_blue');
  if (!ownedSkins.piece.includes('classic')) ownedSkins.piece.push('classic');
  if (!ownedSkins.customer.includes('shoppers')) ownedSkins.customer.push('shoppers');
  if (!ownedSkins.theme.includes('dark')) ownedSkins.theme.push('dark');
  if (!ownedSkins.theme.includes('light')) ownedSkins.theme.push('light');
  if (!ownedSkins.theme.includes('midnight')) ownedSkins.theme.push('midnight');
  // 确保 active 有效（防止数据错乱）
  if (!ownedSkins.board.includes(activeSkin.board)) activeSkin.board = 'classic_blue';
  if (!ownedSkins.piece.includes(activeSkin.piece)) activeSkin.piece = 'classic';
  if (!ownedSkins.customer.includes(activeSkin.customer)) activeSkin.customer = 'shoppers';
  if (!ownedSkins.theme.includes(activeSkin.theme)) activeSkin.theme = 'dark';
}

function saveSkinState() {
  localStorage.setItem('blockPuzzleSkins', JSON.stringify({ owned: ownedSkins, active: activeSkin }));
}

function updatePowerUpUI() {
  document.getElementById('bombCount').textContent      = powerUps.bomb;
  document.getElementById('shuffleCount').textContent    = powerUps.shuffle;
  document.getElementById('undoStepCount').textContent   = powerUps.undoStep;
  document.getElementById('fishingBanCount').textContent = powerUps.fishingBan;
  const busy = gameOver || (clearingCells && clearingCells.length > 0);
  const inMarket = gameMode === 'market';
  document.getElementById('btnBomb').disabled         = powerUps.bomb <= 0 || busy;
  document.getElementById('btnShuffle').disabled      = powerUps.shuffle <= 0 || busy;
  document.getElementById('btnUndoStep').disabled     = powerUps.undoStep <= 0 || busy || !history;
  document.getElementById('btnFishingBan').disabled   = powerUps.fishingBan <= 0 || busy || !inMarket;
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
  document.getElementById('powerupHint').textContent = t('Click the board to blast a 3×3 area');
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
  stats.bombUsed++;
  saveStats();
  checkAchievements();
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
  stats.shuffleUsed++;
  saveStats();
  checkAchievements();
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

/** Undo：消耗一个道具撤销 */
function activateUndoStep() {
  if (powerUps.undoStep <= 0 || !history || gameOver || (clearingCells && clearingCells.length > 0)) return;
  powerUps.undoStep--;
  savePowerUps();
  stats.undoUsed++;
  saveStats();
  checkAchievements();
  deactivatePowerUp();
  undo();
  updatePowerUpUI();
}

/** 禁渔期：移除棋盘上所有海鲜棋子（Market Mode 专属） */
function activateFishingBan() {
  if (powerUps.fishingBan <= 0 || gameOver || gameMode !== 'market' || (clearingCells && clearingCells.length > 0)) return;

  powerUps.fishingBan--;
  stats.fishingBanUsed++;
  savePowerUps();
  saveStats();
  updatePowerUpUI();
  checkAchievements();

  // 收集所有海鲜棋子占用的格子用于消除动画
  const targets = [];
  for (const piece of placedSeafoodPieces) {
    for (let sr = 0; sr < piece.rows; sr++) {
      for (let sc = 0; sc < piece.cols; sc++) {
        const r = piece.originR + sr, c = piece.originC + sc;
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          const cell = seafoodGrid[r] && seafoodGrid[r][c];
          if (cell && !cell.isGap) {
            targets.push({ row: r, col: c });
          }
        }
      }
    }
  }
  if (targets.length === 0) { sfxInvalid(); return; }

  // 清除
  for (const { row, col } of targets) {
    grid[row][col] = 0;
    seafoodGrid[row][col] = null;
  }
  placedSeafoodPieces = [];

  // 粒子特效：所有海鲜格子位置爆开
  for (const { row, col } of targets) {
    const cx = gx(col) + CELL_SIZE / 2;
    const cy = gy(row) + CELL_SIZE / 2;
    const count = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const hue = [38, 200, 340, 120, 55][Math.floor(Math.random() * 5)]; // 多彩爆裂
      clearingParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        size: 2.5 + Math.random() * 5,
        hue,
      });
    }
  }

  sfxClear(Math.min(targets.length, 12));
  updatePowerUpUI();
  render();
}

/** 更新商店弹窗余额 */
function updateShopOverlay() {
  const bal = parseInt(localStorage.getItem('blockPuzzleShells') || '0');
  document.getElementById('shopShells').textContent = bal;
  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.disabled = bal < parseInt(btn.dataset.cost);
  });
  // 同时刷新皮肤卡片的购买按钮状态
  renderSkinShop(currentSkinCat);
}

// ===== 皮肤商店渲染 =====
let currentSkinCat = 'board';

/** 渲染皮肤子标签下的卡片网格 */
function renderSkinShop(cat) {
  currentSkinCat = cat;
  const grid = document.getElementById('skinGrid');
  const info = document.getElementById('skinShellInfo');
  if (!grid) return;
  const list = cat==='board'?SKIN_BOARDS : cat==='piece'?SKIN_PIECES : cat==='customer'?SKIN_CUSTOMERS : SKIN_THEMES;
  const bal = parseInt(localStorage.getItem('blockPuzzleShells') || '0');

  let html = '';
  for (const skin of list) {
    if (!isSkinVisible(cat, skin.id)) continue;
    const owned = isSkinOwned(cat, skin.id);
    const active = activeSkin[cat] === skin.id;
    const canAfford = bal >= skin.price;

    let thumbHtml = '';
    if (cat === 'theme') {
      // 主题皮肤：显示色块预览
      const c = skin.boardColors || {};
      const gb = c.gridBg || '#333';
      const ec = c.emptyCell || '#444';
      thumbHtml = `<div style="width:100%;height:100%;display:flex;flex-direction:column;border-radius:8px;overflow:hidden;">
        <div style="flex:3;background:${gb};"></div>
        <div style="flex:2;background:${ec};display:flex;align-items:center;justify-content:center;font-size:20px;">🎨</div>
      </div>`;
    } else if (cat === 'customer') {
      // 顾客皮肤显示第一个角色图片
      const firstImg = skin.imgs ? skin.dir + skin.imgs[0] + '.png' : '';
      thumbHtml = firstImg ? `<img src="${firstImg}" alt="${skin.name}" onerror="this.style.display='none';this.nextSibling.style.display='block'"><span style="display:none;font-size:30px;">👥</span>` : '<span>👥</span>';
    } else if (skin.imgSrc) {
      thumbHtml = `<img src="${skin.imgSrc}" alt="${skin.name}" onerror="this.style.display='none';this.nextSibling.style.display='block'"><span style="display:none;font-size:30px;">${cat==='board'?'🟦':'🧊'}</span>`;
    } else {
      thumbHtml = cat==='board' ? '<span>🌊</span>' : '<span>🎨</span>';
    }

    let classes = ['skin-card'];
    if (active) classes.push('active');
    else if (owned) classes.push('owned');
    else classes.push('locked');

    let btnHtml = '';
    if (active) {
      btnHtml = `<span class="skin-badge active-badge">★ ${t('Active')}</span>`;
    } else if (owned) {
      btnHtml = `<button class="btn btn-ghost skin-btn skin-equip-btn" data-cat="${cat}" data-id="${skin.id}">${t('Equip')}</button>`;
    } else if (skin.category === 'achievement') {
      btnHtml = `<span class="skin-badge ach-lock-badge">${t('From Achievement')}</span>`;
    } else {
      const canBuy = skin.price > 0 && canAfford;
      btnHtml = `<button class="btn btn-buy skin-btn skin-buy-btn" data-cat="${cat}" data-id="${skin.id}" data-cost="${skin.price}" ${canBuy?'':'disabled'}>🐚${skin.price}</button>`;
    }

    html += `<div class="${classes.join(' ')}">
      <div class="skin-thumb">${thumbHtml}</div>
      <div class="skin-name">${t(skin.name)}</div>
      <div class="skin-desc">${t(skin.desc)}</div>
      ${btnHtml}
    </div>`;
  }

  grid.innerHTML = html;
  if (info) info.textContent = t('Balance: {n}', {n: bal});
}

/** 绑定皮肤卡片事件（事件委托，绑定在 document 上确保可靠捕获） */
function bindSkinShopEvents() {
  document.addEventListener('click', (e) => {
    const buyBtn = e.target.closest('.skin-buy-btn');
    const equipBtn = e.target.closest('.skin-equip-btn');
    if (buyBtn) {
      const cat = buyBtn.dataset.cat;
      const id = buyBtn.dataset.id;
      if (purchaseSkin(cat, id)) {
        playTone(660, 0.12, 'sine', 0.08);
        renderSkinShop(cat);
        updateShopOverlay();
        updateScoreUI();
      }
    }
    if (equipBtn) {
      const cat = equipBtn.dataset.cat;
      const id = equipBtn.dataset.id;
      equipSkin(cat, id);
      playTone(520, 0.1, 'sine', 0.06);
      renderSkinShop(cat);
    }
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

/** 使用当前激活的顾客皮肤创建一个顾客对象 */
function createCustomerObj() {
  const type = randomBasketType();
  const img = randomCustomerSkinImg();
  if (img && img.complete && img.naturalWidth) {
    return { icon: randomCustomerIcon(), type, skinImg: img };
  }
  // 皮肤图未就绪，回退到 emoji
  return { icon: randomCustomerIcon(), type, skinImg: null };
}

function randomBasketType() {
  return BASKET_TYPES[Math.floor(Math.random() * BASKET_TYPES.length)];
}

/** 初始化顾客队列 */
function initCustomerQueue() {
  customerQueue = [];
  for (let i = 0; i < 4; i++) {
    customerQueue.push(createCustomerObj());
  }
}

/** 刷新顾客队列（切换皮肤时用，保留当前顾客的篮区类型） */
function refreshCustomerQueue() {
  // 用新皮肤重建队列中的顾客
  customerQueue = customerQueue.map(() => createCustomerObj());
  // 用新皮肤重建当前活跃顾客（保留篮区类型不变）
  if (activeCustomer) {
    const savedType = activeCustomer.type;
    activeCustomer = createCustomerObj();
    activeCustomer.type = savedType;
  }
  updateCustomerUI();
}

/** 下一位顾客 */
function nextCustomer() {
  if (customerQueue.length === 0) {
    initCustomerQueue();
  }
  activeCustomer = customerQueue.shift();
  customerQueue.push(createCustomerObj());

  // 放置篮区
  placeBasketZone();
  updateCustomerUI();
}

/** 服务完成后弹出顾客对话气泡。seafoodKeys 为篮区内海鲜 key 数组 */
function showSpeechBubble(seafoodKeys) {
  const side = document.getElementById('customerSide');
  const icon = document.getElementById('custIcon');
  if (!side || !icon) return;

  // 从篮区海鲜中选一个种类，匹配专属台词；否则用 general
  let pool = SPEECH_CATEGORY.general;
  if (seafoodKeys && seafoodKeys.length) {
    const cats = [...new Set(seafoodKeys.map(k => SEAFOOD_CATEGORY_MAP[k]).filter(Boolean))];
    if (cats.length) {
      const chosen = cats[Math.floor(Math.random() * cats.length)];
      pool = SPEECH_CATEGORY[chosen] || SPEECH_CATEGORY.general;
    }
  }
  const phrase = pool[Math.floor(Math.random() * pool.length)];
  const translated = t(phrase); // i18n

  // 主题 → 气泡配色（低饱和度，与背景保持对比）
  const BUBBLE_THEME = {
    dark:          { bg:'linear-gradient(135deg,#7c78ba,#5c57a0)', tri:'#5c57a0', sh:'rgba(108,99,155,0.35)' },
    light:         { bg:'linear-gradient(135deg,#6e7886,#909aa8)', tri:'#6e7886', sh:'rgba(90,100,114,0.25)' },
    forest:        { bg:'linear-gradient(135deg,#6aaf6e,#3d8a42)', tri:'#3d8a42', sh:'rgba(76,140,80,0.28)' },
    midnight_gold: { bg:'linear-gradient(135deg,#c8aa52,#9e8230)', tri:'#9e8230', sh:'rgba(180,150,70,0.32)' },
    candy:         { bg:'linear-gradient(135deg,#d0808a,#b85a68)', tri:'#b85a68', sh:'rgba(195,120,130,0.3)' },
    ocean_depths:  { bg:'linear-gradient(135deg,#3aa8b8,#1a7888)', tri:'#1a7888', sh:'rgba(40,150,165,0.32)' },
  };
  const tc = BUBBLE_THEME[currentTheme] || BUBBLE_THEME.dark;

  const bubble = document.createElement('div');
  bubble.className = 'speech-bubble';
  bubble.textContent = translated;
  bubble.style.setProperty('--bubble-bg', tc.bg);
  bubble.style.setProperty('--bubble-tri', tc.tri);
  bubble.style.setProperty('--bubble-shadow', tc.sh);

  // 定位在顾客头像上方
  const iconRect = icon.getBoundingClientRect();
  const sideRect = side.getBoundingClientRect();
  bubble.style.top = (iconRect.top - sideRect.top - 22) + 'px';

  side.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1600);
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

    // 统计篮区内海鲜格子数 + 收集海鲜类型
    let seafoodCount = 0;
    const seafoodKeys = [];
    for (let r = row; r < row + rows; r++) {
      for (let c = col; c < col + cols; c++) {
        if (seafoodGrid[r][c] && !seafoodGrid[r][c].isGap) {
          seafoodCount++;
          seafoodKeys.push(seafoodGrid[r][c].key);
        }
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

    // 动画开始立即弹出气泡（传入海鲜类型以匹配台词），此时当前顾客还在
    showSpeechBubble(seafoodKeys);

    // 生成金色粒子（无得分飘字）
    spawnClearEffects(0, 0, 0);

    // 篮区内海鲜棋子→放大消失动画
    const animSet = new Set();
    for (const piece of placedSeafoodPieces) {
      if (!isSeafoodImageReady(piece.key)) continue;
      if (piece.originR < row + rows && piece.originR + piece.rows > row &&
          piece.originC < col + cols && piece.originC + piece.cols > col) {
        animSet.add(piece);
      }
    }
    basketClearAnims = [...animSet].map(piece => ({
      piece,
      x: gx(piece.originC),
      y: gy(piece.originR),
      w: piece.cols * CELL_SIZE,
      h: piece.rows * CELL_SIZE,
      scale: 1,
      life: 1,
    }));

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

  /** 渲染顾客头像（皮肤图片 或 emoji），round=true 用于圆形主头像 */
  function renderCustomerAvatar(el, customer, round) {
    el.innerHTML = '';
    if (customer.skinImg && customer.skinImg.complete && customer.skinImg.naturalWidth) {
      const img = document.createElement('img');
      img.src = customer.skinImg.src;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      if (round) img.style.borderRadius = '50%';
      el.appendChild(img);
    } else {
      el.textContent = customer.icon;
    }
  }

  renderCustomerAvatar(document.getElementById('custIcon'), activeCustomer, true);
  document.getElementById('custBasketHint').textContent =
    t('Fill {w}×{h} area!', {w: activeCustomer.type.w, h: activeCustomer.type.h});
  updateCustomerProgressUI();

  // 更新队列
  const queueRow = document.getElementById('queueRow');
  queueRow.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const slot = document.createElement('div');
    slot.className = 'queue-slot';
    if (i < customerQueue.length) {
      renderCustomerAvatar(slot, customerQueue[i], false);
    }
    queueRow.appendChild(slot);
  }
  updateMobileHeader();
}

function updateCustomerProgressUI() {
  const filled = countBasketFilled();
  let seafoodCount = 0;
  if (basketZone) {
    const { row, col, rows, cols } = basketZone;
    for (let r = row; r < row + rows; r++)
      for (let c = col; c < col + cols; c++)
        if (seafoodGrid[r][c] && !seafoodGrid[r][c].isGap) seafoodCount++;
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
  // 🫧 气泡彩蛋：连点空格 5 下
  let bubbleClicks = { row:-1, col:-1, count:0, timer:null };

  canvas.addEventListener('click', (e) => {
    if (gameOver || clearingCells.length > 0) return;
    initAudio();

    const cell = getGridCell(e);
    if (!cell) return;

    // 🫧 气泡彩蛋：同一空格快速连点 5 下
    if (!powerUpMode && grid[cell.row][cell.col] === 0) {
      const key = cell.row + ',' + cell.col;
      const lastKey = bubbleClicks.row + ',' + bubbleClicks.col;
      if (key === lastKey) {
        bubbleClicks.count++;
        clearTimeout(bubbleClicks.timer);
        bubbleClicks.timer = setTimeout(() => { bubbleClicks.count = 0; }, 1500);
        if (bubbleClicks.count >= 5) {
          bubbleClicks.count = 0;
          window._triggerBubble(cell.row, cell.col);
        }
      } else {
        bubbleClicks.row = cell.row;
        bubbleClicks.col = cell.col;
        bubbleClicks.count = 1;
        clearTimeout(bubbleClicks.timer);
        bubbleClicks.timer = setTimeout(() => { bubbleClicks.count = 0; }, 1500);
      }
    }

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
    if (!gameOver) {
      document.getElementById('confirmNewGameOverlay').classList.remove('hidden');
    } else {
      startNewGame();
    }
  });
  document.getElementById('btnRestart').addEventListener('click', () => {
    initAudio();
    if (!gameOver) {
      document.getElementById('confirmNewGameOverlay').classList.remove('hidden');
    } else {
      startNewGame();
    }
  });
  document.getElementById('btnGameOverHome').addEventListener('click', () => {
    initAudio();
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('startOverlay').classList.remove('hidden');
    grid = null;
    gameOver = false;
    clearingCells = [];
    clearTimer = 0;
    customerQueue = [];
    activeCustomer = null;
    basketZone = null;
    updateStartHint();
    updateScoreUI();
  });

  // ---- 重新开始确认弹窗 ----
  document.getElementById('btnCancelNewGame').addEventListener('click', () => {
    document.getElementById('confirmNewGameOverlay').classList.add('hidden');
  });
  document.getElementById('btnConfirmNewGame').addEventListener('click', () => {
    // 结算当前局
    if (gameMode === 'market') {
      if (sessionShells > bestSessionShells && sessionShells > 0) {
        bestSessionShells = sessionShells;
        localStorage.setItem('blockPuzzleBestShells', bestSessionShells);
      }
      shells += sessionShells;
      marketSaveShells();
    }
    // Free Play 的 bestScore 已在游戏过程中实时保存

    document.getElementById('confirmNewGameOverlay').classList.add('hidden');
    gameOver = true;  // 标记结束，弹出结算弹窗
    showGameOver();
  });

  // ---- 设置按钮 (in-game) → 打开设置弹窗 ----
  document.getElementById('settingsBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    syncSoundToggleUI();
    populateSettingsSkinSelectors();
    document.getElementById('settingsOverlay').classList.remove('hidden');
  });

  // ---- 成就按钮 (in-game) ----
  document.getElementById('achBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    buildAchievementPanel();
    document.getElementById('achievementOverlay').classList.remove('hidden');
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
  document.getElementById('btnFishingBan').addEventListener('click', () => {
    initAudio();
    activateFishingBan();
  });

  // 主题切换
  // 音效开关
  syncSoundToggleUI();
  document.getElementById('soundToggle').addEventListener('change', () => {
    isMuted = !document.getElementById('soundToggle').checked;
    localStorage.setItem('blockPuzzleMuted', isMuted ? '1' : '0');
    syncSoundToggleUI();
    if (isMuted) { pauseBgm(); } else { playBgm(); }
  });
  // 音量滑块
  const volSlider = document.getElementById('volumeSlider');
  volSlider.value = Math.round(bgmVolume * 100);
  let volLast = parseInt(volSlider.value), volLastDir = 0, volCrosses = 0, volCrossTimer = null;
  volSlider.addEventListener('input', () => {
    bgmVolume = volSlider.value / 100;
    localStorage.setItem('blockPuzzleVolume', bgmVolume.toString());
    if (bgm) bgm.volume = bgmVolume;
    if (!isMuted && bgm && bgm.paused) playBgm();

    // 🎚️ DJ搓碟彩蛋：来回跨越 50% 中点 6 次（3 趟），3 秒内
    const v = parseInt(volSlider.value);
    if (v !== volLast) {
      if ((volLast < 50 && v >= 50) || (volLast > 50 && v <= 50)) {
        volCrosses++;
        clearTimeout(volCrossTimer);
        volCrossTimer = setTimeout(() => { volCrosses = 0; }, 3000);
        if (volCrosses >= 6) {
          volCrosses = 0;
          window._markEasterEgg('dj_scratch');
          window._showScratchToast();
        }
      }
    }
    volLast = v;
  });

  // 应用保存的主题 & 加载道具
  applyTheme(currentTheme);

  // ===== 午夜彩蛋：0:00-5:00 自动切换午夜渔火主题 =====
  (function checkMidnight() {
    const hour = new Date().getHours();
    const subEl = document.querySelector('.start-content .subtitle span');
    if (hour >= 0 && hour < 5) {
      if (currentTheme !== 'midnight') {
        window._markEasterEgg('midnight');
        window._midnightPrevTheme = currentTheme;
        equipSkin('theme', 'midnight');
      }
      if (subEl) subEl.textContent = t('midnight.subtitle');
    } else {
      if (currentTheme === 'midnight') {
        const prev = window._midnightPrevTheme || 'dark';
        if (prev !== 'midnight') equipSkin('theme', prev);
      }
      if (subEl) subEl.textContent = t('Seafood Market');
    }
  })();
  loadPowerUps();
  updatePowerUpUI();
  
  // 监听 DPR 变化（多屏切换）
  function onDprChange() {
    const nd = window.devicePixelRatio || 1;
    if (nd === dpr) return;
    dpr = nd;
    canvas.width  = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    canvas.style.width  = CANVAS_SIZE + 'px';
    canvas.style.height = CANVAS_SIZE + 'px';
    previewCanvases.forEach(c => {
      c.width  = 120 * dpr;
      c.height = 120 * dpr;
      c.style.width  = '120px';
      c.style.height = '120px';
    });
    render();
    renderPreviewCanvases();
  }
  window.matchMedia(`(resolution: ${dpr}dppx)`).addEventListener('change', onDprChange);
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
        // Achievement tracking
        sessionOrders++;
        stats.totalOrdersCompleted++;
        stats.totalSeafoodCleared += bc.total;
        saveStats();
        checkAchievements();
        pendingBasketClear = null;
        clearingCells = [];
      } else {
        // 行/列消除：海鲜格子保留不动
        for (const { row, col } of clearingCells) {
          if (!seafoodGrid[row][col] || seafoodGrid[row][col].isGap) {
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
  // 篮消海鲜动画更新
  for (let i = basketClearAnims.length - 1; i >= 0; i--) {
    const a = basketClearAnims[i];
    a.scale += 0.03;
    a.life -= 0.04;
    if (a.life <= 0) basketClearAnims.splice(i, 1);
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
