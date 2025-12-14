// ===== Supabase 初始化 & 全局数据 =====
const supabaseUrl = "https://xcfendynbsrmpgalpefk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZmVuZHluYnNybXBnYWxwZWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mjg5NTQsImV4cCI6MjA4MTAwNDk1NH0.Jec4x0rNk5InJUCMwkbPoCYHdWEia1tv3Y1xJCboEpo";

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// 全局攀岩日期列表，供日历和其它模块使用
// 注意：不要用 const，后面会重置它
let climbDays = [];


// 当前登录用户（未登录时为 null）
window.currentUser = null;

// 初始化时获取一次 Session
async function initAuthSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("获取 Session 失败：", error);
    return;
  }
  window.currentUser = data.session?.user ?? null;
  // 通知其它脚本：登录状态变化
  window.dispatchEvent(
    new CustomEvent("auth-changed", { detail: { user: window.currentUser } })
  );
}

// 监听 Supabase 的登录状态变化（登录 / 登出）
supabaseClient.auth.onAuthStateChange((_event, session) => {
  window.currentUser = session?.user ?? null;
  window.dispatchEvent(
    new CustomEvent("auth-changed", { detail: { user: window.currentUser } })
  );
});

// 暴露给其他脚本调用
window.initAuthSession = initAuthSession;

