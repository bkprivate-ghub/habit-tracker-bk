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
  if (!entries || entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Get all completed entries, sorted by date
  const completedEntries = entries
    .filter(e => e.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (completedEntries.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Get today and yesterday
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Check if today is completed
  const todayEntry = completedEntries.find(e => e.date === today)
  
  // If today is not completed, check if yesterday is completed
  if (!todayEntry) {
    const yesterdayEntry = completedEntries.find(e => e.date === yesterdayStr)
    if (!yesterdayEntry) {
      return { currentStreak: 0, longestStreak: 0 }
    }
  }

  // Calculate current streak (from today backwards)
  let currentStreak = 0
  let checkDate = new Date()
  
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0]
    const entry = completedEntries.find(e => e.date === dateStr)
    
    if (entry) {
      currentStreak++
    } else {
      break
    }
    checkDate.setDate(checkDate.getDate() - 1)
  }

  // Calculate longest streak
  let longestStreak = 0
  let tempStreak = 0
  let prevDate: Date | null = null

  // Sort completed entries by date (ascending)
  const sortedAsc = [...completedEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  for (const entry of sortedAsc) {
    const currentDate = new Date(entry.date)
    if (prevDate === null) {
      tempStreak = 1
    } else {
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }
    prevDate = currentDate
  }
  longestStreak = Math.max(longestStreak, tempStreak)

  return { currentStreak, longestStreak }
}
