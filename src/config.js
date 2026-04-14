/**
 * 앱 전역 상수 및 설정
 * 데이터 원본 변경 시 이 파일 1곳만 수정
 */

export const GAS_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbx4VxsijMekDGKg34jIvdyVVGJ5iZyiqKK7nmzAm50R9tcP_Xeu_tcLB6Uutd7Oy8cE/exec';

export const SPREADSHEET_ID = '13LWJmvtSJRy6G43Lo_jar9hqZquCY4vB4bP4kAQVQLQ';

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

export const BLOG_PAGE_SIZE = 20;

// 통계 페이지에서 제외할 컬럼
export const STATS_EXCLUDE_COLS = [
  'impressions',
  'search_in',
  'etc',
  'post_id',
  'postid',
];

export const EVENT_TYPE_LABEL = {
  meeting: '회의',
  deadline: '마감',
  publish: '발행',
  other: '기타',
};

// 네비게이션 정의
export const NAV_ITEMS = [
  { path: '/schedule', label: '일정 관리' },
  {
    label: '블로그',
    children: [
      { path: '/blog', label: '관리' },
      { path: '/stats', label: '통계' },
    ],
  },
];

// 페이지별 헤더 타이틀
export const PAGE_TITLES = {
  '/schedule': '일정 관리',
  '/blog': '블로그 - 관리',
  '/stats': '블로그 - 통계',
};
