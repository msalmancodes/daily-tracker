// Habit definitions, targets, and schedule data

// Day type helper
export function getDayType(date) {
  const day = date.getDay() // 0=Sun,1=Mon,...,6=Sat
  if (day === 5) return 'friday'
  if (day === 0 || day === 6) return 'weekend'
  return 'weekday'
}

// Returns habit targets for a given day type
// minutes: integer minutes, boolean: checkbox, lectures: count
export function getHabitsForDay(dayType) {
  const base = {
    prayers: { fajr: 'boolean', dhuhr: 'boolean', asr: 'boolean', maghrib: 'boolean', isha: 'boolean' },
    quran: {}, // time removed; juz_number + page tracked directly
    health: {
      gym: { label: 'Gym', type: 'boolean' },
    },
    learning: {
      reading: { label: 'Reading', target: 45 },
    },
  }

  if (dayType === 'weekday') {
    return {
      ...base,
      learning: {
        ...base.learning,
        broad: { label: 'Broad Learning', target: 45 },
      },
      work: {
        office: { label: 'Office Work', target: 480 },
      },
      journaling: { label: 'Journaling', type: 'boolean' },
    }
  }

  if (dayType === 'friday') {
    return {
      ...base,
      prayers: { ...base.prayers, jumuah: 'boolean' },
      learning: {
        ...base.learning,
        iqbal: { label: 'Iqbal Study', target: 60 },
      },
      work: {
        office: { label: 'Office Work', target: 480 },
      },
      journaling: { label: 'Journaling', type: 'boolean' },
    }
  }

  // weekend
  return {
    ...base,
    learning: {
      ...base.learning,
      iqbal: { label: 'Iqbal Study', target: 60 },
      tech_learning: { label: 'Tech Learning', type: 'tech_learning', timeTarget: 120 },
      scholar: { label: 'Scholar Session', type: 'boolean' },
      finance: { label: 'Islamic Finance', type: 'lectures', max: 4 },
    },
    work: {
      camd: { label: 'CAMD', type: 'boolean' },
      cps: { label: 'CPS Work', type: 'boolean' },
    },
    journaling: { label: 'Journaling', type: 'boolean' },
    current_affairs: 'boolean',
  }
}

// Empty form defaults for a given day type
export function getEmptyLog(dayType) {
  return {
    prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false, jumuah: false },
    quran: { memorization: {}, recitation: 0 },
    learning: { reading: 0, broad: 0, iqbal: 0, tech_learning: { time: 0, lectures: false, project: false }, scholar: false, finance: 0, journaling: false },
    health: { gym: false },
    work: { office: 0, camd: false, cps: false },
    current_affairs: false,
    notes: '',
  }
}

// 15-line Indo-Pak Mushaf: 20 pages per juz
export const PAGES_PER_JUZ = 20
export const JUZ_COUNT = 30

// Schedule data (time in minutes from midnight)
function t(h, m) { return h * 60 + m }

export const SCHEDULE = {
  weekday: [
    { start: t(5,0),  duration: 15,  label: 'Fajr',               category: 'deen' },
    { start: t(5,15), duration: 30,  label: 'Solo Juz Recitation', category: 'deen' },
    { start: t(5,45), duration: 30,  label: 'Memorize 3–4 Pages',  category: 'deen' },
    { start: t(6,15), duration: 20,  label: 'Breakfast + News',    category: 'self' },
    { start: t(8,0),  duration: 480, label: 'Work',                category: 'work' },
    { start: t(16,15),duration: 30,  label: 'Asr + Recite to Someone', category: 'deen' },
    { start: t(17,0), duration: 45,  label: 'Broad Learning',      category: 'learning' },
    { start: t(17,45),duration: 120, label: 'Gym',                 category: 'health' },
    { start: t(19,45),duration: 30,  label: 'Dinner + Maghrib',    category: 'self' },
    { start: t(20,15),duration: 45,  label: 'Reading',             category: 'learning' },
    { start: t(21,15),duration: 15,  label: 'Isha',                category: 'deen' },
    { start: t(21,30),duration: 20,  label: 'Daily Form',          category: 'self' },
  ],
  friday: [
    { start: t(5,0),  duration: 15,  label: 'Fajr',               category: 'deen' },
    { start: t(5,15), duration: 30,  label: 'Solo Juz Recitation', category: 'deen' },
    { start: t(5,45), duration: 30,  label: 'Memorize 3–4 Pages',  category: 'deen' },
    { start: t(6,15), duration: 20,  label: 'Breakfast + News',    category: 'self' },
    { start: t(8,0),  duration: 480, label: 'Work',                category: 'work' },
    { start: t(12,30),duration: 60,  label: "Jumu'ah Prayer",      category: 'deen' },
    { start: t(16,15),duration: 30,  label: 'Asr + Recite to Someone', category: 'deen' },
    { start: t(17,0), duration: 60,  label: 'Iqbal Study',         category: 'learning' },
    { start: t(17,45),duration: 120, label: 'Gym',                 category: 'health' },
    { start: t(19,45),duration: 30,  label: 'Dinner + Maghrib',    category: 'self' },
    { start: t(20,15),duration: 45,  label: 'Reading',             category: 'learning' },
    { start: t(21,15),duration: 15,  label: 'Isha',                category: 'deen' },
    { start: t(21,30),duration: 20,  label: 'Daily Form',          category: 'self' },
  ],
  weekend: [
    { start: t(5,0),  duration: 15,  label: 'Fajr',               category: 'deen' },
    { start: t(5,15), duration: 30,  label: 'Solo Juz Recitation', category: 'deen' },
    { start: t(5,45), duration: 30,  label: 'Memorize 3–4 Pages',  category: 'deen' },
    { start: t(6,15), duration: 60,  label: 'Breakfast + Current Affairs', category: 'self' },
    { start: t(9,0),  duration: 360, label: 'Campus Job',          category: 'work' },
    { start: t(16,15),duration: 30,  label: 'Asr + Recite to Someone', category: 'deen' },
    { start: t(17,0), duration: 120, label: 'Tech Learning',       category: 'learning' },
    { start: t(19,0), duration: 120, label: 'Scholar Session',     category: 'deen' },
    { start: t(19,0), duration: 90,  label: 'Islamic Finance',     category: 'learning' },
    { start: t(20,30),duration: 60,  label: 'Iqbal Study',         category: 'learning' },
    { start: t(21,30),duration: 120, label: 'Gym',                 category: 'health' },
    { start: t(23,30),duration: 30,  label: 'Dinner + Maghrib',    category: 'self' },
    { start: t(0,0),  duration: 30,  label: 'Reading',             category: 'learning' },
    { start: t(0,30), duration: 15,  label: 'Isha',                category: 'deen' },
    { start: t(0,45), duration: 20,  label: 'Daily Form',          category: 'self' },
  ],
}

export const CATEGORY_COLORS = {
  deen: 'emerald',
  health: 'orange',
  learning: 'blue',
  work: 'purple',
  self: 'rose',
}

export const CATEGORY_TAILWIND = {
  deen:     { bg: 'bg-emerald-950/50', text: 'text-emerald-500', border: 'border-emerald-900', dot: 'bg-emerald-600' },
  health:   { bg: 'bg-amber-950/50',   text: 'text-amber-500',   border: 'border-amber-900',   dot: 'bg-amber-600' },
  learning: { bg: 'bg-teal-950/50',    text: 'text-teal-500',    border: 'border-teal-900',    dot: 'bg-teal-600' },
  work:     { bg: 'bg-stone-900/80',   text: 'text-stone-400',   border: 'border-stone-700',   dot: 'bg-stone-500' },
  self:     { bg: 'bg-orange-950/50',  text: 'text-orange-500',  border: 'border-orange-900',  dot: 'bg-orange-600' },
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

export function formatScheduleTime(minutes) {
  return minutesToTime(minutes)
}
