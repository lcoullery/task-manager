import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Trash2, Clock, Mail, Shield, X, KeyRound } from 'lucide-react';
import api from '../utils/api';
import InviteModal from '../components/Users/InviteModal';
import { getInitials } from '../utils/colors';

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // getInitials imported from utils/colors

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [usersData, invitationsData] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/users/invitations'),
      ]);
      setUsers((usersData.users || []).filter(u => u.is_active));
      setInvitations(invitationsData.invitations || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteSuccess() {
    setShowInviteModal(false);
    await loadData();
  }

  async function handleCancelInvitation(invId) {
    if (!confirm(t('users.confirmCancelInvite', 'Cancel this invitation?'))) return;

    try {
      await api.delete(`/api/users/invitations/${invId}`);
      setInvitations(invitations.filter(i => i.id !== invId));
    } catch (err) {
      setError(err.message || 'Failed to cancel invitation');
    }
  }

  async function handleResetPassword(userId) {
    if (!confirm(t('users.confirmResetPassword', 'Send a password reset email to this user?'))) return;

    try {
      const result = await api.post(`/api/users/${userId}/reset-password`);
      if (result.resetUrl) {
        // Email failed, show URL
        prompt(t('users.copyResetLink', 'Email failed. Copy this reset link:'), result.resetUrl);
      } else {
        alert(t('users.resetEmailSent', 'Password reset email sent!'));
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    }
  }

  async function handleDeleteUser(user) {
    if (!confirm(t('users.confirmDelete', 'Delete {{email}}? This cannot be undone.', { email: user.email }))) return;

    try {
      setDeleting(user.id);
      await api.delete(`/api/users/${user.id}`);
      setUsers(users.filter(u => u.id !== user.id));
    } catch (err) {
      setError(err.message || 'Failed to delete user');
      console.error('Error deleting user:', err);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('users.title')}
          </h1>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('users.inviteUser')}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {/* Avatar column */}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t('users.userName')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t('users.userEmail')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t('users.userRole')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t('users.lastLogin')}
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    {t('users.noUsers')}
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                        style={{ backgroundColor: user.color || '#3B82F6' }}
                        title={user.name}
                      >
                        {getInitials(user.name)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.role === 'admin' ? t('users.roleAdmin') : t('users.roleMember')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                        <Clock className="w-4 h-4" />
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.is_active ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                            title={t('users.resetPassword', 'Reset password')}
                          >
                            <KeyRound className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={deleting === user.id}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('users.pendingInvitations')}
          </h2>
          <div className="space-y-3">
            {invitations.map(inv => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{inv.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{inv.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {t('users.expiresIn', { time: `${Math.ceil((new Date(inv.expires_at) - new Date()) / (1000 * 60 * 60))}h` })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400 rounded-full text-sm font-medium">
                    {t('users.pending')}
                  </span>
                  <button
                    onClick={() => handleCancelInvitation(inv.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title={t('users.cancelInvite', 'Cancel invitation')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  );
}
