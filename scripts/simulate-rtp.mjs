import { calculatePrize, createGrid } from "../src/services/slotEngine.js";

const spins = Number.parseInt(process.argv[2] ?? "1000000", 10);
const bet = 100;
const jackpot = 5000;
let totalWon = 0;
let paidSpins = 0;
let jackpots = 0;
let freeSpinsWon = 0;

for (let index = 0; index < spins; index += 1) {
  const prize = calculatePrize(createGrid(), bet, jackpot);
  totalWon += prize.amount;
  if (prize.amount > 0) paidSpins += 1;
  if (prize.jackpotWon) jackpots += 1;
  freeSpinsWon += prize.freeSpinsWon;
}

console.table({
  spins,
  rtpBasePercent: Number(((totalWon / (spins * bet)) * 100).toFixed(4)),
  hitRatePercent: Number(((paidSpins / spins) * 100).toFixed(4)),
  jackpots,
  freeSpinsWon,
});
