import "./DashboardCards.css";
function formatNumber(value, maximumFractionDigits = 0) {
  return Number(value || 0).toLocaleString("es-AR", {
    maximumFractionDigits,
  });
}

export default function DashboardCards({ dashboard, jackpot }) {
  const balancePositive = dashboard.casinoBalance >= 0;

  const cards = [
    {
      icon: "👥",
      label: "JUGADORES",
      value: formatNumber(dashboard.totalPlayers),
      detail: `${formatNumber(dashboard.activePlayers)} activos`,
      className: "dashboard-card players-card",
    },
    {
      icon: "💰",
      label: "JACKPOT ACTUAL",
      value: formatNumber(jackpot),
      detail: "Premio progresivo",
      className: "dashboard-card jackpot-card",
    },
    {
      icon: "🎰",
      label: "GIROS TOTALES",
      value: formatNumber(dashboard.totalSpins),
      detail: `Promedio: ${formatNumber(dashboard.averageBet, 2)} créditos`,
      className: "dashboard-card spins-card",
    },
    {
      icon: "📈",
      label: "RTP GLOBAL",
      value: `${formatNumber(dashboard.rtp, 2)} %`,
      detail: "Premios sobre apuestas",
      className: "dashboard-card rtp-card",
    },
    {
      icon: balancePositive ? "💵" : "📉",
      label: "BALANCE DEL CASINO",
      value: `${balancePositive ? "+" : ""}${formatNumber(
        dashboard.casinoBalance
      )}`,
      detail: `Apostado: ${formatNumber(dashboard.totalBet)}`,
      className: `dashboard-card balance-card ${
        balancePositive ? "positive" : "negative"
      }`,
    },
  ];

  return (
    <section className="dashboard-cards">
      {cards.map((card) => (
        <article className={card.className} key={card.label}>
          <div className="dashboard-card-icon">{card.icon}</div>

          <div className="dashboard-card-content">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </div>
        </article>
      ))}
    </section>
  );
}
