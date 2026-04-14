import { useState, useMemo } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Badge from '../components/common/Badge.jsx';
import SortableHeader from '../components/table/SortableHeader.jsx';
import Pagination from '../components/table/Pagination.jsx';
import useSheetData from '../hooks/useSheetData.js';
import { getPostMetrics } from '../services/sheetsProxy.js';
import { fmtNumber } from '../utils/format.js';
import { displayDate } from '../utils/date.js';
import { BLOG_PAGE_SIZE } from '../config.js';

// 고정 컬럼 너비 (축소)
const COL_WIDTHS = {
  service: '50px',
  title: '180px',
  thumbnail: '42px',
  publishDate: '62px',
  category: '60px',
  totalVisit: '56px',
  inbound: '48px',
};

const COLS = [
  { key: 'service', label: '서비스', sortable: true },
  { key: 'title', label: '제목', sortable: true },
  { key: 'thumbnail', label: '썸네일', sortable: false },
  { key: 'publishDate', label: '발행일', sortable: true },
  { key: 'category', label: '카테고리', sortable: true },
  { key: 'totalVisit', label: '총 조회수', sortable: true },
  { key: 'inbound', label: '유입', sortable: true },
];

export default function BlogPage() {
  const { data, loading, error } = useSheetData(() => getPostMetrics(), []);

  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortCol, setSortCol] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  // 공백 로우 제거
  const rows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter(row =>
      (row.title && String(row.title).trim()) ||
      (row.service && String(row.service).trim())
    );
  }, [data]);

  const services = useMemo(() =>
    [...new Set(rows.map(r => r.service).filter(Boolean))].sort(),
  [rows]);

  const categories = useMemo(() =>
    [...new Set(rows.map(r => r.category).filter(Boolean))].sort(),
  [rows]);

  const filtered = useMemo(() => {
    let result = rows.filter(row => {
      if (serviceFilter && row.service !== serviceFilter) return false;
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (searchTerm) {
        if (!String(row.title || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });

    if (sortCol) {
      result = [...result].sort((a, b) => {
        let va = a[sortCol] ?? '';
        let vb = b[sortCol] ?? '';
        const na = Number(va), nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
          return sortAsc ? na - nb : nb - na;
        }
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return result;
  }, [rows, searchTerm, serviceFilter, categoryFilter, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / BLOG_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * BLOG_PAGE_SIZE;
  const pageData = filtered.slice(start, start + BLOG_PAGE_SIZE);
  const emptyCount = BLOG_PAGE_SIZE - pageData.length;

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
    // 정렬 시에는 페이지를 유지 (필터/검색만 1페이지로 리셋)
  };

  if (loading) return <LoadingSpinner message="POST_METRICS 데이터 로딩 중..." />;
  if (error) return <EmptyState message="데이터를 불러올 수 없습니다." detail={error.message} />;

  return (
    <div className="data-table-wrapper">
      <div className="data-table-toolbar">
        <div className="toolbar-left">
          <select
            className="filter-select"
            value={serviceFilter}
            onChange={(e) => { setServiceFilter(e.target.value); setPage(1); }}
          >
            <option value="">전체 서비스</option>
            {services.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="">전체 카테고리</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="toolbar-right">
          <input
            type="text"
            className="search-input"
            placeholder="제목 검색..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
          <span style={{ fontSize: 8, color: '#999' }}>총 {filtered.length}건</span>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table data-table-fixed">
          <thead>
            <tr>
              {COLS.map(c => c.sortable ? (
                <SortableHeader
                  key={c.key}
                  col={c.key}
                  label={c.label}
                  width={COL_WIDTHS[c.key]}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                />
              ) : (
                <th key={c.key} style={{ width: COL_WIDTHS[c.key] }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#999' }}>데이터가 없습니다.</td></tr>
            ) : (
              <>
                {pageData.map((row, i) => <BlogRow key={start + i} row={row} />)}
                {Array.from({ length: emptyCount }).map((_, i) => (
                  <tr key={`e-${i}`} className="empty-row">
                    {COLS.map(c => (
                      <td key={c.key} style={{ width: COL_WIDTHS[c.key] }}>&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={safePage}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={BLOG_PAGE_SIZE}
        onChange={setPage}
      />
    </div>
  );
}

function BlogRow({ row }) {
  const thumbUrl = row.thumbnail ? String(row.thumbnail).trim() : '';
  return (
    <tr>
      <td style={{ width: COL_WIDTHS.service }}>
        <Badge service={row.service}>{row.service || '-'}</Badge>
      </td>
      <td style={{ width: COL_WIDTHS.title }} className="title-cell" title={row.title || ''}>
        {row.title || '-'}
      </td>
      <td style={{ width: COL_WIDTHS.thumbnail }} className="thumbnail-cell">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.parentNode) e.currentTarget.parentNode.textContent = '-';
            }}
          />
        ) : (
          <span style={{ color: '#ccc', fontSize: 8 }}>-</span>
        )}
      </td>
      <td style={{ width: COL_WIDTHS.publishDate }}>{displayDate(row.publishDate)}</td>
      <td style={{ width: COL_WIDTHS.category }}>
        <Badge cls="badge-default">{row.category || '-'}</Badge>
      </td>
      <td style={{ width: COL_WIDTHS.totalVisit }} className="number-cell">{fmtNumber(row.totalVisit)}</td>
      <td style={{ width: COL_WIDTHS.inbound }} className="number-cell">{fmtNumber(row.inbound)}</td>
    </tr>
  );
}
