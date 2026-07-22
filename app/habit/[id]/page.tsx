'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function HabitDetail() {
  const params = useParams()
  const habitId = params?.id as string
  
  const [loading, setLoading] = useState(true)
  const [habit, setHabit] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [filter, setFilter] = useState('month') // 'week' | 'month' | 'all'
  const [stats, setStats] = useState({
    consistency: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalCompletions: 0,
    totalDays: 0,
  })
  const [filteredEntries, setFilteredEntries] = useState<any[]>([])

  useEffect(() => {
    if (habitId) {
      loadHabitData()
    }
  }, [habitId])

  useEffect(() => {
    if (entries.length > 0) {
      applyFilter()
    }
  }, [entries, filter])

  const loadHabitData = async () => {
    setLoading(true)
    
    const { data: habitData } = await supabase
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .single()
    
    if (habitData) {
      setHabit(habitData)
      
      const { data: entriesData } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('habit_id', habitId)
        .order('date', { ascending: false })
      
      if (entriesData) {
        setEntries(entriesData)
        calculateStats(entriesData, habitData)
      }
    }
    
    setLoading(false)
  }

  const calculateStats = (allEntries: any[], habitData: any) => {
    // Get habit creation date
    const createdDate = new Date(habitData.created_at)
    const createdDateStr = createdDate.toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    
    // Calculate total days since creation (excluding future days)
    let totalDaysSinceCreation = 0
    let currentDate = new Date(createdDate)
    const todayDate = new Date()
    
    while (currentDate <= todayDate) {
      totalDaysSinceCreation++
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Count completions
    const completedEntries = allEntries.filter(e => e.status === 'completed')
    const completed = completedEntries.length
    
    // Consistency = completed days / total days since creation
    const consistency = totalDaysSinceCreation > 0 
      ? Math.round((completed / totalDaysSinceCreation) * 100)
      : 0
    
    // Current streak
    let currentStreak = 0
    let checkDate = new Date()
    
    // Check from today backwards
    for (let i = 0; i < totalDaysSinceCreation + 10; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      // Don't count future days
      if (dateStr > today) {
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      }
      const entry = allEntries.find(e => e.date === dateStr && e.status === 'completed')
      if (entry) {
        currentStreak++
      } else {
        break
      }
      checkDate.setDate(checkDate.getDate() - 1)
    }
    
    // Best streak
    let bestStreak = 0
    let tempBest = 0
    const sortedEntries = [...allEntries]
      .filter(e => e.status === 'completed')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    let prevDate: Date | null = null
    for (const entry of sortedEntries) {
      const currentDateObj = new Date(entry.date)
      if (prevDate === null) {
        tempBest = 1
      } else {
        const diffDays = Math.floor((currentDateObj.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          tempBest++
        } else {
          bestStreak = Math.max(bestStreak, tempBest)
          tempBest = 1
        }
      }
      prevDate = currentDateObj
    }
    bestStreak = Math.max(bestStreak, tempBest)
    
    setStats({
      consistency,
      currentStreak,
      bestStreak,
      totalCompletions: completed,
      totalDays: totalDaysSinceCreation,
    })
  }

  const applyFilter = () => {
    const today = new Date()
    let filtered = [...entries]
    let startDate: Date
    
    if (filter === 'week') {
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 7)
    } else if (filter === 'month') {
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 30)
    } else {
      setFilteredEntries(entries)
      return
    }
    
    const startStr = startDate.toISOString().split('T')[0]
    filtered = entries.filter(e => e.date >= startStr)
    setFilteredEntries(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500'
      case 'skipped': return 'bg-gray-400'
      case 'pending': return 'bg-amber-400'
      default: return 'bg-gray-200'
    }
  }

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'skipped': return '⏭️'
      case 'pending': return '⏳'
      default: return '⬜'
    }
  }

  // Calculate consistency for filtered data
  const calculateFilteredConsistency = () => {
    if (filteredEntries.length === 0) return 0
    
    const today = new Date().toISOString().split('T')[0]
    let totalDays = 0
    let startDate: Date
    
    if (filter === 'week') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      totalDays = 7
    } else if (filter === 'month') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      totalDays = 30
    } else {
      // For 'all', use total days since creation
      const createdDate = new Date(habit?.created_at)
      const todayDate = new Date()
      let count = 0
      let current = new Date(createdDate)
      while (current <= todayDate) {
        count++
        current.setDate(current.getDate() + 1)
      }
      totalDays = count
    }
    
    const completed = filteredEntries.filter(e => e.status === 'completed').length
    return Math.round((completed / totalDays) * 100)
  }

  // Get missed days for the filtered period
  const getMissedDays = () => {
    if (filter === 'all') {
      // For 'all', calculate total days since creation minus completions
      const createdDate = new Date(habit?.created_at)
      const todayDate = new Date()
      let total = 0
      let current = new Date(createdDate)
      while (current <= todayDate) {
        total++
        current.setDate(current.getDate() + 1)
      }
      return total - stats.totalCompletions
    }
    
    const today = new Date()
    const totalDays = filter === 'week' ? 7 : 30
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - totalDays)
    const startStr = startDate.toISOString().split('T')[0]
    
    const completedDates = new Set(
      filteredEntries.filter(e => e.status === 'completed').map(e => e.date)
    )
    
    let missed = 0
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      // Only count days up to today (not future)
      if (dateStr <= new Date().toISOString().split('T')[0] && !completedDates.has(dateStr)) {
        missed++
      }
    }
    return missed
  }

  const filteredConsistency = calculateFilteredConsistency()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-gray-600 dark:text-gray-300">📊</div>
          <p className="text-gray-500 dark:text-gray-400 font-light">Loading habit details...</p>
        </div>
      </div>
    )
  }

  if (!habit) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-500 dark:text-gray-400">Habit not found</p>
          <Link href="/" className="text-indigo-600 dark:text-indigo-400 text-sm mt-4 inline-block">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/" className="text-indigo-600 dark:text-indigo-400 text-sm mb-1 inline-block hover:text-indigo-700 dark:hover:text-indigo-300 transition">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-3xl">{habit.name.split(' ')[0]}</span>
              <span className="text-xl font-normal text-gray-500 dark:text-gray-400">
                {habit.name.split(' ').slice(1).join(' ')}
              </span>
            </h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.consistency}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Consistency</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500">
              {stats.totalCompletions}/{stats.totalDays} days
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">
              {stats.currentStreak}d
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">🔥 Current Streak</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.bestStreak}d
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">🏆 Best Streak</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.totalCompletions}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">✅ Total Done</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4">
          {['week', 'month', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-300
                ${filter === f 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              {f === 'week' ? '🗓️ Week' : f === 'month' ? '🗓️ Month' : '📊 All'}
            </button>
          ))}
        </div>

        {/* Consistency Progress Bar - Using Stats.consistency (overall) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500 dark:text-gray-400">Overall Consistency</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{stats.consistency}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${stats.consistency}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            <span>0%</span>
            <span>{stats.totalCompletions} of {stats.totalDays} days completed</span>
            <span>100%</span>
          </div>
        </div>

        {/* Daily Entries List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            📋 Daily Tracking ({filteredEntries.length} entries)
          </h2>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                No entries for this period
              </p>
            ) : (
              filteredEntries.map((entry, i) => {
                const date = new Date(entry.date)
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const isToday = entry.date === new Date().toISOString().split('T')[0]
                
                return (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between py-2 px-3 rounded-lg
                      ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200/50 dark:border-indigo-800/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10">
                        {dayName}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {dateStr}
                        {isToday && <span className="ml-1 text-xs text-indigo-500 dark:text-indigo-400">(Today)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(entry.status)}`}></span>
                      <span className="text-sm">{getStatusEmoji(entry.status)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
