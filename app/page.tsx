'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from './lib/supabase'

export default function Home() {
  const [habits, setHabits] = useState<any[]>([])
  const [dailyEntries, setDailyEntries] = useState<any[]>([])
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const [bestEverStreak, setBestEverStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📚')
  const [greeting, setGreeting] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [animationIndex, setAnimationIndex] = useState(0)

  const emojis = ['📚', '💪', '📝', '🧴', '💼', '🏃', '🧘', '📖', '🎯', '💡', '🌱', '⭐']
  const today = new Date().toISOString().split('T')[0]

  const habitOrder = ['Workout', 'Reading', 'Journal', 'Business Skillset', 'Skincare']

  useEffect(() => {
    const hour = new Date().getHours()
    let g = 'Good Evening'
    if (hour < 12) g = 'Good Morning'
    else if (hour < 17) g = 'Good Afternoon'
    setGreeting(g)
    loadAllData()
    
    // Hide splash screen after 2.5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false)
      // Trigger staggered animations
      setTimeout(() => setAnimationIndex(1), 100)
      setTimeout(() => setAnimationIndex(2), 250)
      setTimeout(() => setAnimationIndex(3), 400)
      setTimeout(() => setAnimationIndex(4), 550)
    }, 2200)
    
    return () => clearTimeout(timer)
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (habitsData) {
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

  const sortHabitsByOrder = (habitsData: any[]) => {
    return [...habitsData].sort((a, b) => {
      const getNameWithoutEmoji = (name: string) => {
        const firstChar = name.charAt(0)
        const isEmoji = !/[a-zA-Z0-9\s]/.test(firstChar)
        if (isEmoji) {
          return name.substring(2).trim()
        }
        return name.trim()
      }

      const nameA = getNameWithoutEmoji(a.name)
      const nameB = getNameWithoutEmoji(b.name)
      
      const indexA = habitOrder.indexOf(nameA)
      const indexB = habitOrder.indexOf(nameB)
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return nameA.localeCompare(nameB)
    })
  }

  const calculateStreaks = (entries: any[], habitsData: any[]) => {
    const streakMap: Record<string, number> = {}
    let maxStreakOverall = 0
    
    for (const habit of habitsData) {
      const habitEntries = entries
        .filter((e: any) => e.habit_id === habit.id && e.status === 'completed')
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      let streak = 0
      let checkDate = new Date()
      const todayStr = checkDate.toISOString().split('T')[0]
      const todayEntry = habitEntries.find((e: any) => e.date === todayStr)
      
      if (!todayEntry) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        const yesterdayEntry = habitEntries.find((e: any) => e.date === yesterdayStr)
        
        if (!yesterdayEntry) {
          streakMap[habit.id] = 0
          continue
        }
        checkDate = yesterday
      }
      
      for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        const entry = habitEntries.find((e: any) => e.date === dateStr)
        if (entry) {
          streak++
        } else {
          break
        }
        checkDate.setDate(checkDate.getDate() - 1)
      }
      
      streakMap[habit.id] = streak
      
      let bestStreak = 0
      let tempStreak = 0
      let prevDate: Date | null = null
      
      const sortedAsc = [...habitEntries].sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      for (const entry of sortedAsc) {
        const currentDate = new Date(entry.date)
        if (prevDate === null) {
          tempStreak = 1
        } else {
          const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays === 1) {
            tempStreak++
          } else {
            bestStreak = Math.max(bestStreak, tempStreak)
            tempStreak = 1
          }
        }
        prevDate = currentDate
      }
      bestStreak = Math.max(bestStreak, tempStreak)
      
      if (bestStreak > maxStreakOverall) {
        maxStreakOverall = bestStreak
      }
    }
    
    setStreaks(streakMap)
    setBestEverStreak(maxStreakOverall)
  }

  const toggleHabit = async (habitId: string) => {
    setTogglingId(habitId)
    
    const existing = dailyEntries.find((e: any) => e.habit_id === habitId && e.date === today)
    const isDone = existing?.status === 'completed'
    const newStatus = isDone ? 'pending' : 'completed'
    
    const updatedEntries = [...dailyEntries]
    const existingIndex = updatedEntries.findIndex((e: any) => e.habit_id === habitId && e.date === today)
    
    if (existingIndex >= 0) {
      updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], status: newStatus }
    } else {
      updatedEntries.push({ habit_id: habitId, date: today, status: newStatus })
    }
    
    setDailyEntries(updatedEntries)
    
    const habitEntries = updatedEntries
      .filter((e: any) => e.habit_id === habitId && e.status === 'completed')
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    let streak = 0
    let checkDate = new Date()
    const todayStr = checkDate.toISOString().split('T')[0]
    const todayEntry = habitEntries.find((e: any) => e.date === todayStr)
    
    if (todayEntry) {
      for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        const entry = habitEntries.find((e: any) => e.date === dateStr)
        if (entry) {
          streak++
        } else {
          break
        }
        checkDate.setDate(checkDate.getDate() - 1)
      }
    }
    
    setStreaks((prev: Record<string, number>) => ({ ...prev, [habitId]: streak }))
    
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
    const entry = dailyEntries.find((e: any) => e.habit_id === habitId && e.date === today)
    return entry?.status === 'completed'
  }

  const total = habits.length
  const completed = habits.filter((h: any) => getIsDone(h.id)).length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  
  const activeStreaks = Object.values(streaks).filter((s: number) => s > 0).length

  const dateDisplay = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })

  // Splash Screen
  if (showSplash) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-indigo-400/20 dark:bg-indigo-400/10 animate-float"
              style={{
                width: Math.random() * 6 + 2 + 'px',
                height: Math.random() * 6 + 2 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animationDuration: Math.random() * 4 + 3 + 's',
                animationDelay: Math.random() * 3 + 's',
              }}
            />
          ))}
        </div>
        
        <div className="text-center z-10 animate-scale-in">
          <div className="text-6xl mb-6 animate-float">✨</div>
          <div className="text-sm font-light text-indigo-400 dark:text-indigo-300 tracking-widest uppercase mb-2">
            {greeting}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text font-display">
            Bharath K
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-3 font-light tracking-wide animate-pulse">
            Loading your habits...
          </p>
          <div className="mt-6 flex justify-center gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500 animate-pulse"
                style={{
                  animationDelay: i * 0.2 + 's',
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-indigo-950/30 dark:to-purple-950/30 p-4 pb-24 overflow-hidden relative">
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-100/20 dark:from-indigo-500/5 to-transparent pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-200/20 dark:bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-200/20 dark:bg-indigo-500/5 rounded-full blur-3xl" />

      <div className="max-w-md mx-auto relative z-10">
        
        {/* Header - Premium */}
        <div className={`transition-all duration-700 ${animationIndex >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex justify-between items-start mb-8 pt-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-light text-indigo-400 dark:text-indigo-300 tracking-widest uppercase">
                  {greeting}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="gradient-text">Bharath K</span>
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-light tracking-wide">
                {dateDisplay}
              </p>
            </div>
            
            <div className="flex gap-0.5 bg-white/60 dark:bg-gray-800/60 p-1 rounded-2xl backdrop-blur-xl border border-gray-200/30 dark:border-gray-700/30">
              <Link 
                href="/calendar" 
                className="p-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all duration-300 hover:scale-110"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
              </Link>
              <Link 
                href="/analytics" 
                className="p-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all duration-300 hover:scale-110"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                  />
                </svg>
              </Link>
              <Link 
                href="/settings" 
                className="p-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-all duration-300 hover:scale-110"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>

        {/* Progress Card - Premium */}
        <div className={`premium-card rounded-3xl p-6 mb-6 transition-all duration-700 ${animationIndex >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 tracking-wider uppercase">Today's Progress</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-0.5">
                {progress}%
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-light">
                {completed} of {total} habits done
              </p>
            </div>
            <div className="relative w-20 h-20">
              <svg className="transform -rotate-90 w-20 h-20">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" className="dark:stroke-gray-700" strokeWidth="5"/>
                <circle 
                  cx="40" cy="40" r="32" 
                  fill="none" 
                  stroke="url(#progressGradient)" 
                  strokeWidth="5"
                  strokeDasharray={`${progress * 2.01} 201`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid - Premium */}
        <div className={`grid grid-cols-3 gap-3 mb-6 transition-all duration-700 ${animationIndex >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {[
            { value: completed, label: 'Done', color: 'text-emerald-500' },
            { value: habits.filter((h: any) => !getIsDone(h.id)).length, label: 'Remaining', color: 'text-amber-500' },
            { value: activeStreaks, label: 'Streaks', color: 'text-orange-500' },
          ].map((stat, i) => (
            <div key={i} className="premium-card rounded-2xl p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 font-light">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Best Streak Card - Premium */}
        {bestEverStreak > 0 && (
          <div className={`premium-card rounded-2xl p-4 mb-6 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200/30 dark:border-amber-800/20 transition-all duration-700 ${animationIndex >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🏆</div>
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium tracking-wide">All-Time Best Streak</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{bestEverStreak} days</p>
                </div>
              </div>
              <div className="text-3xl animate-float">🔥</div>
            </div>
          </div>
        )}

        {/* Habits Section */}
        <div className={`transition-all duration-700 ${animationIndex >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-medium text-gray-400 dark:text-gray-500 tracking-wider uppercase">Today's Habits</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{habits.length} active</span>
          </div>
          
          <div className="space-y-2.5">
            {habits.map((habit: any, index: number) => {
              const isDone = getIsDone(habit.id)
              const streak = streaks[habit.id] || 0
              const isToggling = togglingId === habit.id
              
              return (
                <div 
                  key={habit.id}
                  onClick={() => !isToggling && toggleHabit(habit.id)}
                  className={`premium-card rounded-2xl p-4 transition-all duration-300 cursor-pointer
                    ${isDone ? 'border-emerald-200/50 dark:border-emerald-800/30' : 'border-transparent'}
                    ${isToggling ? 'opacity-50' : 'opacity-100'}
                    hover:scale-[1.01] hover:shadow-lg
                  `}
                  style={{
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: 'forwards',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className={`text-sm font-medium transition-all duration-300
                          ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}
                        `}>
                          {habit.name}
                        </p>
                        {streak > 0 && (
                          <p className="text-[10px] text-orange-500 dark:text-orange-400 font-medium mt-0.5">
                            🔥 {streak}d streak
                          </p>
                        )}
                        {streak === 0 && isDone && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                            ✦ Started today
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Premium Toggle Button */}
                    <div className="habit-toggle">
                      <div className={`checkmark ${isDone ? 'completed' : ''}`}>
                        {isDone && (
                          <svg className="check-icon w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {isToggling && (
                        <div className="ripple" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Add Habit Button - Premium */}
        <div className={`mt-6 transition-all duration-700 ${animationIndex >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {!showAddForm ? (
            <button 
              onClick={() => setShowAddForm(true)}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-2xl font-medium text-sm transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-lg transition-transform duration-300 group-hover:rotate-90">✦</span>
                Add New Habit
                <span className="text-lg transition-transform duration-300 group-hover:rotate-90">✦</span>
              </span>
            </button>
          ) : (
            <div className="premium-card rounded-2xl p-5">
              <input
                type="text"
                placeholder="What habit to build?"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="w-full p-3 bg-gray-50/80 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 transition-all text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap mb-3">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`text-xl p-2 rounded-xl transition-all duration-300 hover:scale-110
                      ${selectedEmoji === emoji ? 'bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-400 dark:ring-indigo-500 shadow-md' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addHabit}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
                >
                  ✦ Add Habit
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
