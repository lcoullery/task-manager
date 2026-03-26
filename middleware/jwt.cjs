/**
 * JWT Authentication & Authorization Middleware
 *
 * This file contains middleware functions that:
 * 1. Check if user is logged in (has valid token)
 * 2. Check if user has permission to access a route (role check)
 *
 * What is middleware?
 * Middleware is like a security guard at a building entrance.
 * Before letting someone in, they:
 * - Check their ID badge (authenticate)
 * - Check if they're allowed in this area (authorize)
 */

const { verifyAccessToken } = require('../utils/jwt');
const { findUserById } = require('../db/users');

/**
 * Authentication middleware
 *
 * This checks if the request has a valid access token.
 * If valid, it adds the user object to req.user.
 * If invalid, it returns a 401 Unauthorized error.
 *
 * Usage in routes:
 * app.get('/api/protected', authenticateJWT, (req, res) => {
 *   // req.user is now available
 *   res.json({ message: `Hello ${req.user.email}` });
 * });
 */
function authenticateJWT(req, res, next) {
  // Get token from Authorization header
  // Format: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'No token provided',
      message: 'Please log in to access this resource'
    });
  }

  // Extract token from "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Invalid token format',
      message: 'Authorization header must be "Bearer <token>"'
    });
  }

  const token = parts[1];

  try {
    // Verify token and decode payload
    const decoded = verifyAccessToken(token);

    // Check if user still exists and is active
    const user = findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Your account no longer exists'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }

    // Add user to request object (without password hash!)
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    if (error.message === 'Token expired') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional authentication middleware
 *
 * Like authenticateJWT, but doesn't fail if no token is provided.
 * Useful for routes that work differently for logged-in users.
 *
 * Example:
 * - Logged in: See full dashboard
 * - Not logged in: See limited public view
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    req.user = null;
    return next();
  }

  const token = parts[1];

  try {
    const decoded = verifyAccessToken(token);
    const user = findUserById(decoded.userId);

    if (user && user.is_active) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }

  next();
}

/**
 * Authorization middleware (role-based)
 *
 * This checks if the user has a specific role.
 * Must be used AFTER authenticateJWT.
 *
 * Usage:
 * // Only admins can access
 * app.get('/api/admin/users', authenticateJWT, requireRole('admin'), getUsersHandler);
 *
 * // Admins and members can access (any logged-in user)
 * app.get('/api/tasks', authenticateJWT, requireRole(['admin', 'member']), getTasksHandler);
 *
 * @param {string|string[]} allowedRoles - Role or array of roles
 * @returns {Function} Express middleware function
 */
function requireRole(allowedRoles) {
  // Normalize to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthenticated',
        message: 'You must be logged in to access this resource'
      });
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires ${roles.join(' or ')} role. You are: ${req.user.role}`,
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    // User has permission, continue
    next();
  };
}

/**
 * Admin-only middleware
 *
 * Shortcut for requireRole('admin').
 * Use this for routes that only admins should access.
 *
 * Usage:
 * app.get('/api/users', authenticateJWT, requireAdmin, getUsersHandler);
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Rate limiting for authentication endpoints
 *
 * Prevents brute-force attacks on login.
 * Allows 5 attempts per 15 minutes per IP.
 *
 * This is already set up in server.js with express-rate-limit,
 * but we define it here for consistency.
 */
const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too many attempts',
    message: 'Too many login attempts. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false
});

/**
 * Middleware to check if user is accessing their own resource
 *
 * Example: User can only update their own profile
 * app.put('/api/users/:id', authenticateJWT, requireSelfOrAdmin, updateUserHandler);
 *
 * @param {string} paramName - URL parameter name (default: 'id')
 */
function requireSelfOrAdmin(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthenticated',
        message: 'You must be logged in'
      });
    }

    const targetUserId = req.params[paramName];

    // Admin can access anyone's resource
    if (req.user.role === 'admin') {
      return next();
    }

    // User can only access their own resource
    if (req.user.id !== targetUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
}

// Export all middleware functions
module.exports = {
  authenticateJWT,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSelfOrAdmin,
  authRateLimiter
};
