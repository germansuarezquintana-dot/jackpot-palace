import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";
import coin from "./assets/coin.png";
const WILD = "🃏";
const SCATTER = "🎁";

const symbols = [
  "🍒",
  "🍋",
  "🔔",
  "⭐",
  "7️⃣",
  "💎",
  "🍉",
  "👑",
  WILD,
  SCATTER,
];

const ROWS = 3;
const COLUMNS = 5;
const BET_OPTIONS = [100, 250, 500, 1000, 2500, 5000];
function randomSymbol() {
  const number = Math.random();

  if (number < 0.01) return SCATTER;
  if (number < 0.04) return WILD;

const pool = [
  "🍒","🍒","🍒","🍒","🍒",
  "🍋","🍋","🍋","🍋",
  "🔔","🔔","🔔",
  "⭐","⭐","⭐",
  "🍉","🍉",
  "💎","💎",
  "7️⃣",
  "👑"
];

return pool[Math.floor(Math.random() * pool.length)];
}





function createGrid() {
  const grid = Array.from({ length: COLUMNS }, () =>
    Array.from({ length: ROWS }, () => randomSymbol())
  );

  const chance = Math.random();

  // 30%: premio chico
  if (chance < 0.30) {
    const payline =
      PAYLINES[Math.floor(Math.random() * PAYLINES.length)];

    const symbol =
      ["🍒", "🍋", "🔔", "⭐"][
        Math.floor(Math.random() * 4)
      ];

    for (let column = 0; column < 3; column += 1) {
      grid[column][payline[column]] = symbol;
    }

    // Evita que continúe accidentalmente a 4 o 5 símbolos
    if (
      grid[3][payline[3]] === symbol ||
      grid[3][payline[3]] === WILD
    ) {
      grid[3][payline[3]] = "💎";
    }
  }

  // 8%: premio medio
  else if (chance < 0.38) {
    const payline =
      PAYLINES[Math.floor(Math.random() * PAYLINES.length)];

    const symbol =
      ["🍉", "💎", "7️⃣"][
        Math.floor(Math.random() * 3)
      ];

    for (let column = 0; column < 4; column += 1) {
      grid[column][payline[column]] = symbol;
    }

    // Evita que se convierta accidentalmente en 5 iguales
    if (
      grid[4][payline[4]] === symbol ||
      grid[4][payline[4]] === WILD
    ) {
      grid[4][payline[4]] = "🍋";
    }
  }

  // 1%: premio grande
  else if (chance < 0.39) {
    const payline =
      PAYLINES[Math.floor(Math.random() * PAYLINES.length)];

    const symbol =
      ["💎", "7️⃣"][
        Math.floor(Math.random() * 2)
      ];

    for (let column = 0; column < COLUMNS; column += 1) {
      grid[column][payline[column]] = symbol;
    }
  }

  return grid;
}
const SYMBOL_PAYS = {
  "🍒": { 3: 2, 4: 5, 5: 12 },
  "🍋": { 3: 2, 4: 5, 5: 12 },
  "🔔": { 3: 2, 4: 6, 5: 14 },
  "⭐": { 3: 3, 4: 7, 5: 16 },
  "🍉": { 3: 3, 4: 8, 5: 18 },
  "💎": { 3: 4, 4: 10, 5: 22 },
  "7️⃣": { 3: 5, 4: 12, 5: 28 },
  "👑": { 3: 6, 4: 18, 5: 0 }, // las 5 coronas pagan el jackpot
  [WILD]: { 3: 5, 4: 12, 5: 25 },
};
const PAYLINES = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
];

const STARTING_JACKPOT = 5000;
const DEFAULT_STATS = { spins: 0, totalBet: 0, totalWon: 0, biggestWin: 0, jackpots: 0, freeSpinsWon: 0 };
const spinningSymbols = Array.from(
  { length: 60 },
  (_, index) => symbols[index % symbols.length]
);

function Reel({
  values,
  spinning,
  delay,
  columnIndex,
  winningCells,
  scatterCells,
}) {
  return (
    <div className="reel-window">
      {spinning ? (
        <div
          className="reel-strip spinning"
          style={{
            animationDelay: `${delay}ms`,
          }}
        >
          {spinningSymbols.map((symbol, index) => (
            <div className="reel-symbol" key={index}>
              {symbol}
            </div>
          ))}
        </div>
      ) : (
        <div className="stopped-reel">
          {values.map((symbol, rowIndex) => {
            const isWinner = winningCells.some(
              (cell) =>
                cell.column === columnIndex &&
                cell.row === rowIndex
            );

            const isScatterWinner = scatterCells.some(
              (cell) =>
                cell.column === columnIndex &&
                cell.row === rowIndex
            );

            return (
              <div
                className={[
                  "stopped-symbol",
                  isWinner ? "winning-symbol" : "",
                  isScatterWinner ? "scatter-winner" : "",
                  symbol === WILD ? "wild-symbol" : "",
                  symbol === SCATTER ? "scatter-symbol" : "",
                ].join(" ")}
                key={rowIndex}
              >
                {symbol}
              </div>
            );
          })}
        </div>
      )}

      <div className="reel-shadow reel-shadow-top" />
      <div className="reel-shadow reel-shadow-bottom" />
    </div>
  );
}

export default function Game({ player, onCreditsChange, onLogout, onOpenAdmin }) {
  const [showIntro, setShowIntro] = useState(true);
  const [grid, setGrid] = useState(createGrid());

  const [reelSpinning, setReelSpinning] = useState(
    Array(COLUMNS).fill(false)
  );

  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("Presioná GIRAR");

  const [credits, setCredits] = useState(player?.credits ?? 0);
const [displayCredits, setDisplayCredits] = useState(
  player?.credits ?? 0
);

useEffect(() => {
  const start = displayCredits;
  const end = credits;

  if (start === end) return;

  const duration = 500;
  const startTime = performance.now();

  function animateCredits(currentTime) {
    const progress = Math.min(
      (currentTime - startTime) / duration,
      1
    );

    const animatedValue = Math.round(
      start + (end - start) * progress
    );

    setDisplayCredits(animatedValue);

    if (progress < 1) {
      requestAnimationFrame(animateCredits);
    }
  }

  requestAnimationFrame(animateCredits);
}, [credits]);
  const [betIndex, setBetIndex] = useState(1);

  const [freeSpins, setFreeSpins] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(true);

  const [lastPrize, setLastPrize] = useState(0);
  const [displayPrize, setDisplayPrize] = useState(0);
  const [jackpot, setJackpot] = useState(STARTING_JACKPOT);
  const [celebration, setCelebration] = useState(null);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [autoSpins, setAutoSpins] = useState(0);
  const [winningLines, setWinningLines] = useState([]);
  const [winningCells, setWinningCells] = useState([]);
  const [scatterCells, setScatterCells] = useState([]);

  const audioContextRef = useRef(null);
  const spinSoundRef = useRef(null);
  const spinActionRef = useRef(null);

  const bet = BET_OPTIONS[betIndex];

  useEffect(() => {
    if (lastPrize <= 0) {
      setDisplayPrize(0);
      return undefined;
    }

    const duration = Math.min(1800, Math.max(650, lastPrize * 2));
    const startedAt = performance.now();
    let frameId;

    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPrize(Math.round(lastPrize * eased));

      if (progress < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [lastPrize]);

  useEffect(() => {
    return () => {
      if (spinSoundRef.current) {
        clearInterval(spinSoundRef.current);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (
      autoSpins <= 0 ||
      spinning ||
      showIntro ||
      paytableOpen ||
      celebration
    ) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      spinActionRef.current?.();
    }, 850);

    return () => window.clearTimeout(timer);
  }, [autoSpins, spinning, showIntro, paytableOpen, celebration]);

  useEffect(() => {
    function handleKeyboard(event) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (isTyping) return;

      if (event.code === "Escape") {
        setPaytableOpen(false);
        setStatsOpen(false);
        setCelebration(null);
        setAutoSpins(0);
        return;
      }

      if (
        event.code === "Space" &&
        !showIntro &&
        !paytableOpen &&
        !celebration
      ) {
        event.preventDefault();
        spinActionRef.current?.();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [showIntro, paytableOpen, celebration]);

  async function getAudioContext() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        console.error("El navegador no admite AudioContext");
        return null;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      return audioContext;
    } catch (error) {
      console.error("No se pudo iniciar el audio:", error);
      return null;
    }
  }

  async function unlockAudio() {
    if (!soundEnabled) {
      return null;
    }

    const audioContext = await getAudioContext();

    if (!audioContext) {
      return null;
    }

    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();

    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);

    return audioContext;
  }

  async function playTone({
    frequency = 440,
    duration = 0.15,
    volume = 0.18,
    type = "sine",
    delay = 0,
    force = false,
  }) {
    if (!soundEnabled && !force) {
      return;
    }

    try {
      const audioContext = await getAudioContext();

      if (!audioContext) {
        return;
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      const startTime = audioContext.currentTime + delay;
      const endTime = startTime + duration;

      oscillator.type = type;

      oscillator.frequency.setValueAtTime(
        frequency,
        startTime
      );

      gain.gain.setValueAtTime(0.0001, startTime);

      gain.gain.exponentialRampToValueAtTime(
        volume,
        startTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        endTime
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    } catch (error) {
      console.error("Error de sonido:", error);
    }
  }

  async function playClickSound(frequency = 520) {
    await playTone({
      frequency,
      duration: 0.08,
      volume: 0.16,
      type: "square",
    });
  }

  function stopSpinSound() {
    if (spinSoundRef.current) {
      clearInterval(spinSoundRef.current);
      spinSoundRef.current = null;
    }
  }

  function startSpinSound() {
    if (!soundEnabled) {
      return;
    }

    stopSpinSound();

    let frequency = 130;

    spinSoundRef.current = setInterval(() => {
      playTone({
        frequency,
        duration: 0.06,
        volume: 0.07,
        type: "square",
      });

      frequency += 18;

      if (frequency > 330) {
        frequency = 130;
      }
    }, 85);
  }

  function playReelStopSound(reelIndex) {
    playTone({
      frequency: 260 + reelIndex * 90,
      duration: 0.16,
      volume: 0.22,
      type: "triangle",
    });
  }
function playCoinSound(amount = 3) {
  const coinNotes = [1200, 1450, 1700, 1350, 1850, 1550];

  for (let index = 0; index < amount; index += 1) {
    playTone({
      frequency: coinNotes[index % coinNotes.length],
      duration: 0.09,
      volume: 0.13,
      type: "triangle",
      delay: index * 0.08,
    });

    playTone({
      frequency: coinNotes[index % coinNotes.length] * 1.35,
      duration: 0.05,
      volume: 0.07,
      type: "square",
      delay: index * 0.08 + 0.02,
    });
  }
}
  function playWinSound(bigWin = false) {
    const notes = bigWin
      ? [440, 550, 660, 880, 1100, 1320]
      : [440, 550, 660, 880];

    notes.forEach((frequency, index) => {
      playTone({
        frequency,
        duration: 0.28,
        volume: 0.2,
        type: "sine",
        delay: index * 0.13,
      });
    });
  }

  function playScatterSound() {
    const notes = [330, 440, 550, 660, 880, 1100];

    notes.forEach((frequency, index) => {
      playTone({
        frequency,
        duration: 0.3,
        volume: 0.2,
        type: "triangle",
        delay: index * 0.14,
      });
    });
  }

  function playErrorSound() {
    playTone({
      frequency: 140,
      duration: 0.35,
      volume: 0.2,
      type: "sawtooth",
    });
  }

  function evaluateLine(result, payline, lineIndex) {
    const lineSymbols = payline.map(
      (rowIndex, columnIndex) =>
        result[columnIndex][rowIndex]
    );

    if (lineSymbols[0] === SCATTER) {
      return null;
    }

    const baseSymbol = lineSymbols.find(
      (symbol) => symbol !== WILD && symbol !== SCATTER
    );

    if (!baseSymbol) {
      return null;
    }

    let consecutive = 0;

    for (
      let index = 0;
      index < lineSymbols.length;
      index += 1
    ) {
      const currentSymbol = lineSymbols[index];

      if (
        currentSymbol === baseSymbol ||
        currentSymbol === WILD
      ) {
        consecutive += 1;
      } else {
        break;
      }
    }

    const paySymbol = lineSymbols[0] === WILD ? WILD : baseSymbol;
    const multiplier = SYMBOL_PAYS[paySymbol]?.[consecutive] ?? 0;

    if (multiplier === 0) {
      return null;
    }

    const cells = Array.from(
      { length: consecutive },
      (_, columnIndex) => ({
        column: columnIndex,
        row: payline[columnIndex],
      })
    );

    return {
      lineIndex,
      consecutive,
      symbol: paySymbol,
      amount: bet * multiplier,
      cells,
    };
  }

  function evaluateScatters(result) {
    const cells = [];

    result.forEach((column, columnIndex) => {
      column.forEach((symbol, rowIndex) => {
        if (symbol === SCATTER) {
          cells.push({
            column: columnIndex,
            row: rowIndex,
          });
        }
      });
    });

    if (cells.length >= 5) {
      return {
        count: cells.length,
        amount: bet * 15,
        freeSpins: 12,
        cells,
      };
    }

    if (cells.length === 4) {
      return {
        count: 4,
        amount: bet * 7,
        freeSpins: 8,
        cells,
      };
    }

    if (cells.length === 3) {
      return {
        count: 3,
        amount: bet * 3,
        freeSpins: 5,
        cells,
      };
    }

    return {
      count: cells.length,
      amount: 0,
      freeSpins: 0,
      cells: [],
    };
  }

  function calculatePrize(result) {
    const lineWins = PAYLINES.map(
      (payline, lineIndex) =>
        evaluateLine(result, payline, lineIndex)
    ).filter(Boolean);

    const scatterWin = evaluateScatters(result);

    const jackpotLine = lineWins.find(
      (win) =>
        win.symbol === "👑" &&
        win.consecutive === 5
    );

    const jackpotPrize = jackpotLine ? jackpot : 0;

    const linePrize = lineWins.reduce(
      (total, win) => total + win.amount,
      0
    );

    const totalPrize =
      linePrize + scatterWin.amount + jackpotPrize;

    const cells = lineWins.flatMap(
      (win) => win.cells
    );

    let resultMessage =
      "Sin premio. Probá otra vez.";

    if (jackpotPrize > 0) {
      resultMessage =
        `👑 ¡JACKPOT! ${totalPrize} CRÉDITOS`;
    } else if (
      lineWins.length > 0 &&
      scatterWin.freeSpins > 0
    ) {
      resultMessage =
        `🎉 PREMIO ${totalPrize} + ` +
        `${scatterWin.freeSpins} GIROS GRATIS`;
    } else if (scatterWin.freeSpins > 0) {
      resultMessage =
        `🎁 ${scatterWin.count} SCATTER · ` +
        `${scatterWin.freeSpins} GIROS GRATIS`;
    } else if (lineWins.length === 1) {
      resultMessage =
        `🏆 ¡GANASTE ${totalPrize} CRÉDITOS!`;
    } else if (lineWins.length > 1) {
      resultMessage =
        `🎉 ${lineWins.length} LÍNEAS GANADORAS · ` +
        `PREMIO ${totalPrize}`;
    }

    return {
      amount: totalPrize,
      message: resultMessage,
      lines: lineWins.map(
        (win) => win.lineIndex
      ),
      cells,
      scatterCells: scatterWin.cells,
      freeSpinsWon: scatterWin.freeSpins,
      jackpotWon: jackpotPrize > 0,
    };
  }

  async function increaseBet() {
    if (spinning || freeSpins > 0) {
      return;
    }

    await unlockAudio();
    await playClickSound(620);

    setBetIndex((current) =>
      current < BET_OPTIONS.length - 1
        ? current + 1
        : current
    );
  }

  async function decreaseBet() {
    if (spinning || freeSpins > 0) {
      return;
    }

    await unlockAudio();
    await playClickSound(420);

    setBetIndex((current) =>
      current > 0 ? current - 1 : current
    );
  }

  async function refreshCredits() {
    const { data, error } = await supabase
      .from("players")
      .select("credits")
      .eq("id", player.id)
      .single();

    if (!error && data) {
      setCredits(data.credits);
      onCreditsChange?.(data.credits);
    }
  }

  async function toggleSound() {
    if (soundEnabled) {
      stopSpinSound();
      setSoundEnabled(false);
      setMessage("🔇 Sonido apagado");
      return;
    }

    setSoundEnabled(true);

    const audioContext = await getAudioContext();

    if (audioContext) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 700;

      gain.gain.value = 0.2;

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.18);
    }

    setMessage("🔊 Sonido encendido");
  }

  async function toggleFullscreen() {
    await unlockAudio();

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setMessage("⛶ Pantalla completa activada");
      } else {
        await document.exitFullscreen();
        setMessage("Pantalla completa cerrada");
      }
    } catch {
      setMessage("El navegador no permitió pantalla completa");
    }
  }

  async function selectMaxBet() {
    if (spinning || freeSpins > 0) return;
    await unlockAudio();
    await playClickSound(760);
    setBetIndex(BET_OPTIONS.length - 1);
    setMessage("APUESTA MÁXIMA seleccionada");
  }

  async function toggleAutoSpins() {
    await unlockAudio();

    if (autoSpins > 0) {
      setAutoSpins(0);
      setMessage("⏹ Giro automático detenido");
      await playClickSound(320);
      return;
    }

    if (spinning) return;

    setAutoSpins(10);
    setMessage("▶ 10 giros automáticos preparados");
    await playClickSound(680);
  }

  async function spin() {
    if (spinning) {
      return;
    }

    if (soundEnabled) {
      await unlockAudio();

      await playTone({
        frequency: 720,
        duration: 0.12,
        volume: 0.22,
        type: "square",
      });
    }

    const isFreeSpin = freeSpins > 0;

    if (!isFreeSpin && credits < bet) {
      setAutoSpins(0);
      setMessage(
        "❌ No tenés créditos suficientes"
      );

      playErrorSound();
      return;
    }

    if (autoSpins > 0) {
      setAutoSpins((current) => Math.max(0, current - 1));
    }

    setSpinning(true);
    setCelebration(null);
    setLastPrize(0);
    setWinningLines([]);
    setWinningCells([]);
    setScatterCells([]);

    if (isFreeSpin) {
      setFreeSpins((current) => current - 1);
      setMessage("🎁 Giro gratis...");
    } else {
      setCredits((current) => current - bet);
      setJackpot((current) =>
        current + Math.max(1, Math.round(bet * 0.05))
      );
      setMessage("Girando...");
    }

    setReelSpinning(
      Array(COLUMNS).fill(true)
    );

    startSpinSound();

    const finalResult = createGrid();

    for (
      let index = 0;
      index < COLUMNS;
      index += 1
    ) {
      const stopTime = 1400 + index * 600;

      setTimeout(async () => {
        setGrid((currentGrid) => {
          const updatedGrid =
            currentGrid.map((column) => [
              ...column,
            ]);

          updatedGrid[index] =
            finalResult[index];

          return updatedGrid;
        });

        setReelSpinning((current) => {
          const updated = [...current];
          updated[index] = false;
          return updated;
        });

        playReelStopSound(index);

        if (index === COLUMNS - 1) {
          stopSpinSound();

          const prize =
            calculatePrize(finalResult);

          setGrid(finalResult);
          setMessage(prize.message);
          setLastPrize(prize.amount);
          setWinningLines(prize.lines);
          setWinningCells(prize.cells);
          setScatterCells(
            prize.scatterCells
          );
          setStats((current) => ({
            spins: current.spins + 1,
            totalBet: current.totalBet + (isFreeSpin ? 0 : bet),
            totalWon: current.totalWon + prize.amount,
            biggestWin: Math.max(current.biggestWin, prize.amount),
            jackpots: current.jackpots + (prize.jackpotWon ? 1 : 0),
            freeSpinsWon: current.freeSpinsWon + prize.freeSpinsWon,
          }));

          if (prize.amount > 0) {
            setCredits(
              (current) =>
                current + prize.amount
            );
          }

          if (prize.jackpotWon) {
            setCelebration({
              type: "jackpot",
              amount: prize.amount,
            });
            setJackpot(STARTING_JACKPOT);
            playScatterSound();
          } else if (prize.freeSpinsWon > 0) {
            setFreeSpins(
              (current) =>
                current +
                prize.freeSpinsWon
            );
            setCelebration(null);
playCoinSound(4);
            
          } else if (prize.amount > 0) {
           const winRatio = prize.amount / bet;

if (winRatio < 8) {
  playCoinSound(winRatio <= 3 ? 3 : 6);
} else {
  setCelebration({
    type: winRatio >= 20 ? "mega" : "big",
    amount: prize.amount,
  });

  playWinSound(winRatio >= 20);
}
          }
          const { data: resultData, error: resultError } = await supabase.rpc(
            "apply_game_result",
            {
              p_bet: bet,
              p_win: prize.amount,
              p_is_free_spin: isFreeSpin,
            }
          );

          if (resultError) {
            console.error(resultError);
            setMessage("⚠️ No se pudo guardar la jugada. Actualizando saldo...");
            await refreshCredits();
            setAutoSpins(0);
          } else if (resultData?.length) {
            const onlineCredits = resultData[0].credits_after;
            setCredits(onlineCredits);
            onCreditsChange?.(onlineCredits);
          }

          setSpinning(false);
        }
      }, stopTime);
    }
  }

  useEffect(() => {
    spinActionRef.current = spin;
  });

  async function startGame() {
    if (soundEnabled) {
      await unlockAudio();
      await playTone({
        frequency: 660,
        duration: 0.12,
        volume: 0.18,
        type: "sine",
      });
      await playTone({
        frequency: 880,
        duration: 0.18,
        volume: 0.2,
        type: "sine",
        delay: 0.1,
      });
    }

    setShowIntro(false);
  }

  return (
    <main className="page">
      {showIntro && (
        <section className="intro-screen">
          <div className="intro-stars" aria-hidden="true">
            {Array.from({ length: 30 }).map((_, index) => (
              <span
                key={index}
                style={{
                  "--star-left": `${(index * 41) % 100}%`,
                  "--star-top": `${(index * 67) % 100}%`,
                  "--star-delay": `${(index % 8) * 0.18}s`,
                }}
              >
                ✦
              </span>
            ))}
          </div>

          <div className="intro-card">
            <div className="intro-crown">👑</div>
            <p className="intro-kicker">JACKPOT PALACE PRESENTA</p>
            <h1 className="intro-title">GOLD PALACE</h1>
            <p className="intro-year"></p>
            <p className="intro-description">
              WILD · SCATTER · JACKPOT · GIROS GRATIS
            </p>

            <button className="intro-play-button" onClick={startGame}>
              🎰 JUGAR
            </button>

            <small className="intro-help">
              Tocá JUGAR para activar el sonido y entrar al casino
            </small>
          </div>
        </section>
      )}
      <section
        className={[
          "machine",
          spinning ? "machine-spinning" : "",
          celebration ? "machine-winning" : "",
        ].join(" ")}
      >
        <div className="lights">
          {Array.from({
            length: 16,
          }).map((_, index) => (
            <span
              className="light"
              key={index}
            />
          ))}
        </div>

        <div className="top-actions">
          <button
            className="round-action-button"
            onClick={() => setPaytableOpen(true)}
            title="Ver tabla de pagos"
          >
            📋
          </button>
          <button className="round-action-button" onClick={() => setStatsOpen(true)} title="Estadísticas">📊</button>
          <button
            className="round-action-button"
            onClick={toggleFullscreen}
            title="Pantalla completa"
          >
            ⛶
          </button>
          <button
            className="round-action-button"
            onClick={toggleSound}
            title={soundEnabled ? "Apagar sonido" : "Encender sonido"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>

        <h1 className="title">
         👑 JACKPOT PALACE
        </h1>

        <p className="subtitle">
          WILD · SCATTER · GIROS GRATIS
        </p>

        <div className="jackpot-panel">
          <span>JACKPOT PROGRESIVO</span>
          <strong>{jackpot.toLocaleString("es-AR")}</strong>
          <small>5 coronas en línea</small>
        </div>

        <div className="information-panel">
          <div className="information-box">
            <span className="information-label">
              CRÉDITOS
            </span>

            <strong className="information-value">
              {displayCredits}
            </strong>
          </div>

          <div className="information-box">
            <span className="information-label">
              APUESTA
            </span>

            <strong className="information-value">
              {bet}
            </strong>
          </div>

          <div className="information-box">
            <span className="information-label">
              PREMIO
            </span>

            <strong className={`information-value prize-counter ${lastPrize > 0 ? "prize-active" : ""}`}>
              {displayPrize.toLocaleString("es-AR")}
            </strong>
          </div>

          <div className="information-box free-spin-box">
            <span className="information-label">
              GIROS GRATIS
            </span>

            <strong className="information-value">
              {freeSpins}
            </strong>
          </div>
        </div>

        <div className="special-symbols">
          <span>
            {WILD} WILD reemplaza símbolos
          </span>

          <span>
            {SCATTER} 3 o más dan giros gratis
          </span>
        </div>

        <div className="line-indicators">
          {PAYLINES.map((_, index) => (
            <div
              className={`line-indicator ${
                winningLines.includes(index)
                  ? "active-line"
                  : ""
              }`}
              key={index}
            >
              LÍNEA {index + 1}
            </div>
          ))}
        </div>

        <div className={`reels-frame ${spinning ? "reels-live" : ""} ${winningCells.length ? "reels-win" : ""}`}>
          <div className="glass-reflection" aria-hidden="true" />
          <svg
            className={`payline-overlay ${winningLines.length ? "show-paylines" : ""}`}
            viewBox="0 0 500 300"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {PAYLINES.map((payline, lineIndex) => {
              const points = payline
                .map((rowIndex, columnIndex) =>
                  `${50 + columnIndex * 100},${50 + rowIndex * 100}`
                )
                .join(" ");

              return (
                <polyline
                  key={lineIndex}
                  className={`payline payline-${lineIndex + 1} ${
                    winningLines.includes(lineIndex) ? "payline-active" : ""
                  }`}
                  points={points}
                />
              );
            })}
          </svg>
          <div className="reels-container">
            {grid.map(
              (column, index) => (
                <Reel
                  key={index}
                  values={column}
                  spinning={
                    reelSpinning[index]
                  }
                  delay={index * -180}
                  columnIndex={index}
                  winningCells={
                    winningCells
                  }
                  scatterCells={
                    scatterCells
                  }
                />
              )
            )}
          </div>
        </div>

        <div className={`message ${lastPrize > 0 ? "message-win" : ""}`}>
          {credits <= 0 ? "SIN CRÉDITOS — Contacte al administrador." : message}
        </div>

        <div className="controls">
          <button
            className="small-button"
            onClick={decreaseBet}
            disabled={
              spinning ||
              freeSpins > 0 ||
              betIndex === 0
            }
          >
            −
          </button>

          <button
            className={`spin-button ${
              freeSpins > 0
                ? "free-spin-button"
                : ""
            }`}
            onClick={spin}
            disabled={spinning || (!freeSpins && credits < bet)}
          >
            {spinning
              ? "GIRANDO..."
              : freeSpins > 0
              ? "GIRO GRATIS"
              : "GIRAR"}
          </button>

          <button
            className="small-button"
            onClick={increaseBet}
            disabled={
              spinning ||
              freeSpins > 0 ||
              betIndex ===
                BET_OPTIONS.length - 1
            }
          >
            +
          </button>
          <button
            className="max-bet-button"
            onClick={selectMaxBet}
            disabled={spinning || freeSpins > 0}
          >
            MAX
          </button>

          <button
            className={`auto-spin-button ${autoSpins > 0 ? "auto-active" : ""}`}
            onClick={toggleAutoSpins}
            disabled={showIntro}
            title="Iniciar o detener 10 giros automáticos"
          >
            {autoSpins > 0 ? `STOP ${autoSpins}` : "AUTO ×10"}
          </button>
        </div>

        <div className="bottom-buttons account-actions">
          {player?.is_admin && (
            <button className="reset-button admin-button" onClick={onOpenAdmin} disabled={spinning}>
              👑 ADMIN
            </button>
          )}
          <button className="reset-button logout-button" onClick={onLogout} disabled={spinning}>
            CERRAR SESIÓN
          </button>

          <div className="saved-message">
            👤 {player?.display_name || player?.username} · Créditos online
          </div>
        </div>

        {paytableOpen && (
          <button
            className="paytable-overlay"
            onClick={() => setPaytableOpen(false)}
            aria-label="Cerrar tabla de pagos"
          >
            <div className="paytable-card" onClick={(event) => event.stopPropagation()}>
              <button className="paytable-close" onClick={() => setPaytableOpen(false)}>×</button>
              <h2>TABLA DE PAGOS</h2>
              <p>Los premios se multiplican por la apuesta elegida.</p>
              <div className="paytable-grid">
                {symbols.filter((symbol) => symbol !== SCATTER).map((symbol) => (
                  <div className="paytable-row" key={symbol}>
                    <strong>{symbol}</strong>
                    <span>3 = ×{SYMBOL_PAYS[symbol]?.[2] ?? 0}</span>
                    <span>4 = ×{SYMBOL_PAYS[symbol]?.[3] ?? 0}</span>
                    <span>5 = ×{SYMBOL_PAYS[symbol]?.[4] ?? 0}</span>
                  </div>
                ))}
                <div className="paytable-row scatter-pay">
                  <strong>{SCATTER}</strong>
                  <span>3 = ×3 + 5 gratis</span>
                  <span>4 = ×7 + 8 gratis</span>
                  <span>5+ = ×15 + 12 gratis</span>
                </div>
              </div>
              <small>👑 Cinco coronas en línea entregan el jackpot progresivo.</small>
            </div>
          </button>
        )}

        {statsOpen && (
          <button className="paytable-overlay" onClick={() => setStatsOpen(false)} aria-label="Cerrar estadísticas">
            <div className="paytable-card stats-card" onClick={(event) => event.stopPropagation()}>
              <button className="paytable-close" onClick={() => setStatsOpen(false)}>×</button>
              <h2>ESTADÍSTICAS</h2>
              <div className="stats-grid">
                <div><span>Giros</span><strong>{stats.spins.toLocaleString("es-AR")}</strong></div>
                <div><span>Total apostado</span><strong>{stats.totalBet.toLocaleString("es-AR")}</strong></div>
                <div><span>Total ganado</span><strong>{stats.totalWon.toLocaleString("es-AR")}</strong></div>
                <div><span>Mayor premio</span><strong>{stats.biggestWin.toLocaleString("es-AR")}</strong></div>
                <div><span>Giros gratis ganados</span><strong>{stats.freeSpinsWon.toLocaleString("es-AR")}</strong></div>
                <div><span>Jackpots</span><strong>{stats.jackpots}</strong></div>
              </div>
              <small>RTP personal: {stats.totalBet > 0 ? ((stats.totalWon / stats.totalBet) * 100).toFixed(1) : "0.0"}%</small>
            </div>
          </button>
        )}

        {celebration && (
          <button
            className={`celebration celebration-${celebration.type}`}
            onClick={() => setCelebration(null)}
            aria-label="Cerrar celebración"
          >
            <div className="coin-rain" aria-hidden="true">
              {Array.from({ length: 45 }).map((_, index) => (
               <span
  key={index}
  style={{
    "--coin-index": index,
    "--coin-delay": `${(index % 9) * 0.11}s`,
    "--coin-left": `${(index * 37) % 100}%`,
  }}
>
  <img src={coin} className="coin-img" alt="" />
</span>
              ))}
            </div>
            <div className="celebration-card">
              <span className="celebration-kicker">
                {celebration.type === "jackpot"
                  ? "👑 PREMIO MÁXIMO 👑"
                  : celebration.type === "bonus"
                  ? "🎁 BONUS ACTIVADO"
                  : celebration.type === "mega"
                  ? "MEGA WIN"
                  : celebration.type === "big"
                  ? "BIG WIN"
                  : "¡GANASTE!"}
              </span>
              <strong>{celebration.amount.toLocaleString("es-AR")}</strong>
              <small>CRÉDITOS · TOCÁ PARA CONTINUAR</small>
            </div>
          </button>
        )}
      </section>

      
    </main>
  );
}