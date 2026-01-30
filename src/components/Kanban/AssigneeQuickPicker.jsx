import { useState, useRef, useEffect } from 'react'
import { UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { ProfileAvatar } from '../Profiles/ProfileCard'

export function AssigneeQuickPicker({ taskId }) {
  const { profiles, updateTask } = useApp()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleTrigger(e) {
    e.stopPropagation()
    setOpen((prev) => !prev)
  }

  function handleSelect(e, profileId) {
    e.stopPropagation()
    updateTask(taskId, { assignedTo: profileId })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleTrigger}
        className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={t('assigneePicker.assignTask')}
      >
        <UserPlus className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 bottom-full mb-1 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1 min-w-[160px]"
        >
          {profiles.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">{t('assigneePicker.noProfiles')}</p>
          ) : (
            profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={(e) => handleSelect(e, profile.id)}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm w-full text-left text-gray-900 dark:text-white"
              >
                <ProfileAvatar profile={profile} size="sm" />
                <span className="truncate">{profile.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
