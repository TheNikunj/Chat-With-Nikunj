import React from 'react'
import { Check, CheckCheck, Clock } from 'lucide-react'

export default function MessageStatus({ status, isOwnMessage }) {
  if (!isOwnMessage) return null

  if (!status || status === 'pending') {
    return <Clock className="w-3 h-3 text-gray-400" />
  }

  if (status === 'sent') {
    return <Check className="w-3 h-3 text-gray-400" />
  }

  if (status === 'delivered') {
    return <CheckCheck className="w-3 h-3 text-gray-400" />
  }

  if (status === 'read') {
    return <CheckCheck className="w-3 h-3 text-blue-500" />
  }

  return null
}
