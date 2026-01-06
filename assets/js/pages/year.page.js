import { initAuthSession, getCurrentUser, supabaseClient } from "../core/supabaseClient.js";
import { listByYear, listShared, insertLogs, upsertLogs, deleteLogById, createShareTokenLink } from "../data/logRepository.js";
import { parseDurationToMinutes } from "../shared/durationUtils.js";
import { generateCalendar, initMonthTabs } from "../features/monthCalendar.js";
import { filterTableByMonth } from "../features/tableFilter.js";
import { renderGithubHeatmap } from "../features/githubHeatmap.js";

function getPageYear() {
  const y = Number(document.body?.dataset?.year);
  return Number.isFinite(y) ? y : 2025;
}

function getShareTokenFromUrl() {
  return new URLSearchParams(location.search).get("share");
}

function computeMinutesByDay(rows) {
  const map = {};
  for (const r of rows) {
    if (!r?.date) continue;
    const minutes = parseDurationToMinutes(r.duration);
    if (typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0) map[r.date] = minutes;
  }
  return map;
}

function setEditorButtonsVisible(canEdit) {
  ["add-row-btn", "save-new-rows-btn", "save-edits-btn", "delete-selected-btn"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = canEdit ? "inline-flex" : "none";
  });
}

function setShareButtonsVisible(canShare) {
  ["generate-share-btn", "copy-share-btn"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = canShare ? "inline-flex" : "none";
  });
}

function updateSessionBar(user) {
  const statusEl = document.getElementById("session-status");
  const loginLink = document.getElementById("session-login-link");
  const logoutBtn = document.getElementById("session-logout-btn");
  if (!statusEl || !loginLink || !logoutBtn) return;

  const file = (location.pathname.split("/").pop() || "").trim();
  const qs = location.search || "";
  const next = encodeURIComponent(file + qs);

  if (user) {
    statusEl.textContent = user.email ? `已登录：${user.email}` : "已登录";
    loginLink.style.display = "none";
    logoutBtn.style.display = "inline-flex";
  } else {
    statusEl.textContent = "未登录（只读）";
    loginLink.style.display = "inline-flex";
    logoutBtn.style.display = "none";
    loginLink.href = `./login.html?next=${next}`;
  }
}

function readLogCellText(td) {
  const cell = td?.querySelector?.(".log-cell");
  if (cell && typeof cell.innerText === "string") return cell.innerText;
  return (td?.textContent || "");
}

function addEditableCellToRow(tr, value, options = {}) {
  const td = document.createElement("td");
  const div = document.createElement("div");
  div.className = "log-cell";
  div.textContent = value ?? "";
  div.contentEditable = options.readOnly ? "false" : "true";

  if (options.dateCell) div.dataset.dateCell = "true";

  if (!options.readOnly) {
    div.addEventListener("input", () => {
      tr.dataset.dirty = "true";
      tr.classList.add("edited-row");
    });
  }

  td.appendChild(div);
  tr.appendChild(td);
  return div;
}

function renderTable({ tbodyEl, rows, readOnly }) {
  tbodyEl.innerHTML = "";
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const tr = document.createElement("tr");
    tr.dataset.id = row.id;
    tr.dataset.date = row.date || "";
    tr.id = row.date ? `row-${row.date}` : "";

    const tdSeq = document.createElement("td");
    tdSeq.textContent = String(i + 1);
    tr.appendChild(tdSeq);

    addEditableCellToRow(tr, row.date, { dateCell: true, readOnly });
    addEditableCellToRow(tr, row.duration || "—", { readOnly });
    addEditableCellToRow(tr, row.content || "", { readOnly });
    addEditableCellToRow(tr, row.result || "", { readOnly });
    addEditableCellToRow(tr, row.note || "", { readOnly });

    tbodyEl.appendChild(tr);
  }
}

function initRowSelection(tbodyEl) {
  let activeRow = null;

  tbodyEl.addEventListener("click", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;

    if (activeRow && activeRow !== tr) {
      // edited-row 强制展开不折叠
      if (!activeRow.classList.contains("edited-row")) {
        activeRow.classList.remove("row-expanded");
      }
      activeRow.classList.remove("highlight-row");
    }

    tr.classList.add("highlight-row");
    tr.classList.add("row-expanded");
    activeRow = tr;
  });
}

async function main() {
  const year = getPageYear();
  const token = getShareTokenFromUrl();
  const isShareMode = !!token;

  // session bar
  await initAuthSession();
  updateSessionBar(getCurrentUser());
  window.addEventListener("auth-changed", (e) => updateSessionBar(e.detail.user));

  // require auth if not share
  if (!isShareMode && !getCurrentUser()) {
    const file = (location.pathname.split("/").pop() || "").trim();
    const next = encodeURIComponent(file + location.search);
    location.replace(`./login.html?next=${next}`);
    return;
  }

  const tbodyEl = document.getElementById("log-tbody");
  const tabsEl = document.getElementById(`month-tabs-${year}`);
  const calendarEl = document.getElementById(`calendar-${year}`);
  const heatmapEl = document.getElementById(`heatmap-${year}`);

  if (!tbodyEl || !tabsEl || !calendarEl) {
    console.error("missing containers");
    return;
  }

  // share buttons only when logged in and not share mode
  setShareButtonsVisible(!isShareMode && !!getCurrentUser());

  const copyBtn = document.getElementById("copy-share-btn");
  const genBtn = document.getElementById("generate-share-btn");
  let currentShareLink = "";

  genBtn?.addEventListener("click", async () => {
    const user = getCurrentUser();
    if (!user) return alert("请先登录后生成分享链接。");

    try {
      currentShareLink = await createShareTokenLink(user.id);
      if (copyBtn) copyBtn.style.display = "inline-flex";
      alert("分享链接已生成！");
    } catch (e) {
      console.error(e);
      alert("生成分享链接失败，请稍后再试。");
    }
  });

  copyBtn?.addEventListener("click", async () => {
    if (!currentShareLink) return;
    await navigator.clipboard.writeText(currentShareLink);
    alert("已复制分享链接！");
  });

  function focusDate(dateKey) {
    // switch tab month
    const monthIndex = Number(dateKey.slice(5, 7)) - 1;
    const tab = document.querySelector(`#month-tabs-${year} .month-tab[data-month="${monthIndex}"]`);
    tab?.click();

    const row = document.getElementById(`row-${dateKey}`);
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      tbodyEl.querySelectorAll("tr").forEach((r) => r.classList.remove("highlight-row"));
      row.classList.add("highlight-row");
      row.classList.add("row-expanded");
    }
  }

  async function refresh() {
    const rows = isShareMode
      ? (await listShared(token)).filter((r) => String(r.date || "").startsWith(`${year}-`))
      : await listByYear(year);

    const climbDays = rows.filter((r) => r.date).map((r) => r.date);
    const minutesByDay = computeMinutesByDay(rows);

    renderTable({ tbodyEl, rows, readOnly: isShareMode || !getCurrentUser() });

    generateCalendar({ year, containerEl: calendarEl, climbDays });

    initMonthTabs({
      year,
      tabsEl,
      calendarEl,
      onMonthChanged: (monthIndex) => filterTableByMonth({ tbodyEl, year, monthIndex }),
    });

    // if heatmap container exists, render
    if (heatmapEl) {
      renderGithubHeatmap({
        year,
        containerEl: heatmapEl,
        minutesByDay,
        onClickDate: focusDate,
      });
    }
  }

  // editor buttons visibility
  setEditorButtonsVisible(!isShareMode && !!getCurrentUser());
  window.addEventListener("auth-changed", (e) => {
    setEditorButtonsVisible(!isShareMode && !!e.detail.user);
    setShareButtonsVisible(!isShareMode && !!e.detail.user);
  });

  // bind editor actions (only when editable)
  const addBtn = document.getElementById("add-row-btn");
  const saveNewBtn = document.getElementById("save-new-rows-btn");
  const saveEditsBtn = document.getElementById("save-edits-btn");
  const delBtn = document.getElementById("delete-selected-btn");

  addBtn?.addEventListener("click", () => {
    if (isShareMode || !getCurrentUser()) return alert("请先登录后再新增记录。");

    const tr = document.createElement("tr");
    tr.dataset.new = "true";

    const tdSeq = document.createElement("td");
    tdSeq.textContent = String(tbodyEl.querySelectorAll("tr").length + 1);
    tr.appendChild(tdSeq);

    addEditableCellToRow(tr, `${year}-01-01`, { dateCell: true, readOnly: false });
    addEditableCellToRow(tr, "—", { readOnly: false });
    addEditableCellToRow(tr, "", { readOnly: false });
    addEditableCellToRow(tr, "", { readOnly: false });
    addEditableCellToRow(tr, "", { readOnly: false });

    tbodyEl.appendChild(tr);
    tr.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // keep dataset.date synced when date cell blur
  tbodyEl.addEventListener(
    "blur",
    (e) => {
      const el = e.target;
      if (el instanceof HTMLElement && el.dataset.dateCell === "true") {
        const dateStr = (el.innerText || "").trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const tr = el.closest("tr");
          if (tr) {
            tr.dataset.date = dateStr;
            tr.id = `row-${dateStr}`;
          }
        }
      }
    },
    true
  );

  saveNewBtn?.addEventListener("click", async () => {
    if (isShareMode || !getCurrentUser()) return alert("请先登录后再保存新记录。");

    const newRows = Array.from(tbodyEl.querySelectorAll("tr[data-new='true']"));
    if (!newRows.length) return alert("没有需要保存的新记录。");

    const payload = newRows.map((tr) => {
      const tds = tr.querySelectorAll("td");
      const date = readLogCellText(tds[1]).trim();
      const duration = readLogCellText(tds[2]).trim();
      const content = readLogCellText(tds[3]).trim();
      const result = readLogCellText(tds[4]).trim();
      const note = readLogCellText(tds[5]).trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("日期格式需为 YYYY-MM-DD");
      return { date, duration, content, result, note, user_id: getCurrentUser().id };
    });

    try {
      await insertLogs(payload);
      await refresh();
      alert("新记录已保存到云端！");
    } catch (e) {
      console.error(e);
      alert("保存失败，请稍后再试。");
    }
  });

  saveEditsBtn?.addEventListener("click", async () => {
    if (isShareMode || !getCurrentUser()) return alert("请先登录后再保存修改。");

    const edited = Array.from(tbodyEl.querySelectorAll("tr[data-dirty='true']"))
      .filter((tr) => tr.dataset.new !== "true");

    if (!edited.length) return alert("没有需要保存的修改。");

    const payload = edited.map((tr) => {
      const id = Number(tr.dataset.id);
      const tds = tr.querySelectorAll("td");
      const date = readLogCellText(tds[1]).trim();
      const duration = readLogCellText(tds[2]).trim();
      const content = readLogCellText(tds[3]).trim();
      const result = readLogCellText(tds[4]).trim();
      const note = readLogCellText(tds[5]).trim();

      if (!id) throw new Error("缺少 id");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("日期格式需为 YYYY-MM-DD");
      return { id, date, duration, content, result, note, user_id: getCurrentUser().id };
    });

    try {
      await upsertLogs(payload);
      await refresh();
      alert("修改已保存到云端！");
    } catch (e) {
      console.error(e);
      alert("保存修改失败，请稍后再试。");
    }
  });

  delBtn?.addEventListener("click", async () => {
    if (isShareMode || !getCurrentUser()) return alert("请先登录后再删除。");

    const selected = tbodyEl.querySelector("tr.highlight-row");
    if (!selected) return alert("请先点击要删除的那一行。");

    if (selected.dataset.new === "true") {
      selected.remove();
      return;
    }

    const id = Number(selected.dataset.id);
    if (!id) return alert("该行缺少 id，无法删除。");

    if (!confirm("确定要删除当前选中行吗？")) return;

    try {
      await deleteLogById(id);
      await refresh();
    } catch (e) {
      console.error(e);
      alert("删除失败，请稍后再试。");
    }
  });

  // logout button
  document.getElementById("session-logout-btn")?.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error(error);
      alert("退出登录失败，请稍后再试。");
      return;
    }
    alert("已退出登录");
  });

  initRowSelection(tbodyEl);
  await refresh();
}

main().catch(console.error);