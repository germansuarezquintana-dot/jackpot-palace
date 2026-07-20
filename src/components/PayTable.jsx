export default function PayTable() {
  const prizes = [
    { symbol: "7️⃣", x3: 500, x4: 1000, x5: 2500 },
    { symbol: "💎", x3: 300, x4: 700, x5: 1500 },
    { symbol: "⭐", x3: 200, x4: 500, x5: 1000 },
    { symbol: "🔔", x3: 150, x4: 300, x5: 700 },
    { symbol: "🍒", x3: 100, x4: 200, x5: 500 },
    { symbol: "🍋", x3: 50, x4: 100, x5: 250 },
  ];

  return (
    <div className="paytable">
      <h2>Tabla de premios</h2>

      <div className="paytable-grid">
        <strong>Símbolo</strong>
        <strong>3 iguales</strong>
        <strong>4 iguales</strong>
        <strong>5 iguales</strong>

        {prizes.map((prize) => (
          <div className="paytable-row" key={prize.symbol}>
            <span className="paytable-symbol">{prize.symbol}</span>
            <span>{prize.x3}</span>
            <span>{prize.x4}</span>
            <span>{prize.x5}</span>
          </div>
        ))}
      </div>
    </div>
  );
}