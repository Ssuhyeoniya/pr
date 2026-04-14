/**
 * Google Sheets Proxy Layer
 * 중앙 데이터 관리 모듈 - GAS 웹 앱 또는 GViz 폴백
 *
 * [사용법]
 * 1. GAS 배포 후 아래 GAS_WEB_APP_URL에 URL 설정 → GAS 프록시 모드
 * 2. URL 미설정 시 → GViz API 직접 조회 폴백
 */

const SheetsProxy = (() => {
  // ====================================================
  // ★ GAS 웹 앱 URL - 배포 후 여기에 붙여넣기
  // 예: 'https://script.google.com/macros/s/XXXXX/exec'
  // ====================================================
  const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx4VxsijMekDGKg34jIvdyVVGJ5iZyiqKK7nmzAm50R9tcP_Xeu_tcLB6Uutd7Oy8cE/exec';

  const SPREADSHEET_ID = '13LWJmvtSJRy6G43Lo_jar9hqZquCY4vB4bP4kAQVQLQ';
  const GVIZ_BASE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq`;

  const _cache = {};
  const CACHE_TTL = 5 * 60 * 1000; // 5분 캐시
  let _config = null;

  /**
   * GAS 모드 여부
   */
  function isGASMode() {
    return GAS_WEB_APP_URL && GAS_WEB_APP_URL.length > 0;
  }

  /**
   * GAS 웹 앱에 요청
   */
  async function fetchGAS(action, params = {}) {
    const cacheKey = `gas_${action}_${JSON.stringify(params)}`;
    const now = Date.now();

    if (_cache[cacheKey] && (now - _cache[cacheKey].timestamp < CACHE_TTL)) {
      return _cache[cacheKey].data;
    }

    const url = new URL(GAS_WEB_APP_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    });

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) throw new Error(data.error);

    _cache[cacheKey] = { data, timestamp: now };
    return data;
  }

  /**
   * GViz API로 시트 직접 조회 (폴백)
   */
  async function fetchGViz(sheetName, query = '') {
    const cacheKey = `gviz_${sheetName}_${query}`;
    const now = Date.now();

    if (_cache[cacheKey] && (now - _cache[cacheKey].timestamp < CACHE_TTL)) {
      return _cache[cacheKey].data;
    }

    let url = `${GVIZ_BASE_URL}?sheet=${encodeURIComponent(sheetName)}`;
    if (query) url += `&tq=${encodeURIComponent(query)}`;

    const response = await fetch(url);
    const text = await response.text();
    const data = parseGVizResponse(text);

    _cache[cacheKey] = { data, timestamp: now };
    return data;
  }

  /**
   * GViz JSON 응답 파싱
   */
  function parseGVizResponse(responseText) {
    const jsonStr = responseText
      .replace(/^.*google\.visualization\.Query\.setResponse\(/, '')
      .replace(/\);?\s*$/, '');

    const json = JSON.parse(jsonStr);
    const headers = json.table.cols.map(col => col.label || col.id);
    const rows = json.table.rows.map(row => {
      const obj = {};
      row.c.forEach((cell, i) => {
        obj[headers[i]] = cell ? (cell.v !== null ? cell.v : '') : '';
      });
      return obj;
    });

    return { headers, rows };
  }

  /**
   * POST_METRICS 데이터 조회
   */
  async function getPostMetrics(params = {}) {
    if (isGASMode()) {
      const result = await fetchGAS('postMetrics', params);
      return { headers: result.columns, rows: result.rows };
    }
    return fetchGViz('POST_METRICS');
  }

  /**
   * STATS_DAILY 데이터 조회
   */
  async function getStatsDaily(params = {}) {
    if (isGASMode()) {
      const result = await fetchGAS('statsDaily', params);
      return { headers: result.headers, rows: result.rows, categories: result.categories };
    }
    return fetchGViz('STATS_DAILY');
  }

  /**
   * CONFIG 시트에서 중앙 설정 조회 (GAS 모드 전용)
   */
  async function getConfig() {
    if (!isGASMode()) {
      return { site_title: 'PR', blog_page_size: 20, stats_page_size: 30 };
    }

    if (_config) return _config;

    const result = await fetchGAS('config');
    _config = result.config;
    return _config;
  }

  /**
   * 시트 목록 조회 (GAS 모드 전용)
   */
  async function getSheetList() {
    if (!isGASMode()) return { sheets: [] };
    return fetchGAS('sheetList');
  }

  /**
   * 캐시 초기화
   */
  function clearCache() {
    Object.keys(_cache).forEach(key => delete _cache[key]);
    _config = null;
  }

  function clearSheetCache(sheetName) {
    Object.keys(_cache)
      .filter(key => key.includes(sheetName))
      .forEach(key => delete _cache[key]);
  }

  /**
   * 현재 모드 정보
   */
  function getMode() {
    return isGASMode() ? 'GAS Proxy' : 'GViz Direct';
  }

  return {
    getPostMetrics,
    getStatsDaily,
    getConfig,
    getSheetList,
    clearCache,
    clearSheetCache,
    getMode,
    SPREADSHEET_ID
  };
})();
