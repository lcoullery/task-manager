/**
 * Authentication Context
 *
 * Manages user authentication state and provides:
 * - login/logout functions
 * - current user info
 * - authentication status
 * - automatic token refresh handling
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Check if user is authenticated (has valid refresh token)
   * Try to load user info on mount
   */
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Listen for auth:logout events from API client
   * (triggered when token refresh fails)
   */
  useEffect(() => {
    const handleAutoLogout = () => {
      console.log('Auto-logout triggered by API client');
      handleLogout(false); // Don't call API, just clear state
    };

    window.addEventListener('auth:logout', handleAutoLogout);
    return () => window.removeEventListener('auth:logout', handleAutoLogout);
  }, []);

  /**
   * Check authentication status
   * Attempts to load user info if refresh token exists
   */
  async function checkAuth() {
    try {
      // Check if refresh token exists
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }

      // Try to get current user (will auto-refresh if needed)
      const userData = await api.get('/api/auth/me');
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid tokens
      api.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Login with email and password
   */
  async function login(email, password) {
    try {
      const response = await api.post('/api/auth/login', { email, password });

      // Store tokens
      api.setTokens(response.accessToken, response.refreshToken);

      // Set user in state
      setUser(response.user);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);

      // Extract error message
      let message = 'Invalid email or password';
      if (error.data?.message) {
        message = error.data.message;
      } else if (error.message) {
        message = error.message;
      }

      // Check for rate limiting
      if (error.data?.error === 'Too many attempts') {
        message = error.data.message;
      }

      return { success: false, error: message };
    }
  }

  /**
   * Logout user
   */
  async function logout(callApi = true) {
    try {
      if (callApi) {
        // Try to revoke refresh token on server
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          await api.post('/api/auth/logout', { refreshToken });
        }
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API fails
    } finally {
      // Clear tokens and user state
      api.clearTokens();
      setUser(null);

      // Redirect to login
      navigate('/login', { replace: true });
    }
  }

  /**
   * Handle logout (can be called from event listener)
   */
  const handleLogout = useCallback((callApi = true) => {
    logout(callApi);
  }, [navigate]);

  /**
   * Refresh user data from server
   */
  async function refreshUser() {
    try {
      const userData = await api.get('/api/auth/me');
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Refresh user failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has specific role
   */
  function hasRole(role) {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }

  /**
   * Check if user is authenticated
   */
  function isAuthenticated() {
    return !!user;
  }

  const value = {
    // State
    user,
    isLoading,
    isAuthenticated: isAuthenticated(),

    // Actions
    login,
    logout: handleLogout,
    refreshUser,

    // Utilities
    hasRole,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
