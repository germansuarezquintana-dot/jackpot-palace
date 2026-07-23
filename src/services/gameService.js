import { supabase } from "../supabase";

export async function getJackpot() {
  const { data, error } = await supabase
    .from("casino_jackpot")
    .select("current_amount")
    .eq("id", 1)
    .single();

  if (error) throw error;

  return data.current_amount;
}

export async function addJackpotContribution(bet) {
  const { data, error } = await supabase.rpc(
    "add_jackpot_contribution",
    {
      p_bet: bet,
    }
  );

  if (error) throw error;

  return data;
}
export async function claimJackpot() {
  const { data, error } = await supabase.rpc("claim_jackpot");

  if (error) throw error;

  return data;
}