'use client'

const TIMER_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '120s', value: 120 },
] as const

type TimerOption = (typeof TIMER_OPTIONS)[number]

type TimerControlsProps = {
  options: readonly TimerOption[]
  current: number
  onChange: (value: number) => void
}

export function TimerControls({ options, current, onChange }: TimerControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mr-1">
        Timer
      </span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
            current === opt.value
              ? 'bg-zinc-700 text-zinc-100 border-zinc-500'
              : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-500'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export { TIMER_OPTIONS }