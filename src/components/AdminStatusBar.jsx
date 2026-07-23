import "./AdminStatusBar.css";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("es-AR");
}

export default function AdminStatusBar({
  jackpot,
  totalPlayers,
  loading,
}) {
  return (
    <section className="admin-status-bar">
      <div className="admin-status-item">
        <span className="status-dot"></span>

        <div>
          <small>SISTEMA</small>
          <strong>{loading ? "ACTUALIZANDO" : "ONLINE"}</strong>
        </div>
      </div>

      <div className="admin-status-item">
        <span className="status-icon">💰</span>

        <div>
          <small>JACKPOT</small>
          <strong>{formatNumber(jackpot)}</strong>
        </div>
      </div>

      <div className="admin-status-item">
        <span className="status-icon">👥</span>

        <div>
          <small>JUGADORES REGISTRADOS</small>
          <strong>{formatNumber(totalPlayers)}</strong>
        </div>
      </div>

      <div className="admin-status-item">
        <span className="status-icon">🔄</span>

        <div>
          <small>ACTUALIZACIÓN</small>
          <strong>CADA 15 SEGUNDOS</strong>
        </div>
      </div>
    </section>
  );
}