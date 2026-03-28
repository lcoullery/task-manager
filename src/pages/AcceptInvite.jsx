import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import api from '../utils/api';

export default function AcceptInvite() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('acceptInvite.passwordTooShort', 'Password must be at least 8 characters'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('acceptInvite.passwordMismatch', 'Passwords do not match'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/api/auth/accept-invite', { token, password });

      // Auto-login with returned tokens
      api.setTokens(response.accessToken, response.refreshToken);

      // Redirect to dashboard
      navigate('/', { replace: true });
    } catch (err) {
      const message = err.data?.message || err.message || t('acceptInvite.genericError', 'Failed to create account');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('nav.appTitle', 'Task Manager')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('acceptInvite.subtitle', 'Create your account to get started')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password */}
            <Input
              label={t('acceptInvite.password', 'Password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('acceptInvite.passwordPlaceholder', 'Choose a password (min. 8 characters)')}
              required
              autoComplete="new-password"
              autoFocus
            />

            {/* Confirm Password */}
            <Input
              label={t('acceptInvite.confirmPassword', 'Confirm Password')}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('acceptInvite.confirmPasswordPlaceholder', 'Confirm your password')}
              required
              autoComplete="new-password"
            />

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading
                ? t('acceptInvite.creating', 'Creating account...')
                : t('acceptInvite.submit', 'Create Account')}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>{t('acceptInvite.footer', 'You were invited to join this workspace')}</p>
        </div>
      </div>
    </div>
  );
}
