/**
 * Google Sheets Proxy Layer
 * 중앙 데이터 관리 모듈 - 모든 시트 데이터를 프록시로 관리
 * 이후 구글 스프레드시트에서 중앙 제어 가능
 */

const SheetsProxy = (() => {
  const SPREADSHEET_ID = '13LWJmvtSJRy6G43Lo_jar9hqZquCY4vB4bP4kAQVQLQ';
  const BASE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq`;

  const _cache = {};
  const CACHE_TTL = 5 * 60 * 1000; // 5분 캐시

  /**
   * 구글 시트에서 데이터를 가져오는 핵심 함수
   * @param {string} sheetName - 시트 이름
   * @param {string} query - GViz 쿼리 (optional)
   * @returns {Promise<Array<Object>>}
   */
  async function fetchSheet(sheetName, query = '') {
    const cacheKey = `${sheetName}_${query}`;
    const now = Date.now();

    if (_cache[cacheKey] && (now - _cache[cacheKey].timestamp < CACHE_TTL)) {
      return _cache[cacheKey].data;
    }

    let url = `${BASE_URL}?sheet=${encodeURIComponent(sheetName)}`;
    if (query) {
      url += `&tq=${encodeURIComponent(query)}`;
    }

    try {
      const response = await fetch(url);
      const text = await response.text();
      const data = parseGVizResponse(text);

      _cache[cacheKey] = { data, timestamp: now };
      return data;
    } catch (error) {
      console.error(`[SheetsProxy] Error fetching ${sheetName}:`, error);
      throw error;
    }
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
   * POST_METRICS 시트 데이터 조회
   */
  async function getPostMetrics() {
    return fetchSheet('POST_METRICS');
  }

  /**
   * STATS_DAILY 시트 데이터 조회
   */
  async function getStatsDaily() {
    return fetchSheet('STATS_DAILY');
  }

  /**
   * 캐시 초기화
   */
  function clearCache() {
    Object.keys(_cache).forEach(key => delete _cache[key]);
  }

  /**
   * 특정 시트의 캐시만 초기화
   */
  function clearSheetCache(sheetName) {
    Object.keys(_cache)
      .filter(key => key.startsWith(sheetName))
      .forEach(key => delete _cache[key]);
  }

  return {
    fetchSheet,
    getPostMetrics,
    getStatsDaily,
    clearCache,
    clearSheetCache,
    SPREADSHEET_ID
  };
})();
