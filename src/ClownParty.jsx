import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import "./ClownParty.css";

const ROWS = 3;
const COLUMNS = 5;

const BET_OPTIONS = [100, 250, 500, 1000, 2500, 5000];

const WILD = "🤡";
const SCATTER = "🎪";

const SYMBOLS = [
  WILD,
  SCATTER,
  "🎈",
  "🍿",
  "🎁",
  "⭐",
  "🍭",
  "🎭",
];

const WEIGHTED_SYMBOLS = [
  "🎈",
  "🎈",
  "🎈",
  "🍿",
  "🍿",
  "🍿",
  "🍭",
  "🍭",
  "🍭",
  "🎭",
  "🎭",
  "⭐",
  "⭐",
  "🎁",
  SCATTER,
  WILD,
];

const SYMBOL_PAYS = {
  "🎈": { 3: 1, 4: 2, 5: 4 },
  "🍿": { 3: 1, 4: 3, 5: 5 },
  "🍭": { 3: 2, 4: 4, 5: 7 },
  "🎭": { 3: 2, 4: 5, 5: 9 },
  "⭐": { 3: 3, 4: 7, 5: 12 },
  "🎁": { 3: 4, 4: 10, 5: 18 },
  [WILD]: { 3: 5, 4: 15, 5: 30 },
};

const PAYLINES = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
];

function randomSymbol() {
  return WEIGHTED_SYMBOLS[
    Math.floor(Math.random() * WEIGHTED_SYMBOLS.length)
  ];
}

function createGrid() {
  return Array.from({ length: COLUMNS }, () =>
    Array.from({ length: ROWS }, randomSymbol)
  );
}

function countScatters(grid) {
  let total = 0;

  grid.forEach((column) => {
    column.forEach((symbol) => {
      if (symbol === SCATTER) total += 1;
    });
  });

  return total;
}

function getScatterCells(grid) {
  const cells = [];

  grid.forEach((column, columnIndex) => {
    column.forEach((symbol, rowIndex) => {
      if (symbol === SCATTER) {
        cells.push(`${columnIndex}-${rowIndex}`);
      }
    });
  });

  return cells;
}

function evaluateLine(grid, payline, bet) {
  const symbols = payline.map(
    (rowIndex, columnIndex) => grid[columnIndex][rowIndex]
  );

  let baseSymbol = symbols.find(
    (symbol) => symbol !== WILD && symbol !== SCATTER
  );

  if (!baseSymbol) {
    baseSymbol = WILD;
  }

  let matches = 0;

  for (const symbol of symbols) {
    if (symbol === baseSymbol || symbol === WILD) {
      matches += 1;
    } else {
      break;
    }
  }

  if (matches < 3) {
    return {
      amount: 0,
      matches: 0,
      symbol: baseSymbol,
    };
  }

  const multiplier =
    SYMBOL_PAYS[baseSymbol]?.[matches] ?? 0;

  return {
    amount: Math.round(bet * multiplier),
    matches,
    symbol: baseSymbol,
  };
}

function calculatePrize(grid, bet) {
  let linePrize = 0;
  const winningLines = [];
  const winningCells = [];

  PAYLINES.forEach((payline, lineIndex) => {
    const result = evaluateLine(grid, payline, bet);

    if (result.amount > 0) {
      linePrize += result.amount;
      winningLines.push(lineIndex);

      for (
        let columnIndex = 0;
        columnIndex < result.matches;
        columnIndex += 1
      ) {
        winningCells.push(
          `${columnIndex}-${payline[columnIndex]}`
        );
      }
    }
  });

  const scatterCount = countScatters(grid);

  let freeSpinsWon = 0;
  let bonusPrize = 0;

  if (scatterCount === 3) {
    freeSpinsWon = 5;
    bonusPrize = bet * 2;
  } else if (scatterCount === 4) {
    freeSpinsWon = 8;
    bonusPrize = bet * 5;
  } else if (scatterCount >= 5) {
    freeSpinsWon = 12;
    bonusPrize = bet * 10;
  }

  let surpriseMultiplier = 1;

  if (linePrize > 0) {
    const multiplierChance = Math.random();

    if (multiplierChance < 0.03) {
      surpriseMultiplier = 5;
    } else if (multiplierChance < 0.1) {
      surpriseMultiplier = 3;
    } else if (multiplierChance < 0.22) {
      surpriseMultiplier = 2;
    }
  }

  const multipliedLinePrize =
    linePrize * surpriseMultiplier;

  return {
    amount: multipliedLinePrize + bonusPrize,
    linePrize,
    bonusPrize,
    freeSpinsWon,
    scatterCount,
    surpriseMultiplier,
    winningLines,
    winningCells,
    scatterCells: getScatterCells(grid),
  };
}

export default function ClownParty({
  player,
  onCreditsChange,
  onBack,
  onLogout,
}) {
  const [grid, setGrid] = useState(createGrid());
  const [reelSpinning, setReelSpinning] = useState(
    Array(COLUMNS).fill(false)
  );

  const [spinning, setSpinning] = useState(false);
  const [credits, setCredits] = useState(
    player?.credits ?? 0
  );
  const [displayCredits, setDisplayCredits] = useState(
    player?.credits ?? 0
  );

  const [betIndex, setBetIndex] = useState(1);
  const [freeSpins, setFreeSpins] = useState(0);
  const [lastPrize, setLastPrize] = useState(0);
  const [message, setMessage] = useState(
    "¡Bienvenido a Clown Party!"
  );

  const [winningLines, setWinningLines] = useState([]);
  const [winningCells, setWinningCells] = useState([]);
  const [scatterCells, setScatterCells] = useState([]);
  const [celebration, setCelebration] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioContextRef = useRef(null);
  const spinLockRef = useRef(false);
  const timeoutsRef = useRef([]);
  const displayCreditsRef = useRef(player?.credits ?? 0);

  const bet = BET_OPTIONS[betIndex];

  useEffect(() => {
    setCredits(player?.credits ?? 0);
  }, [player?.credits]);

  useEffect(() => {
    const start = displayCreditsRef.current;
    const end = credits;

    if (start === end) return undefined;

    const difference = Math.abs(end - start);
    const duration = Math.min(
      1400,
      Math.max(350, difference * 0.6)
    );

    const startedAt = performance.now();
    let frameId;

    const animate = (now) => {
      const progress = Math.min(
        1,
        (now - startedAt) / duration
      );

      const eased = 1 - Math.pow(1 - progress, 3);

      const nextValue = Math.round(
        start + (end - start) * eased
      );

      displayCreditsRef.current = nextValue;
      setDisplayCredits(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [credits]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) =>
        clearTimeout(timeoutId)
      );

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  async function getAudioContext() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return null;

      if (!audioContextRef.current) {
        audioContextRef.current =
          new AudioContextClass();
      }

      if (
        audioContextRef.current.state === "suspended"
      ) {
        await audioContextRef.current.resume();
      }

      return audioContextRef.current;
    } catch (error) {
      console.error("Error de audio:", error);
      return null;
    }
  }

  async function playTone({
    frequency = 440,
    duration = 0.15,
    volume = 0.12,
    type = "sine",
    delay = 0,
  }) {
    if (!soundEnabled) return;

    const audioContext = await getAudioContext();

    if (!audioContext) return;

    const oscillator =
      audioContext.createOscillator();

    const gain = audioContext.createGain();

    const startTime =
      audioContext.currentTime + delay;

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
  }

  function playSpinSound() {
    [350, 420, 500].forEach(
      (frequency, index) => {
        playTone({
          frequency,
          duration: 0.1,
          volume: 0.1,
          type: "square",
          delay: index * 0.08,
        });
      }
    );
  }

  function playReelStopSound(index) {
    playTone({
      frequency: 450 + index * 90,
      duration: 0.12,
      volume: 0.13,
      type: "triangle",
    });
  }

  function playWinSound(bigWin = false) {
    const notes = bigWin
      ? [523, 659, 784, 1046, 1318]
      : [523, 659, 784];

    notes.forEach((frequency, index) => {
      playTone({
        frequency,
        duration: 0.25,
        volume: 0.15,
        type: "triangle",
        delay: index * 0.12,
      });
    });
  }

  function playBonusSound() {
    [300, 400, 500, 650, 850, 1100].forEach(
      (frequency, index) => {
        playTone({
          frequency,
          duration: 0.25,
          volume: 0.16,
          type: "square",
          delay: index * 0.11,
        });
      }
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

  function increaseBet() {
    if (spinning || freeSpins > 0) return;

    setBetIndex((current) =>
      Math.min(
        current + 1,
        BET_OPTIONS.length - 1
      )
    );

    playTone({
      frequency: 700,
      duration: 0.07,
      type: "square",
    });
  }

  function decreaseBet() {
    if (spinning || freeSpins > 0) return;

    setBetIndex((current) =>
      Math.max(current - 1, 0)
    );

    playTone({
      frequency: 450,
      duration: 0.07,
      type: "square",
    });
  }

  async function spin() {
    if (
      spinLockRef.current ||
      spinning ||
      celebration
    ) {
      return;
    }

    const isFreeSpin = freeSpins > 0;

    if (!isFreeSpin && credits < bet) {
      setMessage(
        "❌ No tenés créditos suficientes"
      );

      playTone({
        frequency: 150,
        duration: 0.3,
        type: "sawtooth",
      });

      return;
    }

    spinLockRef.current = true;
    setSpinning(true);
    setLastPrize(0);
    setWinningLines([]);
    setWinningCells([]);
    setScatterCells([]);
    setCelebration(null);

    if (isFreeSpin) {
      setFreeSpins((current) =>
        Math.max(0, current - 1)
      );

      setMessage("🎁 Giro gratis...");
    } else {
      setCredits((current) => current - bet);
      setMessage("Girando...");
    }

    setReelSpinning(Array(COLUMNS).fill(true));
    playSpinSound();

    const finalGrid = createGrid();

    for (
      let columnIndex = 0;
      columnIndex < COLUMNS;
      columnIndex += 1
    ) {
      const stopTime =
        800 + columnIndex * 260;

      const timeoutId = window.setTimeout(
        async () => {
          setGrid((currentGrid) => {
            const updatedGrid =
              currentGrid.map((column) => [
                ...column,
              ]);

            updatedGrid[columnIndex] =
              finalGrid[columnIndex];

            return updatedGrid;
          });

          setReelSpinning((current) => {
            const updated = [...current];
            updated[columnIndex] = false;
            return updated;
          });

          playReelStopSound(columnIndex);

          if (columnIndex === COLUMNS - 1) {
            const prize = calculatePrize(
              finalGrid,
              bet
            );

            setGrid(finalGrid);
            setLastPrize(prize.amount);
            setWinningLines(
              prize.winningLines
            );
            setWinningCells(
              prize.winningCells
            );
            setScatterCells(
              prize.scatterCells
            );

            if (prize.freeSpinsWon > 0) {
              setFreeSpins(
                (current) =>
                  current +
                  prize.freeSpinsWon
              );

              setCelebration({
                type: "bonus",
                amount: prize.amount,
                freeSpins:
                  prize.freeSpinsWon,
              });

              setMessage(
                `🎪 BONUS: ${prize.freeSpinsWon} GIROS GRATIS`
              );

              playBonusSound();
            } else if (prize.amount > 0) {
              if (
                prize.surpriseMultiplier > 1
              ) {
                setMessage(
                  `🤡 MULTIPLICADOR ×${prize.surpriseMultiplier} — GANASTE ${prize.amount}`
                );
              } else {
                setMessage(
                  `🎉 GANASTE ${prize.amount} CRÉDITOS`
                );
              }

              if (prize.amount >= bet * 10) {
                setCelebration({
                  type:
                    prize.amount >= bet * 25
                      ? "mega"
                      : "big",
                  amount: prize.amount,
                  multiplier:
                    prize.surpriseMultiplier,
                });
              }

              playWinSound(
                prize.amount >= bet * 10
              );
            } else {
              setMessage(
                freeSpins > 1
                  ? "🎁 Sigue el bonus"
                  : "¡Probá otro giro!"
              );
            }

            const {
              data: resultData,
              error: resultError,
            } = await supabase.rpc(
              "apply_game_result",
              {
                p_bet: bet,
                p_win: prize.amount,
                p_is_free_spin: isFreeSpin,
              }
            );

            if (resultError) {
              console.error(resultError);

              setMessage(
                "⚠️ No se pudo guardar la jugada. Actualizando saldo..."
              );

              await refreshCredits();
            } else if (resultData?.length) {
              const onlineCredits =
                resultData[0].credits_after;

              setCredits(onlineCredits);
              onCreditsChange?.(
                onlineCredits
              );
            }

            setSpinning(false);
            spinLockRef.current = false;
            timeoutsRef.current = [];
          }
        },
        stopTime
      );

      timeoutsRef.current.push(timeoutId);
    }
  }

  return (
    <main className="clown-page">
      <div className="clown-confetti" aria-hidden="true">
        {Array.from({ length: 35 }).map(
          (_, index) => (
            <span
              key={index}
              style={{
                "--confetti-left": `${
                  (index * 37) % 100
                }%`,
                "--confetti-delay": `${
                  (index % 10) * 0.25
                }s`,
                "--confetti-duration": `${
                  4 + (index % 5)
                }s`,
              }}
            >
              {index % 4 === 0
                ? "●"
                : index % 4 === 1
                ? "★"
                : index % 4 === 2
                ? "■"
                : "▲"}
            </span>
          )
        )}
      </div>

      <section
        className={`clown-machine ${
          celebration
            ? "clown-machine-winning"
            : ""
        }`}
      >
        <button
          type="button"
          className="clown-sound-button"
          onClick={() =>
            setSoundEnabled((current) => !current)
          }
          title={
            soundEnabled
              ? "Apagar sonido"
              : "Encender sonido"
          }
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>

        <header className="clown-header">
          <div className="clown-light">
            ⭐
          </div>

          <div>
            <p className="clown-kicker">
              JACKPOT PALACE PRESENTA
            </p>

            <h1>CLOWN PARTY</h1>

            <p className="clown-subtitle">
              PAYASOS · CIRCO · PREMIOS
              SORPRESA
            </p>
          </div>

          <div className="clown-light">
            ⭐
          </div>
        </header>

        <div className="clown-prize-panel">
          <div>
            <span>CRÉDITOS</span>
            <strong>
              {displayCredits.toLocaleString(
                "es-AR"
              )}
            </strong>
          </div>

          <div>
            <span>APUESTA</span>
            <strong>
              {bet.toLocaleString("es-AR")}
            </strong>
          </div>

          <div>
            <span>PREMIO</span>
            <strong>
              {lastPrize.toLocaleString(
                "es-AR"
              )}
            </strong>
          </div>

          <div>
            <span>GIROS GRATIS</span>
            <strong>{freeSpins}</strong>
          </div>
        </div>

        <div className="clown-paylines">
          {PAYLINES.map((_, index) => (
            <span
              key={index}
              className={
                winningLines.includes(index)
                  ? "clown-line-active"
                  : ""
              }
            >
              L{index + 1}
            </span>
          ))}
        </div>

        <div className="clown-reels">
          {grid.map(
            (column, columnIndex) => (
              <div
                className={`clown-reel ${
                  reelSpinning[columnIndex]
                    ? "clown-spinning"
                    : ""
                }`}
                key={columnIndex}
              >
                {column.map(
                  (symbol, rowIndex) => {
                    const cellId = `${columnIndex}-${rowIndex}`;

                    const isWinning =
                      winningCells.includes(
                        cellId
                      );

                    const isScatter =
                      scatterCells.includes(
                        cellId
                      );

                    return (
                      <div
                        className={[
                          "clown-symbol",
                          isWinning
                            ? "clown-winning-symbol"
                            : "",
                          isScatter
                            ? "clown-scatter-symbol"
                            : "",
                          symbol === WILD
                            ? "clown-wild-symbol"
                            : "",
                        ].join(" ")}
                        key={cellId}
                      >
                        {symbol}
                      </div>
                    );
                  }
                )}
              </div>
            )
          )}
        </div>

        <div
          className={`clown-message ${
            lastPrize > 0
              ? "clown-message-win"
              : ""
          }`}
        >
          {credits <= 0
            ? "SIN CRÉDITOS — Contacte al administrador."
            : message}
        </div>

        <div className="clown-controls">
          <button
            type="button"
            className="clown-small-button"
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
            type="button"
            className={`clown-spin-button ${
              freeSpins > 0
                ? "clown-free-spin-button"
                : ""
            }`}
            onClick={spin}
            disabled={
              spinning ||
              (!freeSpins && credits < bet)
            }
          >
            {spinning
              ? "GIRANDO..."
              : freeSpins > 0
              ? "GIRO GRATIS"
              : "GIRAR"}
          </button>

          <button
            type="button"
            className="clown-small-button"
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

        <div className="clown-bottom-actions">
          <button
            type="button"
            className="clown-back-button"
            onClick={onBack}
            disabled={spinning}
          >
            ← CASINO
          </button>

          <button
            type="button"
            className="clown-logout-button"
            onClick={onLogout}
            disabled={spinning}
          >
            CERRAR SESIÓN
          </button>
        </div>

        <div className="clown-help">
          <span>
            🤡 WILD reemplaza otros símbolos
          </span>

          <span>
            🎪 3 o más activan giros gratis
          </span>

          <span>
            🎉 Premios con multiplicadores
            sorpresa
          </span>
        </div>
      </section>

      {celebration && (
        <button
          type="button"
          className={`clown-celebration clown-celebration-${celebration.type}`}
          onClick={() =>
            setCelebration(null)
          }
          aria-label="Cerrar premio"
        >
          <div className="clown-celebration-card">
            <span>
              {celebration.type === "bonus"
                ? "🎪 BONUS DE CIRCO"
                : celebration.type === "mega"
                ? "🤡 MEGA PREMIO"
                : "🎉 GRAN PREMIO"}
            </span>

            <strong>
              {celebration.amount.toLocaleString(
                "es-AR"
              )}
            </strong>

            {celebration.freeSpins > 0 && (
              <p>
                +
                {celebration.freeSpins} GIROS
                GRATIS
              </p>
            )}

            {celebration.multiplier > 1 && (
              <p>
                MULTIPLICADOR ×
                {celebration.multiplier}
              </p>
            )}

            <small>
              TOCÁ PARA CONTINUAR
            </small>
          </div>
        </button>
      )}
    </main>
  );
}