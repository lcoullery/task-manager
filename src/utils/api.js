/**
 * API Client with JWT Token Management
 *
 * This file creates an axios-like API client that:
 * 1. Automatically adds JWT token to every request
 * 2. Handles token expiration (refreshes automatically)
 * 3. Redirects to login if refresh fails
 *
 * Usage:
 *   import api from './utils/api'
 *   const response = await api.get('/api/users')
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class ApiClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  /**
   * Set tokens after login
   */
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  /**
   * Clear tokens on logout
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('refreshToken');
  }

  /**
   * Get current access token
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      // Refresh failed - clear tokens and throw
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    return data.accessToken;
  }

  /**
   * Make an API request with automatic token handling
   */
  async request(method, url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add JWT token if available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Prepare request options
    const fetchOptions = {
      method,
      headers,
      ...options,
    };

    // Add body if present
    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    // Make request
    let response = await fetch(fullUrl, fetchOptions);

    // If 401 (unauthorized) and we have a refresh token, try to refresh
    if (response.status === 401 && this.refreshToken) {
      try {
        // Try to refresh token
        await this.refreshAccessToken();

        // Retry original request with new token
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(fullUrl, { ...fetchOptions, headers });
      } catch (error) {
        // Refresh failed - redirect to login
        console.error('Token refresh failed:', error);
        this.clearTokens();

        // Emit custom event for auth context to handle
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw error;
      }
    }

    // Parse response
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || data.error || 'API request failed');
      error.response = response;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Convenience methods
   */
  get(url, options) {
    return this.request('GET', url, options);
  }

  post(url, body, options) {
    return this.request('POST', url, { ...options, body });
  }

  put(url, body, options) {
    return this.request('PUT', url, { ...options, body });
  }

  delete(url, options) {
    return this.request('DELETE', url, options);
  }
}

// Export singleton instance
const api = new ApiClient();
export default api;
