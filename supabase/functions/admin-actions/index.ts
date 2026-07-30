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

const normalizeUsername = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(url, service, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Sesión inválida." }, 401);
    }

    const { data: caller, error: callerError } = await adminClient
      .from("players")
      .select("id,role,is_active,max_cashiers")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (callerError) throw callerError;

    if (
      !caller ||
      !caller.is_active ||
      !["super_admin", "admin"].includes(caller.role)
    ) {
      return json({ error: "Acceso denegado." }, 403);
    }

    const body = await req.json();

    if (body.action === "create_cashiers") {
      const count = Number(body.count ?? 0);
      const start = Number(body.start ?? 1);
      const prefix = normalizeUsername(String(body.prefix ?? "cajero"));
      const password = String(body.password ?? "");
      const requestedAdminId =
        typeof body.admin_id === "string" ? body.admin_id : null;

      if (!Number.isInteger(count) || count < 1 || count > 50) {
        return json(
          { error: "La cantidad debe estar entre 1 y 50." },
          400
        );
      }

      if (!Number.isInteger(start) || start < 1) {
        return json({ error: "El número inicial no es válido." }, 400);
      }

      if (!prefix) {
        return json({ error: "El prefijo no es válido." }, 400);
      }

      if (password.length < 8) {
        return json(
          { error: "La contraseña debe tener 8 caracteres o más." },
          400
        );
      }

      const targetAdminId =
        caller.role === "admin" ? caller.id : requestedAdminId;

      if (!targetAdminId) {
        return json(
          { error: "Tenés que indicar el administrador de los cajeros." },
          400
        );
      }

      const { data: targetAdmin, error: targetAdminError } =
        await adminClient
          .from("players")
          .select("id,username,role,is_active,max_cashiers")
          .eq("id", targetAdminId)
          .single();

      if (targetAdminError) throw targetAdminError;

      if (
        !targetAdmin ||
        targetAdmin.role !== "admin" ||
        !targetAdmin.is_active
      ) {
        return json(
          { error: "El administrador seleccionado no es válido." },
          400
        );
      }

      const { count: currentCashiers, error: countError } =
        await adminClient
          .from("players")
          .select("id", { count: "exact", head: true })
          .eq("role", "cashier")
          .eq("parent_id", targetAdmin.id);

      if (countError) throw countError;

      const limit = targetAdmin.max_cashiers ?? 100;
      const available = limit - (currentCashiers ?? 0);

      if (count > available) {
        return json(
          {
            error: `El administrador solo tiene ${available} lugares disponibles.`,
          },
          400
        );
      }

      const created: Array<{
        username: string;
        email: string;
        player_id: string;
      }> = [];

      const failed: Array<{
        username: string;
        error: string;
      }> = [];

      for (let index = 0; index < count; index += 1) {
        const number = start + index;
        const username = `${prefix}${String(number).padStart(3, "0")}`;
        const email = `${username}@jackpot.com`;

        const { data: authData, error: authError } =
          await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              username,
              role: "cashier",
            },
          });

        if (authError || !authData.user) {
          failed.push({
            username,
            error: authError?.message ?? "No se pudo crear el usuario.",
          });
          continue;
        }

        // El alta en Authentication puede crear automáticamente el perfil
        // mediante un trigger. Primero intentamos actualizar ese perfil.
        let { data: playerData, error: playerError } =
          await adminClient
            .from("players")
            .update({
              username,
              display_name: username,
              role: "cashier",
              parent_id: targetAdmin.id,
              is_active: true,
              is_blocked: false,
              credits: 0,
            })
            .eq("auth_user_id", authData.user.id)
            .select("id")
            .maybeSingle();

        // Si el proyecto no tiene trigger de creación automática, creamos
        // el perfil manualmente.
        if (!playerError && !playerData) {
          const insertResult = await adminClient
            .from("players")
            .insert({
              auth_user_id: authData.user.id,
              username,
              display_name: username,
              role: "cashier",
              parent_id: targetAdmin.id,
              is_active: true,
              is_blocked: false,
              credits: 0,
            })
            .select("id")
            .single();

          playerData = insertResult.data;
          playerError = insertResult.error;
        }

        if (playerError || !playerData) {
          await adminClient.auth.admin.deleteUser(authData.user.id);

          failed.push({
            username,
            error:
              playerError?.message ??
              "No se pudo crear el perfil del cajero.",
          });
          continue;
        }

        created.push({
          username,
          email,
          player_id: playerData.id,
        });
      }

      return json({
        ok: failed.length === 0,
        admin_id: targetAdmin.id,
        admin_username: targetAdmin.username,
        requested: count,
        created_count: created.length,
        failed_count: failed.length,
        created,
        failed,
      });
    }

    if (body.action === "change_password") {
      if (
        typeof body.password !== "string" ||
        body.password.length < 8
      ) {
        return json(
          { error: "La contraseña debe tener 8 caracteres o más." },
          400
        );
      }

      const { data: player, error: playerError } = await adminClient
        .from("players")
        .select("auth_user_id,role,parent_id")
        .eq("id", body.player_id)
        .single();

      if (playerError) throw playerError;

    let parentCashier = null;

if (player?.role === "player" && player.parent_id) {
  const { data, error } = await adminClient
    .from("players")
    .select("role,parent_id")
    .eq("id", player.parent_id)
    .maybeSingle();

  if (error) throw error;

  parentCashier = data;
}

const canManage =
  caller.role === "super_admin" ||
  (
    caller.role === "admin" &&
    (
      (
        player.role === "cashier" &&
        player.parent_id === caller.id
      ) ||
      (
        player.role === "player" &&
        (
          player.parent_id === caller.id ||
          (
            parentCashier?.role === "cashier" &&
            parentCashier.parent_id === caller.id
          )
        )
      )
    )
  );

      const { error: passwordError } =
        await adminClient.auth.admin.updateUserById(
          player.auth_user_id,
          { password: body.password }
        );

     if (passwordError) {
  console.error("updateUserById:", passwordError);

  return json(
    {
      error: "updateUserById",
      details: passwordError,
    },
    500
  );
}

      const { error: logoutUpdateError } = await adminClient
        .from("players")
        .update({ force_logout_version: crypto.randomUUID() })
        .eq("id", body.player_id);

      if (logoutUpdateError) throw logoutUpdateError;

      return json({ ok: true });
    }

    if (body.action === "force_logout") {
      const { data: player, error: playerError } = await adminClient
  .from("players")
  .select("role,parent_id")
  .eq("id", body.player_id)
  .single();

if (playerError) throw playerError;

let parentCashier = null;

if (player?.role === "player" && player.parent_id) {
  const { data, error } = await adminClient
    .from("players")
    .select("role,parent_id")
    .eq("id", player.parent_id)
    .maybeSingle();

  if (error) throw error;
  parentCashier = data;
}

const canManage =
  caller.role === "super_admin" ||
  (
    caller.role === "admin" &&
    (
      (
        player.role === "cashier" &&
        player.parent_id === caller.id
      ) ||
      (
        player.role === "player" &&
        (
          player.parent_id === caller.id ||
          (
            parentCashier?.role === "cashier" &&
            parentCashier.parent_id === caller.id
          )
        )
      )
    )
  );

      if (!player || !canManage) {
  return json({
    player,
    canManage,
    caller,
  }, 400);
}

      const { error: logoutUpdateError } = await adminClient
        .from("players")
        .update({ force_logout_version: crypto.randomUUID() })
        .eq("id", body.player_id);

      if (logoutUpdateError) throw logoutUpdateError;

      return json({ ok: true });
    }

    if (body.action === "backup") {
      if (caller.role !== "super_admin") {
        return json({ error: "Solo el super administrador puede crear respaldos." }, 403);
      }

      const [players, transactions, settings] = await Promise.all([
        adminClient.from("players").select("*"),
        adminClient.from("credit_transactions").select("*"),
        adminClient.from("app_settings").select("*"),
      ]);

      if (players.error || transactions.error || settings.error) {
        throw players.error || transactions.error || settings.error;
      }

      return json({
        format: "charly-casino-backup-v1",
        created_at: new Date().toISOString(),
        players: players.data,
        credit_transactions: transactions.data,
        app_settings: settings.data,
      });
    }

    if (body.action === "restore") {
      if (caller.role !== "super_admin") {
        return json(
          { error: "Solo el super administrador puede restaurar respaldos." },
          403
        );
      }

      const backup = body.backup;

      if (
        !backup ||
        backup.format !== "charly-casino-backup-v1" ||
        !Array.isArray(backup.players)
      ) {
        return json({ error: "Backup inválido." }, 400);
      }

      const safePlayers = backup.players.map(
        (player: Record<string, unknown>) => ({
          ...player,
          force_logout_version: crypto.randomUUID(),
        })
      );

      const playersResult = await adminClient
        .from("players")
        .upsert(safePlayers, { onConflict: "id" });

      if (playersResult.error) throw playersResult.error;

      if (
        Array.isArray(backup.credit_transactions) &&
        backup.credit_transactions.length
      ) {
        const transactionsResult = await adminClient
          .from("credit_transactions")
          .upsert(backup.credit_transactions, { onConflict: "id" });

        if (transactionsResult.error) throw transactionsResult.error;
      }

      if (
        Array.isArray(backup.app_settings) &&
        backup.app_settings.length
      ) {
        const settingsResult = await adminClient
          .from("app_settings")
          .upsert(backup.app_settings, { onConflict: "id" });

        if (settingsResult.error) throw settingsResult.error;
      }

      return json({ ok: true });
    }

    return json({ error: "Acción desconocida." }, 400);
  } catch (error) {
    console.error("Error en admin-actions:", error);

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