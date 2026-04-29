import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Car, MapPin, FileText, Settings,
  LogOut, Menu, X, ChevronRight, Truck, BarChart3, User
} from 'lucide-react';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/sessions', icon: Car, label: 'Entradas/Saídas' },
  { to: '/spots', icon: MapPin, label: 'Mapa de Vagas' },
  { to: '/vehicles', icon: Truck, label: 'Veículos' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/admin', icon: Settings, label: 'Administração', roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const Sidebar = ({ mobile }) => (
    <aside style={{
      width: mobile ? '100%' : 'var(--sidebar-width)',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100%', padding: '0',
      position: mobile ? 'fixed' : 'relative',
      top: 0, left: mobile && !open ? '-100%' : 0,
      zIndex: mobile ? 200 : 1,
      transition: 'left 0.25s ease',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Car size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Park System</div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Gestão de Estacionamento</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 8 }}>Menu</div>
        {NAV.filter(n => !n.roles || n.roles.includes(user?.role)).map(({ to, icon: Icon, label, exact }) => (
          <NavLink key={to} to={to} end={exact}
            onClick={() => mobile && setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              fontSize: 14, fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--primary-light)' : 'var(--text-muted)',
              background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
              transition: 'all 0.15s',
              textDecoration: 'none',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={17} />
                {label}
                {isActive && <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--accent))', display:'flex',alignItems:'center',justifyContent:'center' }}>
            <User size={15} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ padding: '6px', border: 'none' }} title="Sair">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      <div style={{ display: 'flex', flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199 }} onClick={() => setOpen(false)} />
      )}

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} style={{ display: 'none' }}>
            <Menu size={18} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="dot dot-green" />
            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Sistema online</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
