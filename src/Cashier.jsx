import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./Cashier.css";

const QUICK_AMOUNTS = [100, 500, 1000];

export default function Cashier({ player, onLogout }) {
  const [players, setPlayers] = useState([]);
  const [cashierCredits, setCashierCredits] = useState(
    Number(player?.credits || 0)
  );
  const [customAmounts, setCustomAmounts] = useState({});
  const [reasons, setReasons] = useState({});
  const [workingId, setWorkingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    if (!player?.id) return;

    setLoading(true);

    const [cashierResult, playersResult] = await Promise.all([
      supabase
        .from("players")
        .select("credits")
        .eq("id", player.id)
        .single(),

      supabase
        .from("players")
        .select("id, username, display_name, credits, is_blocked")
        .eq("role", "player")
        .eq("parent_id", player.id)
        .order("username"),
    ]);

    if (cashierResult.error) {
      setMessage(
        `No se pudo cargar el saldo del cajero: ${cashierResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (playersResult.error) {
      setMessage(
        `No se pudieron cargar los jugadores: ${playersResult.error.message}`
      );
      setLoading(false);
      return;
    }

    setCashierCredits(Number(cashierResult.data?.credits || 0));
    setPlayers(playersResult.data || []);
    setLoading(false);
  }, [player?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function adjustCredits(targetPlayer, amount) {
    if (workingId) return;

    if (!Number.isInteger(amount) || amount === 0) {
      setMessage("Ingresá un monto válido mayor a cero.");
      return;
    }

    if (targetPlayer.is_blocked) {
      setMessage("No se pueden modificar créditos de un jugador bloqueado.");
      return;
    }

    const action = amount > 0 ? "entregar" : "recuperar";
    const absoluteAmount = Math.abs(amount);

    const confirmed = window.confirm(
      `¿Confirmás ${action} ${absoluteAmount.toLocaleString(
        "es-AR"
      )} créditos ${
        amount > 0 ? "a" : "de"
      } ${targetPlayer.display_name || targetPlayer.username}?`
    );

    if (!confirmed) return;

    setWorkingId(targetPlayer.id);
    setMessage("");

    const customReason = (reasons[targetPlayer.id] || "").trim();

    const notes =
      customReason ||
      (amount > 0
        ? "Créditos entregados por el cajero"
        : "Créditos recuperados por el cajero");

    const { error } = await supabase.rpc("admin_adjust_credits", {
      p_player_id: targetPlayer.id,
      p_amount: amount,
      p_notes: notes,
    });

    if (error) {
      setMessage(`No se pudieron actualizar los créditos: ${error.message}`);
      setWorkingId(null);
      return;
    }

    setMessage(
      amount > 0
        ? `Se entregaron ${absoluteAmount.toLocaleString(
            "es-AR"
          )} créditos correctamente.`
        : `Se recuperaron ${absoluteAmount.toLocaleString(
            "es-AR"
          )} créditos correctamente.`
    );

    setCustomAmounts((current) => ({
      ...current,
      [targetPlayer.id]: "",
    }));

    setReasons((current) => ({
      ...current,
      [targetPlayer.id]: "",
    }));

    await loadData();
    setWorkingId(null);
  }

  function applyCustomAmount(targetPlayer, direction) {
    const rawValue = customAmounts[targetPlayer.id];
    const parsedAmount = Number.parseInt(rawValue, 10);

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setMessage("Ingresá un monto personalizado mayor a cero.");
      return;
    }

    adjustCredits(
      targetPlayer,
      direction === "add" ? parsedAmount : -parsedAmount
    );
  }

  return (
    <main className="cashier-page">
      <section className="cashier-shell">
        <header className="cashier-header">
          <div>
            <p className="cashier-brand">👑 JACKPOT PALACE</p>
            <h1>PANEL DE CAJERO</h1>
          </div>

          <div className="cashier-header-actions">
            <button
              className="cashier-refresh"
              type="button"
              onClick={loadData}
              disabled={loading || Boolean(workingId)}
            >
              ACTUALIZAR
            </button>
            <button className="cashier-logout" type="button" onClick={onLogout}>
              CERRAR SESIÓN
            </button>
          </div>
        </header>

        <section className="cashier-summary">
          <div>
            <span>USUARIO</span>
            <strong>{player?.display_name || player?.username}</strong>
          </div>
          <div>
            <span>SALDO DISPONIBLE</span>
            <strong>{cashierCredits.toLocaleString("es-AR")} créditos</strong>
          </div>
          <div>
            <span>JUGADORES ASIGNADOS</span>
            <strong>{players.length}</strong>
          </div>
        </section>

        <div className="cashier-section-title">
          <div>
            <span>GESTIÓN DE CRÉDITOS</span>
            <h2>Mis jugadores</h2>
          </div>
        </div>

        {loading && <p className="cashier-loading">Cargando jugadores...</p>}

        {message && <p className="cashier-message">{message}</p>}

        {!loading && players.length === 0 && (
          <p className="cashier-empty">Todavía no tenés jugadores asignados.</p>
        )}

        <div className="cashier-players-list">
        {players.map((item) => {
          const isWorking = workingId === item.id;

          return (
            <section
              key={item.id}
              className={`cashier-player-card${item.is_blocked ? " is-blocked" : ""}`}
            >
              <div className="cashier-player-info">
                <div className="cashier-player-name">
                  <strong>{item.display_name || item.username}</strong>
                  <span className={item.is_blocked ? "blocked" : "active"}>
                    {item.is_blocked ? "BLOQUEADO" : "ACTIVO"}
                  </span>
                </div>

                <div className="cashier-player-credit">
                  <span>CRÉDITOS</span>
                  <strong>
                    {Number(item.credits || 0).toLocaleString("es-AR")}
                  </strong>
                </div>
              </div>

              <div className="cashier-credit-controls">
                <div className="cashier-quick-buttons">
                  {QUICK_AMOUNTS.map((amount) => (
                    <button
                      className="add"
                      key={`add-${amount}`}
                      type="button"
                      disabled={isWorking || item.is_blocked}
                      onClick={() => adjustCredits(item, amount)}
                    >
                      +{amount.toLocaleString("es-AR")}
                    </button>
                  ))}

                  {QUICK_AMOUNTS.map((amount) => (
                    <button
                      className="remove"
                      key={`remove-${amount}`}
                      type="button"
                      disabled={isWorking || item.is_blocked}
                      onClick={() => adjustCredits(item, -amount)}
                    >
                      -{amount.toLocaleString("es-AR")}
                    </button>
                  ))}
                </div>

                <div className="cashier-custom-row">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Monto personalizado"
                    value={customAmounts[item.id] || ""}
                    disabled={isWorking || item.is_blocked}
                    onChange={(event) =>
                      setCustomAmounts((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />

                  <button
                    className="deliver"
                    type="button"
                    disabled={isWorking || item.is_blocked}
                    onClick={() => applyCustomAmount(item, "add")}
                  >
                    ENTREGAR
                  </button>

                  <button
                    className="recover"
                    type="button"
                    disabled={isWorking || item.is_blocked}
                    onClick={() => applyCustomAmount(item, "remove")}
                  >
                    RECUPERAR
                  </button>
                </div>

                <input
                  className="cashier-reason-input"
                  type="text"
                  placeholder="Motivo opcional"
                  value={reasons[item.id] || ""}
                  disabled={isWorking || item.is_blocked}
                  onChange={(event) =>
                    setReasons((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />

                {isWorking && (
                  <p className="cashier-working">Procesando operación...</p>
                )}
              </div>
            </section>
          );
        })}
        </div>
      </section>
    </main>
  );
}
