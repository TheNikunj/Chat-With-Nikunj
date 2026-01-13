import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Image } from 'lucide-react'

export default function ChatImage({ src, alt, className, style }) {
  const [signedUrl, setSignedUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchSignedUrl = async () => {
      // If src is already a full http URL (e.g. from a public bucket that ACTUALLY worked, or external), try to use it.
      // But typically we store the path or a public URL that failed. 
      // Let's assume the content sent was `[IMAGE] <url>`.
      // If the URL contains the supabase storage url, we can extract the path.
      
      try {
        let path = src
        
        // Check if it's a full Supabase URL and extract path
        // Example: https://xyz.supabase.co/storage/v1/object/public/intern-files/user/file.jpg
        const publicMarker = '/public/intern-files/'
        if (src.includes(publicMarker)) {
           path = src.split(publicMarker)[1]
        } else if (src.startsWith('http')) {
            // If it's some other URL, just try to load it directly
            setSignedUrl(src)
            setLoading(false)
            return
        }

        // If we extracted a path (or it was stored as a path), create a signed URL
        // We need to assume the bucket is 'intern-files' based on our implementation
        const { data, error } = await supabase.storage
            .from('intern-files')
            .createSignedUrl(path, 3600 * 24 * 7) // 7 days expiry

        if (data?.signedUrl) {
            setSignedUrl(data.signedUrl)
        } else {
            console.error('Error signing URL:', error)
            setError(true)
        }
      } catch (err) {
          console.error('Error processing image URL:', err)
          setError(true)
      } finally {
          setLoading(false)
      }
    }

    fetchSignedUrl()
  }, [src])

  if (loading) {
      return (
          <div className="flex items-center justify-center bg-gray-700/50 rounded" style={{ ...style, height: '150px', width: '200px' }}>
              <span className="text-xs text-gray-400">Loading...</span>
          </div>
      )
  }

  if (error || !signedUrl) {
      return (
          <div className="flex items-center justify-center bg-gray-700/50 rounded text-red-400" style={{ ...style, height: '150px', width: '200px' }}>
              <Image className="h-8 w-8 opacity-50" />
              <span className="sr-only">Image failed to load</span>
          </div>
      )
  }

  return (
    <img 
      src={signedUrl} 
      alt={alt} 
      className={className} 
      style={style}
    />
  )
}
