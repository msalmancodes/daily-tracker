import { useState, useEffect } from 'react'
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { getDayType, getHabitsForDay } from '../lib/habits'

function DonutRing({ percent, color, label, size = 72 }) {
  const r = (size / 2) - 8
  const circumference = 2 * Math.PI * r
  const offset = circumference - (percent / 100) * circumference

  const colorMap = {
    emerald: '#059669',
    orange:  '#d97706',
    blue:    '#0f766e',
    purple:  '#57534e',
    rose:    '#c2410c',
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#292524" strokeWidth="7" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={colorMap[color] || '#0f766e'}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="text-lg font-bold text-white -mt-14">{Math.round(percent)}%</span>
      <span className="text-xs text-stone-400 capitalize mt-8">{label}</span>
    </div>
  )
}

function ProgressBar({ label, actual, target, color = 'indigo' }) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
  const over = actual >= target
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-stone-300">{label}</span>
        <span className={over ? 'text-emerald-400' : 'text-stone-400'}>{actual}/{target}m</span>
      </div>
      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-emerald-700' : 'bg-teal-800'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function Stats({ userId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
  const last7 = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i))

  useEffect(() => {
    async function load() {
      const since = format(subDays(today, 30), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', since)
        .order('date', { ascending: true })
      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [userId])

  const logMap = Object.fromEntries(logs.map(l => [l.date, l]))

  // Days logged (total)
  const daysLogged = logs.length

  // Prayer streak (consecutive days all 5 prayers)
  function calcPrayerStreak() {
    let streak = 0
    let d = new Date(today)
    while (true) {
      const key = format(d, 'yyyy-MM-dd')
      const log = logMap[key]
      if (!log) break
      const p = log.prayers || {}
      if (p.fajr && p.dhuhr && p.asr && p.maghrib && p.isha) {
        streak++
        d = subDays(d, 1)
      } else break
    }
    return streak
  }
  const prayerStreak = calcPrayerStreak()

  // This week completion %
  function calcWeekPct() {
    const weekDays = eachDayOfInterval({ start: weekStart, end: today })
    let totalTarget = 0, totalActual = 0
    for (const d of weekDays) {
      const key = format(d, 'yyyy-MM-dd')
      const dayType = getDayType(d)
      const habits = getHabitsForDay(dayType)
      const log = logMap[key]

      // Quran
      for (const [k, def] of Object.entries(habits.quran)) {
        totalTarget += def.target
        if (log) totalActual += Math.min(log.quran?.[k] || 0, def.target)
      }
      // Learning
      for (const [k, def] of Object.entries(habits.learning)) {
        totalTarget += def.target
        if (log) totalActual += Math.min(log.learning?.[k] || 0, def.target)
      }
      // Health
      totalTarget += 60
      if (log) totalActual += Math.min(log.health?.gym || 0, 60)
    }
    return totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0
  }
  const weekPct = calcWeekPct()

  // Last 7 days bar chart data
  function calcDayPct(dateObj) {
    const key = format(dateObj, 'yyyy-MM-dd')
    const log = logMap[key]
    if (!log) return 0
    const dayType = getDayType(dateObj)
    const habits = getHabitsForDay(dayType)
    let totalT = 0, totalA = 0

    for (const [k, def] of Object.entries(habits.quran)) {
      totalT += def.target; totalA += Math.min(log.quran?.[k] || 0, def.target)
    }
    for (const [k, def] of Object.entries(habits.learning)) {
      totalT += def.target; totalA += Math.min(log.learning?.[k] || 0, def.target)
    }
    totalT += 60; totalA += Math.min(log.health?.gym || 0, 60)
    return totalT > 0 ? Math.round((totalA / totalT) * 100) : 0
  }

  // Category rings for this week
  function calcCategoryPct(category) {
    const weekDays = eachDayOfInterval({ start: weekStart, end: today })
    let total = 0, actual = 0

    for (const d of weekDays) {
      const key = format(d, 'yyyy-MM-dd')
      const dayType = getDayType(d)
      const habits = getHabitsForDay(dayType)
      const log = logMap[key]

      if (category === 'deen') {
        for (const [k, def] of Object.entries(habits.quran)) {
          total += def.target
          if (log) actual += Math.min(log.quran?.[k] || 0, def.target)
        }
      } else if (category === 'learning') {
        for (const [k, def] of Object.entries(habits.learning)) {
          total += def.target
          if (log) actual += Math.min(log.learning?.[k] || 0, def.target)
        }
      } else if (category === 'health') {
        total += 60
        if (log) actual += Math.min(log.health?.gym || 0, 60)
      } else if (category === 'work' && habits.work) {
        for (const [k, def] of Object.entries(habits.work)) {
          total += def.target
          if (log) actual += Math.min(log.work?.[k] || 0, def.target)
        }
      }
    }
    return total > 0 ? Math.round((actual / total) * 100) : 0
  }

  // Timed habits this week totals
  function calcWeekHabitTotals() {
    const weekDays = eachDayOfInterval({ start: weekStart, end: today })
    const totals = {}
    const targets = {}

    for (const d of weekDays) {
      const key = format(d, 'yyyy-MM-dd')
      const dayType = getDayType(d)
      const habits = getHabitsForDay(dayType)
      const log = logMap[key]

      function add(group, habitKey, def) {
        const label = def.label
        targets[label] = (targets[label] || 0) + def.target
        totals[label] = (totals[label] || 0) + (log ? (log[group]?.[habitKey] || 0) : 0)
      }
      for (const [k, def] of Object.entries(habits.quran)) add('quran', k, def)
      for (const [k, def] of Object.entries(habits.learning)) add('learning', k, def)
      add('health', 'gym', habits.health.gym)
      if (habits.work) {
        for (const [k, def] of Object.entries(habits.work)) add('work', k, def)
      }
    }
    return { totals, targets }
  }
  const { totals, targets } = calcWeekHabitTotals()

  // Prayer grid: 5 prayers x last 7 days
  const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-stone-500">Loading…</div>
  }

  return (
    <div className="p-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Days Logged', value: daysLogged, sub: 'all time' },
          { label: 'Prayer Streak', value: prayerStreak, sub: 'consecutive days' },
          { label: 'This Week', value: `${weekPct}%`, sub: 'completion' },
          { label: 'Total Entries', value: logs.length, sub: 'past 30 days' },
        ].map(card => (
          <div key={card.label} className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <div className="text-2xl font-bold text-white">{card.value}</div>
            <div className="text-sm text-stone-300 font-medium mt-0.5">{card.label}</div>
            <div className="text-xs text-stone-500">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Last 7 Days Bar Chart */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">Last 7 Days</h3>
        <div className="flex items-end gap-2 h-24">
          {last7.map(d => {
            const pct = calcDayPct(d)
            const isToday2 = format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
            const color = pct === 100 ? 'bg-emerald-700' : isToday2 ? 'bg-teal-700' : 'bg-stone-600'
            return (
              <div key={format(d, 'yyyy-MM-dd')} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-stone-500">{pct > 0 ? `${pct}%` : ''}</span>
                <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                  <div
                    className={`w-full rounded-t-md ${color} transition-all duration-500`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-stone-500">{format(d, 'EEE')}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Category Rings */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">This Week by Category</h3>
        <div className="flex justify-around">
          {[
            { cat: 'deen',     color: 'emerald' },
            { cat: 'health',   color: 'orange' },
            { cat: 'learning', color: 'blue' },
            { cat: 'work',     color: 'purple' },
          ].map(({ cat, color }) => (
            <DonutRing key={cat} percent={calcCategoryPct(cat)} color={color} label={cat} size={72} />
          ))}
        </div>
      </div>

      {/* Time vs Target Progress Bars */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">Time vs Target — This Week</h3>
        {Object.entries(targets).map(([label, target]) => (
          <ProgressBar key={label} label={label} actual={totals[label] || 0} target={target} />
        ))}
      </div>

      {/* Prayer Consistency Grid */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Prayer Consistency — Last 7 Days</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-stone-500 font-medium pb-2 w-16">Prayer</th>
                {last7.map(d => (
                  <th key={format(d, 'yyyy-MM-dd')} className="text-center text-stone-500 font-medium pb-2 px-1">
                    {format(d, 'EEE')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prayerNames.map(prayer => (
                <tr key={prayer}>
                  <td className="text-stone-400 py-1.5 capitalize">{prayer}</td>
                  {last7.map(d => {
                    const key = format(d, 'yyyy-MM-dd')
                    const log = logMap[key]
                    const done = log?.prayers?.[prayer]
                    return (
                      <td key={key} className="text-center py-1.5 px-1">
                        {log ? (
                          done
                            ? <span className="text-emerald-400">✓</span>
                            : <span className="text-stone-600">{format(d, 'EEEEE')}</span>
                        ) : (
                          <span className="text-stone-700">–</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
