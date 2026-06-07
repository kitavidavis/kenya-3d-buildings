'use client'

import { useState } from 'react'
import { Mail, Phone, X, Database, Building2, ChevronRight } from 'lucide-react'

export default function CTAButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20
                   flex items-center gap-2 px-4 py-2.5 rounded-full
                   border border-white/[0.12] shadow-2xl shadow-black/60
                   text-xs font-semibold text-white
                   hover:border-white/20 hover:scale-105 active:scale-100
                   transition-all duration-200 group"
        style={{ background: 'rgba(10,11,16,0.92)', backdropFilter: 'blur(20px)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        Request data &amp; 3D cadastre solutions
        <ChevronRight size={12} className="text-zinc-500 group-hover:text-white transition-colors" />
      </button>

      {/* Modal */}
      {open && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/[0.08]
                        shadow-2xl shadow-black/80 overflow-hidden"
            style={{ background: 'rgba(12,13,18,0.98)' }}
          >
            {/* Top accent */}
            <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-blue-400 to-violet-500" />

            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-600
                         hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>

            <div className="px-6 pt-6 pb-7 space-y-5">

              {/* Heading */}
              <div className="space-y-1 pr-6">
                <p className="text-[10px] uppercase tracking-widest text-sky-400 font-semibold">
                  Kenya 3D Cadastre
                </p>
                <h2 className="text-lg font-bold text-white leading-snug">
                  Get the data. Build with the algorithms.
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Interested in building footprints, height models, valuation data,
                  or custom 3D cadastre solutions for your project? Reach out directly.
                </p>
              </div>

              {/* Offerings */}
              <div className="space-y-2">
                {[
                  {
                    icon:  <Database size={13} />,
                    title: 'Raw Data Access',
                    desc:  'Building footprints, heights, usage classifications — Kenya-wide PMTiles or GeoJSON.',
                  },
                  {
                    icon:  <Building2 size={13} />,
                    title: '3D Cadastre Solutions',
                    desc:  'Custom Urban DNA analysis, solar scoring, flood risk or valuation engines for your county or project.',
                  },
                ].map(({ icon, title, desc }) => (
                  <div key={title}
                    className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-sky-400 shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-white">{title}</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                  Contact David Kitavi
                </p>
                <a
                  href="mailto:daviskitavi98@gmail.com"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl
                             bg-sky-500/10 border border-sky-500/20 text-sky-300
                             hover:bg-sky-500/20 hover:border-sky-500/40
                             transition-all duration-150 group"
                >
                  <Mail size={14} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-sky-500 font-medium">Email</p>
                    <p className="text-xs font-semibold truncate">daviskitavi98@gmail.com</p>
                  </div>
                  <ChevronRight size={12} className="text-sky-600 group-hover:text-sky-400 transition-colors shrink-0" />
                </a>

                <a
                  href="tel:+254741582811"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl
                             bg-white/[0.03] border border-white/[0.06] text-zinc-300
                             hover:bg-white/[0.06] hover:border-white/[0.10]
                             transition-all duration-150 group"
                >
                  <Phone size={14} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-500 font-medium">Phone / WhatsApp</p>
                    <p className="text-xs font-semibold">0741 582 811</p>
                  </div>
                  <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                </a>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}
