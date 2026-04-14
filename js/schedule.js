/**
 * Schedule (일정 관리) Page
 * 캘린더 + 일정 목록 + 일정 상세/수정/삭제 팝업
 * - 캘린더 셀 고정 높이, 5개 이상 시 더보기
 * - 삭제 버튼을 통해서만 삭제 가능
 */

const SchedulePage = (() => {
  let _currentDate = new Date();
  let _events = [];

  function loadEvents() {
    try {
      const saved = localStorage.getItem('schedule_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return getSampleEvents();
    } catch { return getSampleEvents(); }
  }

  function saveEvents() {
    localStorage.setItem('schedule_events', JSON.stringify(_events));
  }

  function getSampleEvents() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    return [
      { id: 1, date: fmtISO(new Date(y, m, 5)), title: '월간 홍보회의', type: 'meeting', time: '10:00' },
      { id: 2, date: fmtISO(new Date(y, m, 10)), title: '보도자료 마감', type: 'deadline', time: '18:00' },
      { id: 3, date: fmtISO(new Date(y, m, 15)), title: '블로그 포스트 발행', type: 'publish', time: '09:00' },
      { id: 4, date: fmtISO(new Date(y, m, 20)), title: 'SNS 캠페인 시작', type: 'other', time: '12:00' },
      { id: 5, date: fmtISO(new Date(y, m, 25)), title: '홍보 실적 보고', type: 'meeting', time: '14:00' },
    ];
  }

  function fmtISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function typeLabel(t) {
    return { meeting: '회의', deadline: '마감', publish: '발행', other: '기타' }[t] || t;
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  async function render(container) {
    _events = loadEvents();
    renderPage(container);
  }

  function renderPage(container) {
    const year = _currentDate.getFullYear();
    const month = _currentDate.getMonth();
    const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const dayNames = ['일','월','화','수','목','금','토'];

    const monthEvents = _events
      .filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; })
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

    container.innerHTML = `
      <div class="schedule-layout">
        <div class="calendar-wrapper">
          <div class="calendar-header">
            <div class="calendar-nav"><button id="cal-prev">&laquo;</button></div>
            <h3>${year}년 ${monthNames[month]}</h3>
            <div class="calendar-nav">
              <button id="cal-next">&raquo;</button>
              <button id="cal-today" class="btn btn-sm" style="margin-left:4px;">오늘</button>
            </div>
          </div>
          <div class="calendar-grid">
            ${dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
            ${generateDays(year, month)}
          </div>
        </div>
        <div class="schedule-sidebar">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <h3>${monthNames[month]} 일정</h3>
            <button class="btn btn-primary btn-sm" id="add-event-btn">+ 추가</button>
          </div>
          ${monthEvents.length === 0
            ? '<div class="empty-state" style="padding:20px;">일정이 없습니다.</div>'
            : monthEvents.map(ev => `
              <div class="schedule-item schedule-item-clickable" data-event-id="${ev.id}">
                <div class="schedule-item-time">${ev.date} ${ev.time || ''}</div>
                <div class="schedule-item-title">${esc(ev.title)}</div>
                <span class="schedule-item-type calendar-event type-${ev.type}">${typeLabel(ev.type)}</span>
              </div>
            `).join('')}
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function generateDays(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const todayStr = fmtISO(new Date());
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const MAX_VISIBLE = 2; // 3개 이상이면 2개만 노출 + 더보기 버튼
    let html = '';

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

      const isToday = dateStr === todayStr;
      const dayEvents = _events.filter(e => e.date === dateStr);
      const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
      const hiddenCount = dayEvents.length - MAX_VISIBLE;

      html += `
        <div class="calendar-day ${isOther ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <div class="day-number">${isToday
            ? `<span style="background:var(--color-primary);color:#fff;border-radius:50%;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;font-size:8px;">${day}</span>`
            : day}</div>
          ${visibleEvents.map(ev =>
            `<div class="calendar-event type-${ev.type} cal-event-click" data-event-id="${ev.id}" title="${esc(ev.title)}">${esc(ev.title)}</div>`
          ).join('')}
          ${hiddenCount > 0
            ? `<div class="cal-day-more" data-date="${dateStr}">+${hiddenCount}개 더보기</div>`
            : ''}
        </div>
      `;
    }
    return html;
  }

  /** 특정 날짜의 전체 일정 팝업 */
  function showDayEventsPopup(dateStr) {
    const dayEvents = _events
      .filter(e => e.date === dateStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = `${dateStr} 일정 (${dayEvents.length}건)`;
    document.getElementById('modal-body').innerHTML = `
      <div style="max-height:300px;overflow:auto;">
        ${dayEvents.map(ev => `
          <div class="schedule-item schedule-item-clickable" data-event-id="${ev.id}" style="padding:6px 0;border-bottom:1px solid #f0f0f0;">
            <div class="schedule-item-time" style="font-size:8px;color:#999;">${ev.time || ''} / ${typeLabel(ev.type)}</div>
            <div class="schedule-item-title" style="font-size:9px;font-weight:500;">${esc(ev.title)}</div>
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('modal-footer').innerHTML = `<button class="btn" id="modal-popup-close">닫기</button>`;
    overlay.classList.add('show');

    document.getElementById('modal-popup-close').addEventListener('click', () => overlay.classList.remove('show'));

    // 팝업 내 일정 클릭 → 상세
    document.querySelectorAll('#modal-body .schedule-item-clickable').forEach(el => {
      el.addEventListener('click', () => {
        overlay.classList.remove('show');
        setTimeout(() => showEventDetail(Number(el.dataset.eventId)), 100);
      });
    });
  }

  /** 일정 상세 보기 팝업 (수정/삭제) */
  function showEventDetail(eventId) {
    const ev = _events.find(e => e.id === eventId);
    if (!ev) return;

    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = '일정 상세';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>제목</label>
        <input type="text" id="edit-event-title" value="${esc(ev.title)}">
      </div>
      <div class="form-group">
        <label>날짜</label>
        <input type="date" id="edit-event-date" value="${ev.date}">
      </div>
      <div class="form-group">
        <label>시간</label>
        <input type="time" id="edit-event-time" value="${ev.time || ''}">
      </div>
      <div class="form-group">
        <label>유형</label>
        <select id="edit-event-type">
          <option value="meeting" ${ev.type === 'meeting' ? 'selected' : ''}>회의</option>
          <option value="deadline" ${ev.type === 'deadline' ? 'selected' : ''}>마감</option>
          <option value="publish" ${ev.type === 'publish' ? 'selected' : ''}>발행</option>
          <option value="other" ${ev.type === 'other' ? 'selected' : ''}>기타</option>
        </select>
      </div>
    `;
    document.getElementById('modal-footer').innerHTML = `
      <button class="btn btn-danger" id="modal-delete">삭제</button>
      <button class="btn" id="modal-cancel">취소</button>
      <button class="btn btn-primary" id="modal-save">수정</button>
    `;
    overlay.classList.add('show');

    document.getElementById('modal-cancel').addEventListener('click', () => overlay.classList.remove('show'));
    document.getElementById('modal-save').addEventListener('click', () => {
      ev.title = document.getElementById('edit-event-title').value.trim() || ev.title;
      ev.date = document.getElementById('edit-event-date').value || ev.date;
      ev.time = document.getElementById('edit-event-time').value;
      ev.type = document.getElementById('edit-event-type').value;
      saveEvents();
      overlay.classList.remove('show');
      renderPage(document.getElementById('content-body'));
    });
    document.getElementById('modal-delete').addEventListener('click', () => {
      if (confirm('정말 이 일정을 삭제하시겠습니까?')) {
        _events = _events.filter(e => e.id !== eventId);
        saveEvents();
        overlay.classList.remove('show');
        renderPage(document.getElementById('content-body'));
      }
    });
  }

  /** 새 일정 추가 팝업 */
  function showAddEventModal(prefillDate) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = '새 일정 추가';
    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label>제목</label>
        <input type="text" id="event-title" placeholder="일정 제목 입력">
      </div>
      <div class="form-group">
        <label>날짜</label>
        <input type="date" id="event-date" value="${prefillDate || fmtISO(new Date())}">
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
    document.getElementById('modal-footer').innerHTML = `
      <button class="btn" id="modal-cancel">취소</button>
      <button class="btn btn-primary" id="modal-confirm">추가</button>
    `;
    overlay.classList.add('show');

    document.getElementById('modal-cancel').addEventListener('click', () => overlay.classList.remove('show'));
    document.getElementById('modal-confirm').addEventListener('click', () => {
      const t = document.getElementById('event-title').value.trim();
      const d = document.getElementById('event-date').value;
      if (t && d) {
        const newId = _events.length > 0 ? Math.max(..._events.map(e => e.id)) + 1 : 1;
        _events.push({
          id: newId, date: d, title: t,
          type: document.getElementById('event-type').value,
          time: document.getElementById('event-time').value
        });
        saveEvents();
        renderPage(document.getElementById('content-body'));
      }
      overlay.classList.remove('show');
    });
  }

  function bindEvents(container) {
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

    container.querySelector('#add-event-btn')?.addEventListener('click', () => showAddEventModal());

    // 캘린더 빈 날짜 클릭 → 새 일정 추가
    container.querySelectorAll('.calendar-day').forEach(day => {
      day.addEventListener('click', (e) => {
        if (e.target.closest('.cal-event-click') || e.target.closest('.cal-day-more')) return;
        showAddEventModal(day.dataset.date);
      });
    });

    // 캘린더 내 일정 클릭 → 상세
    container.querySelectorAll('.cal-event-click').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        showEventDetail(Number(el.dataset.eventId));
      });
    });

    // 더보기 클릭 → 해당 날짜 전체 일정 팝업
    container.querySelectorAll('.cal-day-more').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        showDayEventsPopup(el.dataset.date);
      });
    });

    // 사이드바 일정 클릭 → 상세
    container.querySelectorAll('.schedule-item-clickable').forEach(el => {
      el.addEventListener('click', () => {
        showEventDetail(Number(el.dataset.eventId));
      });
    });
  }

  return { render };
})();
