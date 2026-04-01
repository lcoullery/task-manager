import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import api from '../utils/api';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('resetPassword.passwordTooShort', 'Password must be at least 8 characters'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch', 'Passwords do not match'));
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      const message = err.data?.message || err.message || t('resetPassword.genericError', 'Failed to reset password');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('nav.appTitle', 'Task Manager')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('resetPassword.subtitle', 'Set your new password')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  {t('resetPassword.success', 'Password reset successfully! Redirecting to login...')}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label={t('resetPassword.newPassword', 'New Password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('resetPassword.passwordPlaceholder', 'Choose a new password (min. 8 characters)')}
                required
                autoComplete="new-password"
                autoFocus
              />

              <Input
                label={t('resetPassword.confirmPassword', 'Confirm Password')}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('resetPassword.confirmPlaceholder', 'Confirm your new password')}
                required
                autoComplete="new-password"
              />

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading
                  ? t('resetPassword.resetting', 'Resetting...')
                  : t('resetPassword.submit', 'Reset Password')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
