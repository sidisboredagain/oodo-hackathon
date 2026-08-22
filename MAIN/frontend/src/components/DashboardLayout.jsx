import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  User,
  Clock,
  Calendar,
  Users,
  CheckSquare,
  LogOut,
  Menu,
  X,
  Briefcase,
  DollarSign,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function getNavItems(user) {
  if (user?.role === 'hr') {
    return [
      { to: '/dashboard/hr', icon: LayoutDashboard, label: 'HR Dashboard' },
      { to: '/employees', icon: Users, label: 'Employees' },
      { to: '/attendance', icon: Clock, label: 'Attendance' },
      { to: '/leave', icon: CheckSquare, label: 'Leave Requests' },
      { to: '/payroll', icon: DollarSign, label: 'Payroll' },
      { to: `/profile/${user?.user_id || user?.id}`, icon: User, label: 'My Profile' },
    ]
  }
  return [
    { to: '/dashboard/employee', icon: LayoutDashboard, label: 'My Dashboard' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/leave', icon: Calendar, label: 'Leave Requests' },
    { to: `/profile/${user?.user_id || user?.id}`, icon: User, label: 'My Profile' },
  ]
}

export default function DashboardLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navItems = getNavItems(user)

  const close = () => setSidebarOpen(false)

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={close}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Link to="/" className="sidebar-logo" onClick={close}>
          <div className="sidebar-logo-icon">
            <Briefcase />
          </div>
          <span className="sidebar-logo-text">Dayflow</span>
          <span className="sidebar-logo-badge">HRMS</span>
        </Link>

        <div className="sidebar-user">
          <div className="avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <div className="sidebar-user-meta">
              <span className={`role-badge ${user?.role === 'hr' ? 'role-hr' : 'role-emp'}`}>
                {user?.role === 'hr' ? 'HR Admin' : 'Employee'}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--white-muted)', fontFamily: 'monospace' }}>
                {user?.employee_id}
              </span>
            </div>
          </div>
          <button
            onClick={close}
            style={{ background: 'none', border: 'none', color: 'var(--white-muted)', cursor: 'pointer', display: 'none' }}
            className="mobile-only-close"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to.includes('/profile') && location.pathname.startsWith('/profile'))
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={close}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div style={{ marginLeft: '0.75rem' }}>
            {title && <div className="page-title" style={{ fontSize: '1.15rem' }}>{title}</div>}
            {subtitle && <div className="page-subtitle">{subtitle}</div>}
          </div>
        </header>
        <div className="page-body">{children}</div>
      </div>
    </div>
  )
}
