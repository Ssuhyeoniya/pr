/**
 * Stats Daily Page - STATS_DAILY
 * 막대그래프 + 인바운드 TOP5 + 조회수 TOP5
 * POST_ID → POST_METRICS.postId 매칭으로 title 표시
 */

const StatsPage = (() => {
  let _data = [];
  let _headers = [];
  let _filtered = [];
  let _categories = [];
  let _activeCategory = '전체';
  let _dateFrom = '';
  let _dateTo = '';
  let _activePeriod = 'all';
  let _titleMap = {}; // postId → title 매핑

  // 제거할 컬럼 (헤더/팝업 테이블 모두)
  const EXCLUDE_COLS = ['impressions', 'search_in', 'etc', 'post_id', 'postid'];

  function loadUserCategories() {
    try {
      const saved = localStorage.getItem('stats_user_categories');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  }

  function saveUserCategories() {
    localStorage.setItem('stats_user_categories', JSON.stringify(_categories));
  }

  async function render(container) {
    container.innerHTML = '<div class="loading-spinner">데이터 로딩 중...</div>';
    try {
      // STATS_DAILY + POST_METRICS 병렬 로드
      const [statsResult, postResult] = await Promise.all([
        SheetsProxy.getStatsDaily(),
        SheetsProxy.getPostMetrics({ columns: 'postId,title' })
      ]);

      // postId → title 매핑 테이블 생성
      _titleMap = {};
      if (postResult && postResult.rows) {
        postResult.rows.forEach(r => {
          const id = String(r.postId || '').trim();
          if (id) _titleMap[id] = r.title || '';
        });
      }

      _data = statsResult.rows;
      // 제거 컬럼 필터링
      _headers = statsResult.headers.filter(h =>
        !EXCLUDE_COLS.includes(h.toLowerCase().trim())
      );
      _filtered = [..._data];
      _dateFrom = '';
      _dateTo = '';
      _activePeriod = 'all';
      _activeCategory = '전체';

      const sheetCats = extractCategories(_data, _headers);
      const userCats = loadUserCategories();
      _categories = [...new Set([...sheetCats, ...userCats])];
      saveUserCategories();

      renderPage(container);
    } catch (err) {
      container.innerHTML = `<div class="empty-state">데이터를 불러올 수 없습니다.<br><span style="font-size:8px;color:#999;">${err.message}</span></div>`;
    }
  }

  function extractCategories(data, headers) {
    const catIdx = headers.findIndex(h => {
      const l = h.toLowerCase();
      return l.includes('category') || l.includes('카테고리') || l.includes('service') || l.includes('서비스');
    });
    if (catIdx >= 0) {
      const key = headers[catIdx];
      return [...new Set(data.map(r => r[key]).filter(Boolean))].sort();
    }
    return [];
  }

  function getCol(keyword) {
    return _headers.find(h => h.toLowerCase().includes(keyword)) || null;
  }

  /** 날짜 컬럼: 이름 매칭 → 데이터 내용 기반 감지 */
  function getDateCol() {
    const byName = getCol('date') || getCol('날짜') || getCol('일자') || getCol('day');
    if (byName) return byName;
    // fallback: 첫 행 데이터에서 YYYY-MM-DD 패턴 컬럼 탐색
    const sample = _data[0];
    if (!sample) return null;
    for (const h of _headers) {
      const v = String(sample[h] || '');
      if (v.match(/^\d{4}-\d{2}-\d{2}/)) return h;
    }
    return _headers[0] || null; // 최후 fallback: 첫 컬럼
  }

  /** 조회수 컬럼: 이름 매칭 → 숫자 컬럼 중 가장 큰 값 컬럼 */
  function getVisitCol() {
    const byName = getCol('totalvisit') || getCol('total_visit') || getCol('visit') || getCol('조회') || getCol('view');
    if (byName) return byName;
    return detectNumericCol(0);
  }

  /** 인바운드 컬럼 */
  function getInboundCol() {
    const byName = getCol('inbound') || getCol('유입');
    if (byName) return byName;
    return detectNumericCol(1);
  }

  /** 숫자 컬럼 자동 감지 (idx: 0=첫번째 숫자컬럼, 1=두번째) */
  function detectNumericCol(idx) {
    if (_data.length === 0) return null;
    const sample = _data[0];
    const dateCol = getCol('date') || getCol('날짜') || getCol('일자') || getCol('day');
    const postIdCol = getCol('post_id') || getCol('postid');
    const numCols = _headers.filter(h => {
      if (h === dateCol || h === postIdCol) return false;
      const v = sample[h];
      return v !== '' && v != null && !isNaN(Number(v));
    });
    return numCols[idx] || null;
  }

  /** postId 컬럼: EXCLUDE에서 제거된 컬럼도 row 데이터에서 직접 탐색 */
  function getPostIdCol() {
    // _headers에서 먼저 찾기
    const byHeader = getCol('post_id') || getCol('postid');
    if (byHeader) return byHeader;
    // row 키에서 직접 탐색 (EXCLUDE로 _headers에서 빠졌을 수 있음)
    if (_data.length > 0) {
      const keys = Object.keys(_data[0]);
      return keys.find(k => k.toLowerCase().includes('post_id') || k.toLowerCase() === 'postid') || null;
    }
    return null;
  }

  /** postId로 title 조회 */
  function resolveTitle(row) {
    const pidCol = getPostIdCol();
    if (!pidCol) return null;
    const pid = String(row[pidCol] || '').trim();
    return _titleMap[pid] || null;
  }

  function applyFilters() {
    const dateCol = getDateCol();
    _filtered = _data.filter(row => {
      if (_activeCategory !== '전체') {
        const match = Object.values(row).some(v => String(v).toLowerCase() === _activeCategory.toLowerCase());
        if (!match) return false;
      }
      if (dateCol && (_dateFrom || _dateTo)) {
        const dv = fmtDate(row[dateCol]);
        if (dv) {
          if (_dateFrom && dv < _dateFrom) return false;
          if (_dateTo && dv > _dateTo) return false;
        }
      }
      return true;
    });
  }

  function fmtDate(val) {
    if (!val) return null;
    const s = String(val);
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0, 10);
    if (s.includes('T')) return s.substring(0, 10);
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
    return null;
  }

  function renderPage(container) {
    const dateCol = getDateCol();
    const visitCol = getVisitCol();
    const inboundCol = getInboundCol();

    // 디버그 로그
    console.log('[Stats] headers:', _headers);
    console.log('[Stats] dateCol:', dateCol, '/ visitCol:', visitCol, '/ inboundCol:', inboundCol);
    if (_data.length > 0) console.log('[Stats] sample row:', _data[0]);

    // 일자별 집계
    const dailyMap = {};
    _filtered.forEach(row => {
      const d = dateCol ? fmtDate(row[dateCol]) : null;
      if (!d) return;
      if (!dailyMap[d]) dailyMap[d] = { visit: 0, inbound: 0 };
      dailyMap[d].visit += Number(row[visitCol] || 0);
      dailyMap[d].inbound += Number(row[inboundCol] || 0);
    });
    const dailyKeys = Object.keys(dailyMap).sort();

    // TOP5
    const visitTop5 = [..._filtered]
      .sort((a, b) => Number(b[visitCol] || 0) - Number(a[visitCol] || 0))
      .slice(0, 5);
    const inboundTop5 = [..._filtered]
      .sort((a, b) => Number(b[inboundCol] || 0) - Number(a[inboundCol] || 0))
      .slice(0, 5);

    container.innerHTML = `
      <div class="category-tabs" id="stats-category-tabs">
        <button class="category-tab ${_activeCategory === '전체' ? 'active' : ''}" data-cat="전체">전체</button>
        ${_categories.map(c =>
          `<button class="category-tab ${_activeCategory === c ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`
        ).join('')}
        <button class="category-tab-add" id="stats-add-category">+ 추가</button>
      </div>

      <div class="date-filter-bar">
        <label>기간:</label>
        <button class="btn btn-sm period-btn ${_activePeriod === '7d' ? 'active' : ''}" data-period="7d">7일</button>
        <button class="btn btn-sm period-btn ${_activePeriod === '30d' ? 'active' : ''}" data-period="30d">30일</button>
        <button class="btn btn-sm period-btn ${_activePeriod === '90d' ? 'active' : ''}" data-period="90d">90일</button>
        <button class="btn btn-sm period-btn ${_activePeriod === 'all' ? 'active' : ''}" data-period="all">전체</button>
        <span style="margin:0 4px;color:#ccc;">|</span>
        <input type="date" id="stats-date-from" value="${_dateFrom}">
        <span style="font-size:8px;">~</span>
        <input type="date" id="stats-date-to" value="${_dateTo}">
        <button class="btn btn-sm" id="stats-date-apply">적용</button>
        <button class="btn btn-sm" id="stats-date-reset">초기화</button>
        <span style="font-size:8px;color:#999;margin-left:auto;">총 ${_filtered.length}건</span>
      </div>

      <div class="chart-wrapper">
        <div class="chart-title">일자별 현황</div>
        <div class="chart-bar-area" id="stats-chart">
          ${renderBarChart(dailyKeys, dailyMap)}
        </div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-dot" style="background:#4285f4;"></span>조회수</span>
          <span class="legend-item"><span class="legend-dot" style="background:#34a853;"></span>인바운드</span>
        </div>
      </div>

      <div class="top5-grid">
        <div class="top5-block">
          <div class="top5-header">
            <span class="top5-title">조회수 TOP 5</span>
            <button class="btn btn-sm top5-more" data-type="visit">더보기</button>
          </div>
          <div class="top5-list">
            ${visitTop5.map((r, i) => `
              <div class="top5-row">
                <span class="top5-rank">${i + 1}</span>
                <span class="top5-name">${esc(resolveTitle(r) || '-')}</span>
                <span class="top5-val">${Number(r[visitCol] || 0).toLocaleString()}</span>
              </div>
            `).join('')}
            ${visitTop5.length === 0 ? '<div class="empty-state" style="padding:10px;">데이터 없음</div>' : ''}
          </div>
        </div>
        <div class="top5-block">
          <div class="top5-header">
            <span class="top5-title">인바운드 TOP 5</span>
            <button class="btn btn-sm top5-more" data-type="inbound">더보기</button>
          </div>
          <div class="top5-list">
            ${inboundTop5.map((r, i) => `
              <div class="top5-row">
                <span class="top5-rank">${i + 1}</span>
                <span class="top5-name">${esc(resolveTitle(r) || '-')}</span>
                <span class="top5-val">${Number(r[inboundCol] || 0).toLocaleString()}</span>
              </div>
            `).join('')}
            ${inboundTop5.length === 0 ? '<div class="empty-state" style="padding:10px;">데이터 없음</div>' : ''}
          </div>
        </div>
      </div>
    `;

    bindEvents(container, visitCol, inboundCol);
  }

  function renderBarChart(keys, map) {
    if (keys.length === 0) return '<div class="empty-state" style="padding:20px;">차트 데이터가 없습니다.</div>';

    let maxVal = 0;
    keys.forEach(k => { maxVal = Math.max(maxVal, map[k].visit, map[k].inbound); });
    if (maxVal === 0) maxVal = 1;

    const barWidth = Math.max(8, Math.min(24, Math.floor(600 / keys.length) - 4));

    return `
      <div class="bar-chart-scroll">
        <div class="bar-chart" style="min-width:${keys.length * (barWidth * 2 + 12)}px;">
          ${keys.map(k => {
            const vH = Math.max(2, (map[k].visit / maxVal) * 120);
            const iH = Math.max(2, (map[k].inbound / maxVal) * 120);
            const label = k.substring(5);
            return `
              <div class="bar-group" title="${k}\n조회수: ${map[k].visit.toLocaleString()}\n인바운드: ${map[k].inbound.toLocaleString()}">
                <div class="bar-pair">
                  <div class="bar bar-visit" style="height:${vH}px;width:${barWidth}px;"></div>
                  <div class="bar bar-inbound" style="height:${iH}px;width:${barWidth}px;"></div>
                </div>
                <div class="bar-label">${label}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function showMorePopup(type, visitCol, inboundCol) {
    const sortCol = type === 'visit' ? visitCol : inboundCol;
    const label = type === 'visit' ? '조회수' : '인바운드';
    const sorted = [..._filtered].sort((a, b) => Number(b[sortCol] || 0) - Number(a[sortCol] || 0));

    // 표시 컬럼: 제거 컬럼 빼고, title 컬럼 추가
    const displayHeaders = ['title', ..._headers.filter(h =>
      !EXCLUDE_COLS.includes(h.toLowerCase().trim())
    )];

    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = `${label} 전체 목록 (${sorted.length}건)`;
    document.getElementById('modal-body').innerHTML = `
      <div style="max-height:360px;overflow:auto;">
        <table class="data-table">
          <thead><tr>${displayHeaders.map(h => `<th>${esc(h === 'title' ? '제목' : h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${sorted.map(row => `<tr>${displayHeaders.map(h => {
              let v;
              if (h === 'title') {
                v = resolveTitle(row) || '-';
                return `<td>${esc(v)}</td>`;
              }
              v = row[h];
              // 날짜 컬럼 → YYYY-MM-DD 포맷
              const hl = h.toLowerCase();
              if (hl.includes('date') || hl.includes('날짜') || hl.includes('일자') || hl.includes('day')) {
                return `<td>${fmtDate(v) || '-'}</td>`;
              }
              // 그 외 날짜 형태 값도 YYYY-MM-DD로 변환
              if (v && String(v).includes('T') && String(v).match(/^\d{4}-\d{2}-\d{2}T/)) {
                return `<td>${String(v).substring(0, 10)}</td>`;
              }
              const isN = typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v != null);
              return `<td class="${isN ? 'number-cell' : ''}">${v != null ? (isN ? Number(v).toLocaleString() : esc(String(v))) : '-'}</td>`;
            }).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('modal-footer').innerHTML = `<button class="btn" id="modal-popup-close">닫기</button>`;
    overlay.classList.add('show');
    document.getElementById('modal-popup-close').addEventListener('click', () => overlay.classList.remove('show'));
  }

  function showAddCategoryModal() {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = '카테고리 추가';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>카테고리 이름</label>
        <input type="text" id="new-category-name" placeholder="새 카테고리 이름 입력">
      </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
      <button class="btn" id="modal-cancel">취소</button>
      <button class="btn btn-primary" id="modal-confirm">추가</button>
    `;
    overlay.classList.add('show');
    document.getElementById('modal-cancel').addEventListener('click', () => overlay.classList.remove('show'));
    document.getElementById('modal-confirm').addEventListener('click', () => {
      const name = document.getElementById('new-category-name').value.trim();
      if (name && !_categories.includes(name)) {
        _categories.push(name);
        saveUserCategories();
        renderPage(document.getElementById('content-body'));
      }
      overlay.classList.remove('show');
    });
  }

  function bindEvents(container, visitCol, inboundCol) {
    container.querySelectorAll('.category-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeCategory = btn.dataset.cat;
        applyFilters();
        renderPage(container);
      });
    });
    container.querySelector('#stats-add-category')?.addEventListener('click', showAddCategoryModal);

    // 기간 필터 버튼 (7일/30일/90일/전체)
    container.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const period = btn.dataset.period;
        _activePeriod = period;
        if (period === 'all') {
          _dateFrom = '';
          _dateTo = '';
        } else {
          const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
          const today = new Date();
          const from = new Date(today);
          from.setDate(today.getDate() - days);
          _dateTo = fmtDateISO(today);
          _dateFrom = fmtDateISO(from);
        }
        applyFilters();
        renderPage(container);
      });
    });

    container.querySelector('#stats-date-apply')?.addEventListener('click', () => {
      _dateFrom = container.querySelector('#stats-date-from').value;
      _dateTo = container.querySelector('#stats-date-to').value;
      _activePeriod = '';
      applyFilters();
      renderPage(container);
    });
    container.querySelector('#stats-date-reset')?.addEventListener('click', () => {
      _dateFrom = '';
      _dateTo = '';
      _activePeriod = 'all';
      applyFilters();
      renderPage(container);
    });
    container.querySelectorAll('.top5-more').forEach(btn => {
      btn.addEventListener('click', () => showMorePopup(btn.dataset.type, visitCol, inboundCol));
    });
  }

  function fmtDateISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  return { render };
})();
