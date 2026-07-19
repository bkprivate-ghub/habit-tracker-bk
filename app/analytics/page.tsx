'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalHabits: 0,
    completionRate: 0,
    bestStreak: 0,
    totalCompletions: 0,
    weeklyData: [] as { day: string; completed: number; total: number }[],
    monthlyData: [] as { date: string; completed: number; total: number }[],
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
    
    if (!habits) {
      setLoading(false)
      return
    }
    
    // Get last 30 days of entries
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
    
    const { data: entries } = await supabase
      .from('daily_entries')
      .select('*')
      .gte('date', thirtyDaysAgoStr)
      .order('date', { ascending: true })
    
    // Calculate weekly data (last 7 days)
    const weeklyData = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayEntries = entries?.filter(e => e.date === dateStr) || []
      const completed = dayEntries.filter(e => e.status === 'completed').length
      weeklyData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        completed,
        total: habits.length,
      })
    }
    
    // Calculate monthly data (last 30 days)
    const monthlyData = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayEntries = entries?.filter(e => e.date === dateStr) || []
      const completed = dayEntries.filter(e => e.status === 'completed').length
      monthlyData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed,
        total: habits.length,
      })
    }
    
    // Calculate stats
    const totalCompletions = entries?.filter(e => e.status === 'completed').length || 0
    const totalPossible = habits.length * 30
    const completionRate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0
    
    // Calculate consistency (days with > 0 completions)
    const daysWithCompletions = new Set()
    entries?.forEach(e => {
      if (e.status === 'completed') {
        daysWithCompletions.add(e.date)
      }
    })
    const consistency = Math.round((daysWithCompletions.size / 30) * 100)
    
    // Calculate best streak
    let bestStreak = 0
    let currentStreak = 0
    let prevDate: Date | null = null
    
    const sortedEntries = entries?.filter(e => e.status === 'completed')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || []
    
    for (const entry of sortedEntries) {
      const currentDate = new Date(entry.date)
      if (prevDate === null) {
        currentStreak = 1
      } else {
        const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          currentStreak++
        } else {
          bestStreak = Math.max(bestStreak, currentStreak)
          currentStreak = 1
        }
      }
      prevDate = currentDate
    }
    bestStreak = Math.max(bestStreak, currentStreak)
    
    setStats({
      totalHabits: habits.length,
      completionRate,
      bestStreak,
      totalCompletions,
      weeklyData,
      monthlyData,
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.completionRate}%</div>
            <div className="text-xs text-gray-500">Completion Rate</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.bestStreak}d</div>
            <div className="text-xs text-gray-500">Best Streak</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-green-500">{stats.consistency}%</div>
            <div className="text-xs text-gray-500">Consistency</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-purple-500">{stats.totalCompletions}</div>
            <div className="text-xs text-gray-500">Total Completions</div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">📈 Weekly Progress</h2>
          <div className="flex items-end justify-between h-32 gap-1">
            {stats.weeklyData.map((day, i) => {
              const height = day.total > 0 ? (day.completed / day.total) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-gray-200 rounded-t-lg" style={{ height: `${height}%` }}>
                    <div 
                      className="w-full bg-blue-500 rounded-t-lg transition-all"
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">{day.day}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">📉 Monthly Trend</h2>
          <div className="space-y-1">
            {stats.monthlyData.slice(0, 7).map((day, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">{day.date}</span>
                <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(day.completed / day.total) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-8">
                  {day.completed}/{day.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-2xl p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">🏆 Achievements</h2>
          <div className="grid grid-cols-3 gap-2">
            {stats.bestStreak >= 7 && (
              <div className="bg-orange-50 p-3 rounded-xl text-center border border-orange-200">
                <div className="text-2xl">🔥</div>
                <div className="text-xs text-orange-600 font-medium">7 Day Streak</div>
              </div>
            )}
            {stats.bestStreak >= 30 && (
              <div className="bg-yellow-50 p-3 rounded-xl text-center border border-yellow-200">
                <div className="text-2xl">⭐</div>
                <div className="text-xs text-yellow-600 font-medium">30 Day Streak</div>
              </div>
            )}
            {stats.completionRate >= 90 && (
              <div className="bg-green-50 p-3 rounded-xl text-center border border-green-200">
                <div className="text-2xl">💪</div>
                <div className="text-xs text-green-600 font-medium">90%+ Rate</div>
              </div>
            )}
            {stats.totalHabits >= 5 && (
              <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-200">
                <div className="text-2xl">📚</div>
                <div className="text-xs text-blue-600 font-medium">5+ Habits</div>
              </div>
            )}
            {stats.consistency >= 80 && (
              <div className="bg-purple-50 p-3 rounded-xl text-center border border-purple-200">
                <div className="text-2xl">🎯</div>
                <div className="text-xs text-purple-600 font-medium">80% Consistency</div>
              </div>
            )}
            {stats.bestStreak === 0 && (
              <div className="bg-gray-50 p-3 rounded-xl text-center border border-gray-200 col-span-3">
                <div className="text-2xl">🚀</div>
                <div className="text-xs text-gray-500 font-medium">Complete habits to unlock achievements!</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
