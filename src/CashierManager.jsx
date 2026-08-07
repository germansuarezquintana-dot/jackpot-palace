import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function CashierManager() {
  const [admins, setAdmins] = useState([]);
  const [adminId, setAdminId] = useState("");
  const [count, setCount] = useState(3);
  const [prefix, setPrefix] = useState("cajero");
  const [start, setStart] = useState(1);
  const [password, setPassword] = useState("");
  const [cashiers, setCashiers] = useState([]);
  const [cashierId, setCashierId] = useState("");
  const [playerPrefix, setPlayerPrefix] = useState("u");
  const [playerStart, setPlayerStart] = useState(1);
  const [playerEnd, setPlayerEnd] = useState(10);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    async function loadAdmins() {
      const { data, error } = await supabase
        .from("players")
        .select("id, username, display_name")
        .eq("role", "admin")
        .eq("is_active", true)
        .order("username");

      if (error) {
        setMessageType("error");
        setMessage(`No se pudieron cargar los administradores: ${error.message}`);
        return;
      }

      setAdmins(data || []);

      if (data?.length === 1) {
        setAdminId(data[0].id);
      }
    }

    loadAdmins();
  }, []);

  useEffect(() => {
    async function loadCashiers() {
      setCashiers([]);
      setCashierId("");

      if (!adminId) return;

      const { data, error } = await supabase
        .from("players")
        .select("id, username, display_name")
        .eq("role", "cashier")
        .eq("parent_id", adminId)
        .eq("is_active", true)
        .order("username");

      if (error) {
        setMessageType("error");
        setMessage(`No se pudieron cargar los cajeros: ${error.message}`);
        return;
      }

      setCashiers(data || []);

      if (data?.length === 1) {
        setCashierId(data[0].id);
      }
    }

    loadCashiers();
  }, [adminId]);

  async function createCashiers(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    if (!adminId) {
      setMessageType("error");
      setMessage("Seleccioná un administrador.");
      return;
    }

    if (password.length < 8) {
      setMessageType("error");
      setMessage("La contraseña debe tener 8 caracteres o más.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke(
      "admin-actions",
      {
        body: {
          action: "create_cashiers",
          admin_id: adminId,
          count: Number(count),
          start: Number(start),
          prefix,
          password,
        },
      }
    );

    setLoading(false);

    if (error) {
      setMessageType("error");
      setMessage(`Error: ${error.message}`);
      return;
    }

    if (data?.error) {
      setMessageType("error");
      setMessage(`Error: ${data.error}`);
      return;
    }

    setMessageType(data.failed_count > 0 ? "warning" : "success");
    setMessage(
      `Creados: ${data.created_count}. Fallidos: ${data.failed_count}.`
    );
  }

  async function assignPlayers(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    const startNumber = Number(playerStart);
    const endNumber = Number(playerEnd);

    if (!adminId || !cashierId) {
      setMessageType("error");
      setMessage("Seleccioná un administrador y un cajero.");
      return;
    }

    if (!playerPrefix.trim()) {
      setMessageType("error");
      setMessage("Indicá el prefijo de los jugadores, por ejemplo u.");
      return;
    }

    if (
      !Number.isInteger(startNumber) ||
      !Number.isInteger(endNumber) ||
      startNumber < 1 ||
      endNumber < startNumber
    ) {
      setMessageType("error");
      setMessage("El rango de jugadores no es válido.");
      return;
    }

    const total = endNumber - startNumber + 1;
    if (total > 200) {
      setMessageType("error");
      setMessage("Podés asignar hasta 200 jugadores por vez.");
      return;
    }

    const cashier = cashiers.find((item) => item.id === cashierId);
    const firstUsername = `${playerPrefix.trim()}${String(startNumber).padStart(3, "0")}`;
    const lastUsername = `${playerPrefix.trim()}${String(endNumber).padStart(3, "0")}`;

    if (!window.confirm(
      `¿Asignar ${total} jugador(es), desde ${firstUsername} hasta ${lastUsername}, a ${cashier?.display_name || cashier?.username}? Si alguno ya pertenece a otro cajero, se moverá.`
    )) return;

    setAssigning(true);

    const { data, error } = await supabase.functions.invoke(
      "admin-actions",
      {
        body: {
          action: "assign_players_to_cashier",
          cashier_id: cashierId,
          prefix: playerPrefix.trim(),
          start: startNumber,
          end: endNumber,
        },
      }
    );

    setAssigning(false);

    if (error || data?.error) {
      let errorDetail = data?.error || error?.message || "Error desconocido";

      if (error?.context) {
        try {
          const responseBody = await error.context.json();
          errorDetail = responseBody?.error || responseBody?.message || errorDetail;
        } catch {
          // Si la respuesta no es JSON, conservamos el mensaje original.
        }
      }

      setMessageType("error");
      setMessage(`Error: ${errorDetail}`);
      return;
    }

    setMessageType("success");
    setMessage(
      `Asignados a ${cashier?.display_name || cashier?.username}: ${data.assigned_count}. Movidos desde otro cajero: ${data.moved_count}. No encontrados: ${data.missing_count}.`
    );
  }

  return (
    <section className="cashier-manager">
      <div className="cashier-manager-header">
        <div>
          <p className="cashier-manager-kicker">GESTIÓN DE USUARIOS</p>
          <h2>Crear cajeros</h2>
        </div>

        <span className="cashier-manager-limit">Máximo 50 por vez</span>
      </div>

      <form className="cashier-manager-form" onSubmit={createCashiers}>
        <label className="cashier-manager-field cashier-manager-field-wide">
          <span>Administrador</span>
          <select
            value={adminId}
            onChange={(event) => setAdminId(event.target.value)}
            required
          >
            <option value="">Seleccionar administrador</option>

            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.display_name || admin.username}
              </option>
            ))}
          </select>
        </label>

        <label className="cashier-manager-field">
          <span>Cantidad</span>
          <input
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            required
          />
        </label>

        <label className="cashier-manager-field">
          <span>Prefijo</span>
          <input
            type="text"
            value={prefix}
            onChange={(event) => setPrefix(event.target.value)}
            placeholder="cajero"
            required
          />
        </label>

        <label className="cashier-manager-field">
          <span>Número inicial</span>
          <input
            type="number"
            min="1"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </label>

        <label className="cashier-manager-field">
          <span>Contraseña inicial</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength="8"
            placeholder="Mínimo 8 caracteres"
            required
          />
        </label>

        <button
          className="cashier-manager-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? "CREANDO..." : `CREAR ${count} CAJEROS`}
        </button>
      </form>

      {message && (
        <div className={`cashier-manager-message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="cashier-manager-header">
        <div>
          <p className="cashier-manager-kicker">DISTRIBUCIÓN DE JUGADORES</p>
          <h2>Asignar jugadores a cajero</h2>
        </div>
      </div>

      <form className="cashier-manager-form" onSubmit={assignPlayers}>
        <label className="cashier-manager-field cashier-manager-field-wide">
          <span>Cajero</span>
          <select
            value={cashierId}
            onChange={(event) => setCashierId(event.target.value)}
            required
            disabled={!adminId || cashiers.length === 0}
          >
            <option value="">
              {adminId ? "Seleccionar cajero" : "Primero seleccioná un administrador"}
            </option>
            {cashiers.map((cashier) => (
              <option key={cashier.id} value={cashier.id}>
                {cashier.display_name || cashier.username}
              </option>
            ))}
          </select>
        </label>

        <label className="cashier-manager-field">
          <span>Prefijo de jugador</span>
          <input
            type="text"
            value={playerPrefix}
            onChange={(event) => setPlayerPrefix(event.target.value)}
            placeholder="u"
            required
          />
        </label>

        <label className="cashier-manager-field">
          <span>Desde número</span>
          <input
            type="number"
            min="1"
            value={playerStart}
            onChange={(event) => setPlayerStart(event.target.value)}
            required
          />
        </label>

        <label className="cashier-manager-field">
          <span>Hasta número</span>
          <input
            type="number"
            min="1"
            value={playerEnd}
            onChange={(event) => setPlayerEnd(event.target.value)}
            required
          />
        </label>

        <button
          className="cashier-manager-submit"
          type="submit"
          disabled={assigning || !cashierId}
        >
          {assigning ? "ASIGNANDO..." : "ASIGNAR JUGADORES"}
        </button>
      </form>
    </section>
  );
}
