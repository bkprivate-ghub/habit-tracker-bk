'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function HabitDetail() {
  const params = useParams()
  const router = useRouter()
  const habitId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [habit, setHabit] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [stats, setStats] = useState({
    consistency: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalCompletions: 0,
    totalDays: 0,
    weeklyData: [] as { day: string; date: string; completed: boolean }[],
    monthlyData: [] as { day: number; date: string; completed: boolean; isToday: boolean; isFuture: boolean; isBeforeCreation: boolean; status: string }[],
  })
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [monthOffset, setMonthOffset] = useState(0)
  const [currentMonthLabel, setCurrentMonthLabel] = useState('')
  const [habitCreatedDate, setHabitCreatedDate] = useState('')

  const emojis = ['📚', '💪', '📝', '🧴', '💼', '🏃', '🧘', '📖', '🎯', '💡', '🌱', '⭐']

  useEffect(() => {
    const savedUser = localStorage.getItem('habitUser')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
      } catch (e) {
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }, [router])

  useEffect(() => {
    if (habitId && currentUser) {
      loadHabitData()
    }
  }, [habitId, currentUser, monthOffset])

  const loadHabitData = async () => {
    setLoading(true)

    const { data: habitData } = await supabase
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('user_id', currentUser.id)
      .single()

    if (!habitData) {
      router.push('/')
      return
    }

    setHabit(habitData)
    setHabitCreatedDate(habitData.created_at)
    const nameParts = habitData.name.split(' ')
    const emoji = nameParts[0] || '📚'
    const name = nameParts.slice(1).join(' ')
    setEditName(name || habitData.name)
    setEditEmoji(emoji)

    const { data: entriesData } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('habit_id', habitId)
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false })

    setEntries(entriesData || [])
    calculateStats(habitData, entriesData || [])

    setLoading(false)
  }

  const calculateStats = (habitData: any, entriesData: any[]) => {
    const createdDate = new Date(habitData.created_at)
    const createdDateStr = createdDate.toISOString().split('T')[0]
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // ===== FIXED: Total days since creation = ALL days from creation to today =====
    let totalDays = 0
    let currentDate = new Date(createdDate)
    currentDate.setHours(0, 0, 0, 0)
    while (currentDate <= today) {
      totalDays++
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // ===== FIXED: Count completions =====
    const completions = entriesData.filter(e => e.status === 'completed')
    const totalCompletions = completions.length
    
    // ===== FIXED: Consistency = completions / total days since creation =====
    const consistency = totalDays > 0 ? Math.round((totalCompletions / totalDays) * 100) : 0

    // Current streak
    let currentStreak = 0
    let checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)
    for (let i = 0; i < totalDays + 10; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (dateStr > todayStr) {
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      }
      const entry = entriesData.find(e => e.date === dateStr && e.status === 'completed')
      if (entry) {
        currentStreak++
      } else {
        break
      }
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Best streak
    let bestStreak = 0
    let tempStreak = 0
    const sortedEntries = [...entriesData]
      .filter(e => e.status === 'completed')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let prevDate: Date | null = null
    for (const entry of sortedEntries) {
      const currentDateObj = new Date(entry.date)
      if (prevDate === null) {
        tempStreak = 1
      } else {
        const diffDays = Math.floor((currentDateObj.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          tempStreak++
        } else {
          bestStreak = Math.max(bestStreak, tempStreak)
          tempStreak = 1
        }
      }
      prevDate = currentDateObj
    }
    bestStreak = Math.max(bestStreak, tempStreak)

    // WEEKLY DATA - Last 7 days
    const weeklyData = []
    const todayDate = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(todayDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const entry = entriesData.find(e => e.date === dateStr)
      const isCompleted = entry?.status === 'completed' || false
      
      weeklyData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: dateStr,
        completed: isCompleted,
      })
    }

    // MONTHLY DATA
    const monthData = []
    const targetMonth = todayDate.getMonth() + monthOffset
    const targetYear = todayDate.getFullYear()
    const firstDay = new Date(targetYear, targetMonth, 1)
    const lastDay = new Date(targetYear, targetMonth + 1, 0)
    
    setCurrentMonthLabel(firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(targetYear, targetMonth, d)
      const dateStr = date.toISOString().split('T')[0]
      const entry = entriesData.find(e => e.date === dateStr)
      const isBeforeCreation = dateStr < createdDateStr
      const isToday = dateStr === todayStr
      const isFuture = date > new Date()
      const isCompleted = entry?.status === 'completed' || false
      
      let status = 'future'
      if (isBeforeCreation) {
        status = 'before'
      } else if (isFuture) {
        status = 'future'
      } else if (isCompleted) {
        status = 'done'
      } else {
        status = 'missed'
      }
      
      monthData.push({
        day: d,
        date: dateStr,
        completed: isCompleted,
        isToday: isToday,
        isFuture: isFuture,
        isBeforeCreation: isBeforeCreation,
        status: status,
      })
    }

    setStats({
      consistency,
      currentStreak,
      bestStreak,
      totalCompletions,
      totalDays,
      weeklyData,
      monthlyData: monthData,
    })
  }

  const handleEditSave = async () => {
    if (!editName.trim()) return
    const fullName = `${editEmoji} ${editName.trim()}`

    const { error } = await supabase
      .from('habits')
      .update({ name: fullName })
      .eq('id', habitId)

    if (!error) {
      setHabit({ ...habit, name: fullName })
      setShowEdit(false)
      loadHabitData()
    } else {
      alert('Error updating habit: ' + error.message)
    }
  }

  const handleDelete = async () => {
    if (confirm('Delete this habit permanently?')) {
      await supabase
        .from('daily_entries')
        .delete()
        .eq('habit_id', habitId)

      await supabase
        .from('habits')
        .delete()
        .eq('id', habitId)

      router.push('/')
    }
  }

  const changeMonth = (delta: number) => {
    setMonthOffset(monthOffset + delta)
  }

  const getMonthlyColor = (day: any) => {
    if (day.status === 'before') {
      return 'bg-white/5 text-white/20'
    }
    if (day.status === 'future') {
      return 'text-white/30'
    }
    if (day.status === 'done') {
      return 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
    }
    if (day.status === 'missed') {
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    }
    return 'text-white/20'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse text-indigo-400">📊</div>
          <p className="text-white/40 font-light">Loading habit...</p>
        </div>
      </div>
    )
  }

  if (!habit) return null

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24 relative overflow-hidden">
      
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-md mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mb-1 inline-block transition-all">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-white/90 flex items-center gap-2">
              <span className="text-3xl">{habit.name.split(' ')[0]}</span>
              <span className="text-xl font-normal text-white/30">
                {habit.name.split(' ').slice(1).join(' ')}
              </span>
            </h1>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowEdit(!showEdit)}
              className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-white/70"
            >
              ✏️
            </button>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-rose-500/10 rounded-lg transition-all text-white/40 hover:text-rose-400"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Edit Form */}
        {showEdit && (
          <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/5 mb-4">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full p-3 bg-black/50 border border-white/5 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 text-white placeholder:text-white/30 text-sm"
              placeholder="Habit name"
            />
            <div className="flex gap-1.5 flex-wrap mb-3">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setEditEmoji(emoji)}
                  className={`text-xl p-2 rounded-lg transition-all duration-300 hover:scale-110
                    ${editEmoji === emoji ? 'bg-indigo-500/20 ring-2 ring-indigo-400/50' : 'hover:bg-white/5'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-all"
              >
                Save
              </button>
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/40 rounded-lg font-medium text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-bold text-indigo-400">{stats.consistency}%</div>
            <div className="text-xs text-white/30">Consistency</div>
            <div className="text-[10px] text-white/20">{stats.totalCompletions}/{stats.totalDays} days</div>
          </div>
          <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.currentStreak}d</div>
            <div className="text-xs text-white/30">🔥 Current Streak</div>
          </div>
          <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.bestStreak}d</div>
            <div className="text-xs text-white/30">🏆 Best Streak</div>
          </div>
          <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.totalCompletions}</div>
            <div className="text-xs text-white/30">✅ Total Done</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/5 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/30">Progress</span>
            <span className="text-indigo-400 font-bold">{stats.consistency}%</span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.consistency}%` }}
            />
          </div>
        </div>

        {/* WEEKLY CHART */}
        <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/5 mb-4">
          <h3 className="text-xs text-white/30 font-medium mb-3">📈 Weekly Progress</h3>
          <div className="flex items-end justify-between h-32 gap-1.5">
            {stats.weeklyData.map((day, i) => {
              const isToday = day.date === new Date().toISOString().split('T')[0]
              const isCompleted = day.completed
              
              let barColor = 'bg-white/10'
              let barHeight = '20%'
              
              if (isCompleted) {
                barColor = 'bg-emerald-500'
                barHeight = '80%'
              } else {
                barColor = 'bg-rose-500'
                barHeight = '40%'
              }
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full">
                  <div className="w-full h-24 relative flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${barColor}`}
                      style={{
                        height: barHeight,
                        minHeight: '4px',
                        boxShadow: isToday && isCompleted ? '0 0 20px rgba(16, 185, 129, 0.4)' : 
                                   isToday && !isCompleted ? '0 0 20px rgba(244, 63, 94, 0.3)' : 'none'
                      }}
                    />
                  </div>
                  <div className={`text-[9px] font-medium mt-1 ${isToday ? 'text-indigo-400' : 'text-white/20'}`}>
                    {day.day}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* MONTHLY CALENDAR */}
        <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs text-white/30 font-medium">📅 Monthly Progress</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="text-sm p-1 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-white/70"
              >
                ◀
              </button>
              <span className="text-xs text-white/30">{currentMonthLabel}</span>
              <button
                onClick={() => changeMonth(1)}
                className="text-sm p-1 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-white/70"
              >
                ▶
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => (
              <div key={i} className="text-center text-[8px] text-white/30 py-1">
                {day}
              </div>
            ))}
            {stats.monthlyData.map((day, i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs transition-all font-medium ${getMonthlyColor(day)}`}
              >
                {day.day}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-[8px] text-white/30">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Done
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Missed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white/5"></span> Before
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white/20"></span> Future
            </span>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-white/5">
          <h3 className="text-xs text-white/30 font-medium mb-3">Recent Activity</h3>
          {entries.length === 0 ? (
            <p className="text-sm text-white/20 text-center py-4">No entries yet</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {entries.slice(0, 14).map((entry) => {
                const date = new Date(entry.date)
                return (
                  <div key={entry.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-sm text-white/60">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                    </span>
                    <span className={`text-sm font-medium ${
                      entry.status === 'completed' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {entry.status === 'completed' ? '✅ Done' : '❌ Missed'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
