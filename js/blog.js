/**
 * Blog Page - POST_METRICS 테이블 뷰
 * 컬럼 순서: service, title, thumbnail, publishDate, category, totalVisit, inbound
 */

const BlogPage = (() => {
  let _data = [];
  let _filtered = [];
  let _sortCol = '';
  let _sortAsc = true;
  let _page = 1;
  const PAGE_SIZE = 20;
  let _searchTerm = '';
  let _serviceFilter = '';
  let _categoryFilter = '';

  /**
   * 페이지 렌더링
   */
  async function render(container) {
    container.innerHTML = '<div class="loading-spinner">POST_METRICS 데이터 로딩 중...</div>';

    try {
      const result = await SheetsProxy.getPostMetrics();
      _data = result.rows;
      _filtered = [..._data];
      _page = 1;
      _sortCol = '';
      _searchTerm = '';
      _serviceFilter = '';
      _categoryFilter = '';
      renderTable(container);
    } catch (err) {
      container.innerHTML = `<div class="empty-state">데이터를 불러올 수 없습니다.<br><span style="font-size:8px;color:#999;">${err.message}</span></div>`;
    }
  }

  function renderTable(container) {
    const services = [...new Set(_data.map(r => r.service).filter(Boolean))].sort();
    const categories = [...new Set(_data.map(r => r.category).filter(Boolean))].sort();

    const totalPages = Math.max(1, Math.ceil(_filtered.length / PAGE_SIZE));
    if (_page > totalPages) _page = totalPages;
    const start = (_page - 1) * PAGE_SIZE;
    const pageData = _filtered.slice(start, start + PAGE_SIZE);

    container.innerHTML = `
      <div class="data-table-wrapper">
        <div class="data-table-toolbar">
          <div class="toolbar-left">
            <select class="filter-select" id="blog-filter-service">
              <option value="">전체 서비스</option>
              ${services.map(s => `<option value="${s}" ${_serviceFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <select class="filter-select" id="blog-filter-category">
              <option value="">전체 카테고리</option>
              ${categories.map(c => `<option value="${c}" ${_categoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="toolbar-right">
            <input type="text" class="search-input" id="blog-search" placeholder="제목 검색..." value="${_searchTerm}">
            <span style="font-size:9px;color:#999;">총 ${_filtered.length}건</span>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table" id="blog-table">
            <thead>
              <tr>
                ${renderTh('service', '서비스')}
                ${renderTh('title', '제목')}
                <th style="width:50px;">썸네일</th>
                ${renderTh('publishDate', '발행일')}
                ${renderTh('category', '카테고리')}
                ${renderTh('totalVisit', '총 조회수')}
                ${renderTh('inbound', '유입')}
              </tr>
            </thead>
            <tbody>
              ${pageData.length === 0
                ? '<tr><td colspan="7" style="text-align:center;padding:20px;color:#999;">데이터가 없습니다.</td></tr>'
                : pageData.map(row => renderRow(row)).join('')}
            </tbody>
          </table>
        </div>
        <div class="data-table-pagination">
          <span>${start + 1}-${Math.min(start + PAGE_SIZE, _filtered.length)} / ${_filtered.length}건</span>
          <div class="pagination-controls">
            <button id="blog-prev" ${_page <= 1 ? 'disabled' : ''}>&laquo; 이전</button>
            <span class="page-current">${_page} / ${totalPages}</span>
            <button id="blog-next" ${_page >= totalPages ? 'disabled' : ''}>다음 &raquo;</button>
          </div>
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function renderTh(key, label) {
    const isSorted = _sortCol === key;
    const arrow = isSorted ? (_sortAsc ? '&#9650;' : '&#9660;') : '&#8597;';
    return `<th class="${isSorted ? 'sorted' : ''}" data-sort="${key}">${label} <span class="sort-icon">${arrow}</span></th>`;
  }

  function renderRow(row) {
    const serviceBadge = getServiceBadge(row.service);
    const thumbnail = row.thumbnail
      ? `<img src="${row.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : '<span style="color:#ccc;font-size:8px;">-</span>';
    const totalVisit = row.totalVisit != null ? Number(row.totalVisit).toLocaleString() : '-';
    const inbound = row.inbound != null ? Number(row.inbound).toLocaleString() : '-';
    const publishDate = formatDate(row.publishDate);

    return `
      <tr>
        <td><span class="badge ${serviceBadge.cls}">${row.service || '-'}</span></td>
        <td class="title-cell" title="${escapeHtml(row.title || '')}">${escapeHtml(row.title || '-')}</td>
        <td class="thumbnail-cell">${thumbnail}</td>
        <td>${publishDate}</td>
        <td><span class="badge badge-default">${row.category || '-'}</span></td>
        <td class="number-cell">${totalVisit}</td>
        <td class="number-cell">${inbound}</td>
      </tr>
    `;
  }

  function getServiceBadge(service) {
    if (!service) return { cls: 'badge-default' };
    const s = service.toLowerCase();
    if (s.includes('blog') || s.includes('블로그')) return { cls: 'badge-blog' };
    if (s.includes('news') || s.includes('뉴스')) return { cls: 'badge-news' };
    if (s.includes('social') || s.includes('sns')) return { cls: 'badge-social' };
    if (s.includes('video') || s.includes('youtube')) return { cls: 'badge-video' };
    return { cls: 'badge-default' };
  }

  function formatDate(val) {
    if (!val) return '-';
    if (typeof val === 'string') {
      return val.length > 10 ? val.substring(0, 10) : val;
    }
    if (val instanceof Date) {
      return val.toISOString().substring(0, 10);
    }
    // Google Sheets date serial number
    if (typeof val === 'number' && val > 10000) {
      const d = new Date((val - 25569) * 86400 * 1000);
      return d.toISOString().substring(0, 10);
    }
    return String(val);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function applyFilters() {
    _filtered = _data.filter(row => {
      if (_serviceFilter && row.service !== _serviceFilter) return false;
      if (_categoryFilter && row.category !== _categoryFilter) return false;
      if (_searchTerm) {
        const term = _searchTerm.toLowerCase();
        const title = (row.title || '').toLowerCase();
        if (!title.includes(term)) return false;
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
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        return _sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }

    _page = 1;
  }

  function bindEvents(container) {
    // Search
    const searchEl = container.querySelector('#blog-search');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        _searchTerm = e.target.value;
        applyFilters();
        renderTable(container);
      });
    }

    // Service filter
    const serviceEl = container.querySelector('#blog-filter-service');
    if (serviceEl) {
      serviceEl.addEventListener('change', (e) => {
        _serviceFilter = e.target.value;
        applyFilters();
        renderTable(container);
      });
    }

    // Category filter
    const catEl = container.querySelector('#blog-filter-category');
    if (catEl) {
      catEl.addEventListener('change', (e) => {
        _categoryFilter = e.target.value;
        applyFilters();
        renderTable(container);
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
        renderTable(container);
      });
    });

    // Pagination
    const prevBtn = container.querySelector('#blog-prev');
    const nextBtn = container.querySelector('#blog-next');
    if (prevBtn) prevBtn.addEventListener('click', () => { _page--; renderTable(container); });
    if (nextBtn) nextBtn.addEventListener('click', () => { _page++; renderTable(container); });
  }

  return { render };
})();
