'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from './lib/supabase'

export default function Home() {
  const [habits, setHabits] = useState<any[]>([])
  const [dailyEntries, setDailyEntries] = useState<any[]>([])
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📚')
  const [greeting, setGreeting] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const emojis = ['📚', '💪', '📝', '🧴', '💼', '🏃', '🧘', '📖', '🎯', '💡', '🌱', '⭐']
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const hour = new Date().getHours()
    let g = 'Good Evening'
    if (hour < 12) g = 'Good Morning'
    else if (hour < 17) g = 'Good Afternoon'
    setGreeting(g)
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    
    // Load habits
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (habitsData) {
      setHabits(habitsData)
      
      // Load daily entries (last 30 days for streaks)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
      
      const { data: entriesData } = await supabase
        .from('daily_entries')
        .select('*')
        .gte('date', thirtyDaysAgoStr)
        .order('date', { ascending: false })
      
      setDailyEntries(entriesData || [])
      
      // Calculate streaks
      calculateStreaks(entriesData || [], habitsData)
    }
    
    setLoading(false)
  }

  const calculateStreaks = (entries: any[], habitsData: any[]) => {
    const streakMap: Record<string, number> = {}
    
    for (const habit of habitsData) {
      const habitEntries = entries
        .filter(e => e.habit_id === habit.id && e.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      let streak = 0
      let checkDate = new Date()
      
      for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        const entry = habitEntries.find(e => e.date === dateStr)
        
        if (entry) {
          streak++
        } else {
          break
        }
        checkDate.setDate(checkDate.getDate() - 1)
      }
      
      streakMap[habit.id] = streak
    }
    
    setStreaks(streakMap)
  }

  const toggleHabit = async (habitId: string) => {
    setTogglingId(habitId) // Show loading state
    
    // Check if already done today
    const existing = dailyEntries.find(e => e.habit_id === habitId && e.date === today)
    const isDone = existing?.status === 'completed'
    const newStatus = isDone ? 'pending' : 'completed'
    
    // Update UI immediately (optimistic update)
    const updatedEntries = [...dailyEntries]
    const existingIndex = updatedEntries.findIndex(e => e.habit_id === habitId && e.date === today)
    
    if (existingIndex >= 0) {
      updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], status: newStatus }
    } else {
      updatedEntries.push({ habit_id: habitId, date: today, status: newStatus })
    }
    
    setDailyEntries(updatedEntries)
    
    // Update streaks immediately
    const newStreaks = { ...streaks }
    if (newStatus === 'completed') {
      // Check if yesterday was completed
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const yesterdayEntry = dailyEntries.find(e => e.habit_id === habitId && e.date === yesterdayStr)
      
      if (yesterdayEntry?.status === 'completed') {
        newStreaks[habitId] = (streaks[habitId] || 0) + 1
      } else {
        newStreaks[habitId] = 1
      }
    } else {
      newStreaks[habitId] = 0
    }
    setStreaks(newStreaks)
    
    // Update in background
    try {
      await supabase
        .from('daily_entries')
        .delete()
        .eq('habit_id', habitId)
        .eq('date', today)
      
      await supabase
        .from('daily_entries')
        .insert({
          habit_id: habitId,
          date: today,
          status: newStatus,
          completed_at: !isDone ? new Date().toISOString() : null
        })
      
      // Also update habits table
      await supabase
        .from('habits')
        .update({ done: !isDone })
        .eq('id', habitId)
      
    } catch (error) {
      console.error('Background sync error:', error)
    }
    
    setTogglingId(null)
  }

  const addHabit = async () => {
    if (newHabitName.trim() === '') return
    const fullName = `${selectedEmoji} ${newHabitName}`
    
    const { data, error } = await supabase
      .from('habits')
      .insert([{ name: fullName, done: false }])
      .select()
    
    if (!error && data) {
      setHabits([...habits, data[0]])
      setNewHabitName('')
      setShowAddForm(false)
      await loadAllData()
    }
  }

  const getIsDone = (habitId: string) => {
    const entry = dailyEntries.find(e => e.habit_id === habitId && e.date === today)
    return entry?.status === 'completed'
  }

  const total = habits.length
  const completed = habits.filter(h => getIsDone(h.id)).length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  
  // Calculate total streak across all habits
  const totalStreak = Object.values(streaks).reduce((sum, s) => sum + s, 0)

  const dateDisplay = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p className="text-gray-500">Loading your habits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-md mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {greeting || 'Hello'}, Bharath K 👋
            </h1>
            <p className="text-gray-500 text-sm">{dateDisplay}</p>
          </div>
          <Link href="/settings" className="text-2xl p-2 hover:bg-gray-200 rounded-full transition">
            ⚙️
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Today's Progress</p>
            <p className="text-3xl font-bold text-blue-500">{progress}%</p>
            <p className="text-xs text-gray-400">{completed} of {total} habits done</p>
          </div>
          <div className="relative w-20 h-20">
            <svg className="transform -rotate-90 w-20 h-20">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" strokeWidth="6"/>
              <circle 
                cx="40" cy="40" r="32" 
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="6"
                strokeDasharray={`${progress * 2.01} 201`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {progress}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-3 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-green-500">{completed}</div>
            <div className="text-xs text-gray-500">Done</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {habits.filter(h => !getIsDone(h.id)).length}
            </div>
            <div className="text-xs text-gray-500">Remaining</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-orange-500">{totalStreak}</div>
            <div className="text-xs text-gray-500">Total Streak</div>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-gray-600 mb-3">Today's Habits</h2>
        
        {habits.map((habit) => {
          const isDone = getIsDone(habit.id)
          const streak = streaks[habit.id] || 0
          const isToggling = togglingId === habit.id
          
          return (
            <div 
              key={habit.id}
              onClick={() => !isToggling && toggleHabit(habit.id)}
              className={`bg-white p-4 rounded-xl shadow mb-2 border-l-4 transition-all cursor-pointer
                ${isDone ? 'border-green-500 bg-green-50/50' : 'border-blue-500'}
                ${isToggling ? 'opacity-50' : 'opacity-100'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`${isDone ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {habit.name}
                  </span>
                  {streak > 0 && (
                    <span className="ml-2 text-xs text-orange-500 font-medium">
                      🔥 {streak}d
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isToggling ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="text-xl">{isDone ? '✅' : '◻️'}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {!showAddForm ? (
          <button 
            onClick={() => setShowAddForm(true)}
            className="w-full mt-4 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-200 hover:bg-blue-600 transition"
          >
            + Add New Habit
          </button>
        ) : (
          <div className="mt-4 bg-white p-4 rounded-xl shadow">
            <input
              type="text"
              placeholder="Enter habit name..."
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap mb-3">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-1.5 rounded-lg transition
                    ${selectedEmoji === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addHabit}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium"
              >
                Add Habit
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
