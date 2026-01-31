# Task Manager

A feature-rich task management application with Kanban board, list view, Gantt chart, team profiles, labels, dark mode, and multilingual support.

## Tech Stack

- **React 18** with **Vite** for fast development and builds
- **Tailwind CSS** for utility-first styling
- **react-router-dom** for client-side routing
- **@hello-pangea/dnd** for drag-and-drop
- **i18next / react-i18next** for internationalization
- **lucide-react** for icons

## Getting Started

### Installation

```bash
git clone <repo-url>
cd task-manager
npm install
```

### Running the Application

This app has **two parts**: a **frontend** (Vite/React) and a **backend** (Express API). You can run them in development or production mode.

#### Development Mode (Recommended for Development)

Run **both servers** in separate terminal windows:

**Terminal 1 - Frontend (Vite):**
```bash
npm run dev
```
Starts at `http://localhost:3000` with hot-reload

**Terminal 2 - Backend (Express API):**
```bash
npm start
```
Starts at `http://localhost:4173` (API endpoints)

Then open **http://localhost:3000** in your browser. The Vite dev server automatically proxies API requests to the Express backend.

#### Production Mode

```bash
# Build the frontend
npm run build

# Run the Express server (serves built files + API)
npm start
```

Then open **http://localhost:4173** in your browser.

## Available Scripts

| Script            | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start Vite dev server (frontend only)           |
| `npm start`       | Start Express server (backend API)               |
| `npm run build`   | Build frontend for production                    |
| `npm run preview` | Preview the production build (Vite preview mode) |

## Features

- **Kanban board** — drag-and-drop columns and cards, quick-add tasks, column editing
- **List view** — sortable/filterable table of tasks
- **Gantt chart** — timeline visualization with bars per task
- **Team profiles** — create and manage team member profiles, assign members to tasks
- **Labels** — color-coded labels with a label manager and per-task picker
- **Comments** — comment threads on tasks
- **Dark mode** — toggle between light and dark themes
- **Internationalization** — English, French, German, and Italian (`en`, `fr`, `de`, `it`)
- **Keyboard shortcuts** — see below
- **Data export/import** — settings page with JSON-based local storage
- **Configurable data file path** — store tasks anywhere on your system (supports shared folders for multi-user access)
- **Cross-platform** — works on Windows, macOS, and Linux/WSL

## Data File Configuration

By default, tasks are stored in `./data/tasks.json`. You can change this in **Settings**:

1. Go to **Settings** → **Data File Path**
2. Enter a custom path:
   - **Relative path**: `./my-tasks.json` (relative to project root)
   - **Absolute path (Windows)**: `C:/Users/YourName/Documents/tasks.json`
   - **Absolute path (Mac/Linux)**: `/home/username/tasks.json`
   - **Network share**: `//server/shared/tasks.json`
   - **Cloud sync folder**: `C:/Users/YourName/OneDrive/tasks.json`

3. Click **Save Path**

**Multi-user setup**: Point multiple instances to the same file path (e.g., on OneDrive or a network drive) and enable auto-refresh in settings.

**Cross-platform notes**:
- On **Windows**: Paths like `C:\Users\...` work natively
- On **WSL/Linux**: Windows paths (`C:\...`) are automatically converted to `/mnt/c/...`
- Use forward slashes `/` for better cross-platform compatibility

## Project Structure

```
src/
├── components/
│   ├── common/        # Button, Input, Modal
│   ├── Gantt/         # GanttChart, GanttBar, GanttHeader, GanttRow
│   ├── Kanban/        # Board, Column, ColumnEditor, TaskCard, QuickAdd
│   ├── Labels/        # LabelManager, LabelBadge
│   ├── Layout/        # Navbar, ThemeToggle
│   ├── List/          # TaskListView, TaskRow
│   ├── Profiles/      # ProfileList, ProfileCard, ProfileForm
│   └── Tasks/         # TaskForm, TaskModal, LabelPicker, Filters, CommentList
├── context/           # AppContext, ThemeContext
├── hooks/             # useAutoRefresh, useDataFile, useKeyboard
├── i18n/
│   ├── locales/       # en.json, fr.json, de.json, it.json
│   └── index.js       # i18n configuration
├── pages/             # Dashboard, ListView, GanttView, Profiles, Settings
├── utils/             # colors, gantt helpers, storage
├── App.jsx            # Root component with routing
├── main.jsx           # Entry point
└── index.css          # Global styles
```

## Keyboard Shortcuts

| Key      | Action                  |
| -------- | ----------------------- |
| `N`      | Create a new task       |
| `Escape` | Close modals / cancel   |
| `/`      | Focus the search filter |

## Troubleshooting

### "Unexpected end of JSON input" error

This usually means the backend server isn't running. Make sure you're running **both** servers in development mode:
- Frontend: `npm run dev` (Terminal 1)
- Backend: `npm start` (Terminal 2)

### File path not saving / Permission errors

**On Windows**:
- Use forward slashes: `C:/Users/YourName/Documents/tasks.json`
- Or backslashes work too: `C:\Users\YourName\Documents\tasks.json`

**On WSL/Linux**:
- Use WSL paths: `/mnt/c/Users/YourName/Documents/tasks.json`
- Or enter Windows paths - they'll auto-convert to `/mnt/c/...`

Make sure the directory exists and you have write permissions.

### API requests failing (CORS or 404 errors)

If running in development mode and API calls fail:
1. Verify the backend is running on port 4173: `npm start`
2. Check `vite.config.js` has the proxy configured (should proxy `/api` to `http://localhost:4173`)
3. Restart the Vite dev server after changing config
