import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Home from './pages/Home'
import VideoDetail from './pages/VideoDetail'
import Upload from './pages/Upload'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 w-full">
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Login />} />

          {/* Protected Routes (Navbar is rendered inside ProtectedRoute) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/watch/:id" element={<VideoDetail />} />
            <Route path="/upload" element={<Upload />} />
          </Route>
        </Routes>
      </main>
    </div>
  )
}

export default App
