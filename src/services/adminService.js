import { supabase } from "../supabase";

async function invokeAdminAction(body) {
  const { data, error } = await supabase.functions.invoke("admin-actions", {
    body,
  });

  if (error) {
    throw new Error(error.message || "No se pudo ejecutar la acción.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function changePlayerPassword(playerId, password) {
  return invokeAdminAction({
    action: "change_password",
    player_id: playerId,
    password,
  });
}