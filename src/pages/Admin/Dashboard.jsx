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
      } else {
        console.error('Error fetching messages:', msgError)
      }
    }

    fetchMessages()

    const channel = supabase
      .channel(`admin-chat-${selectedIntern.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${selectedIntern.id}` }, (payload) => {
          setMessages((prev) => [...prev, payload.new])
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${selectedIntern.id}` }, (payload) => {
           if (payload.new.sender_id !== user.id) {
              setMessages((prev) => [...prev, payload.new])
           }
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

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const handleImageUpload = async (file) => {
      if (!file || !selectedIntern) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      // Use strictly user.id to comply with typical RLS policies that enforce (storage.foldername(name))[1] = auth.uid()
      const filePath = `${user.id}/${fileName}`

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('intern-files')
        .upload(filePath, file)

      if (uploadError) {
        alert('Error uploading file: ' + uploadError.message)
        return
      }

      // 2. Get Signed URL
      const { data, error: urlError } = await supabase.storage
        .from('intern-files')
        .createSignedUrl(filePath, 315360000) // 10 years

      if (urlError) {
          alert('Error creating signed URL: ' + urlError.message)
          return
      }
      
      if (data) {
          // 3. Send Message with [IMAGE] prefix
          await insertMessage(`[IMAGE] ${data.signedUrl}`)
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
        onImageUpload={handleImageUpload}
        onReaction={handleReaction}
        onRequestClearChat={handleClearChatRequest}
        messagesEndRef={messagesEndRef}
        onOpenMobileMenu={() => setIsSidebarOpen(true)}
      />
    </div>
  )
}
