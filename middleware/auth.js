import basicAuth from 'express-basic-auth'
import bcrypt from 'bcrypt'

export function createAuthMiddleware() {
  const authEnabled = process.env.AUTH_ENABLED === 'true'
  const username = process.env.AUTH_USERNAME || 'admin'
  const passwordHash = process.env.AUTH_PASSWORD_HASH || ''

  // If auth is disabled, let everything through
  if (!authEnabled) {
    return (req, res, next) => next()
  }

  // If auth is enabled but no password hash is set, refuse to start insecurely
  if (!passwordHash) {
    console.error('AUTH_ENABLED=true but AUTH_PASSWORD_HASH is empty!')
    console.error('Generate a hash with: node scripts/hash-password.js <your-password>')
    process.exit(1)
  }

  return basicAuth({
    authorizer: (inputUsername, inputPassword, callback) => {
      // Check username (constant-time comparison to prevent timing attacks)
      const usernameMatch = basicAuth.safeCompare(inputUsername, username)

      // Check password against bcrypt hash
      bcrypt.compare(inputPassword, passwordHash, (err, passwordMatch) => {
        if (err) {
          return callback(err, false)
        }
        callback(null, usernameMatch && passwordMatch)
      })
    },
    authorizeAsync: true,
    challenge: true,
    realm: 'Task Manager',
    unauthorizedResponse: () => 'Unauthorized. Please provide valid credentials.',
  })
}
