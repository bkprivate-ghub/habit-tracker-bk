'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<any[]>([])
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all')
  const [todayData, setTodayData] = useState({ completed: 0, total: 0 })
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [stats, setStats] = useState({
    currentStreak: 0,
    bestStreak: 0,
    totalCompletions: 0,
    consistency: 0,
  })
  const [motivation, setMotivation] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekLabel, setWeekLabel] = useState('')

  const motivationalQuotes = [
    { min: 0, max: 20, text: "🔥 Your grind starts now. Own it." },
    { min: 21, max: 40, text: "⚡ Every rep counts. Keep pushing." },
    { min: 41, max: 60, text: "💪 Momentum is building. Stay locked in." },
    { min: 61, max: 80, text: "🏆 You're on fire. Don't stop now." },
    { min: 81, max: 100, text: "👑 Legend status. Unstoppable." },
  ]

  // Load habits once on mount
  useEffect(() => {
    loadHabits()
  }, [])

  // Load analytics when habits loaded or selection changes
  useEffect(() => {
    if (habits.length > 0) {
      loadAnalytics()
    }
  }, [selectedHabitId, weekOffset, habits])

  const loadHabits = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('habits')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    
    if (data) {
      setHabits(data)
    } else {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || habits.length === 0) {
      setLoading(false)
      return

    const habitIds = selectedHabitId === 'all' 
      ? habits.map(h => h.id) 
      : [selectedHabitId]

    const totalHabits = selectedHabitId === 'all' ? habits.length : 1
    const today = new Date().toISOString().split('T')[0]

    // Get entries for last 30 days only (faster)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: entries } = await supabase
      .from('daily_entries')
      .select('habit_id, date, status')
      .in('habit_id', habitIds)
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgoStr)
      .order('date', { ascending: true })

    // Build entries map
    const entriesMap = new Map()
    entries?.forEach((e: any) => {
      if (!entriesMap.has(e.date)) {
        entriesMap.set(e.date, [])
      }
      entriesMap.get(e.date).push(e)
    })

    // TODAY
    const todayEntries = entriesMap.get(today) || []
    const todayCompleted = todayEntries.filter((e: any) => e.status === 'completed').length
    setTodayData({ completed: todayCompleted, total: totalHabits })

    // WEEKLY
    const todayDate = new Date()
    const currentDay = todayDate.getDay()
    const startOfWeek = new Date(todayDate)
    startOfWeek.setDate(todayDate.getDate() - currentDay + (weekOffset * 7))
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' })
    const startDay = startOfWeek.getDate()
    const endDay = endOfWeek.getDate()
    const year = startOfWeek.getFullYear()
    
    if (startMonth === endMonth) {
      setWeekLabel(`${startMonth} ${startDay} - ${endDay}, ${year}`)
    } else {
      setWeekLabel(`${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`)
    }

    const weekData = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dayEntries = entriesMap.get(dateStr) || []
      const completed = dayEntries.filter((e: any) => e.status === 'completed').length
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      
      const hasEntries = entriesMap.has(dateStr)
      const isFuture = date > new Date()
      
      let habitsThatExisted = 0
      for (const habit of habits) {
        if (selectedHabitId !== 'all' && habit.id !== selectedHabitId) continue
        const habitCreatedAt = new Date(habit.created_at)
        const habitCreatedDate = habitCreatedAt.toISOString().split('T')[0]
        if (habitCreatedDate <= dateStr) {
          habitsThatExisted++
        }
      }
      
      const totalForDay = habitsThatExisted > 0 ? habitsThatExisted : (selectedHabitId === 'all' ? habits.length : 1)
      
      weekData.push({
        day: dayName,
        date: dateStr,
        completed,
        total: totalForDay,
        hasEntries,
        isFuture,
        percentage: totalForDay > 0 ? Math.round((completed / totalForDay) * 100) : 0,
      })
    }
    setWeeklyData(weekData)

    // MONTHLY (last 30 days)
    const monthData = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayEntries = entriesMap.get(dateStr) || []
      const completed = dayEntries.filter((e: any) => e.status === 'completed').length
      
      let habitsThatExisted = 0
      for (const habit of habits) {
        if (selectedHabitId !== 'all' && habit.id !== selectedHabitId) continue
        const habitCreatedAt = new Date(habit.created_at)
        const habitCreatedDate = habitCreatedAt.toISOString().split('T')[0]
        if (habitCreatedDate <= dateStr) {
          habitsThatExisted++
        }
      }
      
      const totalForDay = habitsThatExisted > 0 ? habitsThatExisted : (selectedHabitId === 'all' ? habits.length : 1)
      
      let status = 'missed'
      if (completed === totalForDay && totalForDay > 0) status = 'all-done'
      else if (completed > 0) status = 'partial'
      
      monthData.push({
        date: dateStr,
        day: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        completed,
        total: totalForDay,
        status,
      })
    }
    setMonthlyData(monthData)

    // STATS
    let totalCompletions = 0
    entries?.forEach((e: any) => {
      if (e.status === 'completed') totalCompletions++
    })

    let totalPossible = 0
    const uniqueDates = Array.from(entriesMap.keys()).sort()
    for (const date of uniqueDates) {
      let habitsThatExisted = 0
      for (const habit of habits) {
        if (selectedHabitId !== 'all' && habit.id !== selectedHabitId) continue
        const habitCreatedAt = new Date(habit.created_at)
        const habitCreatedDate = habitCreatedAt.toISOString().split('T')[0]
        if (habitCreatedDate <= date) {
          habitsThatExisted++
        }
      }
      totalPossible += habitsThatExisted > 0 ? habitsThatExisted : (selectedHabitId === 'all' ? habits.length : 1)
    }
    
    const consistency = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0

    // Current streak
    let currentStreak = 0
    let checkDate = new Date()
    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const dayEntries = entriesMap.get(dateStr) || []
      const completed = dayEntries.filter((e: any) => e.status === 'completed').length
      
      if (completed > 0) {
        currentStreak++
      } else {
        break
      }
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Best streak (look at all data)
    let bestStreak = 0
    let tempStreak = 0
    const sortedDates = Array.from(entriesMap.keys()).sort()
    for (const date of sortedDates) {
      const dayEntries = entriesMap.get(date) || []
      const completed = dayEntries.filter((e: any) => e.status === 'completed').length
      
      if (completed > 0) {
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    setStats({
      currentStreak,
      bestStreak,
      totalCompletions,
      consistency,
    })

    const quote = motivationalQuotes.find(q => consistency >= q.min && consistency <= q.max)
    setMotivation(quote ? quote.text : "🔥 Your grind starts now. Own it.")

    setLoading(false)
  }

  const goToPreviousWeek = () => setWeekOffset(weekOffset - 1)
  const goToNextWeek = () => {
    if (weekOffset < 0) setWeekOffset(weekOffset + 1)
  }

  const getSelectedHabitName = () => {
    if (selectedHabitId === 'all') return 'All Habits'
    const habit = habits.find(h => h.id === selectedHabitId)
    return habit ? habit.name : 'All Habits'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-indigo-400">📊</div>
          <p className="text-white/40 font-light">Loading analytics...</p>
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
            <h1 className="text-2xl font-bold text-white/90">📊 Analytics</h1>
          </div>
        </div>

        {/* HABIT DROPDOWN FILTER */}
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 mb-4">
          <label className="text-xs text-white/30 font-medium block mb-2">Select Habit</label>
          <select
            value={selectedHabitId}
            onChange={(e) => {
              setSelectedHabitId(e.target.value)
              setWeekOffset(0)
            }}
            className="w-full p-3 bg-black/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/50 text-white text-sm appearance-none cursor-pointer"
          >
            <option value="all" className="bg-black text-white">📊 All Habits</option>
            {habits.map((habit) => (
              <option key={habit.id} value={habit.id} className="bg-black text-white">
                {habit.name}
              </option>
            ))}
          </select>
        </div>

        {/* MOTIVATIONAL QUOTE */}
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 mb-4 border border-white/5 text-center">
          <p className="text-sm text-indigo-400 font-medium">{motivation}</p>
        </div>

        {/* TODAY */}
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-6 border border-white/5 mb-4">
          <h2 className="text-sm font-semibold text-white/40 mb-2">📅 Today</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-white/90">
                {todayData.completed}/{todayData.total}
              </p>
              <p className="text-sm text-white/30">habits completed today</p>
            </div>
            <div className="relative w-16 h-16">
              <svg className="transform -rotate-90 w-16 h-16">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
                <circle 
                  cx="32" cy="32" r="28" 
                  fill="none" 
                  stroke="url(#todayGradient)" 
                  strokeWidth="5"
                  strokeDasharray={`${todayData.total > 0 ? (todayData.completed / todayData.total) * 176 : 0} 176`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                <defs>
                  <linearGradient id="todayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/60">
                {todayData.total > 0 ? Math.round((todayData.completed / todayData.total) * 100) : 0}%
              </span>
            </div>
          </div>
          {stats.currentStreak > 0 && (
            <div className="mt-3 text-sm text-orange-400 font-medium">
              🔥 {stats.currentStreak} day streak!
            </div>
          )}
        </div>

        {/* WEEKLY BAR CHART */}
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/40">📈 Weekly Progress</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={goToPreviousWeek}
                className="text-sm p-1 hover:bg-white/5 rounded-full transition px-2 text-white/40 hover:text-white"
              >
                ◀
              </button>
              <span className="text-xs font-medium text-white/40">{weekLabel}</span>
              <button 
                onClick={goToNextWeek}
                className={`text-sm p-1 rounded-full transition px-2 ${weekOffset >= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5'} text-white/40 hover:text-white`}
                disabled={weekOffset >= 0}
              >
                ▶
              </button>
            </div>
          </div>

          <div className="flex items-end justify-between h-52 gap-1.5 mt-2 px-1">
            {weeklyData.map((day, i) => {
              const barHeight = day.hasEntries ? Math.max(day.percentage, 4) : 4
              const isToday = day.date === new Date().toISOString().split('T')[0]
              
              let barColor = 'bg-white/5'
              let barLabel = '—'
              let labelColor = 'text-white/20'
              
              if (day.isFuture) {
                barColor = 'bg-white/5'
                barLabel = '📅'
                labelColor = 'text-white/10'
              } else if (day.hasEntries) {
                if (day.percentage === 100 && day.total > 0) {
                  barColor = 'bg-emerald-500'
                  labelColor = 'text-emerald-400'
                  barLabel = `✅ ${day.completed}/${day.total}`
                } else if (day.percentage >= 50) {
                  barColor = 'bg-amber-500'
                  labelColor = 'text-amber-400'
                  barLabel = `🟡 ${day.completed}/${day.total}`
                } else if (day.percentage > 0) {
                  barColor = 'bg-orange-500'
                  labelColor = 'text-orange-400'
                  barLabel = `🟠 ${day.completed}/${day.total}`
                } else {
                  barColor = 'bg-rose-500'
                  labelColor = 'text-rose-400'
                  barLabel = `❌ ${day.completed}/${day.total}`
                }
              }

              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full">
                  <div className="w-full h-40 relative flex items-end">
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-700 ease-out ${barColor}`}
                      style={{ 
                        height: `${barHeight}%`,
                        minHeight: day.hasEntries ? '8px' : '4px',
                        opacity: day.hasEntries || day.isFuture ? 1 : 0.2
                      }}
                    >
                      {day.hasEntries && barHeight > 30 && day.total > 0 && (
                        <div className="absolute -top-5 w-full text-center text-[11px] font-bold text-white/60">
                          {day.percentage}%
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`text-[9px] font-medium mt-1 ${labelColor} h-3`}>
                    {barLabel}
                  </div>
                  
                  <span className={`text-xs font-medium mt-1 ${isToday ? 'text-indigo-400 font-bold' : day.isFuture ? 'text-white/20' : 'text-white/40'}`}>
                    {day.day}
                    {isToday && ' • Today'}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-center gap-3 mt-6 text-[10px] text-white/20 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> 100%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-amber-500 rounded-full"></span> 50-99%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-orange-500 rounded-full"></span> 1-49%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-rose-500 rounded-full"></span> 0%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-white/5 rounded-full"></span> No Data
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-white/5 rounded-full"></span> 📅 Future
            </span>
          </div>
        </div>

        {/* MONTHLY HEATMAP */}
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 mb-4">
          <h2 className="text-sm font-semibold text-white/40 mb-3">🗓️ Monthly Progress</h2>
          <div className="grid grid-cols-7 gap-1">
            {monthlyData.map((day, i) => {
              let dotColor = 'bg-white/5'
              let textColor = 'text-white/20'
              
              if (day.status === 'all-done') {
                dotColor = 'bg-emerald-500'
                textColor = 'text-white'
              } else if (day.status === 'partial') {
                dotColor = 'bg-amber-500'
                textColor = 'text-white'
              } else if (day.status === 'missed') {
                dotColor = 'bg-white/5'
                textColor = 'text-white/20'
              }
              
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${dotColor}`}>
                    <span className={`text-[10px] font-medium ${textColor}`}>
                      {day.day}
                    </span>
                  </div>
                  {day.total > 0 && day.status !== 'future' && (
                    <span className="text-[6px] text-white/20 mt-0.5">
                      {day.completed}/{day.total}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-xs text-white/30">
            <span>🟢 All Done</span>
            <span>🟡 Partial</span>
            <span>⬜ Missed</span>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.bestStreak}d</div>
            <div className="text-xs text-white/30">🏆 Best Streak</div>
          </div>
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.totalCompletions}</div>
            <div className="text-xs text-white/30">✅ Total Done</div>
          </div>
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.consistency}%</div>
            <div className="text-xs text-white/30">📊 Consistency</div>
          </div>
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-bold text-indigo-400">
              {weeklyData.filter((d: any) => d.percentage === 100 && d.hasEntries && d.total > 0).length}/7
            </div>
            <div className="text-xs text-white/30">📅 Perfect Days</div>
          </div>
        </div>

      </div>
    </div>
  )
}
