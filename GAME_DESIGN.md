# Seafood Market Block Puzzle — Game Design Doc

## Overview

A hybrid of **Block Puzzle** (place pieces, fill rows/cols) and **sim-management** (serve customers, earn currency, buy skins). Theme: a seafood market where you pack customer orders into a grid.

---

## Core Loop

```
Place pieces → Clear rows/cols & fill customer baskets → Earn shells → Buy skins
```

---

## 1. Start Screen

Entry point with 3 main buttons:

```
┌────────────────────────────┐
│                            │
│         🧊  (logo)         │
│                            │
│    BLOCK PUZZLE            │
│    Seafood Market          │
│                            │
│    ┌──────────────────┐    │
│    │     ▶  PLAY      │    │
│    └──────────────────┘    │
│    ┌──────────────────┐    │
│    │    🛒  SHOP      │    │
│    └──────────────────┘    │
│    ┌──────────────────┐    │
│    │    ⚙  SETTINGS  │    │
│    └──────────────────┘    │
│                            │
│    Shells: 890             │
│                            │
└────────────────────────────┘
```

| Button | Action |
|--------|--------|
| **PLAY** | Open mode selection → Free Play or Market Mode |
| **SHOP** | Open shop overlay (power-ups + themes) |
| **SETTINGS** | Open settings panel (sound, theme, active skins) |

### 1.1 Mode Selection

After pressing PLAY, a mode selection dialog appears:

| Mode | Description |
|------|-------------|
| **Free Play** | Classic block puzzle. Place pieces, clear rows/cols, chase high score. No customers, no shells. |
| **Market Mode** | Seafood market sim. Serve customers by filling basket zones. Earn shells, buy skins. No score — only shells count. |

---

## 2. Core Gameplay (Existing)

### 2.1 Grid
- **8 × 8** board.

### 2.2 Pieces
- 25+ polyomino shapes (1×1 up to complex L/T/Z/X/W).
- 3 pieces shown at a time. Placing all 3 spawns a new set.
- Drag-and-drop or click-to-place.

### 2.3 Row / Column Clear
- Fill an entire row or column → it clears.
- Score + small shell bonus per line.
- Combo multiplier for consecutive clears.

### 2.4 Game Over
- When **none of the 3 available pieces** can be placed anywhere → game over.

---

## 3. Customer System (New)

### 3.1 Queue
- **Up to 3–4 customers visible** in a side panel.
- One **active customer** at a time. When served, the next advances.
- Queue refills automatically; guests are always waiting.

### 3.2 Basket Zones
Each customer has a **rectangular "basket"** marked on the board:

| Tier | Size (W×H) | Cells |
|------|-----------|-------|
| Small  | 2×3 | 6 |
| Small  | 3×2 | 6 |
| Medium | 4×4 | 16 |
| Large  | 5×3 | 15 |
| Large  | 3×5 | 15 |
| XL     | 5×5 | 25 |

- Basket zone shown as a distinct border / overlay on the board.
- Customer icon + basket size displayed in side panel.

### 3.3 Serving a Customer
- **Condition**: all cells inside the basket zone are filled.
- **Reward**: score + shells. Larger baskets = higher payout.
- **On serve**: basket cleared, guest leaves, next guest becomes active, new basket zone assigned.

### 3.4 Basket Placement Rules
- Zone is randomly placed on the board, avoiding overlap with other zones.
- Fallback: if the requested size has no valid slot, try a smaller size.
- If even 2×3 won't fit → skip that customer gracefully.

### 3.5 Seafood Pieces (海鲜棋子)

Market Mode 独有的棋子类型。从 25 种基础形状中挑选部分作为"海鲜棋子"，视觉上与普通冰棋子区分。

---

#### 🧊 Ice Pieces（普通方块）

- 相当于海鲜市场的**保鲜冰块**设定
- 可在棋盘**任意位置**放置（篮区内、篮区外均可）
- **参与行列消除**
- 结账时不算钱（0 shell）

#### 🦞 Seafood Pieces（海鲜棋子）

共 **10 种**海鲜棋子，选自舟山海鲜。部分有多种朝向（翻转变体），共对应多种形状变体。

| 海鲜 | Emoji | 形状 | 朝向 | 格数 | 来源 |
|------|:--:|------|:--:|:--:|------|
| 蛤蜊 (Clam) | 🐚 | 1×1 | — | 1 | index 0 |
| 蛏子 (Razor Clam) | 🦪 | 1×2 | 横 | 2 | index 2 |
| 蛏子 (Razor Clam) | 🦪 | 2×1 | 竖 | 2 | index 1 |
| 梅鱼 (Mei Fish) | 🐟 | 2×1 | 竖 | 2 | index 1 |
| 皮皮虾 (Mantis Shrimp) | 🦐 | 1×3 | 横 | 3 | index 4 |
| 皮皮虾 (Mantis Shrimp) | 🦐 | 3×1 | 竖 | 3 | index 3 |
| 对虾 (Shrimp) | 🦐 | L3 LU | 缺左上 | 3 | index 13 |
| 对虾 (Shrimp) | 🦐 | L3 RU | 缺右上 | 3 | index 12 |
| 对虾 (Shrimp) | 🦐 | L3 LB | 缺左下 | 3 | index 11 |
| 对虾 (Shrimp) | 🦐 | L3 RB | 缺右下 | 3 | index 10 |
| 海蜇皮 (Jellyfish) | 🫧 | 2×2 | — | 4 | index 5 |
| 带鱼 (Hairtail) | 🐍 | U5 U | 开口上 | 5 | index 22 |
| 带鱼 (Hairtail) | 🐍 | U5 D | 开口下 | 5 | **新增** `[[1,0,1],[1,1,1]]` |
| 带鱼 (Hairtail) | 🐍 | U5 L | 开口左 | 5 | **新增** `[[1,1],[0,1],[1,1]]` |
| 带鱼 (Hairtail) | 🐍 | U5 R | 开口右 | 5 | **新增** `[[1,1],[1,0],[1,1]]` |
| 鲳鱼 (Pomfret) | 🐠 | 2×3 | 横 | 6 | index 25 |
| 鲳鱼 (Pomfret) | 🐠 | 3×2 | 竖 | 6 | index 26 |
| 梭子蟹 (Swimming Crab) | 🦀 | 3×2 | — | 6 | index 26 |
| 鱿鱼 (Squid) | 🦑 | 2×3 | — | 6 | index 25 |

> **方向约定**：
> - 带鱼：U = 开口上，D = 开口下，L = 开口左，R = 开口右
> - 对虾：LU = 左上角透明，RU = 右上角透明，LB = 左下角透明，RB = 右下角透明
> - 蛏子/皮皮虾/鲳鱼：横/竖两种朝向

> 共 **10 种海鲜，19 个图片变体**。同形状不同图片用 seafoodId 区分（鲳鱼 3×2 & 鱿鱼共用 index 25，鲳鱼 2×3 & 梭子蟹共用 index 26）。

- **绘制方式**：海鲜棋子用整张图片素材绘制（覆盖 bounding box），无图片时 Fallback emoji
- **只能放在篮区（basket zone）内**，不可放在篮区外
- **不参与行列消除**：当所在行/列其他格子全满时，冰格子消除，海鲜格子**保留在原位**
- **不可被行列消除线分割**
- 3 个候选棋子中有概率出现海鲜棋子（60%，根据篮区尺寸过滤）

---

#### 🎨 海鲜棋子美术规范

风格：**卡通扁平插画**，粗轮廓 + 纯色色块，暖色系海鲜 vs 冷色半透明冰块形成对比。

---

##### 风格一致性

| 要点 | 规范 |
|------|------|
| **轮廓线** | 统一粗细（约 3-4px @2x），纯黑或深棕色，不用渐变 |
| **色块** | 扁平填充，阴影用 2-3 层同色系加深，不用软阴影/渐变 |
| **高光** | 简单的白色或浅色新月形高光，放在鱼身上方 |
| **眼睛** | 所有海鲜统一用圆形大眼 + 小白点高光（保持系列感） |
| **色板** | 暖色系为主（黄/橙/粉/奶油），和冰块冷色半透明形成对比 |

##### 形状匹配

- 每种海鲜画在对应 shape 的 **bounding box** 内
- 非满格形状（如 U5 `[[1,1,1],[1,0,1]]`）中间空缺处留白/透明
- 每个格子的视觉重心尽量平均分布，避免某格内容太空间

##### 尺寸规格

> **绘制时用大画布，完成后缩放到游戏尺寸**，避免小画布直接画产生锯齿。

| 海鲜 | 形状 | 朝向 | 推荐绘制尺寸 | 导出尺寸 (2x) | 游戏实际 (1x) | 文件名 |
|------|------|:--:|:---:|:---:|:---:|------|
| 🐚 蛤蜊 | 1×1 | — | 1024 × 1024 | 116 × 116 | 58 × 58 | `clam_1x1.png` |
| 🦪 蛏子 | 1×2 | 横 | 2048 × 1024 | 232 × 116 | 116 × 58 | `razor_clam_1x2.png` |
| 🦪 蛏子 | 2×1 | 竖 | 1024 × 2048 | 116 × 232 | 58 × 116 | `razor_clam_2x1.png` |
| 🐟 梅鱼 | 2×1 | 竖 | 1024 × 2048 | 116 × 232 | 58 × 116 | `mei_2x1.png` |
| 🦐 皮皮虾 | 1×3 | 横 | 3072 × 1024 | 348 × 116 | 174 × 58 | `mantisshrimp_1x3.png` |
| 🦐 皮皮虾 | 3×1 | 竖 | 1024 × 3072 | 116 × 348 | 58 × 174 | `mantisshrimp_3x1.png` |
| 🦐 对虾 | L3 LU | 缺左上 | 2048 × 2048 | 232 × 232 | 116 × 116 | `shrimp_LU.png` |
| 🦐 对虾 | L3 RU | 缺右上 | 2048 × 2048 | 232 × 232 | 116 × 116 | `shrimp_RU.png` |
| 🦐 对虾 | L3 LB | 缺左下 | 2048 × 2048 | 232 × 232 | 116 × 116 | `shrimp_LB.png` |
| 🦐 对虾 | L3 RB | 缺右下 | 2048 × 2048 | 232 × 232 | 116 × 116 | `shrimp_RB.png` |
| 🫧 海蜇皮 | 2×2 | — | 2048 × 2048 | 232 × 232 | 116 × 116 | `jellyfish_2x2.png` |
| 🐍 带鱼 | U5 U | 开口上 | 3072 × 2048 | 348 × 232 | 174 × 116 | `Hairtail_up.png` |
| 🐍 带鱼 | U5 D | 开口下 | 3072 × 2048 | 348 × 232 | 174 × 116 | `Hairtail_down.png` |
| 🐍 带鱼 | U5 L | 开口左 | 2048 × 3072 | 232 × 348 | 116 × 174 | `Hairtail_left.png` |
| 🐍 带鱼 | U5 R | 开口右 | 2048 × 3072 | 232 × 348 | 116 × 174 | `Hairtail_right.png` |
| 🐠 鲳鱼 | 2×3 | 横 | 2048 × 3072 | 232 × 348 | 116 × 174 | `Pomfret_2x3.png` |
| 🐠 鲳鱼 | 3×2 | 竖 | 3072 × 2048 | 348 × 232 | 174 × 116 | `Pomfret_3x2.png` |
| 🦀 梭子蟹 | 3×2 | — | 3072 × 2048 | 348 × 232 | 174 × 116 | `crab_3x2.png` |
| 🦑 鱿鱼 | 2×3 | — | 2048 × 3072 | 232 × 348 | 116 × 174 | `squid_2x3.png` |

> 绘制基准：**1024px/格**。画好后缩放到 2x（116px/格）导出，缩放算法用 Bicubic / Bilinear 自动柔滑边缘消除锯齿。

##### 文件格式

- **PNG，透明背景**
- 文件名（已确定，对应 `assets/seafood/` 目录）：
  - `clam_1x1.png`
  - `razor_clam_1x2.png`、`razor_clam_2x1.png`
  - `mei_2x1.png`
  - `mantisshrimp_1x3.png`、`mantisshrimp_3x1.png`
  - `shrimp_LU.png`、`shrimp_RU.png`、`shrimp_LB.png`、`shrimp_RB.png`
  - `jellyfish_2x2.png`
  - `Hairtail_up.png`、`Hairtail_down.png`、`Hairtail_left.png`、`Hairtail_right.png`
  - `Pomfret_2x3.png`、`Pomfret_3x2.png`
  - `crab_3x2.png`
  - `squid_2x3.png`

##### 测试方法

画好后先用一张替换 emoji 在小尺寸下验证：轮廓是否清晰、和其他格子的间距是否协调。

---

#### 结账规则

顾客篮区填满时触发结账：

```
结账奖励 = 基础 5 shell + 海鲜格子数 × 3 shell
```

| 示例 | 篮区内海鲜格数 | 奖励 |
|------|:--:|------|
| 全是冰格子 | 0 | 5 shell |
| 混了 2 个海鲜格 | 2 | 5 + 6 = 11 shell |
| 大篮区全塞海鲜 | 6 | 5 + 18 = 23 shell |

---

#### 结账后清理

- 篮区内**所有格子**（冰 + 海鲜）一起清除
- 篮区外的海鲜格（常规操作中不应存在）也会在消除行/列时保留不动

---

## 4. Scoring & Currency

### 4.1 Free Play — Score Only

| Action | Score |
|--------|-------|
| Place 1 cell | +1 |
| Clear 1 row or column | +10 × combo |

### 4.2 Market Mode — Shells Only

No score. Shells are earned exclusively from serving customers.

| Action | Shells |
|--------|--------|
| Serve customer (base reward) | +5 |
| Each seafood cell in basket | +3 |
| **Total = 5 + seafood × 3** | |

### 4.3 Currency
- **"Shells"** — earned only by serving customers in Market Mode.
- Stored in localStorage.
- Spent in the Shop.

---

## 5. Shop System (New)

Accessible from: **start screen** or **in-game** (Shop button). Two tabs.

### 5.1 Power-ups Tab — TBD (placeholder)

| Item | Effect |
|------|--------|
| Bomb | Clear a 3×3 area on the board |
| Shuffle | Re-roll the 3 current pieces |
| Basket Swap | Replace current customer with a different basket size |
| Extra Slot | Temporarily hold 4 pieces instead of 3 |

> *Exact items, prices and mechanics TBD.*

### 5.2 Skins Tab

Sub-tabs: **Board** | **Blocks** | **Customers**. Each shows locked (price) / owned (equip) / active (highlighted).

---

#### 🎨 Board Skins (棋盘主题) — 改变棋盘整体视觉风格

| # | Theme | Style | Shells |
|---|-------|-------|--------|
| 1 | **Deep Blue** (default) | 深蓝海洋，当前默认风格 | Free |
| 2 | **Coral Reef** | 珊瑚粉暖色，棋盘底纹像珊瑚礁 | 50 |
| 3 | **Abyss** | 深海极致暗色 + 荧光边框，海底深渊 | 80 |
| 4 | **Sunset Beach** | 暖橙金沙色，夕阳海滩氛围 | 80 |
| 5 | **Arctic** | 冰蓝 + 白，冰川水域 | 100 |

---

#### 🧊 Block Skins (方块皮肤) — 改变方块的颜色/图案

| # | Theme | Style | Shells |
|---|-------|-------|--------|
| 1 | **Classic** (default) | 默认鲜艳色块 | Free |
| 2 | **Tropical Fish** | 每块像热带鱼纹理（🐠🐡🦜fish） | 60 |
| 3 | **Pearl** | 珍珠质感，珠光渐变 | 80 |
| 4 | **Sea Glass** | 海浪打磨过的通透磨砂玻璃感 | 80 |
| 5 | **Coral** | 珊瑚纹理质感 | 100 |

---

#### 🦀 Customer Skins (顾客皮肤) — Market Mode 专属，替换顾客外观

| # | Theme | Style | Shells |
|---|-------|-------|--------|
| 1 | **Sea Creatures** (default) | 螃蟹/虾/章鱼等海鲜角色 | Free |
| 2 | **Merfolk** | 人鱼主题（🧜‍♀️🧜） | 100 |
| 3 | **Pirates** | 海盗主题（🏴‍☠️⚓） | 100 |
| 4 | **Chefs** | 厨师主题（👨‍🍳👩‍🍳） | 120 |

---

> **Status**: 皮肤系统待实现（Phase 3-4），以上为设计方案。先做道具功能。 |

### 5.3 Persistence
- Shell balance → localStorage.
- Owned skins → localStorage.
- Active skin per category → localStorage.

---

## 6. Settings Panel

Accessible from: **start screen** (SETTINGS button) or **in-game** (⚙ gear icon).

| Setting | Detail |
|---------|--------|
| Sound | Toggle — placeholder, coming soon |
| Theme | Dark / Light |
| Board Theme | Select from owned skins |
| Piece Theme | Select from owned skins |
| Guest Outfit | Select from owned skins |

---

## 7. UI Layout (In-Game)

```
┌──────────────────────────────────────────────┐
│                                              │
│  ┌────────────┐    ┌──────────────────────┐  │
│  │            │    │  SEAFOOD MARKET      │  │
│  │   8×8      │    │  ┌────────────────┐  │  │
│  │   Board    │    │  │ Shells:   💰 120│  │  │
│  │            │    │  │ Score:       340 │  │  │
│  │  [basket   │    │  │ Best:        890 │  │  │
│  │   zone     │    │  └────────────────┘  │  │
│  │   overlay] │    │                      │  │
│  │            │    │  🧑 Active Customer  │  │
│  └────────────┘    │  "Fill 3×2 area!"   │  │
│                     │                      │  │
│  ┌──────────────┐  │  ┌──┐ ┌──┐ ┌──┐    │  │
│  │ Queue        │  │  │  │ │  │ │  │    │  │
│  │ 🧑 🧑 🧑   │  │  └──┘ └──┘ └──┘    │  │
│  └──────────────┘  │  [New Game] [Undo]  │  │
│                     │  [Shop]      ⚙      │  │
│                     └──────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 8. Tech Stack

| Layer | Tech |
|-------|------|
| Board rendering | HTML5 Canvas |
| Game logic | Vanilla JavaScript |
| UI + theming | CSS Custom Properties |
| Persistence | localStorage |
| Language | English |

---

## 9. Development Phases

### Phase 0 — Foundation ✅ (DONE)

- [x] 8×8 board with Canvas rendering
- [x] 25+ polyomino piece shapes + preview cards
- [x] Click-to-place + drag-and-drop
- [x] Row/column clear with combo scoring
- [x] Undo system
- [x] Game over detection
- [x] Best score (localStorage)
- [x] Dark / Light theme
- [x] Settings panel (theme toggle, sound placeholder)
- [x] Start screen (PLAY button + floating block decorations)
- [x] Sound effects (Web Audio API)

### Phase 1 — Start Screen Upgrade + English UI

| Task | Description |
|------|-------------|
| 1.1 | Redesign start screen: 3 buttons (PLAY / SHOP / SETTINGS) |
| 1.2 | Settings panel accessible from start screen |
| 1.3 | Convert all UI text to English |

**Files touched**: `index.html`, `game.js`

### Phase 2 — Customer & Basket System

| Task | Description |
|------|-------------|
| 2.1 | Customer queue data structure (3–4 visible, auto-refill) |
| 2.2 | Basket zone types: 2×3, 3×2, 4×4, 5×3, 3×5, 5×5 |
| 2.3 | Basket zone placement logic (random, no overlap, fallback) |
| 2.4 | Basket highlight rendering on Canvas (distinct border style) |
| 2.5 | Serve detection: check if all cells in zone are filled |
| 2.6 | Serve flow: clear zone → reward shells/score → next customer |
| 2.7 | Active customer panel (icon + basket size hint) |
| 2.8 | Queue display panel (upcoming customers) |
| 2.9 | Shell currency tracking + UI display |
| 2.10 | Shell balance to localStorage |
| 2.11 | **Seafood pieces**: 10 类海鲜 19 个变体（蛤蜊、蛏子h/v、梅鱼、皮皮虾h/v、对虾LB/RB/LU/RU、海蜇皮、带鱼U/D/L/R、鲳鱼h/v、梭子蟹、鱿鱼），新增 3 个 U5 旋转变体 |
| 2.12 | Seafood placement restriction: only allow drop inside basket zone |
| 2.13 | Seafood immune to row/col clear: ice blocks clear, seafood stays in place |
| 2.14 | Generate seafood pieces in candidate set with configurable probability |
| 2.15 | Serve reward: base 5 + seafood_cells × 3 shells |
| 2.16 | Seafood visual distinction (warm palette / emoji overlay vs ice blocks) |

**Files touched**: `game.js`, `index.html`

### Phase 3 — Shop System

| Task | Description |
|------|-------------|
| 3.1 | Shop overlay panel (accessible from start screen & in-game) |
| 3.2 | Power-ups tab with placeholder items (Bomb, Shuffle, etc.) |
| 3.3 | Themes tab with sub-tabs: Board / Pieces / Guest Outfits |
| 3.4 | Theme data definitions (name, price, visual config) |
| 3.5 | Purchase flow: check shell balance → deduct → unlock |
| 3.6 | Equip flow: select owned skin → save as active |
| 3.7 | Apply board theme to Canvas rendering |
| 3.8 | Apply piece theme to Canvas rendering |
| 3.9 | Apply guest outfit to queue display |
| 3.10 | All persistence → localStorage (balance, inventory, active) |

**Files touched**: `game.js`, `index.html`

### Phase 4 — Art & Polish (Later)

| Task | Description |
|------|-------------|
| 4.1 | Create seafood image assets for the default piece theme |
| 4.2 | Create image assets for other piece themes (sushi, tropical fish, etc.) |
| 4.3 | Create image assets for board themes (wood, ice, bamboo...) |
| 4.4 | Create image assets for guest characters and outfits |
| 4.5 | Replace code-drawn blocks with image-based rendering (swap `drawImage`) |
| 4.6 | Background music (optional) |
| 4.7 | Animation polish (serve effects, queue transitions) |

---

*Last updated: 2026-08-07*

---

## REMAINING WORK

### Phase 3 — Shop: Skins System
| Task | Description |
|------|-------------|
| 3.3 | Skins Tab — 目前 Shop 弹窗中 Skins Tab 只有 "coming soon" 占位 |
| 3.4 | 皮肤数据定义 — Board/Piece/Guest 三类皮肤的结构化数据 |
| 3.5 | 皮肤购买流程 — 贝壳支付 → 解锁皮肤 |
| 3.6 | 皮肤装备流程 — 选择 → 应用到当前游戏 |
| 3.7 | Board 主题渲染 — Canvas 背景替换 |
| 3.8 | Piece 主题渲染 — 方块外观替换（drawImage 替代 drawRect） |
| 3.9 | Guest 外观渲染 — 顾客队列的显示替换 |
| 3.10 | 所有皮肤数据持久化到 localStorage |

### Phase 3 — Shop: Extra Power-ups
| Task | Description |
|------|-------------|
| 5.1.B | Basket Swap 道具 — 交换当前顾客的篮区类型 |
| 5.1.C | Extra Slot 道具 — 增加一个待放置方块槽位 |

### Phase 3 — Settings: Theme Selectors
| Task | Description |
|------|-------------|
| 6.1 | Board Theme 选择器 — 设置面板中添加下拉/选择 UI |
| 6.2 | Piece Theme 选择器 — 同上 |
| 6.3 | Guest Outfit 选择器 — 同上 |

### Phase 4 — Art & Polish
| Task | Description |
|------|-------------|
| 4.2 | Piece 皮肤图片资源 — sushi, tropical fish 等主题 |
| 4.3 | Board 皮肤图片资源 — wood, ice, bamboo 等主题 |
| 4.4 | Guest 外观图片资源 — 不同角色和装扮 |
| 4.5 | 用图片渲染替代代码绘制方块（drawImage） |
| 4.6 | 背景音乐 |
| 4.7 | 动画打磨（服务特效、队列过渡等） |

### Completed (not in doc previously)
| Task | Description |
|------|-------------|
| — | 行/列消除金色粒子动画 |
| — | 篮区消除金色粒子动画 |
| — | 音效开关（isMuted + localStorage 持久化） |
| — | Undo 按钮 Market 模式可用 |

