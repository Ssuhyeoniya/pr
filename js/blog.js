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

  // 고정 컬럼 너비
  const COL_WIDTHS = {
    service: '60px',
    title: '220px',
    thumbnail: '50px',
    publishDate: '70px',
    category: '70px',
    totalVisit: '65px',
    inbound: '55px'
  };

  async function render(container) {
    container.innerHTML = '<div class="loading-spinner">POST_METRICS 데이터 로딩 중...</div>';
    try {
      const result = await SheetsProxy.getPostMetrics();
      // 공백 로우 제거: title, service 둘 다 없으면 제외
      _data = result.rows.filter(row =>
        (row.title && String(row.title).trim()) || (row.service && String(row.service).trim())
      );
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
            <span style="font-size:8px;color:#999;">총 ${_filtered.length}건</span>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table data-table-fixed" id="blog-table">
            <thead>
              <tr>
                ${thFixed('service', '서비스')}
                ${thFixed('title', '제목')}
                <th style="width:${COL_WIDTHS.thumbnail};">썸네일</th>
                ${thFixed('publishDate', '발행일')}
                ${thFixed('category', '카테고리')}
                ${thFixed('totalVisit', '총 조회수')}
                ${thFixed('inbound', '유입')}
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
          <span>${_filtered.length > 0 ? `${start + 1}-${Math.min(start + PAGE_SIZE, _filtered.length)}` : '0'} / ${_filtered.length}건</span>
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

  function thFixed(key, label) {
    const isSorted = _sortCol === key;
    const arrow = isSorted ? (_sortAsc ? '&#9650;' : '&#9660;') : '&#8597;';
    return `<th style="width:${COL_WIDTHS[key]};" class="${isSorted ? 'sorted' : ''}" data-sort="${key}">${label} <span class="sort-icon">${arrow}</span></th>`;
  }

  function renderRow(row) {
    const badge = getServiceBadge(row.service);
    const thumbUrl = row.thumbnail ? String(row.thumbnail).trim() : '';
    const thumbnail = thumbUrl
      ? `<img src="${thumbUrl}" alt="" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null;this.src='';this.alt='-';this.style.display='none';this.parentNode.textContent='-';">`
      : '<span style="color:#ccc;font-size:8px;">-</span>';
    const totalVisit = row.totalVisit != null && row.totalVisit !== '' ? Number(row.totalVisit).toLocaleString() : '-';
    const inbound = row.inbound != null && row.inbound !== '' ? Number(row.inbound).toLocaleString() : '-';

    return `
      <tr>
        <td style="width:${COL_WIDTHS.service};"><span class="badge ${badge.cls}">${row.service || '-'}</span></td>
        <td style="width:${COL_WIDTHS.title};" class="title-cell" title="${esc(row.title || '')}">${esc(row.title || '-')}</td>
        <td style="width:${COL_WIDTHS.thumbnail};" class="thumbnail-cell">${thumbnail}</td>
        <td style="width:${COL_WIDTHS.publishDate};">${fmtDate(row.publishDate)}</td>
        <td style="width:${COL_WIDTHS.category};"><span class="badge badge-default">${row.category || '-'}</span></td>
        <td style="width:${COL_WIDTHS.totalVisit};" class="number-cell">${totalVisit}</td>
        <td style="width:${COL_WIDTHS.inbound};" class="number-cell">${inbound}</td>
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

  function fmtDate(val) {
    if (!val) return '-';
    if (typeof val === 'string') {
      if (val.includes('T')) return val.substring(0, 10);
      return val.length > 10 ? val.substring(0, 10) : val;
    }
    if (val instanceof Date) return val.toISOString().substring(0, 10);
    if (typeof val === 'number' && val > 10000) {
      return new Date((val - 25569) * 86400 * 1000).toISOString().substring(0, 10);
    }
    return String(val);
  }

  function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  function applyFilters() {
    _filtered = _data.filter(row => {
      if (_serviceFilter && row.service !== _serviceFilter) return false;
      if (_categoryFilter && row.category !== _categoryFilter) return false;
      if (_searchTerm) {
        if (!(row.title || '').toLowerCase().includes(_searchTerm.toLowerCase())) return false;
      }
      return true;
    });

    if (_sortCol) {
      _filtered.sort((a, b) => {
        let va = a[_sortCol] ?? '';
        let vb = b[_sortCol] ?? '';
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

  function bindEvents(container) {
    container.querySelector('#blog-search')?.addEventListener('input', (e) => {
      _searchTerm = e.target.value;
      applyFilters();
      renderTable(container);
    });
    container.querySelector('#blog-filter-service')?.addEventListener('change', (e) => {
      _serviceFilter = e.target.value;
      applyFilters();
      renderTable(container);
    });
    container.querySelector('#blog-filter-category')?.addEventListener('change', (e) => {
      _categoryFilter = e.target.value;
      applyFilters();
      renderTable(container);
    });
    container.querySelectorAll('[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (_sortCol === col) { _sortAsc = !_sortAsc; } else { _sortCol = col; _sortAsc = true; }
        applyFilters();
        renderTable(container);
      });
    });
    container.querySelector('#blog-prev')?.addEventListener('click', () => { _page--; renderTable(container); });
    container.querySelector('#blog-next')?.addEventListener('click', () => { _page++; renderTable(container); });
  }

  return { render };
})();
