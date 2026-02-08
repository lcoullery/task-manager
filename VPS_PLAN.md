# VPS Deployment Preparation Plan

## Context

**Problem:** The Task Manager currently uses file-based sharing (OneDrive/Dropbox) for multi-user collaboration, which causes concurrent access issues, sync conflicts, and file locking problems.

**Solution:** Deploy to a Linux VPS for true multi-user collaboration with centralized data, real-time updates, and proper security.

**Current State:** The app is well-built (Express + React) but scores 38/100 on deployment readiness. Critical gaps: no authentication, hardcoded configuration, no process management, no security middleware.

**Goal:** Prepare the software for VPS deployment, test locally, then deploy to VPS.

---

## Recommended Linux: Ubuntu 22.04 LTS

**Why Ubuntu 22.04:**
- Most popular for Node.js deployments
- APT package manager (easy installs)
- 5 years of security updates
- Best documentation
- Works perfectly with Node.js, nginx, PM2, Certbot

---

## Recommended Approach: Two-Phase Plan

### Phase 1: Essential Preparation (Pre or Post-VPS, 1-2 days)
Make the app VPS-ready while keeping it working locally.

### Phase 2: VPS Deployment (After VPS purchase, 1 day)
Deploy to VPS with SSL and production configuration.

---

## Phase 1: Essential Preparation (Do This First)

### 1.1 Environment Variable Support ⏱️ 1-2 hours

**Create `.env` file:**
```env
NODE_ENV=production
PORT=4173
HOST=0.0.0.0
AUTH_ENABLED=false
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Modify `server.js`:**
- Add `import dotenv from 'dotenv'; dotenv.config()` at top
- Change line 209: `const PORT = parseInt(process.env.PORT || '4173', 10)`
- Change line 816: Use `HOST` variable instead of hardcoded `'0.0.0.0'`
- Install: `npm install dotenv`

**Files to modify:**
- `server.js` (lines 1-10, 209, 816)
- `.env.example` (expand with all variables)
- `.gitignore` (add `.env`)
- `package.json` (add dotenv)

**Test:** Run with `.env` file, verify port/host configurable

---

### 1.2 Basic Authentication ⏱️ 3-4 hours

**Install dependencies:**
```bash
npm install bcrypt express-basic-auth
```

**Create `middleware/auth.js`:**
- HTTP Basic Auth middleware using bcrypt
- Reads `AUTH_ENABLED` from environment
- Protects all `/api/data`, `/api/config`, `/api/bug-reports` routes
- Leaves `/api/health` and `/api/version` public

**Create `scripts/hash-password.js`:**
- Utility to generate bcrypt hashes for passwords
- Usage: `node scripts/hash-password.js yourpassword`

**Modify `server.js`:**
- Import and apply auth middleware to protected routes
- Skip auth when `AUTH_ENABLED=false` (default for local dev)

**Files to create:**
- `middleware/auth.js` (new)
- `scripts/hash-password.js` (new)

**Files to modify:**
- `server.js` (import and apply middleware)
- `package.json` (add bcrypt, express-basic-auth)

**Test:**
- Auth disabled: app works normally
- Auth enabled: browser prompts for credentials

---

### 1.3 Security Middleware ⏱️ 1 hour

**Install dependencies:**
```bash
npm install helmet cors express-rate-limit
```

**Add to `server.js` (after app creation):**
- `helmet()` for security headers
- `cors()` with configurable origin
- `rateLimit()` on all `/api/*` routes (100 requests per 15 min default)

**Files to modify:**
- `server.js`
- `package.json`

**Test:** Check rate limiting by hitting API rapidly, verify CORS headers

---

### 1.4 Health Check Endpoint ⏱️ 15 minutes

**Add to `server.js`:**
```javascript
app.get('/api/health', (req, res) => {
  const healthy = existsSync(resolveDataPath())
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    dataFileExists: healthy
  })
})
```

**Files to modify:**
- `server.js`

**Test:** Visit `http://localhost:4173/api/health`, should return JSON

---

### 1.5 Process Management (PM2) ⏱️ 2 hours

**Create `ecosystem.config.cjs`:**
```javascript
module.exports = {
  apps: [{
    name: 'task-manager',
    script: './server.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '500M',
    env: { NODE_ENV: 'production', PORT: 4173 },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

**Create logs directory:**
```bash
mkdir -p logs
```

**Update `.gitignore`:**
```
logs/
```

**Update README:**
- Document PM2 commands: `pm2 start`, `pm2 logs`, `pm2 restart`, `pm2 stop`
- Document auto-start on reboot: `pm2 startup`, `pm2 save`

**Files to create:**
- `ecosystem.config.cjs` (new)
- `logs/` directory

**Files to modify:**
- `.gitignore`
- `README.md`

**Test (locally):**
```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 logs
pm2 status
```

---

### 1.6 Logging Improvements ⏱️ 1 hour

**Install winston:**
```bash
npm install winston
```

**Create `utils/logger.js`:**
- Winston logger with file transports (error.log, combined.log)
- Console transport for development
- JSON format for production, simple for dev

**Modify `server.js`:**
- Replace `console.log()` with `logger.info()`
- Replace `console.error()` with `logger.error()`

**Files to create:**
- `utils/logger.js` (new)

**Files to modify:**
- `server.js` (replace console.log calls)
- `package.json` (add winston)

**Test:** Check logs written to `logs/combined.log` and `logs/error.log`

---

### Phase 1 Summary

**Total Effort:** 8-10 hours

**Testing Checklist:**
- [ ] App runs locally with `npm start` (no .env)
- [ ] App runs with `.env` file (custom port)
- [ ] Auth disabled: all API calls work
- [ ] Auth enabled: browser prompts for credentials
- [ ] Health check returns 200 at `/api/health`
- [ ] PM2 starts/restarts app correctly
- [ ] Rate limiting blocks excessive requests
- [ ] Logs written to `logs/` directory

---

## Phase 2: VPS Deployment (After VPS Purchase)

### 2.1 VPS Provider & Specs

**Recommended Providers:**
- DigitalOcean: $6/month (1GB RAM)
- Hetzner Cloud: €4.51/month (~$5, better specs)
- Linode: $5/month

**Required Specs:**
- 1GB RAM minimum (2GB recommended)
- 25GB SSD
- Ubuntu 22.04 LTS
- 1 vCPU

---

### 2.2 Initial VPS Setup ⏱️ 2-3 hours

**On VPS (via SSH):**

1. Update system: `apt update && apt upgrade -y`
2. Install Node.js 20 LTS:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   ```
3. Install PM2: `npm install -g pm2`
4. Create non-root user: `adduser taskmanager`
5. Clone repo: `git clone https://github.com/lcoullery/task-manager.git`
6. Create `.env` file with production config:
   ```env
   NODE_ENV=production
   PORT=4173
   HOST=127.0.0.1
   AUTH_ENABLED=true
   AUTH_USERNAME=admin
   AUTH_PASSWORD_HASH=<generated hash>
   CORS_ORIGIN=https://yourdomain.com
   ```
7. Install dependencies: `npm install --production`
8. Build: `npm run build`
9. Create data directory: `mkdir -p ~/task-manager-data`
10. Start with PM2: `pm2 start ecosystem.config.cjs`, `pm2 save`, `pm2 startup`

**Test:** `curl http://localhost:4173/api/health`

---

### 2.3 nginx Reverse Proxy + SSL ⏱️ 2 hours

**Install nginx and Certbot:**
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

**Create nginx config** (`/etc/nginx/sites-available/task-manager`):
- Listen on port 80, redirect to HTTPS
- Listen on port 443 with SSL
- Proxy to `http://127.0.0.1:4173`
- Cache static files (js, css, images)
- Security headers (HSTS, X-Frame-Options)

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/task-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Setup SSL:**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Test:**
- Visit `https://yourdomain.com`
- Verify SSL certificate
- Test HTTP → HTTPS redirect

---

### 2.4 Firewall (UFW) ⏱️ 30 minutes

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

**Result:** Only SSH (22), HTTP (80), HTTPS (443) open. Port 4173 not exposed.

---

### 2.5 Backup Strategy ⏱️ 1-2 hours

**Create `scripts/backup.sh`:**
- Backup `~/task-manager-data` to `~/backups/tasks-YYYYMMDD.tar.gz`
- Keep last 30 days
- Log to `~/backups/backup.log`

**Setup cron job:**
```bash
crontab -e
# Add: 0 2 * * * /home/taskmanager/task-manager/scripts/backup.sh
```

**Files to create:**
- `scripts/backup.sh` (new)

**Test:** Run `./scripts/backup.sh`, verify `.tar.gz` created

---

### 2.6 Deployment Script ⏱️ 2 hours

**Create `scripts/deploy.sh`:**
- Backup current version
- Pull latest code (`git pull origin main`)
- Install dependencies
- Build frontend
- Restart PM2
- Run health check (rollback if fails)

**Files to create:**
- `scripts/deploy.sh` (new)

**Test:** Run `./scripts/deploy.sh`, verify deployment works

---

### Phase 2 Summary

**Total Effort:** 8-10 hours

**Testing Checklist:**
- [ ] App accessible via `https://yourdomain.com`
- [ ] SSL certificate valid (Let's Encrypt)
- [ ] HTTP → HTTPS redirect works
- [ ] Authentication prompts on first visit
- [ ] PM2 auto-restarts on crash
- [ ] Daily backups running (check cron)
- [ ] Deployment script works

---

## Critical Files Reference

### Phase 1 (Essential Preparation):

1. **`server.js`** - Add env vars, auth middleware, security headers, health check
2. **`.env.example`** - Template for all configuration
3. **`ecosystem.config.cjs`** - PM2 process management (new)
4. **`middleware/auth.js`** - Authentication logic (new)
5. **`scripts/hash-password.js`** - Password hashing utility (new)
6. **`utils/logger.js`** - Winston logger (new)
7. **`package.json`** - Add dependencies (dotenv, bcrypt, helmet, cors, rate-limit, winston)
8. **`.gitignore`** - Add `.env` and `logs/`

### Phase 2 (VPS Deployment):

1. **`/etc/nginx/sites-available/task-manager`** - nginx config (on VPS)
2. **`scripts/backup.sh`** - Automated backup (new)
3. **`scripts/deploy.sh`** - Automated deployment (new)

---

## Verification Steps

**After Phase 1 (Local):**
1. Start with `npm start` - should work with defaults
2. Start with custom `.env` - should use custom port
3. Enable auth, verify browser prompts
4. Hit API 101 times, verify rate limiting
5. Run `pm2 start ecosystem.config.cjs`, verify auto-restart
6. Check `logs/combined.log` has entries

**After Phase 2 (VPS):**
1. Visit `https://yourdomain.com` - should load app
2. Try `http://yourdomain.com` - should redirect to HTTPS
3. Login with credentials - should work
4. Create/edit task - should persist
5. Check PM2 status: `pm2 status` - should show running
6. Check backups: `ls ~/backups` - should have `.tar.gz` files
7. Test deploy: `./scripts/deploy.sh` - should update successfully

---

## Timeline Estimate

- **Phase 1:** 1-2 days of focused work (can be incremental)
- **Phase 2:** 1 day after VPS purchase
- **Total to working VPS:** 2-3 days

---

## Key Decisions

**Authentication:** HTTP Basic Auth (simplest, secure enough with SSL)
**Process Manager:** PM2 (better for Node.js than systemd)
**Environment:** .env files (standard, easy to test locally)
**User Management:** Shared credentials initially (can add individual accounts later)
**Linux:** Ubuntu 22.04 LTS (most popular, best docs, proven)

---

## Next Steps

1. Start with Phase 1.1 (environment variables)
2. Test each feature locally before moving to next
3. Commit incrementally (don't wait until everything is done)
4. Execute Phase 2 following the guide after VPS is ready
5. Monitor for 1 week before announcing to team
