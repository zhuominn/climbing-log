// ===== 登录/登出 UI 和逻辑 =====

function getSafeNextUrl() {
  const params = new URLSearchParams(window.location.search);
  const next = (params.get("next") || "").trim();

  // 允许：2026.html / 2025.html / 2026.html?x=y 等（同站点相对路径）
  // 拒绝：带协议、双斜杠等
  if (!next) return "./2026.html";
  if (next.includes("://") || next.startsWith("//")) return "./2026.html";

  // 规范化：只允许相对路径（GitHub Pages 友好）
  if (next.startsWith("./")) return next;
  if (next.startsWith("/")) return "." + next; // 仍相对当前站点根
  return "./" + next;
}

function updateAuthUI(user) {
  const statusEl = document.getElementById("auth-status");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const loginBtn = document.getElementById("auth-login-btn");
  const logoutBtn = document.getElementById("auth-logout-btn");

  if (!statusEl || !emailInput || !passwordInput || !loginBtn || !logoutBtn) {
    return;
  }

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

function initAuthUI() {
  const loginBtn = document.getElementById("auth-login-btn");
  const logoutBtn = document.getElementById("auth-logout-btn");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");

  if (!loginBtn || !logoutBtn || !emailInput || !passwordInput) return;

  // 登录按钮：使用 email + password 登录
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("请填写邮箱和密码");
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "登录中…";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    loginBtn.disabled = false;
    loginBtn.textContent = "登录";

    if (error) {
      console.error("登录失败：", error);
      alert("登录失败，请检查邮箱和密码，或者到 Supabase Users 中确认账号已创建。");
      return;
    }

    // 登录成功：跳转到 next 或默认 2026
    window.location.replace(getSafeNextUrl());
  });

  // 退出登录
  logoutBtn.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error("退出登录失败：", error);
      alert("退出登录失败，请稍后再试。");
      return;
    }
    alert("已退出登录");
  });

  // 监听全局 auth 状态变化
  window.addEventListener("auth-changed", (e) => {
    updateAuthUI(e.detail.user);
  });
}

// 页面加载时初始化
window.addEventListener("DOMContentLoaded", async () => {
  if (window.initAuthSession) {
    await window.initAuthSession();
  }
  initAuthUI();
});
