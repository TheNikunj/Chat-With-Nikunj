import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './css/index.css' // <--- IMPORTANT: Note the new path 'css/...'
import './css/LightMode.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)