import React, { useRef, useState } from 'react'
import { Send, Image as ImageIcon, Smile, SmilePlus, Menu, Star, Maximize, Minimize } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import ChatImage from '../../components/ChatImage'
import ImageModal from '../../components/ImageModal'
import '../../css/Intern.css'

export default function ChatArea({ 
  user,
  adminId, 
  messages, 
  newMessage, 
  setNewMessage, 
  onSendMessage, 
  onImageUpload,
  onReaction,
  messagesEndRef,
  onOpenMobileMenu
}) {
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState(null)
  const [isFullScreen, setIsFullScreen] = useState(false) // Track Full Screen

  const [selectedImage, setSelectedImage] = useState(null)

  const handleIconClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      onImageUpload(file)
    }
  }

  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji)
    setShowEmojiPicker(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const isEmojiOnly = (content) => {
      const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u
      return emojiRegex.test(content)
  }

  // Helper to render formatting
  const renderMessageBubble = (msg) => {
    const isImage = msg.content.startsWith('[IMAGE] ')
    const isEmoji = !isImage && isEmojiOnly(msg.content)
    
    // Time formatting
    const timeString = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (isImage) {
        const imageUrl = msg.content.replace('[IMAGE] ', '')
        return (
            <div className="intern-image-bubble" onClick={() => setSelectedImage(imageUrl)}>
                <img 
                    src={imageUrl} 
                    alt="Shared" 
                    className="intern-chat-image" 
                    loading="lazy"
                />
                <span className="intern-message-time" style={{ color: 'rgba(255,255,255,0.8)', paddingRight: '4px', paddingBottom: '2px' }}>
                    {timeString}
                </span>
            </div>
        )
    }

    if (isEmoji) {
        return (
            <div className="relative group bg-transparent p-0 shadow-none border-none">
                <p className="text-5xl leading-tight">{msg.content}</p>
                <span className="text-gray-400 text-xs shadow-black drop-shadow-md block text-right mt-1">
                    {timeString}
                </span>
            </div>
        )
    }

    // Standard Text
    return (
        <div className={`intern-message-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
            <div className="intern-bubble-content">
                <span>{msg.content}</span>
                <span className="intern-message-time">{timeString}</span>
            </div>
        </div>
    )
  }

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            setIsFullScreen(true)
        }).catch((err) => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`)
        })
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                setIsFullScreen(false)
            })
        }
    }
  }

  return (
    <div className="intern-chat-container relative">
      <ImageModal 
        isOpen={!!selectedImage} 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
      
      <div className="intern-chat-header">
        <div className="flex items-center gap-3 flex-1">
          <button 
              className="intern-mobile-menu-btn md:hidden" 
              onClick={onOpenMobileMenu}
          >
              <Menu className="h-6 w-6" />
          </button>
          
          <div className="intern-avatar-container">
            <span className="intern-avatar">N</span>
            <span className="intern-status-dot"></span>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
                <h2 className="intern-chat-name">Nikunj Kumar (Admin)</h2>
                <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
            </div>
            <span className="intern-status-text">Online</span>
          </div>
        </div>

        {/* Mobile Full Screen Button */}
        <button 
            onClick={toggleFullScreen}
            className="intern-fullscreen-btn md:hidden"
            title="Toggle Full Screen"
        >
            {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      </div>

      <div className="intern-chat-body">
        {/* ... */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`intern-message-wrapper ${msg.sender_id === user.id ? 'sent' : 'received'}`}
            onMouseEnter={() => setHoveredMessageId(msg.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
           {renderMessageBubble(msg)}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={onSendMessage} className="intern-input-form relative">
        {showEmojiPicker && (
            <div className="absolute bottom-16 left-4 z-50">
                <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
            </div>
        )}
        
        <input 
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        <div className="flex items-center gap-2">
            <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="intern-upload-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
            >
            <Smile className="h-6 w-6" />
            </button>            

            <button
            type="button"
            onClick={handleIconClick}
            className="intern-upload-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
            >
            <ImageIcon className="h-6 w-6" />
            </button>
        </div>

        <input
          type="text"
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="intern-input-field"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="intern-send-btn"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
