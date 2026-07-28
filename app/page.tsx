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
  const [typedText, setTypedText] = useState('')
  const [showAssemble, setShowAssemble] = useState(false)

  const emojis = ['📚', '💪', '📝', '🧴', '💼', '🏃', '🧘', '📖', '🎯', '💡', '🌱', '⭐']
  const today = new Date().toISOString().split('T')[0]

  const habitOrder = ['Workout', 'Reading', 'Journal', 'Business Skillset', 'Skincare']

  // Typing effect texts
  const typingTexts = [
    '> INITIALIZING SYSTEM...',
    '> LOADING USER PROFILE: BHARATH K',
    '> SYNCING HABIT DATA...',
    '> SYSTEM READY.'
  ]

  useEffect(() => {
    const hour = new Date().getHours()
    let g = 'Good Evening'
    if (hour < 12) g = 'Good Morning'
    else if (hour < 17) g = 'Good Afternoon'
    setGreeting(g)
    loadAllData()
    
    // Splash screen: typing effect then assemble
    let index = 0
    let charIndex = 0
    let currentText = ''
    
    const typeInterval = setInterval(() => {
      if (index < typingTexts.length) {
        const fullText = typingTexts[index]
        if (charIndex < fullText.length) {
          currentText += fullText[charIndex]
          setTypedText(currentText)
          charIndex++
        } else {
          currentText += '\n'
          setTypedText(currentText)
          index++
          charIndex = 0
        }
      } else {
        clearInterval(typeInterval)
        // After typing is done, show assembly animation
        setTimeout(() => {
          setShowSplash(false)
          setShowAssemble(true)
        }, 600)
      }
    }, 30)

    return () => clearInterval(typeInterval)
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

  // Splash Screen - Tech Terminal with Typing
  if (showSplash) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 cyber-grid opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/20 to-black" />
        
        {/* Terminal Window */}
        <div className="relative z-10 w-full max-w-2xl">
          <div className="bg-black/80 backdrop-blur-xl rounded-xl border border-indigo-500/20 p-6 shadow-2xl shadow-indigo-500/5">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-indigo-500/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
              </div>
              <span className="text-xs text-indigo-400/60 ml-2 font-mono">terminal@habit-tracker:~$</span>
            </div>
            
            {/* Typing Output */}
            <div className="font-mono text-sm text-indigo-300/90 whitespace-pre-wrap min-h-[120px]">
              {typedText}
              <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5"></span>
            </div>
            
            {/* Loading Bar */}
            <div className="mt-4 w-full h-0.5 bg-indigo-500/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
          
          {/* Glitch Text Effect */}
          <div className="absolute -z-10 inset-0 blur-2xl bg-indigo-500/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-indigo-400">⟳</div>
          <p className="text-gray-500 font-mono text-sm">LOADING HABIT DATA...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 p-4 pb-24 relative overflow-hidden">
      
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
      
      {/* Glow Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      
      {/* Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none scanline opacity-5" />

      <div className="max-w-md mx-auto relative z-10">
        
        {/* HEADER - Assemble from left */}
        <div className={`assemble ${showAssemble ? 'delay-0' : ''}`}>
          <div className="flex justify-between items-start mb-6 pt-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-indigo-400 tracking-wider uppercase">
                  {greeting.toUpperCase()}
                </span>
                <span className="text-xs text-indigo-400/40 animate-pulse">●</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-white/90 tech-glow">Bharath K</span>
              </h1>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                {dateDisplay}
              </p>
            </div>
            
            <div className="flex gap-0.5 bg-white/5 p-1 rounded-xl border border-white/5">
              <Link 
                href="/calendar" 
                className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300 hover:scale-110"
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
                className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300 hover:scale-110"
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
                className="p-2 hover:bg-white/5 rounded-lg transition-all duration-300 hover:scale-110"
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

        {/* PROGRESS CARD - Assemble from right */}
        <div className={`assemble-r ${showAssemble ? 'delay-1' : ''}`}>
          <div className="glass rounded-2xl p-5 mb-5 border border-white/5 glow-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-gray-500 tracking-wider uppercase">System Progress</p>
                <p className="text-3xl font-bold text-white/90">
                  {progress}%
                </p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {completed} / {total} habits active
                </p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="transform -rotate-90 w-20 h-20">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
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
                <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white/60">
                  {progress}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* STATS GRID - Assemble from left */}
        <div className={`grid grid-cols-3 gap-2.5 mb-5 ${showAssemble ? '' : 'opacity-0'}`}>
          {[
            { value: completed, label: 'DONE', color: 'text-emerald-400' },
            { value: habits.filter((h: any) => !getIsDone(h.id)).length, label: 'PENDING', color: 'text-amber-400' },
            { value: activeStreaks, label: 'STREAKS', color: 'text-orange-400' },
          ].map((stat, i) => (
            <div 
              key={i} 
              className={`assemble ${showAssemble ? `delay-${i + 3}` : ''}`}
            >
              <div className="glass rounded-xl p-3.5 text-center border border-white/5 hover:border-indigo-500/20 transition-all duration-300">
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[8px] text-gray-500 font-mono tracking-wider">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* BEST STREAK - Assemble from right */}
        {bestEverStreak > 0 && (
          <div className={`assemble-r ${showAssemble ? 'delay-4' : ''}`}>
            <div className="glass rounded-xl p-4 mb-5 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border border-indigo-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <p className="text-[10px] text-indigo-400 font-mono tracking-wider">ALL-TIME BEST STREAK</p>
                    <p className="text-xl font-bold text-white/90">{bestEverStreak} days</p>
                  </div>
                </div>
                <div className="text-3xl animate-float">🔥</div>
              </div>
            </div>
          </div>
        )}

        {/* HABITS SECTION - Assemble one by one */}
        <div className={`${showAssemble ? '' : 'opacity-0'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-mono text-gray-500 tracking-wider uppercase">Active Modules</h2>
            <span className="text-[10px] text-gray-600 font-mono">{habits.length} running</span>
          </div>
          
          <div className="space-y-2">
            {habits.map((habit: any, index: number) => {
              const isDone = getIsDone(habit.id)
              const streak = streaks[habit.id] || 0
              const isToggling = togglingId === habit.id
              const delay = index + 5
              
              return (
                <div 
                  key={habit.id}
                  onClick={() => !isToggling && toggleHabit(habit.id)}
                  className={`assemble ${showAssemble ? `delay-${delay}` : ''}`}
                >
                  <div className={`glass rounded-xl p-3.5 border transition-all duration-300 cursor-pointer
                    ${isDone ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 hover:border-indigo-500/20'}
                    ${isToggling ? 'opacity-50' : 'opacity-100'}
                    hover:scale-[1.01]
                  `}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className={`text-sm font-medium transition-all duration-300 font-mono
                            ${isDone ? 'line-through text-gray-500' : 'text-white/90'}
                          `}>
                            {habit.name}
                          </p>
                          {streak > 0 && (
                            <p className="text-[9px] text-orange-400 font-mono mt-0.5">
                              ⟳ STREAK: {streak}d
                            </p>
                          )}
                          {streak === 0 && isDone && (
                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                              ✦ INITIATED
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
        </div>

        {/* ADD HABIT BUTTON - Assemble last */}
        <div className={`mt-5 assemble-up ${showAssemble ? 'delay-10' : ''}`}>
          {!showAddForm ? (
            <button 
              onClick={() => setShowAddForm(true)}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-mono text-sm transition-all duration-300 hover:scale-[1.01] active:scale-95 border border-indigo-400/20 shadow-lg shadow-indigo-500/10"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="text-lg">+</span>
                DEPLOY NEW MODULE
              </span>
            </button>
          ) : (
            <div className="glass rounded-xl p-4 border border-white/5">
              <input
                type="text"
                placeholder="ENTER MODULE NAME..."
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="w-full p-3 bg-black/40 border border-white/10 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all text-white placeholder:text-gray-600 font-mono text-sm"
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
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono text-sm transition-all hover:scale-[1.01]"
                >
                  ✦ DEPLOY
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg font-mono text-sm transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* System Status Footer */}
        <div className="mt-4 text-center">
          <p className="text-[8px] font-mono text-gray-600 tracking-widest">
            SYSTEM v2.0 · ALL SYSTEMS ACTIVE · {habits.length} MODULES LOADED
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .scanline {
          position: relative;
          overflow: hidden;
        }
        .scanline::after {
          content: '';
          position: fixed;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent);
          animation: scanline 8s linear infinite;
          top: -100%;
        }
        @keyframes scanline {
          0% { top: -100%; }
          100% { top: 200%; }
        }
        .assemble {
          animation: assemble 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .assemble-r {
          animation: assemble-r 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .assemble-up {
          animation: assemble-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes assemble {
          0% { opacity: 0; transform: translateX(-20px) scale(0.95); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes assemble-r {
          0% { opacity: 0; transform: translateX(20px) scale(0.95); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes assemble-up {
          0% { opacity: 0; transform: translateY(30px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .delay-0 { animation-delay: 0s; opacity: 0; }
        .delay-1 { animation-delay: 0.08s; opacity: 0; }
        .delay-2 { animation-delay: 0.16s; opacity: 0; }
        .delay-3 { animation-delay: 0.24s; opacity: 0; }
        .delay-4 { animation-delay: 0.32s; opacity: 0; }
        .delay-5 { animation-delay: 0.40s; opacity: 0; }
        .delay-6 { animation-delay: 0.48s; opacity: 0; }
        .delay-7 { animation-delay: 0.56s; opacity: 0; }
        .delay-8 { animation-delay: 0.64s; opacity: 0; }
        .delay-9 { animation-delay: 0.72s; opacity: 0; }
        .delay-10 { animation-delay: 0.80s; opacity: 0; }
        .delay-11 { animation-delay: 0.88s; opacity: 0; }
        .delay-12 { animation-delay: 0.96s; opacity: 0; }
      `}</style>
    </div>
  )
}
