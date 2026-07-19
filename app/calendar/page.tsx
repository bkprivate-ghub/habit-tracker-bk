'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Calendar() {
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarData, setCalendarData] = useState<any[]>([])
  const [entriesMap, setEntriesMap] = useState<Map<string, any[]>>(new Map())
  const [habits, setHabits] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedDayDetails, setSelectedDayDetails] = useState<any[]>([])

  useEffect(() => {
    loadCalendarData()
  }, [currentDate])

  const loadCalendarData = async () => {
    setLoading(true)

    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
    
    if (!habitsData) {
      setLoading(false)
      return
    }
    setHabits(habitsData)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const startStr = firstDay.toISOString().split('T')[0]
    const endStr = lastDay.toISOString().split('T')[0]

    const { data: entriesData } = await supabase
      .from('daily_entries')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)

    const map = new Map()
    entriesData?.forEach(e => {
      if (!map.has(e.date)) {
        map.set(e.date, [])
      }
      map.get(e.date).push(e)
    })
    setEntriesMap(map)

    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()
    
    const days = []
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, date: null, status: 'empty' })
    }
    
    const today = new Date().toISOString().split('T')[0]
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const dateStr = date.toISOString().split('T')[0]
      const dayEntries = map.get(dateStr) || []
      const completed = dayEntries.filter(e => e.status === 'completed').length
      
      let status = 'future'
      if (dateStr < today) {
        if (completed === habitsData.length) status = 'all-done'
        else if (completed > 0) status = 'partial'
        else status = 'missed'
      } else if (dateStr === today) {
        if (completed === habitsData.length) status = 'all-done'
        else if (completed > 0) status = 'partial'
        else status = 'pending'
      }
      
      days.push({
        day: d,
        date: dateStr,
        status,
        completed,
        total: habitsData.length,
        entries: dayEntries,
      })
    }
    
    setCalendarData(days)
    setLoading(false)
  }

  const handleDayClick = (day: any) => {
    if (!day.date) return
    setSelectedDay(day.date)
    setSelectedDayDetails(day.entries || [])
  }

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentDate(newDate)
    setSelectedDay(null)
  }

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'all-done': return '🟢'
      case 'partial': return '🟡'
      case 'missed': return '🔴'
      case 'pending': return '◈'
      case 'future': return '○'
      default: return '○'
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-gray-600 dark:text-gray-300">◆</div>
          <p className="text-gray-500 dark:text-gray-400 font-light">Loading calendar...</p>
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
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">🗓️ Calendar</h1>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 mb-4">
          <button 
            onClick={() => changeMonth(-1)}
            className="text-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-600 dark:text-gray-300"
          >
            ◀
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button 
            onClick={() => changeMonth(1)}
            className="text-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-600 dark:text-gray-300"
          >
            ▶
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 mb-4">
          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarData.map((day, i) => {
              if (day.status === 'empty') {
                return <div key={i} className="aspect-square"></div>
              }
              
              const isToday = day.date === new Date().toISOString().split('T')[0]
              const isSelected = day.date === selectedDay
              
              let bgColor = 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              let borderColor = 'border-transparent'
              
              if (day.status === 'all-done') {
                bgColor = 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
              } else if (day.status === 'partial') {
                bgColor = 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30'
              } else if (day.status === 'missed') {
                bgColor = 'bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30'
              } else if (day.status === 'future') {
                bgColor = 'bg-gray-50 dark:bg-gray-800/50'
              }
              
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all
                    ${bgColor}
                    ${isSelected ? 'ring-2 ring-indigo-400 dark:ring-indigo-500 shadow-md' : ''}
                    ${isToday ? 'border-2 border-indigo-400 dark:border-indigo-500' : borderColor}
                    hover:scale-105
                  `}
                >
                  <span className={`text-sm font-medium
                    ${day.status === 'all-done' ? 'text-emerald-600 dark:text-emerald-400' : ''}
                    ${day.status === 'partial' ? 'text-amber-600 dark:text-amber-400' : ''}
                    ${day.status === 'missed' ? 'text-rose-500 dark:text-rose-400' : ''}
                    ${day.status === 'future' ? 'text-gray-400 dark:text-gray-500' : ''}
                    ${day.status === 'pending' ? 'text-indigo-500 dark:text-indigo-400' : ''}
                  `}>
                    {day.day}
                  </span>
                  <span className="text-xs mt-0.5">
                    {getStatusEmoji(day.status)}
                  </span>
                  {day.status !== 'future' && day.status !== 'empty' && day.status !== 'pending' && (
                    <span className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {day.completed}/{day.total}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span>🟢 All Done</span>
          <span>🟡 Partial</span>
          <span>🔴 Missed</span>
          <span>○ Future</span>
        </div>

        {/* Day Details */}
        {selectedDay && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 animate-slide-up">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-white">
                {new Date(selectedDay).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button 
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                ✕
              </button>
            </div>
            
            {selectedDayDetails.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No habits tracked this day</p>
            ) : (
              <div className="space-y-1">
                {selectedDayDetails.map((entry, i) => {
                  const habit = habits.find(h => h.id === entry.habit_id)
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {habit?.name || 'Unknown habit'}
                      </span>
                      <span className={`text-sm font-medium
                        ${entry.status === 'completed' ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}
                      >
                        {entry.status === 'completed' ? '✅' : '◻️'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {calendarData.filter(d => d.status === 'all-done').length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Perfect Days</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {calendarData.filter(d => d.status === 'partial').length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Partial Days</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-lg font-bold text-rose-500 dark:text-rose-400">
              {calendarData.filter(d => d.status === 'missed').length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Missed Days</div>
          </div>
        </div>

      </div>
    </div>
  )
}
