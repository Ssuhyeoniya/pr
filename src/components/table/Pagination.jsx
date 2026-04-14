/**
 * 하단 페이지네이션 (표시용 정보 + 이전/다음)
 */
export default function Pagination({ page, totalPages, total, pageSize, onChange }) {
  const start = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="data-table-pagination">
      <span>{total > 0 ? `${start}-${end}` : '0'} / {total}건</span>
      <div className="pagination-controls">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)}>&laquo; 이전</button>
        <span className="page-current">{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>다음 &raquo;</button>
      </div>
    </div>
  );
}
