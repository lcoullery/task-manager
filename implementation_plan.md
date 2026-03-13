# Workload Feature Implementation Plan

The goal is to implement a new "Workload" feature that allows users to allocate a specific number of hours per day to a task and visually see if a user is overloaded on any given day. 

## Proposed Changes

### Context & State
* #### [MODIFY] [AppContext.jsx](file:///c:/Users/ludov/ClaudeProjects/task-manager/src/context/AppContext.jsx)
  * Will update `addTask` and `updateTask` to handle a new `workloadHours` field (defaulting to e.g. 0 or empty for backward compatibility).
  * Will add a helper function `getUserWorkload(userId, startDate, endDate)` that computes the daily workload for a user by aggregating the `workloadHours` of all tasks active on each day.

### Settings
* #### [MODIFY] [Settings.jsx](file:///c:/Users/ludov/ClaudeProjects/task-manager/src/pages/Settings.jsx)
  * Will add a new setting `maxHoursPerDay` to the `settings` object via the `AppContext`.
  * Will add a UI section under "Settings" for the user to configure their "Max Workload (hours/day)" (defaulting to 8h).

### Task Form
* #### [MODIFY] [TaskForm.jsx](file:///c:/Users/ludov/ClaudeProjects/task-manager/src/components/Tasks/TaskForm.jsx)
  * Will add a new Number input field for `workloadHours` (Hours/Day allocated to this task).

### I18n
* #### [MODIFY] [en.json](file:///c:/Users/ludov/ClaudeProjects/task-manager/src/i18n/locales/en.json) (and fr.json, de.json, it.json)
  * Will add translation keys for the new Workload page, the `workloadHours` field in the TaskForm, and the `maxHoursPerDay` setting in Settings.

### New UI Components & Routing
* #### [NEW] [WorkloadView.jsx](file:///c:/Users/ludov/ClaudeProjects/task-manager/src/pages/WorkloadView.jsx)
  * Will create a new page to display the workload of all users.
  * Will display a grid/table where rows are users and columns are days (defaulting to current week or month).
  * Each cell will show the total hours assigned for that day. 
  * Will use color-coding (e.g., green for < 100%, yellow for 100%, red for > 100% of max capacity) to clearly show if someone is overloaded.
* #### [MODIFY] [App.jsx](file:///c:/Users/ludov/ClaudeProjects/task-manager/src/App.jsx)
  * Will add the new Route `/workload` mapping to `WorkloadView`.
* #### [MODIFY] [Navbar.jsx](file:///c:/Users/ludov/ClaudeProjects/task-manager/src/components/Layout/Navbar.jsx)
  * Will add a navigation link to the new Workload view.

## Verification Plan
1. **Manual Verification:** Open the application in the browser (`npm run dev`).
2. Go to Settings and verify that "Max Workload (hours/day)" can be configured and saved.
3. Create/Edit a task and verify that the "Hours/Day" field is present and saves correctly.
4. Go to the new "Workload" tab and verify the grid shows users and their aggregated hours per day.
5. Create overlapping tasks for a single user that exceed the "Max Workload" and verify the visual color-coding correctly highlights the overload.
