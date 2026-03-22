import { useState, useEffect } from 'react'
import { format, subDays, startOfWeek, eachDayOfInterval } from 'date-fns'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { getDayType, getHabitsForDay } from '../lib/habits'

function DonutRing({ percent, color, label, size = 72 }) {
  const r = (size / 2) - 8
  const circumference = 2 * Math.PI * r
  const offset = circumference - (percent / 100) * circumference

  const colorMap = {
    emerald: '#059669',
    amber:   '#d97706',
    teal:    '#0f766e',
    stone:   '#57534e',
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
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
        <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-white">
          {Math.round(percent)}%
        </span>
      </div>
      <span className="text-xs text-stone-400 capitalize">{label}</span>
    </div>
  )
}

function TimeBar({ label, actual, target }) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
  const over = actual >= target
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-stone-300">{label}</span>
        <span className={over ? 'text-emerald-400' : 'text-stone-400'}>{actual}/{target}m</span>
      </div>
      <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-emerald-700' : 'bg-teal-700'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function LectureBar({ label, actual, max }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-stone-300">{label}</span>
        <span className="text-stone-400">{actual} lectures</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-all duration-300 ${
              i < actual ? 'bg-teal-600' : 'bg-stone-800'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default function Stats({ userId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const last7 = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i))
  const weekDays = eachDayOfInterval({ start: weekStart, end: today })

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

  function habitScore(def, value) {
    if (!def || typeof def !== 'object') return null
    if (def.type === 'boolean') return { target: 1, actual: value ? 1 : 0 }
    if (def.type === 'lectures') return { target: def.max || 4, actual: Math.min(value || 0, def.max || 4) }
    if (def.target) return { target: def.target, actual: Math.min(value || 0, def.target) }
    return null
  }

  // --- Summary stats ---
  const daysLogged = logs.length

  function calcPrayerStreak() {
    let streak = 0
    let d = new Date(today)
    while (true) {
      const key = format(d, 'yyyy-MM-dd')
      const log = logMap[key]
      if (!log) break
      const p = log.prayers || {}
      if (p.fajr && p.dhuhr && p.asr && p.maghrib && p.isha) { streak++; d = subDays(d, 1) }
      else break
    }
    return streak
  }

  function calcGymDaysThisWeek() {
    return weekDays.filter(d => {
      const log = logMap[format(d, 'yyyy-MM-dd')]
      return log?.health?.gym === true
    }).length
  }

  function calcWeekPct() {
    let totalT = 0, totalA = 0
    for (const d of weekDays) {
      const key = format(d, 'yyyy-MM-dd')
      const habits = getHabitsForDay(d)
      const log = logMap[key]
      totalT += 5
      if (log) totalA += ['fajr','dhuhr','asr','maghrib','isha'].filter(k => log.prayers?.[k]).length
      for (const [k, def] of Object.entries(habits.learning)) {
        const s = habitScore(def, log?.learning?.[k])
        if (s) { totalT += s.target; if (log) totalA += s.actual }
      }
      const gymS = habitScore(habits.health?.gym, log?.health?.gym)
      if (gymS) { totalT += gymS.target; if (log) totalA += gymS.actual }
    }
    return totalT > 0 ? Math.round((totalA / totalT) * 100) : 0
  }

  const prayerStreak = calcPrayerStreak()
  const gymDays = calcGymDaysThisWeek()
  const weekPct = calcWeekPct()

  // --- Last 7 days bar chart ---
  function calcDayPct(dateObj) {
    const key = format(dateObj, 'yyyy-MM-dd')
    const log = logMap[key]
    if (!log) return 0
    const habits = getHabitsForDay(dateObj)
    let totalT = 0, totalA = 0
    totalT += 5
    totalA += ['fajr','dhuhr','asr','maghrib','isha'].filter(k => log.prayers?.[k]).length
    for (const [k, def] of Object.entries(habits.learning)) {
      const s = habitScore(def, log.learning?.[k])
      if (s) { totalT += s.target; totalA += s.actual }
    }
    const gymS = habitScore(habits.health?.gym, log.health?.gym)
    if (gymS) { totalT += gymS.target; totalA += gymS.actual }
    return totalT > 0 ? Math.round((totalA / totalT) * 100) : 0
  }

  // --- Category rings ---
  function calcCategoryPct(category) {
    let total = 0, actual = 0
    for (const d of weekDays) {
      const key = format(d, 'yyyy-MM-dd')
      const habits = getHabitsForDay(d)
      const log = logMap[key]
      if (category === 'deen') {
        total += 5
        if (log) actual += ['fajr','dhuhr','asr','maghrib','isha'].filter(k => log.prayers?.[k]).length
      } else if (category === 'learning') {
        for (const [k, def] of Object.entries(habits.learning)) {
          const s = habitScore(def, log?.learning?.[k])
          if (s) { total += s.target; if (log) actual += s.actual }
        }
      } else if (category === 'health') {
        const s = habitScore(habits.health?.gym, log?.health?.gym)
        if (s) { total += s.target; if (log) actual += s.actual }
      } else if (category === 'work' && habits.work) {
        for (const [k, def] of Object.entries(habits.work)) {
          const s = habitScore(def, log?.work?.[k])
          if (s) { total += s.target; if (log) actual += s.actual }
        }
      }
    }
    return total > 0 ? Math.round((actual / total) * 100) : 0
  }

  // --- Time habit totals this week ---
  function calcTimeTotals() {
    const totals = {}, targets = {}
    for (const d of weekDays) {
      const habits = getHabitsForDay(d)
      const log = logMap[format(d, 'yyyy-MM-dd')]
      for (const [k, def] of Object.entries(habits.learning)) {
        if (!def?.target || def.type) continue
        targets[def.label] = (targets[def.label] || 0) + def.target
        totals[def.label] = (totals[def.label] || 0) + (log ? Math.min(log.learning?.[k] || 0, def.target) : 0)
      }
      if (habits.work) {
        for (const [k, def] of Object.entries(habits.work)) {
          if (!def?.target || def.type) continue
          targets[def.label] = (targets[def.label] || 0) + def.target
          totals[def.label] = (totals[def.label] || 0) + (log ? Math.min(log.work?.[k] || 0, def.target) : 0)
        }
      }
    }
    return { totals, targets }
  }

  // --- Lecture totals this week ---
  function calcLectureTotals() {
    const totals = {}, maxes = {}
    for (const d of weekDays) {
      const habits = getHabitsForDay(d)
      const log = logMap[format(d, 'yyyy-MM-dd')]
      for (const [k, def] of Object.entries(habits.learning)) {
        if (def?.type !== 'lectures') continue
        totals[def.label] = (totals[def.label] || 0) + (log ? (log.learning?.[k] || 0) : 0)
        maxes[def.label] = (maxes[def.label] || 0) + (def.max || 4)
      }
    }
    return { totals, maxes }
  }

  const { totals, targets } = calcTimeTotals()
  const { totals: lectureTotals, maxes: lectureMaxes } = calcLectureTotals()

  // --- Boolean habit grid (last 7 days) ---
  // Collect which boolean habits appeared in last 7 days
  const booleanRows = []
  const boolChecks = { gym: [], journaling: [], scholar: [] }
  for (const d of last7) {
    const key = format(d, 'yyyy-MM-dd')
    const log = logMap[key]
    const habits = getHabitsForDay(d)
    boolChecks.gym.push({ day: d, logged: !!log, done: !!log?.health?.gym })
    boolChecks.journaling.push({ day: d, logged: !!log, done: !!log?.learning?.journaling })
    const hasScholar = !!habits.learning?.scholar
    boolChecks.scholar.push({ day: d, logged: !!log, done: !!log?.learning?.scholar, applicable: hasScholar })
  }

  const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

  function exportToExcel() {
    const rows = [...logs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(log => {
        const prayers = log.prayers || {}
        const prayersDone = prayerNames.filter(p => prayers[p]).length
        const quran = log.quran || {}
        const learning = log.learning || {}
        const health = log.health || {}
        const work = log.work || {}
        return {
          'Date': log.date,
          'Prayers (/ 5)': prayersDone,
          "Jumu'ah": prayers.jumuah ? 'Yes' : '—',
          'Juz #': quran.juz_number || '—',
          'Page': quran.page || '—',
          'Reading (min)': learning.reading || 0,
          'Broad Learning (min)': learning.broad || 0,
          'Iqbal Study (min)': learning.iqbal || 0,
          'Tech Learning (lectures)': learning.tech_learning || 0,
          'Scholar Session': learning.scholar ? 'Yes' : 'No',
          'Islamic Finance (lectures)': learning.finance || 0,
          'Journaling': learning.journaling ? 'Yes' : 'No',
          'Gym': health.gym ? 'Yes' : 'No',
          'Office Work (min)': work.office || 0,
          'CAMD': work.camd ? 'Yes' : 'No',
          'CPS Work': work.cps ? 'Yes' : 'No',
          'Current Affairs': log.current_affairs ? 'Yes' : 'No',
          'Reflection': log.notes || '',
          'AI Summary': log.ai_summary || '',
        }
      })
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 8 }, { wch: 8 },
      { wch: 14 }, { wch: 20 }, { wch: 16 },
      { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 14 },
      { wch: 8 }, { wch: 18 }, { wch: 8 }, { wch: 10 },
      { wch: 16 }, { wch: 40 }, { wch: 60 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Logs')
    XLSX.writeFile(wb, `daily-routine-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-stone-500">Loading…</div>
  }

  return (
    <div className="p-4 space-y-3">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Days Logged', value: daysLogged, sub: 'past 30 days' },
          { label: 'Prayer Streak', value: prayerStreak, sub: 'days in a row' },
          { label: 'This Week', value: `${weekPct}%`, sub: 'completion' },
          { label: 'Gym This Week', value: `${gymDays}d`, sub: `of ${weekDays.length} days` },
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
        <div className="flex items-end gap-2" style={{ height: '96px' }}>
          {last7.map(d => {
            const pct = calcDayPct(d)
            const isToday2 = format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
            const color = pct >= 90 ? 'bg-emerald-700' : isToday2 ? 'bg-teal-700' : 'bg-stone-600'
            return (
              <div key={format(d, 'yyyy-MM-dd')} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-stone-500">{pct > 0 ? `${pct}%` : ''}</span>
                <div className="w-full flex items-end justify-center flex-1">
                  <div
                    className={`w-full rounded-t-md ${color} transition-all duration-500`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-stone-400 font-medium">{format(d, 'EEE')}</span>
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
            { cat: 'deen',     color: 'emerald', label: 'Prayers' },
            { cat: 'health',   color: 'amber',   label: 'Gym' },
            { cat: 'learning', color: 'teal',    label: 'Learning' },
            { cat: 'work',     color: 'stone',   label: 'Work' },
          ].map(({ cat, color, label }) => (
            <DonutRing key={cat} percent={calcCategoryPct(cat)} color={color} label={label} size={76} />
          ))}
        </div>
      </div>

      {/* Prayer Consistency Grid */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Prayers — Last 7 Days</h3>
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
                        {log
                          ? done
                            ? <span className="inline-block w-5 h-5 rounded-md bg-emerald-700 text-white text-[10px] leading-5">✓</span>
                            : <span className="inline-block w-5 h-5 rounded-md bg-stone-800 text-stone-600 text-[10px] leading-5">✗</span>
                          : <span className="inline-block w-5 h-5 rounded-md bg-stone-900 text-stone-700 text-[10px] leading-5">–</span>
                        }
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Boolean Habit Tracker — Last 7 Days */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Habit Checkboxes — Last 7 Days</h3>
        <div className="space-y-3">
          {[
            { label: 'Gym', data: boolChecks.gym, color: 'amber' },
            { label: 'Journaling', data: boolChecks.journaling, color: 'teal' },
            { label: 'Scholar', data: boolChecks.scholar, color: 'emerald' },
          ].map(({ label, data, color }) => {
            const done = data.filter(d => d.done).length
            const applicable = data.filter(d => d.logged && (d.applicable !== false)).length
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-stone-300">{label}</span>
                  <span className="text-xs text-stone-500">{done}/{applicable || 7} days</span>
                </div>
                <div className="flex gap-1">
                  {data.map(({ day, logged, done: isDone, applicable: isApp }) => {
                    const isNA = isApp === false
                    return (
                      <div
                        key={format(day, 'yyyy-MM-dd')}
                        title={format(day, 'EEE dd')}
                        className={`flex-1 rounded-md py-2 flex items-center justify-center text-[10px] transition-all ${
                          isNA
                            ? 'bg-stone-900 text-stone-700'
                            : !logged
                            ? 'bg-stone-800/50 text-stone-700'
                            : isDone
                            ? color === 'amber'  ? 'bg-amber-800/70 text-amber-300'
                            : color === 'teal'   ? 'bg-teal-800/70 text-teal-300'
                            : 'bg-emerald-800/70 text-emerald-300'
                            : 'bg-stone-800 text-stone-600'
                        }`}
                      >
                        {isNA ? '—' : !logged ? '·' : isDone ? '✓' : '✗'}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lectures This Week */}
      {Object.keys(lectureTotals).length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">Lectures — This Week</h3>
          {Object.entries(lectureTotals).map(([label, total]) => (
            <LectureBar key={label} label={label} actual={total} max={lectureMaxes[label] || 8} />
          ))}
        </div>
      )}

      {/* Time vs Target This Week */}
      {Object.keys(targets).length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">Study Time — This Week</h3>
          {Object.entries(targets).map(([label, target]) => (
            <TimeBar key={label} label={label} actual={totals[label] || 0} target={target} />
          ))}
        </div>
      )}

      {/* Export */}
      <button
        onClick={exportToExcel}
        className="w-full bg-stone-900 hover:bg-stone-800 active:scale-95 border border-stone-700 text-stone-300 font-medium rounded-2xl py-3.5 transition-all text-sm"
      >
        Export to Excel (.xlsx)
      </button>
    </div>
  )
}
