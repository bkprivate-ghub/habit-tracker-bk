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
    
    // Get habit details
    const { data: habitData } = await supabase
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .single()
    
    if (habitData) {
      setHabit(habitData)
      
      // Get all entries for this habit
      const { data: entriesData } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('habit_id', habitId)
        .order('date', { ascending: false })
      
      if (entriesData) {
        setEntries(entriesData)
        calculateStats(entriesData)
      }
    }
    
    setLoading(false)
  }

  const calculateStats = (allEntries: any[]) => {
    // Calculate total days (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
    
    const recentEntries = allEntries.filter(e => e.date >= thirtyDaysAgoStr)
    const completed = recentEntries.filter(e => e.status === 'completed').length
    const totalDays = 30
    
    // Consistency %
    const consistency = Math.round((completed / totalDays) * 100)
    
    // Current streak
    let currentStreak = 0
    let checkDate = new Date()
    const todayStr = checkDate.toISOString().split('T')[0]
    
    // Check if today is completed
    const todayEntry = allEntries.find(e => e.date === todayStr && e.status === 'completed')
    if (!todayEntry) {
      // Check yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const yesterdayEntry = allEntries.find(e => e.date === yesterdayStr && e.status === 'completed')
      if (!yesterdayEntry) {
        currentStreak = 0
      }
    }
    
    // Count streak
    let tempStreak = 0
    let checkDateCopy = new Date()
    for (let i = 0; i < 60; i++) {
      const dateStr = checkDateCopy.toISOString().split('T')[0]
      const entry = allEntries.find(e => e.date === dateStr && e.status === 'completed')
      if (entry) {
        tempStreak++
      } else {
        break
      }
      checkDateCopy.setDate(checkDateCopy.getDate() - 1)
    }
    currentStreak = tempStreak
    
    // Best streak
    let bestStreak = 0
    let tempBest = 0
    const sortedEntries = [...allEntries]
      .filter(e => e.status === 'completed')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    let prevDate: Date | null = null
    for (const entry of sortedEntries) {
      const currentDate = new Date(entry.date)
      if (prevDate === null) {
        tempBest = 1
      } else {
        const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          tempBest++
        } else {
          bestStreak = Math.max(bestStreak, tempBest)
          tempBest = 1
        }
      }
      prevDate = currentDate
    }
    bestStreak = Math.max(bestStreak, tempBest)
    
    setStats({
      consistency,
      currentStreak,
      bestStreak,
      totalCompletions: allEntries.filter(e => e.status === 'completed').length,
      totalDays: allEntries.length,
    })
  }

  const applyFilter = () => {
    const today = new Date()
    let filtered = [...entries]
    
    if (filter === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString().split('T')[0]
      filtered = entries.filter(e => e.date >= weekAgoStr)
    } else if (filter === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 30)
      const monthAgoStr = monthAgo.toISOString().split('T')[0]
      filtered = entries.filter(e => e.date >= monthAgoStr)
    }
    
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

  // Calculate consistency for filtered data
  const filteredCompleted = filteredEntries.filter(e => e.status === 'completed').length
  const filteredTotal = filteredEntries.length || 1
  const filteredConsistency = Math.round((filteredCompleted / filteredTotal) * 100)

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
              {filteredConsistency}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Consistency</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500">
              {filteredCompleted}/{filteredTotal} days
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
              {f === 'week' ? '📅 Week' : f === 'month' ? '📆 Month' : '📊 All'}
            </button>
          ))}
        </div>

        {/* Consistency Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500 dark:text-gray-400">Consistency</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{filteredConsistency}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${filteredConsistency}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            <span>0%</span>
            <span>{filteredCompleted} days completed</span>
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
