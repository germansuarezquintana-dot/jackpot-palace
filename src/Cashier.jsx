import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Cashier({ player, onLogout }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPlayers() {
      const { data, error } = await supabase
        .from("players")
        .select("id, username, display_name, credits, is_blocked")
        .eq("role", "player")
        .eq("parent_id", player.id)
        .order("username");

      if (error) {
        setMessage(`No se pudieron cargar los jugadores: ${error.message}`);
        setLoading(false);
        return;
      }

      setPlayers(data || []);
      setLoading(false);
    }

    if (player?.id) {
      loadPlayers();
    }
  }, [player?.id]);

  return (
    <main style={{ padding: 32, color: "white" }}>
      <h1>Panel de Cajero</h1>

      <p>
        Usuario: <strong>{player?.display_name || player?.username}</strong>
      </p>

      <button onClick={onLogout}>
        CERRAR SESIÓN
      </button>

      <hr />

      <h2>Mis jugadores</h2>

      {loading && <p>Cargando jugadores...</p>}

      {message && <p>{message}</p>}

      {!loading && players.length === 0 && (
        <p>Todavía no tenés jugadores asignados.</p>
      )}

      {players.map((item) => (
        <div key={item.id}>
          <strong>{item.display_name || item.username}</strong>
          <span> — Créditos: {item.credits}</span>
          <span>
            {item.is_blocked ? " — BLOQUEADO" : " — ACTIVO"}
          </span>
        </div>
      ))}
    </main>
  );
}