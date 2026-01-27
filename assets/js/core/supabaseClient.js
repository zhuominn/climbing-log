import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/+esm";

// NOTE: 这里沿用你现有 key；如需更安全可改为运行时注入/环境变量方案
const supabaseUrl = "https://xcfendynbsrmpgalpefk.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZmVuZHluYnNybXBnYWxwZWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mjg5NTQsImV4cCI6MjA4MTAwNDk1NH0.Jec4x0rNk5InJUCMwkbPoCYHdWEia1tv3Y1xJCboEpo";

export const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
});

let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

export async function initAuthSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("initAuthSession error:", error);
  }
  currentUser = data?.session?.user ?? null;

  window.dispatchEvent(
    new CustomEvent("auth-changed", { detail: { user: currentUser } })
  );

  return currentUser;
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user ?? null;
  window.dispatchEvent(
    new CustomEvent("auth-changed", { detail: { user: currentUser } })
  );
});
