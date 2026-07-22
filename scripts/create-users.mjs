import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TOTAL_USERS = 200;
const EMAIL_DOMAIN = "jackpot.com";
const INITIAL_PASSWORD = "Jackpot2026";
const INITIAL_CREDITS = 1000;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("\nFaltan variables de entorno.");
  console.error("Necesitás SUPABASE_URL (o VITE_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.\n");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function usernameFor(number) {
  return `u${String(number).padStart(3, "0")}`;
}

async function loadAllAuthUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const batch = data?.users || [];
    users.push(...batch);

    if (batch.length < 1000) break;
    page += 1;
  }

  return users;
}

async function main() {
  console.log("\nGenerando usuarios u001 a u200...");
  console.log(`Créditos iniciales: ${INITIAL_CREDITS}`);
  console.log(`Contraseña inicial: ${INITIAL_PASSWORD}\n`);

  const existingAuthUsers = await loadAllAuthUsers();
  const authByEmail = new Map(
    existingAuthUsers
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user])
  );

  let created = 0;
  let reused = 0;
  let profilesSaved = 0;
  const failures = [];

  for (let number = 1; number <= TOTAL_USERS; number += 1) {
    const username = usernameFor(number);
    const email = `${username}@${EMAIL_DOMAIN}`;
    let authUser = authByEmail.get(email);

    try {
      if (!authUser) {
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password: INITIAL_PASSWORD,
          email_confirm: true,
          user_metadata: {
            username,
            display_name: `Usuario ${String(number).padStart(3, "0")}`,
          },
        });

        if (error) throw error;
        authUser = data.user;
        authByEmail.set(email, authUser);
        created += 1;
      } else {
        reused += 1;
      }

      const { data: existingProfile, error: lookupError } = await supabase
        .from("players")
        .select("id")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from("players")
          .insert({
            auth_user_id: authUser.id,
            username,
            display_name: `Usuario ${String(number).padStart(3, "0")}`,
            credits: INITIAL_CREDITS,
            is_admin: false,
            is_blocked: false,
          });

        if (profileError) throw profileError;
      }

      profilesSaved += 1;
      process.stdout.write(`\rProcesados: ${number}/${TOTAL_USERS}`);
    } catch (error) {
      failures.push({ username, error: error.message || String(error) });
      process.stdout.write(`\rProcesados: ${number}/${TOTAL_USERS}`);
    }
  }

  console.log("\n\nProceso terminado.");
  console.log(`Cuentas nuevas: ${created}`);
  console.log(`Cuentas existentes reutilizadas: ${reused}`);
  console.log(`Perfiles guardados: ${profilesSaved}`);

  if (failures.length > 0) {
    console.log(`Errores: ${failures.length}`);
    for (const failure of failures) {
      console.log(`- ${failure.username}: ${failure.error}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Los 200 usuarios quedaron listos.");
  }
}

main().catch((error) => {
  console.error("\nError general:", error.message || error);
  process.exit(1);
});
