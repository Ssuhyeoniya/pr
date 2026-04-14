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
  // postId → { title, publishDate } (POST_METRICS 기준)
  const [postMap, setPostMap] = useState({});
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
      getPostMetrics({ columns: 'postId,title,publishDate' }),
    ])
      .then(([stats, post]) => {
        if (cancelled) return;
        // postId → { title, publishDate }
        const map = {};
        if (post?.rows) {
          post.rows.forEach(r => {
            const id = String(r.postId || '').trim();
            if (id) {
              map[id] = {
                title: r.title || '',
                publishDate: normalizeDate(r.publishDate) || '',
              };
            }
          });
        }
        const filteredHeaders = (stats.headers || []).filter(h =>
          !STATS_EXCLUDE_COLS.includes(String(h).toLowerCase().trim())
        );
        setPostMap(map);
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

  /**
   * postId 별로 집계 (조회수/인바운드 합산).
   * 기간 내 같은 postId 의 여러 일자 row 를 하나로 합치고
   * title/publishDate 는 POST_METRICS 에서 조회.
   * postId 가 없는 row 는 기존 row 단위로 유지 (fallback).
   */
  const aggregatedByPost = useMemo(() => {
    if (!postIdCol) {
      return filtered.map(r => ({
        postId: null,
        title: '-',
        publishDate: dateCol ? (normalizeDate(r[dateCol]) || '-') : '-',
        visit: Number(r[visitCol] || 0),
        inbound: Number(r[inboundCol] || 0),
      }));
    }
    const agg = new Map();
    filtered.forEach(row => {
      const pid = String(row[postIdCol] || '').trim();
      if (!pid) return;
      const info = postMap[pid] || {};
      if (!agg.has(pid)) {
        agg.set(pid, {
          postId: pid,
          title: info.title || '-',
          publishDate: info.publishDate || '-',
          visit: 0,
          inbound: 0,
        });
      }
      const entry = agg.get(pid);
      entry.visit += Number(row[visitCol] || 0);
      entry.inbound += Number(row[inboundCol] || 0);
    });
    return [...agg.values()];
  }, [filtered, postIdCol, postMap, visitCol, inboundCol, dateCol]);

  // TOP5 - postId 단위 집계 결과 사용
  const visitTop5 = useMemo(() => {
    return [...aggregatedByPost]
      .sort((a, b) => b.visit - a.visit)
      .slice(0, 5)
      .map(r => ({ name: r.title, value: r.visit }));
  }, [aggregatedByPost]);

  const inboundTop5 = useMemo(() => {
    return [...aggregatedByPost]
      .sort((a, b) => b.inbound - a.inbound)
      .slice(0, 5)
      .map(r => ({ name: r.title, value: r.inbound }));
  }, [aggregatedByPost]);

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
    const label = type === 'visit' ? '조회수' : '인바운드';
    // postId 기준 집계 데이터를 해당 타입으로 정렬
    const sorted = [...aggregatedByPost].sort((a, b) =>
      type === 'visit' ? b.visit - a.visit : b.inbound - a.inbound
    );
    const valueLabel = type === 'visit' ? 'visitors' : 'inbound';

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
                <th>{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.postId || i}>
                  <td>{r.title || '-'}</td>
                  <td>{r.publishDate || '-'}</td>
                  <td className="number-cell">
                    {fmtNumber(type === 'visit' ? r.visit : r.inbound)}
                  </td>
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
