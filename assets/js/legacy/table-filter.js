// 公共：按月份过滤攀岩记录表格，并重排“可见行”的序号

(function () {
  function parseDateFromRow(tr) {
    const dateStr = (tr.dataset.date || "").trim();

    // fallback：第 2 列是日期（序号=0，日期=1）
    if (!dateStr) {
      const tds = tr.querySelectorAll("td");
      const fallback = (tds[1]?.textContent || "").trim();
      const match2 = fallback.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match2) return null;
      return {
        year: Number(match2[1]),
        monthIndex: Number(match2[2]) - 1,
        day: Number(match2[3]),
        dateStr: fallback,
      };
    }

    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    return {
      year: Number(match[1]),
      monthIndex: Number(match[2]) - 1,
      day: Number(match[3]),
      dateStr,
    };
  }

  function filterTableByMonth(year, monthIndex, options = {}) {
    const tbodyId = options.tbodyId || "log-tbody";
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    let visibleSeq = 1;

    rows.forEach((tr) => {
      const parsed = parseDateFromRow(tr);

      if (!parsed) {
        tr.style.display = "";
        return;
      }

      const shouldShow = parsed.year === year && parsed.monthIndex === monthIndex;
      tr.style.display = shouldShow ? "" : "none";

      const seqCell = tr.querySelector("td");
      if (shouldShow) {
        if (seqCell) seqCell.textContent = visibleSeq++;
      } else {
        tr.classList.remove("highlight-row");
      }
    });
  }

  window.tableFilter = window.tableFilter || {};
  window.tableFilter.filterTableByMonth = filterTableByMonth;
})();
