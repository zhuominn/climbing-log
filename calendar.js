// ===== 日历：生成 2025 年月历 & 月份 tab 切换 =====

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
    const jsWeekday = firstDay.getDay(); // 0-6, 周日-周六
    const offset = (jsWeekday + 6) % 7;  // 以周一为第一列

    // 前置空白
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

      // 攀岩日打圈
      if (climbDays.includes(dateStr)) {
        dEl.classList.add("climb-day");
      }

      const span = document.createElement("span");
      span.className = "day-number";
      span.textContent = day;
      dEl.appendChild(span);

      // 点击：如果是攀岩日 → 滚到表格对应行并高亮
      dEl.addEventListener("click", () => {
        if (climbDays.includes(dateStr)) {
          const row = document.getElementById("row-" + dateStr);
          if (row) {
            row.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });

            // 取消其他行高亮
            document
              .querySelectorAll("tr")
              .forEach((el) => el.classList.remove("highlight-row"));

            row.classList.add("highlight-row");
          }
        }
      });

      grid.appendChild(dEl);
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
    
    // ✅ 新增：通知其他模块（比如表格）当前月份变了
    window.dispatchEvent(
      new CustomEvent("month-changed", {
        detail: { year, monthIndex }, // monthIndex: 0-11
      })
    );
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const monthIndex = Number(tab.dataset.month);
      setActiveMonth(monthIndex);
    });
  });

  // 默认显示 11 月（即索引 10），你也可以改成 0 显示 1 月
  setActiveMonth(10);
}
