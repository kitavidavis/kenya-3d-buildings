'use client'

import { ZoomIn } from 'lucide-react'

interface Props { zoom: number }

export default function ZoomHint({ zoom }: Props) {
  const visible = zoom < 13

  return (
    <div className={`pointer-events-none absolute bottom-16 inset-x-0 flex justify-center
                     transition-all duration-500 z-10
                     ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium
                      border border-sky-500/30 text-sky-300 shadow-lg shadow-black/40
                      select-none"
           style={{ background: 'rgba(8,10,18,0.88)', backdropFilter: 'blur(12px)' }}>
        <ZoomIn size={13} className="shrink-0" />
        Zoom in to explore buildings &mdash; data covers all 47 counties
      </div>
    </div>
  )
}
