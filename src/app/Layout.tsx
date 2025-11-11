import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  
  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13h8V3H3v10zm10 8h8V3h-8v18zm-10 0h8v-6H3v6z" />
        </svg>
      ),
    },
    {
      path: '/issues',
      label: 'Issues',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a2 2 0 011.414.586l4.414 4.414A2 2 0 0119 9.414V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      path: '/customers',
      label: 'Customers',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0A4 4 0 1118 10a4 4 0 01-7.357 2.143M7.356 16.143A4 4 0 1112 6" />
        </svg>
      ),
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m4 6V7m4 10V4" />
        </svg>
      ),
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-1.14 1.954-1.14 2.254 0a1.5 1.5 0 002.282.95c.988-.574 2.142.579 1.568 1.567a1.5 1.5 0 00.95 2.283c1.14.3 1.14 1.954 0 2.254a1.5 1.5 0 00-.95 2.282c.574.988-.58 2.142-1.568 1.568a1.5 1.5 0 00-2.282.95c-.3 1.14-1.954 1.14-2.254 0a1.5 1.5 0 00-2.282-.95c-.988.574-2.142-.58-1.568-1.568a1.5 1.5 0 00-.95-2.282c-1.14-.3-1.14-1.954 0-2.254a1.5 1.5 0 00.95-2.283c-.574-.988.58-2.141 1.568-1.567a1.5 1.5 0 002.282-.95z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="relative border-b border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur-lg">
        <div className="absolute inset-x-0 -top-16 h-32 bg-gradient-to-r from-primary-500/10 via-primary-300/10 to-primary-500/10 blur-3xl opacity-70 pointer-events-none" />
        <div className="relative mx-auto flex h-20 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Issue 問題管理系統</h1>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary-500">Service Desk Suite</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 rounded-full bg-white/80 px-1 py-1 shadow-sm shadow-primary-200/40">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm shadow-primary-400/40'
                      : 'text-slate-600 hover:text-primary-600'
                  }`}
                >
                  <span
                    className={`transition-transform duration-200 ${
                      isActive ? 'scale-105' : 'group-hover:scale-105 group-hover:text-primary-500'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {!isActive && (
                    <span className="absolute inset-0 rounded-full bg-primary-50 opacity-0 transition-opacity duration-200 group-hover:opacity-70" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="absolute inset-x-10 -top-20 h-40 rounded-full bg-gradient-to-r from-primary-200/30 via-primary-100/40 to-primary-200/30 blur-3xl opacity-50 pointer-events-none" />
        <div className="relative">{children}</div>
      </main>
    </div>
  )
}

