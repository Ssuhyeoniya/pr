import { useState } from 'react';
import { fmtISO } from '../../utils/date.js';

/**
 * 일정 추가/수정 공용 폼
 * - event 없으면 추가, 있으면 수정
 * onSubmit(data), onDelete(id), onCancel()
 */
export default function EventFormModal({ event, prefillDate, onSubmit, onDelete, onCancel }) {
  const isEdit = Boolean(event);
  const [title, setTitle] = useState(event?.title || '');
  const [date, setDate] = useState(event?.date || prefillDate || fmtISO(new Date()));
  const [time, setTime] = useState(event?.time || (isEdit ? '' : '09:00'));
  const [type, setType] = useState(event?.type || 'meeting');

  const handleSubmit = () => {
    if (!title.trim() || !date) return;
    onSubmit({ title: title.trim(), date, time, type });
  };

  const handleDelete = () => {
    if (event && confirm('정말 이 일정을 삭제하시겠습니까?')) {
      onDelete(event.id);
    }
  };

  return (
    <>
      <div className="form-group">
        <label>제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="일정 제목 입력"
          autoFocus
        />
      </div>
      <div className="form-group">
        <label>날짜</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="form-group">
        <label>시간</label>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="form-group">
        <label>유형</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="meeting">회의</option>
          <option value="deadline">마감</option>
          <option value="publish">발행</option>
          <option value="other">기타</option>
        </select>
      </div>
      <FormFooter isEdit={isEdit} onSubmit={handleSubmit} onDelete={handleDelete} onCancel={onCancel} />
    </>
  );
}

function FormFooter({ isEdit, onSubmit, onDelete, onCancel }) {
  // 모달 컴포넌트가 footer 를 따로 받는 구조이므로 여기서는 body 안에 버튼을 배치
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
      {isEdit && <button className="btn btn-danger" onClick={onDelete}>삭제</button>}
      <button className="btn" onClick={onCancel}>취소</button>
      <button className="btn btn-primary" onClick={onSubmit}>{isEdit ? '수정' : '추가'}</button>
    </div>
  );
}
