import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

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
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
        color: "white",
        background:
          "linear-gradient(180deg, #090909 0%, #050005 55%, #10000b 100%)",
      }}
    >
      <h1 style={{ color: "#e9bd45" }}>Panel de Cajero</h1>

      <p>
        Usuario:{" "}
        <strong>{player?.display_name || player?.username}</strong>
      </p>

      <p>
        Saldo disponible:{" "}
        <strong style={{ color: "#f8d66d" }}>
          {cashierCredits.toLocaleString("es-AR")} créditos
        </strong>
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <button type="button" onClick={onLogout}>
          CERRAR SESIÓN
        </button>

        <button
          type="button"
          onClick={loadData}
          disabled={loading || Boolean(workingId)}
        >
          ACTUALIZAR
        </button>
      </div>

      <hr />

      <h2>Mis jugadores</h2>

      {loading && <p>Cargando jugadores...</p>}

      {message && (
        <p
          style={{
            padding: 12,
            border: "1px solid #c99b32",
            borderRadius: 8,
            background: "rgba(201, 155, 50, 0.12)",
          }}
        >
          {message}
        </p>
      )}

      {!loading && players.length === 0 && (
        <p>Todavía no tenés jugadores asignados.</p>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {players.map((item) => {
          const isWorking = workingId === item.id;

          return (
            <section
              key={item.id}
              style={{
                padding: 16,
                border: "1px solid #8d6a20",
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.035)",
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 18 }}>
                  {item.display_name || item.username}
                </strong>

                <span>
                  {" "}
                  — Créditos:{" "}
                  <strong>{Number(item.credits || 0).toLocaleString("es-AR")}</strong>
                </span>

                <span
                  style={{
                    color: item.is_blocked ? "#ff6b6b" : "#6ee78b",
                  }}
                >
                  {item.is_blocked ? " — BLOQUEADO" : " — ACTIVO"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {QUICK_AMOUNTS.map((amount) => (
                  <button
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
                    key={`remove-${amount}`}
                    type="button"
                    disabled={isWorking || item.is_blocked}
                    onClick={() => adjustCredits(item, -amount)}
                  >
                    -{amount.toLocaleString("es-AR")}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
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
                  type="button"
                  disabled={isWorking || item.is_blocked}
                  onClick={() => applyCustomAmount(item, "add")}
                >
                  ENTREGAR
                </button>

                <button
                  type="button"
                  disabled={isWorking || item.is_blocked}
                  onClick={() => applyCustomAmount(item, "remove")}
                >
                  RECUPERAR
                </button>
              </div>

              <input
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
                style={{ width: "min(100%, 520px)" }}
              />

              {isWorking && <p>Procesando operación...</p>}
            </section>
          );
        })}
      </div>
    </main>
  );
}