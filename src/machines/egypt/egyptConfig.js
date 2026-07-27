import { GAME_CONFIG } from "../../services/gameConfig";

export const EGYPT_CONFIG = {
  ROWS: 5,
  COLUMNS: 5,

  BET_OPTIONS: [30, 40, 50, 100, 250, 500, 1000],

  WILD: "🪙",
  SCATTER: "👁️",

  SYMBOLS: [
    "🪙", // Wild
    "👁️", // Scatter
    "🐫",
    "🐍",
    "🦅",
    "⚱️",
    "📜",
    "👑",
    "💎",
    "☀️",
  ],

  WEIGHTED_SYMBOLS: [
    "🐫","🐫","🐫","🐫","🐫","🐫","🐫",
    "🐍","🐍","🐍","🐍","🐍","🐍",
    "🦅","🦅","🦅","🦅",
    "⚱️","⚱️","⚱️",
    "📜","📜",
    "👑","👑",
    "💎",
    "☀️",
    "👁️",
    "🪙",
  ],

  SYMBOL_PAYS: {
    "🐫": { 3: 1, 4: 2, 5: 4 },
    "🐍": { 3: 2, 4: 4, 5: 8 },
    "🦅": { 3: 3, 4: 6, 5: 12 },
    "⚱️": { 3: 4, 4: 8, 5: 16 },
    "📜": { 3: 6, 4: 12, 5: 24 },
    "👑": { 3: 8, 4: 16, 5: 32 },
    "💎": { 3: 12, 4: 24, 5: 48 },
    "☀️": { 3: 18, 4: 36, 5: 72 },
  },

  PAYLINES: [
    [0,0,0,0,0],
    [1,1,1,1,1],
    [2,2,2,2,2],
    [3,3,3,3,3],
    [4,4,4,4,4],
    [0,1,2,3,4],
    [4,3,2,1,0],
    [0,1,2,1,0],
    [4,3,2,3,4],
  ],

  LINE_PAYOUT_FACTOR: GAME_CONFIG.LINE_PAYOUT_FACTOR,
  SCATTER_MULTIPLIERS: GAME_CONFIG.SCATTER_MULTIPLIERS,
  FREE_SPINS: GAME_CONFIG.FREE_SPINS,
};