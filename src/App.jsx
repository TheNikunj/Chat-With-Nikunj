import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthProvider'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import AdminDashboard from './pages/Admin/Dashboard'
import InternDashboard from './pages/Intern/Dashboard'
import './css/App.css'

function ProtectedRoute() {
  const { session, user } = useAuth()
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setRole(data.role)
          }
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [user])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>
  }

  if (!session) {
    return <Navigate to="/login" />
  }

  if (role === 'admin') {
    return <AdminDashboard />
  }

  if (role === 'intern') {
    return <InternDashboard />
  }

  return <div className="text-white">Role not found</div>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/" element={<ProtectedRoute />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App