'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'

export interface FilterState {
  usage:     string | null
  minFloors: number
  maxFloors: number
}

interface Props {
  value:    FilterState
  onChange: (f: FilterState) => void
}

const USAGES = ['Residential', 'Commercial', 'Industrial', 'Civic', 'Unknown']

const USAGE_COLOUR: Record<string, string> = {
  Residential: 'border-sky-500/50 bg-sky-500/10 text-sky-400',
  Commercial:  'border-amber-500/50 bg-amber-500/10 text-amber-400',
  Industrial:  'border-purple-500/50 bg-purple-500/10 text-purple-400',
  Civic:       'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  Unknown:     'border-zinc-600/50 bg-zinc-800/40 text-zinc-400',
}

export default function FilterPanel({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const active = value.usage !== null || value.minFloors > 1 || value.maxFloors < 50
  const activeCount = (value.usage ? 1 : 0) + (value.minFloors > 1 || value.maxFloors < 50 ? 1 : 0)

  const reset = () => onChange({ usage: null, minFloors: 1, maxFloors: 50 })

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-all ${
          active
            ? 'border-sky-500/50 bg-sky-500/10 text-sky-400'
            : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07]'
        }`}
      >
        <SlidersHorizontal size={13} />
        Filters
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-60 rounded-xl border border-white/[0.08]
                        shadow-2xl p-4 z-50"
             style={{ background: 'rgba(10,11,16,0.97)', backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Filters</span>
            <div className="flex items-center gap-2">
              {active && (
                <button onClick={reset} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
                  Reset
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Usage */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Building usage</p>
            <div className="flex flex-wrap gap-1.5">
              {USAGES.map(u => (
                <button key={u}
                  onClick={() => onChange({ ...value, usage: value.usage === u ? null : u })}
                  className={`px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                    value.usage === u ? USAGE_COLOUR[u] : 'border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Floor range */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">
              Floors: {value.minFloors} – {value.maxFloors === 50 ? '50+' : value.maxFloors}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600 w-6">Min</span>
                <input type="range" min={1} max={49} value={value.minFloors}
                  onChange={e => onChange({ ...value, minFloors: Number(e.target.value) })}
                  className="flex-1 accent-sky-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600 w-6">Max</span>
                <input type="range" min={2} max={50} value={value.maxFloors}
                  onChange={e => onChange({ ...value, maxFloors: Number(e.target.value) })}
                  className="flex-1 accent-sky-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
