import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send } from 'lucide-react';
import api from '../../utils/api';

export default function InviteModal({ onClose, onSuccess }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    color: '#3B82F6', // Default blue
    role: 'member',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate
    if (!formData.name.trim()) {
      setError(t('users.nameRequired'));
      return;
    }
    if (!formData.email.trim()) {
      setError(t('users.emailRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError(t('users.invalidEmail'));
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/users/invite', {
        name: formData.name,
        email: formData.email,
        color: formData.color,
        role: formData.role,
      });

      setSuccess(true);
      setFormData({ name: '', email: '', color: '#3B82F6', role: 'member' });

      // If invite URL is returned (email not configured), show it to admin
      if (response.inviteUrl) {
        setInviteUrl(response.inviteUrl);
      } else {
        // Only auto-close if email was sent
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || t('users.inviteFailed'));
      console.error('Error inviting user:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('users.inviteUser')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {success && !inviteUrl && (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded text-green-600 dark:text-green-400 text-sm">
              {t('users.inviteSent')}
            </div>
          )}

          {/* Invite URL (when email is not configured) */}
          {inviteUrl && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded space-y-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {t('users.emailNotConfigured')}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {t('users.copyInviteLinkManually')}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-700 rounded text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    alert(t('users.inviteLinkCopied'));
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  {t('users.copy')}
                </button>
              </div>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('users.userName')}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Color Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('users.avatarColor')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                disabled={loading}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formData.color}
              </span>
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('users.userEmail')}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Role Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('users.userRole')}
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="member">{t('users.roleMember')}</option>
              <option value="admin">{t('users.roleAdmin')}</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {loading ? t('common.loading') : t('common.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
