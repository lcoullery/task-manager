const { fork } = require('child_process')
const path = require('path')

let serverProcess = null

/**
 * Start the Express server as a child process on the given port.
 * Returns a promise that resolves when the server is ready.
 */
function startServer(port) {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'server.js')

    serverProcess = fork(serverPath, [], {
      env: { ...process.env, PORT: String(port) },
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })

    let resolved = false

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('[server]', output.trim())

      // Detect when server is ready
      if (!resolved && output.includes('Server running at')) {
        resolved = true
        resolve(port)
      }
    })

    serverProcess.stderr.on('data', (data) => {
      console.error('[server error]', data.toString().trim())
    })

    serverProcess.on('error', (err) => {
      console.error('[server] Failed to start:', err.message)
      if (!resolved) {
        resolved = true
        reject(err)
      }
    })

    serverProcess.on('exit', (code) => {
      console.log(`[server] Process exited with code ${code}`)
      serverProcess = null
      if (!resolved) {
        resolved = true
        reject(new Error(`Server exited with code ${code}`))
      }
    })

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        reject(new Error('Server startup timeout'))
      }
    }, 10000)
  })
}

/**
 * Gracefully stop the Express server.
 */
function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) {
      return resolve()
    }

    serverProcess.on('exit', () => {
      serverProcess = null
      resolve()
    })

    // Send SIGTERM for graceful shutdown
    serverProcess.kill('SIGTERM')

    // Force kill after 3 seconds
    setTimeout(() => {
      if (serverProcess) {
        serverProcess.kill('SIGKILL')
        serverProcess = null
        resolve()
      }
    }, 3000)
  })
}

module.exports = { startServer, stopServer }
