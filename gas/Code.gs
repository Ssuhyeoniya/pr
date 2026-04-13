/**
 * 홍보협의체 - Google Apps Script 중앙 프록시
 *
 * [배포 방법]
 * 1. 구글 스프레드시트 > 확장 프로그램 > Apps Script 열기
 * 2. 이 코드를 Code.gs에 붙여넣기
 * 3. 배포 > 새 배포 > 웹 앱 선택
 *    - 실행 사용자: 본인
 *    - 액세스 권한: 모든 사용자 (익명 포함)
 * 4. 배포 후 받은 URL을 웹사이트 sheets-proxy.js의 GAS_WEB_APP_URL에 설정
 *
 * [시트 구조]
 * - POST_METRICS: 블로그 포스트 데이터
 * - STATS_DAILY: 일자별 통계 데이터
 * - CONFIG (선택): 웹사이트 설정 중앙 제어용
 */

/**
 * GET 요청 핸들러 - 웹 앱 엔드포인트
 */
function doGet(e) {
  var params = e.parameter;
  var action = params.action || 'postMetrics';
  var result;

  try {
    switch (action) {
      case 'postMetrics':
        result = getPostMetrics(params);
        break;
      case 'statsDaily':
        result = getStatsDaily(params);
        break;
      case 'config':
        result = getConfig();
        break;
      case 'sheetList':
        result = getSheetList();
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST_METRICS 시트 데이터 조회
 * params.columns - 표시할 컬럼 (쉼표 구분, 선택)
 * params.service - 서비스 필터 (선택)
 * params.category - 카테고리 필터 (선택)
 * params.search - 제목 검색어 (선택)
 * params.limit - 최대 행 수 (선택, 기본 전체)
 * params.offset - 시작 위치 (선택, 기본 0)
 */
function getPostMetrics(params) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('POST_METRICS');
  if (!sheet) return { error: 'POST_METRICS 시트를 찾을 수 없습니다.' };

  var data = sheetToObjects(sheet);

  // 필터 적용
  if (params.service) {
    data = data.filter(function(row) { return row.service === params.service; });
  }
  if (params.category) {
    data = data.filter(function(row) { return row.category === params.category; });
  }
  if (params.search) {
    var term = params.search.toLowerCase();
    data = data.filter(function(row) {
      return (row.title || '').toLowerCase().indexOf(term) >= 0;
    });
  }

  // 표시 컬럼 제한
  var displayColumns = ['service', 'title', 'thumbnail', 'publishDate', 'category', 'totalVisit', 'inbound'];
  if (params.columns) {
    displayColumns = params.columns.split(',').map(function(c) { return c.trim(); });
  }

  // 페이지네이션
  var offset = parseInt(params.offset) || 0;
  var limit = parseInt(params.limit) || data.length;
  var total = data.length;
  data = data.slice(offset, offset + limit);

  // 컬럼 필터링
  var filtered = data.map(function(row) {
    var obj = {};
    displayColumns.forEach(function(col) {
      obj[col] = row[col] !== undefined ? row[col] : '';
    });
    return obj;
  });

  return {
    sheet: 'POST_METRICS',
    columns: displayColumns,
    total: total,
    offset: offset,
    limit: limit,
    count: filtered.length,
    rows: filtered
  };
}

/**
 * STATS_DAILY 시트 데이터 조회
 * params.category - 카테고리 필터 (선택)
 * params.dateFrom - 시작일 YYYY-MM-DD (선택)
 * params.dateTo - 종료일 YYYY-MM-DD (선택)
 */
function getStatsDaily(params) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('STATS_DAILY');
  if (!sheet) return { error: 'STATS_DAILY 시트를 찾을 수 없습니다.' };

  var data = sheetToObjects(sheet);
  var headers = getSheetHeaders(sheet);

  // 카테고리 필터
  if (params.category) {
    var cat = params.category.toLowerCase();
    data = data.filter(function(row) {
      return Object.values(row).some(function(v) {
        return String(v).toLowerCase() === cat;
      });
    });
  }

  // 날짜 필터
  if (params.dateFrom || params.dateTo) {
    var dateCol = findDateColumn(headers);
    if (dateCol) {
      data = data.filter(function(row) {
        var dateVal = formatDateValue(row[dateCol]);
        if (!dateVal) return true;
        if (params.dateFrom && dateVal < params.dateFrom) return false;
        if (params.dateTo && dateVal > params.dateTo) return false;
        return true;
      });
    }
  }

  // 카테고리 목록 추출
  var categories = extractUniqueCategories(data, headers);

  // 페이지네이션
  var offset = parseInt(params.offset) || 0;
  var limit = parseInt(params.limit) || data.length;
  var total = data.length;
  data = data.slice(offset, offset + limit);

  return {
    sheet: 'STATS_DAILY',
    headers: headers,
    categories: categories,
    total: total,
    offset: offset,
    limit: limit,
    count: data.length,
    rows: data
  };
}

/**
 * CONFIG 시트에서 웹사이트 설정 읽기
 * CONFIG 시트 구조: key | value
 * 예시:
 *   site_title | 홍보협의체
 *   blog_page_size | 20
 *   stats_page_size | 30
 *   enabled_pages | schedule,blog,stats
 *   categories | 블로그,뉴스,SNS,영상
 */
function getConfig() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG');
  if (!sheet) {
    return {
      sheet: 'CONFIG',
      exists: false,
      config: getDefaultConfig()
    };
  }

  var data = sheet.getDataRange().getValues();
  var config = {};

  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]).trim();
    var value = data[i][1];
    if (key) {
      config[key] = value;
    }
  }

  return {
    sheet: 'CONFIG',
    exists: true,
    config: config
  };
}

/**
 * 기본 설정값
 */
function getDefaultConfig() {
  return {
    site_title: '홍보협의체',
    blog_page_size: 20,
    stats_page_size: 30,
    enabled_pages: 'schedule,blog,stats',
    categories: ''
  };
}

/**
 * 스프레드시트의 시트 목록 반환
 */
function getSheetList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets().map(function(s) {
    return {
      name: s.getName(),
      rows: s.getLastRow(),
      cols: s.getLastColumn()
    };
  });
  return { sheets: sheets };
}

// ========================================
// 유틸리티 함수
// ========================================

/**
 * 시트 데이터를 객체 배열로 변환
 */
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var obj = {};
    var hasValue = false;
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      // Date 객체를 ISO 문자열로 변환
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[headers[j]] = val;
      if (val !== '' && val !== null) hasValue = true;
    }
    if (hasValue) rows.push(obj);
  }

  return rows;
}

/**
 * 시트 헤더 목록 반환
 */
function getSheetHeaders(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  return data[0].map(function(h) { return String(h).trim(); }).filter(function(h) { return h !== ''; });
}

/**
 * 날짜 컬럼 찾기
 */
function findDateColumn(headers) {
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toLowerCase();
    if (h.indexOf('date') >= 0 || h.indexOf('날짜') >= 0 || h.indexOf('일자') >= 0) {
      return headers[i];
    }
  }
  return null;
}

/**
 * 날짜 값 포맷팅
 */
function formatDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(val);
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0, 10);
  return null;
}

/**
 * 고유 카테고리 추출
 */
function extractUniqueCategories(data, headers) {
  var catCol = null;
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toLowerCase();
    if (h.indexOf('category') >= 0 || h.indexOf('카테고리') >= 0 || h.indexOf('service') >= 0) {
      catCol = headers[i];
      break;
    }
  }
  if (!catCol) return [];

  var unique = {};
  data.forEach(function(row) {
    var v = row[catCol];
    if (v && String(v).trim() !== '') {
      unique[String(v).trim()] = true;
    }
  });

  return Object.keys(unique).sort();
}
