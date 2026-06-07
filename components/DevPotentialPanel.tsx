'use client'

import { useMemo, useState } from 'react'
import { X, TrendingUp, Building2, Zap, Info } from 'lucide-react'
import type { BuildingProperties } from '@/lib/types'
import { aggregatePotential, computePotential, potentialColour } from '@/lib/devPotential'
import { formatKES } from '@/lib/valuation'

interface Props {
  features:   BuildingProperties[]   // visible buildings (from queryRenderedFeatures)
  onClose:    () => void
  onSelectBuilding?: (id: string) => void
}

const VIABILITY_COLOURS: Record<string, string> = {
  Prime:    'text-orange-400 bg-orange-500/10 border-orange-500/25',
  Strong:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
  Moderate: 'text-green-400  bg-green-500/10  border-green-500/25',
  Low:      'text-zinc-400   bg-zinc-800/60   border-zinc-700/40',
  Marginal: 'text-zinc-600   bg-zinc-900/60   border-zinc-800/40',
}

const VIABILITY_BAR: Record<string, string> = {
  Prime:    'bg-orange-500',
  Strong:   'bg-yellow-500',
  Moderate: 'bg-green-500',
  Low:      'bg-zinc-600',
  Marginal: 'bg-zinc-700',
}

type Tab = 'area' | 'buildings'

export default function DevPotentialPanel({ features, onClose, onSelectBuilding }: Props) {
  const [tab, setTab] = useState<Tab>('area')
  const [showInfo, setShowInfo] = useState(false)

  const agg = useMemo(() => aggregatePotential(features), [features])

  // Top 10 buildings by unrealised value for the buildings tab
  const topBuildings = useMemo(() => {
    return features
      .map(f => ({ f, p: computePotential(f) }))
      .sort((a, b) => b.p.unrealisedValueKES - a.p.unrealisedValueKES)
      .slice(0, 10)
  }, [features])

  const viabDistribution = useMemo(() => {
    const d: Record<string, number> = {}
    for (const f of features) {
      const p = computePotential(f)
      d[p.viabilityLabel] = (d[p.viabilityLabel] ?? 0) + 1
    }
    return d
  }, [features])

  return (
    <aside
      className="anim-slide-right absolute top-14 right-3 bottom-3 w-76 flex flex-col
                 rounded-2xl overflow-hidden border border-white/[0.07] shadow-2xl shadow-black/60 z-20"
      style={{ background: 'rgba(10,11,16,0.96)', backdropFilter: 'blur(20px)', width: '19rem' }}
    >
      {/* Accent */}
      <div className="h-[3px] w-full bg-gradient-to-r from-orange-500 via-yellow-400 to-transparent" />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-2">
        <TrendingUp size={15} className="text-orange-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white">Development Potential</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">FAR headroom analysis</p>
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
        <div className="mx-4 mb-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15
                        text-[11px] text-zinc-400 leading-relaxed space-y-1">
          <p>
            Each building&apos;s <strong className="text-zinc-300">permitted GFA</strong> =
            footprint &times; FAR limit (by county &amp; usage, per Kenya Physical &amp;
            Land Use Planning Act 2019).
          </p>
          <p>
            <strong className="text-zinc-300">Headroom</strong> = permitted − actual GFA.
            Unrealised value = headroom &times; construction cost &times; location multiplier.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-4 mb-3 flex rounded-lg bg-white/[0.04] p-0.5 gap-0.5">
        {(['area', 'buildings'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all capitalize
              ${tab === t ? 'bg-white/[0.1] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t === 'area' ? 'Area Summary' : 'Top Buildings'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">

        {tab === 'area' && (
          <>
            {/* Headline numbers */}
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-orange-400 font-semibold">
                Unrealised Development Value
              </p>
              <p className="text-2xl font-black text-white">
                {formatKES(agg.totalUnrealisedValueKES)}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <p className="text-[10px] text-zinc-500">Headroom GFA</p>
                  <p className="text-sm font-bold text-zinc-200">{(agg.totalHeadroomGFA / 1000).toFixed(1)}k m²</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">Buildings analysed</p>
                  <p className="text-sm font-bold text-zinc-200">{agg.buildingCount}</p>
                </div>
              </div>
            </div>

            {/* Viability count pills */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Prime',    icon: '🔥', count: agg.primeCount },
                { label: 'Strong',   icon: '⭐', count: agg.strongCount },
              ].map(({ label, icon, count }) => (
                <div key={label} className={`flex flex-col items-center gap-1 p-3 rounded-xl border ${VIABILITY_COLOURS[label]}`}>
                  <span className="text-xl">{icon}</span>
                  <p className="text-xl font-black text-white">{count}</p>
                  <p className="text-[10px]">{label} sites</p>
                </div>
              ))}
            </div>

            {/* Viability distribution */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                Viability distribution
              </p>
              {['Prime', 'Strong', 'Moderate', 'Low', 'Marginal'].map(v => {
                const count = viabDistribution[v] ?? 0
                const pct   = agg.buildingCount ? (count / agg.buildingCount) * 100 : 0
                return (
                  <div key={v} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 w-16 shrink-0">{v}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.05]">
                      <div className={`h-full rounded-full ${VIABILITY_BAR[v]}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 w-6 text-right tabular-nums">{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Colour legend */}
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Map colours</p>
              <div className="h-3 rounded-full" style={{
                background: 'linear-gradient(to right, #3f3f46, #16a34a, #facc15, #ea580c)',
              }} />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-zinc-600">Marginal</span>
                <span className="text-[9px] text-zinc-600">Prime</span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-600 leading-relaxed">
              FAR limits: Nairobi CBD 4.0, Mombasa 3.0, county HQs 2.5, residential zones 1.0–1.5.
              Source: Physical &amp; Land Use Planning Act (Kenya, 2019).
            </p>
          </>
        )}

        {tab === 'buildings' && (
          <>
            <p className="text-[11px] text-zinc-500">Top 10 by unrealised value</p>

            {topBuildings.map(({ f, p }, i) => {
              const id   = String(f.osmID ?? f.buildingID ?? i)
              const name = f.name ?? (f.osmID ? `Way #${f.osmID}` : `Building ${i + 1}`)
              return (
                <button
                  key={id}
                  onClick={() => onSelectBuilding?.(id)}
                  className="w-full text-left rounded-xl bg-white/[0.03] border border-white/[0.05]
                             hover:border-orange-500/30 hover:bg-orange-500/5 p-3 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{name}</p>
                      <p className="text-[10px] text-zinc-500">{f.usage} &middot; {f.floors ?? 1} floors</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border
                                      ${VIABILITY_COLOURS[p.viabilityLabel]}`}>
                      {p.viabilityLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] text-zinc-600">Unrealised value</p>
                      <p className="text-xs font-bold text-orange-300">{formatKES(p.unrealisedValueKES)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-600">Headroom</p>
                      <p className="text-xs font-bold text-zinc-300">{p.headroomPct}% of FAR</p>
                    </div>
                  </div>

                  {/* FAR bar */}
                  <div>
                    <div className="flex justify-between text-[9px] text-zinc-600 mb-0.5">
                      <span>Current FAR {p.currentFAR}</span>
                      <span>Permitted {p.permittedFAR}</span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-white/[0.06]">
                      <div className="absolute top-0 h-full rounded-full bg-white/[0.15]"
                        style={{ width: '100%' }} />
                      <div className="absolute top-0 h-full rounded-full bg-orange-500"
                        style={{ width: `${Math.min(100, (p.currentFAR / p.permittedFAR) * 100)}%` }} />
                    </div>
                  </div>

                  <p className="text-[9px] text-zinc-500 italic">{p.rationale}</p>
                </button>
              )
            })}

            {topBuildings.length === 0 && (
              <p className="text-sm text-zinc-600 text-center py-8">No buildings in view</p>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
