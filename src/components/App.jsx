import logoJackpotPalace from "../assets/logo-jackpot-palace.png";
import { useEffect, useRef, useState } from "react";
import "./App.css";
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
const BET_OPTIONS = [10, 20, 50, 100];

const PAYLINES = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
];

const STORAGE_KEY = "retro-spin-game";
const STARTING_JACKPOT = 5000;

function randomSymbol() {
  const number = Math.random();

  if (number < 0.05) {
    return SCATTER;
  }

  if (number < 0.11) {
    return WILD;
  }

  const regularSymbols = symbols.filter(
    (symbol) => symbol !== WILD && symbol !== SCATTER
  );

  return regularSymbols[
    Math.floor(Math.random() * regularSymbols.length)
  ];
}

function createGrid() {
  return Array.from({ length: COLUMNS }, () =>
    Array.from({ length: ROWS }, () => randomSymbol())
  );
}

function loadSavedGame() {
  try {
    const savedGame = localStorage.getItem(STORAGE_KEY);

    if (!savedGame) {
      return null;
    }

    const parsedGame = JSON.parse(savedGame);

    return {
      credits:
        typeof parsedGame.credits === "number"
          ? parsedGame.credits
          : 1000,

      betIndex:
        typeof parsedGame.betIndex === "number"
          ? parsedGame.betIndex
          : 1,

      freeSpins:
        typeof parsedGame.freeSpins === "number"
          ? parsedGame.freeSpins
          : 0,

      soundEnabled:
        typeof parsedGame.soundEnabled === "boolean"
          ? parsedGame.soundEnabled
          : true,

      jackpot:
        typeof parsedGame.jackpot === "number"
          ? parsedGame.jackpot
          : STARTING_JACKPOT,
    };
  } catch {
    return null;
  }
}

const savedGame = loadSavedGame();

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

export default function App() {
  const [grid, setGrid] = useState(createGrid());

  const [reelSpinning, setReelSpinning] = useState(
    Array(COLUMNS).fill(false)
  );

  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("Presioná GIRAR");

  const [credits, setCredits] = useState(
    savedGame?.credits ?? 1000
  );

  const [betIndex, setBetIndex] = useState(
    savedGame?.betIndex ?? 1
  );

  const [freeSpins, setFreeSpins] = useState(
    savedGame?.freeSpins ?? 0
  );

  const [soundEnabled, setSoundEnabled] = useState(
    savedGame?.soundEnabled ?? true
  );

  const [lastPrize, setLastPrize] = useState(0);
  const [jackpot, setJackpot] = useState(
    savedGame?.jackpot ?? STARTING_JACKPOT
  );
  const [celebration, setCelebration] = useState(null);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [winningLines, setWinningLines] = useState([]);
  const [winningCells, setWinningCells] = useState([]);
  const [scatterCells, setScatterCells] = useState([]);

  const audioContextRef = useRef(null);
  const spinSoundRef = useRef(null);

  const bet = BET_OPTIONS[betIndex];

  useEffect(() => {
    const gameToSave = {
      credits,
      betIndex,
      freeSpins,
      soundEnabled,
      jackpot,
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(gameToSave)
    );
  }, [credits, betIndex, freeSpins, soundEnabled, jackpot]);

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

    let multiplier = 0;

    if (consecutive === 5) {
      multiplier = 25;
    } else if (consecutive === 4) {
      multiplier = 10;
    } else if (consecutive === 3) {
      multiplier = 4;
    }

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
      symbol: baseSymbol,
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
        amount: bet * 20,
        freeSpins: 15,
        cells,
      };
    }

    if (cells.length === 4) {
      return {
        count: 4,
        amount: bet * 10,
        freeSpins: 10,
        cells,
      };
    }

    if (cells.length === 3) {
      return {
        count: 3,
        amount: bet * 5,
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

  async function resetGame() {
    if (spinning) {
      return;
    }

    await unlockAudio();

    stopSpinSound();

    setCredits(1000);
    setBetIndex(1);
    setLastPrize(0);
    setFreeSpins(0);
    setJackpot(STARTING_JACKPOT);
    setCelebration(null);
    setWinningLines([]);
    setWinningCells([]);
    setScatterCells([]);
    setGrid(createGrid());
    setMessage("Partida reiniciada");

    localStorage.removeItem(STORAGE_KEY);

    await playTone({
      frequency: 440,
      duration: 0.14,
      volume: 0.18,
      type: "sine",
    });
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
      setMessage(
        "❌ No tenés créditos suficientes"
      );

      playErrorSound();
      return;
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
      const stopTime = 1300 + index * 450;

      setTimeout(() => {
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
            setCelebration({
              type: "bonus",
              amount: prize.amount,
            });
            playScatterSound();
          } else if (prize.amount > 0) {
            const winRatio = prize.amount / bet;
            setCelebration({
              type:
                winRatio >= 20
                  ? "mega"
                  : winRatio >= 8
                  ? "big"
                  : "win",
              amount: prize.amount,
            });
            playWinSound(winRatio >= 20);
          }

          setSpinning(false);
        }
      }, stopTime);
    }
  }

  return (
    <main className="page">
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

        <img
  src={logoJackpotPalace}
  alt="Jackpot Palace"
  className="main-logo"
/>

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
              {credits}
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

            <strong className="information-value">
              {lastPrize}
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

        <div className="reels-frame">
          <div className="reels-container">
            {grid.map(
              (column, index) => (
                <Reel
                  key={index}
                  values={column}
                  spinning={
                    reelSpinning[index]
                  }
                  delay={index * -75}
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

        <div className="message">
          {message}
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
            disabled={spinning}
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
        </div>

        <div className="bottom-buttons">
          <button
            className="reset-button"
            onClick={resetGame}
            disabled={spinning}
          >
            REINICIAR PARTIDA
          </button>

          <div className="saved-message">
            💾 Partida guardada
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
                    <span>3 = ×4</span>
                    <span>4 = ×10</span>
                    <span>5 = ×25</span>
                  </div>
                ))}
                <div className="paytable-row scatter-pay">
                  <strong>{SCATTER}</strong>
                  <span>3 = ×5 + 5 gratis</span>
                  <span>4 = ×10 + 10 gratis</span>
                  <span>5+ = ×20 + 15 gratis</span>
                </div>
              </div>
              <small>👑 Cinco coronas en línea entregan el jackpot progresivo.</small>
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
              {Array.from({ length: 28 }).map((_, index) => (
                <span
                  key={index}
                  style={{
                    "--coin-index": index,
                    "--coin-delay": `${(index % 9) * 0.11}s`,
                    "--coin-left": `${(index * 37) % 100}%`,
                  }}
                >
                  🪙
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