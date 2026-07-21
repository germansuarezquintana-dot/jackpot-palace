import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import Game from "./Game";
import Admin from "./Admin";

export default function App() {
  const [session, setSession] = useState(null);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [error, setError] = useState("");

  async function loadPlayer(userId) {
    setLoading(true);

    const { data, error: profileError } = await supabase
      .from("players")
      .select("*")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error al cargar jugador:", profileError);
      setError(`Error al cargar perfil: ${profileError.message}`);
      setPlayer(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("El usuario existe, pero no tiene perfil de jugador vinculado.");
      setPlayer(null);
      setLoading(false);
      return;
    }

    if (data.is_blocked) {
      setError("Usuario bloqueado. Contacte al administrador.");
      setPlayer(null);
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    setError("");
    setPlayer(data);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadPlayer(data.session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setShowAdmin(false);
      if (nextSession) loadPlayer(nextSession.user.id);
      else {
        setPlayer(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <main className="login-page"><section className="login-card"><h1>JACKPOT PALACE</h1><p>Cargando...</p></section></main>;
  }

  if (!session || !player) {
    return <><Login />{error && <div style={{position:"fixed",bottom:15,left:"50%",transform:"translateX(-50%)",color:"#fff",background:"#7d0018",padding:"10px 16px",borderRadius:10,zIndex:999}}>{error}</div>}</>;
  }

  if (showAdmin && player.is_admin) {
    return <Admin onClose={() => setShowAdmin(false)} />;
  }

  return (
    <Game
      player={player}
      onCreditsChange={(credits) => setPlayer((current) => ({ ...current, credits }))}
      onLogout={() => supabase.auth.signOut()}
      onOpenAdmin={() => setShowAdmin(true)}
    />
  );
}
