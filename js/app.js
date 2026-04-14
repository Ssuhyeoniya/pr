/**
 * App Router & Navigation Controller
 */

const App = (() => {
  const pages = {
    schedule: { title: '일정 관리', render: (c) => SchedulePage.render(c) },
    blog:     { title: '블로그 - 관리', render: (c) => BlogPage.render(c) },
    stats:    { title: '블로그 - 통계', render: (c) => StatsPage.render(c) },
  };

  let _currentPage = 'schedule';
  let _internalHashUpdate = false; // 내부 hash 변경 플래그 (hashchange 이벤트 무시용)

  function normalizeHash(h) {
    return (h || '').replace('#', '').replace('blog-posts', 'blog').replace('blog-stats', 'stats');
  }

  function init() {
    bindNavigation();
    bindRefresh();
    bindModalGlobal();

    const hash = normalizeHash(window.location.hash);
    if (pages[hash]) {
      navigateTo(hash);
    } else {
      navigateTo('schedule');
    }

    window.addEventListener('hashchange', () => {
      // 우리가 programmatic하게 바꾼 경우는 무시
      if (_internalHashUpdate) {
        _internalHashUpdate = false;
        return;
      }
      const h = normalizeHash(window.location.hash);
      if (pages[h] && h !== _currentPage) {
        navigateTo(h);
      }
    });
  }

  function navigateTo(pageName) {
    if (!pages[pageName]) return;
    _currentPage = pageName;

    // 페이지 전환 시 열려있는 모달 닫기
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('show');

    // hash 동기화 (hashchange 이벤트 재진입 방지)
    const currentHash = normalizeHash(window.location.hash);
    if (currentHash !== pageName) {
      _internalHashUpdate = true;
      history.replaceState(null, '', '#' + pageName);
    }

    const container = document.getElementById('content-body');
    const titleEl = document.getElementById('page-title');

    document.querySelectorAll('.nav-menu a').forEach(a => {
      a.classList.remove('active');
      if (a.dataset.page === pageName) a.classList.add('active');
    });

    titleEl.textContent = pages[pageName].title;
    pages[pageName].render(container);
  }

  function bindNavigation() {
    document.querySelectorAll('.nav-menu a[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const page = link.dataset.page;
        navigateTo(page); // navigateTo가 hash도 같이 업데이트
      });
    });
  }

  function bindRefresh() {
    document.getElementById('btn-refresh')?.addEventListener('click', () => {
      SheetsProxy.clearCache();
      navigateTo(_currentPage);
    });
  }

  /** 모달 바깥 클릭 & ESC 닫기 (글로벌) */
  function bindModalGlobal() {
    const overlay = document.getElementById('modal-overlay');
    const modalBox = document.getElementById('modal-container');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('show');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('show')) {
        overlay.classList.remove('show');
      }
    });

    document.getElementById('modal-close')?.addEventListener('click', () => {
      overlay.classList.remove('show');
    });
  }

  return { init, navigateTo };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
