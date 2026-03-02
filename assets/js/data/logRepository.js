import { supabaseClient } from "../core/supabaseClient.js";

export async function listByYear(year) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const { data, error } = await supabaseClient
    .from("climbing_logs")
    .select("*")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function insertLogs(rows) {
  const { data, error } = await supabaseClient.from("climbing_logs").insert(rows).select();
  if (error) throw error;
  return data || [];
}

export async function upsertLogs(rows) {
  const { data, error } = await supabaseClient.from("climbing_logs").upsert(rows).select();
  if (error) throw error;
  return data || [];
}

export async function deleteLogById(id) {
  const { error } = await supabaseClient.from("climbing_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function listShared(token) {
  const { data, error } = await supabaseClient.rpc("get_shared_logs", { p_token: token });
  if (error) throw error;
  return data || [];
}

export async function createShareTokenLink(ownerUserId) {
  const token = randomToken(16);
  const { error } = await supabaseClient.from("share_links").insert({
    token,
    owner_user_id: ownerUserId,
    expires_at: null,
  });
  if (error) throw error;

  const url = new URL(window.location.href);
  url.searchParams.set("share", token);
  return url.toString();
}

function randomToken(len = 24) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
