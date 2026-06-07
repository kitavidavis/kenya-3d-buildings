'use client'

import { useMemo, useState } from 'react'
import { X, BarChart3, Download, FileText, Layers } from 'lucide-react'
import type { BuildingProperties } from '@/lib/types'
import { aggregateValuation, formatKES } from '@/lib/valuation'
import { polygonAreaM2 } from '@/lib/geometry'

interface Props {
  features:    BuildingProperties[]
  polygon:     [number, number][]   // closed ring [[lng,lat],...]
  onClose:     () => void
  onExport:    (features: BuildingProperties[], polygon: [number,number][]) => void
}

const USAGE_COLOURS: Record<string, string> = {
  Residential: '#93c5fd',
  Commercial:  '#fcd34d',
  Industrial:  '#c4b5fd',
  Civic:       '#6ee7b7',
  Unknown:     '#71717a',
}

function KPI({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-white leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500">{sub}</p>}
    </div>
  )
}

export default function DrawAnalysePanel({ features, polygon, onClose, onExport }: Props) {
  const [tab, setTab] = useState<'summary' | 'breakdown'>('summary')

  const valuation = useMemo(() => {
    return aggregateValuation(features.map(f => ({
      gfa:               f.grossFloorAreaM2  ?? (f.footprintAreaM2  ?? 50) * (f.floors ?? 1),
      footprint:         f.footprintAreaM2   ?? 50,
      floors:            f.floors            ?? 1,
      usage:             f.usage             ?? 'Unknown',
      city:              (f as any).city     ?? 'Unknown',
      yearBuilt:         f.yearBuilt,
      completenessScore: f.completenessScore ?? undefined,
    })))
  }, [features])

  const selectionAreaM2 = useMemo(() => polygonAreaM2(polygon), [polygon])

  const avgFloors = features.length
    ? features.reduce((s, f) => s + (f.floors ?? 1), 0) / features.length
    : 0

  const coverage = selectionAreaM2 > 0
    ? Math.min(100, (valuation.totalFootprint / selectionAreaM2) * 100)
    : 0

  const usageEntries = Object.entries(valuation.usageBreakdown)
    .sort((a, b) => b[1].count - a[1].count)

  return (
    <aside
      className="anim-slide-right absolute top-14 right-3 bottom-3 w-80 flex flex-col
                 rounded-2xl overflow-hidden border border-white/[0.07] shadow-2xl shadow-black/60 z-20"
      style={{ background: 'rgba(10,11,16,0.96)', backdropFilter: 'blur(20px)' }}
    >
      {/* Accent strip */}
      <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 to-transparent" />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <BarChart3 size={15} className="text-violet-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white">Area Analysis</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {selectionAreaM2 > 10_000
              ? `${(selectionAreaM2 / 10_000).toFixed(2)} ha selection`
              : `${Math.round(selectionAreaM2).toLocaleString()} m² selection`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-md text-zinc-600 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="mx-4 mb-3 flex rounded-lg bg-white/[0.04] p-0.5 gap-0.5">
        {(['summary', 'breakdown'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all capitalize
              ${tab === t
                ? 'bg-white/[0.1] text-white shadow'
                : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-white/10 space-y-3 pb-4">

        {tab === 'summary' && (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-2">
              <KPI label="Buildings"  value={features.length.toLocaleString()} />
              <KPI label="Avg Floors" value={avgFloors.toFixed(1)} />
              <KPI label="Total GFA"  value={`${(valuation.totalGFA / 1000).toFixed(1)}k`} sub="m²" />
              <KPI label="Coverage"   value={`${coverage.toFixed(1)}%`} sub="built-up" />
            </div>

            {/* Valuation */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">
                Estimated Market Value
              </p>
              <p className="text-2xl font-black text-white">
                {formatKES(valuation.totalEstimatedValueKES)}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <p className="text-[10px] text-zinc-500">Annual rent</p>
                  <p className="text-sm font-bold text-zinc-200">{formatKES(valuation.totalAnnualRentalKES)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">Per m² GFA</p>
                  <p className="text-sm font-bold text-zinc-200">{formatKES(valuation.avgValuePerM2)}</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 pt-1 border-t border-white/[0.05]">
                Estimate only — not a formal valuation. KVRB methodology.
              </p>
            </div>
          </>
        )}

        {tab === 'breakdown' && (
          <>
            <p className="text-[11px] text-zinc-500 pb-1">Usage distribution by count and GFA</p>

            {usageEntries.map(([usage, data]) => {
              const pctCount = features.length ? (data.count / features.length) * 100 : 0
              const pctGFA   = valuation.totalGFA ? (data.gfa / valuation.totalGFA) * 100 : 0
              const colour   = USAGE_COLOURS[usage] ?? '#71717a'

              return (
                <div key={usage} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: colour }} />
                    <span className="text-xs font-semibold text-zinc-200">{usage}</span>
                    <span className="ml-auto text-xs text-zinc-500 tabular-nums">{data.count} bldgs</span>
                  </div>

                  <div className="space-y-1">
                    <div>
                      <div className="flex justify-between text-[10px] text-zinc-600 mb-0.5">
                        <span>Count</span><span>{pctCount.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.05]">
                        <div className="h-full rounded-full" style={{ width: `${pctCount}%`, backgroundColor: colour }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-zinc-600 mb-0.5">
                        <span>GFA</span><span>{pctGFA.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.05]">
                        <div className="h-full rounded-full opacity-60" style={{ width: `${pctGFA}%`, backgroundColor: colour }} />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-500">
                    GFA {(data.gfa / 1000).toFixed(1)}k m² &nbsp;·&nbsp; {formatKES(data.value)}
                  </p>
                </div>
              )
            })}

            {usageEntries.length === 0 && (
              <p className="text-sm text-zinc-600 text-center py-8">No buildings in selection</p>
            )}
          </>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-white/[0.05] flex gap-2">
        <button
          onClick={() => onExport(features, polygon)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                     bg-violet-600 hover:bg-violet-500 text-xs text-white font-semibold transition-all"
        >
          <Download size={12} />
          Export CSV
        </button>
        <button
          onClick={() => onExport(features, polygon)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                     bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08]
                     text-xs text-zinc-300 font-semibold transition-all"
        >
          <FileText size={12} />
          PDF Report
        </button>
      </div>
    </aside>
  )
}
