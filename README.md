# 🧊 Tile & Tide — Seafood Market Block Puzzle

A cozy hybrid of **block puzzle** and **market sim**. Place polyomino pieces on an 8×8 board, clear rows & columns, and serve seafood-loving customers to earn shells.

---

## 🎮 Play

- **[itch.io →](https://chad-bradley.itch.io/tile-and-tide)**
- **[GitHub Pages →](https://chad-bradley.github.io/Tile-and-Tide/)**
- Or open `index.html` in any browser — no build, no server, no dependencies.

---

## 🕹 Game Modes

| Mode | Goal |
|------|------|
| 🧊 **Classic Mode** | Endless block puzzle. Clear rows & columns, chase your high score — no pressure, no timers. |
| 🦀 **Market Mode** | Run a seaside market. Fill customer basket zones to serve orders, include seafood pieces for bonus 🐚 shells, and spend your earnings on power-ups and skins. |

---

## 🐚 Market Mode

- Customers arrive with a **basket zone** highlighted on the board
- Fill every cell inside the basket to complete the order
- **Seafood pieces** appear on the board — immune to row/column clears, only removed when included in a basket serve
- Earn **shells** (base 5 + 3 per seafood cell in basket)
- Spend shells in the **Shop** to buy power-ups

---

## 💣 Power-ups

| Item | Effect | Cost |
|------|--------|------|
| 💣 Bomb | Destroy a 3×3 area on the board | 50 🐚 |
| 🔀 Shuffle | Replace all unplaced pieces | 50 🐚 |
| ↩️ Undo | Reverse your last placement | 50 🐚 |

---

## 🎨 Features

- 25+ polyomino piece shapes
- 19 seafood image assets
- Customer avatar skins (unlockable)
- Board & piece skins (unlockable)
- Relaxing piano BGM with volume control
- Dark / Light theme
- Sound effects with mute toggle
- Combo scoring & particle effects
- Undo system
- Power-up shop
- All progress saved to `localStorage`

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Rendering | HTML5 Canvas |
| Logic | Vanilla JavaScript |
| Styling | CSS Custom Properties |
| Storage | `localStorage` |
| Audio | Web Audio API + BGM |

---

## 📁 Project Structure

```
block/
├── index.html          # Main page & UI
├── game.js             # All game logic
├── assets/
│   ├── bgm.mp3         # Background music
│   ├── icon/           # App & cursor icons
│   ├── seafood/        # 19 seafood PNG images
│   └── skins/          # Board, piece & customer skins
├── GAME_DESIGN.md      # Full design document
└── README.md
```

---

*Made with vanilla JS & love for seafood 🦀*
