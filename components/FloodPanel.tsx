'use client'

import { useState, useCallback } from 'react'
import { X, Waves, AlertTriangle, Play, Square } from 'lucide-react'
import type { BuildingProperties } from '@/lib/types'
import { estimateValue, formatKES } from '@/lib/valuation'
import { distanceToNearestRiver, effectiveFloodDepth } from '@/lib/floodEngine'

interface Props {
  floodLevel:     number                    // metres, 0 = no flood
  onLevelChange:  (m: number) => void
  buildings:      BuildingProperties[]      // visible buildings
  onClose:        () => void
}

const SCENARIOS: { label: string; level: number; colour: string; icon: string }[] = [
  { label: 'Flash flood',  level: 0.5,  colour: 'text-sky-400    border-sky-500/30    bg-sky-500/10',    icon: '🌧️' },
  { label: 'Moderate',     level: 2,    colour: 'text-blue-400   border-blue-500/30   bg-blue-500/10',   icon: '🌊' },
  { label: 'Severe',       level: 5,    colour: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10', icon: '⛈️' },
  { label: 'Extreme',      level: 10,   colour: 'text-violet-400 border-violet-500/30 bg-violet-500/10', icon: '🚨' },
  { label: 'Catastrophic', level: 20,   colour: 'text-red-400    border-red-500/30    bg-red-500/10',    icon: '💀' },
]

function buildingFloodStats(buildings: BuildingProperties[], level: number) {
  let fullySubmerged = 0
  let partial        = 0
  let safe           = 0
  let valueAtRisk    = 0
  let totalValue     = 0

  for (const b of buildings) {
    const h   = b.heightM ?? (b.floors ?? 1) * 3
    const lng = (b as any).lng as number | undefined
    const lat = (b as any).lat as number | undefined
    const val = estimateValue({
      gfa:       b.grossFloorAreaM2  ?? (b.footprintAreaM2  ?? 50) * (b.floors ?? 1),
      footprint: b.footprintAreaM2   ?? 50,
      floors:    b.floors            ?? 1,
      usage:     b.usage             ?? 'Unknown',
      city:      (b as any).city     ?? 'Unknown',
    }).estimatedValueKES

    totalValue += val

    if (level <= 0) { safe++; continue }

    // Use river-distance if coordinates are available, otherwise fall back to level
    const wetDepth = (lng != null && lat != null)
      ? effectiveFloodDepth(distanceToNearestRiver(lng, lat), level)
      : level   // fallback: assume on-river

    if (wetDepth <= 0)  { safe++; continue }
    if (h <= wetDepth)  { fullySubmerged++; valueAtRisk += val }
    else                { partial++;  valueAtRisk += val * (wetDepth / h) }
  }

  return { fullySubmerged, partial, safe, valueAtRisk, totalValue }
}

export default function FloodPanel({ floodLevel, onLevelChange, buildings, onClose }: Props) {
  const [animating, setAnimating] = useState(false)
  const [animRef,   setAnimRef]   = useState<ReturnType<typeof setInterval> | null>(null)

  const stats = buildingFloodStats(buildings, floodLevel)

  const riskPct = stats.totalValue > 0
    ? Math.round((stats.valueAtRisk / stats.totalValue) * 100)
    : 0

  const activeScenario = SCENARIOS.findLast(s => floodLevel >= s.level) ?? null

  // Slow animated rise
  const startAnimation = useCallback(() => {
    if (animating) return
    setAnimating(true)
    onLevelChange(0)
    let level = 0
    const id = setInterval(() => {
      level = Math.min(20, level + 0.05)
      onLevelChange(parseFloat(level.toFixed(2)))
      if (level >= 20) { clearInterval(id); setAnimating(false) }
    }, 40)
    setAnimRef(id)
  }, [animating, onLevelChange])

  const stopAnimation = useCallback(() => {
    if (animRef) clearInterval(animRef)
    setAnimating(false)
  }, [animRef])

  const riskColour =
    riskPct >= 60 ? 'text-red-400'    :
    riskPct >= 30 ? 'text-orange-400' :
    riskPct >= 10 ? 'text-amber-400'  :
    'text-emerald-400'

  return (
    <aside
      className="anim-slide-right absolute top-14 right-3 bottom-3 w-72 flex flex-col
                 rounded-2xl overflow-hidden border border-white/[0.07] shadow-2xl shadow-black/60 z-20"
      style={{ background: 'rgba(10,11,16,0.96)', backdropFilter: 'blur(20px)' }}
    >
      {/* Accent */}
      <div className="h-[3px] w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent" />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-2">
        <Waves size={15} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white">Flood Simulation</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Raise water level to see impact</p>
        </div>
        <button onClick={onClose}
          className="p-1 rounded-md text-zinc-600 hover:text-white hover:bg-white/10 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">

        {/* Water level control */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Water level</p>
            <span className="text-xl font-black tabular-nums"
              style={{ color: floodLevel === 0 ? '#52525b' : `hsl(${210 - floodLevel * 8}, 80%, 65%)` }}>
              {floodLevel.toFixed(1)}
              <span className="text-sm font-medium text-zinc-500 ml-0.5">m</span>
            </span>
          </div>

          <input
            type="range" min={0} max={20} step={0.1}
            value={floodLevel}
            onChange={e => onLevelChange(parseFloat(e.target.value))}
            className="w-full cursor-pointer"
            style={{ accentColor: `hsl(${210 - floodLevel * 8}, 80%, 60%)` }}
          />

          <div className="flex justify-between text-[9px] text-zinc-600">
            <span>0 m</span><span>5 m</span><span>10 m</span><span>15 m</span><span>20 m</span>
          </div>

          {/* Animate button */}
          <button
            onClick={animating ? stopAnimation : startAnimation}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg
                        text-xs font-semibold transition-all border
                        ${animating
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                        }`}
          >
            {animating
              ? <><Square size={11} /> Stop</>
              : <><Play size={11} /> Animate Rise</>
            }
          </button>
        </div>

        {/* Scenario presets */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Scenarios</p>
          {SCENARIOS.map(s => (
            <button
              key={s.label}
              onClick={() => onLevelChange(s.level)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs
                          font-medium transition-all text-left
                          ${floodLevel === s.level
                            ? s.colour
                            : 'border-white/[0.05] bg-white/[0.02] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                          }`}
            >
              <span className="text-sm">{s.icon}</span>
              <span className="flex-1">{s.label}</span>
              <span className="tabular-nums font-bold">{s.level} m</span>
            </button>
          ))}
          <button
            onClick={() => onLevelChange(0)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                       text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Clear flood
          </button>
        </div>

        {/* Impact stats */}
        {buildings.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Impact analysis</p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Submerged', value: stats.fullySubmerged, colour: 'text-blue-400'    },
                { label: 'Partial',   value: stats.partial,        colour: 'text-cyan-400'     },
                { label: 'Safe',      value: stats.safe,           colour: 'text-emerald-400'  },
              ].map(({ label, value, colour }) => (
                <div key={label} className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl
                                            bg-white/[0.03] border border-white/[0.05]">
                  <p className={`text-lg font-black ${colour}`}>{value.toLocaleString()}</p>
                  <p className="text-[9px] text-zinc-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Value at risk */}
            <div className={`rounded-xl p-3 space-y-1.5 border
              ${riskPct >= 30
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-white/[0.03] border-white/[0.05]'}`}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                  Value at risk
                </p>
                {riskPct >= 30 && (
                  <AlertTriangle size={12} className="text-red-400" />
                )}
              </div>
              <p className={`text-xl font-black ${riskColour}`}>
                {formatKES(Math.round(stats.valueAtRisk))}
              </p>
              <div className="h-1.5 rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width:           `${riskPct}%`,
                    backgroundColor: riskPct >= 60 ? '#f87171' : riskPct >= 30 ? '#fb923c' : '#38bdf8',
                  }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">{riskPct}% of visible portfolio</p>
            </div>

            {/* Active scenario badge */}
            {floodLevel > 0 && activeScenario && (
              <div className={`rounded-xl px-3 py-2 border flex items-center gap-2 ${activeScenario.colour}`}>
                <span>{activeScenario.icon}</span>
                <div>
                  <p className="text-xs font-bold">{activeScenario.label} scenario</p>
                  <p className="text-[10px] opacity-70">{floodLevel.toFixed(1)} m above ground</p>
                </div>
              </div>
            )}
          </div>
        )}

        {buildings.length === 0 && (
          <div className="py-6 text-center space-y-2">
            <Waves size={28} className="mx-auto text-zinc-700" />
            <p className="text-xs text-zinc-500">Zoom in to see buildings and run impact analysis</p>
          </div>
        )}

        {/* Methodology note */}
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Flood spreads from Nairobi&apos;s 6 main rivers outward — Nairobi River, Mathare,
          Ngong, Kirichwa, Gitathuru &amp; Karura. Buildings closest to each channel flood
          first. Spread rate: 250 m per 1 m of water depth. Assumes flat terrain (no DEM).
          For formal risk assessment use Kenya Meteorological Department flood hazard maps.
        </p>
      </div>
    </aside>
  )
}
