import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import BlogPage from './pages/BlogPage.jsx';
import StatsPage from './pages/StatsPage.jsx';

/**
 * 라우트 정의
 * - /schedule  : 일정 관리
 * - /blog      : 블로그 > 관리 (POST_METRICS)
 * - /stats     : 블로그 > 통계 (STATS_DAILY)
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/schedule" replace />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="*" element={<Navigate to="/schedule" replace />} />
      </Route>
    </Routes>
  );
}
