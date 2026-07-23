import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader =
      req.headers.get("Authorization") || "";

    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(url, service);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json(
        {
          error: "Sesión inválida.",
        },
        401
      );
    }

    const {
      data: caller,
      error: callerError,
    } = await adminClient
      .from("players")
      .select("is_admin")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (callerError) {
      throw callerError;
    }

    if (!caller?.is_admin) {
      return json(
        {
          error: "Acceso denegado.",
        },
        403
      );
    }

    const body = await req.json();

    if (body.action === "change_password") {
      if (
        typeof body.password !== "string" ||
        body.password.length < 8
      ) {
        return json(
          {
            error:
              "La contraseña debe tener 8 caracteres o más.",
          },
          400
        );
      }

      const {
        data: player,
        error: playerError,
      } = await adminClient
        .from("players")
        .select("auth_user_id,is_admin")
        .eq("id", body.player_id)
        .single();

      if (playerError) {
        throw playerError;
      }

      if (!player || player.is_admin) {
        return json(
          {
            error: "Jugador inválido.",
          },
          400
        );
      }

      const { error: passwordError } =
        await adminClient.auth.admin.updateUserById(
          player.auth_user_id,
          {
            password: body.password,
          }
        );

      if (passwordError) {
        throw passwordError;
      }

      const { error: logoutUpdateError } =
        await adminClient
          .from("players")
          .update({
force_logout_version: crypto.randomUUID()          })
          .eq("id", body.player_id);

      if (logoutUpdateError) {
        throw logoutUpdateError;
      }

      return json({
        ok: true,
      });
    }

    if (body.action === "force_logout") {
      const {
        data: player,
        error: playerError,
      } = await adminClient
        .from("players")
        .select("is_admin")
        .eq("id", body.player_id)
        .single();

      if (playerError) {
        throw playerError;
      }

      if (!player || player.is_admin) {
        return json(
          {
            error: "Jugador inválido.",
          },
          400
        );
      }

      const { error: logoutUpdateError } =
        await adminClient
          .from("players")
          .update({
force_logout_version: crypto.randomUUID()          })
          .eq("id", body.player_id);

      if (logoutUpdateError) {
        throw logoutUpdateError;
      }

      return json({
        ok: true,
      });
    }

    if (body.action === "backup") {
      const [
        players,
        transactions,
        settings,
      ] = await Promise.all([
        adminClient.from("players").select("*"),
        adminClient
          .from("credit_transactions")
          .select("*"),
        adminClient
          .from("app_settings")
          .select("*"),
      ]);

      if (
        players.error ||
        transactions.error ||
        settings.error
      ) {
        throw (
          players.error ||
          transactions.error ||
          settings.error
        );
      }

      return json({
        format: "charly-casino-backup-v1",
        created_at: new Date().toISOString(),
        players: players.data,
        credit_transactions:
          transactions.data,
        app_settings: settings.data,
      });
    }

    if (body.action === "restore") {
      const backup = body.backup;

      if (
        !backup ||
        backup.format !==
          "charly-casino-backup-v1" ||
        !Array.isArray(backup.players)
      ) {
        return json(
          {
            error: "Backup inválido.",
          },
          400
        );
      }

      const safePlayers = backup.players.map(
        (player: Record<string, unknown>) => ({
          ...player,
          force_logout_version:
            Date.now(),
        })
      );

      const playersResult =
        await adminClient
          .from("players")
          .upsert(safePlayers, {
            onConflict: "id",
          });

      if (playersResult.error) {
        throw playersResult.error;
      }

      if (
        Array.isArray(
          backup.credit_transactions
        ) &&
        backup.credit_transactions.length
      ) {
        const transactionsResult =
          await adminClient
            .from("credit_transactions")
            .upsert(
              backup.credit_transactions,
              {
                onConflict: "id",
              }
            );

        if (transactionsResult.error) {
          throw transactionsResult.error;
        }
      }

      if (
        Array.isArray(
          backup.app_settings
        ) &&
        backup.app_settings.length
      ) {
        const settingsResult =
          await adminClient
            .from("app_settings")
            .upsert(backup.app_settings, {
              onConflict: "id",
            });

        if (settingsResult.error) {
          throw settingsResult.error;
        }
      }

      return json({
        ok: true,
      });
    }

    return json(
      {
        error: "Acción desconocida.",
      },
      400
    );
  } catch (error) {
    console.error(
      "Error en admin-actions:",
      error
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno.",
      },
      500
    );
  }
});