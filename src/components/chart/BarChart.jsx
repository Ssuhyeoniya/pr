import EmptyState from '../common/EmptyState.jsx';

/**
 * 날짜별 2중 막대 차트 (조회수 + 인바운드)
 * keys: 정렬된 날짜 배열, data: { [date]: { visit, inbound } }
 */
export default function BarChart({ keys, data }) {
  if (!keys || keys.length === 0) {
    return <EmptyState message="차트 데이터가 없습니다." />;
  }

  let maxVal = 0;
  keys.forEach(k => {
    maxVal = Math.max(maxVal, data[k].visit, data[k].inbound);
  });
  if (maxVal === 0) maxVal = 1;

  const barWidth = Math.max(8, Math.min(24, Math.floor(600 / keys.length) - 4));

  return (
    <div className="bar-chart-scroll">
      <div className="bar-chart" style={{ minWidth: keys.length * (barWidth * 2 + 12) }}>
        {keys.map(k => {
          const vH = Math.max(2, (data[k].visit / maxVal) * 120);
          const iH = Math.max(2, (data[k].inbound / maxVal) * 120);
          const label = k.substring(5);
          return (
            <div
              key={k}
              className="bar-group"
              title={`${k}\n조회수: ${data[k].visit.toLocaleString()}\n인바운드: ${data[k].inbound.toLocaleString()}`}
            >
              <div className="bar-pair">
                <div className="bar bar-visit" style={{ height: vH, width: barWidth }}></div>
                <div className="bar bar-inbound" style={{ height: iH, width: barWidth }}></div>
              </div>
              <div className="bar-label">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
