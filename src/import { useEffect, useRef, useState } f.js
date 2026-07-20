import { useEffect, useRef, useState } from "react";

const symbols = ["🍒", "🍋", "🔔", "⭐", "7️⃣", "💎"];

const prizes = {
  "🍒🍒🍒": 20,
  "🍋🍋🍋": 30,
  "🔔🔔🔔": 50,
  "⭐⭐⭐": 80,
  "7️⃣7️⃣7️⃣": 150,
  "💎💎💎": 300,
};

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

export default function App() {
  const [reels, setReels] = useState(["7️⃣", "7️⃣", "7️⃣"]);
  const [credits, setCredits] = useState(1000);
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("¡Bienvenido a Retro Spin!");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [winning, setWinning] = useState(false);

  const audioContextRef = useRef(null);
  const intervalsRef = useRef([]);

  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(clearInterval);

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  function getAudioContext() {
    if (!audioContextRef.current) {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (AudioContext) {
        audioContextRef.current = new AudioContext();
      }
    }

    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  function playTone(frequency, duration, type = "sine", volume = 0.08) {
    if (!soundEnabled) return;

    const audioContext = getAudioContext();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
      frequency,
      audioContext.currentTime
    );

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  }

  function playSpinSound() {
    playTone(180, 0.08, "square", 0.04);

    setTimeout(() => {
      playTone(220, 0.08, "square", 0.04);
    }, 90);

    setTimeout(() => {
      playTone(270, 0.08, "square", 0.04);
    }, 180);
  }

  function playStopSound(reelIndex) {
    playTone(300 + reelIndex * 100, 0.12, "triangle", 0.07);
  }

  function playWinSound() {
    const notes = [523, 659, 784, 1046];

    notes.forEach((note, index) => {
      setTimeout(() => {
        playTone(note, 0.25, "sine", 0.1);
      }, index * 130);
    });
  }

  function changeBet(amount) {
    if (spinning) return;

    setBet((currentBet) => {
      const newBet = currentBet + amount;

      if (newBet < 10) return 10;
      if (newBet > 100) return 100;
      if (newBet > credits) return currentBet;

      return newBet;
    });
  }

  function evaluateResult(finalReels) {
    const combination = finalReels.join("");
    const prizeMultiplier = prizes[combination] || 0;

    if (prizeMultiplier > 0) {
      const prize = bet * prizeMultiplier;

      setCredits((currentCredits) => currentCredits + prize);
      setMessage(`🎉 ¡GANASTE ${prize} CRÉDITOS!`);
      setWinning(true);
      playWinSound();

      setTimeout(() => {
        setWinning(false);
      }, 1800);

      return;
    }

    const uniqueSymbols = new Set(finalReels);

    if (uniqueSymbols.size === 2) {
      const consolationPrize = bet * 2;

      setCredits((currentCredits) => currentCredits + consolationPrize);
      setMessage(`✨ Premio doble: ${consolationPrize} créditos`);
      playTone(500, 0.25, "sine", 0.08);

      return;
    }

    setMessage("No hubo premio. ¡Probá otra vez!");
  }

  function spin() {
    if (spinning) return;

    if (credits < bet) {
      setMessage("No tenés créditos suficientes.");
      playTone(120, 0.3, "sawtooth", 0.08);
      return;
    }

    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];

    setCredits((currentCredits) => currentCredits - bet);
    setSpinning(true);
    setWinning(false);
    setMessage("Girando...");
    playSpinSound();

    const finalReels = [
      randomSymbol(),
      randomSymbol(),
      randomSymbol(),
    ];

    for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
      const interval = setInterval(() => {
        setReels((currentReels) => {
          const newReels = [...currentReels];
          newReels[reelIndex] = randomSymbol();
          return newReels;
        });
      }, 75);

      intervalsRef.current.push(interval);

      const stopTime = 1200 + reelIndex * 550;

      setTimeout(() => {
        clearInterval(interval);

        setReels((currentReels) => {
          const newReels = [...currentReels];
          newReels[reelIndex] = finalReels[reelIndex];
          return newReels;
        });

        playStopSound(reelIndex);

        if (reelIndex === 2) {
          setTimeout(() => {
            setSpinning(false);
            evaluateResult(finalReels);
          }, 250);
        }
      }, stopTime);
    }
  }

  function resetGame() {
    if (spinning) return;

    setCredits(1000);
    setBet(10);
    setReels(["7️⃣", "7️⃣", "7️⃣"]);
    setMessage("Juego reiniciado.");
    setWinning(false);

    playTone(440, 0.15, "sine", 0.07);
  }

  const styles = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "Arial, Helvetica, sans-serif",
      background:
        "radial-gradient(circle at top, #3a164f 0%, #160922 45%, #050308 100%)",
      color: "#ffffff",
      boxSizing: "border-box",
    },

    machine: {
      width: "100%",
      maxWidth: "560px",
      padding: "24px",
      borderRadius: "30px",
      background:
        "linear-gradient(145deg, #4c146b, #22052e 45%, #100216)",
      border: "5px solid #f7c948",
      boxShadow:
        "0 0 20px rgba(255, 205, 60, 0.7), 0 25px 60px rgba(0, 0, 0, 0.65)",
      textAlign: "center",
      boxSizing: "border-box",
    },

    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      marginBottom: "10px",
    },

    title: {
      margin: 0,
      fontSize: "clamp(32px, 8vw, 58px)",
      fontWeight: "900",
      letterSpacing: "2px",
      color: "#ffd84d",
      textShadow:
        "0 3px 0 #b54b00, 0 0 18px rgba(255, 217, 77, 0.8)",
    },

    subtitle: {
      marginTop: "0",
      marginBottom: "22px",
      fontSize: "15px",
      letterSpacing: "4px",
      color: "#ff8ee7",
      fontWeight: "bold",
    },

    soundButton: {
      border: "2px solid #ffd84d",
      background: "#1b071f",
      color: "#ffffff",
      borderRadius: "50%",
      width: "48px",
      height: "48px",
      fontSize: "22px",
      cursor: "pointer",
      flexShrink: 0,
    },

    information: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
      marginBottom: "20px",
    },

    infoBox: {
      padding: "12px",
      borderRadius: "14px",
      background: "rgba(0, 0, 0, 0.35)",
      border: "1px solid rgba(255, 216, 77, 0.45)",
    },

    infoLabel: {
      display: "block",
      fontSize: "12px",
      color: "#e8a9f5",
      letterSpacing: "1px",
      marginBottom: "4px",
    },

    infoValue: {
      fontSize: "25px",
      fontWeight: "900",
      color: "#ffffff",
    },

    reelsFrame: {
      padding: "18px",
      borderRadius: "22px",
      background: "#08060a",
      border: "4px solid #d99118",
      boxShadow:
        "inset 0 0 18px rgba(255, 198, 50, 0.25)",
      marginBottom: "18px",
    },

    reels: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "10px",
    },

    reel: {
      height: "130px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: "16px",
      background:
        "linear-gradient(180deg, #dedede 0%, #ffffff 48%, #d6d6d6 100%)",
      border: "4px solid #a9a9a9",
      boxShadow:
        "inset 0 8px 12px rgba(0, 0, 0, 0.2), inset 0 -8px 12px rgba(0, 0, 0, 0.2)",
      fontSize: "clamp(48px, 12vw, 76px)",
      transform: spinning ? "scaleY(1.04)" : "scaleY(1)",
      filter: spinning ? "blur(1.4px)" : "none",
      transition: "filter 0.15s, transform 0.15s",
    },

    message: {
      minHeight: "32px",
      margin: "12px 0 18px",
      fontSize: "18px",
      fontWeight: "bold",
      color: winning ? "#fff56b" : "#ffffff",
      textShadow: winning
        ? "0 0 12px #ffb300, 0 0 24px #ff5f00"
        : "none",
      transform: winning ? "scale(1.08)" : "scale(1)",
      transition: "all 0.25s",
    },

    betControls: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      marginBottom: "16px",
    },

    smallButton: {
      width: "50px",
      height: "45px",
      borderRadius: "12px",
      border: "2px solid #f6ca45",
      background: "#291033",
      color: "#ffffff",
      fontSize: "25px",
      fontWeight: "bold",
      cursor: spinning ? "not-allowed" : "pointer",
      opacity: spinning ? 0.55 : 1,
    },

    betText: {
      minWidth: "120px",
      fontSize: "18px",
      fontWeight: "bold",
    },

    spinButton: {
      width: "100%",
      padding: "17px",
      border: "none",
      borderRadius: "18px",
      fontSize: "25px",
      fontWeight: "900",
      letterSpacing: "2px",
      cursor: spinning ? "not-allowed" : "pointer",
      color: "#2a1000",
      background: spinning
        ? "#8c8c8c"
        : "linear-gradient(180deg, #fff374, #f5ae00)",
      boxShadow: spinning
        ? "none"
        : "0 7px 0 #a84b00, 0 0 22px rgba(255, 209, 56, 0.65)",
      transform: spinning ? "translateY(5px)" : "translateY(0)",
    },

    resetButton: {
      marginTop: "16px",
      border: "none",
      background: "transparent",
      color: "#d6b7e2",
      textDecoration: "underline",
      cursor: "pointer",
      fontSize: "14px",
    },

    payTable: {
      marginTop: "22px",
      padding: "14px",
      borderRadius: "14px",
      background: "rgba(0, 0, 0, 0.28)",
      fontSize: "13px",
      lineHeight: "1.7",
      color: "#eadcf0",
    },
  };

  return (
    <main style={styles.page}>
      <section style={styles.machine}>
        <div style={styles.topBar}>
          <div style={{ width: "48px" }} />

          <h1 style={styles.title}>RETRO SPIN</h1>

          <button
            type="button"
            style={styles.soundButton}
            onClick={() => setSoundEnabled((current) => !current)}
            title={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>

        <p style={styles.subtitle}>CASINO RETRO</p>

        <div style={styles.information}>
          <div style={styles.infoBox}>
            <span style={styles.infoLabel}>CRÉDITOS</span>
            <strong style={styles.infoValue}>{credits}</strong>
          </div>

          <div style={styles.infoBox}>
            <span style={styles.infoLabel}>APUESTA</span>
            <strong style={styles.infoValue}>{bet}</strong>
          </div>
        </div>

        <div style={styles.reelsFrame}>
          <div style={styles.reels}>
            {reels.map((symbol, index) => (
              <div
                key={index}
                style={{
                  ...styles.reel,
                  animation: winning
                    ? "retroWin 0.35s infinite alternate"
                    : "none",
                }}
              >
                {symbol}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.message}>{message}</div>

        <div style={styles.betControls}>
          <button
            type="button"
            style={styles.smallButton}
            onClick={() => changeBet(-10)}
            disabled={spinning}
          >
            −
          </button>

          <div style={styles.betText}>Apuesta: {bet}</div>

          <button
            type="button"
            style={styles.smallButton}
            onClick={() => changeBet(10)}
            disabled={spinning}
          >
            +
          </button>
        </div>

        <button
          type="button"
          style={styles.spinButton}
          onClick={spin}
          disabled={spinning}
        >
          {spinning ? "GIRANDO..." : "🎰 GIRAR"}
        </button>

        <button
          type="button"
          style={styles.resetButton}
          onClick={resetGame}
          disabled={spinning}
        >
          Reiniciar créditos
        </button>

        <div style={styles.payTable}>
          <strong>PREMIOS</strong>
          <br />
          🍒🍒🍒 ×20 · 🍋🍋🍋 ×30 · 🔔🔔🔔 ×50
          <br />
          ⭐⭐⭐ ×80 · 7️⃣7️⃣7️⃣ ×150 · 💎💎💎 ×300
          <br />
          Dos símbolos iguales: premio ×2
        </div>

        <style>
          {`
            @keyframes retroWin {
              from {
                transform: scale(1);
                box-shadow:
                  inset 0 8px 12px rgba(0, 0, 0, 0.2),
                  inset 0 -8px 12px rgba(0, 0, 0, 0.2),
                  0 0 5px #ffd84d;
              }

              to {
                transform: scale(1.06);
                box-shadow:
                  inset 0 8px 12px rgba(0, 0, 0, 0.2),
                  inset 0 -8px 12px rgba(0, 0, 0, 0.2),
                  0 0 28px #fff351;
              }
            }

            * {
              box-sizing: border-box;
            }

            button {
              font-family: inherit;
            }

            button:active {
              transform: translateY(3px);
            }

            @media (max-width: 480px) {
              body {
                margin: 0;
              }
            }
          `}
        </style>
      </section>
    </main>
  );
}