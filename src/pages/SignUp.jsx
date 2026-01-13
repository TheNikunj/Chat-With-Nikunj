import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Link, useNavigate } from 'react-router-dom'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
        // Check if session exists (Auto Confirm ON) or not (Confirm Email ON)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
             navigate('/')
        } else {
            // Email confirmation required
            setLoading(false)
            alert('Registration successful! Please check your email to confirm your account before logging in.')
            navigate('/login')
        }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-gray-800 p-6 shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-white">
            Create an account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          {error && (
            <div className="rounded-md bg-red-500/10 p-4 text-center text-sm text-red-500">
              {error}
            </div>
          )}
          <div className="space-y-4">
             <div>
              <input
                type="text"
                required
                className="block w-full rounded-md border-0 bg-gray-700 p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <input
                type="email"
                required
                className="block w-full rounded-md border-0 bg-gray-700 p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="block w-full rounded-md border-0 bg-gray-700 p-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
           <div className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
