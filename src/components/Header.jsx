export default function Header({
  balance,
  jackpot,
  freeSpins,
}) {
  return (
    <div className="header">
      <div className="panel">
        <span>💰 Créditos</span>
        <strong>{balance}</strong>
      </div>

      <div className="panel jackpot">
        <span>🏆 Jackpot</span>
        <strong>${jackpot}</strong>
      </div>

      <div className="panel">
        <span>🎁 Free Spins</span>
        <strong>{freeSpins}</strong>
      </div>
    </div>
  );
}