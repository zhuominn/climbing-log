(function () {
  function getNextForLogin() {
    const file = (location.pathname.split("/").pop() || "").trim();
    const qs = location.search || "";
    return file + qs;
  }

  function update(user) {
    const statusEl = document.getElementById("session-status");
    const loginLink = document.getElementById("session-login-link");
    const logoutBtn = document.getElementById("session-logout-btn");

    if (!statusEl || !loginLink || !logoutBtn) return;

    if (user) {
      statusEl.textContent = user.email ? `已登录：${user.email}` : "已登录";
      loginLink.style.display = "none";
      logoutBtn.style.display = "inline-flex";
    } else {
      statusEl.textContent = "未登录（只读）";
      loginLink.style.display = "inline-flex";
      logoutBtn.style.display = "none";
      loginLink.href = `./login.html?next=${encodeURIComponent(getNextForLogin())}`;
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    update(window.currentUser);

    const logoutBtn = document.getElementById("session-logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
          console.error("退出登录失败：", error);
          alert("退出登录失败，请稍后再试。");
          return;
        }
        alert("已退出登录");
      });
    }

    window.addEventListener("auth-changed", (e) => update(e.detail.user));
  });
})();