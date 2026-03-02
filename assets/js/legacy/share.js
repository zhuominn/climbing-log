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

function getPageYear() {
  const y = Number(document.body?.dataset?.year);
  return Number.isFinite(y) ? y : (window.currentYear || 2025);
}

function setReadOnlyUI(isReadOnly) {
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

  const tbody = document.getElementById("log-tbody");
  if (tbody && isReadOnly) {
    tbody.querySelectorAll("td").forEach((td) => {
      td.contentEditable = "false";
    });
  }
}

async function loadSharedLogs(token) {
  const tbody = document.getElementById("log-tbody");
  if (!tbody) return;

  const year = getPageYear();
  window.currentYear = year;

  const { data, error } = await supabaseClient.rpc("get_shared_logs", { p_token: token });

  if (error) {
    console.error("加载分享数据失败：", error);
    alert("分享链接无效或已过期。");
    return;
  }

  const rows = (data || []).filter((r) => typeof r.date === "string" && r.date.startsWith(`${year}-`));

  tbody.innerHTML = "";
  climbDays = [];

  // heatmap minutes
  window.minutesByDay = {};
  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.id = row.date ? "row-" + row.date : "";
    tr.dataset.date = row.date || "";

    const tdSeq = document.createElement("td");
    tdSeq.textContent = index + 1;
    tr.appendChild(tdSeq);

    const cols = [
      row.date,
      row.duration || "—",
      row.content || "",
      row.gym || "",
      row.note || "",
    ];

    cols.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "";
      td.contentEditable = "false";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);

    if (row.date) climbDays.push(row.date);

    const minutes = window.durationUtils?.parseDurationToMinutes?.(row.duration);
    if (typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0) {
      window.minutesByDay[row.date] = minutes;
    }
  });

  // 月历
  const calId = "calendar-" + year;
  const calendarContainer = document.getElementById(calId);
  if (calendarContainer) {
    calendarContainer.innerHTML = "";
    generateCalendar(year, calId);
    initMonthTabs(year);
  }

  // heatmap（如果页面有）
  const heatId = "heatmap-" + year;
  const heatContainer = document.getElementById(heatId);
  if (heatContainer && typeof window.generateGithubHeatmap === "function") {
    window.generateGithubHeatmap(year, heatId, window.minutesByDay || {});
  }
}

async function initShareButtons() {
  const genBtn = document.getElementById("generate-share-btn");
  const copyBtn = document.getElementById("copy-share-btn");

  if (!genBtn || !copyBtn) return;

  let currentShareLink = "";

  window.addEventListener("auth-changed", (e) => {
    const user = e.detail.user;
    const show = !!user;
    genBtn.style.display = show ? "inline-flex" : "none";
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
      expires_at: null,
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
  const year = getPageYear();
  window.currentYear = year;

  const token = getShareTokenFromUrl();
  if (token) {
    setReadOnlyUI(true);
    await loadSharedLogs(token);

    const authCard = document.getElementById("auth-card");
    if (authCard) authCard.style.display = "none";
  } else {
    initShareButtons();
  }

  window.addEventListener("month-changed", (e) => {
    const { year, monthIndex } = e.detail;
    window.tableFilter.filterTableByMonth(year, monthIndex);
  });

  window.tableFilter.filterTableByMonth(window.currentYear, window.currentMonthIndex);
});
