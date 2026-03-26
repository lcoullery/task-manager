/**
 * Authentication Controller
 *
 * This file handles all authentication endpoints:
 * - Login (create tokens)
 * - Logout (revoke tokens)
 * - Refresh tokens (get new access token)
 * - Get current user info
 * - Accept invitations (register via invite link)
 *
 * Security features:
 * - Password hashing with bcrypt
 * - JWT tokens (access + refresh)
 * - Token revocation on logout
 * - Rate limiting (via middleware)
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  calculateExpiration
} = require('../utils/jwt');
const {
  findUserByEmail,
  findUserById,
  createUser,
  updateLastLogin,
  storeRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  findInvitation,
  markInvitationUsed,
  countUsers
} = require('../db/users');

/**
 * POST /api/auth/login
 *
 * Login with email and password.
 * Returns access token (1h) and refresh token (7d).
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 *
 * Response:
 * {
 *   "accessToken": "eyJhbGc...",
 *   "refreshToken": "eyJhbGc...",
 *   "user": { "id": "...", "email": "...", "name": "...", "role": "..." }
 * }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = findUserByEmail(email);

    if (!user) {
      // Don't reveal whether email exists (security)
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Contact an administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = hashToken(refreshTokenValue);

    // Store refresh token in database
    const expiresAt = calculateExpiration('7d');
    const tokenId = storeRefreshToken(user.id, refreshTokenHash, expiresAt);

    // Create JWT refresh token
    const refreshToken = generateRefreshToken(user.id, tokenId);

    // Update last login timestamp
    updateLastLogin(user.id);

    // Return tokens and user info (without password!)
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred during login'
    });
  }
}

/**
 * POST /api/auth/refresh
 *
 * Get a new access token using a refresh token.
 * This is called automatically when access token expires.
 *
 * Request body:
 * {
 *   "refreshToken": "eyJhbGc..."
 * }
 *
 * Response:
 * {
 *   "accessToken": "eyJhbGc..."
 * }
 */
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Refresh token is required'
      });
    }

    // Verify JWT signature and expiration
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid token',
        message: error.message
      });
    }

    // Check if token exists in database and is not revoked
    const tokenHash = hashToken(refreshToken);
    const storedToken = findRefreshToken(tokenHash);

    if (!storedToken) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Refresh token not found or has been revoked'
      });
    }

    // Check if token is expired (double-check)
    if (new Date(storedToken.expires_at) < new Date()) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Refresh token has expired. Please log in again.'
      });
    }

    // Get user
    const user = findUserById(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Your account no longer exists or has been disabled'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while refreshing token'
    });
  }
}

/**
 * POST /api/auth/logout
 *
 * Logout by revoking the refresh token.
 * Access token will naturally expire (can't revoke JWT).
 *
 * Request body:
 * {
 *   "refreshToken": "eyJhbGc..."
 * }
 *
 * Response:
 * {
 *   "message": "Logged out successfully"
 * }
 */
async function logout(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Refresh token is required'
      });
    }

    // Revoke token
    const tokenHash = hashToken(refreshToken);
    const revoked = revokeRefreshToken(tokenHash);

    if (!revoked) {
      // Token not found, but that's okay (maybe already revoked)
      return res.json({ message: 'Logged out successfully' });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred during logout'
    });
  }
}

/**
 * POST /api/auth/logout-all
 *
 * Logout from all devices by revoking all refresh tokens.
 * Requires authentication (access token).
 *
 * Response:
 * {
 *   "message": "Logged out from all devices",
 *   "count": 3
 * }
 */
async function logoutAll(req, res) {
  try {
    // req.user is added by authenticateJWT middleware
    const userId = req.user.id;

    // Revoke all tokens for this user
    const count = revokeAllUserTokens(userId);

    res.json({
      message: 'Logged out from all devices',
      count
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred during logout'
    });
  }
}

/**
 * GET /api/auth/me
 *
 * Get current user info.
 * Requires authentication (access token).
 *
 * Response:
 * {
 *   "id": "...",
 *   "email": "...",
 *   "name": "...",
 *   "role": "..."
 * }
 */
function getCurrentUser(req, res) {
  // req.user is added by authenticateJWT middleware
  res.json(req.user);
}

/**
 * POST /api/auth/accept-invite
 *
 * Accept an invitation and create account.
 * This is the ONLY way for non-admins to create accounts.
 *
 * Request body:
 * {
 *   "token": "abc123...",
 *   "password": "newPassword123"
 * }
 *
 * Response:
 * {
 *   "accessToken": "eyJhbGc...",
 *   "refreshToken": "eyJhbGc...",
 *   "user": { ... }
 * }
 */
async function acceptInvite(req, res) {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Token and password are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters'
      });
    }

    // Find invitation
    const tokenHash = hashToken(token);
    const invitation = findInvitation(tokenHash);

    if (!invitation) {
      return res.status(404).json({
        error: 'Invalid invite',
        message: 'Invitation not found, expired, or already used'
      });
    }

    // Check if user already exists
    const existingUser = findUserByEmail(invitation.email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = createUser({
      email: invitation.email,
      password_hash,
      name: invitation.name,
      role: invitation.role
    });

    // Mark invitation as used
    markInvitationUsed(invitation.id);

    // Generate tokens and log user in
    const accessToken = generateAccessToken(user);
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = hashToken(refreshTokenValue);

    const expiresAt = calculateExpiration('7d');
    const tokenId = storeRefreshToken(user.id, refreshTokenHash, expiresAt);

    const refreshToken = generateRefreshToken(user.id, tokenId);

    // Return tokens and user info
    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while creating your account'
    });
  }
}

/**
 * POST /api/auth/first-admin
 *
 * Create the first admin user (only works if no users exist).
 * This is used during initial setup only.
 *
 * Request body:
 * {
 *   "email": "admin@example.com",
 *   "password": "password123",
 *   "name": "Admin User"
 * }
 */
async function createFirstAdmin(req, res) {
  try {
    // Check if any users exist
    const userCount = countUsers();

    if (userCount > 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Users already exist. Use invite system to add more users.'
      });
    }

    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Email, password, and name are required'
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create admin user
    const user = createUser({
      email,
      password_hash,
      name,
      role: 'admin'
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = hashToken(refreshTokenValue);

    const expiresAt = calculateExpiration('7d');
    const tokenId = storeRefreshToken(user.id, refreshTokenHash, expiresAt);

    const refreshToken = generateRefreshToken(user.id, tokenId);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      message: 'First admin user created successfully'
    });
  } catch (error) {
    console.error('Create first admin error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while creating admin user'
    });
  }
}

// Export all controller functions
module.exports = {
  login,
  refresh,
  logout,
  logoutAll,
  getCurrentUser,
  acceptInvite,
  createFirstAdmin
};
