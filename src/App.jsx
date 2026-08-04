import logoJackpotPalace from "./assets/logo-jackpot-palace.png";
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import Game from "./Game";
import ClownParty from "./ClownParty";
import Wheel from "./Wheel";
import EgyptianGold from "./EgyptianGold";
import NeonCity from "./neon/NeonCity";
import Lobby from "./Lobby";
import Admin from "./Admin";
import Cashier from "./Cashier";

export default function App() {
  const [session, setSession] = useState(null);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [screen, setScreen] = useState("lobby");
  const [error, setError] = useState("");

  const forceLogoutVersionRef = useRef(null);

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
      setError(
        "El usuario existe, pero no tiene perfil de jugador vinculado."
      );
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

      if (data.session) {
        loadPlayer(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setShowAdmin(false);
        setScreen("lobby");

        if (nextSession) {
          loadPlayer(nextSession.user.id);
        } else {
          setPlayer(null);
          setLoading(false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
   if (
  !session?.user?.id ||
  !player?.id ||
  player.role === "super_admin"
) {
  return;
}

    let active = true;

    forceLogoutVersionRef.current =
      player.force_logout_version ?? null;

    const checkForceLogout = async () => {
      const { data, error: checkError } = await supabase
        .from("players")
        .select("force_logout_version")
        .eq("id", player.id)
        .single();

      if (!active) {
        return;
      }

      if (checkError) {
        console.error(
          "Error comprobando cierre forzado:",
          checkError
        );
        return;
      }

      if (!data) {
        return;
      }

      const nextVersion =
        data.force_logout_version ?? null;

      if (
        nextVersion !== forceLogoutVersionRef.current
      ) {
        forceLogoutVersionRef.current = nextVersion;
        await supabase.auth.signOut();
      }
    };

    const channel = supabase
      .channel(`force-logout-${player.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `id=eq.${player.id}`,
        },
        async (payload) => {
          const nextVersion =
            payload.new?.force_logout_version ?? null;

          if (
            nextVersion !== forceLogoutVersionRef.current
          ) {
            forceLogoutVersionRef.current = nextVersion;
            await supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    const interval = setInterval(
      checkForceLogout,
      3000
    );

    return () => {
      active = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [
    session?.user?.id,
    player?.id,
    player?.role,
    player?.force_logout_version,
  ]);

  if (loading) {
    return (
      <main className="login-page">
        <section className="login-card">
          <img
            src={logoJackpotPalace}
            alt="Jackpot Palace"
            className="main-logo"
          />

          <p>Cargando...</p>
        </section>
      </main>
    );
  }

  if (!session || !player) {
    return (
      <>
        <Login />

        {error && (
          <div
            style={{
              position: "fixed",
              bottom: 15,
              left: "50%",
              transform: "translateX(-50%)",
              color: "#fff",
              background: "#7d0018",
              padding: "10px 16px",
              borderRadius: 10,
              zIndex: 999,
            }}
          >
            {error}
          </div>
        )}
      </>
    );
  }

  if (
  showAdmin &&
  ["super_admin", "admin"].includes(player.role)
) {
  console.log("PLAYER ACTUAL:", player);

  return (
    <Admin
      onClose={() => setShowAdmin(false)}
    />
  );
}

  if (player?.role === "cashier") {
    return (
      <Cashier
        player={player}
        onLogout={() => supabase.auth.signOut()}
      />
    );
  }
if (screen === "clown-party") {
  return (
    <ClownParty
      player={player}
      onCreditsChange={(credits) =>
        setPlayer((current) => ({
          ...current,
          credits,
        }))
      }
      onBack={() => setScreen("lobby")}
      onLogout={() => supabase.auth.signOut()}
    />
  );
}
if (screen === "wheel") {
  return (
    <Wheel
      player={player}
      onCreditsChange={(credits) =>
        setPlayer((current) => ({
          ...current,
          credits,
        }))
      }
      onBack={() => setScreen("lobby")}
      onLogout={() => supabase.auth.signOut()}
    />
  );
}

if (screen === "egyptian-gold") {
  return (
    <EgyptianGold
      player={player}
      onCreditsChange={(credits) =>
        setPlayer((current) => ({
          ...current,
          credits,
        }))
      }
      onBack={() => setScreen("lobby")}
      onLogout={() => supabase.auth.signOut()}
    />
  );
}

  if (screen === "neon-city") {
    return (
      <>
        <button
          type="button"
          onClick={() => setScreen("lobby")}
          disabled={false}
          style={{
            position: "fixed",
            top: 20,
            left: 10,
            zIndex: 9999,
            padding: "2px 1px",
            border: "1px solid #00f5ff",
            borderRadius: 12,
            color: "#fff",
            background:
              "linear-gradient(180deg, #6b20aa, #10105c)",
            fontWeight: 900,
            cursor: "pointer",
            boxShadow:
              "0 0 15px rgba(0, 245, 255, 0.65)",
          }}
        >
          ← CASINO
        </button>

        <NeonCity />
      </>
    );
  }

  if (screen === "jackpot-palace") {
    return (
      <>
        <button
          type="button"
          onClick={() => setScreen("lobby")}
          disabled={false}
          style={{
            position: "fixed",
            top: 12,
            left: 2,
            zIndex: 9999,
            padding: "10px 15px",
            border: "2px solid #ffd45c",
            borderRadius: 12,
            color: "#fff",
            background:
              "linear-gradient(180deg, #5c1d91, #26063f)",
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 0 15px rgba(255, 212, 92, 0.5)",
          }}
        >
          ← CASINO
        </button>

        <Game
          player={player}
          onCreditsChange={(credits) =>
            setPlayer((current) => ({
              ...current,
              credits,
            }))
          }
          onLogout={() => supabase.auth.signOut()}
          onOpenAdmin={() => setShowAdmin(true)}
        />
      </>
    );
  }

  return (
    <Lobby
      player={player}
      onOpenGame={(gameId) => setScreen(gameId)}
      onOpenAdmin={() => setShowAdmin(true)}
      onLogout={() => supabase.auth.signOut()}
    />
  );
}