import { useState, useMemo } from 'react';
import Calendar from '../components/calendar/Calendar.jsx';
import EventFormModal from '../components/calendar/EventFormModal.jsx';
import DayEventsList from '../components/calendar/DayEventsList.jsx';
import useLocalStorage from '../hooks/useLocalStorage.js';
import { useModal } from '../contexts/ModalContext.jsx';
import { fmtISO, MONTH_NAMES } from '../utils/date.js';
import { EVENT_TYPE_LABEL } from '../config.js';

/**
 * 일정 관리 페이지
 * - 캘린더 + 월간 일정 사이드바
 * - localStorage 'schedule_events' 에 영속 저장
 * - 추가/수정/삭제 모두 모달로
 */
function getSampleEvents() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return [
    { id: 1, date: fmtISO(new Date(y, m, 5)), title: '월간 홍보회의', type: 'meeting', time: '10:00' },
    { id: 2, date: fmtISO(new Date(y, m, 10)), title: '보도자료 마감', type: 'deadline', time: '18:00' },
    { id: 3, date: fmtISO(new Date(y, m, 15)), title: '블로그 포스트 발행', type: 'publish', time: '09:00' },
    { id: 4, date: fmtISO(new Date(y, m, 20)), title: 'SNS 캠페인 시작', type: 'other', time: '12:00' },
    { id: 5, date: fmtISO(new Date(y, m, 25)), title: '홍보 실적 보고', type: 'meeting', time: '14:00' },
  ];
}

export default function SchedulePage() {
  const [events, setEvents] = useLocalStorage('schedule_events', getSampleEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { openModal, closeModal } = useModal();

  const monthEvents = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    return events
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .sort((a, b) =>
        a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')
      );
  }, [events, currentDate]);

  const handleAdd = (prefillDate) => {
    openModal({
      title: '새 일정 추가',
      body: (
        <EventFormModal
          prefillDate={prefillDate}
          onSubmit={(data) => {
            const newId = events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1;
            setEvents([...events, { id: newId, ...data }]);
            closeModal();
          }}
          onCancel={closeModal}
        />
      ),
    });
  };

  const handleEdit = (event) => {
    openModal({
      title: '일정 상세',
      body: (
        <EventFormModal
          event={event}
          onSubmit={(data) => {
            setEvents(events.map(e => e.id === event.id ? { ...e, ...data } : e));
            closeModal();
          }}
          onDelete={(id) => {
            setEvents(events.filter(e => e.id !== id));
            closeModal();
          }}
          onCancel={closeModal}
        />
      ),
    });
  };

  const handleShowDay = (dateStr) => {
    const dayEvents = events.filter(e => e.date === dateStr);
    openModal({
      title: `${dateStr} 일정 (${dayEvents.length}건)`,
      body: (
        <DayEventsList
          events={dayEvents}
          onSelect={(ev) => {
            closeModal();
            setTimeout(() => handleEdit(ev), 100);
          }}
        />
      ),
      footer: <button className="btn" onClick={closeModal}>닫기</button>,
    });
  };

  return (
    <div className="schedule-layout">
      <Calendar
        currentDate={currentDate}
        onChangeDate={setCurrentDate}
        events={events}
        onDayClick={handleAdd}
        onEventClick={handleEdit}
        onMoreClick={handleShowDay}
      />
      <div className="schedule-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3>{MONTH_NAMES[currentDate.getMonth()]} 일정</h3>
          <button className="btn btn-primary btn-sm" onClick={() => handleAdd()}>+ 추가</button>
        </div>
        {monthEvents.length === 0 ? (
          <div className="empty-state" style={{ padding: 20 }}>일정이 없습니다.</div>
        ) : monthEvents.map(ev => (
          <div
            key={ev.id}
            className="schedule-item schedule-item-clickable"
            onClick={() => handleEdit(ev)}
          >
            <div className="schedule-item-time">{ev.date} {ev.time || ''}</div>
            <div className="schedule-item-title">{ev.title}</div>
            <span className={`schedule-item-type calendar-event type-${ev.type}`}>
              {EVENT_TYPE_LABEL[ev.type] || ev.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
