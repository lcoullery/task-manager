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

```bash
git clone <repo-url>
cd task-manager
npm install
npm run dev
```

The dev server starts at `http://localhost:3000`.

## Available Scripts

| Script            | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start the Vite dev server    |
| `npm run build`   | Build for production         |
| `npm run preview` | Preview the production build |

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
