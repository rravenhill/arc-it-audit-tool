import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">
          <span className="dot" />
          Arc Systems &mdash; IT Audit Tool
        </div>
        <nav>
          <NavLink to="/customers" className={({ isActive }) => (isActive ? 'active' : '')}>
            Customers
          </NavLink>
          <NavLink to="/audits" className={({ isActive }) => (isActive ? 'active' : '')}>
            Audits
          </NavLink>
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
