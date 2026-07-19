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

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)

    // Get all habits
    const { data: habits } = await supabase
      .from('habits')
      .select('*')

    if (!habits || habits.length === 0) {
      setLoading(false)
      return
    }

    const totalHabits = habits.length
    const today = new Date().toISOString().split('T')[0]

    // Get last 60 days of entries
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0]

    const { data: entries } = await supabase
      .from('daily_entries')
      .select('*')
      .gte('date', sixtyDaysAgoStr)
      .order('date', { ascending: true })

    const entriesMap = new Map()
    entries?.forEach(e => {
      if (!entriesMap.has(e.date)) {
        entriesMap.set(e.date, [])
      }
      entriesMap.get(e.date).push(e)
    })

    // --- TODAY ---
    const todayEntries = entriesMap.get(today) || []
    const todayCompleted = todayEntries.filter(e => e.status === 'completed').length
    setTodayData({ completed: todayCompleted, total: totalHabits })

    // --- WEEKLY (Last 7 days) ---
    const weekData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayEntries = entriesMap.get(dateStr) || []
      const completed = dayEntries.filter(e => e.status === 'completed').length
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      
      let status = 'missed'
      if (completed === totalHabits) status = 'all-done'
      else if (completed > 0) status = 'partial'
      
      weekData.push({
        day: dayName,
        date: dateStr,
        completed,
        total: totalHabits,
        status,
      })
    }
    setWeeklyData(weekData)

    // --- MONTHLY (Last 30 days with dots) ---
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

    // --- STATS ---
    // Current streak (consecutive days with 100% completion)
    let currentStreak = 0
    let checkDate = new Date()
    for (let i = 0; i < 60; i++) {
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

    // Best streak
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

    // Total completions
    let totalCompletions = 0
    entries?.forEach(e => {
      if (e.status === 'completed') totalCompletions++
    })

    // Consistency (days with at least 1 completion / days with entries)
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

    setLoading(false)
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

        {/* --- TODAY --- */}
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
                  strokeDasharray={`${(todayData.completed / todayData.total) * 176} 176`}
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

        {/* --- WEEKLY BAR CHART --- */}
        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">📈 Weekly Progress</h2>
          <div className="flex items-end justify-between h-40 gap-1">
            {weeklyData.map((day, i) => {
              const height = day.total > 0 ? (day.completed / day.total) * 100 : 0
              const barColor = day.completed === day.total ? 'bg-green-500' 
                : day.completed > 0 ? 'bg-yellow-500' : 'bg-gray-300'
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative" style={{ height: '100%' }}>
                    <div 
                      className={`absolute bottom-0 w-full rounded-t-lg transition-all ${barColor}`}
                      style={{ height: `${Math.max(height, 2)}%` }}
                    ></div>
                    <div className="absolute bottom-0 w-full text-center text-[10px] font-medium text-gray-600 -mb-5">
                      {day.completed}/{day.total}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-6">{day.day}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* --- MONTHLY HEATMAP --- */}
        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">📅 Monthly Progress</h2>
          <div className="grid grid-cols-7 gap-1">
            {monthlyData.map((day, i) => {
              const dotColor = day.status === 'all-done' ? 'bg-green-500' 
                : day.status === 'partial' ? 'bg-yellow-500' : 'bg-gray-200'
              const label = day.status === 'all-done' ? '✅' 
                : day.status === 'partial' ? '🟡' : '⬜'
              
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${dotColor}`}>
                    <span className="text-[10px] text-white font-medium">{day.day}</span>
                  </div>
                  <div className="text-[8px] text-gray-400">{day.month}</div>
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

        {/* --- STATS CARDS --- */}
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
            <div className="text-2xl font-bold text-blue-500">{weeklyData.filter(d => d.status === 'all-done').length}/7</div>
            <div className="text-xs text-gray-500">📅 Perfect Days</div>
          </div>
        </div>

      </div>
    </div>
  )
}
