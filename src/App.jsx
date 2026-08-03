import logoJackpotPalace from "./assets/logo-jackpot-palace.png";
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import Game from "./Game";
import ClownParty from "./ClownParty";
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
      ["admin", "super_admin"].includes(player.role)
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
            left: 12,
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
    <main
      style={{
        height: "100dvh",
        minHeight: 0,
        padding: "8px 14px",
        overflow: "hidden",
        color: "#fff",
        background:
          "radial-gradient(circle at top, #35105a 0%, #100218 45%, #020104 100%)",
        boxSizing: "border-box",
      }}
    >
      <section
        style={{
          width: "min(1100px, 100%)",
          height: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <header
          style={{
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          <img
            src={logoJackpotPalace}
            alt="Jackpot Palace"
            style={{
              width: "min(330px, 72vw)",
              maxHeight: 76,
              objectFit: "contain",
            }}
          />

          <h1
            style={{
              margin: "2px 0",
              color: "#ffd45c",
              fontSize: "clamp(24px, 4vw, 34px)",
              textShadow: "0 0 18px #c224ff",
            }}
          >
            CASINO
          </h1>

          <p style={{ margin: 2, fontSize: 14 }}>
            Bienvenido,{" "}
            <strong>
              {player.display_name || player.username}
            </strong>
          </p>

          <p
            style={{
              margin: 2,
              color: "#ffd45c",
              fontSize: 15,
              fontWeight: 900,
            }}
          >
            Créditos:{" "}
            {(player.credits ?? 0).toLocaleString("es-AR")}
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          <article
            style={{
              padding: 8,
              textAlign: "center",
              border: "2px solid #ffd45c",
              borderRadius: 20,
              background:
                "linear-gradient(160deg, #48126d, #14031e)",
              boxShadow:
                "0 0 25px rgba(255, 212, 92, 0.25)",
            }}
          >
            <div style={{ fontSize: 40, lineHeight: 1 }}>🎰</div>

            <h2 style={{ color: "#ffd45c", margin: "8px 0", fontSize: 20 }}>
              Jackpot Palace
            </h2>

            <p style={{ margin: "6px 0 10px", minHeight: 38, fontSize: 14 }}>
              Jackpot progresivo, bonus y giros gratis.
            </p>

            <button
              type="button"
              onClick={() =>
                setScreen("jackpot-palace")
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "2px solid #fff28a",
                borderRadius: 13,
                color: "#fff",
                background:
                  "linear-gradient(180deg, #26a93c, #075e18)",
                fontSize: 15,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              JUGAR
            </button>
          </article>

          <article
            style={{
              padding: 8,
              textAlign: "center",
              border: "2px solid #ff5bd7",
              borderRadius: 20,
              background:
                "linear-gradient(160deg, #792367, #270520)",
              opacity: 0.9,
            }}
          >
            <div style={{ fontSize: 40, lineHeight: 1 }}>🤡</div>

            <h2 style={{ color: "#ff8de4", margin: "8px 0", fontSize: 20 }}>
              Clown Party
            </h2>

            <p style={{ margin: "6px 0 10px", minHeight: 38, fontSize: 14 }}>
              Circo, payasos, sorpresas y grandes premios.
            </p>

            <button
  type="button"
  onClick={() => setScreen("clown-party")}
  style={{
    width: "100%",
    padding: "10px 12px",
    border: "2px solid #fff28a",
    borderRadius: 13,
    color: "#fff",
    background:
      "linear-gradient(180deg, #ff4f4f, #a40022)",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
  }}
>
  JUGAR
</button>
          </article>

          <article
            style={{
              padding: 8,
              textAlign: "center",
              border: "2px solid #c99835",
              borderRadius: 20,
              background:
                "linear-gradient(160deg, #5d3910, #1d0e02)",
              opacity: 0.85,
            }}
          >
            <div style={{ fontSize: 40, lineHeight: 1 }}>🏺</div>

            <h2 style={{ color: "#ffd45c", margin: "8px 0", fontSize: 20 }}>
              Egyptian Gold
            </h2>

            <p style={{ margin: "6px 0 10px", minHeight: 38, fontSize: 14 }}>
              Misterios, faraones y tesoros del antiguo Egipto.
            </p>

            <button
              type="button"
              disabled
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "2px solid #806c43",
                borderRadius: 13,
                color: "#ddd",
                background: "#4a4131",
                fontSize: 15,
                fontWeight: 900,
              }}
            >
              PRÓXIMAMENTE
            </button>
          </article>

          <article
            style={{
              padding: 8,
              textAlign: "center",
              border: "2px solid #b76d39",
              borderRadius: 20,
              background:
                "linear-gradient(160deg, #563016, #1c0b02)",
              opacity: 0.85,
            }}
          >
            <div style={{ fontSize: 40, lineHeight: 1 }}>🤠</div>

            <h2 style={{ color: "#f4a45e", margin: "8px 0", fontSize: 20 }}>
              Wild West
            </h2>

            <p style={{ margin: "6px 0 10px", minHeight: 38, fontSize: 14 }}>
              Forajidos, duelos y recompensas.
            </p>

            <button
              type="button"
              disabled
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "2px solid #795c49",
                borderRadius: 13,
                color: "#ddd",
                background: "#49382e",
                fontSize: 15,
                fontWeight: 900,
              }}
            >
              PRÓXIMAMENTE
            </button>
          </article>
        </div>

        <footer
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {["super_admin", "admin"].includes(
            player.role
          ) && (
            <button
              type="button"
              onClick={() => setShowAdmin(true)}
              style={{
                padding: "9px 14px",
                borderRadius: 12,
                border: "1px solid #ffd45c",
                color: "#fff",
                background: "#5c1d91",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              👑 PANEL DE CONTROL
            </button>
          )}

          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            style={{
              padding: "9px 14px",
              borderRadius: 12,
              border: "1px solid #ff7777",
              color: "#fff",
              background: "#790f20",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            CERRAR SESIÓN
          </button>
        </footer>
      </section>
    </main>
  );
}