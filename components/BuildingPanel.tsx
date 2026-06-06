'use client'

import { X, ExternalLink, Building2, Layers, Ruler, Calendar, Tag } from 'lucide-react'
import type { BuildingProperties } from '@/lib/types'

interface Props {
  building: BuildingProperties | null
  onClose: () => void
}

const USAGE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Residential: { bg: 'bg-blue-900/60',   text: 'text-blue-300',   dot: 'bg-blue-400' },
  Commercial:  { bg: 'bg-amber-900/60',  text: 'text-amber-300',  dot: 'bg-amber-400' },
  Industrial:  { bg: 'bg-purple-900/60', text: 'text-purple-300', dot: 'bg-purple-400' },
  Civic:       { bg: 'bg-emerald-900/60',text: 'text-emerald-300',dot: 'bg-emerald-400' },
  Unknown:     { bg: 'bg-zinc-800',      text: 'text-zinc-400',   dot: 'bg-zinc-500' },
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <span className="mt-0.5 text-zinc-500">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-0.5">{label}</p>
        <p className="text-sm text-zinc-100 font-medium">{value}</p>
      </div>
    </div>
  )
}

export default function BuildingPanel({ building, onClose }: Props) {
  if (!building) return null

  const usage = building.usage ?? 'Unknown'
  const style = USAGE_STYLES[usage] ?? USAGE_STYLES.Unknown

  return (
    <div className="absolute top-16 right-4 w-72 bg-zinc-900/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-white leading-snug">
            {building.name ?? (building.osmID ? `Building #${building.osmID}` : 'Building')}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Usage badge */}
        <div className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
          {usage}
        </div>
      </div>

      {/* Details */}
      <div className="px-4 py-1">
        <Row
          icon={<Layers size={14} />}
          label="Floors"
          value={`${building.floors ?? '—'} ${building.heightM ? `(${building.heightM} m)` : ''}`}
        />
        <Row
          icon={<Ruler size={14} />}
          label="Footprint"
          value={
            building.footprintAreaM2 != null
              ? `${building.footprintAreaM2.toLocaleString()} m²`
              : '—'
          }
        />
        <Row
          icon={<Building2 size={14} />}
          label="Gross floor area"
          value={
            building.grossFloorAreaM2 != null
              ? `${building.grossFloorAreaM2.toLocaleString()} m²`
              : '—'
          }
        />
        <Row
          icon={<Tag size={14} />}
          label="Roof type"
          value={building.roofType ?? '—'}
        />
        <Row
          icon={<Calendar size={14} />}
          label="Year built"
          value={building.yearBuilt && building.yearBuilt !== 'Unknown' ? building.yearBuilt : '—'}
        />
      </div>

      {/* OSM link */}
      {building.osmID && (
        <div className="px-4 pb-4">
          <a
            href={`https://www.openstreetmap.org/way/${building.osmID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            <ExternalLink size={11} />
            View on OpenStreetMap
          </a>
        </div>
      )}
    </div>
  )
}
