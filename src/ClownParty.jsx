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

const NORMAL_WIN_CHANCE = 0.15;
const BONUS_CHANCE = 0.006;

function detectIOS() {
  if (typeof navigator === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

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
  const [showIntro, setShowIntro] = useState(true);
  const [grid, setGrid] = useState(createGrid());
  const [reelSpinning, setReelSpinning] = useState(
    Array(COLUMNS).fill(false)
  );
  const [reelStopping, setReelStopping] = useState(
    Array(COLUMNS).fill(false)
  );

  const [spinning, setSpinning] = useState(false);
  const [credits, setCredits] = useState(
    Number(player?.credits) || 0
  );
  const [displayCredits, setDisplayCredits] = useState(
    Number(player?.credits) || 0
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
  const displayCreditsRef = useRef(Number(player?.credits) || 0);
  const mountedRef = useRef(true);
  const audioNodesRef = useRef(new Set());
  const isIOSRef = useRef(detectIOS());
  const isIOS = isIOSRef.current;

  const bet = BET_OPTIONS[betIndex];

  useEffect(() => {
    const introTimer = window.setTimeout(() => {
      setShowIntro(false);
    }, 1200);

    return () => window.clearTimeout(introTimer);
  }, []);

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
    setCredits(Number(player?.credits) || 0);
  }, [player?.credits]);

  useEffect(() => {
    const start = displayCreditsRef.current;
    const end = credits;

    if (start === end) return undefined;

    const difference = Math.abs(end - start);
    const duration = Math.min(
      950,
      Math.max(300, difference * 0.45)
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

    // Safari en iPhone puede recargar la pestaña cuando coinciden
    // muchas animaciones de React y CSS. En iOS mostramos el monto
    // directamente y evitamos otro bucle requestAnimationFrame.
    if (isIOS) {
      setAnimatedPrize(target);
      return undefined;
    }

    const duration =
      winEffect.level === "mega"
        ? 4500
        : winEffect.level === "big"
        ? 3000
        : winEffect.level === "medium"
        ? 2200
        : 1500;

    const startedAt = performance.now();
    let frameId;

    const animatePrize = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased =
        progress < 0.82
          ? 0.92 * (1 - Math.pow(1 - progress / 0.82, 3))
          : 0.92 + 0.08 * ((progress - 0.82) / 0.18);
      setAnimatedPrize(Math.round(target * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(animatePrize);
      }
    };

    setAnimatedPrize(0);
    frameId = requestAnimationFrame(animatePrize);

    return () => cancelAnimationFrame(frameId);
  }, [winEffect, isIOS]);

  useEffect(() => {
    if (!isIOS || !celebration) return undefined;

    const celebrationTimer = window.setTimeout(() => {
      setCelebration(null);
      setWinEffect(null);
      setAnimatedPrize(0);
    }, 4500);

    return () => window.clearTimeout(celebrationTimer);
  }, [celebration, isIOS]);

  function clearTrackedTimeouts() {
    timeoutsRef.current.forEach((timeoutId) =>
      clearTimeout(timeoutId)
    );
    timeoutsRef.current = [];
  }

  function stopSpinTicker() {
    if (spinTickerRef.current) {
      clearInterval(spinTickerRef.current);
      spinTickerRef.current = null;
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearTrackedTimeouts();
      stopSpinTicker();

      audioNodesRef.current.forEach(({ oscillator, gain }) => {
        try {
          oscillator.onended = null;
          oscillator.disconnect();
          gain.disconnect();
        } catch {
          // El nodo ya estaba desconectado.
        }
      });
      audioNodesRef.current.clear();

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
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

    const audioNode = { oscillator, gain };
    audioNodesRef.current.add(audioNode);

    oscillator.onended = () => {
      audioNodesRef.current.delete(audioNode);
      try {
        oscillator.disconnect();
        gain.disconnect();
      } catch {
        // El navegador ya liberó el nodo.
      }
    };

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


  function playUiClickSound() {
    playTone({
      frequency: 420,
      duration: 0.1,
      volume: 0.1,
      type: "square",
    });
    playTone({
      frequency: 500,
      duration: 0.1,
      volume: 0.1,
      type: "square",
      delay: 0.08,
    });
    playTone({
      frequency: 350,
      duration: 0.1,
      volume: 0.1,
      type: "square",
      delay: 0.16,
    });
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
      const refreshedCredits = Number(data.credits) || 0;
      setCredits(refreshedCredits);
      onCreditsChange?.(refreshedCredits);
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

  function withTimeout(promise, milliseconds = 8000) {
    let timeoutId;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error("Tiempo de espera agotado"));
      }, milliseconds);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  function unlockSpin() {
    if (mountedRef.current) {
      setSpinning(false);
    }
    spinLockRef.current = false;
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
    clearTrackedTimeouts();
    stopSpinTicker();
    setSpinning(true);

    // Seguridad: aunque falle una animación o la conexión, los controles
    // nunca pueden quedar bloqueados permanentemente.
    const unlockFailsafeId = window.setTimeout(() => {
      if (spinLockRef.current) {
        console.warn("Desbloqueo de seguridad del giro");
        unlockSpin();
      }
    }, 12000);
    timeoutsRef.current.push(unlockFailsafeId);

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

    // La animación continua la realiza CSS. React solo actualiza
    // el resultado cuando cada rodillo se detiene. Esto reduce mucho
    // el consumo de CPU y memoria en celulares.

    playSpinSound();

    const finalGrid = createGrid();

    for (
      let columnIndex = 0;
      columnIndex < COLUMNS;
      columnIndex += 1
    ) {
      const stopTime =
  850 + columnIndex * 320;

      const timeoutId = window.setTimeout(
        async () => {
          if (!mountedRef.current) return;

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
          }, 300);

          timeoutsRef.current.push(settleTimeoutId);

          playReelStopSound(columnIndex);

          if (columnIndex === COLUMNS - 1) {
            stopSpinTicker();

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

            try {
              const {
                data: resultData,
                error: resultError,
              } = await withTimeout(
                supabase.rpc(
                  "apply_game_result",
                  {
                    p_bet: bet,
                    p_win: prize.amount,
                    p_is_free_spin: isFreeSpin,
                  }
                ),
                8000
              );

              if (!mountedRef.current) return;

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
                onCreditsChange?.(onlineCredits);
              }
            } catch (error) {
              console.error("Error al guardar la jugada:", error);
              if (mountedRef.current) {
                setMessage(
                  "⚠️ Error de conexión. Actualizando saldo..."
                );
                await refreshCredits();
              }
            } finally {
              unlockSpin();
              // Los temporizadores del giro ya terminaron; soltamos
              // sus identificadores sin cancelar el cierre visual del premio.
              timeoutsRef.current = [];
            }
          }
        },
        stopTime
      );

      timeoutsRef.current.push(timeoutId);
    }
  }

  return (
    <main className={`clown-page ${isIOS ? "clown-ios-mode" : ""}`}>
      {showIntro && (
        <section className="clown-intro-screen" aria-label="Cargando Clown Party">
          <div className="clown-intro-curtain clown-intro-curtain-left" aria-hidden="true" />
          <div className="clown-intro-curtain clown-intro-curtain-right" aria-hidden="true" />

          <div className="clown-intro-confetti" aria-hidden="true">
            {Array.from({ length: isIOS ? 8 : 18 }).map((_, index) => (
              <span
                key={`intro-confetti-${index}`}
                style={{
                  "--intro-left": `${(index * 31 + 5) % 100}%`,
                  "--intro-delay": `${(index % 6) * 0.08}s`,
                  "--intro-rotate": `${index * 29}deg`,
                }}
              >
                {index % 4 === 0
                  ? "★"
                  : index % 4 === 1
                  ? "●"
                  : index % 4 === 2
                  ? "▲"
                  : "■"}
              </span>
            ))}
          </div>

          <div className="clown-intro-card">
            <div className="clown-intro-lights" aria-hidden="true">
              {Array.from({ length: isIOS ? 6 : 12 }).map((_, index) => (
                <span key={`intro-light-${index}`} />
              ))}
            </div>

            <div className="clown-intro-clown" aria-hidden="true">🤡</div>
            <h1>CLOWN PARTY</h1>
            <p className="clown-intro-tagline">¡EL ESPECTÁCULO ESTÁ POR COMENZAR!</p>
            <div className="clown-intro-loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <small>🎪 Preparando el espectáculo...</small>
          </div>
        </section>
      )}

      <style>{`
        .clown-intro-screen {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: grid;
          place-items: center;
          overflow: hidden;
          padding: 22px;
          background:
            radial-gradient(circle at 50% 38%, rgba(255, 226, 92, .22), transparent 27%),
            repeating-linear-gradient(
              90deg,
              #d9153f 0 12.5%,
              #fff3cf 12.5% 25%
            );
          animation: clownIntroFadeOut .28s ease 1s forwards;
        }

        .clown-intro-screen::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(17, 2, 34, .35), rgba(17, 2, 34, .78)),
            radial-gradient(circle at center, transparent 25%, rgba(8, 0, 20, .78) 100%);
        }

        .clown-intro-curtain {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 30%;
          z-index: 1;
          background:
            repeating-linear-gradient(
              90deg,
              #73051d 0 14px,
              #c41235 14px 30px,
              #850521 30px 46px
            );
          box-shadow: inset 0 0 45px rgba(0, 0, 0, .6);
        }

        .clown-intro-curtain-left {
          left: 0;
          clip-path: polygon(0 0, 100% 0, 72% 100%, 0 100%);
          animation: clownCurtainLeft 1.05s cubic-bezier(.2,.8,.25,1) forwards;
        }

        .clown-intro-curtain-right {
          right: 0;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 28% 100%);
          animation: clownCurtainRight 1.05s cubic-bezier(.2,.8,.25,1) forwards;
        }

        .clown-intro-card {
          position: relative;
          z-index: 3;
          width: min(92vw, 430px);
          padding: 34px 26px 28px;
          text-align: center;
          color: #fff;
          border: 4px solid #ffd84b;
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(66, 11, 112, .97), rgba(27, 4, 57, .98));
          box-shadow:
            0 0 0 5px #d51b44,
            0 0 36px rgba(255, 216, 75, .75),
            0 24px 70px rgba(0, 0, 0, .62);
          transform: scale(.78) translateY(18px);
          opacity: 0;
          animation: clownIntroCardIn .5s cubic-bezier(.18,.9,.28,1.25) .08s forwards;
        }

        .clown-intro-lights {
          position: absolute;
          inset: 8px;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
        }

        .clown-intro-lights span {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #fff5a3;
          box-shadow: 0 0 10px #fff06a, 0 0 18px #ffb300;
          animation: clownIntroBlink .45s ease-in-out infinite alternate;
        }

        .clown-intro-lights span:nth-child(even) {
          animation-delay: .18s;
        }

        .clown-intro-clown {
          font-size: clamp(64px, 20vw, 94px);
          line-height: 1;
          filter: drop-shadow(0 8px 8px rgba(0, 0, 0, .45));
          animation: clownIntroBounce .7s ease-in-out infinite alternate;
        }

        .clown-intro-kicker {
          margin: 12px 0 4px;
          color: #ffd84b;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .18em;
        }

        .clown-intro-card h1 {
          margin: 0;
          font-size: clamp(34px, 10vw, 58px);
          line-height: 1;
          letter-spacing: .03em;
          color: #fff;
          text-shadow:
            0 4px 0 #c71945,
            0 7px 0 #671039,
            0 0 20px rgba(255, 217, 70, .65);
        }

        .clown-intro-tagline {
          margin: 16px 0 12px;
          font-size: clamp(13px, 3.8vw, 17px);
          font-weight: 900;
          color: #fff0a2;
          letter-spacing: .06em;
        }

        .clown-intro-card small {
          display: block;
          margin-top: 9px;
          color: rgba(255,255,255,.78);
          font-weight: 800;
        }

        .clown-intro-loader {
          display: flex;
          justify-content: center;
          gap: 8px;
          height: 15px;
        }

        .clown-intro-loader span {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #ffd84b;
          box-shadow: 0 0 10px rgba(255, 216, 75, .9);
          animation: clownIntroDot .55s ease-in-out infinite alternate;
        }

        .clown-intro-loader span:nth-child(2) { animation-delay: .12s; }
        .clown-intro-loader span:nth-child(3) { animation-delay: .24s; }

        .clown-intro-confetti {
          position: absolute;
          inset: 0;
          z-index: 2;
          overflow: hidden;
          pointer-events: none;
        }

        .clown-intro-confetti span {
          position: absolute;
          left: var(--intro-left);
          top: -10%;
          color: #ffd84b;
          font-size: 18px;
          transform: rotate(var(--intro-rotate));
          animation: clownIntroConfetti 1.15s linear var(--intro-delay) infinite;
        }

        .clown-intro-confetti span:nth-child(3n + 1) { color: #42d8ff; }
        .clown-intro-confetti span:nth-child(3n + 2) { color: #ff4d86; }

        @keyframes clownIntroCardIn {
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        @keyframes clownIntroBounce {
          from { transform: translateY(0) rotate(-2deg); }
          to { transform: translateY(-7px) rotate(2deg); }
        }

        @keyframes clownIntroDot {
          from { transform: translateY(2px) scale(.75); opacity: .45; }
          to { transform: translateY(-3px) scale(1.1); opacity: 1; }
        }

        @keyframes clownIntroBlink {
          from { opacity: .45; transform: scale(.8); }
          to { opacity: 1; transform: scale(1.15); }
        }

        @keyframes clownIntroConfetti {
          to { top: 112%; transform: rotate(calc(var(--intro-rotate) + 420deg)); }
        }

        @keyframes clownCurtainLeft {
          0%, 55% { transform: translateX(0); }
          100% { transform: translateX(-82%); }
        }

        @keyframes clownCurtainRight {
          0%, 55% { transform: translateX(0); }
          100% { transform: translateX(82%); }
        }

        @keyframes clownIntroFadeOut {
          to { opacity: 0; visibility: hidden; }
        }

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
          animation: clownStripRollPremium .58s linear infinite;
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
          animation: clownReelStopPremium .85s ease-out;
        }

        .clown-reel-stopping .clown-reel-strip {
          animation: clownStripSettle .85s ease-out;
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


        .clown-winning-lines {
          position: absolute;
          inset: 14px;
          z-index: 14;
          width: calc(100% - 28px);
          height: calc(100% - 28px);
          overflow: visible;
          pointer-events: none;
        }

        .clown-winning-line-glow,
        .clown-winning-line-core {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          vector-effect: non-scaling-stroke;
          stroke-dasharray: 180;
          stroke-dashoffset: 180;
          animation:
            clownWinningLineDraw .52s ease-out forwards,
            clownWinningLinePulse .72s ease-in-out .52s 3 alternate;
        }

        .clown-winning-line-glow {
          stroke: hsl(var(--clown-line-hue) 100% 58%);
          stroke-width: 9;
          opacity: .72;
          filter:
            drop-shadow(0 0 5px hsl(var(--clown-line-hue) 100% 62%))
            drop-shadow(0 0 12px hsl(var(--clown-line-hue) 100% 55%));
        }

        stroke: hsl(var(--clown-line-hue) 100% 60%);
          stroke-width: 2.8;
          filter:
            drop-shadow(0 0 3px #fff)
            drop-shadow(0 0 7px hsl(var(--clown-line-hue) 100% 62%));
        }

        @keyframes clownWinningLineDraw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes clownWinningLinePulse {
          from {
            opacity: .72;
          }
          to {
            opacity: 1;
          }
        }

        @media (max-width: 600px) {
          .clown-reel-strip {
            gap: 3px;
          }

          .clown-reel-running .clown-reel-strip {
            animation-duration: .62s;
            filter: blur(.18px);
          }
        }

        .clown-ios-mode .clown-reel-running .clown-reel-strip {
          filter: none !important;
          animation-duration: .42s;
          will-change: transform;
        }

        .clown-ios-mode .clown-reel-stopping,
        .clown-ios-mode .clown-reel-stopping .clown-reel-strip {
          filter: none !important;
        }

        .clown-ios-mode .clown-premium-effects *,
        .clown-ios-mode .clown-celebration *,
        .clown-ios-mode .clown-frame-bulbs span,
        .clown-ios-mode .clown-control-lights span,
        .clown-ios-mode .clown-side-decor span,
        .clown-ios-mode .clown-spotlight,
        .clown-ios-mode .clown-cloud {
          filter: none !important;
          box-shadow: none !important;
          animation-iteration-count: 1 !important;
        }

        .clown-ios-mode .clown-machine-neon,
        .clown-ios-mode .clown-win-flash,
        .clown-ios-mode .clown-premium-flash {
          filter: none !important;
          box-shadow: none !important;
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
            {Array.from({ length: isIOS ? 6 : 12 }).map((_, index) => (
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
              length: isIOS
                ? winEffect.level === "mega" ||
                  winEffect.level === "big" ||
                  winEffect.level === "bonus"
                  ? 8
                  : 6
                : winEffect.level === "mega"
                ? 22
                : winEffect.level === "big" ||
                  winEffect.level === "bonus"
                ? 18
                : winEffect.level === "medium"
                ? 12
                : 8,
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
          {Array.from({ length: isIOS ? 10 : 20 }).map((_, index) => (
            <span key={`top-${index}`} />
          ))}
        </div>

        <div className="clown-frame-bulbs clown-frame-bulbs-bottom" aria-hidden="true">
          {Array.from({ length: isIOS ? 10 : 20 }).map((_, index) => (
            <span key={`bottom-${index}`} />
          ))}
        </div>

        <button
          type="button"
          className="clown-sound-button"
          onClick={() => { playUiClickSound(); setSoundEnabled((current) => !current); }}
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

          {winningLines.length > 0 && !spinning && (
            <svg
              className="clown-winning-lines"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {winningLines.map((lineIndex, visibleIndex) => {
                const payline = PAYLINES[lineIndex];

                if (!payline) return null;

                const points = payline
                  .map(
                    (rowIndex, columnIndex) =>
                      `${10 + columnIndex * 20},${10 + rowIndex * 20}`
                  )
                  .join(" ");

                const lineHue = (42 + visibleIndex * 58) % 360;

                return (
                  <g
                    key={`winning-line-${lineIndex}`}
                    style={{
                      "--clown-line-hue": lineHue,
                      animationDelay: `${visibleIndex * 0.12}s`,
                    }}
                  >
                    {!isIOS && (
                      <polyline
                        className="clown-winning-line-glow"
                        points={points}
                      />
                    )}
                    <polyline
                      className="clown-winning-line-core"
                      points={points}
                    />
                  </g>
                );
              })}
            </svg>
          )}

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
            onClick={() => { playUiClickSound(); decreaseBet(); }}
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
            disabled={spinning}
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
            onClick={() => { playUiClickSound(); increaseBet(); }}
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
            onClick={() => { playUiClickSound(); onBack(); }}
            disabled={spinning}
          >
            ← CASINO
          </button>

          <button
            type="button"
            className="clown-logout-button"
            onClick={() => { playUiClickSound(); onLogout(); }}
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