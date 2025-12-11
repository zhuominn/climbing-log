// ===== Supabase 初始化 =====
const supabaseUrl = "https://xcfendynbsrmpgalpefk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZmVuZHluYnNybXBnYWxwZWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mjg5NTQsImV4cCI6MjA4MTAwNDk1NH0.Jec4x0rNk5InJUCMwkbPoCYHdWEia1tv3Y1xJCboEpo";
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// 攀岩日：先留空，等从数据库加载后填充
let climbDays = [];



// 你攀岩过的日期列表（按需维护）
    function generateCalendar(year, containerId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

      for (let month = 0; month < 12; month++) {
        const monthPanel = document.createElement("div");
        monthPanel.className = "month-panel";
        monthPanel.dataset.month = String(month);

        const header = document.createElement("div");
        header.className = "calendar-header";

        const title = document.createElement("div");
        title.className = "calendar-title";
        title.textContent = year + " 年 " + (month + 1) + " 月";

        const desc = document.createElement("div");
        desc.textContent = "圈出的日期表示攀岩日";

        header.appendChild(title);
        header.appendChild(desc);
        monthPanel.appendChild(header);

        const grid = document.createElement("div");
        grid.className = "calendar-grid";

        // 星期标题
        weekdays.forEach((w) => {
          const wEl = document.createElement("div");
          wEl.className = "calendar-weekday";
          wEl.textContent = w;
          grid.appendChild(wEl);
        });

        // 这个月第一天
        const firstDay = new Date(year, month, 1);
        const jsWeekday = firstDay.getDay(); // 0(周日)-6(周六)
        // 转换为以周一为第一列：0(周一)-6(周日)
        const offset = (jsWeekday + 6) % 7;

        // 前面空白
        for (let i = 0; i < offset; i++) {
          const empty = document.createElement("div");
          empty.className = "day day-empty";
          grid.appendChild(empty);
        }

        // 这个月总天数
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
          const dEl = document.createElement("div");
          dEl.className = "day";

          const dateStr =
            year +
            "-" +
            String(month + 1).padStart(2, "0") +
            "-" +
            String(day).padStart(2, "0");

          if (climbDays.includes(dateStr)) {
            dEl.classList.add("climb-day");
          }

          const span = document.createElement("span");
          span.className = "day-number";
          span.textContent = day;
          dEl.appendChild(span);
          grid.appendChild(dEl);

            dEl.addEventListener("click", () => {
                if (climbDays.includes(dateStr)) {
                    const row = document.getElementById("row-" + dateStr);
                    if (row) {
                    row.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                    
                    // ⭐ 让所有行先移除高亮（避免多个高亮）
                    document
                        .querySelectorAll("tr")
                        .forEach((el) => el.classList.remove("highlight-row"));

                    // ⭐ 给目标行添加高亮样式
                    row.classList.add("highlight-row");
                }
            }
        });

    }

    monthPanel.appendChild(grid);
    container.appendChild(monthPanel);
      }
    }

    function initMonthTabs(year) {
      const tabsContainer = document.getElementById("month-tabs-" + year);
      const calendarContainer = document.getElementById("calendar-" + year);
      if (!tabsContainer || !calendarContainer) return;

      const tabs = tabsContainer.querySelectorAll(".month-tab");
      const panels = calendarContainer.querySelectorAll(".month-panel");

      function setActiveMonth(monthIndex) {
        tabs.forEach((tab) => {
          tab.classList.toggle(
            "active",
            Number(tab.dataset.month) === monthIndex
          );
        });
        panels.forEach((panel) => {
          panel.classList.toggle(
            "active",
            Number(panel.dataset.month) === monthIndex
          );
        });
      }

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const monthIndex = Number(tab.dataset.month);
          setActiveMonth(monthIndex);
        });
      });

      // 默认显示 11 月（你目前有攀岩记录的第一个月），也可以改成 0 显示 1 月
      setActiveMonth(10);
    }



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
    tr.dataset.id = row.id;          // 用于 UPDATE
    tr.id = "row-" + row.date;       // 用于日历点击跳转
    tr.dataset.new = "false";        // 区分已有数据和新建行

    // 序号（不可编辑）
    const tdSeq = document.createElement("td");
    tdSeq.textContent = index + 1;
    tr.appendChild(tdSeq);

    // 一个小工具函数：创建可编辑单元格，并在修改时标记整行为 dirty
    function addEditableCell(value, options = {}) {
      const td = document.createElement("td");
      td.textContent = value ?? "";
      td.contentEditable = "true";
      if (options.dateCell) {
        td.dataset.dateCell = "true";
      }
      td.addEventListener("input", () => {
        tr.dataset.dirty = "true";   // 标记这行被修改过
        tr.classList.add("edited-row");
      });
      tr.appendChild(td);
      return td;
    }

    // 日期（可编辑）
    addEditableCell(row.date, { dateCell: true });
    // 时长
    addEditableCell(row.duration || "—");
    // 主要内容
    addEditableCell(row.content || "");
    // 达成情况
    addEditableCell(row.result || "");
    // 备注
    addEditableCell(row.note || "");

    tbody.appendChild(tr);

    if (row.date) {
      climbDays.push(row.date); // 日历打圈使用
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

  // 计算下一个序号
  function getNextSeq() {
    const rows = tbody.querySelectorAll("tr");
    return rows.length + 1;
  }

  // 👉 点击「新增一行记录」
  addRowBtn.addEventListener("click", () => {
    const seq = getNextSeq();
    const tr = document.createElement("tr");
    tr.dataset.new = "true"; // 新建行

    // 序号
    const tdSeq = document.createElement("td");
    tdSeq.textContent = seq;
    tr.appendChild(tdSeq);

    // 日期
    const tdDate = document.createElement("td");
    tdDate.contentEditable = "true";
    tdDate.dataset.dateCell = "true";
    tdDate.textContent = "2025-12-10"; // 默认值可以改成当天
    tr.appendChild(tdDate);

    // 时长
    const tdDuration = document.createElement("td");
    tdDuration.contentEditable = "true";
    tdDuration.textContent = "—";
    tr.appendChild(tdDuration);

    // 主要内容
    const tdContent = document.createElement("td");
    tdContent.contentEditable = "true";
    tdContent.textContent = "";
    tr.appendChild(tdContent);

    // 达成情况
    const tdResult = document.createElement("td");
    tdResult.contentEditable = "true";
    tdResult.textContent = "";
    tr.appendChild(tdResult);

    // 备注
    const tdNote = document.createElement("td");
    tdNote.contentEditable = "true";
    tdNote.textContent = "";
    tr.appendChild(tdNote);

    tbody.appendChild(tr);

    tr.scrollIntoView({ behavior: "smooth", block: "center" });
    tdDate.focus();
  });

  // 👉 日期单元格失焦时，如果格式正确，就更新行的 id（给日历跳转用）
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

  // 👉 点击「保存新记录到云端」
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

    // 保存成功：重新加载 + 刷新日历
    await loadLogsFromSupabase();
    const calendarContainer = document.getElementById("calendar-2025");
    if (calendarContainer) {
      calendarContainer.innerHTML = "";
      generateCalendar(2025, "calendar-2025");
      initMonthTabs(2025);
    }

    alert("新记录已保存到云端！");
  });

  // 👉 点击「保存已修改行」
  saveEditsBtn.addEventListener("click", async () => {
    // 只取已有数据（data-new != true）且被标记为 dirty 的行
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
        id,        // ⭐ 一定要带 id，upsert 会按主键更新
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
      .upsert(updates) // 有 id 就更新
      .select();

    saveEditsBtn.disabled = false;
    saveEditsBtn.textContent = "✅ 保存已修改行";

    if (error) {
      console.error("保存修改失败：", error);
      alert("保存修改失败，请稍后再试。");
      return;
    }

    // 更新成功：重新加载数据 + 刷新日历
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


window.addEventListener("DOMContentLoaded", async () => {
    // 1. 先加载攀岩记录（填表 + 填 climbDays）
    await loadLogsFromSupabase();

    // 2. 再用 climbDays 生成 2025 日历
    generateCalendar(2025, "calendar-2025");
    initMonthTabs(2025);

    // 3. 初始化新增行功能
    initAddRow();
});


