# Backend Testing Guide

This guide helps you test the authentication backend before building the frontend.

---

## 🚀 Step 1: Run Migration

Convert your `tasks.json` to SQLite database:

```bash
node scripts/migrate-to-sqlite.js
```

**What it does:**
1. Creates `data/taskmanager.db`
2. Migrates all profiles, tasks, labels, columns
3. Prompts for admin password
4. Backs up `tasks.json` → `tasks.json.backup`

**Expected prompts:**
```
Admin email [ludovic.coullery@lodjx.ch]: (press Enter to use default)
Admin name [Ludovic Coullery]: (press Enter to use default)
Admin password (min 8 chars): ******** (type password)
Confirm password: ******** (confirm password)
```

---

## 🔄 Step 2: Switch Servers

Activate the new authentication server:

**Windows (Command Prompt):**
```cmd
ren server.js server-old.js
ren server-new.js server.js
```

**Windows (PowerShell):**
```powershell
Rename-Item server.js server-old.js
Rename-Item server-new.js server.js
```

**Linux/Mac:**
```bash
mv server.js server-old.js
mv server-new.js server.js
```

---

## ▶️ Step 3: Start Server

```bash
npm start
```

**Expected output:**
```
✓ Connected to database: ./data/taskmanager.db
✓ Database already initialized
⚠️ Email service not configured. (This is OK for testing)
✓ Authentication routes enabled
✓ User management routes enabled
Task Manager server started in development mode
Server running at http://localhost:4173
✓ Using SQLite database with JWT authentication
```

---

## 🧪 Step 4: Test Endpoints

### Option A: Using curl (Terminal)

**1. Login:**
```bash
curl -X POST http://localhost:4173/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"ludovic.coullery@lodjx.ch\",\"password\":\"YOUR_PASSWORD\"}"
```

**Expected response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "ludovic.coullery@lodjx.ch",
    "name": "Ludovic Coullery",
    "role": "admin"
  }
}
```

**2. Get Current User:**
```bash
curl http://localhost:4173/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**3. List Users (Admin only):**
```bash
curl http://localhost:4173/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Option B: Using Postman or Thunder Client (VS Code)

**1. Login**
- Method: `POST`
- URL: `http://localhost:4173/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (JSON):
  ```json
  {
    "email": "ludovic.coullery@lodjx.ch",
    "password": "your_password"
  }
  ```

**2. Get Current User**
- Method: `GET`
- URL: `http://localhost:4173/api/auth/me`
- Headers: `Authorization: Bearer <paste_access_token>`

**3. List Users**
- Method: `GET`
- URL: `http://localhost:4173/api/users`
- Headers: `Authorization: Bearer <paste_access_token>`

---

## ✅ What to Verify

- [ ] Migration completes without errors
- [ ] Server starts with "Using SQLite database" message
- [ ] Login returns access token and refresh token
- [ ] `/api/auth/me` returns your user info
- [ ] `/api/users` returns list with 1 user (you)
- [ ] Login with wrong password returns 401 error
- [ ] Accessing `/api/users` without token returns 401 error

---

## 🐛 Troubleshooting

### "Database already initialized" warning
- **Normal!** Means database exists from previous run
- No action needed

### "Email service not configured" warning
- **Normal for testing!** Email is optional
- Invite URLs will be shown to admin in API responses

### Login fails with 401
- Check password is correct
- Check email matches what you entered during migration
- Look at server logs for errors

### "Cannot find module" errors
- Run `npm install` again
- Check all files in `db/`, `utils/`, `middleware/`, `controllers/` exist

### Server won't start
- Check port 4173 is not already in use
- Try killing existing process: `pkill -f "node server.js"`
- Check `.env` file exists

---

## 📝 Next Steps After Testing

Once backend is verified:
1. Build frontend login page
2. Create auth context for React
3. Build user management UI (admin panel)
4. Test invite system
5. Deploy to VPS

---

## 🔙 Rollback (If Needed)

If something goes wrong, restore original setup:

```bash
# Restore old server
rm server.js
ren server-old.js server.js

# Restore tasks.json
copy data\tasks.json.backup data\tasks.json

# Delete database
del data\taskmanager.db

# Restart server
npm start
```

Your data is safe in `tasks.json.backup`!
