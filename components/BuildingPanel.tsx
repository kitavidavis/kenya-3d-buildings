'use client'

import { useState } from 'react'
import {
  X, ExternalLink, Ruler, Calendar, Tag, MapPin, Star,
  Copy, Check, Building2, Hash, LayoutGrid,
} from 'lucide-react'
import type { BuildingProperties } from '@/lib/types'
import { estimateValue, formatKES } from '@/lib/valuation'

interface Props {
  building:  BuildingProperties | null
  onClose:   () => void
}

const USAGE_CONFIG: Record<string, { label: string; colour: string; bg: string; dot: string }> = {
  Residential: { label: 'Residential', colour: 'text-sky-300',     bg: 'bg-sky-500/10 border-sky-500/20',       dot: 'bg-sky-400'     },
  Commercial:  { label: 'Commercial',  colour: 'text-amber-300',   bg: 'bg-amber-500/10 border-amber-500/20',   dot: 'bg-amber-400'   },
  Industrial:  { label: 'Industrial',  colour: 'text-purple-300',  bg: 'bg-purple-500/10 border-purple-500/20', dot: 'bg-purple-400'  },
  Civic:       { label: 'Civic',       colour: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/20',dot:'bg-emerald-400' },
  Unknown:     { label: 'Unknown',     colour: 'text-zinc-500',    bg: 'bg-zinc-800/60 border-zinc-700/40',     dot: 'bg-zinc-600'    },
}

/** Generate a human-readable cadastral ID from the building data */
function makeCadastralID(b: BuildingProperties): string {
  const county  = ((b as any).city ?? 'XX').slice(0, 3).toUpperCase().replace(/\W/g, 'X')
  const usageCode = { Residential: 'R', Commercial: 'C', Industrial: 'I', Civic: 'V', Unknown: 'U' }[b.usage ?? 'Unknown'] ?? 'U'
  const seq = String(b.osmID ?? b.buildingID ?? '00000').slice(-6).padStart(6, '0')
  return `KE-${county}-${usageCode}${seq}`
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{label}</p>
      <p className="text-sm font-bold text-white leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-zinc-500">{sub}</p>}
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
      <span className="mt-0.5 shrink-0 text-zinc-600">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">{label}</p>
        <div className="text-sm text-zinc-200 font-medium">{value}</div>
      </div>
    </div>
  )
}

function CompletenessBar({ score }: { score: number }) {
  const pct = Math.round((score / 5) * 100)
  const colour = score >= 4 ? 'bg-emerald-500' : score >= 3 ? 'bg-sky-500' : score >= 2 ? 'bg-amber-500' : 'bg-zinc-600'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-zinc-500 tabular-nums w-6 text-right">{score}/5</span>
    </div>
  )
}

type Tab = 'record' | 'valuation'

export default function BuildingPanel({ building, onClose }: Props) {
  const [copied, setCopied]   = useState(false)
  const [tab,    setTab]      = useState<Tab>('record')

  if (!building) return null

  const cfg          = USAGE_CONFIG[building.usage ?? 'Unknown'] ?? USAGE_CONFIG.Unknown
  const hasGFA       = building.grossFloorAreaM2 != null
  const hasFP        = building.footprintAreaM2  != null
  const score        = building.completenessScore as number | undefined
  const cadastralID  = makeCadastralID(building)

  const valuation = estimateValue({
    gfa:               building.grossFloorAreaM2  ?? (building.footprintAreaM2 ?? 50) * (building.floors ?? 1),
    footprint:         building.footprintAreaM2   ?? 50,
    floors:            building.floors            ?? 1,
    usage:             building.usage             ?? 'Unknown',
    city:              (building as any).city     ?? 'Unknown',
    yearBuilt:         building.yearBuilt,
    completenessScore: building.completenessScore ?? undefined,
  })

  const handleCopyID = () => {
    navigator.clipboard.writeText(String(building.osmID ?? building.buildingID ?? ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const confidenceColour = {
    high:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low:    'text-zinc-500 bg-zinc-800/60 border-zinc-700/40',
  }[valuation.confidence]

  return (
    <aside
      className="anim-slide-right absolute top-14 right-3 bottom-3 w-72 flex flex-col
                 rounded-2xl overflow-hidden border border-white/[0.07] shadow-2xl shadow-black/60 z-20"
      style={{ background: 'rgba(10,11,16,0.96)', backdropFilter: 'blur(20px)' }}
    >
      {/* Colour accent strip */}
      <div className={`h-[3px] w-full ${cfg.dot.replace('bg-', 'bg-gradient-to-r from-')} to-transparent`} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white leading-snug break-words">
              {building.name ?? (building.osmID ? `OSM Way #${building.osmID}` : 'Building')}
            </h2>
            {(building as any).city && (
              <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                <MapPin size={10} className="shrink-0" />
                {(building as any).city}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded-md text-zinc-600 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.colour}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          {building.sizeClass && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium
                             bg-white/[0.04] border border-white/[0.08] text-zinc-400">
              {building.sizeClass}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-4 mb-3 flex rounded-lg bg-white/[0.04] p-0.5 gap-0.5">
        <button
          onClick={() => setTab('record')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all
            ${tab === 'record' ? 'bg-white/[0.1] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Record
        </button>
        <button
          onClick={() => setTab('valuation')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all
            ${tab === 'valuation' ? 'bg-white/[0.1] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Valuation
        </button>
      </div>

      {/* Key stats strip */}
      <div className="mx-3 mb-3 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]
                      grid grid-cols-3 gap-3">
        <Stat label="Floors" value={building.floors ?? '—'} />
        <Stat label="Height" value={building.heightM != null ? `${building.heightM} m` : '—'} />
        <Stat
          label="GFA"
          value={hasGFA ? `${(building.grossFloorAreaM2! / 1000).toFixed(1)}k` : '—'}
          sub={hasGFA ? 'm²' : undefined}
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-white/10">

        {tab === 'record' && (
          <>
            {/* Cadastral ID */}
            <Row
              icon={<Hash size={13} />}
              label="Cadastral ID"
              value={
                <span className="flex items-center gap-2 font-mono text-xs tracking-wider text-zinc-200">
                  {cadastralID}
                </span>
              }
            />

            {hasFP && (
              <Row icon={<Ruler size={13} />} label="Footprint"
                value={`${building.footprintAreaM2!.toLocaleString()} m²`} />
            )}

            {/* FAR */}
            <Row
              icon={<LayoutGrid size={13} className="text-zinc-600" />}
              label="Floor Area Ratio (FAR)"
              value={valuation.farRatio.toFixed(2)}
            />

            {/* Built-up ratio */}
            <Row
              icon={<Building2 size={13} className="text-zinc-600" />}
              label="Plot Coverage (est.)"
              value={`${valuation.builtUpPct}%`}
            />

            <Row icon={<Tag size={13} />} label="Roof type" value={building.roofType ?? '—'} />
            <Row
              icon={<Calendar size={13} />}
              label="Year built"
              value={
                building.yearBuilt && building.yearBuilt !== 'Unknown'
                  ? building.yearBuilt
                  : <span className="text-zinc-600 font-normal">Not recorded</span>
              }
            />

            {score != null && (
              <div className="py-2.5 border-b border-white/[0.05]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Star size={12} className="text-zinc-600 shrink-0" />
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">Data completeness</p>
                </div>
                <CompletenessBar score={score} />
              </div>
            )}

            {building.osmID && (
              <Row
                icon={<MapPin size={13} />}
                label="OSM reference"
                value={
                  <span className="flex items-center gap-2">
                    Way #{building.osmID}
                    <button
                      onClick={handleCopyID}
                      title="Copy OSM ID"
                      className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </span>
                }
              />
            )}
          </>
        )}

        {tab === 'valuation' && (
          <div className="space-y-3 py-1">
            {/* Main value card */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">
                  Est. Market Value
                </p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confidenceColour}`}>
                  {valuation.confidence} confidence
                </span>
              </div>
              <p className="text-2xl font-black text-white">
                {formatKES(valuation.estimatedValueKES)}
              </p>
              <p className="text-[10px] text-zinc-500">{formatKES(valuation.valuePerM2KES)} per m² GFA</p>
            </div>

            {/* Rental */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Rental Estimate</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-zinc-600">Annual</p>
                  <p className="text-sm font-bold text-zinc-200">{formatKES(valuation.annualRentalKES)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600">Monthly</p>
                  <p className="text-sm font-bold text-zinc-200">{formatKES(valuation.monthlyRentalKES)}</p>
                </div>
              </div>
            </div>

            {/* Replacement cost */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Replacement Cost</p>
              <p className="text-sm font-bold text-zinc-200">{formatKES(valuation.replacementCostKES)}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">Insurance basis (rebuild only)</p>
            </div>

            <p className="text-[10px] text-zinc-600 leading-relaxed pt-1">
              Estimates use KVRB replacement cost methodology, Knight Frank Kenya yield data,
              and county location multipliers. Not a formal valuation.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {building.osmID && (
        <div className="px-4 py-3 border-t border-white/[0.05]">
          <a
            href={`https://www.openstreetmap.org/way/${building.osmID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                       bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07]
                       text-xs text-sky-400 hover:text-sky-300 font-medium transition-all"
          >
            <ExternalLink size={11} />
            View on OpenStreetMap
          </a>
        </div>
      )}
    </aside>
  )
}
