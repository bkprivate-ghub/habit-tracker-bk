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

  const deleteHabit = (id: number) => {
    if (confirm('Delete this habit?')) {
      setHabits(habits.filter(h => h.id !== id))
    }
  }

  const total = habits.length
  const completed = habits.filter(h => h.done).length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800">My Habits</h1>
        <p className="text-gray-500 text-sm mb-4">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>

        {/* Progress */}
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
            className={`bg-white p-4 rounded-xl shadow mb-3 border transition-all
              ${habit.done ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between">
              <span 
                onClick={() => toggleHabit(habit.id)}
                className={`cursor-pointer flex-1 ${habit.done ? 'line-through text-gray-400' : ''}`}
              >
                {habit.name}
              </span>
              <div className="flex items-center gap-2">
                <span>{habit.done ? '✅' : '⬜'}</span>
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="text-red-400 text-sm px-2 py-1 rounded hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add Habit Button */}
        {!showAddForm ? (
          <button 
            onClick={() => setShowAddForm(true)}
            className="w-full mt-4 py-3 bg-blue-500 text-white rounded-xl font-medium shadow hover:bg-blue-600 transition"
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
              className="w-full p-2 border border-gray-300 rounded-lg mb-2"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap mb-3">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-1 rounded ${selectedEmoji === emoji ? 'bg-blue-100 border-2 border-blue-500' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addHabit}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 bg-gray-300 rounded-lg"
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
