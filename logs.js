// ===== 从 Supabase 加载攀岩记录并渲染表格 =====
async function loadLogsFromSupabase() {
  const tbody = document.getElementById("log-tbody");
  if (!tbody) return;

  const { data, error } = await supabaseClient
    .from("climbing_logs")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    console.error("加载攀岩记录失败：", error);
    return;
  }

  tbody.innerHTML = "";
  climbDays = [];

  data.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.dataset.id = row.id;
    tr.id = "row-" + row.date;
    tr.dataset.new = "false";

    // 序号
    const tdSeq = document.createElement("td");
    tdSeq.textContent = index + 1;
    tr.appendChild(tdSeq);

    // 小工具函数：创建可编辑单元格
    function addEditableCell(value, options = {}) {
      const td = document.createElement("td");
      td.textContent = value ?? "";
      td.contentEditable = "true";
      if (options.dateCell) {
        td.dataset.dateCell = "true";
      }
      td.addEventListener("input", () => {
        tr.dataset.dirty = "true";
        tr.classList.add("edited-row");
      });
      tr.appendChild(td);
      return td;
    }

    addEditableCell(row.date, { dateCell: true });       // 日期
    addEditableCell(row.duration || "—");                // 时长
    addEditableCell(row.content || "");                  // 主要内容
    addEditableCell(row.result || "");                   // 达成情况
    addEditableCell(row.note || "");                     // 备注

    tbody.appendChild(tr);

    if (row.date) {
      climbDays.push(row.date);
    }
  });
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


  function getNextSeq() {
    const rows = tbody.querySelectorAll("tr");
    return rows.length + 1;
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

    const tdDate = document.createElement("td");
    tdDate.contentEditable = "true";
    tdDate.dataset.dateCell = "true";
    tdDate.textContent = "2025-12-10";
    tr.appendChild(tdDate);

    const tdDuration = document.createElement("td");
    tdDuration.contentEditable = "true";
    tdDuration.textContent = "—";
    tr.appendChild(tdDuration);

    const tdContent = document.createElement("td");
    tdContent.contentEditable = "true";
    tdContent.textContent = "";
    tr.appendChild(tdContent);

    const tdResult = document.createElement("td");
    tdResult.contentEditable = "true";
    tdResult.textContent = "";
    tr.appendChild(tdResult);

    const tdNote = document.createElement("td");
    tdNote.contentEditable = "true";
    tdNote.textContent = "";
    tr.appendChild(tdNote);

    tbody.appendChild(tr);

    tr.scrollIntoView({ behavior: "smooth", block: "center" });
    tdDate.focus();
  });

  // 日期单元格失焦：设置 tr.id 供日历跳转用
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

    const newRows = Array.from(
      tbody.querySelectorAll("tr[data-new='true']")
    );
    if (newRows.length === 0) {
      alert("没有需要保存的新记录。");
      return;
    }

    const payload = [];
    for (const tr of newRows) {
      const tds = tr.querySelectorAll("td");
      const dateStr = (tds[1].textContent || "").trim();
      const duration = (tds[2].textContent || "").trim();
      const content = (tds[3].textContent || "").trim();
      const result = (tds[4].textContent || "").trim();
      const note = (tds[5].textContent || "").trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        alert(
          "日期格式请按 YYYY-MM-DD 填写，例如 2025-12-10。出错行序号：" +
            tds[0].textContent
        );
        return;
      }

      payload.push({
        date: dateStr,
        duration,
        content,
        result,
        note,
        user_id: window.currentUser.id,
      });
    }

    if (payload.length === 0) return;

    saveNewRowsBtn.disabled = true;
    saveNewRowsBtn.textContent = "保存中…";

    const { data, error } = await supabaseClient
      .from("climbing_logs")
      .insert(payload)
      .select();

    saveNewRowsBtn.disabled = false;
    saveNewRowsBtn.textContent = "💾 保存新记录到云端";

    if (error) {
      console.error("保存新记录失败：", error);
      alert("保存到云端失败，请稍后再试。");
      return;
    }

    await loadLogsFromSupabase();
    const calendarContainer = document.getElementById("calendar-2025");
    if (calendarContainer) {
      calendarContainer.innerHTML = "";
      generateCalendar(2025, "calendar-2025");
      initMonthTabs(2025);
    }

    alert("新记录已保存到云端！");
  });


  // 保存已修改行（UPDATE）
  saveEditsBtn.addEventListener("click", async () => {
    if (!window.currentUser) {
      alert("请先登录后再保存已修改行。");
      return;
    }

    const editedRows = Array.from(
      tbody.querySelectorAll("tr[data-dirty='true']")
    ).filter((tr) => tr.dataset.new !== "true");

    if (editedRows.length === 0) {
      alert("没有需要保存的修改。");
      return;
    }

    const updates = [];
    for (const tr of editedRows) {
      const id = Number(tr.dataset.id);
      const tds = tr.querySelectorAll("td");
      const dateStr = (tds[1].textContent || "").trim();
      const duration = (tds[2].textContent || "").trim();
      const content = (tds[3].textContent || "").trim();
      const result = (tds[4].textContent || "").trim();
      const note = (tds[5].textContent || "").trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        alert(
          "日期格式请按 YYYY-MM-DD 填写，例如 2025-12-10。出错行序号：" +
            tds[0].textContent
        );
        return;
      }

      updates.push({
        id,
        date: dateStr,
        duration,
        content,
        result,
        note,
        user_id: window.currentUser.id,
      });
    }

    if (updates.length === 0) return;

    saveEditsBtn.disabled = true;
    saveEditsBtn.textContent = "保存修改中…";

    const { data, error } = await supabaseClient
      .from("climbing_logs")
      .upsert(updates)
      .select();

    saveEditsBtn.disabled = false;
    saveEditsBtn.textContent = "✅ 保存已修改行";

    if (error) {
      console.error("保存修改失败：", error);
      alert("保存修改失败，请稍后再试。");
      return;
    }

    await loadLogsFromSupabase();
    const calendarContainer = document.getElementById("calendar-2025");
    if (calendarContainer) {
      calendarContainer.innerHTML = "";
      generateCalendar(2025, "calendar-2025");
      initMonthTabs(2025);
    }

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

    if (!confirm(`确定要删除第 ${seqText} 行记录吗？`)) {
      return;
    }

    // 如果是新建未保存的行（data-new="true"）
    if (selected.dataset.new === "true") {
      selected.remove();
      renumberRows();
      return;
    }

    // 已存在 Supabase 的记录
    const id = Number(selected.dataset.id);
    if (!id) {
      console.error("该行缺少 id，无法删除");
      return;
    }

    deleteSelectedBtn.disabled = true;
    deleteSelectedBtn.textContent = "删除中…";

    const { error } = await supabaseClient
      .from("climbing_logs")
      .delete()
      .eq("id", id);

    deleteSelectedBtn.disabled = false;
    deleteSelectedBtn.textContent = "🗑 删除当前选中行";

    if (error) {
      console.error("删除失败：", error);
      alert("删除失败，请稍后再试。");
      return;
    }

    // 删除成功：重新加载数据 + 日历
    await loadLogsFromSupabase();
    const calendarContainer = document.getElementById("calendar-2025");
    if (calendarContainer) {
      calendarContainer.innerHTML = "";
      generateCalendar(2025, "calendar-2025");
      initMonthTabs(2025);
    }
  });
}



// ===== 让点击表格行可以选中（高亮） =====
function initRowSelection() {
  const tbody = document.getElementById("log-tbody");
  if (!tbody) return;

  tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;

    // 清除之前的高亮
    document
      .querySelectorAll("#log-tbody tr")
      .forEach((row) => row.classList.remove("highlight-row"));

    // 当前行高亮
    tr.classList.add("highlight-row");
  });
}


// ===== 删除后重新编号（序号列保持 1,2,3...） =====
function renumberRows() {
  const tbody = document.getElementById("log-tbody");
  if (!tbody) return;
  const rows = tbody.querySelectorAll("tr");
  rows.forEach((tr, idx) => {
    const firstCell = tr.querySelector("td");
    if (firstCell) {
      firstCell.textContent = idx + 1;
    }
  });
}



// ===== 入口：页面加载完成后，先拉数据，再生成日历 & 初始化按钮 =====
window.addEventListener("DOMContentLoaded", async () => {
  
  // ✅ 分享模式：交给 share.js 渲染，不要执行默认加载
  if (isShareMode()) return;

  if (window.initAuthSession) {
    await window.initAuthSession();
  }

  await loadLogsFromSupabase();

  // ✅ 先监听月份切换事件（点 tab 会触发表格过滤）
  window.addEventListener("month-changed", (e) => {
    const { year, monthIndex } = e.detail;
    window.tableFilter.filterTableByMonth(year, monthIndex);
  });

  generateCalendar(2025, "calendar-2025");
  initMonthTabs(2025);
  initAddRow();
  initRowSelection();

  // ✅ 首次加载后，按默认月份过滤一次（和 initMonthTabs 默认展示的月份保持一致）
  window.tableFilter.filterTableByMonth(2025, 10); // 10 = 11月
});
