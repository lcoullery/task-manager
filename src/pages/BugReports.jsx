import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import api from '../utils/api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function BugReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const data = await api.get('/api/bug-reports');
      setReports(data.bugReports || []);
    } catch (err) {
      console.error('Failed to load bug reports:', err);
      setError(t('bugReport.loadError', 'Failed to load bug reports'));
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(report) {
    const newStatus = report.status === 'open' ? 'resolved' : 'open';
    setUpdating(report.id);
    try {
      await api.put(`/api/bug-reports/${report.id}`, { status: newStatus });
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error('Failed to update bug report:', err);
    } finally {
      setUpdating(null);
    }
  }

  const filtered = reports.filter(r => {
    if (filter === 'open') return r.status === 'open';
    if (filter === 'resolved') return r.status === 'resolved';
    return true;
  });

  const openCount = reports.filter(r => r.status === 'open').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bug className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('bugReport.title', 'Bug Reports')}
          </h1>
          {openCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
              {openCount} {t('bugReport.open', 'open')}
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {[
          { key: 'all', label: t('bugReport.filterAll', 'All') },
          { key: 'open', label: t('bugReport.filterOpen', 'Open') },
          { key: 'resolved', label: t('bugReport.filterResolved', 'Resolved') },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>{t('bugReport.noReports', 'No bug reports')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(report => (
            <div
              key={report.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border transition-colors ${
                report.status === 'open'
                  ? 'border-orange-200 dark:border-orange-900/50'
                  : 'border-gray-200 dark:border-gray-700 opacity-75'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: report.user_color || '#6B7280' }}
                    title={report.user_name}
                  >
                    {getInitials(report.user_name)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {report.user_name || t('common.unknown', 'Unknown')}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(report.created_at)}</span>
                      {report.route && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                          {report.route}
                        </span>
                      )}
                      {report.status === 'open' ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {t('bugReport.open', 'open')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                          <CheckCircle className="w-2.5 h-2.5" />
                          {t('bugReport.resolved', 'resolved')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {report.description}
                    </p>
                  </div>

                  {/* Toggle status button */}
                  <button
                    onClick={() => toggleStatus(report)}
                    disabled={updating === report.id}
                    title={report.status === 'open' ? t('bugReport.markResolved', 'Mark as resolved') : t('bugReport.reopen', 'Reopen')}
                    className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                      report.status === 'open'
                        ? 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                    } disabled:opacity-50`}
                  >
                    {report.status === 'open'
                      ? <CheckCircle className="w-4 h-4" />
                      : <Circle className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
