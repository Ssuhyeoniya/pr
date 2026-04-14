import CalendarDay from './CalendarDay.jsx';
import { fmtISO, MONTH_NAMES, DAY_NAMES } from '../../utils/date.js';

/**
 * 월 캘린더 (controlled)
 * - currentDate/setCurrentDate: 부모가 소유 (사이드바에서 같이 사용)
 */
export default function Calendar({
  currentDate,
  onChangeDate,
  events,
  onDayClick,
  onEventClick,
  onMoreClick,
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const goPrev = () => onChangeDate(new Date(year, month - 1, 1));
  const goNext = () => onChangeDate(new Date(year, month + 1, 1));
  const goToday = () => onChangeDate(new Date());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const todayStr = fmtISO(new Date());
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    let day, dateStr, isOther = false;
    if (i < firstDay) {
      day = daysInPrev - firstDay + 1 + i;
      dateStr = fmtISO(new Date(year, month - 1, day));
      isOther = true;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      dateStr = fmtISO(new Date(year, month + 1, day));
      isOther = true;
    } else {
      day = i - firstDay + 1;
      dateStr = fmtISO(new Date(year, month, day));
    }
    const dayEvents = events.filter(e => e.date === dateStr);
    cells.push({
      key: i,
      day,
      dateStr,
      isOther,
      isToday: dateStr === todayStr,
      events: dayEvents,
    });
  }

  return (
    <div className="calendar-wrapper">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={goPrev}>&laquo;</button>
        </div>
        <h3>{year}년 {MONTH_NAMES[month]}</h3>
        <div className="calendar-nav">
          <button onClick={goNext}>&raquo;</button>
          <button className="btn btn-sm" style={{ marginLeft: 4 }} onClick={goToday}>오늘</button>
        </div>
      </div>
      <div className="calendar-grid">
        {DAY_NAMES.map(d => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}
        {cells.map(c => (
          <CalendarDay
            key={c.key}
            dateStr={c.dateStr}
            dayNumber={c.day}
            isOtherMonth={c.isOther}
            isToday={c.isToday}
            events={c.events}
            onDayClick={onDayClick}
            onEventClick={onEventClick}
            onMoreClick={onMoreClick}
          />
        ))}
      </div>
    </div>
  );
}
