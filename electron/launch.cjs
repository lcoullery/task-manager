// Launcher script that removes ELECTRON_RUN_AS_NODE before spawning Electron
// VS Code sets this variable which prevents Electron from starting properly
const { spawn } = require('child_process')
const path = require('path')

// Remove the problematic env variable
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

// Find the electron binary
const electronPath = require('electron')

// Spawn Electron with clean environment
const child = spawn(electronPath, [path.join(__dirname, '..')], {
  env,
  stdio: 'inherit',
})

child.on('close', (code) => {
  process.exit(code)
})
