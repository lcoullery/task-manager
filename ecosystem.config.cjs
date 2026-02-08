module.exports = {
  apps: [{
    name: 'task-manager',
    script: './server.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 4173,
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    max_restarts: 10,
    min_uptime: '10s',
  }],
}
