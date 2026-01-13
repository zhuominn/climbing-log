import { initAuthSession, getCurrentUser } from "../core/supabaseClient.js";

function setStatus(text) {
  const el = document.querySelector(".card-title");
  if (el) el.textContent = text;
}

const fallback = window.setTimeout(() => {
  // 兜底：无论如何都别卡在首页
  window.location.replace("./login.html?next=2026.html");
}, 1500);

(async () => {
  try {
    setStatus("检查登录状态…");
    await initAuthSession();

    const user = getCurrentUser();
    window.clearTimeout(fallback);

    if (user) {
      window.location.replace("./2026.html");
    } else {
      window.location.replace("./login.html?next=2026.html");
    }
  } catch (e) {
    console.error("index redirect failed:", e);
    setStatus("跳转失败，准备进入登录页…");
    // 不清 fallback，让它继续触发跳转
  }
})();