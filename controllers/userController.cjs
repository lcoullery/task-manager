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
  findUserByEmail
} = require('../db/users');
const { generateInviteToken, hashToken, calculateExpiration } = require('../utils/jwt');
const { sendInviteEmail } = require('../utils/email');

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
    const { email, name, role } = req.body;

    // Validate input
    if (!email || !name || !role) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'Email, name, and role are required'
      });
    }

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
      role,
      tokenHash,
      invitedBy: req.user.id, // Admin who sent invite
      expiresAt
    });

    // Build invite URL
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:5173'}/accept-invite/${token}`;

    // Send invite email
    try {
      await sendInviteEmail({
        to: email,
        name,
        inviteUrl,
        invitedBy: req.user.name,
        expiresAt
      });
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // Continue anyway - admin can manually share the link
    }

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        expires_at: invitation.expires_at
      },
      inviteUrl // Return URL so admin can manually share if email fails
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

// Export all controller functions
module.exports = {
  listUsers,
  inviteUser,
  listInvitations,
  updateUserById,
  deleteUserById
};
