import { useEffect, useMemo, useRef, useState } from "react";
import "./Wheel.css";
import { supabase } from "./supabase";

const SEGMENTS = [
  { label: "X1", value: 100 },
  { label: "PIERDE", lossBet: true },
  { label: "X2", value: 200 },
  { label: "X1", value: 100 },
  { label: "-500", loss: 500 },
  { label: "X5", value: 500 },
  { label: "X1", value: 100 },
  { label: "-1000", loss: 1000 },
  { label: "B X3", bonus: true },
  { label: "X1", value: 100 },
  { label: "PIERDE", lossBet: true },
  { label: "X2", value: 200 },
  { label: "X1", value: 100 },
  { label: "-2000", loss: 2000 },
  { label: "X2", multiplier: 2 },
  { label: "X1", value: 100 },
  { label: "-4000", loss: 4000 },
  { label: "X2", value: 200 },
  { label: "X1", value: 100 },
  { label: "-1000", loss: 1000 },
  { label: "JP X10", jackpot: true },
  { label: "X2", value: 200 },
  { label: "PIERDE", lossBet: true },
  { label: "X10", value: 1000 },
];

const SPIN_DURATION_MS = 5400;
const BASE_BET = 100;

function getSegmentClass(segment) {
  if (segment.jackpot) return "fortune-wheel-segment-label is-jackpot";
  if (segment.bonus) return "fortune-wheel-segment-label is-bonus";
  if (segment.multiplier) return "fortune-wheel-segment-label is-multiplier";
  if (segment.lossBet || segment.loss > 0 || segment.value === 0) {
    return "fortune-wheel-segment-label is-lose";
  }
  return "fortune-wheel-segment-label";
}

export default function Wheel({
  player,
  credits: externalCredits,
  onCreditsChange,
  onBack,
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [localCredits, setLocalCredits] = useState(() => {
    const initialCredits = externalCredits ?? player?.credits ?? 0;
    return Math.max(0, Math.floor(Number(initialCredits) || 0));
  });
  const [bet, setBet] = useState(100);
  const [lastBet, setLastBet] = useState(100);
  const [lastPrize, setLastPrize] = useState(0);
  const [history, setHistory] = useState([]);

  const credits = localCredits;

  const currentRotationRef = useRef(0);
  const spinTimeoutRef = useRef(null);
  const soundTimersRef = useRef([]);
  const audioContextRef = useRef(null);

  const segmentAngle = 360 / SEGMENTS.length;

  const wheelBackground = useMemo(() => {
    const parts = SEGMENTS.map((_, index) => {
      const start = index * segmentAngle;
      const end = start + segmentAngle;
      const color =
        index % 3 === 0
          ? "#c41837"
          : index % 3 === 1
            ? "#171717"
            : "#d7a719";

      return `${color} ${start}deg ${end}deg`;
    });

    return `conic-gradient(${parts.join(",")})`;
  }, [segmentAngle]);

  function clearSoundTimers() {
    soundTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    soundTimersRef.current = [];
  }

  async function ensureAudioContext() {
    if (!soundEnabled) return null;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  function playTone(context, {
    frequency = 440,
    duration = 0.07,
    volume = 0.06,
    type = "triangle",
    delay = 0,
  } = {}) {
    if (!context || !soundEnabled) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + delay;
    const endAt = startAt + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(endAt);
  }

  function playSpinStart(context) {
    playTone(context, {
      frequency: 180,
      duration: 0.2,
      volume: 0.08,
      type: "sawtooth",
    });
    playTone(context, {
      frequency: 270,
      duration: 0.18,
      volume: 0.055,
      type: "triangle",
      delay: 0.06,
    });
  }

  function playRatchetClick(context, progress) {
    if (!context || !soundEnabled) return;

    const now = context.currentTime;
    const clickDuration = 0.012 + progress * 0.018;
    const clickVolume = 0.055 + progress * 0.035;

    // Golpe metálico corto.
    const oscillator = context.createOscillator();
    const oscillatorGain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(
      1850 + Math.random() * 550 - progress * 280,
      now
    );

    oscillatorGain.gain.setValueAtTime(clickVolume, now);
    oscillatorGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + clickDuration
    );

    oscillator.connect(oscillatorGain);
    oscillatorGain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + clickDuration);

    // Chasquido áspero que imita la lengüeta golpeando los dientes.
    const sampleCount = Math.max(
      1,
      Math.floor(context.sampleRate * clickDuration)
    );
    const noiseBuffer = context.createBuffer(
      1,
      sampleCount,
      context.sampleRate
    );
    const noiseData = noiseBuffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      const decay = 1 - index / sampleCount;
      noiseData[index] = (Math.random() * 2 - 1) * decay;
    }

    const noiseSource = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();

    noiseSource.buffer = noiseBuffer;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(
      2200 + Math.random() * 700,
      now
    );
    noiseFilter.Q.setValueAtTime(1.8, now);

    noiseGain.gain.setValueAtTime(clickVolume * 0.9, now);
    noiseGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + clickDuration
    );

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(context.destination);
    noiseSource.start(now);
    noiseSource.stop(now + clickDuration);
  }

  function scheduleWheelTicks(context) {
    clearSoundTimers();

    const tickCount = 72;

    for (let index = 0; index < tickCount; index += 1) {
      const progress = index / (tickCount - 1);

      // Muy rápida al principio y con separaciones largas al final.
      const eased = 1 - Math.pow(1 - progress, 3.15);
      const when = 45 + eased * (SPIN_DURATION_MS - 210);

      const timerId = window.setTimeout(() => {
        playRatchetClick(context, progress);
      }, when);

      soundTimersRef.current.push(timerId);
    }
  }

  function playResultSound(context, segment) {
    if (!context || !soundEnabled) return;

    if (segment.jackpot) {
      [523, 659, 784, 1046, 1318].forEach((frequency, index) => {
        playTone(context, {
          frequency,
          duration: 0.34,
          volume: 0.12,
          delay: index * 0.11,
        });
      });
      return;
    }

    if (segment.bonus) {
      [392, 523, 659, 784].forEach((frequency, index) => {
        playTone(context, {
          frequency,
          duration: 0.24,
          volume: 0.1,
          type: "square",
          delay: index * 0.1,
        });
      });
      return;
    }

    if (segment.multiplier || segment.value > 0) {
      [523, 659, 784].forEach((frequency, index) => {
        playTone(context, {
          frequency,
          duration: 0.22,
          volume: 0.095,
          delay: index * 0.09,
        });
      });
      return;
    }

    playTone(context, {
      frequency: 155,
      duration: 0.32,
      volume: 0.08,
      type: "sawtooth",
    });
  }

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        window.clearTimeout(spinTimeoutRef.current);
      }

      clearSoundTimers();

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  function updateCredits(nextCredits) {
    const safeCredits = Math.max(0, Math.floor(Number(nextCredits) || 0));

    setLocalCredits(safeCredits);
    onCreditsChange?.(safeCredits);
  }

  async function refreshCredits() {
    if (!player?.id) return;

    const { data, error } = await supabase
      .from("players")
      .select("credits")
      .eq("id", player.id)
      .single();

    if (error) {
      console.error("No se pudo actualizar el saldo de Wheel:", error);
      return;
    }

    updateCredits(data?.credits ?? 0);
  }

  useEffect(() => {
    const propCredits = externalCredits ?? player?.credits;

    if (Number.isFinite(Number(propCredits))) {
      setLocalCredits(Math.max(0, Math.floor(Number(propCredits))));
    }

    if (player?.id) {
      refreshCredits();
    }
    // Solo al entrar o cambiar de jugador.
    // No depende de player.credits para evitar pisar el descuento visual.
  }, [player?.id]);

  function calculatePrize(segment, currentBet) {
    if (segment.jackpot) return currentBet * 10;
    if (segment.bonus) return currentBet * 3;
    if (segment.multiplier) return currentBet * segment.multiplier;

    // Los números de la rueda están calculados sobre una apuesta base de 100.
    // Ejemplos:
    // apuesta 100 + casillero 100 = premio 100
    // apuesta 2500 + casillero 100 = premio 2500
    // apuesta 2500 + casillero 200 = premio 5000
    if (segment.value > 0) {
      const prizeMultiplier = segment.value / BASE_BET;
      return Math.floor(currentBet * prizeMultiplier);
    }

    return 0;
  }

  function calculateTotalLoss(segment, currentBet, availableCredits) {
    const requestedLoss = segment.lossBet
      ? currentBet
      : Math.max(0, Number(segment.loss) || 0);

    return Math.min(requestedLoss, Math.max(0, availableCredits));
  }

  function selectChip(value) {
    if (spinning) return;
    setBet(value <= credits ? value : credits);
  }

  function clearBet() {
    if (spinning) return;
    setBet(0);
  }

  function repeatBet() {
    if (spinning) return;
    setBet(Math.min(lastBet || 100, credits));
  }

  function doubleBet() {
    if (spinning) return;
    setBet(Math.min(Math.max(100, bet * 2), credits));
  }

  async function spinWheel() {
    if (spinning || bet <= 0 || bet > credits) return;

    const currentBet = bet;
    const creditsAfterBet = credits - currentBet;

    setLastBet(currentBet);
    setLastPrize(0);

    // Descuento visual inmediato solo dentro de Wheel.
    // No actualizamos App todavía para evitar que vuelva a cargar
    // el saldo anterior desde Supabase mientras la rueda gira.
    setLocalCredits(creditsAfterBet);

    setSpinning(true);
    setResult(null);

    if (spinTimeoutRef.current) {
      window.clearTimeout(spinTimeoutRef.current);
    }

    let audioContext = null;

    try {
      audioContext = await ensureAudioContext();
      playSpinStart(audioContext);
      scheduleWheelTicks(audioContext);
    } catch (error) {
      console.error("No se pudo iniciar el sonido de Wheel:", error);
    }

    const selectedIndex = Math.floor(Math.random() * SEGMENTS.length);
    const extraTurns = 7 + Math.floor(Math.random() * 3);
    const segmentCenter = selectedIndex * segmentAngle + segmentAngle / 2;

    const currentNormalized =
      ((currentRotationRef.current % 360) + 360) % 360;
    const desiredNormalized = (360 - segmentCenter + 360) % 360;
    const alignmentDelta =
      (desiredNormalized - currentNormalized + 360) % 360;

    const targetRotation =
      currentRotationRef.current + extraTurns * 360 + alignmentDelta;

    currentRotationRef.current = targetRotation;
    setRotation(targetRotation);

    spinTimeoutRef.current = window.setTimeout(async () => {
      const selectedSegment = SEGMENTS[selectedIndex];
      const prize = calculatePrize(selectedSegment, currentBet);
      const totalLoss =
        selectedSegment.lossBet || selectedSegment.loss > 0
          ? calculateTotalLoss(selectedSegment, currentBet, credits)
          : currentBet;
      const isPenalty = selectedSegment.lossBet || selectedSegment.loss > 0;

      setResult(selectedSegment);
      setLastPrize(prize);
      setHistory((current) => [
        {
          id: `${Date.now()}-${selectedIndex}`,
          label: selectedSegment.label,
          prize,
          loss: isPenalty ? totalLoss : 0,
        },
        ...current,
      ].slice(0, 8));
      try {
        if (player?.id) {
          const { data: resultData, error: resultError } = await supabase.rpc(
            "apply_game_result",
            {
              p_bet: totalLoss,
              p_win: prize,
              p_is_free_spin: false,
            }
          );

          if (resultError) {
            console.error("No se pudo guardar la jugada de Wheel:", resultError);
            await refreshCredits();
          } else if (resultData?.length) {
            updateCredits(resultData[0].credits_after);
          } else {
            await refreshCredits();
          }
        } else {
          // Modo local de respaldo para desarrollo.
          updateCredits(Math.max(0, credits - totalLoss + prize));
        }
      } catch (error) {
        console.error("Error al registrar la jugada de Wheel:", error);
        await refreshCredits();
      } finally {
        setSpinning(false);
        playResultSound(audioContextRef.current, selectedSegment);
        spinTimeoutRef.current = null;
        clearSoundTimers();
      }
    }, SPIN_DURATION_MS);
  }

  const chipValues = [100, 200, 500, 1000, 2500];

  return (
    <main className="fortune-wheel-page">
      <section className="fortune-wheel-machine">
        <div className="fortune-wheel-topbar">
          <button
            type="button"
            className="fortune-wheel-back-button"
            onClick={onBack}
            disabled={!onBack || spinning}
          >
            ← LOBBY
          </button>

          <div className="fortune-wheel-brand">
            <span>JACKPOT PALACE</span>
            <strong>FORTUNE WHEEL</strong>
          </div>

          <button
            type="button"
            className="fortune-wheel-sound-button"
            onClick={async () => {
              const nextValue = !soundEnabled;
              setSoundEnabled(nextValue);

              if (nextValue) {
                try {
                  const context = await ensureAudioContext();
                  playTone(context, {
                    frequency: 660,
                    duration: 0.12,
                    volume: 0.07,
                  });
                } catch (error) {
                  console.error("No se pudo activar el sonido:", error);
                }
              }
            }}
            aria-label={soundEnabled ? "Apagar sonido" : "Encender sonido"}
            title={soundEnabled ? "Apagar sonido" : "Encender sonido"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>

        <div className="fortune-wheel-dashboard">
          <div>
            <span>CRÉDITOS</span>
            <strong>{credits.toLocaleString("es-AR")}</strong>
          </div>
          <div>
            <span>APUESTA</span>
            <strong>{bet.toLocaleString("es-AR")}</strong>
          </div>
          <div>
            <span>ÚLTIMO PREMIO</span>
            <strong>{lastPrize.toLocaleString("es-AR")}</strong>
          </div>
        </div>

        <div className="fortune-wheel-game-layout">
          <aside className="fortune-wheel-left-column">
            <section className="fortune-wheel-history-panel">
            <span className="fortune-wheel-section-title">ÚLTIMOS GIROS</span>
            <div className="fortune-wheel-history-list">
              {history.length === 0 ? (
                <p>Sin jugadas</p>
              ) : (
                history.map((item) => (
                  <div className="fortune-wheel-history-item" key={item.id}>
                    <strong>{item.label}</strong>
                    <span>
                      {item.prize > 0
                        ? `+${item.prize}`
                        : item.loss > 0
                          ? `-${item.loss}`
                          : "0"}
                    </span>
                  </div>
                ))
              )}
            </div>
            </section>

            <section className="fortune-wheel-rules-panel">
              <span className="fortune-wheel-section-title">REGLAS</span>
              <div className="fortune-wheel-rule-row"><b>X1 / X2 / X5 / X10</b><span>multiplican la apuesta</span></div>
              <div className="fortune-wheel-rule-row"><b>B X3</b><span>bonus: paga 3 veces</span></div>
              <div className="fortune-wheel-rule-row"><b>JP X10</b><span>jackpot: paga 10 veces</span></div>
              <div className="fortune-wheel-rule-row"><b>PIERDE</b><span>pierde la apuesta</span></div>
            </section>
          </aside>

          <div className="fortune-wheel-main-area">
            <div className="fortune-wheel-stage">
              <div className="fortune-wheel-pointer" aria-hidden="true">
                ▼
              </div>

              <div className="fortune-wheel-lights-ring" aria-hidden="true" />
              <div className="fortune-wheel-shine" aria-hidden="true" />

              <div
                className={`fortune-wheel-disc${spinning ? " is-spinning" : ""}`}
                style={{
                  background: wheelBackground,
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                <svg
                  className="fortune-wheel-labels"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >
                  {SEGMENTS.map((segment, index) => {
                    const angle = index * segmentAngle + segmentAngle / 2;
                    const radians = ((angle - 90) * Math.PI) / 180;
                    // Texto radial centrado dentro de cada casillero.
                    const radius = 38;
                    const x = 50 + Math.cos(radians) * radius;
                    const y = 50 + Math.sin(radians) * radius;

                    let textRotation = angle - 90;
                    if (angle > 180) {
                      textRotation += 180;
                    }

                    const labelFontSize =
                      segment.jackpot || segment.bonus
                        ? 1.9
                        : segment.lossBet
                          ? 1.75
                          : segment.label.length >= 5
                            ? 1.7
                            : 2.35;

                    return (
                      <text
                        key={`${segment.label}-${index}`}
                        className={getSegmentClass(segment)}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textRotation} ${x} ${y})`}
                        style={{
                          fontSize: `${labelFontSize}px`,
                          fontWeight: 900,
                          letterSpacing: "0px",
                          paintOrder: "stroke fill",
                          stroke: "rgba(0, 0, 0, 0.95)",
                          strokeWidth: 0.30,
                          strokeLinejoin: "round",
                        }}
                      >
                        {segment.label}
                      </text>
                    );
                  })}
                </svg>

                <div className="fortune-wheel-center">
                  <span>JP</span>
                  <strong>PALACE</strong>
                </div>
              </div>
            </div>

            <div
              className={`fortune-wheel-result${lastPrize > 0 ? " is-win" : ""}`}
              aria-live="polite"
            >
              {result
                ? lastPrize > 0
                  ? `${result.label} · GANASTE ${lastPrize.toLocaleString("es-AR")}`
                  : result.lossBet || result.loss > 0
                    ? `${result.label} · PÉRDIDA APLICADA`
                    : `${result.label} · SIN PREMIO`
                : spinning
                  ? "LA RUEDA ESTÁ GIRANDO..."
                  : "ELEGÍ TU FICHA Y GIRÁ"}
            </div>
          </div>

          <aside className="fortune-wheel-info-column">
            <section className="fortune-wheel-info-panel">
              <span className="fortune-wheel-section-title">INFORMACIÓN</span>
              <div className="fortune-wheel-info-row"><i>✦</i><b>MULTIPLICA</b><strong>X1 a X10</strong></div>
              <div className="fortune-wheel-info-row"><i>🎁</i><b>BONUS</b><strong>X3</strong></div>
              <div className="fortune-wheel-info-row"><i>♦</i><b>JACKPOT</b><strong>X10</strong></div>
              <div className="fortune-wheel-info-row"><i>−</i><b>PÉRDIDAS</b><strong>hasta 4.000</strong></div>
            </section>

            <section className="fortune-wheel-status-panel">
              <span className="fortune-wheel-section-title">ESTADO DE JUEGO</span>
              <div><span>APUESTA</span><strong>{bet.toLocaleString("es-AR")}</strong></div>
              <div><span>DISPONIBLE</span><strong>{credits.toLocaleString("es-AR")}</strong></div>
              <div><span>GIROS</span><strong>{history.length}</strong></div>
            </section>
          </aside>
        </div>

        <section className="fortune-wheel-betting-panel">
          <span className="fortune-wheel-section-title">SELECCIONÁ TU APUESTA</span>

          <div className="fortune-wheel-chips">
            {chipValues.map((value) => (
              <button
                type="button"
                key={value}
                className={`fortune-wheel-chip${bet === value ? " is-selected" : ""}`}
                onClick={() => selectChip(value)}
                disabled={spinning || value > credits}
              >
                {value.toLocaleString("es-AR")}
              </button>
            ))}
          </div>

          <div className="fortune-wheel-actions">
            <button
              type="button"
              className="fortune-wheel-action-button"
              onClick={clearBet}
              disabled={spinning || bet === 0}
            >
              LIMPIAR
            </button>

            <button
              type="button"
              className="fortune-wheel-action-button"
              onClick={repeatBet}
              disabled={spinning || credits <= 0}
            >
              REPETIR
            </button>

            <button
              type="button"
              className="fortune-wheel-action-button"
              onClick={doubleBet}
              disabled={spinning || credits <= 0}
            >
              DOBLAR
            </button>

            <button
              type="button"
              className="fortune-wheel-spin-button"
              onClick={spinWheel}
              disabled={spinning || bet <= 0 || bet > credits}
            >
              {spinning ? "GIRANDO..." : "GIRAR"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
