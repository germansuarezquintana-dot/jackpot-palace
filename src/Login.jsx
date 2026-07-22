import { useState } from "react";
import { supabase } from "./supabase";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = cleanUsername.includes("@")
      ? cleanUsername
      : `${cleanUsername}@jackpot.com`;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signInError) {
      setError(signInError.message || "No se pudo iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-crown">👑</div>
        <p className="login-kicker">CASINO PRIVADO</p>
        <h1>JACKPOT PALACE</h1>
        <p className="login-subtitle">Ingresá para jugar</p>

        <form onSubmit={handleSubmit}>
          <label>
            USUARIO
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="u001"
              required
            />
          </label>

          <label>
            CONTRASEÑA
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "INGRESANDO..." : "🎰 INGRESAR"}
          </button>
        </form>
      </section>
    </main>
  );
}
