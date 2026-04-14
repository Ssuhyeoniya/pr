/**
 * TOP5 랭킹 블록
 * items: [{ name, value }]
 * onMore: 더보기 클릭 핸들러 (없으면 버튼 숨김)
 */
export default function Top5Block({ title, items, onMore }) {
  return (
    <div className="top5-block">
      <div className="top5-header">
        <span className="top5-title">{title}</span>
        {onMore && (
          <button className="btn btn-sm" onClick={onMore}>더보기</button>
        )}
      </div>
      <div className="top5-list">
        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: 10 }}>데이터 없음</div>
        ) : items.map((it, i) => (
          <div key={i} className="top5-row">
            <span className="top5-rank">{i + 1}</span>
            <span className="top5-name">{it.name || '-'}</span>
            <span className="top5-val">{Number(it.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
