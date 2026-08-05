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
};

export default function GameLoader({ gameId }) {
  const game = GAME_INFO[gameId] ?? {
    title: "CASINO",
    subtitle: "Cargando juego...",
    icon: "🎰",
    theme: "default",
  };

  return (
    <main className={`game-loader game-loader-${game.theme}`}>
      <section className="game-loader-card" aria-live="polite">
        <div className="game-loader-icon" aria-hidden="true">
          {game.icon}
        </div>

        <h1>{game.title}</h1>
        <p>{game.subtitle}</p>

        <div className="game-loader-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
