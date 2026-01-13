import React, { useEffect, useState } from 'react'
import { Users, LogOut, Trash2, Sun, Moon } from 'lucide-react'
import '../../css/Admin.css'

export default function Sidebar({ interns, selectedIntern, onSelectIntern, onDeleteIntern, onSignOut, isOpen }) {
  const [isLightMode, setIsLightMode] = useState(false)

  useEffect(() => {
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
    <div className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="admin-sidebar-header">
        <h2 className="admin-sidebar-title">
          <Users className="h-5 w-5 text-blue-500" />
          Interns
        </h2>
      </div>
      
      <div className="admin-intern-list">
        {interns.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
                No interns found.
            </div>
        )}
        {interns.map((intern) => (
          <div
            key={intern.id}
            onClick={() => onSelectIntern(intern)}
            className={`admin-intern-item ${selectedIntern?.id === intern.id ? 'active' : ''} group relative`}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div className="flex items-center gap-3">
                <div className="admin-intern-avatar">
                {intern.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                <p className="font-medium">{intern.full_name || 'Unknown User'}</p>
                <p className="text-xs text-gray-500">Intern</p>
                </div>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onDeleteIntern(intern)
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-700/50 rounded-full transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                title="Delete User"
            >
                <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="admin-sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          onClick={toggleTheme}
          className="admin-signout-btn"
          title="Toggle Theme"
        >
          {isLightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {isLightMode ? 'Dark Mode' : 'Light Mode'}
        </button>

        <button
          onClick={onSignOut}
          className="admin-signout-btn"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
