import { useState, useEffect } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { PAGES_PER_JUZ, JUZ_COUNT } from '../lib/habits'

function CycleArc({ currentJuz, currentPage }) {
  const totalPages = JUZ_COUNT * PAGES_PER_JUZ
  const pagesCompleted = currentJuz
    ? (currentJuz - 1) * PAGES_PER_JUZ + (currentPage || 0)
    : 0
  const pct = totalPages > 0 ? pagesCompleted / totalPages : 0

  const size = 180
  const r = 76
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - pct * circumference

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#292524" strokeWidth="12" />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#2d6a4f"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="flex flex-col items-center -mt-[108px] mb-[36px]">
        <span className="text-3xl font-bold text-stone-100">{Math.round(pct * 100)}%</span>
        <span className="text-xs text-stone-400 mt-0.5">
          {pagesCompleted} / {totalPages} pages
        </span>
      </div>
    </div>
  )
}

export default function QuranProgress({ userId }) {
  const [cycles, setCycles] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)

  async function loadData() {
    const [{ data: cycleData }, { data: logData }] = await Promise.all([
      supabase
        .from('quran_cycles')
        .select('*')
        .eq('user_id', userId)
        .order('cycle_number', { ascending: true }),
      supabase
        .from('daily_logs')
        .select('date, quran')
        .eq('user_id', userId)
        .not('quran->juz_number', 'is', null)
        .order('date', { ascending: false })
        .limit(200),
    ])
    setCycles(cycleData || [])
    setRecentLogs(logData || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [userId])

  const activeCycle = cycles.find(c => !c.completed_at)
  const cycleStartDate = activeCycle?.started_at || null
  const cycleLogs = recentLogs.filter(l =>
    cycleStartDate ? l.date >= cycleStartDate : true
  )

  const latestLog = cycleLogs[0]
  const currentJuz = latestLog?.quran?.juz_number || null
  const currentPage = latestLog?.quran?.page || null

  function juzStatus(n) {
    if (!currentJuz) return 'untouched'
    if (n < currentJuz) return 'complete'
    if (n === currentJuz) return 'current'
    return 'untouched'
  }

  const daysRunning = activeCycle
    ? differenceInDays(new Date(), parseISO(activeCycle.started_at)) + 1
    : 0

  async function startFirstCycle() {
    setCompleting(true)
    await supabase.from('quran_cycles').insert({
      user_id: userId,
      cycle_number: 1,
      started_at: format(new Date(), 'yyyy-MM-dd'),
    })
    await loadData()
    setCompleting(false)
  }

  async function completeCycle() {
    if (!activeCycle) return
    setCompleting(true)
    const nextCycleNum = activeCycle.cycle_number + 1
    await supabase
      .from('quran_cycles')
      .update({ completed_at: format(new Date(), 'yyyy-MM-dd') })
      .eq('id', activeCycle.id)
    await supabase.from('quran_cycles').insert({
      user_id: userId,
      cycle_number: nextCycleNum,
      started_at: format(new Date(), 'yyyy-MM-dd'),
    })
    await loadData()
    setCompleting(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-stone-500">Loading…</div>
  }

  const completedCycles = cycles.filter(c => c.completed_at)

  return (
    <div className="p-4 space-y-4">

      {/* No cycle started yet */}
      {!activeCycle && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center">
          <p className="text-stone-400 text-sm mb-4">No active revision cycle. Start one to begin tracking.</p>
          <button
            onClick={startFirstCycle}
            disabled={completing}
            className="bg-teal-800 hover:bg-teal-700 active:scale-95 text-teal-50 font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50"
          >
            Start Cycle {cycles.length + 1}
          </button>
        </div>
      )}

      {/* Active cycle */}
      {activeCycle && (
        <>
          {/* Header */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-bold text-stone-100">Cycle {activeCycle.cycle_number}</span>
              <span className="text-xs text-emerald-400 font-medium bg-emerald-950/50 border border-emerald-900 px-2 py-1 rounded-full">
                Active
              </span>
            </div>
            <div className="flex gap-4 text-xs text-stone-500 mb-4">
              <span>Started {format(parseISO(activeCycle.started_at), 'MMM d, yyyy')}</span>
              <span>{daysRunning} day{daysRunning !== 1 ? 's' : ''}</span>
            </div>

            <CycleArc currentJuz={currentJuz} currentPage={currentPage} />

            {currentJuz ? (
              <div className="text-center -mt-2 mb-2">
                <span className="text-base font-semibold text-stone-100">Juz {currentJuz}</span>
                {currentPage && (
                  <span className="text-stone-400 text-sm"> · Page {currentPage} of {PAGES_PER_JUZ}</span>
                )}
              </div>
            ) : (
              <p className="text-center text-stone-500 text-sm -mt-2 mb-2">
                Log a day with your juz position to start tracking
              </p>
            )}
          </div>

          {/* 30-Juz Grid */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              Juz Progress
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map(n => {
                const status = juzStatus(n)
                return (
                  <div
                    key={n}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all relative overflow-hidden ${
                      status === 'complete'
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-800'
                        : status === 'current'
                        ? 'bg-teal-900/60 text-teal-200 border border-teal-700 ring-1 ring-teal-600'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {status === 'current' && currentPage && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-teal-700/30"
                        style={{ height: `${(currentPage / PAGES_PER_JUZ) * 100}%` }}
                      />
                    )}
                    <span className="relative z-10">{n}</span>
                    {status === 'complete' && (
                      <span className="relative z-10 text-[8px] text-emerald-500">✓</span>
                    )}
                    {status === 'current' && currentPage && (
                      <span className="relative z-10 text-[8px] text-teal-400">{currentPage}/20</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-3">
              {[
                { color: 'bg-emerald-900/60 border border-emerald-800', label: 'Complete' },
                { color: 'bg-teal-900/60 border border-teal-700',       label: 'Current' },
                { color: 'bg-stone-800',                                 label: 'Upcoming' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded ${l.color}`} />
                  <span className="text-xs text-stone-400">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Complete cycle button */}
          {currentJuz === JUZ_COUNT && (
            <button
              onClick={completeCycle}
              disabled={completing}
              className="w-full bg-emerald-900/60 hover:bg-emerald-900 active:scale-95 disabled:opacity-50 text-emerald-300 border border-emerald-800 font-semibold rounded-2xl py-4 transition-all"
            >
              {completing ? 'Saving…' : '✦ Complete Cycle & Start Next'}
            </button>
          )}
        </>
      )}

      {/* Cycle History */}
      {completedCycles.length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Cycle History
          </h3>
          <div className="space-y-2">
            {[...completedCycles].reverse().map(c => {
              const days = differenceInDays(
                parseISO(c.completed_at),
                parseISO(c.started_at)
              ) + 1
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-stone-200">Cycle {c.cycle_number}</span>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {format(parseISO(c.started_at), 'MMM d')} → {format(parseISO(c.completed_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <span className="text-xs text-stone-400 bg-stone-800 px-2 py-1 rounded-lg">
                    {days}d
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
