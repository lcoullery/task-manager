import { Pencil, Trash2 } from 'lucide-react'
import { getInitials } from '../../utils/colors'

export function ProfileCard({ profile, onEdit, onDelete }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
        style={{ backgroundColor: profile.color }}
      >
        {getInitials(profile.name)}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-white truncate">
          {profile.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Created {new Date(profile.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(profile)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Edit profile"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(profile)}
          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Delete profile"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function ProfileAvatar({ profile, size = 'md' }) {
  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }

  if (!profile) {
    return (
      <div className={`${sizes[size]} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500`}>
        ?
      </div>
    )
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-medium`}
      style={{ backgroundColor: profile.color }}
      title={profile.name}
    >
      {getInitials(profile.name)}
    </div>
  )
}
