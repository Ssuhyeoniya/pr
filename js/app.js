/**
 * App Router & Navigation Controller
 * 홍보협의체 메인 애플리케이션
 */

const App = (() => {
  const pages = {
    schedule: { title: '일정 관리', render: (c) => SchedulePage.render(c) },
    blog:     { title: '블로그 - POST_METRICS', render: (c) => BlogPage.render(c) },
    stats:    { title: '블로그 - STATS_DAILY', render: (c) => StatsPage.render(c) },
  };

  let _currentPage = 'schedule';

  function init() {
    bindNavigation();
    bindRefresh();

    // 해시 기반 라우팅
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

    // Update nav active state
    document.querySelectorAll('.nav-menu a').forEach(a => {
      a.classList.remove('active');
      if (a.dataset.page === pageName) {
        a.classList.add('active');
      }
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

  return { init, navigateTo };
})();

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
