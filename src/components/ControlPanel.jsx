export default function ControlPanel({
  bet,
  setBet,
  spin,
  spinning,
  freeSpins,
}) {
  return (
    <div className="controls">
      <button
        onClick={() => setBet(Math.max(10, bet - 10))}
        disabled={spinning}
      >
        ➖
      </button>

      <div className="bet-box">
        <span>Apuesta</span>
        <strong>${bet}</strong>
      </div>

      <button
        onClick={() => setBet(bet + 10)}
        disabled={spinning}
      >
        ➕
      </button>

      <button
        className="spin-button"
        onClick={spin}
        disabled={spinning}
      >
        {freeSpins > 0 ? "🎁 FREE SPIN" : "🎰 GIRAR"}
      </button>
    </div>
  );
}