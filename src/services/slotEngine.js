import { GAME_CONFIG } from "./gameConfig.js";
import { JACKPOT_CONFIG } from "../machines/jackpot/jackpotConfig.js";
export const WILD = JACKPOT_CONFIG.WILD;
export const SCATTER = JACKPOT_CONFIG.SCATTER;

export const ROWS = JACKPOT_CONFIG.ROWS;
export const COLUMNS = JACKPOT_CONFIG.COLUMNS;

export const BET_OPTIONS = JACKPOT_CONFIG.BET_OPTIONS;

export const STARTING_JACKPOT = GAME_CONFIG.JACKPOT_START;

export const SYMBOLS = JACKPOT_CONFIG.SYMBOLS;

export const PAYLINES = JACKPOT_CONFIG.PAYLINES;

const LINE_PAYOUT_FACTOR = JACKPOT_CONFIG.LINE_PAYOUT_FACTOR;

export const OUTCOME_RATES = Object.freeze(
  JACKPOT_CONFIG.OUTCOME_RATES
);
export const SYMBOL_PAYS = JACKPOT_CONFIG.SYMBOL_PAYS;
const BASE_POOL = JACKPOT_CONFIG.BASE_POOL;

function randomItem(items, random = Math.random) {
  return items[Math.floor(random() * items.length)];
}

function randomSymbol(random = Math.random) {
  const number = random();
  if (number < 0.01) return SCATTER;
  if (number < 0.04) return WILD;
  return randomItem(BASE_POOL, random);
}

export function getSpinType(random = Math.random) {
  const roll = random();
  let accumulated = 0;

  for (const [type, probability] of Object.entries(OUTCOME_RATES)) {
    accumulated += probability;
    if (roll < accumulated) return type;
  }

  return "lose";
}

function resolveLineSymbols(lineSymbols) {
  if (lineSymbols[0] === SCATTER) return null;

  const nonWild = lineSymbols.find(
    (symbol) => symbol !== WILD && symbol !== SCATTER
  );
  const paySymbol = nonWild ?? WILD;

  let consecutive = 0;
  for (const symbol of lineSymbols) {
    if (symbol === SCATTER) break;
    if (symbol === paySymbol || symbol === WILD || paySymbol === WILD) {
      consecutive += 1;
    } else {
      break;
    }
  }

  return consecutive >= 3 ? { paySymbol, consecutive } : null;
}

function lineHasWin(grid, payline) {
  const lineSymbols = payline.map(
    (rowIndex, columnIndex) => grid[columnIndex][rowIndex]
  );
  return Boolean(resolveLineSymbols(lineSymbols));
}

function countScatters(grid) {
  return grid.reduce(
    (total, column) => total + column.filter((symbol) => symbol === SCATTER).length,
    0
  );
}

function createLosingGrid(random = Math.random) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const candidate = Array.from({ length: COLUMNS }, () =>
      Array.from({ length: ROWS }, () => randomSymbol(random))
    );
    if (!PAYLINES.some((line) => lineHasWin(candidate, line)) && countScatters(candidate) < 3) {
      return candidate;
    }
  }

  const safeSymbols = ["🍒", "🍋", "🔔", "⭐", "🍉", "💎", "7️⃣"];
  return Array.from({ length: COLUMNS }, (_, column) =>
    Array.from({ length: ROWS }, (_, row) => safeSymbols[(column * 3 + row * 2) % safeSymbols.length])
  );
}

function forceLine(grid, length, availableSymbols, random = Math.random) {
  const payline = randomItem(PAYLINES, random);
  const symbol = randomItem(availableSymbols, random);

  for (let column = 0; column < length; column += 1) {
    grid[column][payline[column]] = symbol;
  }

  if (length < COLUMNS) {
    const blockers = ["🍋", "🔔", "⭐", "🍉", "💎", "7️⃣"].filter((item) => item !== symbol);
    grid[length][payline[length]] = randomItem(blockers, random);
  }
}

function forceScatters(grid, random = Math.random) {
  const roll = random();
  const quantity = roll < 0.72 ? 3 : roll < 0.94 ? 4 : 5;
  const used = new Set();

  while (used.size < quantity) {
    const column = Math.floor(random() * COLUMNS);
    const row = Math.floor(random() * ROWS);
    const key = `${column}-${row}`;
    if (!used.has(key)) {
      used.add(key);
      grid[column][row] = SCATTER;
    }
  }
}

function addNearMiss(grid, random = Math.random) {
  if (random() < 0.18) {
    const firstRow = Math.floor(random() * ROWS);
    let secondRow = Math.floor(random() * ROWS);
    if (secondRow === firstRow) secondRow = (secondRow + 1) % ROWS;
    grid[0][firstRow] = SCATTER;
    grid[3][secondRow] = SCATTER;
    return;
  }

  if (random() < 0.28) {
    const payline = randomItem(PAYLINES, random);
    const symbol = randomItem(["7️⃣", "💎", "👑"], random);
    grid[0][payline[0]] = symbol;
    grid[1][payline[1]] = symbol;
  }
}
function removeAccidentalJackpots(grid, random = Math.random) {
  const replacementSymbols = ["🍒", "🍋", "🔔", "⭐", "🍉", "💎", "7️⃣"];

  for (let attempt = 0; attempt < PAYLINES.length; attempt += 1) {
    const jackpotLine = PAYLINES.find((payline) => {
      const lineSymbols = payline.map(
        (rowIndex, columnIndex) => grid[columnIndex][rowIndex]
      );

      const resolved = resolveLineSymbols(lineSymbols);

      return (
        resolved?.paySymbol === "👑" &&
        resolved.consecutive === COLUMNS
      );
    });

    if (!jackpotLine) return;

    const column = COLUMNS - 1;
    const row = jackpotLine[column];

    grid[column][row] = randomItem(replacementSymbols, random);
  }
}
export function createGrid(random = Math.random) {
  const grid = createLosingGrid(random);
  const spinType = getSpinType(random);

  if (spinType === "small") forceLine(grid, 3, ["🍒", "🍋", "🔔", "⭐"], random);
  else if (spinType === "medium") forceLine(grid, 4, ["🍒", "🍋", "🔔", "⭐", "🍉"], random);
  else if (spinType === "big") forceLine(grid, 4, ["🍉", "💎", "7️⃣", "👑"], random);
  else if (spinType === "mega") forceLine(grid, 5, ["💎", "7️⃣"], random);
  else if (spinType === "jackpot") forceLine(grid, 5, ["👑"], random);
  else if (spinType === "scatter") forceScatters(grid, random);
  else addNearMiss(grid, random);

    if (spinType !== "jackpot") {
    removeAccidentalJackpots(grid, random);
  }

  return grid;
}

function evaluateLine(result, payline, lineIndex, bet) {
  const lineSymbols = payline.map(
    (rowIndex, columnIndex) => result[columnIndex][rowIndex]
  );
  const resolved = resolveLineSymbols(lineSymbols);
  if (!resolved) return null;

  const { paySymbol, consecutive } = resolved;
  const isJackpotLine = paySymbol === "👑" && consecutive === 5;
  const multiplier = SYMBOL_PAYS[paySymbol]?.[consecutive] ?? 0;
  if (multiplier === 0 && !isJackpotLine) return null;

  return {
    lineIndex,
    consecutive,
    symbol: paySymbol,
    amount: isJackpotLine ? 0 : Math.round(bet * multiplier * LINE_PAYOUT_FACTOR),
    cells: Array.from({ length: consecutive }, (_, column) => ({
      column,
      row: payline[column],
    })),
  };
}

function evaluateScatters(result, bet) {
  const cells = [];
  result.forEach((column, columnIndex) => {
    column.forEach((symbol, rowIndex) => {
      if (symbol === SCATTER) cells.push({ column: columnIndex, row: rowIndex });
    });
  });

  const count = cells.length;
  const multiplier =
  JACKPOT_CONFIG.SCATTER_MULTIPLIERS[count] ?? 0;

const freeSpins =
  JACKPOT_CONFIG.FREE_SPINS[count] ?? 0;

  return {
    count,
    amount: Math.round(bet * multiplier),
    freeSpins,
    cells: multiplier > 0 ? cells : [],
  };
}

export function calculatePrize(result, bet, jackpot) {
  const lineWins = PAYLINES.map((payline, lineIndex) =>
    evaluateLine(result, payline, lineIndex, bet)
  ).filter(Boolean);
  const scatterWin = evaluateScatters(result, bet);
  const jackpotLine = lineWins.find((win) => win.symbol === "👑" && win.consecutive === 5);
  const jackpotPrize = jackpotLine ? jackpot : 0;
  const linePrize = lineWins.reduce((total, win) => total + win.amount, 0);
  const totalPrize = linePrize + scatterWin.amount + jackpotPrize;

  let message = "Sin premio. Probá otra vez.";
  if (jackpotPrize > 0) message = `👑 ¡JACKPOT! ${totalPrize} CRÉDITOS`;
  else if (lineWins.length > 0 && scatterWin.freeSpins > 0) {
    message = `🎉 PREMIO ${totalPrize} + ${scatterWin.freeSpins} GIROS GRATIS`;
  } else if (scatterWin.freeSpins > 0) {
    message = `🎁 ${scatterWin.count} SCATTER · ${scatterWin.freeSpins} GIROS GRATIS`;
  } else if (lineWins.length === 1) message = `🏆 ¡GANASTE ${totalPrize} CRÉDITOS!`;
  else if (lineWins.length > 1) message = `🎉 ${lineWins.length} LÍNEAS GANADORAS · PREMIO ${totalPrize}`;

  return {
    amount: totalPrize,
    message,
    lines: lineWins.map((win) => win.lineIndex),
    cells: lineWins.flatMap((win) => win.cells),
    scatterCells: scatterWin.cells,
    freeSpinsWon: scatterWin.freeSpins,
    jackpotWon: jackpotPrize > 0,
  };
}
