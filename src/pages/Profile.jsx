import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import api from '../utils/api';
import { getInitials } from '../utils/colors';

export default function Profile() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [color, setColor] = useState(user?.color || '#3B82F6');
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileMessage(null);
    setProfileLoading(true);

    try {
      await api.put('/api/auth/profile', { name, color });
      await refreshUser();
      setProfileMessage({ type: 'success', text: t('profile.profileUpdated', 'Profile updated successfully') });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.data?.message || t('profile.profileError', 'Failed to update profile') });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: t('profile.passwordTooShort', 'New password must be at least 8 characters') });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: t('profile.passwordMismatch', 'New passwords do not match') });
      return;
    }

    setPasswordLoading(true);

    try {
      await api.put('/api/auth/password', { currentPassword, newPassword });
      setPasswordMessage({ type: 'success', text: t('profile.passwordChanged', 'Password changed successfully') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.data?.message || t('profile.passwordError', 'Failed to change password') });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t('profile.title', 'My Profile')}
      </h1>

      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('profile.info', 'Profile Information')}
        </h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.email', 'Email')}
            </label>
            <p className="text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              {user?.email}
            </p>
          </div>

          {/* Name */}
          <Input
            label={t('profile.name', 'Display Name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.color', 'Avatar Color')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
              />
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: color }}
              >
                {getInitials(name)}
              </div>
            </div>
          </div>

          {/* Message */}
          {profileMessage && (
            <div className={`rounded-lg p-4 border ${
              profileMessage.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}>
              <p className="text-sm">{profileMessage.text}</p>
            </div>
          )}

          <Button type="submit" variant="primary" disabled={profileLoading}>
            {profileLoading
              ? t('profile.saving', 'Saving...')
              : t('profile.saveProfile', 'Save Profile')}
          </Button>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('profile.changePassword', 'Change Password')}
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label={t('profile.currentPassword', 'Current Password')}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Input
            label={t('profile.newPassword', 'New Password')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('profile.newPasswordPlaceholder', 'Min. 8 characters')}
            required
            autoComplete="new-password"
          />

          <Input
            label={t('profile.confirmNewPassword', 'Confirm New Password')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          {/* Message */}
          {passwordMessage && (
            <div className={`rounded-lg p-4 border ${
              passwordMessage.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}>
              <p className="text-sm">{passwordMessage.text}</p>
            </div>
          )}

          <Button type="submit" variant="primary" disabled={passwordLoading}>
            {passwordLoading
              ? t('profile.changingPassword', 'Changing...')
              : t('profile.changePasswordButton', 'Change Password')}
          </Button>
        </form>
      </div>
    </div>
  );
}
