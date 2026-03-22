import { useState, useEffect } from 'react'
import { format, subDays, parseISO, isToday, startOfMonth, endOfMonth,
         startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth } from 'date-fns'
import { supabase } from '../lib/supabase'
import { getDayType, getHabitsForDay, getEmptyLog } from '../lib/habits'

function MiniCalendar({ selectedDate, onSelect, submittedDates, logSummaries }) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate + 'T00:00:00'))
  const today = format(new Date(), 'yyyy-MM-dd')

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 mb-3">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-800 active:scale-95 transition-all text-lg"
        >‹</button>
        <span className="text-sm font-semibold text-stone-200">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-800 active:scale-95 transition-all text-lg"
        >›</button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-stone-500 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {allDays.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const isSelected = key === selectedDate
          const isT = key === today
          const hasLog = submittedDates.has(key)
          const inMonth = isSameMonth(day, viewMonth)
          const hasSummary = !!logSummaries[key]

          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 transition-all active:scale-95 ${
                isSelected
                  ? 'bg-teal-800 text-white'
                  : isT
                  ? 'bg-teal-950/60 text-teal-300 border border-teal-900'
                  : hasLog
                  ? 'bg-stone-800 text-stone-200'
                  : 'text-stone-500 hover:bg-stone-800'
              } ${!inMonth ? 'opacity-25' : ''}`}
            >
              <span className="text-xs font-medium leading-none">{format(day, 'd')}</span>
              {hasLog && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${
                  hasSummary ? 'bg-teal-400' : 'bg-emerald-500'
                }`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-stone-800">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-stone-500">Logged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <span className="text-[10px] text-stone-500">+ AI summary</span>
        </div>
      </div>
    </div>
  )
}

function TimeInput({ label, target, value, onChange, disabled }) {
  const presets = [0, Math.round(target / 2), target, Math.round(target * 1.5)]

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-stone-300">{label}</span>
        <span className="text-xs text-stone-500">target: {target}m</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {presets.map(p => (
          <button
            key={p}
            disabled={disabled}
            onClick={() => onChange(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
              value === p
                ? 'bg-teal-800 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            } disabled:opacity-50`}
          >
            {p}m
          </button>
        ))}
        <input
          type="number"
          min="0"
          disabled={disabled}
          value={value || ''}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
          placeholder="custom"
          className="w-20 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-teal-600 disabled:opacity-50"
        />
      </div>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-stone-900 rounded-2xl p-4 mb-3 border border-stone-800">
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

export default function DailyLog({ userId }) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [logs, setLogs] = useState({}) // date -> log data
  const [submittedDates, setSubmittedDates] = useState(new Set())
  const [formData, setFormData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [loadingDate, setLoadingDate] = useState(false)
  const [logSummaries, setLogSummaries] = useState({}) // date -> ai_summary

  // Load submitted dates on mount
  useEffect(() => {
    async function loadDates() {
      const since = format(subDays(new Date(), 365), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('daily_logs')
        .select('date, ai_summary')
        .eq('user_id', userId)
        .gte('date', since)
      if (data) {
        setSubmittedDates(new Set(data.map(r => r.date)))
        const summaries = {}
        data.forEach(r => { if (r.ai_summary) summaries[r.date] = r.ai_summary })
        setLogSummaries(summaries)
      }
    }
    loadDates()
  }, [userId])

  // Load log when date changes
  useEffect(() => {
    async function loadLog() {
      setLoadingDate(true)
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', selectedDate)
        .single()

      if (data) {
        setLogs(prev => ({ ...prev, [selectedDate]: data }))
        setFormData(data)
        setIsEditing(false)
      } else {
        const dayType = getDayType(new Date(selectedDate + 'T00:00:00'))
        const empty = getEmptyLog(dayType)
        setFormData({ ...empty, date: selectedDate })
        setIsEditing(true)
      }
      setLoadingDate(false)
    }
    loadLog()
  }, [selectedDate, userId])

  const dayType = getDayType(new Date(selectedDate + 'T00:00:00'))
  const habits = getHabitsForDay(dayType)
  const isSubmitted = submittedDates.has(selectedDate) && !isEditing

  function updatePrayer(key, val) {
    setFormData(f => ({ ...f, prayers: { ...f.prayers, [key]: val } }))
  }
  function updateQuran(key, val) {
    setFormData(f => ({ ...f, quran: { ...f.quran, [key]: val } }))
  }
  function updateLearning(key, val) {
    setFormData(f => ({ ...f, learning: { ...f.learning, [key]: val } }))
  }
  function updateHealth(key, val) {
    setFormData(f => ({ ...f, health: { ...f.health, [key]: val } }))
  }
  function updateWork(key, val) {
    setFormData(f => ({ ...f, work: { ...f.work, [key]: val } }))
  }

  async function generateAISummary(payload) {
    setGeneratingSummary(true)
    try {
      const { data, error } = await supabase.functions.invoke('ai-summary', {
        body: {
          date: payload.date,
          prayers: payload.prayers,
          quran: payload.quran,
          learning: payload.learning,
          health: payload.health,
          work: payload.work,
          notes: payload.notes,
          dayType,
        },
      })
      if (!error && data?.summary) {
        await supabase
          .from('daily_logs')
          .update({ ai_summary: data.summary })
          .eq('user_id', userId)
          .eq('date', payload.date)
        setFormData(f => ({ ...f, ai_summary: data.summary }))
        setLogSummaries(prev => ({ ...prev, [payload.date]: data.summary }))
      }
    } catch (_) {}
    setGeneratingSummary(false)
  }

  async function handleSubmit() {
    setSaving(true)
    const payload = {
      user_id: userId,
      date: selectedDate,
      submitted_at: new Date().toISOString(),
      prayers: formData.prayers,
      quran: formData.quran,
      learning: formData.learning,
      health: formData.health,
      work: formData.work,
      current_affairs: formData.current_affairs || false,
      notes: formData.notes || '',
      ai_summary: formData.ai_summary || '',
    }

    const { error } = await supabase
      .from('daily_logs')
      .upsert(payload, { onConflict: 'user_id,date' })

    if (!error) {
      setSubmittedDates(prev => new Set([...prev, selectedDate]))
      setLogs(prev => ({ ...prev, [selectedDate]: { ...payload } }))
      setIsEditing(false)
      generateAISummary(payload)
    }
    setSaving(false)
  }

  const prayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
  if (dayType === 'friday') prayerKeys.push('jumuah')

  if (!formData || loadingDate) {
    return <div className="flex items-center justify-center h-48 text-stone-500">Loading…</div>
  }

  return (
    <div className="p-4">
      {/* Calendar */}
      <MiniCalendar
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        submittedDates={submittedDates}
        logSummaries={logSummaries}
      />

      {/* Submitted banner */}
      {isSubmitted && (
        <div className="bg-emerald-900/30 border border-emerald-800 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
          <div>
            <span className="text-emerald-400 text-sm font-medium">Submitted</span>
            {formData.submitted_at && (
              <span className="text-stone-500 text-xs ml-2">
                {format(parseISO(formData.submitted_at), 'h:mm a')}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-teal-400 hover:text-teal-300 font-medium active:scale-95"
          >
            Edit
          </button>
        </div>
      )}

      {/* Prayers */}
      <SectionCard title="Prayers">
        <div className="grid grid-cols-2 gap-2">
          {prayerKeys.map(key => (
            <button
              key={key}
              disabled={isSubmitted}
              onClick={() => updatePrayer(key, !formData.prayers[key])}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 capitalize ${
                formData.prayers[key]
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-800 text-stone-400'
              } disabled:opacity-60`}
            >
              {key === 'jumuah' ? "Jumu'ah" : key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Quran */}
      <SectionCard title="Quran">
        {Object.entries(habits.quran).map(([key, def]) => (
          <TimeInput
            key={key}
            label={def.label}
            target={def.target}
            value={formData.quran[key] || 0}
            onChange={val => updateQuran(key, val)}
            disabled={isSubmitted}
          />
        ))}
        {/* Cycle progress fields */}
        <div className="border-t border-stone-800 pt-3 mt-1">
          <p className="text-xs text-stone-500 mb-3">Solo recitation position</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-stone-400 mb-1.5">Juz</label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    disabled={isSubmitted}
                    onClick={() => updateQuran('juz_number', formData.quran.juz_number === n ? null : n)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                      formData.quran.juz_number === n
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 text-stone-400'
                    } disabled:opacity-50`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-24">
              <label className="block text-xs text-stone-400 mb-1.5">Page (1–20)</label>
              <input
                type="number"
                min="1"
                max="20"
                disabled={isSubmitted}
                value={formData.quran.page || ''}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  updateQuran('page', v >= 1 && v <= 20 ? v : null)
                }}
                placeholder="—"
                className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Learning */}
      <SectionCard title="Learning">
        {Object.entries(habits.learning).map(([key, def]) => (
          <TimeInput
            key={key}
            label={def.label}
            target={def.target}
            value={formData.learning[key] || 0}
            onChange={val => updateLearning(key, val)}
            disabled={isSubmitted}
          />
        ))}
      </SectionCard>

      {/* Health */}
      <SectionCard title="Health">
        {Object.entries(habits.health).map(([key, def]) => (
          <TimeInput
            key={key}
            label={def.label}
            target={def.target}
            value={formData.health[key] || 0}
            onChange={val => updateHealth(key, val)}
            disabled={isSubmitted}
          />
        ))}
      </SectionCard>

      {/* Work */}
      {habits.work && Object.keys(habits.work).length > 0 && (
        <SectionCard title="Work">
          {Object.entries(habits.work).map(([key, def]) => (
            <TimeInput
              key={key}
              label={def.label}
              target={def.target}
              value={formData.work[key] || 0}
              onChange={val => updateWork(key, val)}
              disabled={isSubmitted}
            />
          ))}
        </SectionCard>
      )}

      {/* Journaling */}
      {habits.journaling && (
        <SectionCard title="Self">
          <TimeInput
            label={habits.journaling.label}
            target={habits.journaling.target}
            value={formData.learning.journaling || 0}
            onChange={val => updateLearning('journaling', val)}
            disabled={isSubmitted}
          />
          {dayType === 'weekend' && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-stone-300">Current Affairs</span>
              <button
                disabled={isSubmitted}
                onClick={() => setFormData(f => ({ ...f, current_affairs: !f.current_affairs }))}
                className={`w-12 h-6 rounded-full transition-all relative disabled:opacity-50 ${
                  formData.current_affairs ? 'bg-teal-800' : 'bg-stone-700'
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                  formData.current_affairs ? 'left-6' : 'left-0.5'
                }`} />
              </button>
            </div>
          )}
        </SectionCard>
      )}

      {/* Reflection */}
      <SectionCard title="Reflection">
        <textarea
          disabled={isSubmitted}
          value={formData.notes || ''}
          onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
          placeholder="How did today go?"
          rows={4}
          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:border-teal-600 resize-none disabled:opacity-60"
        />
      </SectionCard>

      {/* AI Summary */}
      {(formData.ai_summary || generatingSummary) && (
        <div className="bg-stone-900 border border-stone-700 rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-teal-500 uppercase tracking-wider">AI Reflection</span>
            {generatingSummary && (
              <span className="text-xs text-stone-500 animate-pulse">Generating…</span>
            )}
          </div>
          {formData.ai_summary && (
            <p className="text-sm text-stone-300 leading-relaxed">{formData.ai_summary}</p>
          )}
        </div>
      )}

      {/* Submit */}
      {!isSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-teal-800 hover:bg-teal-700 active:scale-95 disabled:opacity-50 text-white font-semibold rounded-2xl py-4 transition-all mb-4"
        >
          {saving ? 'Saving…' : 'Submit Day'}
        </button>
      )}
    </div>
  )
}
