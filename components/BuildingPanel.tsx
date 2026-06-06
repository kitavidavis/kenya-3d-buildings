'use client'

import { X, ExternalLink, Building2, Layers, Ruler, Calendar, Tag, MapPin } from 'lucide-react'
import type { BuildingProperties } from '@/lib/types'

interface Props {
  building: BuildingProperties | null
  onClose: () => void
}

const USAGE_CONFIG: Record<string, { label: string; colour: string; bg: string; dot: string }> = {
  Residential: { label: 'Residential', colour: 'text-sky-300',     bg: 'bg-sky-500/10 border-sky-500/20',     dot: 'bg-sky-400'     },
  Commercial:  { label: 'Commercial',  colour: 'text-amber-300',   bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400'   },
  Industrial:  { label: 'Industrial',  colour: 'text-purple-300',  bg: 'bg-purple-500/10 border-purple-500/20',dot: 'bg-purple-400' },
  Civic:       { label: 'Civic',       colour: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/20',dot:'bg-emerald-400'},
  Unknown:     { label: 'Unknown',     colour: 'text-zinc-400',    bg: 'bg-zinc-800/60 border-zinc-700/40',   dot: 'bg-zinc-500'    },
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{label}</p>
      <p className="text-sm font-semibold text-white leading-tight">{value}</p>
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

export default function BuildingPanel({ building, onClose }: Props) {
  if (!building) return null

  const cfg    = USAGE_CONFIG[building.usage ?? 'Unknown'] ?? USAGE_CONFIG.Unknown
  const hasGFA = building.grossFloorAreaM2 != null
  const hasFP  = building.footprintAreaM2  != null

  return (
    <aside className="anim-slide-right absolute top-14 right-3 bottom-3 w-72 flex flex-col
                      rounded-2xl overflow-hidden border border-white/[0.07] shadow-2xl shadow-black/60 z-20"
           style={{ background: 'rgba(10, 11, 16, 0.95)', backdropFilter: 'blur(16px)' }}>

      {/* ── Top accent strip ── */}
      <div className={`h-[3px] w-full ${cfg.dot.replace('bg-', 'bg-gradient-to-r from-')} to-transparent`} />

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white leading-snug break-words">
              {building.name
                ?? (building.osmID ? `OSM #${building.osmID}` : 'Building')}
            </h2>
          </div>
          <button onClick={onClose}
            className="shrink-0 p-1 rounded-md text-zinc-600 hover:text-white hover:bg-white/10 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Usage pill */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.colour}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* ── Key stats strip ── */}
      <div className="mx-3 mb-3 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] grid grid-cols-3 gap-3">
        <Stat label="Floors" value={building.floors ?? '—'} />
        <Stat label="Height" value={building.heightM != null ? `${building.heightM} m` : '—'} />
        <Stat label="GFA"
          value={hasGFA ? `${(building.grossFloorAreaM2! / 1000).toFixed(1)} k` : '—'}
          sub={hasGFA ? 'm²' : undefined} />
      </div>

      {/* ── Detail rows ── */}
      <div className="flex-1 overflow-y-auto px-4 scrollbar-thin scrollbar-thumb-white/10">
        <Row icon={<Ruler size={13} />}    label="Footprint"
          value={hasFP ? `${building.footprintAreaM2!.toLocaleString()} m²` : '—'} />
        <Row icon={<Tag size={13} />}      label="Roof type"  value={building.roofType ?? '—'} />
        <Row icon={<Calendar size={13} />} label="Year built"
          value={
            building.yearBuilt && building.yearBuilt !== 'Unknown'
              ? building.yearBuilt
              : <span className="text-zinc-600">Not recorded in OSM</span>
          } />
        {building.osmID && (
          <Row icon={<MapPin size={13} />} label="OSM ID" value={`Way #${building.osmID}`} />
        )}
      </div>

      {/* ── Footer ── */}
      {building.osmID && (
        <div className="px-4 py-3 border-t border-white/[0.05]">
          <a href={`https://www.openstreetmap.org/way/${building.osmID}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                       bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07]
                       text-xs text-sky-400 hover:text-sky-300 font-medium transition-all">
            <ExternalLink size={11} />
            View on OpenStreetMap
          </a>
        </div>
      )}
    </aside>
  )
}
