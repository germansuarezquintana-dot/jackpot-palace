import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import "./ClownParty.css";
import ClownHeader from "./clown/ClownHeader";
import { CLOWN_CONFIG } from "./machines/clown/clownConfig.js";

const ROWS = CLOWN_CONFIG.ROWS;
const COLUMNS = CLOWN_CONFIG.COLUMNS;

const BET_OPTIONS = CLOWN_CONFIG.BET_OPTIONS;

const WILD = CLOWN_CONFIG.WILD;
const SCATTER = CLOWN_CONFIG.SCATTER;
const TICKET = CLOWN_CONFIG.TICKET;
const CAROUSEL = CLOWN_CONFIG.CAROUSEL;

const SYMBOLS = CLOWN_CONFIG.SYMBOLS;

const WEIGHTED_SYMBOLS = CLOWN_CONFIG.WEIGHTED_SYMBOLS;

const SYMBOL_PAYS = CLOWN_CONFIG.SYMBOL_PAYS;

const PAYLINES = CLOWN_CONFIG.PAYLINES;

function randomSymbol() {
  return WEIGHTED_SYMBOLS[
    Math.floor(Math.random() * WEIGHTED_SYMBOLS.length)
  ];
}

const NORMAL_WIN_CHANCE = 0.13;
const BONUS_CHANCE = 0.01;

function hasPayingLine(grid) {
  return PAYLINES.some((payline) => {
    const result = evaluateLine(grid, payline, 1);
    return result.amount > 0;
  });
}

function createLosingGrid() {
  const safeSymbols = [
    TICKET,
    CAROUSEL,
    "🎈",
    "🍿",
    "🍭",
    "🎭",
    "⭐",
    "🎁",
  ];

  for (let attempt = 0; attempt < 250; attempt += 1) {
    const candidate = Array.from(
      { length: COLUMNS },
      () =>
        Array.from(
          { length: ROWS },
          () =>
            safeSymbols[
              Math.floor(Math.random() * safeSymbols.length)
            ]
        )
    );

    if (
      !hasPayingLine(candidate) &&
      countScatters(candidate) < 3
    ) {
      return candidate;
    }
  }

  // Respaldo seguro por si no encuentra una combinación.
  return Array.from(
    { length: COLUMNS },
    (_, columnIndex) =>
      Array.from(
        { length: ROWS },
        (_, rowIndex) =>
          (columnIndex + rowIndex) % 2 === 0
            ? TICKET
            : CAROUSEL
      )
  );
}

function createSmallWinningGrid() {
  const grid = createLosingGrid();

  const payline =
    PAYLINES[
      Math.floor(Math.random() * PAYLINES.length)
    ];

  const smallSymbols = ["🎈", "🍿", "🍭"];

  const winningSymbol =
    smallSymbols[
      Math.floor(Math.random() * smallSymbols.length)
    ];

  // Premio de tres símbolos.
  for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
    grid[columnIndex][payline[columnIndex]] =
      winningSymbol;
  }

  // Bloquea el cuarto símbolo para que normalmente no forme 4 o 5.
  grid[3][payline[3]] =
    winningSymbol === "🎈" ? CAROUSEL : TICKET;

  return grid;
}

function createBonusGrid() {
  const grid = createLosingGrid();
  const usedRows = new Set();

  for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
    let rowIndex =
      Math.floor(Math.random() * ROWS);

    while (usedRows.has(`${columnIndex}-${rowIndex}`)) {
      rowIndex =
        Math.floor(Math.random() * ROWS);
    }

    usedRows.add(`${columnIndex}-${rowIndex}`);
    grid[columnIndex][rowIndex] = SCATTER;
  }

  return grid;
}

function createGrid() {
  const roll = Math.random();

  if (roll < BONUS_CHANCE) {
    return createBonusGrid();
  }

  if (roll < BONUS_CHANCE + NORMAL_WIN_CHANCE) {
    return createSmallWinningGrid();
  }

  return createLosingGrid();
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
    freeSpinsWon = 3;
    bonusPrize = bet * 0.5;
  } else if (scatterCount === 4) {
    freeSpinsWon = 5;
    bonusPrize = bet * 2;
  } else if (scatterCount >= 5) {
    freeSpinsWon = 8;
    bonusPrize = bet * 5;
  }

  let surpriseMultiplier = 1;

  if (linePrize > 0) {
    const multiplierChance = Math.random();

    if (multiplierChance < 0.01) {
      surpriseMultiplier = 4;
    } else if (multiplierChance < 0.04) {
      surpriseMultiplier = 3;
    } else if (multiplierChance < 0.12) {
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
  const [reelStopping, setReelStopping] = useState(
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
  const [winEffect, setWinEffect] = useState(null);
  const [animatedPrize, setAnimatedPrize] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioContextRef = useRef(null);
  const spinLockRef = useRef(false);
  const timeoutsRef = useRef([]);
  const spinTickerRef = useRef(null);
  const reelSpinningRef = useRef(Array(COLUMNS).fill(false));
  const displayCreditsRef = useRef(player?.credits ?? 0);

  const bet = BET_OPTIONS[betIndex];

  const lightMode = celebration
    ? celebration.type === "mega"
      ? "mega"
      : celebration.type === "bonus"
      ? "bonus"
      : "win"
    : spinning
    ? reelStopping.some(Boolean)
      ? "stop"
      : "spin"
    : lastPrize > 0
    ? "win"
    : "idle";

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
    if (!winEffect?.amount) {
      setAnimatedPrize(0);
      return undefined;
    }

    const target = winEffect.amount;
    const duration =
      winEffect.level === "mega"
        ? 2600
        : winEffect.level === "big"
        ? 2100
        : winEffect.level === "medium"
        ? 1500
        : 950;

    const startedAt = performance.now();
    let frameId;

    const animatePrize = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setAnimatedPrize(Math.round(target * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(animatePrize);
      }
    };

    setAnimatedPrize(0);
    frameId = requestAnimationFrame(animatePrize);

    return () => cancelAnimationFrame(frameId);
  }, [winEffect]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) =>
        clearTimeout(timeoutId)
      );

      if (spinTickerRef.current) {
        clearInterval(spinTickerRef.current);
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
    setWinEffect(null);
    setAnimatedPrize(0);

    if (isFreeSpin) {
      setFreeSpins((current) =>
        Math.max(0, current - 1)
      );

      setMessage("🎁 Giro gratis...");
    } else {
      setCredits((current) => current - bet);
      setMessage("Girando...");
    }

    const allReelsSpinning = Array(COLUMNS).fill(true);

    reelSpinningRef.current = allReelsSpinning;
    setReelSpinning(allReelsSpinning);
    setReelStopping(Array(COLUMNS).fill(false));

    if (spinTickerRef.current) {
      clearInterval(spinTickerRef.current);
    }

    let activeColumn = 0;

spinTickerRef.current = window.setInterval(() => {
  setGrid((currentGrid) => {
    const updatedGrid = currentGrid.map((column) => [...column]);

    for (let attempt = 0; attempt < COLUMNS; attempt += 1) {
      const columnIndex = (activeColumn + attempt) % COLUMNS;

      if (reelSpinningRef.current[columnIndex]) {
        const currentColumn = updatedGrid[columnIndex];

        updatedGrid[columnIndex] = [
          randomSymbol(),
          ...currentColumn.slice(0, ROWS - 1),
        ];

        activeColumn = (columnIndex + 1) % COLUMNS;
        break;
      }
    }

    return updatedGrid;
  });
}, 52);
    playSpinSound();

    const finalGrid = createGrid();

    for (
      let columnIndex = 0;
      columnIndex < COLUMNS;
      columnIndex += 1
    ) {
      const stopTime =
        1100 + columnIndex * 320;

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

          reelSpinningRef.current[columnIndex] = false;

          setReelSpinning((current) => {
            const updated = [...current];
            updated[columnIndex] = false;
            return updated;
          });

          setReelStopping((current) => {
            const updated = [...current];
            updated[columnIndex] = true;
            return updated;
          });

          const settleTimeoutId = window.setTimeout(() => {
            setReelStopping((current) => {
              const updated = [...current];
              updated[columnIndex] = false;
              return updated;
            });
          }, 520);

          timeoutsRef.current.push(settleTimeoutId);

          playReelStopSound(columnIndex);

          if (columnIndex === COLUMNS - 1) {
            if (spinTickerRef.current) {
              clearInterval(spinTickerRef.current);
              spinTickerRef.current = null;
            }

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

              setWinEffect({
                level: "bonus",
                amount: prize.amount,
                id: Date.now(),
              });

              setMessage(
                `🎪 BONUS: ${prize.freeSpinsWon} GIROS GRATIS`
              );

              playBonusSound();
            } else if (prize.amount > 0) {
              const winLevel =
                prize.amount >= bet * 25
                  ? "mega"
                  : prize.amount >= bet * 10
                  ? "big"
                  : prize.amount >= bet * 3
                  ? "medium"
                  : "small";

              setWinEffect({
                level: winLevel,
                amount: prize.amount,
                id: Date.now(),
              });

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

              const effectTimeoutId = window.setTimeout(() => {
                setWinEffect((current) =>
                  current?.amount === prize.amount &&
                  current?.level !== "big" &&
                  current?.level !== "mega"
                    ? null
                    : current
                );
              }, winLevel === "small" ? 1800 : 2400);

              timeoutsRef.current.push(effectTimeoutId);
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
      <style>{`
        .clown-reel {
          position: relative;
          min-width: 0;
          overflow: hidden;
          isolation: isolate;
        }

        .clown-reel-strip {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-rows: repeat(5, minmax(0, 1fr));
          gap: 7px;
          transform: translate3d(0, 0, 0);
          will-change: transform, filter;
          backface-visibility: hidden;
        }

        .clown-reel-strip > .clown-symbol {
          min-height: 0;
        }

        .clown-reel-running {
          filter: brightness(1.08) saturate(1.08);
        }

        .clown-reel-running .clown-reel-strip {
          height: 200%;
          grid-template-rows: repeat(10, minmax(0, 1fr));
          animation: clownStripRollPremium .34s linear infinite;
          animation-delay:
            calc(var(--clown-reel-index) * -68ms);
          filter: blur(.28px);
        }

        .clown-reel-running::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 8;
          pointer-events: none;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              rgba(0,0,0,.30) 0%,
              transparent 18%,
              transparent 78%,
              rgba(0,0,0,.34) 100%
            );
          box-shadow:
            inset 0 18px 20px rgba(0,0,0,.22),
            inset 0 -18px 20px rgba(0,0,0,.26);
        }

        .clown-reel-stopping {
          z-index: 6;
          transform-origin: center top;
          animation: clownReelStopPremium .68s cubic-bezier(.15, .88, .2, 1.18);
        }

        .clown-reel-stopping .clown-reel-strip {
          animation: clownStripSettle .68s cubic-bezier(.15, .88, .2, 1.18);
        }

        @keyframes clownStripRollPremium {
          0% {
            transform: translate3d(0, -50%, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes clownReelStopPremium {
          0% {
            transform: translateY(-12px) scaleY(1.045);
            filter: brightness(1.2);
          }
          36% {
            transform: translateY(10px) scaleY(.96);
          }
          58% {
            transform: translateY(-4.5px) scaleY(1.025);
          }
          76% {
            transform: translateY(2px) scaleY(.99);
          }
          90% {
            transform: translateY(-.8px) scaleY(1.006);
          }
          100% {
            transform: translateY(0) scaleY(1);
            filter: brightness(1);
          }
        }

        @keyframes clownStripSettle {
          0% {
            transform: translateY(-10px);
          }
          38% {
            transform: translateY(7px);
          }
          66% {
            transform: translateY(-2.5px);
          }
          100% {
            transform: translateY(0);
          }
        }

        @media (max-width: 600px) {
          .clown-reel-strip {
            gap: 3px;
          }

          .clown-reel-running .clown-reel-strip {
            animation-duration: .31s;
            filter: blur(.18px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .clown-reel-running .clown-reel-strip,
          .clown-reel-stopping,
          .clown-reel-stopping .clown-reel-strip {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>

      <div className="clown-tent-bg" aria-hidden="true" />
      <div className="clown-spotlight clown-spotlight-left" aria-hidden="true" />
      <div className="clown-spotlight clown-spotlight-right" aria-hidden="true" />
      <div className="clown-cloud clown-cloud-left" aria-hidden="true" />
      <div className="clown-cloud clown-cloud-right" aria-hidden="true" />
      {winEffect && (
        <div
          className={`clown-premium-effects clown-premium-effects-${winEffect.level}`}
          aria-hidden="true"
        >
          <div className="clown-premium-flash" />
          <div className="clown-premium-burst">
            {Array.from({ length: 18 }).map((_, index) => (
              <span
                key={`burst-${winEffect.id}-${index}`}
                style={{
                  "--burst-angle": `${index * 20}deg`,
                  "--burst-delay": `${(index % 6) * 0.04}s`,
                }}
              />
            ))}
          </div>

          <div className="clown-coin-rain">
            {Array.from({
              length:
                winEffect.level === "mega"
                  ? 56
                  : winEffect.level === "big" ||
                    winEffect.level === "bonus"
                  ? 40
                  : winEffect.level === "medium"
                  ? 24
                  : 12,
            }).map((_, index) => (
              <span
                key={`coin-${winEffect.id}-${index}`}
                style={{
                  "--coin-left": `${(index * 29 + 7) % 100}%`,
                  "--coin-delay": `${(index % 12) * 0.09}s`,
                  "--coin-duration": `${
                    1.5 + (index % 7) * 0.13
                  }s`,
                  "--coin-size": `${
                    15 + (index % 5) * 4
                  }px`,
                }}
              >
                $
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="clown-confetti" aria-hidden="true">
        {Array.from({ length: 12 }).map(
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
        className={[
          "clown-machine",
          celebration ? "clown-machine-winning" : "",
          `clown-lights-${lightMode}`,
        ].join(" ")}
      >
        <div className="clown-machine-neon" aria-hidden="true" />
        <div className="clown-win-flash" aria-hidden="true" />
        <div className="clown-side-decor clown-side-decor-left" aria-hidden="true">
          <span>★</span>
          <span>🎈</span>
          <span>✦</span>
          <span>🎟️</span>
        </div>
        <div className="clown-side-decor clown-side-decor-right" aria-hidden="true">
          <span>🎟️</span>
          <span>✦</span>
          <span>🎈</span>
          <span>★</span>
        </div>

        <div className="clown-frame-bulbs clown-frame-bulbs-top" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, index) => (
            <span key={`top-${index}`} />
          ))}
        </div>

        <div className="clown-frame-bulbs clown-frame-bulbs-bottom" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, index) => (
            <span key={`bottom-${index}`} />
          ))}
        </div>

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

      

        <ClownHeader
  displayCredits={displayCredits}
  bet={bet}
  lastPrize={lastPrize}
  freeSpins={freeSpins}
  soundEnabled={soundEnabled}
  onToggleSound={() =>
    setSoundEnabled((current) => !current)
  }
/>

        <div className="clown-reels">
          <div className="clown-reels-glass" aria-hidden="true" />
          <div className="clown-reels-corner clown-reels-corner-tl" aria-hidden="true" />
          <div className="clown-reels-corner clown-reels-corner-tr" aria-hidden="true" />
          <div className="clown-reels-corner clown-reels-corner-bl" aria-hidden="true" />
          <div className="clown-reels-corner clown-reels-corner-br" aria-hidden="true" />
          {grid.map(
            (column, columnIndex) => (
              <div
                className={[
                  "clown-reel",
                  reelSpinning[columnIndex]
                    ? "clown-spinning clown-reel-running"
                    : "",
                  reelStopping[columnIndex]
                    ? "clown-reel-stopping"
                    : "",
                ].join(" ")}
                style={{
                  "--clown-reel-index": columnIndex,
                }}
                key={columnIndex}
              >
                <div className="clown-reel-strip">
                  {(reelSpinning[columnIndex]
                    ? [...column, ...column]
                    : column
                  ).map((symbol, visualIndex) => {
                    const rowIndex = visualIndex % ROWS;
                    const cellId = `${columnIndex}-${rowIndex}`;
                    const isGhost = visualIndex >= ROWS;

                    const isWinning =
                      !isGhost &&
                      winningCells.includes(cellId);

                    const isScatter =
                      !isGhost &&
                      scatterCells.includes(cellId);

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
                        key={`${cellId}-${visualIndex}`}
                      >
                        {symbol}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>

        {winEffect && !celebration && (
          <div
            className={`clown-inline-win clown-inline-win-${winEffect.level}`}
            aria-live="polite"
          >
            <span>GANASTE</span>
            <strong>
              {animatedPrize.toLocaleString("es-AR")}
            </strong>
            <small>CRÉDITOS</small>
          </div>
        )}

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

        <div className="clown-control-deck">
          <div className="clown-control-lights" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <span key={index} />
            ))}
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

        <div className="clown-phase-stamp">CLOWN PARTY · RODILLOS PREMIUM</div>
      </section>

      {celebration && (
        <button
          type="button"
          className={`clown-celebration clown-celebration-${celebration.type}`}
          onClick={() => {
            setCelebration(null);
            setWinEffect(null);
            setAnimatedPrize(0);
          }}
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

            <strong className="clown-celebration-count">
              {(animatedPrize || celebration.amount).toLocaleString(
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