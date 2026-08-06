import { useEffect } from "react";
import "./GameLoader.css";

const GAME_INFO = {
  "neon-city": {
    title: "NEON CITY",
    subtitle: "Encendiendo la ciudad...",
    icon: "🌆",
    theme: "neon",
  },
  wheel: {
    title: "LUCKY WHEEL",
    subtitle: "Preparando la rueda...",
    icon: "🎡",
    theme: "wheel",
  },
  "jackpot-palace": {
    title: "JACKPOT PALACE",
    subtitle: "Abriendo el casino...",
    icon: "👑",
    theme: "jackpot",
  },
  "clown-party": {
    title: "CLOWN PARTY",
    subtitle: "Preparando el espectáculo...",
    icon: "🤡",
    theme: "clown",
  },
  "diamond-fortune": {
    title: "DIAMOND FORTUNE",
    subtitle: "Cargando diamantes...",
    icon: "💎",
    theme: "diamond",
  },
    "wild-west": {
    title: "WILD WEST",
    subtitle: "Cabalgando hacia el Viejo Oeste...",
    icon: "🤠",
    theme: "wildwest",
  },
};

export default function GameLoader({ gameId, onReady }) {
 useEffect(() => {
  console.log("GAME LOADER");
  console.log(gameId);
  console.log(onReady);

  const timer = setTimeout(() => {
    console.log("EJECUTANDO onReady");
    onReady?.();
  }, 1200);

  return () => clearTimeout(timer);
}, []);

  const game = GAME_INFO[gameId] ?? {
    title: "CASINO",
    subtitle: "Cargando juego...",
    icon: "🎰",
    theme: "default",
  };

  return (
    <main className={`game-loader game-loader-${game.theme}`}>
      <section className="game-loader-card" aria-live="polite">
        <div className="game-loader-icon">
          {game.icon}
        </div>

        <h1>{game.title}</h1>
        <p>{game.subtitle}</p>

        <div className="game-loader-dots">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}