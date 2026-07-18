'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from './lib/supabase'
import { calculateStreak } from './lib/streak'

export default function Home() {
  const [habits, setHabits] = useState<any[]>([])
  const [streaks, setStreaks] = useState<Record<string, { current: number, longest: number }>>({})
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📚')
  const [greeting, setGreeting] = useState('')

  const emojis = ['📚', '💪', '📝', '🧴', '💼', '🏃', '🧘', '📖', '🎯', '💡', '🌱', '⭐']

  useEffect(() => {
    const hour = new Date().getHours()
    let g = 'Good Evening'
    if (hour < 12) g = 'Good Morning'
    else if (hour < 17) g = 'Good Afternoon'
    setGreeting(g)
  }, [])

  useEffect(() => {
    loadHabits()
  }, [])

  const loadHabits = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error loading habits:', error)
    } else if (data) {
      setHabits(data)
      await loadStreaks(data)
    }
    setLoading(false)
  }

  const loadStreaks = async (habitsData: any[]) => {
    const streakData: Record<string, { current: number, longest: number }> = {}
    
    for (const habit of habitsData) {
      const { data: entries } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('habit_id', habit.id)
        .order('date', { ascending: false })
      
      if (entries && entries.length > 0) {
        const streak = calculateStreak(entries)
        streakData[habit.id] = streak
      } else {
        streakData[habit.id] = { current: 0, longest: 0 }
      }
    }
    setStreaks(streakData)
  }

  const toggleHabit = async (id: string, currentDone: boolean) => {
    const today = new Date().toISOString().split('T')[0]
    
    const { error } = await supabase
      .from('habits')
      .update({ done: !currentDone })
      .eq('id', id)
    
    if (!error) {
      const status = !currentDone ? 'completed' : 'pending'
      await supabase
        .from('daily_entries')
        .upsert({
          habit_id: id,
          date: today,
          status: status,
          completed_at: !currentDone ? new Date().toISOString() : null
        })
      
      setHabits(habits.map(h => 
        h.id === id ? { ...h, done: !h.done } : h
      ))
      
      await loadStreaks(habits)
    }
  }

  const addHabit = async () => {
    if (newHabitName.trim() === '') return
    const fullName = `${selectedEmoji} ${newHabitName}`
    
    const { data, error } = await supabase
      .from('habits')
      .insert([{ name: fullName, done: false }])
      .select()
    
    if (!error && data) {
      setHabits([...habits, data[0]])
      setNewHabitName('')
      setShowAddForm(false)
      await loadStreaks([...habits, data[0]])
    }
  }

  const total = habits.length
  const completed = habits.filter(h => h.done).length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500">Loading your habits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-md mx-auto">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {greeting || 'Hello'}, Bharath K 👋
            </h1>
            <p className="text-gray-500 text-sm">{today}</p>
          </div>
          <Link href="/settings" className="text-2xl p-2 hover:bg-gray-200 rounded-full transition">
            ⚙️
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Today's Progress</p>
            <p className="text-3xl font-bold text-blue-500">{progress}%</p>
            <p className="text-xs text-gray-400">{completed} of {total} habits done</p>
          </div>
          <div className="relative w-20 h-20">
            <svg className="transform -rotate-90 w-20 h-20">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" strokeWidth="6"/>
              <circle 
                cx="40" cy="40" r="32" 
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="6"
                strokeDasharray={`${progress * 2.01} 201`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {progress}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-3 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-green-500">{completed}</div>
            <div className="text-xs text-gray-500">Done</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {habits.filter(h => !h.done).length}
            </div>
            <div className="text-xs text-gray-500">Remaining</div>
          </div>
          <div className="bg-white p-3 rounded-xl shadow text-center">
            <div className="text-2xl font-bold text-orange-500">
              {Object.values(streaks).reduce((sum, s) => sum + s.current, 0)}
            </div>
            <div className="text-xs text-gray-500">Total Streak</div>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-gray-600 mb-3">Today's Habits</h2>
        
        {habits.map((habit) => {
          const streak = streaks[habit.id] || { current: 0, longest: 0 }
          return (
            <div 
              key={habit.id}
              onClick={() => toggleHabit(habit.id, habit.done)}
              className={`bg-white p-4 rounded-xl shadow mb-2 border-l-4 transition-all cursor-pointer
                ${habit.done ? 'border-green-500 bg-green-50/50' : 'border-blue-500'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`${habit.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {habit.name}
                  </span>
                  {streak.current > 0 && (
                    <span className="ml-2 text-xs text-orange-500 font-medium">
                      🔥 {streak.current}d
                    </span>
                  )}
                  {streak.longest > 0 && streak.current === 0 && (
                    <span className="ml-2 text-xs text-gray-400 font-medium">
                      ⭐ Best: {streak.longest}d
                    </span>
                  )}
                </div>
                <span className="text-xl">{habit.done ? '✅' : '◻️'}</span>
              </div>
            </div>
          )
        })}

        {!showAddForm ? (
          <button 
            onClick={() => setShowAddForm(true)}
            className="w-full mt-4 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-200 hover:bg-blue-600 transition"
          >
            + Add New Habit
          </button>
        ) : (
          <div className="mt-4 bg-white p-4 rounded-xl shadow">
            <input
              type="text"
              placeholder="Enter habit name..."
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap mb-3">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-1.5 rounded-lg transition
                    ${selectedEmoji === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addHabit}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium"
              >
                Add Habit
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
