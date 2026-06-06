import Link from 'next/link'
import { ArrowRight, Building2, Map, Download, Layers } from 'lucide-react'

const FEATURES = [
  { icon: Building2, title: '3D Building Data', desc: 'AI-detected footprints from Microsoft + OSM attributes. 800K+ buildings across Kenya.' },
  { icon: Map,       title: 'Geographic Accuracy', desc: 'Buildings rendered at real WGS84 coordinates on an OpenStreetMap basemap.' },
  { icon: Layers,    title: '16 Levels of Detail', desc: 'From footprint-only (LOD 0) to full facade with windows and doors (LOD 3).' },
  { icon: Download,  title: 'Multiple Export Formats', desc: 'GeoJSON for web maps, GLB for Unity/Unreal/Blender, CityGML for GIS platforms.' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="fixed top-0 inset-x-0 z-10 flex items-center justify-between px-6 py-4 bg-zinc-950/80 backdrop-blur-sm border-b border-white/5">
        <span className="font-bold text-base tracking-tight">🏙️ <span className="text-sky-400">Kenya</span> 3D Cadastre</span>
        <div className="flex items-center gap-4">
          <Link href="/explore" className="text-sm text-zinc-400 hover:text-white transition-colors">Explore</Link>
          <Link href="/explore" className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-medium transition-colors">Open Map</Link>
        </div>
      </nav>

      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.08)_0%,_transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full text-sky-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse" />
            Powered by Microsoft AI · OpenStreetMap · TU Delft LOD framework
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
            {"Kenya's first "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">3D Cadastre</span>
            {" platform"}
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-xl mx-auto">
            Query any area in Kenya and get 3D building footprints with height, usage, and cadastral attributes — ready for urban planning, property assessment, and game development.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/explore" className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-semibold text-base transition-colors shadow-lg shadow-sky-900/40">
              Explore Nairobi CBD <ArrowRight size={18} />
            </Link>
            <a href="https://github.com/kitavidavis/3d-buildings-generator" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 border border-white/10 hover:border-white/20 rounded-xl text-zinc-400 hover:text-white font-medium text-base transition-colors">
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3">Built for Kenya</h2>
          <p className="text-zinc-400 text-center mb-12">EPSG:21037 · Arc 1960 / UTM Zone 37S · 8 major cities supported</p>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="p-6 bg-zinc-900 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                <div className="w-10 h-10 flex items-center justify-center bg-sky-500/10 text-sky-400 rounded-lg mb-4"><f.icon className="w-5 h-5" /></div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 text-center border-t border-white/5">
        <h2 className="text-2xl font-bold mb-4">Start exploring Kenya in 3D</h2>
        <p className="text-zinc-400 mb-8">No account required. Select a city, set your radius, click Search.</p>
        <Link href="/explore" className="inline-flex items-center gap-2 px-8 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl font-semibold transition-colors">
          Open the map <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="py-8 px-6 border-t border-white/5 text-center text-xs text-zinc-600">
        Kenya 3D Cadastre · Built with Microsoft GlobalMLBuildingFootprints · OpenStreetMap contributors
      </footer>
    </main>
  )
}
