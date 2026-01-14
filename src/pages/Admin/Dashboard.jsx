import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabaseClient'
import ConfirmationModal from '../../components/ConfirmationModal'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import '../../css/Admin.css'

export default function AdminDashboard() {
  const { user, signOut } = useAuth()
  const [interns, setInterns] = useState([])
  const [selectedIntern, setSelectedIntern] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [internToDelete, setInternToDelete] = useState(null)
  const [isDeleteInternModalOpen, setIsDeleteInternModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const messagesEndRef = useRef(null)

  // Handle Resize & Initial Mobile Check
  useEffect(() => {
    const handleResize = () => {
      // If screen is large (>= 1024px), we might want to auto-close the mobile overlay state
      // or simply rely on CSS hiding it.
      // But if we go from desktop -> mobile, we usually want sidebar closed by default
      if (window.innerWidth >= 1024) {
         setIsSidebarOpen(false) 
      }
    }

    // Initial check on mount
    if (window.innerWidth < 1024) {
      // If on mobile and no intern selected, show sidebar so they can pick one
      if (!selectedIntern) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [selectedIntern]) // Add dependency on selectedIntern if needed, but for initial mount [] is fine. 
  // However, since we check selectedIntern inside, we should be careful. 
  // actually, on mount selectedIntern is null (default). 
  // So checking !selectedIntern is safe for initial load.
  // But wait, if we add dependency it might trigger on selection change. 
  // We only want this on MOUNT. So keep dependency empty array [] for the resize listener, 
  // but for the initial check, we rely on the initial state of selectedIntern (which is null).
  // Correct.

  // Fetch Interns
  useEffect(() => {
    const fetchInterns = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'intern')
      
      if (error) {
          console.error('Error fetching interns:', error)
      } else if (data) {
          setInterns(data)
      }
    }
    fetchInterns()
  }, [])

  // Fetch Messages logic
  useEffect(() => {
    if (!selectedIntern || !user) return

    setMessages([]) 

    const fetchMessages = async () => {
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${selectedIntern.id},receiver_id.eq.${selectedIntern.id}`)
        .order('created_at', { ascending: true })

      if (!msgError) {
        setMessages(msgData)
        
        // Mark incoming unread messages as read (Relaxed: sender is user, I am viewing it)
        const unreadIds = msgData
          .filter(m => m.sender_id === selectedIntern.id && m.status !== 'read')
          .map(m => m.id)
        
        if (unreadIds.length > 0) {
            await supabase
              .from('messages')
              .update({ status: 'read' })
              .in('id', unreadIds)
        }
      } else {
        console.error('Error fetching messages:', msgError)
      }
    }

    fetchMessages()

    // Specific Chat Subscription (for Updates/Reactions and own sent messages)
    const channel = supabase
      .channel(`admin-chat-${selectedIntern.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${selectedIntern.id}` }, (payload) => {
            // My own messages sent elsewhere (e.g. mobile)
            // My own messages sent elsewhere (e.g. mobile)
            if (payload.new.sender_id === user.id) {
                setMessages((prev) => {
                    // Prevent duplicates if specific message already added via insertMessage
                    if (prev.some(msg => msg.id === payload.new.id)) return prev
                    return [...prev, payload.new]
                })
            }
            // Incoming messages are handled by global channel for status updates
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${selectedIntern.id}` }, (payload) => {
          setMessages((prev) => prev.map(msg => msg.id === payload.new.id ? payload.new : msg))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${selectedIntern.id}` }, (payload) => {
          setMessages((prev) => prev.map(msg => msg.id === payload.new.id ? payload.new : msg))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedIntern, user])

  // Keep track of selectedIntern in a ref for the global subscription callback
  const selectedInternRef = useRef(selectedIntern)
  useEffect(() => {
     selectedInternRef.current = selectedIntern
  }, [selectedIntern])

  // Global Subscription & Connect Logic (Run once per user session)
  useEffect(() => {
    if (!user) return

    // 1. Mark all 'sent' messages to me as 'delivered' on mount
    const markAllDelivered = async () => {
        const { error } = await supabase
            .from('messages')
            .update({ status: 'delivered' })
            .eq('receiver_id', user.id)
            .eq('status', 'sent')
        
        if (error) {
            console.error('Error marking messages as delivered:', error)
        }
    }
    markAllDelivered()

    // 2. Global Listener for incoming messages
    const globalChannel = supabase
      .channel(`admin-global-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // filter: `receiver_id=eq.${user.id}`, // REMOVE strict filter to catch messages sent to "Old Admin ID"
        },
        async (payload) => {
          const currentSelected = selectedInternRef.current
          // If viewing the chat of the sender, mark READ
          // Relaxed check: If message is from the selected intern (regardless of who it was 'sent' to), mark read
          if (currentSelected && payload.new.sender_id === currentSelected.id) {
             const { error } = await supabase
                .from('messages')
                .update({ status: 'read' })
                .eq('id', payload.new.id)
             
             if (error) {
                 console.error('[Admin] FAILED to mark read. RLS Check?', error)
             } else {
                 console.log('[Admin] Successfully marked read')
             }
             
             // Update local state regardless of whether the DB update succeeded (optimistic or fallback)
             // If error, it just stays 'sent' or whatever it came as, but at least it shows up.
             if (selectedInternRef.current?.id === currentSelected.id) {
                 const newStatus = !error ? 'read' : payload.new.status // use 'read' if success, else original
                 setMessages((prev) => {
                     if (prev.some(m => m.id === payload.new.id)) return prev
                     return [...prev, { ...payload.new, status: newStatus }]
                 })
             }
          } else {
             // Otherwise mark DELIVERED
             console.log('[Admin] Marking message as DELIVERED:', payload.new.id)
             const { error: deliveredError } = await supabase
                .from('messages')
                .update({ status: 'delivered' })
                .eq('id', payload.new.id)
             
             if (deliveredError) {
                 console.error('[Admin] FAILED to mark delivered. RLS Check?', deliveredError)
             } else {
                 console.log('[Admin] Successfully marked delivered')
             }
          }
        }
      )
      .subscribe()

    return () => {
        supabase.removeChannel(globalChannel)
    }
  }, [user])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Aggressive Read Watcher: If we are viewing a chat, ensure all messages from that user are marked read
  useEffect(() => {
    if (!selectedIntern || !user || messages.length === 0) return

    // Relaxed: Don't check m.receiver_id === user.id. If it's in my chat window from this intern, I read it.
    const unreadIds = messages
        .filter(m => m.sender_id === selectedIntern.id && m.status !== 'read')
        .map(m => m.id)
    
    if (unreadIds.length > 0) {
        console.log('[Admin] Found', unreadIds.length, 'unread messages on screen. Marking read...')
        
        // fire and forget
        supabase
            .from('messages')
            .update({ status: 'read' })
            .in('id', unreadIds)
            .then(({ error }) => {
                if (error) console.error('[Admin] Read Watcher Error:', error)
                else {
                    setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, status: 'read' } : m))
                }
            })
    }
  }, [messages, selectedIntern, user])

  const insertMessage = async (content) => {
    if (!selectedIntern) return

    const messageToSend = {
      sender_id: user.id,
      receiver_id: selectedIntern.id,
      content: content,
    }

    const { data: sentData, error } = await supabase
        .from('messages')
        .insert(messageToSend)
        .select()
        .single()

    if (error) {
      console.error('Error sending message:', error)
    } else if (sentData) {
      setMessages((prev) => [...prev, sentData])
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedIntern) return
    
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
          // Revert if error
      }
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('intern-files')
      .upload(filePath, file)

    if (uploadError) {
      alert('Error uploading file: ' + uploadError.message)
      return
    }

    const { data, error: urlError } = await supabase.storage
      .from('intern-files')
      .createSignedUrl(filePath, 315360000)

    if (urlError) {
      alert('Error creating signed URL: ' + urlError.message)
      return
    }
    
    if (data) {
        if (file.type.startsWith('image/')) {
            await insertMessage(`[IMAGE] ${data.signedUrl}`)
        } else {
            await insertMessage(`[FILE] ${data.signedUrl}|${file.name}`)
        }
    }
  }

  const handleClearChatRequest = () => {
    if (!selectedIntern) return
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteChat = async () => {
    setIsDeleteModalOpen(false)
    if (!selectedIntern) return

    const { error } = await supabase
      .from('messages')
      .delete()
      .or(`sender_id.eq.${selectedIntern.id},receiver_id.eq.${selectedIntern.id}`)

    if (error) {
      alert('Error deleting messages: ' + error.message)
    } else {
      setMessages([])
    }
  }

  const handleDeleteInternRequest = (intern) => {
      setInternToDelete(intern)
      setIsDeleteInternModalOpen(true)
  }

  const confirmDeleteIntern = async () => {
      if (!internToDelete) return
      setIsDeleteInternModalOpen(false)

      // 1. First delete all messages associated with this user
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .or(`sender_id.eq.${internToDelete.id},receiver_id.eq.${internToDelete.id}`)

      if (msgError) {
          alert('Error deleting user messages: ' + msgError.message)
          return
      }

      // 2. Then delete from profiles (and storage if needed, though storage is harder to track without list)
      const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', internToDelete.id)
      
      if (error) {
          alert('Error deleting intern profile: ' + error.message)
      } else {
          // Success
          setInterns((prev) => prev.filter(i => i.id !== internToDelete.id))
          if (selectedIntern?.id === internToDelete.id) {
              setSelectedIntern(null)
          }
          
          // Optional: Attempt to call an Edge Function for Auth deletion if one existed
          // await supabase.functions.invoke('delete-user', { body: { userId: internToDelete.id } })
      }
      setInternToDelete(null)
  }



  // ...

  return (
    <div className="admin-container">
      {/* Mobile Overlay */}
      <div 
        className={`admin-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteChat}
        title="Delete Conversation"
        message={`Are you sure you want to delete the entire chat history with ${selectedIntern?.full_name}? This action cannot be undone.`}
      />

      <ConfirmationModal
        isOpen={isDeleteInternModalOpen}
        onClose={() => setIsDeleteInternModalOpen(false)}
        onConfirm={confirmDeleteIntern}
        title="Delete Intern"
        message={`Are you sure you want to delete ${internToDelete?.full_name}? This will remove them from the list, but their account may still exist in Auth.`}
      />
      
      <Sidebar 
        interns={interns} 
        selectedIntern={selectedIntern} 
        onSelectIntern={(intern) => {
            setSelectedIntern(intern)
            setIsSidebarOpen(false) // Close sidebar on mobile when selecting
        }}
        onDeleteIntern={handleDeleteInternRequest}
        onSignOut={signOut} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <ChatArea
        user={user}
        selectedIntern={selectedIntern}
        messages={messages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        onReaction={handleReaction}
        onRequestClearChat={handleClearChatRequest}
        messagesEndRef={messagesEndRef}
        onOpenMobileMenu={() => setIsSidebarOpen(true)}
      />
    </div>
  )
}
