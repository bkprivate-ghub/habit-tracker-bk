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

  // Define the custom order for habits
  const habitOrder = ['Workout', 'Reading', 'Journal', 'Business Skillset', 'Skincare']

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
    
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (habitsData) {
      // Sort habits in custom order
      const sortedHabits = sortHabitsByOrder(habitsData)
      setHabits(sortedHabits)
      
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
      
      const { data: entriesData } = await supabase
        .from('daily_entries')
        .select('*')
        .gte('date', thirtyDaysAgoStr)
        .order('date', { ascending: false })
      
      setDailyEntries(entriesData || [])
      calculateStreaks(entriesData || [], sortedHabits)
    }
    
    setLoading(false)
  }

  // Function to sort habits by custom order
  const sortHabitsByOrder = (habitsData: any[]) => {
    return [...habitsData].sort((a, b) => {
      // Extract the name without emoji for comparison
      const getNameWithoutEmoji = (name: string) => {
        // Remove emoji (first character if it's an emoji)
        const firstChar = name.charAt(0)
        // Check if it's an emoji (simple check)
        if (/[\u{1F000}-\u{1FFFF}]/u.test(firstChar)) {
          return name.substring(2).trim() // Remove emoji + space
        }
        return name.trim()
      }

      const nameA = getNameWithoutEmoji(a.name)
      const nameB = getNameWithoutEmoji(b.name)
      
      const indexA = habitOrder.indexOf(nameA)
      const indexB = habitOrder.indexOf(nameB)
      
      // If both are in the custom order, sort by that
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      // If only A is in the custom order, A comes first
      if (indexA !== -1) return -1
      // If only B is in the custom order, B comes first
      if (indexB !== -1) return 1
      // Otherwise sort alphabetically
      return nameA.localeCompare(nameB)
    })
  }

  const calculateStreaks = (entries: any[], habitsData: any[]) => {
    const streakMap: Record<string, number> = {}
    
    for (const habit of habitsData) {
      const habitEntries = entries
        .filter(e => e.habit_id === habit.id && e.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      let streak = 0
      let checkDate = new Date()
      const todayStr = checkDate.toISOString().split('T')[0]
      const todayEntry = habitEntries.find(e => e.date === todayStr)
      
      if (!todayEntry) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        const yesterdayEntry = habitEntries.find(e => e.date === yesterdayStr)
        
        if (!yesterdayEntry) {
          streakMap[habit.id] = 0
          continue
        }
        checkDate = yesterday
      }
      
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
    setTogglingId(habitId)
    
    const existing = dailyEntries.find(e => e.habit_id === habitId && e.date === today)
    const isDone = existing?.status === 'completed'
    const newStatus = isDone ? 'pending' : 'completed'
    
    const updatedEntries = [...dailyEntries]
    const existingIndex = updatedEntries.findIndex(e => e.habit_id === habitId && e.date === today)
    
    if (existingIndex >= 0) {
      updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], status: newStatus }
    } else {
      updatedEntries.push({ habit_id: habitId, date: today, status: newStatus })
    }
    
    setDailyEntries(updatedEntries)
    
    const habitEntries = updatedEntries
      .filter(e => e.habit_id === habitId && e.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    let streak = 0
    let checkDate = new Date()
    const todayStr = checkDate.toISOString().split('T')[0]
    const todayEntry = habitEntries.find(e => e.date === todayStr)
    
    if (todayEntry) {
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
    }
    
    setStreaks(prev => ({ ...prev, [habitId]: streak }))
    
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
      const updatedHabits = [...habits, data[0]]
      const sortedHabits = sortHabitsByOrder(updatedHabits)
      setHabits(sortedHabits)
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
  
  const bestStreak = Math.max(...Object.values(streaks), 0)
  const activeStreaks = Object.values(streaks).filter(s => s > 0).length

  const dateDisplay = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })

  // Clean floating elements - unisex
  const floatingElements = ['◈', '◇', '○', '●', '◆', '▣', '◉', '◎']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-gray-600 dark:text-gray-300">◆</div>
          <p className="text-gray-500 dark:text-gray-400 font-light">Loading your habits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20 overflow-hidden relative">
      
      {/* Floating Background Elements - Subtle */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingElements.map((el, i) => (
          <div
            key={i}
            className="absolute text-sm opacity-[0.04] dark:opacity-[0.06] animate-float"
            style={{
              left: `${(i * 11 + 7) % 100}%`,
              top: `${(i * 13 + 5) % 100}%`,
              animationDuration: `${12 + (i % 6)}s`,
              animationDelay: `${(i * 0.5) % 4}s`,
              transform: `scale(${0.6 + (i % 4) * 0.3})`
            }}
          >
            {el}
          </div>
        ))}
      </div>

      <div className="max-w-md mx-auto relative z-10">
        
        {/* Header - Clean & Professional */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">◇</span>
              <span className="text-xs font-light text-gray-400 dark:text-gray-500 tracking-widest uppercase">
                {greeting}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
              <span className="text-2xl text-gray-600 dark:text-gray-300">✦</span>
              Bharath K
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 font-light tracking-wide">
              {dateDisplay}
            </p>
          </div>
          
          {/* Icons - Clean SVG */}
          <div className="flex gap-1 bg-white/50 dark:bg-gray-800/50 p-1 rounded-2xl backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30">
            <Link 
              href="/calendar" 
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-300 hover:scale-105"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
            </Link>
            <Link 
              href="/analytics" 
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-300 hover:scale-105"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                />
              </svg>
            </Link>
            <Link 
              href="/settings" 
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-300 hover:scale-105"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 mb-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 text-7xl opacity-[0.03] dark:opacity-[0.05]">◈</div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-light text-gray-500 dark:text-gray-400">Today's Progress</p>
              <p className="text-4xl font-bold text-gray-800 dark:text-white">
                {progress}%
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{completed} of {total} habits done</p>
            </div>
            <div className="relative w-20 h-20">
              <svg className="transform -rotate-90 w-20 h-20">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" className="dark:stroke-gray-700" strokeWidth="6"/>
                <circle 
                  cx="40" cy="40" r="32" 
                  fill="none" 
                  stroke="#6366F1" 
                  strokeWidth="6"
                  strokeDasharray={`${progress * 2.01} 201`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: completed, label: 'Done', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { value: habits.filter(h => !getIsDone(h.id)).length, label: 'Remaining', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { value: activeStreaks, label: 'Streaks', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} p-3 rounded-2xl text-center border border-gray-200/30 dark:border-gray-700/30 transition-all hover:scale-105 duration-300`}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 font-light">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Best Streak Card */}
        {bestStreak > 0 && (
          <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Best Streak</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{bestStreak} days</p>
            </div>
            <div className="text-4xl">🔥</div>
          </div>
        )}

        {/* Habits Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wide">Today's Habits</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">{habits.length} active</span>
        </div>
        
        <div className="space-y-2.5">
          {habits.map((habit) => {
            const isDone = getIsDone(habit.id)
            const streak = streaks[habit.id] || 0
            const isToggling = togglingId === habit.id
            
            return (
              <div 
                key={habit.id}
                onClick={() => !isToggling && toggleHabit(habit.id)}
                className={`group relative p-4 rounded-2xl transition-all duration-300 cursor-pointer border
                  ${isDone 
                    ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30' 
                    : 'bg-white dark:bg-gray-800 border-gray-200/50 dark:border-gray-700/50 hover:shadow-md hover:scale-[1.01]'
                  }
                  ${isToggling ? 'opacity-50' : 'opacity-100'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className={`font-medium ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                        {habit.name}
                      </span>
                      {streak > 0 && (
                        <span className="ml-2 text-xs text-orange-500 dark:text-orange-400 font-medium">
                          🔥 {streak}d
                        </span>
                      )}
                      {streak === 0 && isDone && (
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
                          ✦ 1d
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isToggling ? (
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="text-xl transition-transform duration-300 group-hover:scale-110">
                        {isDone ? '✅' : '◻️'}
                      </span>
                    )}
                  </div>
                </div>
                {/* Subtle hover glow */}
                <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none
                  ${isDone ? 'bg-emerald-400/5' : 'bg-indigo-400/5'} opacity-0 group-hover:opacity-100`} />
              </div>
            )
          })}
        </div>

        {/* Add Habit Button */}
        {!showAddForm ? (
          <button 
            onClick={() => setShowAddForm(true)}
            className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-2xl font-medium shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-xl">✦</span>
              Add New Habit
              <span className="text-xl">✦</span>
            </span>
          </button>
        ) : (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="What habit to build?"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 transition-all text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap mb-3">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-2 rounded-xl transition-all duration-300 hover:scale-110
                    ${selectedEmoji === emoji ? 'bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-400 dark:ring-indigo-500 shadow-md' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addHabit}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl font-medium transition-all hover:scale-[1.02]"
              >
                ✦ Add Habit
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(3deg); }
        }
        .animate-float {
          animation: float ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
