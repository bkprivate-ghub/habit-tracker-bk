'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const [habits, setHabits] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    // Get current user from localStorage
    const savedUser = localStorage.getItem('habitUser')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        
        // Load habits for this user
        const { data: habitsData } = await supabase
          .from('habits')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
        if (habitsData) setHabits(habitsData)
      } catch (e) {
        console.error('Error loading user')
      }
    }
    
    setLoading(false)
  }

  const deleteHabit = async (id: string) => {
    if (confirm('Delete this habit permanently?')) {
      await supabase
        .from('daily_entries')
        .delete()
        .eq('habit_id', id)
      
      await supabase
        .from('habits')
        .delete()
        .eq('id', id)
      
      loadData()
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB')
      return
    }

    if (!currentUser) {
      alert('Please log in first')
      return
    }

    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update user's avatar in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id)

      if (updateError) throw updateError

      // Update local user
      const updatedUser = { ...currentUser, avatar_url: publicUrl }
      localStorage.setItem('habitUser', JSON.stringify(updatedUser))
      setCurrentUser(updatedUser)

      alert('Profile photo updated successfully!')

    } catch (error: any) {
      console.error('Upload error:', error)
      alert('Error uploading image: ' + error.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePhoto = async () => {
    if (!confirm('Remove your profile photo?')) return

    if (!currentUser) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', currentUser.id)

      if (error) throw error

      const updatedUser = { ...currentUser, avatar_url: null }
      localStorage.setItem('habitUser', JSON.stringify(updatedUser))
      setCurrentUser(updatedUser)

      alert('Photo removed successfully!')

    } catch (error: any) {
      console.error('Remove error:', error)
      alert('Error removing photo: ' + error.message)
    }
  }

  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out?')) {
      localStorage.removeItem('habitUser')
      window.location.reload()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-indigo-400">⚙️</div>
          <p className="text-white/40 font-light">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20 relative overflow-hidden">
      
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-md mx-auto relative z-10">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mb-1 inline-block transition-all">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white/90">⚙️ Settings</h1>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-6 border border-white/5 mb-4">
          <h2 className="text-sm font-semibold text-white/40 mb-4">Profile</h2>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 hover:border-indigo-500/50 transition-all duration-300 focus:outline-none"
                disabled={uploading}
              >
                {currentUser?.avatar_url ? (
                  <img 
                    src={currentUser.avatar_url} 
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-4xl text-white/20">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {uploading ? '⏳' : '📷'}
                  </span>
                </div>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white/90">
                {currentUser?.name || 'User'}
              </h3>
              <p className="text-sm text-white/30">PIN: ••••</p>
              <p className="text-xs text-white/20 mt-1">Member since {new Date(currentUser?.created_at).toLocaleDateString()}</p>
              <div className="flex gap-3 mt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
                {currentUser?.avatar_url && (
                  <>
                    <span className="text-white/10">|</span>
                    <button
                      onClick={handleRemovePhoto}
                      className="text-xs text-rose-400 hover:text-rose-300 transition"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {uploading && (
            <div className="mt-3 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-white/30">Uploading image...</span>
            </div>
          )}
        </div>

        {/* Manage Habits */}
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 mb-4">
          <h2 className="text-sm font-semibold text-white/40 mb-3">Manage Habits</h2>
          <p className="text-xs text-white/20 mb-4">Delete habits you no longer track</p>
          
          {habits.length === 0 ? (
            <p className="text-sm text-white/20 py-4 text-center">No habits added yet</p>
          ) : (
            habits.map((habit) => (
              <div key={habit.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <span className="text-sm text-white/70">{habit.name}</span>
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="text-rose-400 hover:text-rose-300 text-sm px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        {/* Account Section */}
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5">
          <h2 className="text-sm font-semibold text-white/40 mb-3">Account</h2>
          
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/60">Signed in as</span>
            <span className="text-sm text-white/30">{currentUser?.name}</span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full mt-3 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-medium text-sm transition-all"
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  )
}
