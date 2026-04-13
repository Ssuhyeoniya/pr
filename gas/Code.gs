/**
 * 홍보협의체 - Google Apps Script 중앙 프록시
 *
 * [구조]
 * - 이 스크립트는 "새 스프레드시트"에서 배포
 * - 데이터 원본 스프레드시트를 ID로 원격 참조
 * - 중앙 제어 시트(CONFIG)는 이 새 스프레드시트에 생성
 *
 * [배포 방법]
 * 1. 새 구글 스프레드시트 생성
 * 2. 확장 프로그램 > Apps Script > 이 코드 붙여넣기
 * 3. 배포 > 새 배포 > 웹 앱
 *    - 실행 사용자: 본인
 *    - 액세스 권한: 모든 사용자 (익명 포함)
 * 4. 배포 URL을 웹사이트 sheets-proxy.js의 GAS_WEB_APP_URL에 설정
 *
 * [중앙 제어]
 * - 이 새 스프레드시트에 CONFIG 시트를 만들면 웹사이트 설정 제어 가능
 * - 데이터 원본을 바꾸고 싶으면 아래 DATA_SOURCES의 ID만 변경
 */

// ========================================
// ★ 데이터 원본 설정 - 여기서 중앙 제어
// ========================================
var DATA_SOURCES = {
  POST_METRICS: {
    spreadsheetId: '13LWJmvtSJRy6G43Lo_jar9hqZquCY4vB4bP4kAQVQLQ',
    sheetName: 'POST_METRICS'
  },
  STATS_DAILY: {
    spreadsheetId: '13LWJmvtSJRy6G43Lo_jar9hqZquCY4vB4bP4kAQVQLQ',
    sheetName: 'STATS_DAILY'
  }
};

// ========================================
// 웹 앱 엔드포인트
// ========================================

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

// ========================================
// 원격 시트 접근
// ========================================

/**
 * 원격 스프레드시트에서 시트를 가져옴
 */
function getRemoteSheet(sourceKey) {
  var src = DATA_SOURCES[sourceKey];
  if (!src) return null;
  var ss = SpreadsheetApp.openById(src.spreadsheetId);
  return ss.getSheetByName(src.sheetName);
}

// ========================================
// POST_METRICS
// ========================================

function getPostMetrics(params) {
  var sheet = getRemoteSheet('POST_METRICS');
  if (!sheet) return { error: 'POST_METRICS 시트를 찾을 수 없습니다.' };

  var data = sheetToObjects(sheet);

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

  var displayColumns = ['service', 'title', 'thumbnail', 'publishDate', 'category', 'totalVisit', 'inbound'];
  if (params.columns) {
    displayColumns = params.columns.split(',').map(function(c) { return c.trim(); });
  }

  var offset = parseInt(params.offset) || 0;
  var limit = parseInt(params.limit) || data.length;
  var total = data.length;
  data = data.slice(offset, offset + limit);

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

// ========================================
// STATS_DAILY
// ========================================

function getStatsDaily(params) {
  var sheet = getRemoteSheet('STATS_DAILY');
  if (!sheet) return { error: 'STATS_DAILY 시트를 찾을 수 없습니다.' };

  var data = sheetToObjects(sheet);
  var headers = getSheetHeaders(sheet);

  if (params.category) {
    var cat = params.category.toLowerCase();
    data = data.filter(function(row) {
      return Object.values(row).some(function(v) {
        return String(v).toLowerCase() === cat;
      });
    });
  }

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

  var categories = extractUniqueCategories(data, headers);

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

// ========================================
// CONFIG - 이 새 스프레드시트에서 중앙 제어
// ========================================

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

function getDefaultConfig() {
  return {
    site_title: '홍보협의체',
    blog_page_size: 20,
    stats_page_size: 30,
    enabled_pages: 'schedule,blog,stats',
    categories: ''
  };
}

function getSheetList() {
  var results = [];
  var keys = Object.keys(DATA_SOURCES);
  for (var i = 0; i < keys.length; i++) {
    var src = DATA_SOURCES[keys[i]];
    try {
      var ss = SpreadsheetApp.openById(src.spreadsheetId);
      var sheet = ss.getSheetByName(src.sheetName);
      results.push({
        key: keys[i],
        spreadsheetId: src.spreadsheetId,
        sheetName: src.sheetName,
        rows: sheet ? sheet.getLastRow() : 0,
        cols: sheet ? sheet.getLastColumn() : 0
      });
    } catch (err) {
      results.push({
        key: keys[i],
        spreadsheetId: src.spreadsheetId,
        sheetName: src.sheetName,
        error: err.message
      });
    }
  }
  return { sources: results };
}

// ========================================
// 유틸리티 함수
// ========================================

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

function getSheetHeaders(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  return data[0].map(function(h) { return String(h).trim(); }).filter(function(h) { return h !== ''; });
}

function findDateColumn(headers) {
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toLowerCase();
    if (h.indexOf('date') >= 0 || h.indexOf('날짜') >= 0 || h.indexOf('일자') >= 0) {
      return headers[i];
    }
  }
  return null;
}

function formatDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(val);
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0, 10);
  return null;
}

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
