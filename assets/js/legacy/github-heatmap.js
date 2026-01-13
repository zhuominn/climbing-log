(function () {
  function toDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function startOfWeekSunday(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - x.getDay()); // Sunday=0
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function endOfWeekSaturday(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + (6 - x.getDay()));
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function minutesToLevel(minutes) {
    if (!minutes || minutes <= 0) return 0;
    if (minutes <= 60) return 1;
    if (minutes <= 120) return 2;
    if (minutes <= 180) return 3;
    return 4;
  }

  function ensureTooltip(root) {
    let tip = root.querySelector(".heatmap-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "heatmap-tooltip";
      tip.style.display = "none";
      root.appendChild(tip);
    }
    return tip;
  }

  function showTooltip(tip, root, text, targetEl) {
    tip.textContent = text;
    tip.style.display = "block";

    const rootRect = root.getBoundingClientRect();
    const r = targetEl.getBoundingClientRect();
    const x = r.left - rootRect.left + r.width / 2;
    const y = r.top - rootRect.top;

    // center above
    tip.style.left = `${Math.round(x)}px`;
    tip.style.top = `${Math.round(y)}px`;
    tip.style.transform = "translate(-50%, -10px)";
  }

  function hideTooltip(tip) {
    tip.style.display = "none";
  }

  function focusTableRow(dateKey) {
    const row = document.getElementById("row-" + dateKey);
    if (!row) return;

    // 切换到对应月份 tab（依赖你现有的 month tabs UI）
    const y = Number(dateKey.slice(0, 4));
    const monthIndex = Number(dateKey.slice(5, 7)) - 1;
    const tab = document.querySelector(`#month-tabs-${y} .month-tab[data-month="${monthIndex}"]`);
    if (tab) tab.click();

    row.scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelectorAll("#log-tbody tr").forEach((el) => el.classList.remove("highlight-row"));
    row.classList.add("highlight-row");
  }

  function generateGithubHeatmap(year, containerId, minutesByDay) {
    const root = document.getElementById(containerId);
    if (!root) return;

    root.innerHTML = "";

    const header = document.createElement("div");
    header.className = "heatmap-header";
    header.innerHTML = `<div class="heatmap-title">${year} 年</div>
      <div class="heatmap-legend">
        <span class="legend-label">少</span>
        <span class="heatmap-cell lvl-0"></span>
        <span class="heatmap-cell lvl-1"></span>
        <span class="heatmap-cell lvl-2"></span>
        <span class="heatmap-cell lvl-3"></span>
        <span class="heatmap-cell lvl-4"></span>
        <span class="legend-label">多</span>
      </div>`;
    root.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "heatmap-grid";
    root.appendChild(grid);

    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);

    const start = startOfWeekSunday(jan1);
    const end = endOfWeekSaturday(dec31);

    // 周数（列数）
    const totalDays = Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
    const weeks = Math.ceil(totalDays / 7);

    grid.style.gridTemplateColumns = `repeat(${weeks}, var(--cell-size))`;

    const tip = ensureTooltip(root);

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const dateKey = toDateKey(d);
      const minutes = minutesByDay?.[dateKey] ?? 0;
      const lvl = minutesToLevel(minutes);

      const cell = document.createElement("div");
      cell.className = `heatmap-cell lvl-${lvl}`;
      cell.dataset.date = dateKey;
      cell.setAttribute("role", "button");

      // 仅当属于目标年份才可交互（开头/结尾会有跨年 padding）
      const inYear = d.getFullYear() === year;
      if (!inYear) {
        cell.classList.add("out-of-year");
      } else {
        cell.addEventListener("mouseenter", () => {
          const text = minutes > 0 ? `${dateKey} · ${minutes} 分钟` : `${dateKey} · 0`;
          showTooltip(tip, root, text, cell);
        });
        cell.addEventListener("mouseleave", () => hideTooltip(tip));
        cell.addEventListener("click", () => {
          if (minutes > 0) focusTableRow(dateKey);
        });
      }

      grid.appendChild(cell);
    }
  }

  window.generateGithubHeatmap = generateGithubHeatmap;
})();