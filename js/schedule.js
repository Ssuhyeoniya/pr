/**
 * Schedule (일정 관리) Page
 * 간단한 캘린더 + 일정 목록
 */

const SchedulePage = (() => {
  let _currentDate = new Date();
  let _events = [];

  // localStorage에서 일정 복원
  function loadEvents() {
    try {
      const saved = localStorage.getItem('schedule_events');
      return saved ? JSON.parse(saved) : getSampleEvents();
    } catch {
      return getSampleEvents();
    }
  }

  function saveEvents() {
    localStorage.setItem('schedule_events', JSON.stringify(_events));
  }

  function getSampleEvents() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return [
      { id: 1, date: formatDateISO(new Date(y, m, 5)), title: '월간 홍보회의', type: 'meeting', time: '10:00' },
      { id: 2, date: formatDateISO(new Date(y, m, 10)), title: '보도자료 마감', type: 'deadline', time: '18:00' },
      { id: 3, date: formatDateISO(new Date(y, m, 15)), title: '블로그 포스트 발행', type: 'publish', time: '09:00' },
      { id: 4, date: formatDateISO(new Date(y, m, 20)), title: 'SNS 캠페인 시작', type: 'other', time: '12:00' },
      { id: 5, date: formatDateISO(new Date(y, m, 25)), title: '홍보 실적 보고', type: 'meeting', time: '14:00' },
    ];
  }

  function formatDateISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function render(container) {
    _events = loadEvents();
    renderPage(container);
  }

  function renderPage(container) {
    const year = _currentDate.getFullYear();
    const month = _currentDate.getMonth();
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    // 이번 달의 일정 목록
    const monthEvents = _events
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

    container.innerHTML = `
      <div class="schedule-layout">
        <div class="calendar-wrapper">
          <div class="calendar-header">
            <div class="calendar-nav">
              <button id="cal-prev">&laquo;</button>
            </div>
            <h3>${year}년 ${monthNames[month]}</h3>
            <div class="calendar-nav">
              <button id="cal-next">&raquo;</button>
              <button id="cal-today" class="btn btn-sm" style="margin-left:4px;">오늘</button>
            </div>
          </div>
          <div class="calendar-grid">
            ${dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
            ${generateCalendarDays(year, month)}
          </div>
        </div>
        <div class="schedule-sidebar">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <h3>${monthNames[month]} 일정</h3>
            <button class="btn btn-primary btn-sm" id="add-event-btn">+ 일정 추가</button>
          </div>
          ${monthEvents.length === 0
            ? '<div class="empty-state" style="padding:20px;">일정이 없습니다.</div>'
            : monthEvents.map(ev => `
              <div class="schedule-item">
                <div class="schedule-item-time">${ev.date} ${ev.time || ''}</div>
                <div class="schedule-item-title">${escapeHtml(ev.title)}</div>
                <span class="schedule-item-type calendar-event type-${ev.type}">${getTypeLabel(ev.type)}</span>
                <button class="btn btn-sm" style="float:right;margin-top:-16px;font-size:8px;color:#999;" data-delete="${ev.id}">&times;</button>
              </div>
            `).join('')}
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function generateCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = formatDateISO(today);

    let html = '';
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      let day, dateStr, isOther = false;

      if (i < firstDay) {
        day = daysInPrev - firstDay + 1 + i;
        const d = new Date(year, month - 1, day);
        dateStr = formatDateISO(d);
        isOther = true;
      } else if (i >= firstDay + daysInMonth) {
        day = i - firstDay - daysInMonth + 1;
        const d = new Date(year, month + 1, day);
        dateStr = formatDateISO(d);
        isOther = true;
      } else {
        day = i - firstDay + 1;
        dateStr = formatDateISO(new Date(year, month, day));
      }

      const isToday = dateStr === todayStr;
      const dayEvents = _events.filter(e => e.date === dateStr);

      html += `
        <div class="calendar-day ${isOther ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <div class="day-number">${isToday ? `<span style="background:var(--color-primary);color:#fff;border-radius:50%;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;">${day}</span>` : day}</div>
          ${dayEvents.slice(0, 2).map(ev => `<div class="calendar-event type-${ev.type}" title="${escapeHtml(ev.title)}">${escapeHtml(ev.title)}</div>`).join('')}
          ${dayEvents.length > 2 ? `<div style="font-size:8px;color:#999;">+${dayEvents.length - 2}개</div>` : ''}
        </div>
      `;
    }

    return html;
  }

  function getTypeLabel(type) {
    const labels = { meeting: '회의', deadline: '마감', publish: '발행', other: '기타' };
    return labels[type] || type;
  }

  function showAddEventModal(prefillDate) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    title.textContent = '새 일정 추가';
    body.innerHTML = `
      <div class="form-group">
        <label>일정 제목</label>
        <input type="text" id="event-title" placeholder="일정 제목 입력">
      </div>
      <div class="form-group">
        <label>날짜</label>
        <input type="date" id="event-date" value="${prefillDate || formatDateISO(new Date())}">
      </div>
      <div class="form-group">
        <label>시간</label>
        <input type="time" id="event-time" value="09:00">
      </div>
      <div class="form-group">
        <label>유형</label>
        <select id="event-type">
          <option value="meeting">회의</option>
          <option value="deadline">마감</option>
          <option value="publish">발행</option>
          <option value="other">기타</option>
        </select>
      </div>
    `;
    footer.innerHTML = `
      <button class="btn" id="modal-cancel">취소</button>
      <button class="btn btn-primary" id="modal-confirm">추가</button>
    `;

    overlay.classList.add('show');

    document.getElementById('modal-cancel').addEventListener('click', () => overlay.classList.remove('show'));
    document.getElementById('modal-close').addEventListener('click', () => overlay.classList.remove('show'));
    document.getElementById('modal-confirm').addEventListener('click', () => {
      const evTitle = document.getElementById('event-title').value.trim();
      const evDate = document.getElementById('event-date').value;
      const evTime = document.getElementById('event-time').value;
      const evType = document.getElementById('event-type').value;

      if (evTitle && evDate) {
        const newId = _events.length > 0 ? Math.max(..._events.map(e => e.id)) + 1 : 1;
        _events.push({ id: newId, date: evDate, title: evTitle, type: evType, time: evTime });
        saveEvents();
        const container = document.getElementById('content-body');
        renderPage(container);
      }
      overlay.classList.remove('show');
    });
  }

  function bindEvents(container) {
    // Calendar nav
    container.querySelector('#cal-prev')?.addEventListener('click', () => {
      _currentDate = new Date(_currentDate.getFullYear(), _currentDate.getMonth() - 1, 1);
      renderPage(container);
    });
    container.querySelector('#cal-next')?.addEventListener('click', () => {
      _currentDate = new Date(_currentDate.getFullYear(), _currentDate.getMonth() + 1, 1);
      renderPage(container);
    });
    container.querySelector('#cal-today')?.addEventListener('click', () => {
      _currentDate = new Date();
      renderPage(container);
    });

    // Add event
    container.querySelector('#add-event-btn')?.addEventListener('click', () => showAddEventModal());

    // Click on calendar day
    container.querySelectorAll('.calendar-day').forEach(day => {
      day.addEventListener('click', () => {
        showAddEventModal(day.dataset.date);
      });
    });

    // Delete event
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.delete);
        _events = _events.filter(ev => ev.id !== id);
        saveEvents();
        renderPage(container);
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { render };
})();
