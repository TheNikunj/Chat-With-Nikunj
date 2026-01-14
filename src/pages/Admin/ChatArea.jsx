import React, { useRef, useState } from 'react'
import { Send, MessageSquare, Trash2, Image as ImageIcon, Smile, SmilePlus, Menu, Star, Maximize, Minimize, Plus, FileText, CirclePlus } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import ChatImage from '../../components/ChatImage'
import ImageModal from '../../components/ImageModal'
import MessageStatus from '../../components/MessageStatus'
import '../../css/Admin.css'

export default function ChatArea({ 
  user,
  selectedIntern, 
  messages, 
  newMessage, 
  setNewMessage, 
  onSendMessage, 
  onFileUpload,
  onReaction,
  onRequestClearChat, 
  messagesEndRef,
  onOpenMobileMenu
}) {
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const inputRef = useRef(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState(null)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const [selectedImage, setSelectedImage] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      onFileUpload(file)
      setShowPlusMenu(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      onFileUpload(file)
      setShowPlusMenu(false)
    }
  }

  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji)
    setShowEmojiPicker(false)
    setTimeout(() => inputRef.current?.focus(), 0)
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

  if (!selectedIntern) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 relative">
        <div className="absolute top-4 left-4 md:hidden">
            <Menu className="h-6 w-6 text-gray-400 cursor-pointer" onClick={onOpenMobileMenu} />
        </div>
        <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg">Select a chat to start messaging</p>
      </div>
    )
  }

  const isEmojiOnly = (content) => {
      const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u
      return emojiRegex.test(content)
  }

  // Helper to render formatting
  const renderMessageBubble = (msg) => {
    const isImage = msg.content.startsWith('[IMAGE] ')
    const isFile = msg.content.startsWith('[FILE] ')
    const isEmoji = !isImage && !isFile && isEmojiOnly(msg.content)
    
    // Time formatting
    const timeString = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    // [FILE] Rendering
    if (isFile) {
         const fileContent = msg.content.replace('[FILE] ', '')
         const [url, fileName] = fileContent.split('|')
         const displayFileName = fileName || 'Document'
         
         return (
            <div className={`admin-message-bubble group relative ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
                 <div className="admin-bubble-content !flex-col !bg-transparent !p-0">
                     <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-black/20 p-3 rounded-lg hover:bg-black/30 transition-colors border border-white/10 min-w-[200px]">
                         <div className="bg-blue-500/20 p-2 rounded-full">
                            <FileText className="w-6 h-6 text-blue-400" />
                         </div>
                         <div className="flex flex-col overflow-hidden">
                             <span className="text-sm font-medium truncate text-white/90">{displayFileName}</span>
                             <span className="text-xs text-blue-400">Click to open</span>
                         </div>
                     </a>
                     <span className="admin-message-time inline-flex items-center gap-0.5 ml-auto align-bottom relative top-1">
                        {timeString}
                        <MessageStatus status={msg.status} isOwnMessage={msg.sender_id === user.id} />
                    </span>
                 </div>
            </div>
         )
    }

    if (isImage) {
        const imageUrl = msg.content.replace('[IMAGE] ', '')
        return (
            <div className="admin-image-bubble" onClick={() => setSelectedImage(imageUrl)}>
                <img 
                    src={imageUrl} 
                    alt="Shared" 
                    className="admin-chat-image" 
                    loading="lazy"
                />
                <span className="admin-message-time" style={{ color: 'rgba(255,255,255,0.8)', paddingRight: '4px', paddingBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {timeString}
                    <MessageStatus status={msg.status} isOwnMessage={msg.sender_id === user.id} />
                </span>
            </div>
        )
    }

    if (isEmoji) {
        return (
            <div className="relative group bg-transparent p-0 shadow-none border-none">
                <p className="text-5xl leading-tight">{msg.content}</p>
                <span className="text-gray-400 text-xs shadow-black drop-shadow-md flex items-center justify-end gap-1 mt-1">
                    {timeString}
                    <MessageStatus status={msg.status} isOwnMessage={msg.sender_id === user.id} />
                </span>
            </div>
        )
    }

    // Standard Text
    return (
        <div className={`admin-message-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
            <div className="admin-bubble-content">
                <span>{msg.content}</span>
                <span className="admin-message-time flex items-center gap-1">
                    {timeString}
                    <MessageStatus status={msg.status} isOwnMessage={msg.sender_id === user.id} />
                </span>
            </div>
        </div>
    )
  }

  return (
    <div className="admin-chat-container relative">
      <ImageModal 
        isOpen={!!selectedImage} 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />

      <div className="admin-chat-header flex items-center justify-between p-4 border-b border-gray-700 bg-slate-800/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
            <Menu className="admin-mobile-menu-btn md:hidden" onClick={onOpenMobileMenu} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                  <h2 className="admin-chat-name">{selectedIntern?.full_name || 'Chat'}</h2>
              </div>
              <span className="text-gray-400 text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Active now
              </span>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={toggleFullScreen}
                className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                title="Toggle Full Screen"
            >
                {isFullScreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
            
            <button 
                onClick={onRequestClearChat} 
                className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-white/5"
                title="Clear Chat"
            >
                <Trash2 className="h-5 w-5" />
            </button>
        </div>
      </div>

      <div className="admin-messages-list">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`admin-message-wrapper ${msg.sender_id === user.id ? 'sent' : 'received'}`}
            onMouseEnter={() => setHoveredMessageId(msg.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
           {renderMessageBubble(msg)}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form 
        onSubmit={(e) => {
            onSendMessage(e)
            // Force focus back to input to keep keyboard open on mobile
            setTimeout(() => inputRef.current?.focus(), 10)
        }} 
        className="admin-input-form relative"
      >
         {showEmojiPicker && (
            <div className="absolute bottom-16 left-4 z-50">
                <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
            </div>
        )}

        {/* Hidden File Inputs */}
        <input 
            type="file" 
            ref={imageInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageChange}
        />
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
        />

        {/* Plus Menu Button */}
        <div className="relative">
             <button
               type="button"
               onClick={() => setShowPlusMenu(!showPlusMenu)}
               className="admin-upload-btn text-gray-400 hover:text-white"
             >
               <CirclePlus className={`h-6 w-6 transition-transform ${showPlusMenu ? 'rotate-45' : ''}`} />
             </button>

             {/* Plus Menu Popup */}
             {showPlusMenu && (
                 <div className="absolute bottom-12 left-0 bg-[#1e293b] border border-slate-700 rounded-xl shadow-xl p-2 w-48 z-50 animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-1">
                     <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded-lg text-left transition-colors"
                     >
                        <div className="bg-purple-500/20 p-2 rounded-full">
                             <ImageIcon className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-sm text-slate-200 font-medium">Photos & Videos</span>
                     </button>
                     <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded-lg text-left transition-colors"
                     >
                        <div className="bg-blue-500/20 p-2 rounded-full">
                             <FileText className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-sm text-slate-200 font-medium">Document</span>
                     </button>
                 </div>
             )}
        </div>
        
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="admin-upload-btn text-gray-400 hover:text-yellow-400 transition-colors"
        >
          <Smile className="h-6 w-6" />
        </button>

        <input
          type="text"
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="admin-input-field"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="admin-send-btn"
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()} // Critical for mobile touch focus preservation
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
