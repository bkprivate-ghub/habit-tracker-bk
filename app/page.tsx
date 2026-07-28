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
  const [todayStreak, setTodayStreak] = useState(0)
  const [motivationMessage, setMotivationMessage] = useState('')
  const [currentProgress, setCurrentProgress] = useState(0)

  const emojis = ['📚', '💪', '📝', '🧴', '💼', '🏃', '🧘', '📖', '🎯', '💡', '🌱', '⭐']
  const today = new Date().toISOString().split('T')[0]

  const habitOrder = ['Workout', 'Reading', 'Journal', 'Business Skillset', 'Skincare']

  const motivationalQuotes = [
    { min: 0, max: 20, text: "🔥 Your grind starts now. Own it." },
    { min: 21, max: 40, text: "⚡ Every rep counts. Keep pushing." },
    { min: 41, max: 60, text: "💪 Momentum is building. Stay locked in." },
    { min: 61, max: 80, text: "🏆 You're on fire. Don't stop now." },
    { min: 81, max: 100, text: "👑 Legend status. Unstoppable." },
  ]

  useEffect(() => {
    const hour = new Date().getHours()
    let g = 'Good Evening'
    if (hour < 12) g = 'Good Morning'
    else if (hour < 17) g = 'Good Afternoon'
    setGreeting(g)
    loadAllData()
    
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 1800)
    
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
    
    // Calculate TODAY'S STREAK and MOTIVATION
    updateTodayStreakAndMotivation(entries, habitsData)
  }

  const updateTodayStreakAndMotivation = (entries: any[], habitsData?: any[]) => {
    // Calculate today's streak
    const todayEntries = entries.filter((e: any) => e.date === today && e.status === 'completed')
    const hasAnyDone = todayEntries.length > 0
    
    let streak = 0
    if (hasAnyDone) {
      streak = 1
      let checkDate = new Date()
      checkDate.setDate(checkDate.getDate() - 1)
      
      for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        const dayEntries = entries.filter((e: any) => e.date === dateStr && e.status === 'completed')
        if (dayEntries.length > 0) {
          streak++
        } else {
          break
        }
        checkDate.setDate(checkDate.getDate() - 1)
      }
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const yesterdayEntries = entries.filter((e: any) => e.date === yesterdayStr && e.status === 'completed')
      
      if (yesterdayEntries.length > 0) {
        streak = 1
        let checkDate = new Date(yesterday)
        checkDate.setDate(checkDate.getDate() - 1)
        
        for (let i = 0; i < 30; i++) {
          const dateStr = checkDate.toISOString().split('T')[0]
          const dayEntries = entries.filter((e: any) => e.date === dateStr && e.status === 'completed')
          if (dayEntries.length > 0) {
            streak++
          } else {
            break
          }
          checkDate.setDate(checkDate.getDate() - 1)
        }
      } else {
        streak = 0
      }
    }
    setTodayStreak(streak)

    // Calculate progress for motivation
    const dataToUse = habitsData || habits
    const total = dataToUse.length
    const completed = dataToUse.filter((h: any) => {
      const entry = entries.find((e: any) => e.habit_id === h.id && e.date === today)
      return entry?.status === 'completed'
    }).length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0
    setCurrentProgress(progress)

    const quote = motivationalQuotes.find(q => progress >= q.min && progress <= q.max)
    setMotivationMessage(quote ? quote.text : "🔥 Your grind starts now. Own it.")
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
    
    // Update today's streak and motivation IMMEDIATELY with updated entries
    const updatedEntriesAfterDb = [...updatedEntries]
    updateTodayStreakAndMotivation(updatedEntriesAfterDb)
    
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center animate-scale">
          <div className="text-5xl mb-4 animate-float-card">🔥</div>
          <div className="text-xs font-light text-indigo-400/60 tracking-widest uppercase mb-2">
            {greeting}
          </div>
          <h1 className="text-3xl font-bold text-white/90 tracking-tight">
            Bharath K
          </h1>
          <p className="text-sm text-gray-500 mt-3 font-light tracking-wide animate-pulse">
            Loading your habits...
          </p>
          <div className="mt-5 flex justify-center gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 animate-pulse"
                style={{ animationDelay: i * 0.2 + 's' }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-indigo-400">⟳</div>
          <p className="text-gray-500 font-light">Loading your habits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 pb-24 relative overflow-hidden">
      
      {/* Subtle Background Glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-md mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="animate-fade-up delay-0">
          <div className="flex justify-between items-start mb-6 pt-2">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                {/* Professional SVG Icon instead of 🔥 */}
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" 
                  />
                </svg>
                <span className="text-xs font-light text-gray-500 tracking-widest uppercase">
                  {greeting}
                </span>
                <span className="text-xs text-indigo-400/40 animate-pulse">●</span>
              </div>
              <h1 className="text-2xl font-bold text-white/90 tracking-tight">
                Bharath K
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 font-light">
                {dateDisplay}
              </p>
            </div>
            
            <div className="flex gap-0.5 bg-gray-800/50 p-1 rounded-xl border border-gray-700/30">
              <Link 
                href="/calendar" 
                className="p-1.5 hover:bg-white/5 rounded-lg transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
              </Link>
              <Link 
                href="/analytics" 
                className="p-1.5 hover:bg-white/5 rounded-lg transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                  />
                </svg>
              </Link>
              <Link 
                href="/settings" 
                className="p-1.5 hover:bg-white/5 rounded-lg transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* PROGRESS + ENERGY RING */}
        <div className="animate-fade-up delay-1">
          <div className="glass-dark rounded-2xl p-5 mb-5 border border-gray-700/30 animate-glow-pulse">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-light tracking-wider uppercase">Today's Energy</p>
                <p className="text-3xl font-bold text-white/90">
                  {progress}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5 font-light">
                  {completed} / {total} habits done
                </p>
                {/* Motivational Quote - FIXED */}
                <p className="text-sm text-indigo-400/80 font-medium mt-2 tracking-wide">
                  {motivationMessage}
                </p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="transform -rotate-90 w-20 h-20">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(55,65,81,0.4)" strokeWidth="6"/>
                  <circle 
                    cx="40" cy="40" r="32" 
                    fill="none" 
                    stroke="url(#energyGradient)" 
                    strokeWidth="6"
                    strokeDasharray={`${progress * 2.01} 201`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/80">
                  {progress}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* STATS: DONE, PENDING, STREAK - STREAK NOW UPDATES IMMEDIATELY */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { value: completed, label: 'DONE', color: 'text-emerald-400', icon: '✓' },
            { value: habits.filter((h: any) => !getIsDone(h.id)).length, label: 'PENDING', color: 'text-amber-400', icon: '○' },
            { value: todayStreak, label: 'STREAK', color: 'text-orange-400', icon: '🔥' },
          ].map((stat, i) => (
            <div 
              key={i} 
              className={`animate-fade-up delay-${i + 2}`}
            >
              <div className="glass-dark rounded-xl p-3.5 text-center border border-gray-700/30 hover:border-indigo-500/20 transition-all duration-300">
                <div className={`text-xl font-bold ${stat.color}`}>
                  {stat.icon} {stat.value}
                </div>
                <div className="text-[8px] text-gray-500 tracking-widest">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ALL-TIME BEST STREAK */}
        {bestEverStreak > 0 && (
          <div className={`animate-fade-up delay-3`}>
            <div className="glass-dark rounded-xl p-3.5 mb-5 border border-gray-700/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏆</span>
                <div>
                  <p className="text-[9px] text-gray-500 tracking-wider uppercase">All-Time Best</p>
                  <p className="text-lg font-bold text-white/90">{bestEverStreak} days</p>
                </div>
              </div>
              <span className="text-2xl opacity-50">⚡</span>
            </div>
          </div>
        )}

        {/* HABITS - Floating Visual Cards */}
        <div className="mb-3">
          <p className="text-[10px] text-gray-500 tracking-widest uppercase font-light">
            Active Habits · {habits.length}
          </p>
        </div>
        
        <div className="space-y-2.5">
          {habits.map((habit: any, index: number) => {
            const isDone = getIsDone(habit.id)
            const streak = streaks[habit.id] || 0
            const isToggling = togglingId === habit.id
            const delay = index + 4
            
            return (
              <div 
                key={habit.id}
                onClick={() => !isToggling && toggleHabit(habit.id)}
                className={`animate-fade-up delay-${delay} transform transition-all duration-300 cursor-pointer`}
              >
                <div className={`
                  glass-card rounded-xl p-3.5 border transition-all duration-300
                  ${isDone 
                    ? 'border-emerald-500/20 bg-emerald-500/5' 
                    : 'border-gray-700/30 hover:border-indigo-500/20 hover:bg-gray-800/40'
                  }
                  ${isToggling ? 'opacity-50' : 'opacity-100'}
                  hover:scale-[1.01] hover:shadow-lg hover:shadow-indigo-500/5
                  animate-float-card
                `}
                style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{habit.name.split(' ')[0]}</span>
                          <p className={`text-sm font-medium transition-all duration-300
                            ${isDone ? 'line-through text-gray-500' : 'text-white/90'}
                          `}>
                            {habit.name.split(' ').slice(1).join(' ')}
                          </p>
                        </div>
                        {streak > 0 && (
                          <p className="text-[9px] text-orange-400 font-medium mt-0.5 tracking-wider">
                            🔥 {streak}d streak
                          </p>
                        )}
                        {streak === 0 && isDone && (
                          <p className="text-[9px] text-gray-500 font-medium mt-0.5 tracking-wider">
                            ✦ Started today
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="habit-toggle">
                      <div className={`checkmark ${isDone ? 'completed' : ''}`}>
                        {isDone && (
                          <svg className="check-icon w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {isToggling && <div className="ripple" />}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ADD HABIT */}
        <div className="mt-5 animate-fade-up delay-11">
          {!showAddForm ? (
            <button 
              onClick={() => setShowAddForm(true)}
              className="w-full py-3.5 glass-dark border border-gray-700/30 hover:border-indigo-500/30 text-white/80 hover:text-white rounded-xl font-medium text-sm transition-all duration-300 hover:scale-[1.01] active:scale-95"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-lg text-indigo-400">+</span>
                Add New Habit
              </span>
            </button>
          ) : (
            <div className="glass-dark rounded-xl p-4 border border-gray-700/30">
              <input
                type="text"
                placeholder="Enter habit name..."
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="w-full p-3 bg-gray-900/50 border border-gray-700/30 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all text-white placeholder:text-gray-500 text-sm"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap mb-3">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`text-xl p-2 rounded-lg transition-all duration-300 hover:scale-110
                      ${selectedEmoji === emoji ? 'bg-indigo-500/20 ring-2 ring-indigo-400/50' : 'hover:bg-white/5'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addHabit}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-all hover:scale-[1.01]"
                >
                  ✦ Add
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg font-medium text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[8px] text-gray-600 tracking-widest font-light">
            STAY DISCIPLINED · STAY FOCUSED
          </p>
        </div>
      </div>
    </div>
  )
}
