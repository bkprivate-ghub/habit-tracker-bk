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
    entries?.forEach(e => {
      if (!entriesMap.has(e.date)) {
        entriesMap.set(e.date, [])
      }
      entriesMap.get(e.date).push(e)
    })

    // TODAY
    const todayEntries = entriesMap.get(today) || []
    const todayCompleted = todayEntries.filter(e => e.status === 'completed').length
    setTodayData({ completed: todayCompleted, total: totalHabits })

    // WEEKLY with offset
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
      const completed = dayEntries.filter(e => e.status === 'completed').length
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      
      const hasEntries = entriesMap.has(dateStr)
      const isFuture = date > new Date()
      
      weekData.push({
        day: dayName,
        date: dateStr,
        completed,
        total: totalHabits,
        hasEntries,
        isFuture,
        percentage: totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0,
      })
    }
    setWeeklyData(weekData)

    // MONTHLY
    const monthData = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayEntries = entriesMap.get(dateStr) || []
      const completed = dayEntries.filter(e => e.status === 'completed').length
      
      let status = 'missed'
      if (completed === totalHabits) status = 'all-done'
      else if (completed > 0) status = 'partial'
      
      monthData.push({
        date: dateStr,
        day: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        completed,
        total: totalHabits,
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
      const completed = dayEntries.filter(e => e.status === 'completed').length
      
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
      const completed = dayEntries.filter(e => e.status === 'completed').length
      
      if (completed === totalHabits) {
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    let totalCompletions = 0
    entries?.forEach(e => {
      if (e.status === 'completed') totalCompletions++
    })

    const daysWithEntries = entriesMap.size
    const daysWithCompletions = Array.from(entriesMap.values())
      .filter(dayEntries => dayEntries.some(e => e.status === 'completed'))
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

    const quote = motivationalQuotes.find(q => consistency >= q.min && consistency <= q.max)
    setMotivation(quote ? quote.text : "🌟 Keep going, you're doing great!")

    setLoading(false)
  }

  const goToPreviousWeek = () => setWeekOffset(weekOffset - 1)
  const goToNextWeek = () => {
    if (weekOffset < 0) setWeekOffset(weekOffset + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-md mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/" className="text-blue-500 text-sm mb-1 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">📊 Analytics</h1>
          </div>
        </div>

        {/* MOTIVATIONAL QUOTE */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-4 text-center">
          <p className="text-sm text-blue-700 font-medium">{motivation}</p>
        </div>

        {/* TODAY */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-2">📅 Today</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-500">
                {todayData.completed}/{todayData.total}
              </p>
              <p className="text-sm text-gray-500">habits completed today</p>
            </div>
            <div className="relative w-16 h-16">
              <svg className="transform -rotate-90 w-16 h-16">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#E5E7EB" strokeWidth="5"/>
                <circle 
                  cx="32" cy="32" r="28" 
                  fill="none" 
                  stroke="#3B82F6" 
                  strokeWidth="5"
                  strokeDasharray={`${todayData.total > 0 ? (todayData.completed / todayData.total) * 176 : 0} 176`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {todayData.total > 0 ? Math.round((todayData.completed / todayData.total) * 100) : 0}%
              </span>
            </div>
          </div>
          {stats.currentStreak > 0 && (
            <div className="mt-3 text-sm text-orange-500 font-medium">
              🔥 {stats.currentStreak} day streak!
            </div>
          )}
        </div>

        {/* WEEKLY - BEAUTIFUL BAR CHART */}
        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-600">📈 Weekly Progress</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={goToPreviousWeek}
                className="text-sm p-1 hover:bg-gray-100 rounded-full transition px-2"
              >
                ◀
              </button>
              <span className="text-xs font-medium text-gray-600">{weekLabel}</span>
              <button 
                onClick={goToNextWeek}
                className={`text-sm p-1 rounded-full transition px-2 ${weekOffset >= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                disabled={weekOffset >= 0}
              >
                ▶
              </button>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end justify-between h-48 gap-1.5 mt-2">
            {weeklyData.map((day, i) => {
              const height = day.percentage
              const isToday = day.date === new Date().toISOString().split('T')[0]
              
              let barColor = 'bg-gray-200'
              let labelColor = 'text-gray-400'
              let barLabel = '—'
              
              if (day.isFuture) {
                barColor = 'bg-gray-100'
                barLabel = '📅'
              } else if (day.hasEntries) {
                if (day.percentage === 100) {
                  barColor = 'bg-gradient-to-t from-green-500 to-green-400'
                  labelColor = 'text-green-600'
                  barLabel = `${day.completed}/${day.total} ✅`
                } else if (day.percentage >= 50) {
                  barColor = 'bg-gradient-to-t from-yellow-500 to-yellow-400'
                  labelColor = 'text-yellow-600'
                  barLabel = `${day.completed}/${day.total} 🟡`
                } else if (day.percentage > 0) {
                  barColor = 'bg-gradient-to-t from-orange-400 to-orange-300'
                  labelColor = 'text-orange-500'
                  barLabel = `${day.completed}/${day.total} 🟠`
                } else {
                  barColor = 'bg-gradient-to-t from-red-400 to-red-300'
                  labelColor = 'text-red-400'
                  barLabel = `${day.completed}/${day.total} ❌`
                }
              }
              
              // Show empty state for no data
              if (!day.hasEntries && !day.isFuture) {
                barColor = 'bg-gray-100'
                barLabel = '—'
              }

              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative" style={{ height: '100%' }}>
                    {/* Bar */}
                    {!day.isFuture && day.hasEntries ? (
                      <div 
                        className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${barColor}`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      >
                        {/* Percentage label on top of bar */}
                        {height > 20 && (
                          <div className="absolute -top-5 w-full text-center text-[10px] font-bold text-gray-600">
                            {height}%
                          </div>
                        )}
                      </div>
                    ) : day.isFuture ? (
                      <div className="absolute bottom-0 w-full h-4 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-[10px] text-gray-400">📅</span>
                      </div>
                    ) : (
                      <div className="absolute bottom-0 w-full h-2 bg-gray-100 rounded-full"></div>
                    )}
                    
                    {/* Value label below bar */}
                    <div className="absolute bottom-0 w-full text-center text-[9px] font-medium -mb-4">
                      {barLabel}
                    </div>
                  </div>
                  <span className={`text-xs mt-5 font-medium ${isToday ? 'text-blue-600 font-bold' : day.isFuture ? 'text-gray-300' : 'text-gray-600'}`}>
                    {day.day}
                    {isToday && ' • Today'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-3 mt-6 text-[10px] text-gray-400 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span> 100%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span> 50-99%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-orange-400 rounded-full"></span> 1-49%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-400 rounded-full"></span> 0%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-200 rounded-full"></span> No Data
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-100 rounded-full"></span> 📅 Future
            </span>
          </div>
        </div>

        {/* MONTHLY HEATMAP */}
        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">📅 Monthly Progress</h2>
          <div className="grid grid-cols-7 gap-1">
            {monthlyData.map((day, i) => {
              const dotColor = day.status === 'all-done' ? 'bg-green-500' 
                : day.status === 'partial' ? 'bg-yellow-500' : 'bg-gray-200'
              
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${dotColor}`}>
                    <span className={`text-[10px] font-medium ${day.status === 'missed' ? 'text-gray-400' : 'text-white'}`}>
                      {day.day}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
            <span>🟢 All Done</span>
            <span>🟡 Partial</span>
            <span>⬜ Missed</span>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.bestStreak}d</div>
            <div className="text-xs text-gray-500">🏆 Best Streak</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-purple-500">{stats.totalCompletions}</div>
            <div className="text-xs text-gray-500">✅ Total Done</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-green-500">{stats.consistency}%</div>
            <div className="text-xs text-gray-500">📊 Consistency</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-blue-500">{weeklyData.filter(d => d.percentage === 100 && d.hasEntries).length}/7</div>
            <div className="text-xs text-gray-500">📅 Perfect Days</div>
          </div>
        </div>

      </div>
    </div>
  )
}
