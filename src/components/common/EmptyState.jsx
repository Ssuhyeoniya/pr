export default function EmptyState({ message = '데이터가 없습니다.', detail }) {
  return (
    <div className="empty-state">
      {message}
      {detail && (
        <>
          <br />
          <span style={{ fontSize: '8px', color: '#999' }}>{detail}</span>
        </>
      )}
    </div>
  );
}
