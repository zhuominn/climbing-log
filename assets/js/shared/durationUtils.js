export function parseDurationToMinutes(input) {
  if (input == null) return null;
  const text = String(input).trim();
  if (!text) return null;

  // 你确认：永远是 `x 小时`（中间一个空格），x 可小数
  const m = text.match(/^(\d+(?:\.\d+)?)\s小时$/);
  if (!m) return null;

  const hours = Number(m[1]);
  if (!Number.isFinite(hours)) return null;

  return Math.round(hours * 60);
}