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

// ===== 攀岩训练表格：新增行 + 保存新记录 + 保存修改 =====
function initAddRow() {
  const addRowBtn = document.getElementById("add-row-btn");
  const saveNewRowsBtn = document.getElementById("save-new-rows-btn");
  const saveEditsBtn = document.getElementById("save-edits-btn");
  const tbody = document.getElementById("log-tbody");
  if (!addRowBtn || !saveNewRowsBtn || !saveEditsBtn || !tbody) return;

  function getNextSeq() {
    const rows = tbody.querySelectorAll("tr");
    return rows.length + 1;
  }

  // 新增一行
  addRowBtn.addEventListener("click", () => {
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
}

// ===== 入口：页面加载完成后，先拉数据，再生成日历 & 初始化按钮 =====
window.addEventListener("DOMContentLoaded", async () => {
  await loadLogsFromSupabase();
  generateCalendar(2025, "calendar-2025");
  initMonthTabs(2025);
  initAddRow();
});
