import { Sparkles, X, CheckCircle } from 'lucide-react';

export function WhatsNewModal({ version, changes, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-5 animate-slide-in-right">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Nouveautés · v{version}
          </h2>
        </div>

        <ul className="flex flex-col gap-1.5 mb-4">
          {changes.map((change, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              {change}
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="w-full py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          C'est parti !
        </button>
      </div>
    </div>
  );
}
