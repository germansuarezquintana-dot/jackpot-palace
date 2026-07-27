import { GAME_CONFIG } from "../../services/gameConfig";

export const JACKPOT_CONFIG = {
  ROWS: 3,
  COLUMNS: 5,

  BET_OPTIONS: [30, 40, 50, 100, 250, 500, 1000],

  WILD: "🃏",
  SCATTER: "🎁",

  SYMBOLS: [
    "🍒",
    "🍋",
    "🔔",
    "⭐",
    "7️⃣",
    "💎",
    "🍉",
    "👑",
    "🃏",
    "🎁",
  ],

  PAYLINES: [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
    [0, 0, 1, 0, 0],
    [2, 2, 1, 2, 2],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
    [0, 1, 1, 1, 0],
  ],

  SYMBOL_PAYS: {
    "🍒": { 3: 2, 4: 5, 5: 12 },
    "🍋": { 3: 2, 4: 5, 5: 12 },
    "🔔": { 3: 2, 4: 6, 5: 14 },
    "⭐": { 3: 3, 4: 7, 5: 16 },
    "🍉": { 3: 3, 4: 8, 5: 18 },
    "💎": { 3: 4, 4: 10, 5: 22 },
    "7️⃣": { 3: 5, 4: 12, 5: 28 },
    "👑": { 3: 6, 4: 18, 5: 0 },
    "🃏": { 3: 5, 4: 12, 5: 25 },
  },

  BASE_POOL: [
    "🍒", "🍒", "🍒", "🍒", "🍒",
    "🍋", "🍋", "🍋", "🍋",
    "🔔", "🔔", "🔔",
    "⭐", "⭐", "⭐",
    "🍉", "🍉",
    "💎", "💎",
    "7️⃣", "👑",
  ],

  OUTCOME_RATES: {
    jackpot: 0.00005,
    mega: 0.002,
    big: 0.015,
    medium: 0.06,
    scatter: 0.008,
    small: 0.38,
  },

  LINE_PAYOUT_FACTOR: GAME_CONFIG.LINE_PAYOUT_FACTOR,
  SCATTER_MULTIPLIERS: GAME_CONFIG.SCATTER_MULTIPLIERS,

FREE_SPINS: GAME_CONFIG.FREE_SPINS,
};