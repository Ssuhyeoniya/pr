import { EVENT_TYPE_LABEL } from '../../config.js';

const MAX_VISIBLE = 2;

/**
 * 캘린더 한 칸 (셀)
 * 3개 이상이면 2개 + "+n개 더보기" 버튼 (모두 셀 박스 안에 들어감)
 */
export default function CalendarDay({
  dateStr,
  dayNumber,
  isOtherMonth,
  isToday,
  events,
  onDayClick,
  onEventClick,
  onMoreClick,
}) {
  const visibleEvents = events.slice(0, MAX_VISIBLE);
  const hiddenCount = events.length - MAX_VISIBLE;

  const handleCellClick = (e) => {
    if (e.target.closest('.cal-event-click') || e.target.closest('.cal-day-more')) return;
    onDayClick(dateStr);
  };

  return (
    <div
      className={`calendar-day${isOtherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}`}
      onClick={handleCellClick}
    >
      <div className="day-number">
        {isToday ? <span className="today-badge">{dayNumber}</span> : dayNumber}
      </div>
      {visibleEvents.map(ev => (
        <div
          key={ev.id}
          className={`calendar-event type-${ev.type} cal-event-click`}
          title={ev.title}
          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
        >
          {ev.title}
        </div>
      ))}
      {hiddenCount > 0 && (
        <div
          className="cal-day-more"
          onClick={(e) => { e.stopPropagation(); onMoreClick(dateStr); }}
        >
          +{hiddenCount}개 더보기
        </div>
      )}
    </div>
  );
}

export { EVENT_TYPE_LABEL };
