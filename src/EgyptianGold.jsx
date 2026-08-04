import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import "./EgyptianGold.css";
import { EGYPT_CONFIG } from "./machines/egypt/egyptConfig";

const ROWS = EGYPT_CONFIG.ROWS;
const COLUMNS = EGYPT_CONFIG.COLUMNS;

const BET_OPTIONS = EGYPT_CONFIG.BET_OPTIONS;

const WILD = EGYPT_CONFIG.WILD;
const SCATTER = EGYPT_CONFIG.SCATTER;

const SYMBOLS = EGYPT_CONFIG.SYMBOLS;

const WEIGHTED_SYMBOLS = EGYPT_CONFIG.WEIGHTED_SYMBOLS;

const SYMBOL_PAYS = EGYPT_CONFIG.SYMBOL_PAYS;

const PAYLINES = EGYPT_CONFIG.PAYLINES;

function egyptSymbolType(symbol) {
  if (symbol === WILD) return "wild";
  if (symbol === SCATTER) return "scatter";

  const types = {
    "🐪": "camel",
    "🐍": "cobra",
    "🦅": "falcon",
    "🏺": "vase",
    "📜": "papyrus",
    "👑": "crown",
    "💎": "gem",
    "☀️": "sun",
    "☀": "sun",
  };

  return types[symbol] || "relic";
}

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
  const safeSymbols = SYMBOLS.filter(
  (symbol) => symbol !== WILD && symbol !== SCATTER
);
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
          safeSymbols[(columnIndex + rowIndex) % safeSymbols.length]
      )
  );
}

function createSmallWinningGrid() {
  const grid = createLosingGrid();

  const payline =
    PAYLINES[
      Math.floor(Math.random() * PAYLINES.length)
    ];

  const smallSymbols = SYMBOLS.filter(
    (symbol) => symbol !== WILD && symbol !== SCATTER
  ).slice(0, 3);

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
  const blockerSymbol =
    SYMBOLS.find(
      (symbol) =>
        symbol !== WILD &&
        symbol !== SCATTER &&
        symbol !== winningSymbol
    ) ?? smallSymbols[0];

  grid[3][payline[3]] = blockerSymbol;

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

export default function EgyptianGold({
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
    "¡Bienvenido a Egyptian Gold!"
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
  const spinFailsafeRef = useRef(null);
  const reelSpinningRef = useRef(Array(COLUMNS).fill(false));
  const displayCreditsRef = useRef(player?.credits ?? 0);
  const reelElementsRef = useRef([]);

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

      if (spinFailsafeRef.current) {
        clearTimeout(spinFailsafeRef.current);
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
    // Limpia temporizadores viejos antes de comenzar un nuevo giro.
    timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutsRef.current = [];

    if (
      spinLockRef.current ||
      spinning ||
      celebration
    ) {
      return;
    }

    const isFreeSpin = freeSpins > 0;

    if (!isFreeSpin && credits < bet) {
      setMessage("❌ No tenés créditos suficientes");

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
      setFreeSpins((current) => Math.max(0, current - 1));
      setMessage("🎁 Giro gratis...");
    } else {
      setCredits((current) => current - bet);
      setMessage("Girando...");
    }

    const finalGrid = createGrid();
    const prize = calculatePrize(finalGrid, bet);
    let spinFinalized = false;

    const releaseMachine = () => {
      if (spinTickerRef.current) {
        clearInterval(spinTickerRef.current);
        spinTickerRef.current = null;
      }

      if (spinFailsafeRef.current) {
        clearTimeout(spinFailsafeRef.current);
        spinFailsafeRef.current = null;
      }

      reelSpinningRef.current = Array(COLUMNS).fill(false);

      // Safari/iPhone puede conservar visualmente una animación CSS infinita
      // aunque React ya haya quitado el estado. La removemos también del DOM.
      reelElementsRef.current.forEach((element) => {
        if (!element) return;
        element.classList.remove(
          "egypt-spinning",
          "egypt-reel-running",
          "egypt-reel-stopping"
        );
        void element.offsetWidth;
      });

      setReelSpinning(Array(COLUMNS).fill(false));
      setReelStopping(Array(COLUMNS).fill(false));
      setSpinning(false);
      spinLockRef.current = false;
      timeoutsRef.current = [];
    };

    const saveResultInBackground = () => {
      let requestTimeoutId;

      void (async () => {
        try {
          const resultRequest = supabase.rpc(
            "apply_game_result",
            {
              p_bet: bet,
              p_win: prize.amount,
              p_is_free_spin: isFreeSpin,
            }
          );

          const requestTimeout = new Promise((_, reject) => {
            requestTimeoutId = window.setTimeout(() => {
              reject(new Error("Tiempo de espera agotado al guardar la jugada"));
            }, 5000);
          });

          const { data: resultData, error: resultError } =
            await Promise.race([resultRequest, requestTimeout]);

          if (resultError) throw resultError;

          if (resultData?.length) {
            const onlineCredits = resultData[0].credits_after;
            setCredits(onlineCredits);
            onCreditsChange?.(onlineCredits);
          }
        } catch (error) {
          console.error("Error al guardar la jugada:", error);

          // La máquina ya quedó liberada. Solo intentamos reconciliar
          // el saldo sin volver a bloquear el juego.
          refreshCredits().catch((refreshError) => {
            console.error("Error al actualizar créditos:", refreshError);
          });
        } finally {
          if (requestTimeoutId) clearTimeout(requestTimeoutId);
        }
      })();
    };

    const finalizeSpin = () => {
      if (spinFinalized) return;
      spinFinalized = true;

      setGrid(finalGrid);
      setLastPrize(prize.amount);
      setWinningLines(prize.winningLines);
      setWinningCells(prize.winningCells);
      setScatterCells(prize.scatterCells);

      // El crédito visual se actualiza inmediatamente. Supabase se
      // reconcilia después, sin mantener la máquina en GIRANDO.
      if (prize.amount > 0) {
        setCredits((current) => current + prize.amount);
      }

      if (prize.freeSpinsWon > 0) {
        setFreeSpins((current) => current + prize.freeSpinsWon);

        setCelebration({
          type: "bonus",
          amount: prize.amount,
          freeSpins: prize.freeSpinsWon,
        });

        setWinEffect({
          level: "bonus",
          amount: prize.amount,
          id: Date.now(),
        });

        setMessage(`𓂀 BONUS: ${prize.freeSpinsWon} GIROS GRATIS`);
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

        if (prize.surpriseMultiplier > 1) {
          setMessage(
            `𓆣 MULTIPLICADOR ×${prize.surpriseMultiplier} — GANASTE ${prize.amount}`
          );
        } else {
          setMessage(`✦ GANASTE ${prize.amount} CRÉDITOS`);
        }

        if (prize.amount >= bet * 10) {
          setCelebration({
            type: prize.amount >= bet * 25 ? "mega" : "big",
            amount: prize.amount,
            multiplier: prize.surpriseMultiplier,
          });
        }

        playWinSound(prize.amount >= bet * 10);

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
          isFreeSpin && freeSpins > 1
            ? "🎁 Sigue el bonus"
            : "¡Probá otro giro!"
        );
      }

      releaseMachine();
      saveResultInBackground();
    };

    const allReelsSpinning = Array(COLUMNS).fill(true);
    reelSpinningRef.current = allReelsSpinning;
    setReelSpinning(allReelsSpinning);
    setReelStopping(Array(COLUMNS).fill(false));

    // IMPORTANTE PARA iPHONE:
    // No actualizamos el grid cada 52 ms. Ese intervalo obligaba a React
    // a renderizar toda la máquina unas 20 veces por segundo y podía
    // saturar Safari, atrasando los timers y desincronizando el sonido.
    // El movimiento visual queda completamente a cargo de CSS.
    if (spinTickerRef.current) {
      clearInterval(spinTickerRef.current);
      spinTickerRef.current = null;
    }

    playSpinSound();

    // Respaldo corto: el último rodillo termina cerca de 1,8 segundos.
    // Solo interviene si Safari pierde alguno de los timers de parada.
    spinFailsafeRef.current = window.setTimeout(finalizeSpin, 2600);

    for (
      let columnIndex = 0;
      columnIndex < COLUMNS;
      columnIndex += 1
    ) {
      const stopTime = 850 + columnIndex * 220;

      const timeoutId = window.setTimeout(() => {
        if (spinFinalized) return;

        setGrid((currentGrid) => {
          const updatedGrid = currentGrid.map((column) => [...column]);
          updatedGrid[columnIndex] = finalGrid[columnIndex];
          return updatedGrid;
        });

        reelSpinningRef.current[columnIndex] = false;

        const reelElement = reelElementsRef.current[columnIndex];
        if (reelElement) {
          reelElement.classList.remove(
            "egypt-spinning",
            "egypt-reel-running"
          );
          void reelElement.offsetWidth;
          reelElement.classList.add("egypt-reel-stopping");
        }

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

          const settledReel = reelElementsRef.current[columnIndex];
          settledReel?.classList.remove("egypt-reel-stopping");
        }, 520);

        timeoutsRef.current.push(settleTimeoutId);
        playReelStopSound(columnIndex);

        if (columnIndex === COLUMNS - 1) {
          finalizeSpin();
        }
      }, stopTime);

      timeoutsRef.current.push(timeoutId);
    }
  }

  return (
    <main className="egypt-page">
      <style>{`
        .egypt-reel {
          position: relative;
          min-width: 0;
          overflow: hidden;
          isolation: isolate;
        }

        .egypt-reel-strip {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-rows: repeat(5, minmax(0, 1fr));
          gap: 7px;
          transform: translate3d(0, 0, 0);
          will-change: transform;
          backface-visibility: hidden;
        }

        .egypt-reel-strip > .egypt-symbol {
          min-height: 0;
        }

        .egypt-reel-running {
          filter: brightness(1.08) saturate(1.08);
        }

        .egypt-reel-running .egypt-reel-strip {
          height: 200%;
          grid-template-rows: repeat(10, minmax(0, 1fr));
          animation: egyptStripRollPremium .34s linear infinite;
          animation-delay:
            calc(var(--egypt-reel-index) * -68ms);
        }

        .egypt-reel-running::after {
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

        .egypt-reel-stopping {
          z-index: 6;
          transform-origin: center top;
          animation: egyptReelStopPremium .68s cubic-bezier(.15, .88, .2, 1.18);
        }

        .egypt-reel-stopping .egypt-reel-strip {
          animation: egyptStripSettle .68s cubic-bezier(.15, .88, .2, 1.18);
        }

        @keyframes egyptStripRollPremium {
          0% {
            transform: translate3d(0, -50%, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes egyptReelStopPremium {
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

        @keyframes egyptStripSettle {
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
          .egypt-reel-strip {
            gap: 3px;
          }

          .egypt-reel-running .egypt-reel-strip {
            animation-duration: .31s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .egypt-reel-running .egypt-reel-strip,
          .egypt-reel-stopping,
          .egypt-reel-stopping .egypt-reel-strip {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>

      <div className="egypt-tent-bg" aria-hidden="true" />
      <div className="egypt-spotlight egypt-spotlight-left" aria-hidden="true" />
      <div className="egypt-spotlight egypt-spotlight-right" aria-hidden="true" />
      <div className="egypt-cloud egypt-cloud-left" aria-hidden="true" />
      <div className="egypt-cloud egypt-cloud-right" aria-hidden="true" />
      {winEffect && (
        <div
          className={`egypt-premium-effects egypt-premium-effects-${winEffect.level}`}
          aria-hidden="true"
        >
          <div className="egypt-premium-flash" />
          <div className="egypt-premium-burst">
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

          <div className="egypt-coin-rain">
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
                {["𓆣", "𓂀", "☥", "◆", "✦"][index % 5]}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="egypt-confetti" aria-hidden="true">
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
          "egypt-machine",
          celebration ? "egypt-machine-winning" : "",
          `egypt-lights-${lightMode}`,
        ].join(" ")}
      >
        <div className="egypt-machine-neon" aria-hidden="true" />
        <div className="egypt-win-flash" aria-hidden="true" />
        <div className="egypt-side-decor egypt-side-decor-left" aria-hidden="true">
          <span>★</span>
          <span>𓂀</span>
          <span>✦</span>
          <span>𓆣</span>
        </div>
        <div className="egypt-side-decor egypt-side-decor-right" aria-hidden="true">
          <span>𓆣</span>
          <span>✦</span>
          <span>𓂀</span>
          <span>★</span>
        </div>

        <div className="egypt-frame-bulbs egypt-frame-bulbs-top" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, index) => (
            <span key={`top-${index}`} />
          ))}
        </div>

        <div className="egypt-frame-bulbs egypt-frame-bulbs-bottom" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, index) => (
            <span key={`bottom-${index}`} />
          ))}
        </div>

        <button
          type="button"
          className="egypt-sound-button"
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

      

        <header className="egypt-temple-header">
          <div className="egypt-top-actions">
            <button
              type="button"
              className="egypt-back-button"
              onClick={onBack}
              disabled={spinning}
            >
              ← LOBBY
            </button>

            <div className="egypt-title-block">
              <span className="egypt-title-kicker">EL TEMPLO DESPIERTA</span>
              <h1>EGYPTIAN GOLD</h1>
              <span className="egypt-title-subtitle">TESOROS DEL FARAÓN</span>
            </div>

            <button
              type="button"
              className="egypt-logout-button"
              onClick={onLogout}
              disabled={spinning}
            >
              SALIR
            </button>
          </div>

          <section className="egypt-status-board" aria-label="Estado del juego">
            <div className="egypt-status-card egypt-status-credits">
              <span>CRÉDITOS</span>
              <strong>{displayCredits.toLocaleString("es-AR")}</strong>
            </div>

            <div className="egypt-status-card egypt-status-bet">
              <span>APUESTA</span>
              <strong>{bet.toLocaleString("es-AR")}</strong>
            </div>

            <div className="egypt-status-card egypt-status-prize">
              <span>PREMIO</span>
              <strong>{lastPrize.toLocaleString("es-AR")}</strong>
            </div>

            <div className="egypt-status-card egypt-status-free">
              <span>GIROS</span>
              <strong>{freeSpins.toLocaleString("es-AR")}</strong>
            </div>
          </section>
        </header>

        <div className="egypt-reels">
          <div className="egypt-reels-glass" aria-hidden="true" />
          <div className="egypt-reels-corner egypt-reels-corner-tl" aria-hidden="true" />
          <div className="egypt-reels-corner egypt-reels-corner-tr" aria-hidden="true" />
          <div className="egypt-reels-corner egypt-reels-corner-bl" aria-hidden="true" />
          <div className="egypt-reels-corner egypt-reels-corner-br" aria-hidden="true" />
          {grid.map(
            (column, columnIndex) => (
              <div
                className={[
                  "egypt-reel",
                  reelSpinning[columnIndex]
                    ? "egypt-spinning egypt-reel-running"
                    : "",
                  reelStopping[columnIndex]
                    ? "egypt-reel-stopping"
                    : "",
                ].join(" ")}
                style={{
                  "--egypt-reel-index": columnIndex,
                }}
                ref={(element) => {
                  reelElementsRef.current[columnIndex] = element;
                }}
                key={`${columnIndex}-${
                  reelSpinning[columnIndex] ? "running" : "stopped"
                }`}
              >
                <div className="egypt-reel-strip">
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
                          "egypt-symbol",
                          isWinning
                            ? "egypt-winning-symbol"
                            : "",
                          isScatter
                            ? "egypt-scatter-symbol"
                            : "",
                          symbol === WILD
                            ? "egypt-wild-symbol"
                            : "",
                          `egypt-symbol-${egyptSymbolType(symbol)}`,
                        ].join(" ")}
                        data-symbol-type={egyptSymbolType(symbol)}
                        key={`${cellId}-${visualIndex}`}
                      >
                        <span className="egypt-symbol-glyph">{symbol}</span>
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
            className={`egypt-inline-win egypt-inline-win-${winEffect.level}`}
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
          className={`egypt-message ${
            lastPrize > 0
              ? "egypt-message-win"
              : ""
          }`}
        >
          {credits <= 0
            ? "SIN CRÉDITOS — Contacte al administrador."
            : message}
        </div>

        <div className="egypt-control-deck">
          <div className="egypt-control-ornament" aria-hidden="true">𓆣</div>

          <button
            type="button"
            className="egypt-small-button egypt-bet-down"
            onClick={decreaseBet}
            disabled={
              spinning ||
              freeSpins > 0 ||
              betIndex === 0
            }
            aria-label="Bajar apuesta"
          >
            <span>−</span>
            <small>APUESTA</small>
          </button>

          <button
            type="button"
            className={`egypt-spin-button ${
              freeSpins > 0
                ? "egypt-free-spin-button"
                : ""
            }`}
            onClick={spin}
            disabled={
              spinning ||
              (!freeSpins && credits < bet)
            }
          >
            <span className="egypt-spin-eye">𓂀</span>
            <span className="egypt-spin-label">
              {spinning
                ? "GIRANDO"
                : freeSpins > 0
                ? "GRATIS"
                : "GIRAR"}
            </span>
          </button>

          <button
            type="button"
            className="egypt-small-button egypt-bet-up"
            onClick={increaseBet}
            disabled={
              spinning ||
              freeSpins > 0 ||
              betIndex === BET_OPTIONS.length - 1
            }
            aria-label="Subir apuesta"
          >
            <span>+</span>
            <small>APUESTA</small>
          </button>

          <div className="egypt-control-ornament egypt-control-ornament-right" aria-hidden="true">𓋹</div>
        </div>

        <div className="egypt-help">
          <span>
            𓆣 WILD reemplaza otros símbolos
          </span>

          <span>
            𓂀 3 o más activan giros gratis
          </span>

          <span>
            ✦ Premios con multiplicadores
            sorpresa
          </span>
        </div>

        <div className="egypt-phase-stamp">EGYPTIAN GOLD · TEMPLO DE LOS FARAONES</div>
      </section>

      {celebration && (
        <button
          type="button"
          className={`egypt-celebration egypt-celebration-${celebration.type}`}
          onClick={() => {
            setCelebration(null);
            setWinEffect(null);
            setAnimatedPrize(0);
          }}
          aria-label="Cerrar premio"
        >
          <div className="egypt-celebration-card">
            <span>
              {celebration.type === "bonus"
                ? "𓂀 BONUS DEL TEMPLO"
                : celebration.type === "mega"
                ? "𓆣 MEGA PREMIO"
                : "✦ GRAN PREMIO"}
            </span>

            <strong className="egypt-celebration-count">
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