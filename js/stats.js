/**
 * Stats Daily Page - STATS_DAILY 시트 뷰
 * 일자별 확인 가능한 카테고리를 해당 페이지 내 신규 생성 가능
 */

const StatsPage = (() => {
  let _data = [];
  let _headers = [];
  let _filtered = [];
  let _categories = []; // 사용자가 관리하는 카테고리 탭
  let _activeCategory = '전체';
  let _dateFrom = '';
  let _dateTo = '';
  let _sortCol = '';
  let _sortAsc = true;
  let _page = 1;
  const PAGE_SIZE = 30;

  // localStorage에서 사용자 카테고리 복원
  function loadUserCategories() {
    try {
      const saved = localStorage.getItem('stats_user_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  function saveUserCategories() {
    localStorage.setItem('stats_user_categories', JSON.stringify(_categories));
  }

  /**
   * 페이지 렌더링
   */
  async function render(container) {
    container.innerHTML = '<div class="loading-spinner">STATS_DAILY 데이터 로딩 중...</div>';

    try {
      const result = await SheetsProxy.getStatsDaily();
      _data = result.rows;
      _headers = result.headers;
      _filtered = [..._data];
      _page = 1;
      _sortCol = '';
      _dateFrom = '';
      _dateTo = '';
      _activeCategory = '전체';

      // 시트 데이터에서 고유 카테고리 추출
      const sheetCategories = extractCategories(_data, _headers);
      const userCategories = loadUserCategories();

      // 합치되 중복 제거
      const allCats = new Set([...sheetCategories, ...userCategories]);
      _categories = [...allCats];
      saveUserCategories();

      renderPage(container);
    } catch (err) {
      container.innerHTML = `<div class="empty-state">데이터를 불러올 수 없습니다.<br><span style="font-size:8px;color:#999;">${err.message}</span></div>`;
    }
  }

  function extractCategories(data, headers) {
    // 'category' 컬럼이 있으면 거기서 추출, 없으면 다른 컬럼명에서 유추
    const catIdx = headers.findIndex(h =>
      h.toLowerCase().includes('category') ||
      h.toLowerCase().includes('카테고리') ||
      h.toLowerCase().includes('service') ||
      h.toLowerCase().includes('서비스')
    );

    if (catIdx >= 0) {
      const catKey = headers[catIdx];
      return [...new Set(data.map(r => r[catKey]).filter(Boolean))].sort();
    }
    return [];
  }

  function renderPage(container) {
    const totalPages = Math.max(1, Math.ceil(_filtered.length / PAGE_SIZE));
    if (_page > totalPages) _page = totalPages;
    const start = (_page - 1) * PAGE_SIZE;
    const pageData = _filtered.slice(start, start + PAGE_SIZE);

    // 표시할 컬럼 결정 (모든 헤더)
    const displayHeaders = _headers.filter(h => h && h.trim() !== '');

    container.innerHTML = `
      <!-- Category Tabs -->
      <div class="category-tabs" id="stats-category-tabs">
        <button class="category-tab ${_activeCategory === '전체' ? 'active' : ''}" data-cat="전체">전체</button>
        ${_categories.map(c =>
          `<button class="category-tab ${_activeCategory === c ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
        ).join('')}
        <button class="category-tab-add" id="stats-add-category" title="카테고리 추가">+ 추가</button>
      </div>

      <!-- Date Filter -->
      <div class="date-filter-bar">
        <label>기간:</label>
        <input type="date" id="stats-date-from" value="${_dateFrom}">
        <span style="font-size:9px;">~</span>
        <input type="date" id="stats-date-to" value="${_dateTo}">
        <button class="btn btn-sm" id="stats-date-apply">적용</button>
        <button class="btn btn-sm" id="stats-date-reset">초기화</button>
        <span style="font-size:9px;color:#999;margin-left:auto;">총 ${_filtered.length}건</span>
      </div>

      <!-- Summary Cards -->
      <div class="stats-grid" id="stats-summary-grid">
        ${renderSummaryCards(pageData, displayHeaders)}
      </div>

      <!-- Data Table -->
      <div class="data-table-wrapper">
        <div style="overflow-x:auto;max-height:400px;overflow-y:auto;">
          <table class="data-table" id="stats-table">
            <thead>
              <tr>
                ${displayHeaders.map(h => renderTh(h)).join('')}
              </tr>
            </thead>
            <tbody>
              ${pageData.length === 0
                ? `<tr><td colspan="${displayHeaders.length}" style="text-align:center;padding:20px;color:#999;">데이터가 없습니다.</td></tr>`
                : pageData.map(row => renderRow(row, displayHeaders)).join('')}
            </tbody>
          </table>
        </div>
        <div class="data-table-pagination">
          <span>${_filtered.length > 0 ? `${start + 1}-${Math.min(start + PAGE_SIZE, _filtered.length)}` : '0'} / ${_filtered.length}건</span>
          <div class="pagination-controls">
            <button id="stats-prev" ${_page <= 1 ? 'disabled' : ''}>&laquo; 이전</button>
            <span class="page-current">${_page} / ${totalPages}</span>
            <button id="stats-next" ${_page >= totalPages ? 'disabled' : ''}>다음 &raquo;</button>
          </div>
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function renderSummaryCards(data, headers) {
    // 숫자형 컬럼 찾아서 합계 카드 생성
    const numericCols = headers.filter(h => {
      const lh = h.toLowerCase();
      return lh.includes('visit') || lh.includes('view') || lh.includes('click') ||
             lh.includes('조회') || lh.includes('방문') || lh.includes('inbound') ||
             lh.includes('count') || lh.includes('total');
    });

    if (numericCols.length === 0) return '';

    return numericCols.slice(0, 6).map(col => {
      const sum = data.reduce((acc, row) => {
        const v = Number(row[col]);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      return `
        <div class="stat-card">
          <div class="stat-card-label">${escapeHtml(col)}</div>
          <div class="stat-card-value">${sum.toLocaleString()}</div>
        </div>
      `;
    }).join('');
  }

  function renderTh(key) {
    const isSorted = _sortCol === key;
    const arrow = isSorted ? (_sortAsc ? '&#9650;' : '&#9660;') : '&#8597;';
    return `<th class="${isSorted ? 'sorted' : ''}" data-sort="${escapeHtml(key)}">${escapeHtml(key)} <span class="sort-icon">${arrow}</span></th>`;
  }

  function renderRow(row, headers) {
    return `<tr>${headers.map(h => {
      const val = row[h];
      const isNum = typeof val === 'number' || (!isNaN(Number(val)) && val !== '' && val !== null);
      const display = val != null ? (isNum ? Number(val).toLocaleString() : escapeHtml(String(val))) : '-';
      return `<td class="${isNum ? 'number-cell' : ''}">${display}</td>`;
    }).join('')}</tr>`;
  }

  function applyFilters() {
    _filtered = _data.filter(row => {
      // Category filter
      if (_activeCategory !== '전체') {
        const catMatch = Object.values(row).some(v =>
          String(v).toLowerCase() === _activeCategory.toLowerCase()
        );
        if (!catMatch) return false;
      }

      // Date filter
      if (_dateFrom || _dateTo) {
        const dateVal = findDateValue(row);
        if (dateVal) {
          if (_dateFrom && dateVal < _dateFrom) return false;
          if (_dateTo && dateVal > _dateTo) return false;
        }
      }

      return true;
    });

    if (_sortCol) {
      _filtered.sort((a, b) => {
        let va = a[_sortCol] ?? '';
        let vb = b[_sortCol] ?? '';
        if (typeof va === 'number' && typeof vb === 'number') {
          return _sortAsc ? va - vb : vb - va;
        }
        const na = Number(va), nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
          return _sortAsc ? na - nb : nb - na;
        }
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        return _sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }

    _page = 1;
  }

  function findDateValue(row) {
    for (const key of Object.keys(row)) {
      const lk = key.toLowerCase();
      if (lk.includes('date') || lk.includes('날짜') || lk.includes('일자')) {
        const val = row[key];
        if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
          return val.substring(0, 10);
        }
        if (typeof val === 'string') {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            return d.toISOString().substring(0, 10);
          }
        }
      }
    }
    return null;
  }

  function showAddCategoryModal() {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    title.textContent = '카테고리 추가';
    body.innerHTML = `
      <div class="form-group">
        <label>카테고리 이름</label>
        <input type="text" id="new-category-name" placeholder="새 카테고리 이름 입력">
      </div>
    `;
    footer.innerHTML = `
      <button class="btn" id="modal-cancel">취소</button>
      <button class="btn btn-primary" id="modal-confirm">추가</button>
    `;

    overlay.classList.add('show');

    document.getElementById('modal-cancel').addEventListener('click', () => overlay.classList.remove('show'));
    document.getElementById('modal-close').addEventListener('click', () => overlay.classList.remove('show'));
    document.getElementById('modal-confirm').addEventListener('click', () => {
      const name = document.getElementById('new-category-name').value.trim();
      if (name && !_categories.includes(name)) {
        _categories.push(name);
        saveUserCategories();
        const container = document.getElementById('content-body');
        renderPage(container);
      }
      overlay.classList.remove('show');
    });
  }

  function bindEvents(container) {
    // Category tabs
    container.querySelectorAll('.category-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeCategory = btn.dataset.cat;
        applyFilters();
        renderPage(container);
      });
    });

    // Add category
    const addBtn = container.querySelector('#stats-add-category');
    if (addBtn) addBtn.addEventListener('click', showAddCategoryModal);

    // Date filter
    const applyBtn = container.querySelector('#stats-date-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        _dateFrom = container.querySelector('#stats-date-from').value;
        _dateTo = container.querySelector('#stats-date-to').value;
        applyFilters();
        renderPage(container);
      });
    }

    const resetBtn = container.querySelector('#stats-date-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        _dateFrom = '';
        _dateTo = '';
        applyFilters();
        renderPage(container);
      });
    }

    // Sort
    container.querySelectorAll('[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (_sortCol === col) {
          _sortAsc = !_sortAsc;
        } else {
          _sortCol = col;
          _sortAsc = true;
        }
        applyFilters();
        renderPage(container);
      });
    });

    // Pagination
    const prevBtn = container.querySelector('#stats-prev');
    const nextBtn = container.querySelector('#stats-next');
    if (prevBtn) prevBtn.addEventListener('click', () => { _page--; renderPage(container); });
    if (nextBtn) nextBtn.addEventListener('click', () => { _page++; renderPage(container); });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { render };
})();
