import { supabaseClient, initAuthSession, getCurrentUser } from "../core/supabaseClient.js";

function getSafeNextUrl() {
  const params = new URLSearchParams(window.location.search);
  const next = (params.get("next") || "").trim();

  if (!next) return "./2026.html";
  if (next.includes("://") || next.startsWith("//")) return "./2026.html";
  if (next.startsWith("./")) return next;
  if (next.startsWith("/")) return "." + next;
  return "./" + next;
}

function updateAuthUI(user) {
  const statusEl = document.getElementById("auth-status");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const loginBtn = document.getElementById("auth-login-btn");
  const logoutBtn = document.getElementById("auth-logout-btn");

  if (!statusEl || !emailInput || !passwordInput || !loginBtn || !logoutBtn) return;

  if (user) {
    statusEl.textContent = `已登录：${user.email || "已登录用户"}`;
    emailInput.style.display = "none";
    passwordInput.style.display = "none";
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-flex";
  } else {
    statusEl.textContent = "未登录";
    emailInput.style.display = "inline-flex";
    passwordInput.style.display = "inline-flex";
    loginBtn.style.display = "inline-flex";
    logoutBtn.style.display = "none";
  }
}

async function main() {
  await initAuthSession();
  updateAuthUI(getCurrentUser());

  window.addEventListener("auth-changed", (e) => updateAuthUI(e.detail.user));

  const loginBtn = document.getElementById("auth-login-btn");
  const logoutBtn = document.getElementById("auth-logout-btn");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");

  if (loginBtn && emailInput && passwordInput) {
    loginBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      if (!email || !password) return alert("请填写邮箱和密码");

      loginBtn.disabled = true;
      loginBtn.textContent = "登录中…";

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

      loginBtn.disabled = false;
      loginBtn.textContent = "登录";

      if (error) {
        console.error("AUTH ERROR:", error.status, error.message);
        alert(`${error.status || ""} ${error.message}`);
        return;
      }

      window.location.replace(getSafeNextUrl());
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        console.error(error);
        return alert("退出登录失败，请稍后再试。");
      }
      alert("已退出登录");
    });
  }
}

main().catch(console.error);