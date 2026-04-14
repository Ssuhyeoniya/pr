import { NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../config.js';

/**
 * 좌측 네비게이션 사이드바
 */
export default function Sidebar() {
  const location = useLocation();

  return (
    <nav className="nav-sidebar">
      <div className="nav-logo">
        <div className="nav-logo-icon">P</div>
        <div className="nav-logo-text">PR</div>
      </div>
      <ul className="nav-menu">
        {NAV_ITEMS.map((item, i) => (
          <li key={i}>
            {item.path ? (
              <NavLink
                to={item.path}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                {item.label}
              </NavLink>
            ) : (
              <>
                <div className="nav-group-label">{item.label}</div>
                <ul className="nav-sub">
                  {item.children.map((child, ci) => (
                    <li key={ci}>
                      <NavLink
                        to={child.path}
                        className={location.pathname === child.path ? 'active' : ''}
                      >
                        {child.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
