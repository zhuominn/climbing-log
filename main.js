// 你攀岩过的日期列表（按需维护）
    const climbDays = [
      "2025-11-22",
      "2025-11-26",
      "2025-11-30",
      "2025-12-03",
      "2025-12-10",
    ];

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

    // 生成 2025 全年日历 & 初始化 tab
    generateCalendar(2025, "calendar-2025");
    initMonthTabs(2025);