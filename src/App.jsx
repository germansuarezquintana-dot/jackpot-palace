import { useEffect, useRef, useState } from "react";

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

        <button
          className="sound-button"
          onClick={toggleSound}
          title={
            soundEnabled
              ? "Apagar sonido"
              : "Encender sonido"
          }
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>

        <h1 className="title">
          RETRO SPIN
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

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-width: 320px;
          min-height: 100vh;
          background: #050007;
        }

        button {
          font-family: inherit;
        }

        .page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 18px;
          font-family: Arial, Helvetica, sans-serif;
          background:
            radial-gradient(
              circle at top,
              #700092 0%,
              #270034 42%,
              #050007 100%
            );
        }

        .machine {
          position: relative;
          width: 100%;
          max-width: 900px;
          padding: 45px 24px 32px;
          overflow: hidden;
          text-align: center;
          border: 8px solid #f5c542;
          border-radius: 30px;
          background:
            linear-gradient(
              145deg,
              #981717 0%,
              #4a0505 45%,
              #210000 100%
            );
          box-shadow:
            0 0 18px #ffd000,
            0 0 55px rgba(255, 0, 0, 0.7),
            inset 0 0 35px rgba(0, 0, 0, 0.9);
        }

        .lights {
          position: absolute;
          top: 11px;
          left: 20px;
          right: 20px;
          display: flex;
          justify-content: space-around;
        }

        .light {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff7a5;
          box-shadow:
            0 0 8px #ffffff,
            0 0 15px #ffd000;
          animation:
            blink 0.7s alternate infinite;
        }

        .light:nth-child(even) {
          animation-delay: 0.35s;
        }

        .machine-spinning .light {
          animation-duration: 0.18s;
        }

        .machine-winning {
          animation: cabinetWin 0.55s ease-in-out infinite alternate;
        }

        .machine-winning .light {
          animation-duration: 0.12s;
          background: #ffffff;
        }

        .sound-button {
          position: absolute;
          z-index: 10;
          top: 27px;
          right: 20px;
          width: 48px;
          height: 48px;
          border: 2px solid #ffe66d;
          border-radius: 50%;
          font-size: 23px;
          cursor: pointer;
          background: #260000;
          box-shadow:
            0 0 12px rgba(
              255,
              204,
              0,
              0.7
            );
        }

        .title {
          margin: 2px 0 0;
          color: #ffe66d;
          font-size: clamp(
            38px,
            7vw,
            66px
          );
          line-height: 1;
          letter-spacing: 2px;
          text-shadow:
            4px 4px 0 #8f0000,
            0 0 10px #ffcc00,
            0 0 22px #ff8a00;
        }

        .subtitle {
          margin: 11px 0 18px;
          color: #ffffff;
          font-size: clamp(
            12px,
            2.5vw,
            18px
          );
          font-weight: bold;
          letter-spacing: 4px;
          text-shadow:
            0 0 9px #ff0000;
        }

        .jackpot-panel {
          width: min(420px, 90%);
          margin: 0 auto 14px;
          padding: 8px 18px 10px;
          border: 2px solid #ffe66d;
          border-radius: 16px;
          background: linear-gradient(180deg, #2b001f, #080008);
          box-shadow: inset 0 0 16px #000000, 0 0 18px rgba(255, 0, 220, 0.55);
        }

        .jackpot-panel span,
        .jackpot-panel small {
          display: block;
          color: #fff4a8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .jackpot-panel strong {
          display: block;
          margin: 2px 0;
          color: #ffffff;
          font-size: clamp(26px, 5vw, 42px);
          line-height: 1;
          text-shadow: 0 0 8px #ff00d4, 0 0 18px #ff00d4;
          animation: jackpotGlow 1.2s ease-in-out infinite alternate;
        }

        .information-panel {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 10px;
        }

        .information-box {
          padding: 9px 5px;
          border: 2px solid #ffcf31;
          border-radius: 10px;
          background: #170000;
          box-shadow:
            inset 0 0 10px #000000;
        }

        .free-spin-box {
          border-color: #00f5ff;
          box-shadow:
            inset 0 0 10px #000000,
            0 0 10px
              rgba(0, 245, 255, 0.5);
        }

        .information-label {
          display: block;
          margin-bottom: 5px;
          color: #ffdf6d;
          font-size: 11px;
          font-weight: bold;
        }

        .information-value {
          color: #ffffff;
          font-size: clamp(
            19px,
            4vw,
            28px
          );
          text-shadow:
            0 0 8px #ff0000;
        }

        .special-symbols {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px 18px;
          margin-bottom: 10px;
          color: #ffffff;
          font-size: 12px;
          font-weight: bold;
        }

        .line-indicators {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .line-indicator {
          padding: 5px 9px;
          border: 1px solid #ffcf31;
          border-radius: 12px;
          color: #dddddd;
          font-size: 11px;
          font-weight: bold;
          background: #220000;
        }

        .active-line {
          color: #111111;
          background: #ffe66d;
          box-shadow:
            0 0 8px #ffffff,
            0 0 18px #ffcc00;
          animation:
            winningFlash
            0.45s alternate infinite;
        }

        .reels-frame {
          margin-bottom: 23px;
          padding: 13px;
          border: 5px solid #ffcf31;
          border-radius: 20px;
          background:
            linear-gradient(
              145deg,
              #4d4d4d,
              #121212
            );
          box-shadow:
            inset 0 0 15px #000000,
            0 0 16px
              rgba(255, 204, 0, 0.6);
        }

        .reels-container {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          overflow: hidden;
          border-radius: 13px;
          background: #130000;
        }

        .reel-window {
          position: relative;
          flex: 1;
          min-width: 0;
          height: 285px;
          overflow: hidden;
          border: 4px solid #303030;
          border-radius: 12px;
          background:
            linear-gradient(
              to bottom,
              #bdbdbd 0%,
              #ffffff 28%,
              #ffffff 72%,
              #bdbdbd 100%
            );
          box-shadow:
            inset 0 0 20px
              rgba(0, 0, 0, 0.65),
            0 4px 7px
              rgba(0, 0, 0, 0.8);
        }

        .reel-strip {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
        }

        .reel-strip.spinning {
          animation:
            reelRoll 0.38s linear infinite;
          filter: blur(2.4px);
          will-change: transform;
        }

        .reel-symbol,
        .stopped-symbol {
          height: 95px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: clamp(
            38px,
            6vw,
            68px
          );
          user-select: none;
        }

        .stopped-reel {
          position: absolute;
          inset: 0;
          animation:
            stopBounce 0.24s ease-out;
        }

        .wild-symbol {
          text-shadow:
            0 0 8px #00ffff,
            0 0 18px #006eff;
        }

        .scatter-symbol {
          text-shadow:
            0 0 8px #ff00e6,
            0 0 18px #ff00e6;
        }

        .winning-symbol {
          position: relative;
          z-index: 5;
          border-radius: 14px;
          background:
            rgba(255, 215, 0, 0.45);
          box-shadow:
            inset 0 0 18px #ffffff,
            0 0 16px #ffcc00;
          animation:
            winnerPulse
            0.45s alternate infinite;
        }

        .scatter-winner {
          position: relative;
          z-index: 6;
          border-radius: 14px;
          background:
            rgba(255, 0, 230, 0.35);
          box-shadow:
            inset 0 0 18px #ffffff,
            0 0 22px #ff00e6;
          animation:
            scatterPulse
            0.35s alternate infinite;
        }

        .reel-shadow {
          position: absolute;
          z-index: 3;
          left: 0;
          width: 100%;
          height: 48px;
          pointer-events: none;
        }

        .reel-shadow-top {
          top: 0;
          background:
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.6),
              transparent
            );
        }

        .reel-shadow-bottom {
          bottom: 0;
          background:
            linear-gradient(
              to top,
              rgba(0, 0, 0, 0.6),
              transparent
            );
        }

        .message {
          min-height: 36px;
          margin-bottom: 20px;
          color: #ffffff;
          font-size: clamp(
            17px,
            3vw,
            24px
          );
          font-weight: bold;
          text-shadow:
            0 0 8px #ff0000,
            0 0 14px #ff0000;
        }

        .controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
        }

        .spin-button {
          width: min(270px, 60%);
          padding: 17px 20px;
          border: 4px solid #ffe66d;
          border-radius: 40px;
          color: #ffffff;
          font-size: clamp(
            20px,
            4vw,
            28px
          );
          font-weight: 900;
          letter-spacing: 2px;
          cursor: pointer;
          background:
            linear-gradient(
              to bottom,
              #ff4e4e,
              #c00000 55%,
              #780000
            );
          box-shadow:
            0 8px 0 #4c0000,
            0 0 22px
              rgba(255, 0, 0, 0.9);
        }

        .free-spin-button {
          border-color: #8fffff;
          background:
            linear-gradient(
              to bottom,
              #00cfdc,
              #007c99 55%,
              #003a4d
            );
          box-shadow:
            0 8px 0 #002c36,
            0 0 25px
              rgba(0, 245, 255, 0.9);
        }

        .small-button {
          width: 60px;
          height: 60px;
          border: 3px solid #ffe66d;
          border-radius: 50%;
          color: #ffffff;
          font-size: 35px;
          font-weight: bold;
          cursor: pointer;
          background:
            linear-gradient(
              #444444,
              #111111
            );
          box-shadow:
            0 5px 0 #000000;
        }

        .spin-button:not(:disabled):active,
        .small-button:not(:disabled):active {
          transform: translateY(5px);
          box-shadow: 0 3px 0 #4c0000;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .bottom-buttons {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 22px;
        }

        .reset-button {
          padding: 9px 18px;
          border: 2px solid #ffcf31;
          border-radius: 20px;
          color: #ffffff;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          background: #320000;
        }

        .saved-message {
          color: #c7ffc7;
          font-size: 12px;
          font-weight: bold;
        }

        .celebration {
          position: fixed;
          z-index: 100;
          inset: 0;
          width: 100%;
          border: 0;
          overflow: hidden;
          cursor: pointer;
          background: rgba(5, 0, 8, 0.78);
          backdrop-filter: blur(5px);
        }

        .celebration-card {
          position: absolute;
          z-index: 2;
          top: 50%;
          left: 50%;
          width: min(620px, 90vw);
          padding: 36px 20px;
          transform: translate(-50%, -50%);
          border: 5px solid #ffe66d;
          border-radius: 28px;
          background: radial-gradient(circle, #a60066, #350025 58%, #080008);
          box-shadow: 0 0 35px #ffcc00, 0 0 90px #ff00c8;
          animation: celebrationPop 0.55s cubic-bezier(.2,1.6,.4,1);
        }

        .celebration-kicker {
          display: block;
          color: #fff5a8;
          font-size: clamp(23px, 6vw, 58px);
          font-weight: 1000;
          letter-spacing: 2px;
          text-shadow: 0 4px 0 #7a002e, 0 0 22px #ffcc00;
        }

        .celebration-card strong {
          display: block;
          margin: 12px 0;
          color: #ffffff;
          font-size: clamp(52px, 14vw, 118px);
          line-height: 0.95;
          text-shadow: 0 0 12px #ffffff, 0 0 32px #ff00d4;
        }

        .celebration-card small {
          color: #ffffff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .celebration-jackpot .celebration-card {
          background: radial-gradient(circle, #7a4a00, #3a1200 58%, #080300);
          box-shadow: 0 0 40px #ffffff, 0 0 110px #ffd000;
        }

        .coin-rain span {
          position: absolute;
          z-index: 1;
          top: -15%;
          left: var(--coin-left);
          font-size: clamp(24px, 5vw, 48px);
          animation: coinFall 2.2s linear infinite;
          animation-delay: var(--coin-delay);
        }

        @keyframes reelRoll {
          0% {
            transform:
              translateY(-2850px)
              scaleY(1.03);
          }

          100% {
            transform:
              translateY(0)
              scaleY(1);
          }
        }

        @keyframes stopBounce {
          0% {
            transform:
              translateY(-34px)
              scaleY(1.05);
            filter: blur(4px);
          }

          55% {
            transform:
              translateY(10px)
              scaleY(0.98);
            filter: blur(1px);
          }

          78% {
            transform:
              translateY(-5px);
            filter: blur(0);
          }

          100% {
            transform:
              translateY(0)
              scaleY(1);
            filter: blur(0);
          }
        }

        @keyframes blink {
          from {
            opacity: 0.35;
            transform: scale(0.85);
          }

          to {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        @keyframes winnerPulse {
          from {
            transform: scale(0.92);
          }

          to {
            transform: scale(1.08);
          }
        }

        @keyframes scatterPulse {
          from {
            transform:
              scale(0.88)
              rotate(-4deg);
          }

          to {
            transform:
              scale(1.1)
              rotate(4deg);
          }
        }

        @keyframes winningFlash {
          from {
            opacity: 0.65;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes jackpotGlow {
          from { transform: scale(0.98); opacity: 0.82; }
          to { transform: scale(1.03); opacity: 1; }
        }

        @keyframes cabinetWin {
          from { box-shadow: 0 0 18px #ffd000, 0 0 55px rgba(255, 0, 0, 0.7), inset 0 0 35px rgba(0, 0, 0, 0.9); }
          to { box-shadow: 0 0 34px #ffffff, 0 0 90px rgba(255, 0, 225, 0.95), inset 0 0 35px rgba(255, 210, 0, 0.25); }
        }

        @keyframes celebrationPop {
          0% { transform: translate(-50%, -50%) scale(0.35) rotate(-7deg); opacity: 0; }
          75% { transform: translate(-50%, -50%) scale(1.06) rotate(1deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }

        @keyframes coinFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translateY(125vh) rotate(720deg); opacity: 1; }
        }

        @media (max-width: 650px) {
          .page {
            padding: 7px;
          }

          .machine {
            padding:
              42px 8px 25px;
            border-width: 5px;
          }

          .sound-button {
            top: 25px;
            right: 10px;
            width: 40px;
            height: 40px;
            font-size: 19px;
          }

          .information-panel {
            grid-template-columns:
              repeat(2, 1fr);
            gap: 4px;
          }

          .information-box {
            padding: 7px 3px;
          }

          .information-label {
            font-size: 9px;
          }

          .special-symbols {
            font-size: 10px;
          }

          .reels-frame {
            padding: 6px;
            border-width: 3px;
          }

          .reels-container {
            gap: 3px;
            padding: 4px;
          }

          .reel-window {
            height: 210px;
            border-width: 2px;
          }

          .reel-symbol,
          .stopped-symbol {
            height: 70px;
            font-size: clamp(
              29px,
              10vw,
              48px
            );
          }

          .controls {
            gap: 8px;
          }

          .small-button {
            width: 48px;
            height: 48px;
            font-size: 28px;
          }

          .spin-button {
            width: 58%;
            padding: 14px 6px;
            letter-spacing: 1px;
          }
        }
      `}</style>
    </main>
  );
}