export function filterTableByMonth({ tbodyEl, year, monthIndex }) {
  if (!tbodyEl) return;

  const rows = Array.from(tbodyEl.querySelectorAll("tr"));
  let visibleSeq = 1;

  for (const tr of rows) {
    const dateStr = (tr.dataset.date || "").trim();
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!m) {
      tr.style.display = "";
      continue;
    }

    const y = Number(m[1]);
    const mi = Number(m[2]) - 1;

    const show = y === year && mi === monthIndex;
    tr.style.display = show ? "" : "none";

    if (show) {
      tr.querySelector("td")?.replaceChildren(document.createTextNode(String(visibleSeq++)));
    } else {
      tr.classList.remove("highlight-row");
    }
  }
}