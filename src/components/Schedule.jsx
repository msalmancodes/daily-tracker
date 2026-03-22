import { useState } from 'react'
import { SCHEDULE, CATEGORY_TAILWIND, formatScheduleTime } from '../lib/habits'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDayScheduleKey(dayIndex) {
  if (dayIndex === 5) return 'friday'
  if (dayIndex === 0 || dayIndex === 6) return 'weekend'
  return 'weekday'
}

export default function Schedule() {
  const todayIndex = new Date().getDay()
  const [selectedDay, setSelectedDay] = useState(todayIndex)

  const scheduleKey = getDayScheduleKey(selectedDay)
  const blocks = SCHEDULE[scheduleKey]

  return (
    <div className="p-4">
      {/* Day selector */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {DAYS.map((day, i) => {
          const isToday = i === todayIndex
          const isSelected = i === selectedDay
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                isSelected
                  ? 'bg-teal-800 text-teal-50'
                  : isToday
                  ? 'bg-teal-950/60 text-teal-400 border border-teal-900'
                  : 'bg-stone-900 text-stone-400 border border-stone-800'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {blocks.map((block, i) => {
          const colors = CATEGORY_TAILWIND[block.category]
          const endTime = formatScheduleTime(block.start + block.duration)
          const startTime = formatScheduleTime(block.start)
          return (
            <div key={i} className={`flex gap-3 ${colors.bg} border ${colors.border} rounded-xl p-3`}>
              <div className="flex flex-col items-center pt-0.5">
                <div className={`w-2 h-2 rounded-full ${colors.dot} mt-1`} />
                {i < blocks.length - 1 && <div className="w-0.5 h-full bg-stone-700 mt-1 min-h-[20px]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-stone-100">{block.label}</span>
                  <span className={`text-xs font-medium ${colors.text} flex-shrink-0`}>
                    {block.duration}m
                  </span>
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {startTime} – {endTime}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(CATEGORY_TAILWIND).map(([cat, colors]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
            <span className="text-xs text-stone-400 capitalize">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
