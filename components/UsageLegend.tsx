'use client'

interface Props { visible: boolean }

const LEGEND = [
  { label: 'Residential', colour: '#93c5fd' },
  { label: 'Commercial',  colour: '#fcd34d' },
  { label: 'Industrial',  colour: '#c4b5fd' },
  { label: 'Civic',       colour: '#6ee7b7' },
  { label: 'Unknown',     colour: '#d6d3cf' },
]

export default function UsageLegend({ visible }: Props) {
  return (
    <div className={`absolute bottom-10 right-3 z-10 transition-all duration-300
                     ${visible ? 'opacity-100 translate-y-0 pointer-events-auto'
                               : 'opacity-0 translate-y-2 pointer-events-none'}`}>
      <div className="rounded-xl border border-white/[0.08] shadow-xl shadow-black/50 overflow-hidden"
           style={{ background: 'rgba(10,11,16,0.92)', backdropFilter: 'blur(16px)' }}>

        <p className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-widest font-semibold text-zinc-500">
          Usage
        </p>

        <ul className="px-3 pb-2.5 space-y-1.5">
          {LEGEND.map(({ label, colour }) => (
            <li key={label} className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: colour }} />
              <span className="text-xs text-zinc-300 font-medium">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
