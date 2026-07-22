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
      
      await supabase
        .from('habits')
        .delete()
        .eq('id', id)
      
      loadHabits()
    }
  }

  if (habits.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-gray-600 dark:text-gray-300">◆</div>
          <p className="text-gray-500 dark:text-gray-400 font-light">Loading settings...</p>
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
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">⚙️ Settings</h1>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-2xl text-white font-bold">
              BK
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Bharath K</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Member since July 31, 2026</p>
            </div>
          </div>
        </div>

        {/* Manage Habits */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Manage Habits</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Delete habits you no longer track</p>
          
          {habits.map((habit: any) => (
            <div key={habit.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className="text-gray-700 dark:text-gray-300">{habit.name}</span>
              <button
                onClick={() => deleteHabit(habit.id)}
                className="text-rose-500 dark:text-rose-400 text-sm px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* Stats Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-gray-800/30 border border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">📊 Your Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{habits.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Habits</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {habits.filter((h: any) => h.done).length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Completed Today</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
