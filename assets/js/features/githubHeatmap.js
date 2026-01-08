function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Sun-first: row0=Sun ... row6=Sat
function dayIndexSun0(d) {
  return d.getDay(); // Sun=0 ... Sat=6
}

function startOfWeekSunday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - dayIndexSun0(x));
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSaturday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + (6 - dayIndexSun0(x)));
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

function parsePx(value, fallback) {
  const n = Number(String(value).replace("px", "").trim());
  return Number.isFinite(n) ? n : fallback;
}

export function renderGithubHeatmap({ year, containerEl, minutesByDay, onClickDate }) {
  if (!containerEl) return;

  // scaffold(GitHub ????)??:.gh-heatmap ???? .gh-months / .gh-days / .heatmap-grid
  const scaffold = containerEl.querySelector(".gh-heatmap");
  const monthsEl = scaffold?.querySelector(".gh-months") || null;
  let grid = scaffold?.querySelector(".heatmap-grid") || null;

  // tooltip:?????
  let tip = containerEl.querySelector(".heatmap-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "heatmap-tooltip";
    tip.style.display = "none";
    containerEl.appendChild(tip);
  }

  // ???? scaffold ? grid,??�?????�(??????????)
  if (!grid) {
    containerEl.innerHTML = "";

    const header = document.createElement("div");
    header.className = "heatmap-header";
    header.innerHTML = `<div class="heatmap-title">${year} Heatmap</div>
      <div class="heatmap-legend" aria-hidden="true">
        <span>Less</span>
        <span class="heatmap-legend-cell"></span>
        <span class="heatmap-legend-cell lvl-1"></span>
        <span class="heatmap-legend-cell lvl-2"></span>
        <span class="heatmap-legend-cell lvl-3"></span>
        <span class="heatmap-legend-cell lvl-4"></span>
        <span>More</span>
      </div>`;
    containerEl.appendChild(header);

    grid = document.createElement("div");
    grid.className = "heatmap-grid";
    containerEl.appendChild(grid);

    // tooltip ???????(?? innerHTML ???)
    tip = document.createElement("div");
    tip.className = "heatmap-tooltip";
    tip.style.display = "none";
    containerEl.appendChild(tip);
  }

  // ?????????
  grid.innerHTML = "";
  if (monthsEl) monthsEl.innerHTML = "";

  // ? CSS ???? cell/gap(?? .gh-heatmap ? --cell/--gap;???? fallback)
  const ghRoot = scaffold || containerEl;
  const cs = getComputedStyle(ghRoot);
  const cellPx = parsePx(cs.getPropertyValue("--cell"), 10);
  const gapPx = parsePx(cs.getPropertyValue("--gap"), 2);

  // ? heatmap-grid ?? cell/gap
  grid.style.setProperty("--cell-size", `${cellPx}px`);
  grid.style.gap = `${gapPx}px`;

  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  const start = startOfWeekSunday(jan1);
  const end = endOfWeekSaturday(dec31);

  const totalDays = Math.round((end - start) / 86400000) + 1;
  const weeks = Math.ceil(totalDays / 7);

  grid.style.gridTemplateColumns = `repeat(${weeks}, var(--cell-size))`;

  // ????:??????? week ?
  if (monthsEl) {
    monthsEl.style.width = `${weeks * cellPx + (weeks - 1) * gapPx}px`;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let lastLeft = -Infinity;
    const minSpacing = (cellPx + gapPx) * 3;

    for (let m = 0; m < 12; m++) {
      const first = new Date(year, m, 1);
      const daysFromStart = Math.round((first - start) / 86400000);
      const weekIndex = Math.floor(daysFromStart / 7);
      const left = weekIndex * (cellPx + gapPx);

      if (left - lastLeft < minSpacing) continue;
      lastLeft = left;

      const el = document.createElement("div");
      el.className = "gh-month";
      el.style.left = `${left}px`;
      el.textContent = monthNames[m]; // ? ????????
      monthsEl.appendChild(el);
    }
  }

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
        showTooltip(minutes > 0 ? `${dateKey} � ${minutes} ??` : `${dateKey} � 0`, cell);
      });
      cell.addEventListener("mouseleave", hideTooltip);
      if (minutes > 0 && typeof onClickDate === "function") {
        cell.addEventListener("click", () => onClickDate(dateKey));
      }
    }

    grid.appendChild(cell);
  }
}
