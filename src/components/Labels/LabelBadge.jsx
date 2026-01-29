import { X } from 'lucide-react'
import { LABEL_COLORS } from '../../utils/colors'

export function LabelBadge({ label, onRemove, size = 'sm' }) {
  const colors = LABEL_COLORS[label.color] || LABEL_COLORS.gray

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colors.bg} ${colors.text} ${sizeClasses[size]}`}
    >
      {label.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(label.id)
          }}
          className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

export function LabelColorDot({ color, selected, onClick }) {
  const colors = LABEL_COLORS[color] || LABEL_COLORS.gray

  return (
    <button
      type="button"
      onClick={() => onClick(color)}
      className={`w-6 h-6 rounded-full ${colors.bg} border-2 transition-all ${
        selected
          ? 'border-gray-900 dark:border-white scale-110'
          : 'border-transparent hover:scale-105'
      }`}
      title={color}
    />
  )
}
