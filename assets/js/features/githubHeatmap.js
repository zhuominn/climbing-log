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

  // scaffold（GitHub 风格布局）优先：.gh-heatmap 里应包含 .gh-months / .gh-days / .heatmap-grid
  const scaffold = containerEl.querySelector(".gh-heatmap");
  const monthsEl = scaffold?.querySelector(".gh-months") || null;
  let grid = scaffold?.querySelector(".heatmap-grid") || null;

  // tooltip：复用或创建
  let tip = containerEl.querySelector(".heatmap-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "heatmap-tooltip";
    tip.style.display = "none";
    containerEl.appendChild(tip);
  }

  // 如果没有 scaffold 的 grid，就用“简化版布局”（避免你之前的无限递归）
  if (!grid) {
    containerEl.innerHTML = "";

    const header = document.createElement("div");
    header.className = "heatmap-header";
    header.innerHTML = `<div class="heatmap-title">${year} 年</div>`;
    containerEl.appendChild(header);

    grid = document.createElement("div");
    grid.className = "heatmap-grid";
    containerEl.appendChild(grid);

    // tooltip 需要重新挂回去（因为 innerHTML 清空过）
    tip = document.createElement("div");
    tip.className = "heatmap-tooltip";
    tip.style.display = "none";
    containerEl.appendChild(tip);
  }

  // 清空格子与月份标签
  grid.innerHTML = "";
  if (monthsEl) monthsEl.innerHTML = "";

  // 从 CSS 变量读取 cell/gap（匹配 .gh-heatmap 的 --cell/--gap；不存在就 fallback）
  const ghRoot = scaffold || containerEl;
  const cs = getComputedStyle(ghRoot);
  const cellPx = parsePx(cs.getPropertyValue("--cell"), 10);
  const gapPx = parsePx(cs.getPropertyValue("--gap"), 2);

  // 让 heatmap-grid 对齐 cell/gap
  grid.style.setProperty("--cell-size", `${cellPx}px`);
  grid.style.gap = `${gapPx}px`;

  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  const start = startOfWeekSunday(jan1);
  const end = endOfWeekSaturday(dec31);

  const totalDays = Math.round((end - start) / 86400000) + 1;
  const weeks = Math.ceil(totalDays / 7);

  grid.style.gridTemplateColumns = `repeat(${weeks}, var(--cell-size))`;

  // 月份标签：绝对定位到对应 week 列
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
      el.textContent = monthNames[m]; // ← 改为英文月份缩写
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