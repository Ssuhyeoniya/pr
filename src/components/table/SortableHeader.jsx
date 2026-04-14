/**
 * 정렬 가능한 테이블 헤더 셀
 */
export default function SortableHeader({ col, label, width, sortCol, sortAsc, onSort }) {
  const isSorted = sortCol === col;
  const arrow = isSorted ? (sortAsc ? '▲' : '▼') : '↕';
  return (
    <th
      style={{ width }}
      className={isSorted ? 'sorted' : ''}
      onClick={() => onSort(col)}
    >
      {label} <span className="sort-icon">{arrow}</span>
    </th>
  );
}
