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

    // Get habits
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
    
    if (!habitsData) {
      setLoading(false)
      return
    }
    setHabits(habitsData)

    // Get entries for the month
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

    // Build calendar grid
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    const days = []
    
    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, date: null, status: 'empty' })
    }
    
    // Days of the month
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
      case 'pending': return '⏳'
      case 'future': return '⚪'
      default: return '⬜'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'all-done': return 'All done!'
      case 'partial': return 'Partial'
      case 'missed': return 'Missed'
      case 'pending': return 'In progress'
      case 'future': return 'Future'
      default: return ''
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🗓️</div>
          <p className="text-gray-500">Loading calendar...</p>
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
            <h1 className="text-2xl font-bold text-gray-800">🗓️ Calendar</h1>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow mb-4">
          <button 
            onClick={() => changeMonth(-1)}
            className="text-2xl p-2 hover:bg-gray-100 rounded-full transition"
          >
            ◀
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button 
            onClick={() => changeMonth(1)}
            className="text-2xl p-2 hover:bg-gray-100 rounded-full transition"
          >
            ▶
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">
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
              
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all
                    ${day.status === 'empty' ? '' : 'hover:scale-105'}
                    ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                    ${isToday ? 'border-2 border-blue-500' : ''}
                  `}
                >
                  <span className={`text-sm font-medium
                    ${day.status === 'all-done' ? 'text-green-600' : ''}
                    ${day.status === 'partial' ? 'text-yellow-600' : ''}
                    ${day.status === 'missed' ? 'text-red-500' : ''}
                    ${day.status === 'future' ? 'text-gray-400' : ''}
                    ${day.status === 'pending' ? 'text-blue-500' : ''}
                  `}>
                    {day.day}
                  </span>
                  <span className="text-xs">
                    {getStatusEmoji(day.status)}
                  </span>
                  {day.status !== 'future' && day.status !== 'empty' && (
                    <span className="text-[8px] text-gray-400">
                      {day.completed}/{day.total}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs text-gray-500 mb-4">
          <span>🟢 All Done</span>
          <span>🟡 Partial</span>
          <span>🔴 Missed</span>
          <span>⚪ Future</span>
        </div>

        {/* Day Details */}
        {selectedDay && (
          <div className="bg-white rounded-2xl p-4 shadow animate-slide-up">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800">
                {new Date(selectedDay).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button 
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {selectedDayDetails.length === 0 ? (
              <p className="text-sm text-gray-500">No habits tracked this day</p>
            ) : (
              <div className="space-y-1">
                {selectedDayDetails.map((entry, i) => {
                  const habit = habits.find(h => h.id === entry.habit_id)
                  return (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-sm text-gray-700">
                        {habit?.name || 'Unknown habit'}
                      </span>
                      <span className={`text-sm font-medium
                        ${entry.status === 'completed' ? 'text-green-500' : 'text-gray-400'}`}
                      >
                        {entry.status === 'completed' ? '✅' : '⬜'}
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
          <div className="bg-white p-3 rounded-xl shadow text-center">
            <div className="text-lg font-bold text-green-500">
              {calendarData.filter(d => d.status === 'all-done').length}
            </div>
            <div className="text-xs text-gray-500">Perfect Days</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow text-center">
            <div className="text-lg font-bold text-yellow-500">
              {calendarData.filter(d => d.status === 'partial').length}
            </div>
            <div className="text-xs text-gray-500">Partial Days</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow text-center">
            <div className="text-lg font-bold text-red-500">
              {calendarData.filter(d => d.status === 'missed').length}
            </div>
            <div className="text-xs text-gray-500">Missed Days</div>
          </div>
        </div>

      </div>
    </div>
  )
}
