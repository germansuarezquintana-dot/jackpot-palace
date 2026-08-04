import { useEffect, useRef } from "react";
import logoJackpotPalace from "./assets/logo-jackpot-palace.png";
import "./Lobby.css";
import lobbyMusic from "./assets/audio/lobby.mp3";
function playClickSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type="square";
    osc.frequency.value=900;
    gain.gain.value=0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime+0.045);
    osc.onended=()=>ctx.close();
  } catch {}
}

const GAME_PREVIEWS = {
  "jackpot-palace": [
    ["💎", "7️⃣", "👑"],
    ["🍒", "🔔", "💎"],
    ["7️⃣", "👑", "🍒"],
  ],

  "clown-party": [
    ["🎈", "🤡", "⭐"],
    ["🍿", "🎭", "🍭"],
    ["⭐", "🎁", "🤡"],
  ],

 
  "neon-city": [
    ["🌆", "🤖", "⚡"],
    ["💎", "🚘", "💿"],
    ["🎧", "👑", "🛸"],
  ],

  "wild-west": [
    ["🤠", "⭐", "🐎"],
    ["💰", "🧲", "🤠"],
    ["⭐", "🐎", "💰"],
  ],
};

function WheelLobbyPreview() {
  const labels = ["100", "200", "500", "X2", "100", "BONUS", "200", "JP"];

  return (
    <div className="lobby-wheel-preview" aria-hidden="true">
      <div className="lobby-wheel-preview__pointer" />
      <div className="lobby-wheel-preview__glow" />
      <div className="lobby-wheel-preview__disc">
        {labels.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="lobby-wheel-preview__label"
            style={{
              "--wheel-label-angle": `${index * 45}deg`,
            }}
          >
            {label}
          </span>
        ))}

        <div className="lobby-wheel-preview__center">
          <strong>JP</strong>
          <small>WHEEL</small>
        </div>
      </div>
    </div>
  );
}

const games = [
  {
    id: "jackpot-palace",
    name: "Jackpot Palace",
    icon: "👑",
    subtitle: "JACKPOT PROGRESIVO",
    description: "Bonus, giros gratis y premios mayores.",
    theme: "gold",
    badge: "POPULAR",
    available: true,
  },
  {
    id: "clown-party",
    name: "Clown Party",
    icon: "🤡",
    subtitle: "FIESTA DE CIRCO",
    description: "Multiplicadores, bonus y premios sorpresa.",
    theme: "pink",
    badge: "NUEVO",
    available: true,
  },
  {
  id: "wheel",
  name: "Wheel",
  icon: "🎡",
  subtitle: "RUEDA DE PREMIOS",
  description: "Giros, multiplicadores, bonus y jackpot.",
  theme: "gold",
  badge: "NUEVO",
  available: true,
},
  
  
  {
    id: "neon-city",
    name: "Neon City",
    icon: "🌆",
    subtitle: "CYBER JACKPOT",
    description: "Ciudad futurista, neón y premios progresivos.",
    theme: "pink",
    badge: "NUEVO",
    available: true,
  },
  {
    id: "wild-west",
    name: "Wild West",
    icon: "★",
    subtitle: "RECOMPENSAS DEL OESTE",
    description: "Forajidos, duelos y grandes recompensas.",
    theme: "orange",
    badge: "PRÓXIMAMENTE",
    available: false,
  },
];

export default function Lobby({
  player,
  onOpenGame,
  onOpenAdmin,
  onLogout,
}) {
  const displayName =
    player?.display_name || player?.username || "Jugador";

  const roleLabel =
    player?.role === "super_admin"
      ? "SUPER ADMIN"
      : player?.role === "admin"
      ? "ADMINISTRADOR"
      : "JUGADOR";

  const isAdmin = ["super_admin", "admin"].includes(player?.role);

  const isAndroid =
    typeof navigator !== "undefined" &&
    /Android/i.test(navigator.userAgent);
const lobbyAudioRef = useRef(null);

useEffect(() => {
  const audio = new Audio(lobbyMusic);

  audio.loop = true;
  audio.volume = 0.15;
  lobbyAudioRef.current = audio;

  const startMusic = async () => {
    try {
      if (!audio.paused) return;
      await audio.play();
    } catch {}
  };

  startMusic();

  window.addEventListener("pointerdown", startMusic, { once: true });

  return () => {
    window.removeEventListener("pointerdown", startMusic);
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
    audio.removeAttribute("src");
    audio.load();
    lobbyAudioRef.current = null;
  };
}, []);
  return (
    <main
      className={
        isAndroid
          ? "grand-lobby-v2 grand-lobby-v2--android"
          : "grand-lobby-v2"
      }
    >
      <div className="grand-lobby-v2__spot grand-lobby-v2__spot--left" />
      <div className="grand-lobby-v2__spot grand-lobby-v2__spot--right" />
      <div className="grand-lobby-v2__mist grand-lobby-v2__mist--left" />
      <div className="grand-lobby-v2__mist grand-lobby-v2__mist--right" />

      <section className="grand-shell-v2">
        <div className="grand-shell-v2__neon" aria-hidden="true" />

        <div className="grand-shell-v2__bulbs grand-shell-v2__bulbs--top" aria-hidden="true">
          {Array.from({ length: 42 }).map((_, index) => (
            <span key={`top-${index}`} />
          ))}
        </div>

        <div className="grand-shell-v2__bulbs grand-shell-v2__bulbs--bottom" aria-hidden="true">
          {Array.from({ length: 42 }).map((_, index) => (
            <span key={`bottom-${index}`} />
          ))}
        </div>

        <header className="grand-header-v2">
          <section className="grand-profile-v2">
            <div className="grand-profile-v2__medallion">♛</div>

            <div>
              <span>BIENVENIDO</span>
              <strong>{displayName}</strong>
              <small>{roleLabel}</small>
            </div>
          </section>

          <section className="grand-brand-v2">
            <div className="grand-brand-v2__halo" aria-hidden="true" />
            <div className="grand-brand-v2__rays" aria-hidden="true" />

            <img
              src={logoJackpotPalace}
              alt="Jackpot Palace"
              className="grand-brand-v2__logo"
            />

            <div className="grand-brand-v2__caption">
              <span>✦</span>
              <strong>CASINO VIP</strong>
              <span>✦</span>
            </div>
          </section>

          <section className="grand-account-v2">
            <div className="grand-account-v2__balance">
              <span>CRÉDITOS</span>
              <strong>
                {(player?.credits ?? 0).toLocaleString("es-AR")}
              </strong>
            </div>

            <div className="grand-account-v2__actions">
              {isAdmin && (
                <button
                  type="button"
                  className="grand-action-v2 grand-action-v2--admin"
                  onClick={() => { playClickSound(); onOpenAdmin(); }}
                >
                  👑 PANEL
                </button>
              )}

              <button
                type="button"
                className="grand-action-v2 grand-action-v2--logout"
                onClick={() => { playClickSound(); onLogout(); }}
              >
                SALIR
              </button>
            </div>
          </section>
        </header>

        <div className="grand-title-v2">
          <span>✦</span>

          <div>
            <p>SELECCIÓN EXCLUSIVA</p>
            <h1>SALÓN DE JUEGOS</h1>
            <small>Elegí una máquina y empezá a jugar</small>
          </div>

          <span>✦</span>
        </div>

        <section className="grand-grid-v2">
          {games.map((game) => (
            <article
              key={game.id}
              className={[
                "grand-machine-v2",
                `grand-machine-v2--${game.theme}`,
                game.available
                  ? "grand-machine-v2--available"
                  : "grand-machine-v2--locked",
              ].join(" ")}
            >
              <div className="grand-machine-v2__neon" aria-hidden="true" />

              <div className="grand-machine-v2__bulbs" aria-hidden="true">
                {Array.from({ length: 24 }).map((_, index) => (
                  <span key={index} />
                ))}
              </div>

              <div className="grand-machine-v2__badge">{game.badge}</div>

              <div className="grand-machine-v2__marquee">
                <span>{game.subtitle}</span>
              </div>

              <div className="grand-machine-v2__screen">
                <div className="grand-machine-v2__glass" aria-hidden="true" />
                <div className="grand-machine-v2__halo" aria-hidden="true" />

                {game.id === "wheel" ? (
                  <div className="grand-machine-v2__icon grand-machine-v2__icon--preview grand-machine-v2__icon--wheel">
                    <WheelLobbyPreview />
                  </div>
                ) : (
                  <div className="grand-machine-v2__icon grand-machine-v2__icon--preview">
                    <div className="slot-preview">
                      {(GAME_PREVIEWS[game.id] ?? [[game.icon], [game.icon], [game.icon]]).map(
                        (reel, reelIndex) => (
                          <div className="slot-reel" key={`${game.id}-reel-${reelIndex}`}>
                            {reel.map((symbol, symbolIndex) => (
                              <span key={`${game.id}-${reelIndex}-${symbolIndex}`}>
                                {symbol}
                              </span>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                <h2>{game.name}</h2>
                <p>{game.description}</p>
              </div>

              <div className="grand-machine-v2__console">
                <button
                  type="button"
                  disabled={!game.available}
    onClick={() => {
    if (!game.available) return;
    onOpenGame(game.id);
}}
                >
                  <span>
                    {game.available ? "JUGAR AHORA" : "PRÓXIMAMENTE"}
                  </span>
                </button>

                <div className="grand-machine-v2__console-lights" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <span key={index} />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>

        <footer className="grand-footer-v2">
          <div>
            <span>◈</span>
            <p>
              <strong>CRÉDITOS COMPARTIDOS</strong>
              <small>Entre todas las máquinas</small>
            </p>
          </div>

          <div>
            <span>🛡</span>
            <p>
              <strong>SESIÓN PROTEGIDA</strong>
              <small>Acceso seguro</small>
            </p>
          </div>

          <div>
            <span>✦</span>
            <p>
              <strong>NUEVOS JUEGOS</strong>
              <small>Más máquinas próximamente</small>
            </p>
          </div>
        </footer>

        <div className="grand-lobby-v2__stamp">GRAND LOBBY V2</div>
      </section>
    </main>
  );
}
