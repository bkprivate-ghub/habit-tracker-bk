'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const [habits, setHabits] = useState<any[]>([])

  useEffect(() => {
    loadHabits()
  }, [])

  const loadHabits = async () => {
    const { data } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setHabits(data)
  }

  const deleteHabit = async (id: string) => {
    if (confirm('Delete this habit permanently?')) {
      await supabase
        .from('daily_entries')
        .delete()
        .eq('habit_id', id)
      
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id)
      
      if (!error) {
        setHabits(habits.filter(h => h.id !== id))
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-blue-500 text-sm mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Settings</h1>

        <div className="bg-white rounded-2xl p-4 shadow mb-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Manage Habits</h2>
          <p className="text-xs text-gray-400 mb-4">Delete habits you no longer track</p>
          
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <span className="text-gray-700">{habit.name}</span>
              <button
                onClick={() => deleteHabit(habit.id)}
                className="text-red-500 text-sm px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Account</h2>
          <div className="py-2 px-3">
            <p className="text-sm text-gray-700">👤 Bharath K</p>
            <p className="text-xs text-gray-400">Member since July 2025</p>
          </div>
        </div>
      </div>
    </div>
  )
}
