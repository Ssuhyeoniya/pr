/**
 * 날짜 유틸리티
 */

/** Date → 'YYYY-MM-DD' */
export function fmtISO(d) {
  if (!(d instanceof Date)) d = new Date(d);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 다양한 입력을 'YYYY-MM-DD'로 정규화. 실패 시 null */
export function normalizeDate(val) {
  if (!val) return null;
  if (val instanceof Date) return fmtISO(val);
  const s = String(val);
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0, 10);
  if (s.includes('T')) return s.substring(0, 10);
  // Excel 시리얼 넘버 (25569 = 1970-01-01)
  if (typeof val === 'number' && val > 10000) {
    return new Date((val - 25569) * 86400 * 1000).toISOString().substring(0, 10);
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  return null;
}

/** 표시용 포맷 - 파싱 실패 시 '-' */
export function displayDate(val) {
  return normalizeDate(val) || '-';
}

/** 월 이름 / 요일 이름 */
export const MONTH_NAMES = [
  '1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'
];
export const DAY_NAMES = ['일','월','화','수','목','금','토'];
