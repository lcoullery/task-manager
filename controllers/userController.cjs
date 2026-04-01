/**
 * User Management Controller (Admin Only)
 *
 * This file handles user management endpoints:
 * - List all users
 * - Invite new users (send email)
 * - Update user (change role, name)
 * - Disable/enable user
 * - Delete user
 * - List pending invitations
 *
 * Security: All endpoints require admin role
 */

const bcrypt = require('bcrypt');
const {
  getAllUsers,
  updateUser,
  deleteUser,
  createInvitation,
  getPendingInvitations,
  deleteInvitation,
  findUserByEmail,
  findUserById,
  createPasswordReset,
  updatePassword
} = require('../db/users.cjs');
const { generateInviteToken, hashToken, calculateExpiration } = require('../utils/jwt.cjs');
const { sendInviteEmail, sendPasswordResetEmail } = require('../utils/email.cjs');

/**
 * GET /api/users
 *
 * Get all users (admin only).
 * Returns list of users without password hashes.
 *
 * Response:
 * {
 *   "users": [
 *     { "id": "...", "email": "...", "name": "...", "role": "...", ... }
 *   ],
 *   "total": 5
 * }
 */
function listUsers(req, res) {
  try {
    const users = getAllUsers();

    res.json({
      users,
      total: users.length
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch users'
    });
  }
}

/**
 * POST /api/users/invite
 *
 * Invite a new user by email (admin only).
 * Sends an email with an invite link.
 *
 * Request body:
 * {
 *   "email": "newuser@example.com",
 *   "name": "New User",
 *   "role": "member"  // or "admin"
 * }
 *
 * Response:
 * {
 *   "message": "Invitation sent successfully",
 *   "invitation": { "id": "...", "email": "...", "expires_at": "..." },
 *   "inviteUrl": "https://yoursite.com/accept-invite/abc123..."
 * }
 */
async function inviteUser(req, res) {
  try {
    const { email, name, role, color } = req.body;

    // Validate input
    if (!email || !name || !role) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Email, name, and role are required'
      });
    }

    // Default color if not provided
    const userColor = color || '#3B82F6';

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be "admin" or "member"'
      });
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User exists',
        message: 'A user with this email already exists'
      });
    }

    // Generate invite token
    const token = generateInviteToken();
    const tokenHash = hashToken(token);

    // Create invitation (expires in 48 hours)
    const expiresAt = calculateExpiration('48h');
    const invitation = createInvitation({
      email,
      name,
      color: userColor, // Avatar color
      role,
      tokenHash,
      invitedBy: req.user.id, // Admin who sent invite
      expiresAt
    });

    // Build invite URL dynamically from request (works on localhost and VPS behind reverse proxy)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const inviteUrl = `${protocol}://${host}/accept-invite/${token}`;

    // Send invite email
    let emailSent = false;
    try {
      await sendInviteEmail({
        to: email,
        name,
        inviteUrl,
        invitedBy: req.user.name,
        expiresAt
      });
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // Continue anyway - admin can manually share the link
    }

    res.status(201).json({
      message: emailSent ? 'Invitation sent successfully' : 'Invitation created, email failed',
      emailSent,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        expires_at: invitation.expires_at
      },
      inviteUrl: emailSent ? undefined : inviteUrl // Only show URL if email failed
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create invitation'
    });
  }
}

/**
 * GET /api/users/invitations
 *
 * Get all pending invitations (admin only).
 *
 * Response:
 * {
 *   "invitations": [
 *     { "id": "...", "email": "...", "name": "...", "role": "...", ... }
 *   ],
 *   "total": 3
 * }
 */
function listInvitations(req, res) {
  try {
    const invitations = getPendingInvitations();

    res.json({
      invitations,
      total: invitations.length
    });
  } catch (error) {
    console.error('List invitations error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch invitations'
    });
  }
}

/**
 * PUT /api/users/:id
 *
 * Update a user (admin only).
 * Can update: name, role, is_active.
 *
 * Request body:
 * {
 *   "name": "Updated Name",
 *   "role": "admin",
 *   "is_active": true
 * }
 *
 * Response:
 * {
 *   "message": "User updated successfully"
 * }
 */
function updateUserById(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate that at least one field is provided
    const allowedFields = ['name', 'role', 'is_active'];
    const hasValidField = Object.keys(updates).some(key => allowedFields.includes(key));

    if (!hasValidField) {
      return res.status(400).json({
        error: 'No valid fields',
        message: 'Provide at least one field to update (name, role, is_active)'
      });
    }

    // Validate role if provided
    if (updates.role && !['admin', 'member'].includes(updates.role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be "admin" or "member"'
      });
    }

    // Prevent admin from disabling themselves
    if (updates.is_active === false && id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot disable self',
        message: 'You cannot disable your own account'
      });
    }

    // Update user
    const success = updateUser(id, updates);

    if (!success) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to update user'
    });
  }
}

/**
 * DELETE /api/users/:id
 *
 * Delete (disable) a user (admin only).
 * This is a soft delete - sets is_active = 0.
 *
 * Response:
 * {
 *   "message": "User deleted successfully"
 * }
 */
function deleteUserById(req, res) {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete self',
        message: 'You cannot delete your own account'
      });
    }

    // Delete user (soft delete)
    const success = deleteUser(id);

    if (!success) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete user'
    });
  }
}

/**
 * DELETE /api/users/invitations/:id
 *
 * Cancel a pending invitation (admin only).
 */
function cancelInvitation(req, res) {
  try {
    const { id } = req.params;
    const success = deleteInvitation(id);

    if (!success) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Invitation not found or already used'
      });
    }

    res.json({ message: 'Invitation cancelled' });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to cancel invitation'
    });
  }
}

/**
 * POST /api/users/:id/reset-password
 *
 * Send a password reset email to a user (admin only).
 * Generates a reset token and sends an email with a link.
 */
async function resetUserPassword(req, res) {
  try {
    const { id } = req.params;

    const user = findUserById(id);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    // Generate reset token (reuse invite token generation)
    const token = generateInviteToken();
    const tokenHash = hashToken(token);
    const expiresAt = calculateExpiration('24h');

    // Store reset token
    createPasswordReset(user.id, tokenHash, expiresAt);

    // Build reset URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const resetUrl = `${protocol}://${host}/reset-password/${token}`;

    // Send email
    let emailSent = false;
    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresAt
      });
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }

    res.json({
      message: emailSent ? 'Password reset email sent' : 'Reset created, email failed',
      emailSent,
      resetUrl: emailSent ? undefined : resetUrl
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to reset password'
    });
  }
}

// Export all controller functions
module.exports = {
  listUsers,
  inviteUser,
  listInvitations,
  cancelInvitation,
  resetUserPassword,
  updateUserById,
  deleteUserById
};
