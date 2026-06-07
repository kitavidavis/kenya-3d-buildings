'use client'

import { useState } from 'react'
import { X, Sun, Sunrise, Sunset, Clock, Info } from 'lucide-react'
import { solarLabel } from '@/lib/solar'

interface Props {
  solarHour:      number           // 0–23
  solarDate:      Date
  onHourChange:   (h: number) => void
  onDateChange:   (d: Date)   => void
  buildingCount:  number
  scores:         Map<string, number>   // id → score
  onClose:        () => void
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Solar score histogram buckets
function histogram(scores: Map<string, number>): number[] {
  const buckets = new Array(5).fill(0)   // [0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0]
  for (const s of scores.values()) {
    const i = Math.min(4, Math.floor(s * 5))
    buckets[i]++
  }
  return buckets
}

function formatHour(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  const period = hh < 12 ? 'AM' : 'PM'
  const display = hh % 12 === 0 ? 12 : hh % 12
  return `${display}:${mm.toString().padStart(2,'0')} ${period}`
}

export default function SolarPanel({
  solarHour, solarDate, onHourChange, onDateChange,
  buildingCount, scores, onClose,
}: Props) {
  const [showInfo, setShowInfo] = useState(false)

  const hist   = histogram(scores)
  const maxBin = Math.max(...hist, 1)

  const avgScore = scores.size
    ? [...scores.values()].reduce((s, v) => s + v, 0) / scores.size
    : 0

  const fullSunCount    = [...scores.values()].filter(v => v >= 0.75).length
  const deepShadowCount = [...scores.values()].filter(v => v < 0.25).length

  const bucketLabels = ['Deep shadow', 'Mostly shaded', 'Partial', 'Mostly sunny', 'Full sun']
  const bucketColours = ['#1e3a5f', '#475569', '#b45309', '#f59e0b', '#fde68a']

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const d = new Date(solarDate)
    d.setMonth(parseInt(e.target.value))
    onDateChange(d)
  }

  return (
    <aside
      className="anim-slide-right absolute top-14 right-3 bottom-3 w-72 flex flex-col
                 rounded-2xl overflow-hidden border border-white/[0.07] shadow-2xl shadow-black/60 z-20"
      style={{ background: 'rgba(10,11,16,0.96)', backdropFilter: 'blur(20px)' }}
    >
      {/* Accent */}
      <div className="h-[3px] w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-transparent" />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-2">
        <Sun size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white">Solar Shadow Score</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {buildingCount} buildings in view
          </p>
        </div>
        <button onClick={() => setShowInfo(i => !i)}
          className="p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/10 transition-colors">
          <Info size={13} />
        </button>
        <button onClick={onClose}
          className="p-1 rounded-md text-zinc-600 hover:text-white hover:bg-white/10 transition-colors">
          <X size={14} />
        </button>
      </div>

      {showInfo && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-zinc-400 leading-relaxed">
          For each visible building, the algorithm samples sun position every hour
          between sunrise and sunset. A building is marked shaded if any taller
          neighbour within range casts a shadow across it at that hour.
          Score = unshaded hours / total daylight hours.
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">

        {/* Time control */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Time of Day</p>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-300">
              <Clock size={11} />{formatHour(solarHour)}
            </span>
          </div>

          <input
            type="range" min={5} max={19} step={0.5}
            value={solarHour}
            onChange={e => onHourChange(parseFloat(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />

          <div className="flex justify-between text-[9px] text-zinc-600">
            <span className="flex items-center gap-0.5"><Sunrise size={9} />6 AM</span>
            <span>12 PM</span>
            <span className="flex items-center gap-0.5">6 PM<Sunset size={9} /></span>
          </div>
        </div>

        {/* Month selector */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Month</p>
          <select
            value={solarDate.getMonth()}
            onChange={handleMonthChange}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2
                       text-xs text-white appearance-none cursor-pointer focus:outline-none
                       focus:border-amber-500/50"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i} className="bg-zinc-900">{m}</option>
            ))}
          </select>
          <p className="text-[10px] text-zinc-600 mt-1.5">
            Nairobi is near equator — minimal seasonal variation
          </p>
        </div>

        {/* Summary stats */}
        {scores.size > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Avg score', value: `${Math.round(avgScore * 100)}%`, colour: 'text-amber-300' },
                { label: 'Full sun',  value: fullSunCount,   colour: 'text-yellow-300' },
                { label: 'Shaded',    value: deepShadowCount, colour: 'text-blue-400'  },
              ].map(({ label, value, colour }) => (
                <div key={label} className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl
                                            bg-white/[0.03] border border-white/[0.05]">
                  <p className={`text-lg font-black ${colour}`}>{value}</p>
                  <p className="text-[9px] text-zinc-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Histogram */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                Distribution
              </p>
              {bucketLabels.map((bl, i) => (
                <div key={bl} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: bucketColours[i] }} />
                  <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width:           `${(hist[i] / maxBin) * 100}%`,
                        backgroundColor: bucketColours[i],
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 tabular-nums w-5 text-right">
                    {hist[i]}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {scores.size === 0 && (
          <div className="py-6 text-center space-y-2">
            <Sun size={28} className="mx-auto text-zinc-700" />
            <p className="text-xs text-zinc-500">Zoom in to see buildings and compute solar scores</p>
          </div>
        )}

        {/* Legend */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Colour scale</p>
          <div className="h-3 rounded-full w-full"
            style={{ background: 'linear-gradient(to right, #1e3a5f, #475569, #b45309, #f59e0b, #fde68a)' }} />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-zinc-600">Deep shadow</span>
            <span className="text-[9px] text-zinc-600">Full sun</span>
          </div>
        </div>

        {/* Applications */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">Applications</p>
          {[
            'Solar panel ROI assessment',
            'Apartment value premium (south-facing)',
            'Urban heat island mitigation',
            'Greenhouse / rooftop farming suitability',
          ].map((a, i) => (
            <p key={i} className="text-[10px] text-zinc-500 flex items-start gap-1.5">
              <span className="mt-0.5 w-1 h-1 rounded-full bg-amber-400/50 shrink-0" />
              {a}
            </p>
          ))}
        </div>
      </div>
    </aside>
  )
}
