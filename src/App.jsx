import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Layout from './components/Layout'
import DailyLog from './components/DailyLog'
import Schedule from './components/Schedule'
import Stats from './components/Stats'
import QuranProgress from './components/QuranProgress'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('log')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    )
  }

  if (!session) return <Auth />

  return (
    <Layout tab={tab} setTab={setTab}>
      {tab === 'log'      && <DailyLog userId={session.user.id} />}
      {tab === 'quran'    && <QuranProgress userId={session.user.id} />}
      {tab === 'schedule' && <Schedule />}
      {tab === 'stats'    && <Stats userId={session.user.id} />}
    </Layout>
  )
}
