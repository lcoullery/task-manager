import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, GanttChart, Users, Settings, Calendar, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

const navItems = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/list', labelKey: 'nav.list', icon: List },
  { to: '/gantt', labelKey: 'nav.gantt', icon: GanttChart },
  { to: '/workload', labelKey: 'nav.workload', icon: Calendar },
  { to: '/notebook', labelKey: 'nav.notebook', icon: BookOpen },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

export function Navbar() {
  const { t } = useTranslation()

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <img src="/logo.PNG" alt="Logo" className="h-8 w-auto hidden dark:block" />
          <img src="/logo_light.PNG" alt="Logo" className="h-8 w-auto dark:hidden" />
          <div className="flex items-center gap-1">
            {navItems.map(({ to, labelKey, icon: Icon }) => (
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
                {t(labelKey)}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
