import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useTranslation } from 'react-i18next'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  )
}
