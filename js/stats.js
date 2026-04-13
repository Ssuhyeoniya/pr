/**
 * Stats Daily Page - STATS_DAILY
 * 막대그래프 + 인바운드 TOP5 + 조회수 TOP5 + 더보기 팝업
 */

const StatsPage = (() => {
  let _data = [];
  let _headers = [];
  let _filtered = [];
  let _categories = [];
  let _activeCategory = '전체';
  let _dateFrom = '';
  let _dateTo = '';

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
    container.innerHTML = '<div class="loading-spinner">STATS_DAILY 데이터 로딩 중...</div>';
    try {
      const result = await SheetsProxy.getStatsDaily();
      _data = result.rows;
      _headers = result.headers;
      _filtered = [..._data];
      _dateFrom = '';
      _dateTo = '';
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

  function findCol(keyword) {
    return _headers.find(h => h.toLowerCase().includes(keyword)) || null;
  }

  function getDateCol() {
    return _headers.find(h => {
      const l = h.toLowerCase();
      return l.includes('date') || l.includes('날짜') || l.includes('일자');
    }) || null;
  }

  function getVisitCol() {
    return _headers.find(h => {
      const l = h.toLowerCase();
      return l.includes('totalvisit') || l.includes('visit') || l.includes('조회') || l.includes('view');
    }) || null;
  }

  function getInboundCol() {
    return _headers.find(h => {
      const l = h.toLowerCase();
      return l.includes('inbound') || l.includes('유입');
    }) || null;
  }

  function getTitleCol() {
    return _headers.find(h => {
      const l = h.toLowerCase();
      return l.includes('title') || l.includes('제목');
    }) || null;
  }

  function getServiceCol() {
    return _headers.find(h => {
      const l = h.toLowerCase();
      return l.includes('service') || l.includes('서비스');
    }) || null;
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
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return val.substring(0, 10);
    if (typeof val === 'string') { const d = new Date(val); if (!isNaN(d)) return d.toISOString().substring(0, 10); }
    return null;
  }

  function renderPage(container) {
    const dateCol = getDateCol();
    const visitCol = getVisitCol();
    const inboundCol = getInboundCol();
    const titleCol = getTitleCol();
    const serviceCol = getServiceCol();

    // 일자별 집계 (막대그래프용)
    const dailyMap = {};
    _filtered.forEach(row => {
      const d = dateCol ? fmtDate(row[dateCol]) : null;
      if (!d) return;
      if (!dailyMap[d]) dailyMap[d] = { visit: 0, inbound: 0 };
      dailyMap[d].visit += Number(row[visitCol] || 0);
      dailyMap[d].inbound += Number(row[inboundCol] || 0);
    });
    const dailyKeys = Object.keys(dailyMap).sort();

    // TOP5 계산
    const visitTop5 = [..._filtered]
      .sort((a, b) => Number(b[visitCol] || 0) - Number(a[visitCol] || 0))
      .slice(0, 5);
    const inboundTop5 = [..._filtered]
      .sort((a, b) => Number(b[inboundCol] || 0) - Number(a[inboundCol] || 0))
      .slice(0, 5);

    container.innerHTML = `
      <!-- Category Tabs -->
      <div class="category-tabs" id="stats-category-tabs">
        <button class="category-tab ${_activeCategory === '전체' ? 'active' : ''}" data-cat="전체">전체</button>
        ${_categories.map(c =>
          `<button class="category-tab ${_activeCategory === c ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`
        ).join('')}
        <button class="category-tab-add" id="stats-add-category">+ 추가</button>
      </div>

      <!-- Date Filter -->
      <div class="date-filter-bar">
        <label>기간:</label>
        <input type="date" id="stats-date-from" value="${_dateFrom}">
        <span style="font-size:8px;">~</span>
        <input type="date" id="stats-date-to" value="${_dateTo}">
        <button class="btn btn-sm" id="stats-date-apply">적용</button>
        <button class="btn btn-sm" id="stats-date-reset">초기화</button>
        <span style="font-size:8px;color:#999;margin-left:auto;">총 ${_filtered.length}건</span>
      </div>

      <!-- Bar Chart -->
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

      <!-- TOP5 Blocks -->
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
                <span class="top5-name">${esc(r[titleCol] || r[serviceCol] || '-')}</span>
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
                <span class="top5-name">${esc(r[titleCol] || r[serviceCol] || '-')}</span>
                <span class="top5-val">${Number(r[inboundCol] || 0).toLocaleString()}</span>
              </div>
            `).join('')}
            ${inboundTop5.length === 0 ? '<div class="empty-state" style="padding:10px;">데이터 없음</div>' : ''}
          </div>
        </div>
      </div>
    `;

    bindEvents(container, visitCol, inboundCol, titleCol, serviceCol);
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
            const label = k.substring(5); // MM-DD
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

  function showMorePopup(type, visitCol, inboundCol, titleCol, serviceCol) {
    const sortCol = type === 'visit' ? visitCol : inboundCol;
    const label = type === 'visit' ? '조회수' : '인바운드';
    const sorted = [..._filtered].sort((a, b) => Number(b[sortCol] || 0) - Number(a[sortCol] || 0));

    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = `${label} 전체 목록 (${sorted.length}건)`;

    const displayHeaders = _headers.filter(h => h && h.trim());

    document.getElementById('modal-body').innerHTML = `
      <div style="max-height:360px;overflow:auto;">
        <table class="data-table">
          <thead><tr>${displayHeaders.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${sorted.map(row => `<tr>${displayHeaders.map(h => {
              const v = row[h];
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

  function bindEvents(container, visitCol, inboundCol, titleCol, serviceCol) {
    container.querySelectorAll('.category-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeCategory = btn.dataset.cat;
        applyFilters();
        renderPage(container);
      });
    });

    container.querySelector('#stats-add-category')?.addEventListener('click', showAddCategoryModal);

    container.querySelector('#stats-date-apply')?.addEventListener('click', () => {
      _dateFrom = container.querySelector('#stats-date-from').value;
      _dateTo = container.querySelector('#stats-date-to').value;
      applyFilters();
      renderPage(container);
    });

    container.querySelector('#stats-date-reset')?.addEventListener('click', () => {
      _dateFrom = '';
      _dateTo = '';
      applyFilters();
      renderPage(container);
    });

    container.querySelectorAll('.top5-more').forEach(btn => {
      btn.addEventListener('click', () => {
        showMorePopup(btn.dataset.type, visitCol, inboundCol, titleCol, serviceCol);
      });
    });
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  return { render };
})();
