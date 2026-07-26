import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function CashierManager() {
  const [admins, setAdmins] = useState([]);
  const [adminId, setAdminId] = useState("");
  const [count, setCount] = useState(3);
  const [prefix, setPrefix] = useState("cajero");
  const [start, setStart] = useState(1);
  const [password, setPassword] = useState("");
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
    </section>
  );
}