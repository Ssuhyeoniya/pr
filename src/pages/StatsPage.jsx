import { useState, useMemo, useEffect } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import BarChart from '../components/chart/BarChart.jsx';
import Top5Block from '../components/chart/Top5Block.jsx';
import useLocalStorage from '../hooks/useLocalStorage.js';
import { useModal } from '../contexts/ModalContext.jsx';
import { getPostMetrics, getStatsDaily } from '../services/sheetsProxy.js';
import { fmtNumber } from '../utils/format.js';
import { normalizeDate, fmtISO } from '../utils/date.js';
import { STATS_EXCLUDE_COLS } from '../config.js';

/**
 * 블로그 통계 페이지
 * - 카테고리 탭 + 기간 필터 (7일/30일/90일/전체 + 날짜 직접)
 * - 일자별 막대 차트 + 조회수/인바운드 TOP5
 * - 더보기 팝업 = 제목 / 발행일 / visitors 만 표시
 */
export default function StatsPage() {
  const [statsData, setStatsData] = useState({ headers: [], rows: [], categories: [] });
  const [titleMap, setTitleMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCategories, setUserCategories] = useLocalStorage('stats_user_categories', []);

  const [activeCategory, setActiveCategory] = useState('전체');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activePeriod, setActivePeriod] = useState('all');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');

  const { openModal, closeModal } = useModal();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getStatsDaily(),
      getPostMetrics({ columns: 'postId,title' }),
    ])
      .then(([stats, post]) => {
        if (cancelled) return;
        const map = {};
        if (post?.rows) {
          post.rows.forEach(r => {
            const id = String(r.postId || '').trim();
            if (id) map[id] = r.title || '';
          });
        }
        const filteredHeaders = (stats.headers || []).filter(h =>
          !STATS_EXCLUDE_COLS.includes(String(h).toLowerCase().trim())
        );
        setTitleMap(map);
        setStatsData({
          headers: filteredHeaders,
          rows: stats.rows || [],
          categories: stats.categories || [],
        });
      })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const { headers, rows } = statsData;

  // 컬럼 탐지 유틸
  const getCol = (keyword) => headers.find(h => String(h).toLowerCase().includes(keyword)) || null;

  const dateCol = useMemo(() => {
    const byName = getCol('date') || getCol('날짜') || getCol('일자') || getCol('day');
    if (byName) return byName;
    const sample = rows[0];
    if (!sample) return null;
    for (const h of headers) {
      const v = String(sample[h] || '');
      if (v.match(/^\d{4}-\d{2}-\d{2}/)) return h;
    }
    return headers[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, rows]);

  const detectNumericCol = (idx) => {
    if (rows.length === 0) return null;
    const sample = rows[0];
    const dc = getCol('date') || getCol('날짜') || getCol('일자') || getCol('day');
    const pidc = getCol('post_id') || getCol('postid');
    const numCols = headers.filter(h => {
      if (h === dc || h === pidc) return false;
      const v = sample[h];
      return v !== '' && v != null && !isNaN(Number(v));
    });
    return numCols[idx] || null;
  };

  const visitCol = useMemo(() => {
    return getCol('totalvisit') || getCol('total_visit') || getCol('visit') || getCol('조회') || getCol('view') || detectNumericCol(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, rows]);

  const inboundCol = useMemo(() => {
    return getCol('inbound') || getCol('유입') || detectNumericCol(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, rows]);

  const postIdCol = useMemo(() => {
    const byHeader = getCol('post_id') || getCol('postid');
    if (byHeader) return byHeader;
    if (rows.length > 0) {
      const keys = Object.keys(rows[0]);
      return keys.find(k => k.toLowerCase().includes('post_id') || k.toLowerCase() === 'postid') || null;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, rows]);

  const resolveTitle = (row) => {
    if (!postIdCol) return null;
    const pid = String(row[postIdCol] || '').trim();
    return titleMap[pid] || null;
  };

  // 카테고리 목록 (시트 + 사용자)
  const sheetCategories = useMemo(() => {
    const catKey = headers.find(h => {
      const l = String(h).toLowerCase();
      return l.includes('category') || l.includes('카테고리') || l.includes('service') || l.includes('서비스');
    });
    if (!catKey) return [];
    return [...new Set(rows.map(r => r[catKey]).filter(Boolean))].sort();
  }, [headers, rows]);

  const categories = useMemo(
    () => [...new Set([...sheetCategories, ...userCategories])],
    [sheetCategories, userCategories]
  );

  // 필터링
  const filtered = useMemo(() => {
    return rows.filter(row => {
      if (activeCategory !== '전체') {
        const match = Object.values(row).some(v =>
          String(v).toLowerCase() === activeCategory.toLowerCase()
        );
        if (!match) return false;
      }
      if (dateCol && (dateFrom || dateTo)) {
        const dv = normalizeDate(row[dateCol]);
        if (dv) {
          if (dateFrom && dv < dateFrom) return false;
          if (dateTo && dv > dateTo) return false;
        }
      }
      return true;
    });
  }, [rows, activeCategory, dateFrom, dateTo, dateCol]);

  // 일자별 집계
  const { dailyKeys, dailyMap } = useMemo(() => {
    const map = {};
    filtered.forEach(row => {
      const d = dateCol ? normalizeDate(row[dateCol]) : null;
      if (!d) return;
      if (!map[d]) map[d] = { visit: 0, inbound: 0 };
      map[d].visit += Number(row[visitCol] || 0);
      map[d].inbound += Number(row[inboundCol] || 0);
    });
    return { dailyKeys: Object.keys(map).sort(), dailyMap: map };
  }, [filtered, dateCol, visitCol, inboundCol]);

  // TOP5
  const visitTop5 = useMemo(() => {
    return [...filtered]
      .sort((a, b) => Number(b[visitCol] || 0) - Number(a[visitCol] || 0))
      .slice(0, 5)
      .map(r => ({ name: resolveTitle(r) || '-', value: r[visitCol] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, visitCol, titleMap, postIdCol]);

  const inboundTop5 = useMemo(() => {
    return [...filtered]
      .sort((a, b) => Number(b[inboundCol] || 0) - Number(a[inboundCol] || 0))
      .slice(0, 5)
      .map(r => ({ name: resolveTitle(r) || '-', value: r[inboundCol] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, inboundCol, titleMap, postIdCol]);

  const handlePeriod = (period) => {
    setActivePeriod(period);
    if (period === 'all') {
      setDateFrom(''); setDateTo('');
      setFromInput(''); setToInput('');
    } else {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - days);
      const f = fmtISO(from), t = fmtISO(today);
      setDateFrom(f); setDateTo(t);
      setFromInput(f); setToInput(t);
    }
  };

  const handleApplyDate = () => {
    setDateFrom(fromInput);
    setDateTo(toInput);
    setActivePeriod('');
  };

  const handleResetDate = () => {
    setDateFrom(''); setDateTo('');
    setFromInput(''); setToInput('');
    setActivePeriod('all');
  };

  const handleAddCategory = () => {
    let inputValue = '';
    openModal({
      title: '카테고리 추가',
      body: (
        <div className="form-group">
          <label>카테고리 이름</label>
          <input
            type="text"
            placeholder="새 카테고리 이름 입력"
            onChange={(e) => { inputValue = e.target.value; }}
            autoFocus
          />
        </div>
      ),
      footer: (
        <>
          <button className="btn" onClick={closeModal}>취소</button>
          <button className="btn btn-primary" onClick={() => {
            const name = inputValue.trim();
            if (name && !categories.includes(name)) {
              setUserCategories([...userCategories, name]);
            }
            closeModal();
          }}>추가</button>
        </>
      ),
    });
  };

  const handleMorePopup = (type) => {
    const sortCol = type === 'visit' ? visitCol : inboundCol;
    const label = type === 'visit' ? '조회수' : '인바운드';
    const sorted = [...filtered].sort((a, b) => Number(b[sortCol] || 0) - Number(a[sortCol] || 0));

    openModal({
      title: `${label} 전체 목록 (${sorted.length}건)`,
      wide: true,
      body: (
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>발행일</th>
                <th>visitors</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={i}>
                  <td>{resolveTitle(row) || '-'}</td>
                  <td>{dateCol ? (normalizeDate(row[dateCol]) || '-') : '-'}</td>
                  <td className="number-cell">{fmtNumber(row[visitCol])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
      footer: <button className="btn" onClick={closeModal}>닫기</button>,
    });
  };

  if (loading) return <LoadingSpinner message="통계 데이터 로딩 중..." />;
  if (error) return <EmptyState message="데이터를 불러올 수 없습니다." detail={error.message} />;

  return (
    <>
      <div className="category-tabs">
        <button
          className={`category-tab ${activeCategory === '전체' ? 'active' : ''}`}
          onClick={() => setActiveCategory('전체')}
        >전체</button>
        {categories.map(c => (
          <button
            key={c}
            className={`category-tab ${activeCategory === c ? 'active' : ''}`}
            onClick={() => setActiveCategory(c)}
          >{c}</button>
        ))}
        <button className="category-tab-add" onClick={handleAddCategory}>+ 추가</button>
      </div>

      <div className="date-filter-bar">
        <label>기간:</label>
        {['7d', '30d', '90d', 'all'].map(p => (
          <button
            key={p}
            className={`btn btn-sm period-btn ${activePeriod === p ? 'active' : ''}`}
            onClick={() => handlePeriod(p)}
          >{p === 'all' ? '전체' : p.replace('d', '일')}</button>
        ))}
        <span style={{ margin: '0 4px', color: '#ccc' }}>|</span>
        <input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} />
        <span style={{ fontSize: 8 }}>~</span>
        <input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} />
        <button className="btn btn-sm" onClick={handleApplyDate}>적용</button>
        <button className="btn btn-sm" onClick={handleResetDate}>초기화</button>
        <span style={{ fontSize: 8, color: '#999', marginLeft: 'auto' }}>총 {filtered.length}건</span>
      </div>

      <div className="chart-wrapper">
        <div className="chart-title">일자별 현황</div>
        <BarChart keys={dailyKeys} data={dailyMap} />
        <div className="chart-legend">
          <span className="legend-item"><span className="legend-dot" style={{ background: '#4285f4' }}></span>조회수</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: '#34a853' }}></span>인바운드</span>
        </div>
      </div>

      <div className="top5-grid">
        <Top5Block title="조회수 TOP 5" items={visitTop5} onMore={() => handleMorePopup('visit')} />
        <Top5Block title="인바운드 TOP 5" items={inboundTop5} onMore={() => handleMorePopup('inbound')} />
      </div>
    </>
  );
}
