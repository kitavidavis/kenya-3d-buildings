'use client'

import { useMemo } from 'react'
import { X, Dna, MapPin, TrendingUp } from 'lucide-react'
import type { BuildingProperties } from '@/lib/types'
import {
  DNA_LABELS, computeDNA, findSimilar, dnaLabel,
  type DNAVector, type SimilarityMatch,
} from '@/lib/urbanDNA'
import { polygonAreaM2 } from '@/lib/geometry'

interface Props {
  features: BuildingProperties[]
  polygon:  [number, number][]
  onClose:  () => void
  onFlyTo?: (lat: number, lon: number) => void
}

// ── Radar Chart (pure SVG, no library) ───────────────────────────────────────

function RadarChart({ values, labels, reference }: {
  values:    number[]   // 0–1, length = labels.length
  labels:    readonly string[]
  reference?: number[]  // optional comparison ring
}) {
  const N      = labels.length
  const cx     = 110
  const cy     = 110
  const maxR   = 85
  const rings  = [0.25, 0.5, 0.75, 1.0]

  // Angle for each axis: start at top (−π/2), rotate clockwise
  const angle = (i: number) => (2 * Math.PI * i) / N - Math.PI / 2

  const toXY = (val: number, i: number) => ({
    x: cx + maxR * val * Math.cos(angle(i)),
    y: cy + maxR * val * Math.sin(angle(i)),
  })

  // Data polygon
  const dataPoints = values.map((v, i) => toXY(Math.max(0, Math.min(1, v)), i))
  const dataPath   = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  // Optional reference polygon
  const refPath = reference
    ? reference.map((v, i) => toXY(Math.max(0, Math.min(1, v)), i))
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
    : null

  // Axis label positions (push outward)
  const labelPos = (i: number) => {
    const a = angle(i)
    const r = maxR + 18
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }

  // Dominant dimension
  const maxIdx = values.indexOf(Math.max(...values))

  return (
    <svg viewBox="0 0 220 220" className="w-full" aria-label="Urban DNA radar chart">
      {/* Background rings */}
      {rings.map(r => (
        <polygon key={r}
          points={Array.from({ length: N }, (_, i) => {
            const p = toXY(r, i)
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
          }).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"
        />
      ))}

      {/* Ring labels */}
      {rings.map(r => (
        <text key={`rl${r}`} x={cx + 3} y={cy - maxR * r - 2}
          fontSize="7" fill="rgba(255,255,255,0.2)" textAnchor="middle">
          {Math.round(r * 100)}
        </text>
      ))}

      {/* Axes */}
      {Array.from({ length: N }, (_, i) => {
        const tip = toXY(1, i)
        return (
          <line key={i} x1={cx} y1={cy} x2={tip.x.toFixed(1)} y2={tip.y.toFixed(1)}
            stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        )
      })}

      {/* Reference ring (top match) */}
      {refPath && (
        <path d={refPath} fill="rgba(99,102,241,0.08)"
          stroke="rgba(99,102,241,0.30)" strokeWidth="1.5" strokeDasharray="4 3" />
      )}

      {/* Data polygon */}
      <path d={dataPath} fill="rgba(139,92,246,0.25)"
        stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />

      {/* Vertex dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={i === maxIdx ? 4 : 2.5}
          fill={i === maxIdx ? '#a78bfa' : '#8b5cf6'}
          stroke={i === maxIdx ? '#fff' : 'none'}
          strokeWidth={i === maxIdx ? 1.5 : 0}
        />
      ))}

      {/* Axis labels */}
      {labels.map((label, i) => {
        const pos   = labelPos(i)
        const short = label.split(' ').map(w => w.slice(0, 4)).join(' ')
        const bold  = i === maxIdx
        return (
          <text key={i} x={pos.x.toFixed(1)} y={pos.y.toFixed(1)}
            fontSize={bold ? '8.5' : '8'} fontWeight={bold ? '700' : '400'}
            fill={bold ? '#a78bfa' : 'rgba(255,255,255,0.45)'}
            textAnchor="middle" dominantBaseline="middle">
            {short}
          </text>
        )
      })}
    </svg>
  )
}

// ── Similarity badge ──────────────────────────────────────────────────────────

function MatchCard({ match, rank, onFlyTo }: {
  match:   SimilarityMatch
  rank:    number
  onFlyTo?: (lat: number, lon: number) => void
}) {
  const tier = rank === 0 ? 'Best match' : rank === 1 ? '2nd match' : '3rd match'
  const barColour = rank === 0 ? 'bg-violet-500' : rank === 1 ? 'bg-violet-400' : 'bg-violet-300'

  return (
    <div className={`rounded-xl p-3 border transition-all
      ${rank === 0
        ? 'bg-violet-500/10 border-violet-500/25'
        : 'bg-white/[0.03] border-white/[0.05]'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-white">{match.neighbourhood.name}</p>
            {rank === 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full
                               bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Best match
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5">{match.neighbourhood.character}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-black text-violet-300">{match.pct}%</p>
          <p className="text-[9px] text-zinc-600">{match.neighbourhood.county}</p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${barColour}`}
          style={{ width: `${match.pct}%`, transition: 'width 0.6s ease' }} />
      </div>

      {onFlyTo && (
        <button
          onClick={() => onFlyTo(match.neighbourhood.lat, match.neighbourhood.lon)}
          className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500 hover:text-violet-300 transition-colors"
        >
          <MapPin size={9} />
          Fly to {match.neighbourhood.name}
        </button>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function DNAPanel({ features, polygon, onClose, onFlyTo }: Props) {
  const areaM2 = useMemo(() => polygonAreaM2(polygon), [polygon])

  const dna = useMemo(
    () => computeDNA(features, areaM2),
    [features, areaM2],
  )

  const matches = useMemo(
    () => dna ? findSimilar(dna) : [],
    [dna],
  )

  const label = dna ? dnaLabel(dna) : null

  if (!dna) {
    return (
      <aside
        className="anim-slide-right absolute top-14 right-3 bottom-3 w-72 flex flex-col
                   rounded-2xl overflow-hidden border border-white/[0.07] shadow-2xl z-20"
        style={{ background: 'rgba(10,11,16,0.96)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <p className="text-sm text-zinc-500">
            Draw a polygon with at least 3 buildings to compute Urban DNA.
          </p>
        </div>
      </aside>
    )
  }

  const topMatch = matches[0]

  return (
    <aside
      className="anim-slide-right absolute top-14 right-3 bottom-3 w-76 flex flex-col
                 rounded-2xl overflow-hidden border border-white/[0.07] shadow-2xl shadow-black/60 z-20"
      style={{ background: 'rgba(10,11,16,0.96)', backdropFilter: 'blur(20px)', width: '19rem' }}
    >
      {/* Accent */}
      <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-transparent" />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-2">
        <Dna size={15} className="text-violet-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white">Urban DNA</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {features.length} buildings &nbsp;·&nbsp; {(areaM2 / 10_000).toFixed(2)} ha
          </p>
        </div>
        <button onClick={onClose}
          className="shrink-0 p-1 rounded-md text-zinc-600 hover:text-white hover:bg-white/10 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Character label */}
      <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
        <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold mb-0.5">Character</p>
        <p className="text-base font-black text-white">{label}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">

        {/* Radar chart */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-2">
          <RadarChart
            values={dna.normalised}
            labels={DNA_LABELS}
            reference={topMatch?.neighbourhood.vector}
          />
          {topMatch && (
            <p className="text-[9px] text-center text-zinc-600 mt-1">
              <span className="inline-block w-4 border-t border-dashed border-violet-500/40 align-middle mr-1" />
              {topMatch.neighbourhood.name} reference
            </p>
          )}
        </div>

        {/* Dimension breakdown */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Dimension Scores</p>
          {DNA_LABELS.map((label, i) => {
            const val = dna.normalised[i]
            const ref = topMatch?.neighbourhood.vector[i] ?? 0
            const delta = val - ref
            return (
              <div key={label} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">{label}</span>
                  <div className="flex items-center gap-1.5">
                    {delta !== 0 && (
                      <span className={`text-[9px] font-medium ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {delta > 0 ? '+' : ''}{Math.round(delta * 100)}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-zinc-300 tabular-nums w-6 text-right">
                      {Math.round(val * 100)}
                    </span>
                  </div>
                </div>
                <div className="relative h-1.5 rounded-full bg-white/[0.05]">
                  {/* Reference */}
                  <div className="absolute top-0 h-full rounded-full bg-violet-500/20"
                    style={{ width: `${ref * 100}%` }} />
                  {/* Value */}
                  <div className="absolute top-0 h-full rounded-full bg-violet-500"
                    style={{ width: `${val * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Similarity matches */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={11} className="text-zinc-500" />
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
              Closest matches across Kenya
            </p>
          </div>
          {matches.map((m, i) => (
            <MatchCard key={m.neighbourhood.name} match={m} rank={i} onFlyTo={onFlyTo} />
          ))}
        </div>
      </div>
    </aside>
  )
}
