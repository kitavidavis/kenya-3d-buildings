'use client'

import { MousePointer2, PenLine, TrendingUp, Sun, Dna, BarChart3, Waves } from 'lucide-react'

export type ActiveTool = 'explore' | 'draw' | 'dna' | 'solar' | 'potential' | 'growth' | 'flood'

interface ToolDef {
  id:     ActiveTool
  icon:   React.ReactNode
  label:  string
  short:  string
  colour: string
}

const TOOLS: ToolDef[] = [
  {
    id:     'explore',
    icon:   <MousePointer2 size={17} />,
    label:  'Explore',
    short:  'Explore',
    colour: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  },
  {
    id:     'draw',
    icon:   <PenLine size={17} />,
    label:  'Draw & Analyse',
    short:  'Draw',
    colour: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  },
  {
    id:     'dna',
    icon:   <Dna size={17} />,
    label:  'Urban DNA',
    short:  'DNA',
    colour: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30',
  },
  {
    id:     'solar',
    icon:   <Sun size={17} />,
    label:  'Solar Score',
    short:  'Solar',
    colour: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    id:     'potential',
    icon:   <TrendingUp size={17} />,
    label:  'Dev. Potential',
    short:  'FAR',
    colour: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  },
  {
    id:     'growth',
    icon:   <BarChart3 size={17} />,
    label:  'Growth',
    short:  'Growth',
    colour: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    id:     'flood',
    icon:   <Waves size={17} />,
    label:  'Flood Simulation',
    short:  'Flood',
    colour: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
]

interface Props {
  active:   ActiveTool
  onChange: (tool: ActiveTool) => void
}

export default function ToolNav({ active, onChange }: Props) {
  return (
    <nav
      className="absolute left-3 top-1/2 -translate-y-1/2 z-10
                 flex flex-col gap-1 rounded-2xl p-1.5 border border-white/[0.07] shadow-xl shadow-black/40"
      style={{ background: 'rgba(10,11,16,0.92)', backdropFilter: 'blur(16px)' }}
    >
      {/* Divider after Draw */}
      {TOOLS.map((tool, idx) => (
        <div key={tool.id}>
          {idx === 2 && (
            <div className="my-1 border-t border-white/[0.06]" />
          )}
          <button
            onClick={() => onChange(tool.id)}
            title={tool.label}
            className={`group relative flex flex-col items-center gap-0.5 w-11 py-2.5 rounded-xl
                        border transition-all duration-150
                        ${active === tool.id
                          ? tool.colour
                          : 'text-zinc-600 bg-transparent border-transparent hover:text-zinc-300 hover:bg-white/[0.05] hover:border-white/[0.07]'
                        }`}
          >
            {tool.icon}
            <span className="text-[8.5px] font-semibold leading-none">{tool.short}</span>

            {/* Tooltip */}
            <span className="absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                             text-white bg-zinc-800 border border-white/[0.08] whitespace-nowrap
                             opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                             shadow-xl z-50">
              {tool.label}
            </span>
          </button>
        </div>
      ))}
    </nav>
  )
}
