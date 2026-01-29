import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Layout/Navbar'
import { Dashboard } from './pages/Dashboard'
import { Profiles } from './pages/Profiles'
import { Settings } from './pages/Settings'
import { ListView } from './pages/ListView'
import { GanttView } from './pages/GanttView'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 p-6 overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/list" element={<ListView />} />
          <Route path="/gantt" element={<GanttView />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
