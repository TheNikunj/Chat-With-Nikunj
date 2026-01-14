import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabaseClient'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import '../../css/Intern.css'

export default function InternDashboard() {
  const { user, signOut } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [adminId, setAdminId] = useState(null)
  const messagesEndRef = useRef(null)

  // Fetch Admin ID on mount
  useEffect(() => {
    const fetchAdmin = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single()
      
      if (data) setAdminId(data.id)
    }
    fetchAdmin()
  }, [])

  // Fetch Messages & Subscribe
  useEffect(() => {
    if (!user) return

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true })

      if (!error) {
          setMessages(data)
          
          // Mark incoming unread messages as read
          const unreadIds = data
            .filter(m => m.receiver_id === user.id && m.status !== 'read')
            .map(m => m.id)
          
          if (unreadIds.length > 0) {
              await supabase
                .from('messages')
                .update({ status: 'read' })
                .in('id', unreadIds)
          }
      }
    }

    fetchMessages()

    const channel = supabase
      .channel('intern-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // filter: `receiver_id=eq.${user.id}`, // Removing filter to be safe
        },
        (payload) => {
          // Client-side filter
           if (payload.new.receiver_id === user.id || payload.new.sender_id === user.id) {
               // Prevent Duplicates
               setMessages((prev) => {
                   if (prev.some(m => m.id === payload.new.id)) return prev
                   return [...prev, payload.new]
               })
               
               // Mark as read immediately if it's for me
               if (payload.new.receiver_id === user.id) {
                   supabase
                        .from('messages')
                        .update({ status: 'read' })
                        .eq('id', payload.new.id)
                        .then()
               }
           }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          // Remove filter to ensure we catch ALL updates relating to us (RLS handles security)
        },
        (payload) => {
          console.log('[Intern] Message status UPDATE received:', payload.new.id, payload.new.status)
          // Client-side filter check (optional since RLS only sends what we can see, but good practice)
          if (payload.new.receiver_id === user.id || payload.new.sender_id === user.id) {
             setMessages((prev) => prev.map(msg => msg.id === payload.new.id ? { ...msg, ...payload.new } : msg))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const insertMessage = async (content) => {
      if (!adminId) return

      const messageToSend = {
          sender_id: user.id,
          receiver_id: adminId,
          content: content,
      }
      
      const { data: sentData, error } = await supabase
        .from('messages')
        .insert(messageToSend)
        .select()
        .single()
      
      if (sentData) {
        setMessages((prev) => [...prev, sentData])
      }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    await insertMessage(newMessage)
    setNewMessage('')
  }

  const handleReaction = async (messageId, emoji) => {
      const msg = messages.find(m => m.id === messageId)
      if (!msg) return

      const currentReactions = msg.reactions || {}
      const userIds = currentReactions[emoji] || []
      
      let newReactions = { ...currentReactions }
      
      if (userIds.includes(user.id)) {
          // Remove reaction
          newReactions[emoji] = userIds.filter(id => id !== user.id)
          if (newReactions[emoji].length === 0) {
              delete newReactions[emoji]
          }
      } else {
          // Add reaction
          newReactions[emoji] = [...userIds, user.id]
      }

      // Optimistic update
      setMessages((prev) => prev.map(m => m.id === messageId ? { ...m, reactions: newReactions } : m))

      const { error } = await supabase
          .from('messages')
          .update({ reactions: newReactions })
          .eq('id', messageId)
      
      if (error) {
          console.error('Error updating reaction:', error)
          // Revert if error? For now, let generic realtime update fix it or ignore
      }
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('intern-files')
      .upload(filePath, file)

    if (uploadError) {
      alert('Error uploading file: ' + uploadError.message)
      return
    }

    // 2. Get Signed URL (valid for 10 years)
    const { data, error: urlError } = await supabase.storage
      .from('intern-files')
      .createSignedUrl(filePath, 315360000) // 10 years in seconds

    if (urlError) {
      alert('Error creating signed URL: ' + urlError.message)
      return
    }
    
    if (data) {
        // 3. Send Message based on type
        if (file.type.startsWith('image/')) {
            await insertMessage(`[IMAGE] ${data.signedUrl}`)
        } else {
            // [FILE] url|filename
            await insertMessage(`[FILE] ${data.signedUrl}|${file.name}`)
        }
    }
  }

  return (
    <div className="intern-container">
      {/* Mobile Overlay */}
      <div 
        className={`intern-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <Sidebar 
        onSignOut={signOut}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <ChatArea
        user={user}
        adminId={adminId}
        messages={messages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        onReaction={handleReaction}
        messagesEndRef={messagesEndRef}
        onOpenMobileMenu={() => setIsSidebarOpen(true)}
      />
    </div>
  )
}
