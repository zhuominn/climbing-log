function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekSunday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
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

export function renderGithubHeatmap({ year, containerEl, minutesByDay, onClickDate }) {
  if (!containerEl) return;
  containerEl.innerHTML = "";

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
  containerEl.appendChild(header);

  const tip = document.createElement("div");
  tip.className = "heatmap-tooltip";
  tip.style.display = "none";
  containerEl.appendChild(tip);

  const grid = document.createElement("div");
  grid.className = "heatmap-grid";
  containerEl.appendChild(grid);

  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  const start = startOfWeekSunday(jan1);
  const end = endOfWeekSaturday(dec31);

  const totalDays = Math.round((end - start) / 86400000) + 1;
  const weeks = Math.ceil(totalDays / 7);
  grid.style.gridTemplateColumns = `repeat(${weeks}, var(--cell-size))`;

  function showTooltip(text, cell) {
    tip.textContent = text;
    tip.style.display = "block";

    const rootRect = containerEl.getBoundingClientRect();
    const r = cell.getBoundingClientRect();
    const x = r.left - rootRect.left + r.width / 2;
    const y = r.top - rootRect.top;

    tip.style.left = `${Math.round(x)}px`;
    tip.style.top = `${Math.round(y)}px`;
    tip.style.transform = "translate(-50%, -10px)";
  }

  function hideTooltip() {
    tip.style.display = "none";
  }

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const inYear = d.getFullYear() === year;
    const dateKey = toDateKey(d);
    const minutes = minutesByDay?.[dateKey] ?? 0;
    const lvl = minutesToLevel(minutes);

    const cell = document.createElement("div");
    cell.className = `heatmap-cell lvl-${lvl}`;
    if (!inYear) cell.classList.add("out-of-year");

    if (inYear) {
      cell.addEventListener("mouseenter", () => {
        showTooltip(minutes > 0 ? `${dateKey} · ${minutes} 分钟` : `${dateKey} · 0`, cell);
      });
      cell.addEventListener("mouseleave", hideTooltip);
      cell.addEventListener("click", () => {
        if (minutes > 0) onClickDate?.(dateKey);
      });
    }

    grid.appendChild(cell);
  }
}