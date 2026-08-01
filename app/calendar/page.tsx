'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

// Helper function to get local date string (YYYY-MM-DD)
const getLocalDateStr = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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

    let earliestDate = new Date()
    for (const habit of habitsData) {
      const habitDate = new Date(habit.created_at)
      if (habitDate < earliestDate) {
        earliestDate = habitDate
      }
    }
    const earliestDateStr = getLocalDateStr(earliestDate)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const startStr = getLocalDateStr(firstDay)
    const endStr = getLocalDateStr(lastDay)

    const { data: entriesData } = await supabase
      .from('daily_entries')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)

    const map = new Map()
    entriesData?.forEach((e: any) => {
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
    
    const today = getLocalDateStr(new Date())
    
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const dateStr = getLocalDateStr(date)
      const dayEntries = map.get(dateStr) || []
      const completed = dayEntries.filter((e: any) => e.status === 'completed').length
      
      let habitsThatExisted = 0
      for (const habit of habitsData) {
        const habitCreatedAt = new Date(habit.created_at)
        const habitCreatedDate = getLocalDateStr(habitCreatedAt)
        if (habitCreatedDate <= dateStr) {
          habitsThatExisted++
        }
      }
      
      const totalForDay = habitsThatExisted > 0 ? habitsThatExisted : habitsData.length
      
      let status = 'future'
      
      if (dateStr >= earliestDateStr) {
        if (dateStr < today) {
          if (completed === totalForDay && totalForDay > 0) status = 'all-done'
          else if (completed > 0) status = 'partial'
          else status = 'missed'
        } else if (dateStr === today) {
          if (completed === totalForDay && totalForDay > 0) status = 'all-done'
          else if (completed > 0) status = 'partial'
          else status = 'pending'
        }
      } else {
        status = 'before'
      }
      
      days.push({
        day: d,
        date: dateStr,
        status,
        completed,
        total: totalForDay,
        entries: dayEntries,
      })
    }
    
    setCalendarData(days)
    setLoading(false)
  }

  const handleDayClick = (day: any) => {
    if (!day.date || day.status === 'before' || day.status === 'future') return
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
      case 'before': return '·'
      default: return '○'
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Get the CSS classes for a day based on its status
  const getDayClasses = (day: any, isToday: boolean, isSelected: boolean) => {
    let bgColor = 'hover:bg-white/5'
    let borderColor = 'border-transparent'
    let opacity = 'opacity-100'
    let textColor = 'text-white/40'
    let fontWeight = 'font-medium'
    
    if (day.status === 'before') {
      bgColor = 'bg-white/5'
      opacity = 'opacity-30'
      textColor = 'text-white/20'
    } else if (day.status === 'all-done') {
      bgColor = 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30'
      textColor = 'text-emerald-400'
      fontWeight = 'font-bold'
    } else if (day.status === 'partial') {
      bgColor = 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30'
      textColor = 'text-amber-400'
    } else if (day.status === 'missed') {
      bgColor = 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/30'
      textColor = 'text-rose-400'
    } else if (day.status === 'pending') {
      bgColor = 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/30'
      textColor = 'text-indigo-400'
    } else if (day.status === 'future') {
      bgColor = 'hover:bg-white/5'
      textColor = 'text-white/30'
    }
    
    return { bgColor, borderColor, opacity, textColor, fontWeight }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-indigo-400">🗓️</div>
          <p className="text-white/40 font-light">Loading calendar...</p>
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
            <h1 className="text-2xl font-bold text-white/90">🗓️ Calendar</h1>
          </div>
        </div>

        <div className="flex items-center justify-between bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 mb-4">
          <button 
            onClick={() => changeMonth(-1)}
            className="text-xl p-2 hover:bg-white/5 rounded-full transition text-white/60 hover:text-white"
          >
            ◀
          </button>
          <h2 className="text-lg font-semibold text-white/90">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button 
            onClick={() => changeMonth(1)}
            className="text-xl p-2 hover:bg-white/5 rounded-full transition text-white/60 hover:text-white"
          >
            ▶
          </button>
        </div>

        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 mb-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-white/40 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarData.map((day, i) => {
              if (day.status === 'empty') {
                return <div key={i} className="aspect-square"></div>
              }
              
              const isToday = day.date === getLocalDateStr(new Date())
              const isSelected = day.date === selectedDay
              const classes = getDayClasses(day, isToday, isSelected)
              
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all
                    ${classes.bgColor}
                    ${isSelected ? 'ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/10' : ''}
                    ${isToday ? 'border-2 border-indigo-400' : classes.borderColor}
                    ${classes.opacity}
                    ${day.status !== 'before' && day.status !== 'future' ? 'hover:scale-105' : ''}
                  `}
                >
                  <span className={`text-sm ${classes.textColor} ${classes.fontWeight}`}>
                    {day.day}
                  </span>
                  <span className="text-xs mt-0.5">
                    {getStatusEmoji(day.status)}
                  </span>
                  {day.status !== 'future' && day.status !== 'empty' && day.status !== 'pending' && day.status !== 'before' && day.total > 0 && (
                    <span className="text-[8px] text-white/30 mt-0.5">
                      {day.completed}/{day.total}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-center gap-4 text-xs text-white/40 mb-4">
          <span>🟢 All Done</span>
          <span>🟡 Partial</span>
          <span>🔴 Missed</span>
          <span>○ Future</span>
          <span>· Before</span>
        </div>

        {selectedDay && (
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/5 animate-fade-up">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-white/90">
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <button 
                onClick={() => setSelectedDay(null)}
                className="text-white/40 hover:text-white/60 transition"
              >
                ✕
              </button>
            </div>
            
            {selectedDayDetails.length === 0 ? (
              <p className="text-sm text-white/40">No habits tracked this day</p>
            ) : (
              <div className="space-y-1">
                {selectedDayDetails.map((entry: any, i: number) => {
                  const habit = habits.find(h => h.id === entry.habit_id)
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-sm text-white/70">
                        {habit?.name || 'Unknown habit'}
                      </span>
                      <span className={`text-sm font-medium
                        ${entry.status === 'completed' ? 'text-emerald-400' : 'text-white/30'}`}
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

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-3 border border-white/5 text-center">
            <div className="text-lg font-bold text-emerald-400">
              {calendarData.filter((d: any) => d.status === 'all-done').length}
            </div>
            <div className="text-[10px] text-white/40">Perfect Days</div>
          </div>
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-3 border border-white/5 text-center">
            <div className="text-lg font-bold text-amber-400">
              {calendarData.filter((d: any) => d.status === 'partial').length}
            </div>
            <div className="text-[10px] text-white/40">Partial Days</div>
          </div>
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-3 border border-white/5 text-center">
            <div className="text-lg font-bold text-rose-400">
              {calendarData.filter((d: any) => d.status === 'missed').length}
            </div>
            <div className="text-[10px] text-white/40">Missed Days</div>
          </div>
        </div>

      </div>
    </div>
  )
}
