import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function ImageModal({ isOpen, imageUrl, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !imageUrl) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <button 
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
        onClick={onClose}
      >
        <X className="h-8 w-8" />
      </button>
      
      <div 
        className="relative max-w-full max-h-full overflow-hidden flex items-center justify-center"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking image itself? Actually user might want to close by clicking anywhere. Let's keep it close on click for now, or maybe only close on backdrop.
      >
        <img 
          src={imageUrl} 
          alt="Full screen preview" 
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-zoom-in"
          style={{ animation: 'zoomIn 0.3s ease-out' }}
        />
      </div>
    </div>
  )
}
