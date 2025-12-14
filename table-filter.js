// 公共：按月份过滤攀岩记录表格，并重排“可见行”的序号

(function () {
  function parseDateFromRow(tr) {
    // 默认：第 2 列是日期（序号=0，日期=1）
    const tds = tr.querySelectorAll("td");
    const dateStr = (tds[1]?.textContent || "").trim();

    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    return {
      year: Number(match[1]),
      monthIndex: Number(match[2]) - 1, // 0-11
      day: Number(match[3]),
      dateStr,
    };
  }

  function filterTableByMonth(year, monthIndex, options = {}) {
    const tbodyId = options.tbodyId || "log-tbody";
    const dateColIndex = options.dateColIndex ?? 1; // 目前没用到，留扩展

    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    let visibleSeq = 1;

    rows.forEach((tr) => {
      const parsed = parseDateFromRow(tr);

      // 日期不合法：默认显示（避免误伤）
      if (!parsed) {
        tr.style.display = "";
        return;
      }

      const shouldShow = parsed.year === year && parsed.monthIndex === monthIndex;
      tr.style.display = shouldShow ? "" : "none";

      // 重新编号：只对“可见行”编号
      const seqCell = tr.querySelector("td");
      if (shouldShow) {
        if (seqCell) seqCell.textContent = visibleSeq++;
      } else {
        // 隐藏行时，避免保留选中态（防止删除选中行删到不可见）
        tr.classList.remove("highlight-row");
      }
    });
  }

  // 暴露到全局，供 logs.js 和 share.js 使用
  window.tableFilter = window.tableFilter || {};
  window.tableFilter.filterTableByMonth = filterTableByMonth;
})();
