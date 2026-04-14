import { EVENT_TYPE_LABEL } from '../../config.js';

/**
 * 특정 날짜의 일정 목록 (모달 body 용)
 * 각 항목 클릭 시 onSelect(event) 호출
 */
export default function DayEventsList({ events, onSelect }) {
  const sorted = [...events].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  return (
    <div style={{ maxHeight: 300, overflow: 'auto' }}>
      {sorted.map(ev => (
        <div
          key={ev.id}
          className="schedule-item schedule-item-clickable"
          style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}
          onClick={() => onSelect(ev)}
        >
          <div className="schedule-item-time" style={{ fontSize: 8, color: '#999' }}>
            {ev.time || ''} / {EVENT_TYPE_LABEL[ev.type] || ev.type}
          </div>
          <div className="schedule-item-title" style={{ fontSize: 9, fontWeight: 500 }}>
            {ev.title}
          </div>
        </div>
      ))}
    </div>
  );
}
