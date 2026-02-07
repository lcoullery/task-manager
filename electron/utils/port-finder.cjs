const net = require('net')

/**
 * Find an available port, starting from the preferred port.
 * Tries sequentially: preferred, preferred+1, preferred+2, ...
 */
function findAvailablePort(preferred = 4173, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let attempt = 0

    function tryPort(port) {
      if (attempt >= maxAttempts) {
        return reject(new Error(`No available port found after ${maxAttempts} attempts`))
      }

      const server = net.createServer()
      server.listen(port, '0.0.0.0', () => {
        server.close(() => resolve(port))
      })
      server.on('error', () => {
        attempt++
        tryPort(port + 1)
      })
    }

    tryPort(preferred)
  })
}

module.exports = { findAvailablePort }
