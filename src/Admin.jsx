import { changePlayerPassword } from "./services/adminService";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./Admin.css";

const QUICK_AMOUNTS = [100, 500, 1000];

function formatNumber(value) {
  return Number(value || 0).toLocaleString("es-AR");
}

export default function Admin({ onClose }) {
  const [players, setPlayers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [message, setMessage] = useState("");
  const [customAmounts, setCustomAmounts] = useState({});
  const [reasons, setReasons] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
const [passwordPlayer, setPasswordPlayer] = useState(null);
const [newPassword, setNewPassword] = useState("");
const [changingPassword, setChangingPassword] = useState(false);
const [passwordError, setPasswordError] = useState("");
async function handleChangePassword() {
  if (!passwordPlayer) return;

  if (newPassword.trim().length < 8) {
    setPasswordError("La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  try {
    setChangingPassword(true);
    setPasswordError("");

    await changePlayerPassword(passwordPlayer.id, newPassword);

    setMessage(`Contraseña cambiada para ${passwordPlayer.display_name || passwordPlayer.username}`);

    setPasswordPlayer(null);
    setNewPassword("");
  } catch (err) {
    setPasswordError(err.message);
  } finally {
    setChangingPassword(false);
  }
}
async function loadAdminData() {
    setLoading(true);
    setMessage("");

    const [playersResult, transactionsResult] = await Promise.all([
      supabase
        .from("players")
        .select("id,username,display_name,credits,is_admin,is_blocked,total_bet,total_win,total_spins,created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("credit_transactions")
        .select("id,player_id,amount,transaction_type,admin_username,notes,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (playersResult.error) {
      setMessage(`Error al cargar jugadores: ${playersResult.error.message}`);
    } else {
      setPlayers(playersResult.data || []);
    }

    if (transactionsResult.error) {
      setMessage((current) => current || `Error al cargar historial: ${transactionsResult.error.message}`);
    } else {
      setTransactions(transactionsResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const dashboard = useMemo(() => ({
    totalPlayers: players.length,
    activePlayers: players.filter((player) => !player.is_blocked).length,
    blockedPlayers: players.filter((player) => player.is_blocked).length,
    totalCredits: players.reduce((sum, player) => sum + Number(player.credits || 0), 0),
    totalSpins: players.reduce((sum, player) => sum + Number(player.total_spins || 0), 0),
    totalBet: players.reduce((sum, player) => sum + Number(player.total_bet || 0), 0),
    totalWin: players.reduce((sum, player) => sum + Number(player.total_win || 0), 0),
  }), [players]);

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return players.filter((player) => {
      const matchesSearch = !term || [player.username, player.display_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !player.is_blocked) ||
        (filter === "blocked" && player.is_blocked) ||
        (filter === "admins" && player.is_admin);

      return matchesSearch && matchesFilter;
    });
  }, [players, search, filter]);

  const playerNames = useMemo(
    () => Object.fromEntries(players.map((player) => [player.id, player.display_name || player.username])),
    [players]
  );

  async function adjustCredits(player, amount) {
    if (!Number.isInteger(amount) || amount === 0) {
      setMessage("Ingresá un monto entero distinto de cero.");
      return;
    }

    if (amount < 0) {
      const absolute = Math.abs(amount);
      if (absolute > Number(player.credits || 0)) {
        setMessage("No podés descontar más créditos de los que tiene el jugador.");
        return;
      }
      if (!window.confirm(`¿Confirmás descontar ${formatNumber(absolute)} créditos a ${player.display_name || player.username}?`)) return;
    }

    setWorkingId(player.id);
    setMessage("");

    const customReason = (reasons[player.id] || "").trim();
    const note = customReason || (amount > 0
      ? "Carga desde panel de administración"
      : "Descuento desde panel de administración");

    const { error } = await supabase.rpc("admin_adjust_credits", {
      p_player_id: player.id,
      p_amount: amount,
      p_notes: note,
    });

    if (error) {
      setMessage(`No se pudieron actualizar los créditos: ${error.message}`);
    } else {
      setMessage(`Créditos de ${player.display_name || player.username} actualizados correctamente.`);
      setCustomAmounts((current) => ({ ...current, [player.id]: "" }));
      setReasons((current) => ({ ...current, [player.id]: "" }));
      await loadAdminData();
    }

    setWorkingId(null);
  }

  async function applyCustomAmount(player, sign) {
    const absoluteAmount = Math.abs(Number.parseInt(customAmounts[player.id], 10));
    if (!Number.isInteger(absoluteAmount) || absoluteAmount <= 0) {
      setMessage("Escribí un monto válido antes de confirmar.");
      return;
    }
    await adjustCredits(player, absoluteAmount * sign);
  }

  async function toggleBlocked(player) {
    const action = player.is_blocked ? "desbloquear" : "bloquear";
    if (!window.confirm(`¿Confirmás ${action} a ${player.display_name || player.username}?`)) return;

    setWorkingId(player.id);
    setMessage("");

    const { error } = await supabase.rpc("admin_set_player_blocked", {
      p_player_id: player.id,
      p_blocked: !player.is_blocked,
    });

    if (error) setMessage(`No se pudo cambiar el estado: ${error.message}`);
    else {
      setMessage(player.is_blocked ? "Jugador desbloqueado." : "Jugador bloqueado.");
      await loadAdminData();
    }
    setWorkingId(null);
  }

  function beginEdit(player) {
    setEditingId(player.id);
    setEditName(player.display_name || player.username || "");
  }

  async function savePlayerName(player) {
    const cleanName = editName.trim();
    if (cleanName.length < 2 || cleanName.length > 40) {
      setMessage("El nombre visible debe tener entre 2 y 40 caracteres.");
      return;
    }

    setWorkingId(player.id);
    const { error } = await supabase.rpc("admin_update_player_name", {
      p_player_id: player.id,
      p_display_name: cleanName,
    });

    if (error) setMessage(`No se pudo editar el nombre: ${error.message}`);
    else {
      setMessage("Nombre del jugador actualizado.");
      setEditingId(null);
      await loadAdminData();
    }
    setWorkingId(null);
  }

  return (
    <main className="admin-page">
      <section className="admin-card">
        <header className="admin-header">
          <div>
            <p>👑 JACKPOT PALACE</p>
            <h1>PANEL DE ADMINISTRACIÓN</h1>
          </div>
          <button className="admin-back" onClick={onClose}>VOLVER AL JUEGO</button>
        </header>

        <section className="dashboard-grid">
          <div><span>JUGADORES</span><strong>{formatNumber(dashboard.totalPlayers)}</strong></div>
          <div><span>ACTIVOS</span><strong>{formatNumber(dashboard.activePlayers)}</strong></div>
          <div><span>BLOQUEADOS</span><strong>{formatNumber(dashboard.blockedPlayers)}</strong></div>
          <div><span>CRÉDITOS TOTALES</span><strong>{formatNumber(dashboard.totalCredits)}</strong></div>
          <div><span>GIROS</span><strong>{formatNumber(dashboard.totalSpins)}</strong></div>
          <div><span>APOSTADO</span><strong>{formatNumber(dashboard.totalBet)}</strong></div>
          <div><span>PREMIOS</span><strong>{formatNumber(dashboard.totalWin)}</strong></div>
        </section>

        <div className="admin-toolbar">
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar jugador..." />
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="blocked">Bloqueados</option>
            <option value="admins">Administradores</option>
          </select>
          <button onClick={loadAdminData} disabled={loading}>ACTUALIZAR</button>
        </div>

        {message && <div className="admin-message">{message}</div>}

        {loading ? (
  <p className="admin-loading">Cargando jugadores...</p>
) : (
  <div className="players-list">
    {filteredPlayers.length === 0 && (
      <p className="admin-empty">No se encontraron jugadores.</p>
    )}

    {filteredPlayers.map((player) => {
      const disabled = workingId === player.id;

      return (
        <article className="player-row" key={player.id}>
          <div className="player-main">
            {editingId === player.id ? (
              <div className="edit-name-row">
                <input
                  value={editName}
                  maxLength={40}
                  onChange={(event) => setEditName(event.target.value)}
                />

                <button
                  onClick={() => savePlayerName(player)}
                  disabled={disabled}
                >
                  GUARDAR
                </button>

                <button
                  className="secondary"
                  onClick={() => setEditingId(null)}
                >
                  CANCELAR
                </button>
              </div>
            ) : (
              <div className="player-name-line">
                <strong>
                  {player.display_name || player.username}
                </strong>

                {player.is_admin && (
                  <span className="admin-badge">ADMIN</span>
                )}

                <span
                  className={
                    player.is_blocked
                      ? "status blocked"
                      : "status active"
                  }
                >
                  {player.is_blocked ? "BLOQUEADO" : "ACTIVO"}
                </span>

                <button
                  className="edit-button"
                  onClick={() => beginEdit(player)}
                >
                  EDITAR NOMBRE
                </button>
              </div>
            )}

            <small>@{player.username}</small>

            <div className="player-stats">
              <span>
                Apostado: {formatNumber(player.total_bet)}
              </span>

              <span>
                Ganado: {formatNumber(player.total_win)}
              </span>

              <span>
                Giros: {formatNumber(player.total_spins)}
              </span>
            </div>
          </div>

          <div className="credit-value">
            <span>CRÉDITOS</span>
            <strong>{formatNumber(player.credits)}</strong>
          </div>

          <div className="credit-controls">
            <div className="quick-buttons">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => adjustCredits(player, amount)}
                  disabled={disabled}
                >
                  +{amount}
                </button>
              ))}

              <button
                className="subtract"
                onClick={() => adjustCredits(player, -100)}
                disabled={disabled}
              >
                −100
              </button>
            </div>

            <div className="custom-credit-row">
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Monto"
                value={customAmounts[player.id] || ""}
                onChange={(event) =>
                  setCustomAmounts((current) => ({
                    ...current,
                    [player.id]: event.target.value,
                  }))
                }
              />

              <button
                onClick={() => applyCustomAmount(player, 1)}
                disabled={disabled}
              >
                SUMAR
              </button>

              <button
                className="subtract"
                onClick={() => applyCustomAmount(player, -1)}
                disabled={disabled}
              >
                RESTAR
              </button>
            </div>

            <input
              className="reason-input"
              type="text"
              maxLength={100}
              placeholder="Motivo del movimiento (opcional)"
              value={reasons[player.id] || ""}
              onChange={(event) =>
                setReasons((current) => ({
                  ...current,
                  [player.id]: event.target.value,
                }))
              }
            />

            {!player.is_admin && (
              <button
className="password-button"                onClick={() => {
                  setPasswordPlayer(player);
                  setNewPassword("");
                  setPasswordError("");
                }}
                disabled={disabled}
              >
                🔑 CONTRASEÑA
              </button>
            )}

            {!player.is_admin && (
              <button
                className={
                  player.is_blocked
                    ? "unblock-button"
                    : "block-button"
                }
                onClick={() => toggleBlocked(player)}
                disabled={disabled}
              >
                {player.is_blocked
                  ? "DESBLOQUEAR"
                  : "BLOQUEAR"}
              </button>
            )}
          </div>
        </article>
      );
    })}
  </div>
)}

{passwordPlayer && (
  <div className="admin-modal-overlay">
    <div className="admin-modal">
      <h2>Cambiar contraseña</h2>

      <p>
        Jugador:{" "}
        <strong>
          {passwordPlayer.display_name ||
            passwordPlayer.username}
        </strong>
      </p>

      <input
        type="password"
        placeholder="Nueva contraseña"
        value={newPassword}
        onChange={(event) =>
          setNewPassword(event.target.value)
        }
        autoFocus
      />

      {passwordError && (
        <div className="admin-message">
          {passwordError}
        </div>
      )}

      <div className="admin-modal-actions">
        <button
          onClick={handleChangePassword}
          disabled={changingPassword}
        >
          {changingPassword
            ? "GUARDANDO..."
            : "GUARDAR"}
        </button>

        <button
          className="secondary"
          onClick={() => {
            setPasswordPlayer(null);
            setNewPassword("");
            setPasswordError("");
          }}
          disabled={changingPassword}
        >
          CANCELAR
        </button>
      </div>
    </div>
  </div>
)}
        <section className="history-section">
          <h2>ÚLTIMOS MOVIMIENTOS DE CRÉDITOS</h2>
          {transactions.length === 0 ? <p className="admin-empty">Todavía no hay movimientos registrados.</p> : (
            <div className="history-list">
              {transactions.map((transaction) => (
                <div className="history-row" key={transaction.id}>
                  <div><strong>{playerNames[transaction.player_id] || "Jugador"}</strong><small>{new Date(transaction.created_at).toLocaleString("es-AR")}</small></div>
                  <span className={transaction.amount >= 0 ? "history-positive" : "history-negative"}>{transaction.amount >= 0 ? "+" : ""}{formatNumber(transaction.amount)}</span>
                  <div><small>{transaction.notes || transaction.transaction_type}</small><small>Admin: {transaction.admin_username || "administrador"}</small></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
