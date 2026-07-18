'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Settings() {
  // This would connect to your habits state
  const [habits, setHabits] = useState([
    { id: 1, name: '📚 Reading', done: false },
    { id: 2, name: '💪 Workout', done: false },
    { id: 3, name: '📝 Journal', done: false },
    { id: 4, name: '🧴 Skincare', done: false },
    { id: 5, name: '💼 Business Skillset', done: false },
  ])

  const deleteHabit = (id: number) => {
    if (confirm('Delete this habit permanently?')) {
      setHabits(habits.filter(h => h.id !== id))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-blue-500 text-sm mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

        <div className="bg-white rounded-2xl p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Manage Habits</h2>
          <p className="text-xs text-gray-400 mb-4">Delete habits you no longer track</p>
          
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center justify-between py-3 border-b border-gray-100">
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

        <div className="mt-6 bg-white rounded-2xl p-4 shadow">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Appearance</h2>
          <button className="w-full py-2 text-left px-3 rounded-lg hover:bg-gray-50 transition">
            🌙 Dark Mode
          </button>
          <button className="w-full py-2 text-left px-3 rounded-lg hover:bg-gray-50 transition">
            ☀️ Light Mode
          </button>
        </div>
      </div>
    </div>
  )
}
