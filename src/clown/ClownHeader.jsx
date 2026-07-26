export default function ClownHeader({
  displayCredits,
  bet,
  lastPrize,
  freeSpins,
  soundEnabled,
  onToggleSound,
}) {
  return (
    <>
      <button
        type="button"
        className="clown-sound-button"
        onClick={onToggleSound}
        title={soundEnabled ? "Apagar sonido" : "Encender sonido"}
      >
        {soundEnabled ? "🔊" : "🔇"}
      </button>

      <header className="clown-header">

        <div className="clown-marquee-wing clown-marquee-wing-left">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>

        <div className="clown-title-wrap">
          <div className="clown-title-halo" />

          <p className="clown-kicker">
            JACKPOT PALACE PRESENTA
          </p>

          <h1>CLOWN PARTY</h1>

          <p className="clown-subtitle">
            PAYASOS · CIRCO · PREMIOS SORPRESA
          </p>
        </div>

        <div className="clown-marquee-wing clown-marquee-wing-right">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} />
          ))}
        </div>

      </header>

      <div className="clown-prize-panel">

        <div>
          <span>CRÉDITOS</span>
          <strong>{displayCredits.toLocaleString("es-AR")}</strong>
        </div>

        <div>
          <span>APUESTA</span>
          <strong>{bet.toLocaleString("es-AR")}</strong>
        </div>

        <div>
          <span>PREMIO</span>
          <strong>{lastPrize.toLocaleString("es-AR")}</strong>
        </div>

        <div>
          <span>GIROS GRATIS</span>
          <strong className="clown-led-value clown-led-value-free">
            {freeSpins}
          </strong>
        </div>

      </div>
    </>
  );
}