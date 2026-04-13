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

  function init() {
    bindNavigation();
    bindRefresh();
    bindModalGlobal();

    const hash = window.location.hash.replace('#', '').replace('blog-posts', 'blog').replace('blog-stats', 'stats');
    if (pages[hash]) {
      navigateTo(hash);
    } else {
      navigateTo('schedule');
    }

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '').replace('blog-posts', 'blog').replace('blog-stats', 'stats');
      if (pages[h] && h !== _currentPage) {
        navigateTo(h);
      }
    });
  }

  function navigateTo(pageName) {
    if (!pages[pageName]) return;
    _currentPage = pageName;
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
        const page = link.dataset.page;
        window.location.hash = page;
        navigateTo(page);
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
