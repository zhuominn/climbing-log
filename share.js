// ===== Share Mode: generate share link + load shared logs by token =====

function randomToken(len = 24) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getShareTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("share");
}

function setReadOnlyUI(isReadOnly) {
  // 只读模式：隐藏编辑按钮（你已有的按钮 ID）
  const editorButtons = [
    "add-row-btn",
    "save-new-rows-btn",
    "save-edits-btn",
    "delete-selected-btn",
  ].map((id) => document.getElementById(id));

  editorButtons.forEach((btn) => {
    if (!btn) return;
    btn.style.display = isReadOnly ? "none" : "inline-flex";
  });

  // 只读模式：表格不可编辑（contentEditable 关掉）
  const tbody = document.getElementById("log-tbody");
  if (tbody) {
    tbody.querySelectorAll("td").forEach((td, idx) => {
      // 第 1 列序号不管，其他列只要不是只读模式就保持可编辑（你的逻辑会重新渲染）
      if (isReadOnly) td.contentEditable = "false";
    });
  }
}

async function loadSharedLogs(token) {
  const tbody = document.getElementById("log-tbody");
  if (!tbody) return;

  const { data, error } = await supabaseClient
    .rpc("get_shared_logs", { p_token: token });

  if (error) {
    console.error("加载分享数据失败：", error);
    alert("分享链接无效或已过期。");
    return;
  }

  // 用你当前的渲染逻辑来填表：这里做一个最小实现（只读）
  tbody.innerHTML = "";
  climbDays = [];

  data.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.id = "row-" + row.date;

    const tdSeq = document.createElement("td");
    tdSeq.textContent = index + 1;
    tr.appendChild(tdSeq);

    const cols = [
      row.date,
      row.duration || "—",
      row.content || "",
      row.result || "",
      row.note || "",
    ];

    cols.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "";
      td.contentEditable = "false"; // 分享模式只读
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
    if (row.date) climbDays.push(row.date);
  });

  // 刷新日历（你已有的函数在 calendar.js）
  const calendarContainer = document.getElementById("calendar-2025");
  if (calendarContainer) {
    calendarContainer.innerHTML = "";
    generateCalendar(2025, "calendar-2025");
    initMonthTabs(2025);
  }
}

async function initShareButtons() {
  const genBtn = document.getElementById("generate-share-btn");
  const copyBtn = document.getElementById("copy-share-btn");

  if (!genBtn || !copyBtn) return;

  let currentShareLink = "";

  // 登录状态变化时：只有登录用户才显示“生成分享链接”
  window.addEventListener("auth-changed", (e) => {
    const user = e.detail.user;
    const show = !!user;
    genBtn.style.display = show ? "inline-flex" : "none";
    // copyBtn 只有生成后才显示
    if (!show) {
      copyBtn.style.display = "none";
      currentShareLink = "";
    }
  });

  genBtn.addEventListener("click", async () => {
    if (!window.currentUser) {
      alert("请先登录后生成分享链接。");
      return;
    }

    genBtn.disabled = true;
    genBtn.textContent = "生成中…";

    const token = randomToken(16);
    const { error } = await supabaseClient.from("share_links").insert({
      token,
      owner_user_id: window.currentUser.id,
      expires_at: null, // 你也可以后续做“7天过期”
    });

    genBtn.disabled = false;
    genBtn.textContent = "🔗 生成分享链接";

    if (error) {
      console.error("生成分享链接失败：", error);
      alert("生成分享链接失败，请稍后再试。");
      return;
    }

    currentShareLink = `${window.location.origin}${window.location.pathname}?share=${token}`;
    copyBtn.style.display = "inline-flex";
    alert("分享链接已生成！");
  });

  copyBtn.addEventListener("click", async () => {
    if (!currentShareLink) return;
    await navigator.clipboard.writeText(currentShareLink);
    alert("已复制分享链接！");
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  const token = getShareTokenFromUrl();
  if (token) {
    // 进入分享只读模式
    setReadOnlyUI(true);

    // 加载分享数据（不需要登录）
    await loadSharedLogs(token);

    // 隐藏登录卡片（可选）
    const authCard = document.getElementById("auth-card");
    if (authCard) authCard.style.display = "none";
  } else {
    // 非分享模式：初始化分享按钮（只对登录用户显示）
    initShareButtons();
  }
});
