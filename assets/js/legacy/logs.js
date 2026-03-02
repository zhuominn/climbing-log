function getPageYear() {
  const y = Number(document.body?.dataset?.year);
  return Number.isFinite(y) ? y : (window.currentYear || 2025);
}

function setEditorButtonsVisible(canEdit) {
  const ids = ["add-row-btn", "save-new-rows-btn", "save-edits-btn", "delete-selected-btn"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = canEdit ? "inline-flex" : "none";
  });
}

function addEditableCellToRow(tr, value, options = {}) {
  const td = document.createElement("td");
  const div = document.createElement("div");

  div.classList.add("log-cell");
  div.textContent = value ?? "";
  div.contentEditable = "true";

  if (options.dateCell) {
    div.dataset.dateCell = "true";
  }

  div.addEventListener("input", () => {
    tr.dataset.dirty = "true";
    tr.classList.add("edited-row");
  });

  td.appendChild(div);
  tr.appendChild(td);
  return div;
}

function computeMinutesByDay(rows) {
  const map = {};
  for (const row of rows) {
    const date = row?.date;
    if (!date) continue;

    const minutes = window.durationUtils?.parseDurationToMinutes?.(row.duration);
    if (typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0) {
      map[date] = minutes;
    }
  }
  return map;
}

// ===== 从 Supabase 加载攀岩记录并渲染表格 =====
async function loadLogsFromSupabase() {
  const tbody = document.getElementById("log-tbody");
  if (!tbody) return;

  const year = getPageYear();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const { data, error } = await supabaseClient
    .from("climbing_logs")
    .select("*")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  if (error) {
    console.error("加载攀岩记录失败：", error);
    return;
  }

  tbody.innerHTML = "";
  climbDays = [];

  // 供 2026 heatmap 使用
  window.minutesByDay = computeMinutesByDay(data || []);

  (data || []).forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.dataset.id = row.id;
    tr.dataset.date = row.date || "";
    tr.id = row.date ? "row-" + row.date : "";
    tr.dataset.new = "false";

    const tdSeq = document.createElement("td");
    tdSeq.textContent = index + 1;
    tr.appendChild(tdSeq);

    addEditableCellToRow(tr, row.date, { dateCell: true });
    addEditableCellToRow(tr, row.duration || "—");
    addEditableCellToRow(tr, row.content || "");
    addEditableCellToRow(tr, row.gym || "");
    addEditableCellToRow(tr, row.note || "");

    tbody.appendChild(tr);

    if (row.date) {
      climbDays.push(row.date);
    }
  });
}

function refreshYearVisuals() {
  const year = getPageYear();

  // 月历
  const calendarContainer = document.getElementById("calendar-" + year);
  if (calendarContainer) {
    calendarContainer.innerHTML = "";
    generateCalendar(year, "calendar-" + year);
    initMonthTabs(year);
  }

  // heatmap（只要容器存在就渲染；2026 页会有）
  const heatmapContainer = document.getElementById("heatmap-" + year);
  if (heatmapContainer && typeof window.generateGithubHeatmap === "function") {
    window.generateGithubHeatmap(year, "heatmap-" + year, window.minutesByDay || {});
  }
}

// 判断是否是分享模式
function isShareMode() {
  const params = new URLSearchParams(window.location.search);
  return !!params.get("share");
}

// ===== 攀岩训练表格：新增行 + 保存新记录 + 保存修改 =====
function initAddRow() {
  const addRowBtn = document.getElementById("add-row-btn");
  const saveNewRowsBtn = document.getElementById("save-new-rows-btn");
  const saveEditsBtn = document.getElementById("save-edits-btn");
  const tbody = document.getElementById("log-tbody");
  const deleteSelectedBtn = document.getElementById("delete-selected-btn");
  if (!addRowBtn || !saveNewRowsBtn || !saveEditsBtn || !deleteSelectedBtn || !tbody) return;

  function readLogCellText(td) {
    const cell = td?.querySelector?.(".log-cell");
    if (cell && typeof cell.innerText === "string") return cell.innerText;
    if (cell && typeof cell.textContent === "string") return cell.textContent;
    if (td && typeof td.textContent === "string") return td.textContent;
    return "";
  }

  function getNextSeq() {
    const rows = tbody.querySelectorAll("tr");
    return rows.length + 1;
  }

  function defaultDateForNewRow() {
    const year = getPageYear();
    const m = typeof window.currentMonthIndex === "number" ? window.currentMonthIndex : 0;
    return `${year}-${String(m + 1).padStart(2, "0")}-01`;
  }

  // 新增一行
  addRowBtn.addEventListener("click", () => {
    if (!window.currentUser) {
      alert("请先登录后再新增记录。");
      return;
    }

    const seq = getNextSeq();
    const tr = document.createElement("tr");
    tr.dataset.new = "true";

    const tdSeq = document.createElement("td");
    tdSeq.textContent = seq;
    tr.appendChild(tdSeq);

    const cells = [
      { value: defaultDateForNewRow(), options: { dateCell: true } },
      { value: "—" },
      { value: "" },
      { value: "" },
      { value: "" },
    ];

    let dateDiv = null;
    cells.forEach((c, idx) => {
      const div = addEditableCellToRow(tr, c.value, c.options || {});
      if (idx === 0) dateDiv = div;
    });

    tbody.appendChild(tr);
    tr.scrollIntoView({ behavior: "smooth", block: "center" });
    dateDiv?.focus();
  });

  // 日期单元格失焦：设置 tr.id / tr.dataset.date 供跳转与过滤使用
  tbody.addEventListener(
    "blur",
    (e) => {
      const target = e.target;
      if (target instanceof HTMLElement && target.dataset.dateCell === "true") {
        const text = (target.textContent || "").trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
          const tr = target.closest("tr");
          if (tr) {
            tr.id = "row-" + text;
            tr.dataset.date = text;
          }
        }
      }
    },
    true
  );

  // 保存新记录到云端
  saveNewRowsBtn.addEventListener("click", async () => {
    if (!window.currentUser) {
      alert("请先登录后再保存新记录。");
      return;
    }

    const newRows = Array.from(tbody.querySelectorAll("tr[data-new='true']"));
    if (newRows.length === 0) {
      alert("没有需要保存的新记录。");
      return;
    }

    const payload = [];
    for (const tr of newRows) {
      const tds = tr.querySelectorAll("td");
      const dateStr = readLogCellText(tds[1]).trim();
      const duration = readLogCellText(tds[2]).trim();
      const content = readLogCellText(tds[3]).trim();
      const gym = readLogCellText(tds[4]).trim();
      const note = readLogCellText(tds[5]).trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        alert("日期格式请按 YYYY-MM-DD 填写。出错行序号：" + tds[0].textContent);
        return;
      }

      payload.push({
        date: dateStr,
        duration,
        content,
        gym,
        note,
        user_id: window.currentUser.id,
      });
    }

    saveNewRowsBtn.disabled = true;
    saveNewRowsBtn.textContent = "保存中…";

    const { error } = await supabaseClient.from("climbing_logs").insert(payload).select();

    saveNewRowsBtn.disabled = false;
    saveNewRowsBtn.textContent = "💾 保存新记录到云端";

    if (error) {
      console.error("保存新记录失败：", error);
      alert("保存到云端失败，请稍后再试。");
      return;
    }

    await loadLogsFromSupabase();
    window.tableFilter.filterTableByMonth(window.currentYear, window.currentMonthIndex);
    refreshYearVisuals();

    alert("新记录已保存到云端！");
  });

  // 保存已修改行（UPDATE）
  saveEditsBtn.addEventListener("click", async () => {
    if (!window.currentUser) {
      alert("请先登录后再保存已修改行。");
      return;
    }

    const editedRows = Array.from(tbody.querySelectorAll("tr[data-dirty='true']"))
      .filter((tr) => tr.dataset.new !== "true");

    if (editedRows.length === 0) {
      alert("没有需要保存的修改。");
      return;
    }

    const updates = [];
    for (const tr of editedRows) {
      const id = Number(tr.dataset.id);
      const tds = tr.querySelectorAll("td");
      const dateStr = readLogCellText(tds[1]).trim();
      const duration = readLogCellText(tds[2]).trim();
      const content = readLogCellText(tds[3]).trim();
      const gym = readLogCellText(tds[4]).trim();
      const note = readLogCellText(tds[5]).trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        alert("日期格式请按 YYYY-MM-DD 填写。出错行序号：" + tds[0].textContent);
        return;
      }

      updates.push({
        id,
        date: dateStr,
        duration,
        content,
        gym,
        note,
        user_id: window.currentUser.id,
      });
    }

    saveEditsBtn.disabled = true;
    saveEditsBtn.textContent = "保存修改中…";

    const { error } = await supabaseClient.from("climbing_logs").upsert(updates).select();

    saveEditsBtn.disabled = false;
    saveEditsBtn.textContent = "✅ 保存已修改行";

    if (error) {
      console.error("保存修改失败：", error);
      alert("保存修改失败，请稍后再试。");
      return;
    }

    await loadLogsFromSupabase();
    window.tableFilter.filterTableByMonth(window.currentYear, window.currentMonthIndex);
    refreshYearVisuals();

    alert("修改已保存到云端！");
  });

  // 👉 删除当前选中行
  deleteSelectedBtn.addEventListener("click", async () => {
    if (!window.currentUser) {
      alert("请先登录后再进行删除操作。");
      return;
    }

    const selected = tbody.querySelector("tr.highlight-row");
    if (!selected) {
      alert("请先点击要删除的那一行（整行会高亮）。");
      return;
    }

    const seqCell = selected.querySelector("td");
    const seqText = seqCell ? seqCell.textContent : "";

    if (!confirm(`确定要删除第 ${seqText} 行记录吗？`)) return;

    if (selected.dataset.new === "true") {
      selected.remove();
      renumberRows();
      return;
    }

    const id = Number(selected.dataset.id);
    if (!id) {
      console.error("该行缺少 id，无法删除");
      return;
    }

    deleteSelectedBtn.disabled = true;
    deleteSelectedBtn.textContent = "删除中…";

    const { error } = await supabaseClient.from("climbing_logs").delete().eq("id", id);

    deleteSelectedBtn.disabled = false;
    deleteSelectedBtn.textContent = "🗑 删除当前选中行";

    if (error) {
      console.error("删除失败：", error);
      alert("删除失败，请稍后再试。");
      return;
    }

    await loadLogsFromSupabase();
    window.tableFilter.filterTableByMonth(window.currentYear, window.currentMonthIndex);
    refreshYearVisuals();
  });
}

function initRowSelection() {
  const tbody = document.getElementById("log-tbody");
  if (!tbody) return;

  tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;

    document.querySelectorAll("#log-tbody tr").forEach((row) => {
      row.classList.remove("highlight-row");
      row.classList.remove("row-expanded");
    });

    tr.classList.add("highlight-row");
    tr.classList.add("row-expanded");
  });
}

function renumberRows() {
  const tbody = document.getElementById("log-tbody");
  if (!tbody) return;
  const rows = tbody.querySelectorAll("tr");
  rows.forEach((tr, idx) => {
    const firstCell = tr.querySelector("td");
    if (firstCell) firstCell.textContent = idx + 1;
  });
}

// ===== 入口 =====
window.addEventListener("DOMContentLoaded", async () => {
  if (isShareMode()) return;

  // 以页面 year 为准
  window.currentYear = getPageYear();

  if (window.initAuthSession) {
    await window.initAuthSession();
  }

  // 未登录：只读（隐藏编辑按钮）
  setEditorButtonsVisible(!!window.currentUser);
  window.addEventListener("auth-changed", (e) => setEditorButtonsVisible(!!e.detail.user));

  await loadLogsFromSupabase();

  window.addEventListener("month-changed", (e) => {
    const { year, monthIndex } = e.detail;
    window.tableFilter.filterTableByMonth(year, monthIndex);
  });

  refreshYearVisuals();
  initAddRow();
  initRowSelection();

  window.tableFilter.filterTableByMonth(window.currentYear, window.currentMonthIndex);
});
