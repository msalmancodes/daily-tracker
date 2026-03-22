export default function Layout({ children, tab, setTab }) {
  const tabs = [
    { id: 'log',      label: 'Daily Log',  icon: '📋' },
    { id: 'quran',    label: 'Quran',      icon: '📖' },
    { id: 'schedule', label: 'Schedule',   icon: '📅' },
    { id: 'stats',    label: 'Stats',      icon: '📊' },
  ]

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="bg-stone-900 border-b border-stone-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">☀️</span>
          <span className="font-semibold text-stone-100">Daily Routine</span>
        </div>
        <span className="text-xs text-stone-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-stone-900 border-t border-stone-800 flex z-10">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 active:scale-95 transition-all ${
              tab === t.id ? 'text-teal-400' : 'text-stone-500'
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
