interface HabitEntry {
  id: string
  habit_id: string
  date: string
  status: 'completed' | 'skipped' | 'pending'
}

export function calculateStreak(entries: HabitEntry[]): {
  currentStreak: number
  longestStreak: number
} {
  if (entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Sort entries by date (newest first)
  const sorted = [...entries].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0

  // Check if today is completed
  const today = new Date().toISOString().split('T')[0]
  const todayEntry = sorted.find(e => e.date === today)
  
  // If today is not completed, check yesterday
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  
  let startDate = today
  if (!todayEntry || todayEntry.status !== 'completed') {
    // If today not completed, check if yesterday was
    const yesterdayEntry = sorted.find(e => e.date === yesterdayStr)
    if (!yesterdayEntry || yesterdayEntry.status !== 'completed') {
      return { currentStreak: 0, longestStreak: 0 }
    }
    startDate = yesterdayStr
  }

  // Calculate streak from start date backwards
  let currentDate = new Date(startDate)
  let checkedDates = new Set<string>()
  
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const entry = sorted.find(e => e.date === dateStr)
    
    if (entry && entry.status === 'completed') {
      currentStreak++
      checkedDates.add(dateStr)
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  // Calculate longest streak (look at all data)
  let streak = 0
  let maxStreak = 0
  
  // Get all unique dates with completed entries
  const completedDates = sorted
    .filter(e => e.status === 'completed')
    .map(e => e.date)
    .sort()
  
  if (completedDates.length === 0) {
    return { currentStreak, longestStreak: 0 }
  }

  // Check consecutive dates
  let prevDate = new Date(completedDates[0])
  streak = 1
  
  for (let i = 1; i < completedDates.length; i++) {
    const current = new Date(completedDates[i])
    const diffDays = Math.floor((current.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      streak++
    } else {
      maxStreak = Math.max(maxStreak, streak)
      streak = 1
    }
    prevDate = current
  }
  maxStreak = Math.max(maxStreak, streak)

  return { currentStreak, longestStreak: maxStreak }
}
