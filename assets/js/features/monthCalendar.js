export function generateCalendar({ year, containerEl, climbDays, onClickDate }) {
  if (!containerEl) return;

  containerEl.innerHTML = "";
  const climbSet = new Set(Array.isArray(climbDays) ? climbDays : []);
  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

  for (let month = 0; month < 12; month++) {
    const monthPanel = document.createElement("div");
    monthPanel.className = "month-panel";
    monthPanel.dataset.month = String(month);

    const header = document.createElement("div");
    header.className = "calendar-header";

    const title = document.createElement("div");
    title.className = "calendar-title";
    title.textContent = `${year} 年 ${month + 1} 月`;

    const desc = document.createElement("div");
    desc.textContent = "圈出的日期表示攀岩日";

    header.appendChild(title);
    header.appendChild(desc);
    monthPanel.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    weekdays.forEach((w) => {
      const wEl = document.createElement("div");
      wEl.className = "calendar-weekday";
      wEl.textContent = w;
      grid.appendChild(wEl);
    });

    const firstDay = new Date(year, month, 1);
    const jsWeekday = firstDay.getDay(); // 0=日
    const offset = (jsWeekday + 6) % 7;  // 周一为第一列

    for (let i = 0; i < offset; i++) {
      const empty = document.createElement("div");
      empty.className = "day day-empty";
      grid.appendChild(empty);
    }

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

      const isClimbDay = climbSet.has(dateStr);
      if (isClimbDay) dEl.classList.add("climb-day");
      if (isClimbDay) {
        dEl.dataset.date = dateStr;
        dEl.addEventListener("click", () => onClickDate?.(dateStr));
      }

      const span = document.createElement("span");
      span.className = "day-number";
      span.textContent = String(day);
      dEl.appendChild(span);

      grid.appendChild(dEl);
    }

    monthPanel.appendChild(grid);
    containerEl.appendChild(monthPanel);
  }
}

export function initMonthTabs({ year, tabsEl, calendarEl, onMonthChanged }) {
  if (!tabsEl || !calendarEl) return;

  const tabs = tabsEl.querySelectorAll(".month-tab");
  const panels = calendarEl.querySelectorAll(".month-panel");
  const storageKey = `climbing_currentMonthIndex_${year}`;

  function setActiveMonth(monthIndex) {
    localStorage.setItem(storageKey, String(monthIndex));

    tabs.forEach((tab) => {
      tab.classList.toggle("active", Number(tab.dataset.month) === monthIndex);
    });
    panels.forEach((panel) => {
      panel.classList.toggle("active", Number(panel.dataset.month) === monthIndex);
    });

    onMonthChanged?.(monthIndex);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveMonth(Number(tab.dataset.month));
    });
  });

  const saved = localStorage.getItem(storageKey);
  const now = new Date();
  const defaultMonthIndex =
    saved != null ? Number(saved) : (now.getFullYear() === year ? now.getMonth() : 0);

  setActiveMonth(defaultMonthIndex);
}
