import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import PageHeader from './PageHeader.jsx';
import { useModal } from '../../contexts/ModalContext.jsx';

/**
 * 앱 전체 레이아웃 - 사이드바 + 헤더 + 컨텐츠
 * 페이지 전환 시 열려있는 모달 자동 닫기
 */
export default function AppLayout() {
  const location = useLocation();
  const { closeModal } = useModal();

  useEffect(() => {
    closeModal();
  }, [location.pathname, closeModal]);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PageHeader />
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
