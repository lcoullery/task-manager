/**
 * JWT Utilities
 *
 * This file handles:
 * 1. Generating access tokens (short-lived, 1 hour)
 * 2. Generating refresh tokens (long-lived, 7 days)
 * 3. Verifying tokens
 * 4. Hashing tokens for storage
 *
 * What are JWT tokens?
 * JWT (JSON Web Token) is like a digital ID badge. It contains:
 * - Who you are (userId, email, role)
 * - When it was issued
 * - When it expires
 * - A signature (proves it's authentic and hasn't been tampered with)
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Get JWT secret from environment variable
// This is like a master key - keep it secret!
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '1h';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d';

// Warn if using default secret (security risk!)
if (JWT_SECRET === 'CHANGE_THIS_SECRET_IN_PRODUCTION') {
  console.warn('⚠️  WARNING: Using default JWT secret! Generate a secure secret for production.');
  console.warn('   Run: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}

/**
 * Generate access token
 *
 * Access tokens are short-lived (1 hour) and sent with every API request.
 * They contain the user's ID, email, and role.
 *
 * @param {Object} user - User object
 * @param {string} user.id - User ID
 * @param {string} user.email - User email
 * @param {string} user.role - User role (admin/member)
 * @returns {string} JWT access token
 */
function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'task-manager',
    audience: 'task-manager-api'
  });
}

/**
 * Generate refresh token
 *
 * Refresh tokens are long-lived (7 days) and used to get new access tokens.
 * They're stored in the database so we can revoke them (logout).
 *
 * @param {string} userId - User ID
 * @param {string} tokenId - Token ID (from database)
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(userId, tokenId) {
  const payload = {
    userId,
    tokenId,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'task-manager',
    audience: 'task-manager-api'
  });
}

/**
 * Verify access token
 *
 * Checks if a token is valid and not expired.
 * Returns the decoded payload (userId, email, role).
 *
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'task-manager',
      audience: 'task-manager-api'
    });

    // Check token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Verify refresh token
 *
 * Checks if a refresh token is valid and not expired.
 * Returns the decoded payload (userId, tokenId).
 *
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'task-manager',
      audience: 'task-manager-api'
    });

    // Check token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Hash a token for storage
 *
 * We hash tokens before storing them in the database (like passwords).
 * This way, if someone steals the database, they can't use the tokens.
 *
 * @param {string} token - Token to hash
 * @returns {string} SHA256 hash of token
 */
function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Generate invite token
 *
 * Creates a random token for user invitations.
 * This is NOT a JWT - it's a random string.
 *
 * @returns {string} Random invite token (32 bytes hex)
 */
function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate token expiration date
 *
 * @param {string} duration - Duration string (e.g., '7d', '1h', '48h')
 * @returns {Date} Expiration date
 */
function calculateExpiration(duration) {
  const now = new Date();

  // Parse duration string (e.g., '7d', '1h', '48h')
  const match = duration.match(/^(\d+)([dhm])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd': // days
      now.setDate(now.getDate() + value);
      break;
    case 'h': // hours
      now.setHours(now.getHours() + value);
      break;
    case 'm': // minutes
      now.setMinutes(now.getMinutes() + value);
      break;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }

  return now;
}

/**
 * Decode token without verification
 * Useful for debugging or extracting info from expired tokens
 *
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
function decodeToken(token) {
  return jwt.decode(token);
}

// Export all functions
module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateInviteToken,
  calculateExpiration,
  decodeToken
};
