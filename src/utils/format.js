/**
 * 숫자/문자 포맷 유틸리티
 */

/** 숫자 포맷 (null/공백은 '-') */
export function fmtNumber(val) {
  if (val == null || val === '') return '-';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return n.toLocaleString();
}

/** 숫자로 판정 가능한지 */
export function isNumeric(val) {
  if (val == null || val === '') return false;
  return !isNaN(Number(val));
}

/** 서비스 유형 → 배지 CSS 클래스 */
export function getServiceBadgeClass(service) {
  if (!service) return 'badge-default';
  const s = String(service).toLowerCase();
  if (s.includes('blog') || s.includes('블로그')) return 'badge-blog';
  if (s.includes('news') || s.includes('뉴스')) return 'badge-news';
  if (s.includes('social') || s.includes('sns')) return 'badge-social';
  if (s.includes('video') || s.includes('youtube')) return 'badge-video';
  return 'badge-default';
}
