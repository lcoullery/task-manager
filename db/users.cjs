/**
 * User Repository
 *
 * This file contains all database operations for users:
 * - Create user
 * - Find user by email/ID
 * - Update user
 * - Delete user
 * - Manage refresh tokens
 * - Manage invitations
 */

const { db } = require('./init.cjs');
const crypto = require('crypto');

// ============================================================================
// USER CRUD OPERATIONS
// ============================================================================

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.password_hash - Hashed password
 * @param {string} userData.name - Display name
 * @param {string} userData.role - User role (admin/member)
 * @returns {Object} Created user (without password hash)
 */
function createUser(userData) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, created_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  stmt.run(
    id,
    userData.email.toLowerCase(), // Normalize email to lowercase
    userData.password_hash,
    userData.name,
    userData.role,
    now
  );

  // Return user without password hash (security!)
  return {
    id,
    email: userData.email.toLowerCase(),
    name: userData.name,
    role: userData.role,
    created_at: now,
    is_active: true
  };
}

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Object|null} User object or null if not found
 */
function findUserByEmail(email) {
  const stmt = db.prepare(`
    SELECT * FROM users WHERE email = ? AND is_active = 1
  `);

  return stmt.get(email.toLowerCase());
}

/**
 * Find user by ID
 * @param {string} id - User ID
 * @returns {Object|null} User object or null if not found
 */
function findUserById(id) {
  const stmt = db.prepare(`
    SELECT * FROM users WHERE id = ? AND is_active = 1
  `);

  return stmt.get(id);
}

/**
 * Get all users (without password hashes)
 * @returns {Array} Array of user objects
 */
function getAllUsers() {
  const stmt = db.prepare(`
    SELECT id, email, name, role, created_at, last_login_at, is_active
    FROM users
    ORDER BY created_at DESC
  `);

  return stmt.all();
}

/**
 * Update user
 * @param {string} id - User ID
 * @param {Object} updates - Fields to update (name, role, is_active)
 * @returns {boolean} True if updated, false if user not found
 */
function updateUser(id, updates) {
  const allowedFields = ['name', 'role', 'is_active'];
  const fields = [];
  const values = [];

  // Build UPDATE query dynamically
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return false; // Nothing to update
  }

  values.push(id); // Add ID for WHERE clause

  const stmt = db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  const result = stmt.run(...values);
  return result.changes > 0;
}

/**
 * Update user's last login timestamp
 * @param {string} id - User ID
 */
function updateLastLogin(id) {
  const stmt = db.prepare(`
    UPDATE users
    SET last_login_at = ?
    WHERE id = ?
  `);

  stmt.run(new Date().toISOString(), id);
}

/**
 * Delete user (soft delete - sets is_active to 0)
 * @param {string} id - User ID
 * @returns {boolean} True if deleted, false if user not found
 */
function deleteUser(id) {
  const stmt = db.prepare(`
    UPDATE users
    SET is_active = 0
    WHERE id = ?
  `);

  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Hard delete user (permanently remove from database)
 * Use with caution! This will cascade delete all related data.
 * @param {string} id - User ID
 * @returns {boolean} True if deleted, false if user not found
 */
function hardDeleteUser(id) {
  const stmt = db.prepare(`
    DELETE FROM users WHERE id = ?
  `);

  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Count total users
 * @returns {number} Number of active users
 */
function countUsers() {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE is_active = 1
  `);

  return stmt.get().count;
}

// ============================================================================
// REFRESH TOKEN OPERATIONS
// ============================================================================

/**
 * Store refresh token
 * @param {string} userId - User ID
 * @param {string} tokenHash - Hashed token
 * @param {Date} expiresAt - Expiration date
 * @returns {string} Token ID
 */
function storeRefreshToken(userId, tokenHash, expiresAt) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked)
    VALUES (?, ?, ?, ?, ?, 0)
  `);

  stmt.run(id, userId, tokenHash, expiresAt.toISOString(), now);

  return id;
}

/**
 * Find refresh token by hash
 * @param {string} tokenHash - Hashed token
 * @returns {Object|null} Token object or null if not found
 */
function findRefreshToken(tokenHash) {
  const stmt = db.prepare(`
    SELECT * FROM refresh_tokens
    WHERE token_hash = ? AND revoked = 0
  `);

  return stmt.get(tokenHash);
}

/**
 * Find refresh token by ID
 * @param {string} tokenId - Token ID
 * @returns {Object|null} Token object or null if not found
 */
function findRefreshTokenById(tokenId) {
  const stmt = db.prepare(`
    SELECT * FROM refresh_tokens
    WHERE id = ? AND revoked = 0
  `);

  return stmt.get(tokenId);
}

/**
 * Revoke refresh token (logout)
 * @param {string} tokenHash - Hashed token
 * @returns {boolean} True if revoked, false if not found
 */
function revokeRefreshToken(tokenHash) {
  const stmt = db.prepare(`
    UPDATE refresh_tokens
    SET revoked = 1
    WHERE token_hash = ?
  `);

  const result = stmt.run(tokenHash);
  return result.changes > 0;
}

/**
 * Revoke all refresh tokens for a user (logout all devices)
 * @param {string} userId - User ID
 * @returns {number} Number of tokens revoked
 */
function revokeAllUserTokens(userId) {
  const stmt = db.prepare(`
    UPDATE refresh_tokens
    SET revoked = 1
    WHERE user_id = ?
  `);

  const result = stmt.run(userId);
  return result.changes;
}

/**
 * Delete expired refresh tokens (cleanup)
 * Run this periodically to keep database clean
 * @returns {number} Number of tokens deleted
 */
function deleteExpiredTokens() {
  const stmt = db.prepare(`
    DELETE FROM refresh_tokens
    WHERE expires_at < ?
  `);

  const result = stmt.run(new Date().toISOString());
  return result.changes;
}

// ============================================================================
// INVITATION OPERATIONS
// ============================================================================

/**
 * Create user invitation
 * @param {Object} inviteData - Invitation data
 * @param {string} inviteData.email - Invited user's email
 * @param {string} inviteData.name - Invited user's name
 * @param {string} inviteData.role - Role to assign
 * @param {string} inviteData.invitedBy - Admin user ID
 * @param {string} inviteData.tokenHash - Hashed invite token
 * @param {Date} inviteData.expiresAt - Expiration date
 * @returns {Object} Created invitation
 */
function createInvitation(inviteData) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO user_invitations (
      id, email, name, role, token_hash, invited_by, created_at, expires_at, used
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  stmt.run(
    id,
    inviteData.email.toLowerCase(),
    inviteData.name,
    inviteData.role,
    inviteData.tokenHash,
    inviteData.invitedBy,
    now,
    inviteData.expiresAt.toISOString()
  );

  return {
    id,
    email: inviteData.email.toLowerCase(),
    name: inviteData.name,
    role: inviteData.role,
    invited_by: inviteData.invitedBy,
    created_at: now,
    expires_at: inviteData.expiresAt.toISOString()
  };
}

/**
 * Find invitation by token hash
 * @param {string} tokenHash - Hashed invite token
 * @returns {Object|null} Invitation or null if not found/expired/used
 */
function findInvitation(tokenHash) {
  const stmt = db.prepare(`
    SELECT * FROM user_invitations
    WHERE token_hash = ?
      AND used = 0
      AND expires_at > ?
  `);

  return stmt.get(tokenHash, new Date().toISOString());
}

/**
 * Mark invitation as used
 * @param {string} id - Invitation ID
 * @returns {boolean} True if marked, false if not found
 */
function markInvitationUsed(id) {
  const stmt = db.prepare(`
    UPDATE user_invitations
    SET used = 1
    WHERE id = ?
  `);

  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Get all pending invitations
 * @returns {Array} Array of pending invitations
 */
function getPendingInvitations() {
  const stmt = db.prepare(`
    SELECT id, email, name, role, invited_by, created_at, expires_at
    FROM user_invitations
    WHERE used = 0 AND expires_at > ?
    ORDER BY created_at DESC
  `);

  return stmt.all(new Date().toISOString());
}

/**
 * Delete expired invitations (cleanup)
 * @returns {number} Number of invitations deleted
 */
function deleteExpiredInvitations() {
  const stmt = db.prepare(`
    DELETE FROM user_invitations
    WHERE expires_at < ?
  `);

  const result = stmt.run(new Date().toISOString());
  return result.changes;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // User operations
  createUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  updateUser,
  updateLastLogin,
  deleteUser,
  hardDeleteUser,
  countUsers,

  // Token operations
  storeRefreshToken,
  findRefreshToken,
  findRefreshTokenById,
  revokeRefreshToken,
  revokeAllUserTokens,
  deleteExpiredTokens,

  // Invitation operations
  createInvitation,
  findInvitation,
  markInvitationUsed,
  getPendingInvitations,
  deleteExpiredInvitations
};
