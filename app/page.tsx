'use client'

import { useState } from 'react'

export default function Home() {
  const [habits, setHabits] = useState([
    { id: 1, name: '📚 Reading', done: false },
    { id: 2, name: '💪 Workout', done: false },
    { id: 3, name: '📝 Journal', done: false },
    { id: 4, name: '🧴 Skincare', done: false },
    { id: 5, name: '💼 Business Skillset', done: false },
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📚')

  const emojis = ['📚', '💪', '📝', '🧴', '💼', '🏃', '🧘', '📖', '🎯', '💡', '🌱', '⭐']

  const toggleHabit = (id: number) => {
    setHabits(habits.map(h => 
      h.id === id ? { ...h, done: !h.done } : h
    ))
  }

  const addHabit = () => {
    if (newHabitName.trim() === '') return
    const newHabit = {
      id: Date.now(),
      name: `${selectedEmoji} ${newHabitName}`,
      done: false
    }
    setHabits([...habits, newHabit])
    setNewHabitName('')
    setShowAddForm(false)
  }

  const total = habits.length
  const completed = habits.filter(h => h.done).length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  // Get greeting based on time
  const hour = new Date().getHours()
  let greeting = 'Good Evening'
  if (hour < 12) greeting = 'Good Morning'
  else if (hour < 17) greeting = 'Good Afternoon'

  // Format date
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-md mx-auto">
        
        {/* Header with Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            {greeting}, Bharath K 👋
          </h1>
          <p className="text-gray-500 text-sm">{today}</p>
        </div>

        {/* Progress Ring */}
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

        {/* Quick Stats */}
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
            <div className="text-2xl font-bold text-blue-500">0</div>
            <div className="text-xs text-gray-500">Streak</div>
          </div>
        </div>

        {/* Today's Habits - Clean Design */}
        <h2 className="text-sm font-semibold text-gray-600 mb-3">Today's Habits</h2>
        
        {habits.map((habit) => (
          <div 
            key={habit.id}
            onClick={() => toggleHabit(habit.id)}
            className={`bg-white p-4 rounded-xl shadow mb-2 border-l-4 transition-all cursor-pointer
              ${habit.done ? 'border-green-500 bg-green-50/50' : 'border-blue-500'}`}
          >
            <div className="flex items-center justify-between">
              <span className={`${habit.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {habit.name}
              </span>
              <span className="text-xl">{habit.done ? '✅' : '◻️'}</span>
            </div>
          </div>
        ))}

        {/* Add Habit Button */}
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
