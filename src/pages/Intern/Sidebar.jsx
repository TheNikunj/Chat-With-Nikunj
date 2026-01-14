import React, { useEffect, useState } from 'react'
import { Upload, FileText, LogOut, Sun, Moon } from 'lucide-react'
import '../../css/Intern.css'

export default function Sidebar({ 
  onSignOut,
  isOpen 
}) {
  const [isLightMode, setIsLightMode] = useState(false)

  useEffect(() => {
    // Check local storage or preference
    const stored = localStorage.getItem('theme')
    if (stored === 'light') {
      setIsLightMode(true)
      document.body.classList.add('light-mode')
    }
  }, [])

  const toggleTheme = () => {
    if (isLightMode) {
      document.body.classList.remove('light-mode')
      localStorage.setItem('theme', 'dark')
      setIsLightMode(false)
    } else {
      document.body.classList.add('light-mode')
      localStorage.setItem('theme', 'light')
      setIsLightMode(true)
    }
  }

  return (
    <div className={`intern-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Footer / Sign Out */ }
      <div className="intern-sidebar-footer" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          onClick={toggleTheme}
          className="intern-signout-btn"
          title="Toggle Theme"
        >
          {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {isLightMode ? 'Dark Mode' : 'Light Mode'}
        </button>

        <button
          onClick={() => window.location.reload()}
          className="intern-signout-btn"
          title="Refresh Messages"
        >
          <span style={{ fontSize: '1.2rem' }}>🔄</span>
          Refresh
        </button>

        <button
          onClick={onSignOut}
          className="intern-signout-btn"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
