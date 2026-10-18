import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  ClipboardList,
  Package,
  Bell,
  Map,
  BarChart3,
  Users,
  User,
  LogOut,
  Plus,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/Auth';
import { Logo, words } from '../components/UI';
export default function Shell() {
  const { user, logout } = useAuth(),
    navigate = useNavigate(),
    [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('navigation-open');
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 701px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.classList.remove('navigation-open');
      window.removeEventListener('keydown', closeOnEscape);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [open]);
  const role = user.role.toLowerCase();
  const items = {
    admin: [
      ['dashboard', 'Overview', LayoutDashboard],
      ['incidents', 'Incidents', Radio],
      ['assignments', 'Rescue coordination', ClipboardList],
      ['volunteers', 'People & teams', Users],
      ['resources', 'Resource inventory', Package],
      ['requests', 'Resource requests', ClipboardList],
      ['alerts', 'Emergency alerts', Bell],
      ['map', 'Situation map', Map],
      ['analytics', 'Analytics', BarChart3],
    ],
    citizen: [
      ['dashboard', 'Overview', LayoutDashboard],
      ['report', 'Report incident', Plus],
      ['incidents', 'My reports', Radio],
      ['resources', 'Resource requests', Package],
      ['alerts', 'Emergency alerts', Bell],
    ],
    volunteer: [
      ['dashboard', 'Overview', LayoutDashboard],
      ['assignments', 'My assignments', ClipboardList],
      ['alerts', 'Emergency alerts', Bell],
    ],
    responder: [
      ['dashboard', 'Overview', LayoutDashboard],
      ['incidents', 'Assigned incidents', Radio],
      ['assignments', 'Operations', ClipboardList],
      ['map', 'Situation map', Map],
      ['alerts', 'Emergency alerts', Bell],
    ],
  }[role];
  return (
    <div className="app-shell">
      <aside
        id="workspace-navigation"
        aria-label="Workspace navigation"
        className={`sidebar ${open ? 'open' : ''}`}
      >
        <Link to="/">
          <Logo />
        </Link>
        <button
          aria-label="Close navigation"
          className="mobile-close icon-button"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <div className="workspace-label">
          {role === 'admin' ? 'COMMAND CENTER' : `${role.toUpperCase()} WORKSPACE`}
        </div>
        <nav>
          {[['live', 'Live India', Radio], ...items].map(([path, label, Icon]) => (
            <NavLink key={path} to={`/${role}/${path}`} onClick={() => setOpen(false)}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-note">
            <ShieldCheck size={18} />
            <div>
              India response network<small>Live feeds + labelled demo reports</small>
            </div>
          </div>
          <NavLink to={`/${role}/profile`} onClick={() => setOpen(false)}>
            <span className="avatar">
              {user.name
                .split(' ')
                .map((x) => x[0])
                .slice(0, 2)
                .join('')}
            </span>
            <span>
              {user.name}
              <small>{words(user.role)}</small>
            </span>
            <User size={16} />
          </NavLink>
          <button
            className="signout"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="navigation-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="workspace-navigation"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <span>
            <span className="breadcrumb">Workspace</span> / {words(user.role)} portal
          </span>
          <div>
            <span className="system-status">
              <i /> India coordination app
            </span>
            <Link to={`/${role}/alerts`} aria-label="Emergency alerts">
              <Bell size={19} />
            </Link>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <div className="app-footer">
          NEXUS RESPONSE NETWORK <span>Professional Training I · Demo environment</span>
        </div>
      </div>
    </div>
  );
}
