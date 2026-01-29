import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, Users, Settings } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/list', label: 'List', icon: List },
  { to: '/profiles', label: 'Profiles', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Navbar() {
  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Task Manager
          </h1>
          <div className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
        <ThemeToggle />
      </div>
    </nav>
  )
}
