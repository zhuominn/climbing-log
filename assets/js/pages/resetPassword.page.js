import { supabaseClient } from "../core/supabaseClient.js";

function setStatus(text) {
  const el = document.getElementById("rp-status");
  if (el) el.textContent = text;
}

function showForm() {
  const form = document.getElementById("rp-form");
  if (form) form.style.display = "block";
}

function setHint(text) {
  const el = document.getElementById("rp-hint");
  if (el) el.textContent = text || "";
}

async function ensureRecoverySessionFromUrl() {
  // 兼容 PKCE：?code=...
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");

  if (code) {
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data?.session ?? null;
  }

  // 兼容 hash：#access_token=...&type=recovery
  // supabase-js 通常会在 createClient 时 detectSessionInUrl 自动处理
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data?.session ?? null;
}

async function main() {
  setStatus("检测恢复链接中…");
  setHint("");

  let session = null;
  try {
    session = await ensureRecoverySessionFromUrl();
  } catch (e) {
    console.error(e);
    setStatus("恢复链接无效或已过期。请重新发起找回密码。");
    return;
  }

  // 对 recovery 链接：session 可能存在，也可能需要用户重新打开链接
  if (!session?.user) {
    setStatus("未检测到有效恢复会话。请从邮件链接重新进入此页面。");
    return;
  }

  setStatus(`已验证：${session.user.email || "用户"}，请设置新密码`);
  showForm();

  const btn = document.getElementById("rp-submit");
  const p1 = document.getElementById("rp-password");
  const p2 = document.getElementById("rp-password2");

  btn?.addEventListener("click", async () => {
    const a = (p1?.value || "").trim();
    const b = (p2?.value || "").trim();

    if (a.length < 6) return setHint("密码至少 6 位。");
    if (a !== b) return setHint("两次输入的密码不一致。");

    btn.disabled = true;
    btn.textContent = "更新中…";
    setHint("");

    try {
      const { error } = await supabaseClient.auth.updateUser({ password: a });
      if (error) throw error;

      setStatus("密码已更新。请用新密码重新登录。");

      // 出于安全，更新后退出（避免恢复态继续留在浏览器里）
      await supabaseClient.auth.signOut();

      btn.textContent = "更新成功";
      window.setTimeout(() => window.location.replace("./login.html"), 600);
    } catch (e) {
      console.error(e);
      setHint("更新失败：请确认链接未过期，并重试。");
      btn.disabled = false;
      btn.textContent = "更新密码";
    }
  });
}

main().catch((e) => {
  console.error(e);
  setStatus("发生错误，请查看控制台。");
});