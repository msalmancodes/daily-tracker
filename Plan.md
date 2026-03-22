# Daily Routine Tracker — Build Plan for Claude Code

## Overview
A mobile-first daily routine tracking app for a user with a structured Islamic daily schedule (Fajr to Isha). The user fills in one form per day at end of day, logging prayer completion and time spent on activities. Data syncs across devices via Supabase.

---

## Tech Stack
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase (Postgres + Auth)
- **Deployment:** Vercel

---

## Authentication
- Supabase email/password auth (single user for now)
- Protect all routes — redirect to login if not authenticated
- Simple login page, no signup flow needed (user creates account manually via Supabase dashboard)

---

## Database Schema

### Table: `daily_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| user_id | uuid | foreign key → auth.users |
| date | date | unique per user |
| submitted_at | timestamptz | when form was submitted |
| prayers | jsonb | `{ fajr, dhuhr, asr, maghrib, isha, jumuah }` all booleans |
| quran | jsonb | `{ juz, memorize, recite }` integers (minutes) |
| learning | jsonb | `{ reading, broad, iqbal, rl, scholar, finance, journaling }` integers (minutes) |
| health | jsonb | `{ gym }` integer (minutes) |
| work | jsonb | `{ office, campus }` integers (minutes) |
| current_affairs | boolean | weekend only |
| notes | text | reflection field |

RLS: users can only read/write their own rows.

---

## App Structure

```
src/
  components/
    Auth.jsx          # login screen
    Layout.jsx        # bottom nav + header
    DailyLog.jsx      # main form tab
    Schedule.jsx      # tentative schedule tab
    Stats.jsx         # stats + charts tab
  lib/
    supabase.js       # supabase client init
    habits.js         # habit definitions, targets, schedule data
  App.jsx
  main.jsx
```

---

## Habit Definitions & Targets

### Daily (all 7 days)
| Habit | Target |
|---|---|
| Fajr, Dhuhr, Asr, Maghrib, Isha | checkbox |
| Solo Juz Recitation | 30 min |
| Memorize 3–4 Pages | 30 min |
| Recite to Someone | 30 min |
| Reading | 45 min |
| Gym | 60 min |
| Journaling | 20 min |

### Weekdays only (Mon–Thu)
| Habit | Target |
|---|---|
| Office Work | 480 min |
| Broad Learning | 45 min |

### Friday only
| Habit | Target |
|---|---|
| Office Work | 480 min |
| Jumu'ah Prayer | checkbox |
| Iqbal Study | 60 min |

### Weekend only (Sat + Sun — identical)
| Habit | Target |
|---|---|
| Campus Job | 360 min |
| RL Study | 120 min |
| Scholar Session | 120 min |
| Islamic Finance | 90 min |
| Iqbal Study | 60 min |
| Current Affairs | checkbox |

---

## Tentative Schedule (for Schedule tab)

Times are in minutes from midnight. Build as a static data structure in `habits.js`. The schedule has 4 variants: **weekday**, **friday**, **weekend**.

### Weekday
| Start | Duration | Label | Category |
|---|---|---|---|
| 5:00am | 15m | Fajr | deen |
| 5:15am | 30m | Solo Juz Recitation | deen |
| 5:45am | 30m | Memorize 3–4 Pages | deen |
| 6:15am | 20m | Breakfast + News | self |
| 8:00am | 480m | Work | work |
| 4:15pm | 30m | Asr + Recite to Someone | deen |
| 5:00pm | 45m | Broad Learning | learning |
| 5:45pm | 120m | Gym | health |
| 7:45pm | 30m | Dinner + Maghrib | self |
| 8:15pm | 45m | Reading | learning |
| 9:15pm | 15m | Isha | deen |
| 9:30pm | 20m | Daily Form | self |

### Friday
Same as weekday but replace the 5:00pm Broad Learning block with:
- 12:30pm: Jumu'ah Prayer (60m)
- 5:00pm: Iqbal Study (60m)

### Weekend (Sat & Sun)
| Start | Duration | Label | Category |
|---|---|---|---|
| 5:00am | 15m | Fajr | deen |
| 5:15am | 30m | Solo Juz Recitation | deen |
| 5:45am | 30m | Memorize 3–4 Pages | deen |
| 6:15am | 60m | Breakfast + Current Affairs | self |
| 9:00am | 360m | Campus Job | work |
| 4:15pm | 30m | Asr + Recite to Someone | deen |
| 5:00pm | 120m | RL Study | learning |
| 7:00pm | 120m | Scholar Session | deen |
| 7:00pm | 90m | Islamic Finance | learning |
| 8:30pm | 60m | Iqbal Study | learning |
| 9:30pm | 120m | Gym | health |
| 11:30pm | 30m | Dinner + Maghrib | self |
| 12:00am | 30m | Reading | learning |
| Isha | 15m | Isha | deen |
| After Isha | 20m | Daily Form | self |

---

## Tab 1: Daily Log

### Day picker
- Horizontal scroll showing last 7 days
- Green dot on days that have a submitted log
- Today highlighted in indigo

### Form sections (in order)
1. **Prayers** — tap-to-toggle buttons in a 2-column grid. Show Jumu'ah only on Fridays.
2. **Quran** — time inputs for Juz, Memorize, Recite
3. **Learning** — time inputs vary by day (see habit definitions above)
4. **Health** — time input for Gym
5. **Work** — time inputs vary by day
6. **Journaling** — time input (target 20 min)
7. **Reflection** — free text textarea ("How did today go?")

### Time inputs
Each time field shows quick-select buttons: `0 / half-target / target / 1.5x target` + a free custom number input.

### Submission
- "Submit Day" button at bottom
- Once submitted, form becomes read-only summary view
- Show submitted time and an "Edit" button to reopen
- Allow editing past days freely

---

## Tab 2: Schedule
- Day-of-week pill selector (Sun–Sat)
- Renders the tentative schedule as a vertical timeline
- Each block shows: start time, end time, label, duration, color-coded by category
- Category colors: deen=emerald, health=orange, learning=blue, work=purple, self=rose

---

## Tab 3: Stats

### Summary cards (2x2 grid)
- Days Logged
- Prayer Streak (consecutive days with all 5 prayers)
- This Week % (actual vs target across all timed habits)
- Total Entries

### Bar chart — Last 7 Days
- One bar per day showing overall completion %
- Color: emerald if 100%, indigo if today, blue otherwise

### Category rings — This Week
- 5 small SVG donut charts, one per category (Deen, Health, Learning, Work, Self)
- Shows % of weekly target met

### Time logged vs target — This Week
- Progress bar per timed habit
- Show actual minutes / weekly target minutes
- Green if over target

### Prayer consistency grid
- 5 rows (one per prayer) × 7 columns (last 7 days)
- Green checkmark if prayed, grey day initial if not

---

## Styling & UX
- Dark theme: background `#030712` (gray-950), cards `#111827` (gray-900)
- Font: Inter or system sans-serif
- Fully mobile-first, max-width 448px centered on desktop
- Bottom navigation bar with 3 tabs: Daily Log, Schedule, Stats
- Active scale animations on buttons (`active:scale-95`)
- Smooth transitions on progress bars and rings

---

## Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Deployment
- Deploy to Vercel
- Add environment variables in Vercel dashboard
- Enable Vercel's automatic HTTPS

---

## Notes for Claude Code
- Keep all habit/schedule definitions in a single `habits.js` file so they're easy to update
- Use `date-fns` for all date manipulation
- Use Recharts or pure SVG for charts (no heavy chart libraries)
- No Redux — React state + Supabase queries is sufficient
- Supabase real-time is not needed — simple fetch on load is fine