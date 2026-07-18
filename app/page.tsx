'use client'

import { useState } from 'react'

export default function Home() {
  const [habits, setHabits] = useState([
    { id: 1, name: '📚 Reading', done: false },
    { id: 2, name: '💪 Workout', done: false },
    { id: 3, name: '📝 Journal', done: false },
    { id: 4, name: '🧴 Skincare', done: false },
  ])

  const toggleHabit = (id: number) => {
    setHabits(habits.map(habit =>
      habit.id === id ? { ...habit, done: !habit.done } : habit
    ))
  }

  const total = habits.length
  const completed = habits.filter(h => h.done).length
  const progress = Math.round((completed / total) * 100)

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800">My Habits</h1>
        <p className="text-gray-500 text-sm mb-2">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>

        {/* Progress Bar */}
        <div className="bg-white p-4 rounded-xl shadow mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span className="font-bold text-blue-500">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {completed} of {total} done
          </div>
        </div>

        {/* Habit List */}
        {habits.map((habit) => (
          <div 
            key={habit.id}
            onClick={() => toggleHabit(habit.id)}
            className={`bg-white p-4 rounded-xl shadow mb-3 border transition-all cursor-pointer
              ${habit.done ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between">
              <span className={habit.done ? 'line-through text-gray-400' : ''}>
                {habit.name}
              </span>
              <span>{habit.done ? '✅' : '⬜'}</span>
            </div>
          </div>
        ))}

        {/* Add Habit Button */}
        <button className="w-full mt-4 py-3 bg-blue-500 text-white rounded-xl font-medium shadow">
          + Add New Habit
        </button>
      </div>
    </div>
  )
}
