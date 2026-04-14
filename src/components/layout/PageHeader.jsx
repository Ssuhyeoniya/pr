import { useLocation } from 'react-router-dom';
import { PAGE_TITLES } from '../../config.js';
import { clearCache } from '../../services/sheetsProxy.js';

/**
 * 페이지 헤더 - 타이틀 + 새로고침 버튼
 */
export default function PageHeader({ onRefresh }) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || '';

  const handleRefresh = () => {
    clearCache();
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  return (
    <div className="content-header">
      <h1>{title}</h1>
      <div className="header-actions">
        <button className="btn btn-sm" onClick={handleRefresh}>
          새로고침
        </button>
      </div>
    </div>
  );
}
