'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
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
    { min: 0, max: 20, text: "💪 Every journey begins with a single step. Keep going!" },
    { min: 21, max: 40, text: "🌱 Progress is progress, no matter how small. You're growing!" },
    { min: 41, max: 60, text: "🔥 You're building momentum! Consistency is key!" },
    { min: 61, max: 80, text: "⭐ Amazing work! You're building habits that last!" },
    { min: 81, max: 90, text: "🏆 Incredible dedication! You're nearly at the top!" },
    { min: 91, max: 100, text: "🌟 PERFECT SCORE! You're unstoppable! Keep this energy!" },
  ]

  useEffect(() => {
    loadAnalytics()
  }, [weekOffset])

  const loadAnalytics = async () => {
    setLoading(true)

    const { data: habits } = await supabase
      .from('habits')
      .select('*')

    if (!habits || habits.length === 0) {
      setLoading(false)
      return
    }

    const totalHabits = habits.length
    const today = new Date().toISOString().split('T')[0]

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

    const { data: entries } = await supabase
      .from('daily_entries')
      .select('*')
      .gte('date', ninetyDaysAgoStr)
      .order('date', { ascending: true })

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

    // WEEKLY with offset - FIXED to only count habits that existed
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
      
      // Calculate how many habits existed on this date
      let habitsThatExisted = 0
      for (const habit of habits) {
        const habitCreatedAt = new Date(habit.created_at)
        const habitCreatedDate = habitCreatedAt.toISOString().split('T')[0]
        if (habitCreatedDate <= dateStr) {
          habitsThatExisted++
        }
      }
      
      const totalForDay = habitsThatExisted > 0 ? habitsThatExisted : habits.length
      
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

    // MONTHLY - FIXED to only count habits that existed on each date
    const monthData = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayEntries = entriesMap.get(dateStr) || []
      const completed = dayEntries.filter((e: any) => e.status === 'completed').length
      
      let habitsThatExisted = 0
      for (const habit of habits) {
        const habitCreatedAt = new Date(habit.created_at)
        const habitCreatedDate = habitCreatedAt.toISOString().split('T')[0]
        if (habitCreatedDate <= dateStr) {
          habitsThatExisted++
        }
      }
      
      const totalForDay = habitsThatExisted > 0 ? habitsThatExisted : habits.length
      
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
    let currentStreak = 0
    let checkDate = new Date()
    for (let i = 0; i < 90; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const dayEntries = entriesMap.get(dateStr) || []
      const completed = dayEntries.filter((e: any) => e.status === 'completed').length
      
      if (completed === totalHabits) {
        currentStreak++
      } else {
        break
      }
      checkDate.setDate(checkDate.getDate() - 1)
    }

    let bestStreak = 0
    let tempStreak = 0
    const sortedDates = Array.from(entriesMap.keys()).sort()
    for (const date of sortedDates) {
      const dayEntries = entriesMap.get(date) || []
      const completed = dayEntries.filter((e: any) => e.status === 'completed').length
      
      if (completed === totalHabits) {
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    let totalCompletions = 0
    entries?.forEach((e: any) => {
      if (e.status === 'completed') totalCompletions++
    })

    const daysWithEntries = entriesMap.size
    const daysWithCompletions = Array.from(entriesMap.values())
      .filter((dayEntries: any[]) => dayEntries.some((e: any) => e.status === 'completed'))
      .length
    const consistency = daysWithEntries > 0 
      ? Math.round((daysWithCompletions / daysWithEntries) * 100)
      : 0

    setStats({
      currentStreak,
      bestStreak,
      totalCompletions,
      consistency,
    })

    // Select quote based on current streak and consistency
    let quote = null
    
    if (daysWithEntries === 0) {
      quote = "🌟 Start tracking your habits to see progress!"
    } else {
      const todayEntry = entriesMap.get(today)
      const todayCompletedCount = todayEntry?.filter((e: any) => e.status === 'completed').length || 0
      
      if (todayCompletedCount === totalHabits && totalHabits > 0) {
        quote = "🌟 PERFECT SCORE! You're unstoppable! Keep this energy!"
      } else if (todayCompletedCount > 0) {
        quote = "⭐ You're making progress! Every step counts toward your goals!"
      } else if (stats.currentStreak > 0) {
        quote = `🔥 ${stats.currentStreak} day streak! Keep the momentum going!`
      } else {
        const found = motivationalQuotes.find(q => consistency >= q.min && consistency <= q.max)
        quote = found ? found.text : "🌟 Keep going, you're doing great!"
      }
    }

    setMotivation(quote)
    setLoading(false)
  }

  const goToPreviousWeek = () => setWeekOffset(weekOffset - 1)
  const goToNextWeek = () => {
    if (weekOffset < 0) setWeekOffset(weekOffset + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-gray-600 dark:text-gray-300">◆</div>
          <p className="text-gray-500 dark:text-gray-400 font-light">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-md mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/" className="text-indigo-600 dark:text-indigo-400 text-sm mb-1 inline-block hover:text-indigo-700 dark:hover:text-indigo-300 transition">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">📊 Analytics</h1>
          </div>
        </div>

        {/* MOTIVATIONAL QUOTE */}
        <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200/50 dark:border-indigo-800/30 rounded-2xl p-4 mb-4 text-center">
          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">{motivation}</p>
        </div>

        {/* TODAY */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">🗓️ Today</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {todayData.completed}/{todayData.total}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">habits completed today</p>
            </div>
            <div className="relative w-16 h-16">
              <svg className="transform -rotate-90 w-16 h-16">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#E5E7EB" className="dark:stroke-gray-700" strokeWidth="5"/>
                <circle 
                  cx="32" cy="32" r="28" 
                  fill="none" 
                  stroke="#6366F1" 
                  strokeWidth="5"
                  strokeDasharray={`${todayData.total > 0 ? (todayData.completed / todayData.total) * 176 : 0} 176`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {todayData.total > 0 ? Math.round((todayData.completed / todayData.total) * 100) : 0}%
              </span>
            </div>
          </div>
          {stats.currentStreak > 0 && (
            <div className="mt-3 text-sm text-orange-500 dark:text-orange-400 font-medium">
              🔥 {stats.currentStreak} day streak!
            </div>
          )}
        </div>

        {/* WEEKLY BAR CHART - FIXED */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">📈 Weekly Progress</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={goToPreviousWeek}
                className="text-sm p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition px-2 text-gray-600 dark:text-gray-300"
              >
                ◀
              </button>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{weekLabel}</span>
              <button 
                onClick={goToNextWeek}
                className={`text-sm p-1 rounded-full transition px-2 ${weekOffset >= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} text-gray-600 dark:text-gray-300`}
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
              
              let barColor = 'bg-gray-200 dark:bg-gray-700'
              let barLabel = '—'
              let labelColor = 'text-gray-400 dark:text-gray-500'
              
              if (day.isFuture) {
                barColor = 'bg-gray-100 dark:bg-gray-800'
                barLabel = '🗓️'
                labelColor = 'text-gray-300 dark:text-gray-600'
              } else if (day.hasEntries) {
                if (day.percentage === 100 && day.total > 0) {
                  barColor = 'bg-emerald-500 dark:bg-emerald-400'
                  labelColor = 'text-emerald-600 dark:text-emerald-400'
                  barLabel = `✅ ${day.completed}/${day.total}`
                } else if (day.percentage >= 50) {
                  barColor = 'bg-amber-500 dark:bg-amber-400'
                  labelColor = 'text-amber-600 dark:text-amber-400'
                  barLabel = `🟡 ${day.completed}/${day.total}`
                } else if (day.percentage > 0) {
                  barColor = 'bg-orange-400 dark:bg-orange-400'
                  labelColor = 'text-orange-500 dark:text-orange-400'
                  barLabel = `🟠 ${day.completed}/${day.total}`
                } else {
                  barColor = 'bg-rose-400 dark:bg-rose-400'
                  labelColor = 'text-rose-400 dark:text-rose-400'
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
                        opacity: day.hasEntries || day.isFuture ? 1 : 0.3
                      }}
                    >
                      {day.hasEntries && barHeight > 30 && day.total > 0 && (
                        <div className="absolute -top-5 w-full text-center text-[11px] font-bold text-gray-600 dark:text-gray-300">
                          {day.percentage}%
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`text-[9px] font-medium mt-1 ${labelColor} h-3`}>
                    {barLabel}
                  </div>
                  
                  <span className={`text-xs font-medium mt-1 ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : day.isFuture ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
                    {day.day}
                    {isToday && ' • Today'}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-center gap-3 mt-6 text-[10px] text-gray-400 dark:text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> 100%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-amber-500 rounded-full"></span> 50-99%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-orange-400 rounded-full"></span> 1-49%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-rose-400 rounded-full"></span> 0%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full"></span> No Data
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-full"></span> 🗓️ Future
            </span>
          </div>
        </div>

        {/* MONTHLY HEATMAP - FIXED */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">🗓️ Monthly Progress</h2>
          <div className="grid grid-cols-7 gap-1">
            {monthlyData.map((day, i) => {
              let dotColor = 'bg-gray-200 dark:bg-gray-700'
              let textColor = 'text-gray-400 dark:text-gray-500'
              
              if (day.status === 'all-done') {
                dotColor = 'bg-emerald-500 dark:bg-emerald-400'
                textColor = 'text-white'
              } else if (day.status === 'partial') {
                dotColor = 'bg-amber-500 dark:bg-amber-400'
                textColor = 'text-white'
              } else if (day.status === 'missed') {
                dotColor = 'bg-gray-200 dark:bg-gray-700'
                textColor = 'text-gray-400 dark:text-gray-500'
              }
              
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${dotColor}`}>
                    <span className={`text-[10px] font-medium ${textColor}`}>
                      {day.day}
                    </span>
                  </div>
                  {day.total > 0 && day.status !== 'future' && (
                    <span className="text-[6px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {day.completed}/{day.total}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>🟢 All Done</span>
            <span>🟡 Partial</span>
            <span>⬜ Missed</span>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">{stats.bestStreak}d</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">🏆 Best Streak</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-purple-500 dark:text-purple-400">{stats.totalCompletions}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">✅ Total Done</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{stats.consistency}%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">📊 Consistency</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-indigo-500 dark:text-indigo-400">
              {weeklyData.filter((d: any) => d.percentage === 100 && d.hasEntries && d.total > 0).length}/7
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">🗓️ Perfect Days</div>
          </div>
        </div>

      </div>
    </div>
  )
}
