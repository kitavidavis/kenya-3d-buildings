/**
 * export.ts — CSV and PDF report generation for selected buildings
 */

import type { BuildingProperties } from './types'
import { estimateValue, formatKES } from './valuation'
import { polygonAreaM2 } from './geometry'

// ── CSV export ────────────────────────────────────────────────────────────────

const CSV_COLS = [
  'cadastralID', 'osmID', 'name', 'city', 'usage', 'floors', 'heightM',
  'footprintAreaM2', 'grossFloorAreaM2', 'farRatio',
  'estimatedValueKES', 'annualRentalKES', 'valuePerM2KES',
  'roofType', 'yearBuilt', 'completenessScore',
]

function makeCadastralID(b: BuildingProperties): string {
  const county    = ((b as any).city ?? 'XX').slice(0, 3).toUpperCase().replace(/\W/g, 'X')
  const usageCode = { Residential: 'R', Commercial: 'C', Industrial: 'I', Civic: 'V', Unknown: 'U' }[b.usage ?? 'Unknown'] ?? 'U'
  const seq = String(b.osmID ?? b.buildingID ?? '00000').slice(-6).padStart(6, '0')
  return `KE-${county}-${usageCode}${seq}`
}

function escapeCsv(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export function exportCSV(features: BuildingProperties[], polygon: [number, number][]): void {
  const rows: string[] = [CSV_COLS.join(',')]

  for (const f of features) {
    const v = estimateValue({
      gfa:               f.grossFloorAreaM2  ?? (f.footprintAreaM2 ?? 50) * (f.floors ?? 1),
      footprint:         f.footprintAreaM2   ?? 50,
      floors:            f.floors            ?? 1,
      usage:             f.usage             ?? 'Unknown',
      city:              (f as any).city     ?? 'Unknown',
      yearBuilt:         f.yearBuilt,
      completenessScore: f.completenessScore ?? undefined,
    })

    const row = [
      makeCadastralID(f),
      f.osmID ?? f.buildingID,
      f.name ?? '',
      (f as any).city ?? '',
      f.usage,
      f.floors,
      f.heightM,
      f.footprintAreaM2,
      f.grossFloorAreaM2,
      v.farRatio,
      v.estimatedValueKES,
      v.annualRentalKES,
      v.valuePerM2KES,
      f.roofType ?? '',
      f.yearBuilt ?? '',
      f.completenessScore ?? '',
    ].map(escapeCsv).join(',')

    rows.push(row)
  }

  const csv  = rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `cadastre-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF-like HTML report ──────────────────────────────────────────────────────
// Uses window.print() with an injected print stylesheet for PDF output.

export function exportPDFReport(
  features: BuildingProperties[],
  polygon:  [number, number][],
): void {
  const selAreaM2 = polygonAreaM2(polygon)
  const selAreaHa = (selAreaM2 / 10_000).toFixed(2)

  // Aggregate stats
  let totalGFA    = 0
  let totalValue  = 0
  let totalRent   = 0
  const usageCounts: Record<string, number> = {}

  for (const f of features) {
    const gfa = f.grossFloorAreaM2 ?? (f.footprintAreaM2 ?? 50) * (f.floors ?? 1)
    const v   = estimateValue({
      gfa, footprint: f.footprintAreaM2 ?? 50, floors: f.floors ?? 1,
      usage: f.usage ?? 'Unknown', city: (f as any).city ?? 'Unknown',
      yearBuilt: f.yearBuilt, completenessScore: f.completenessScore ?? undefined,
    })
    totalGFA   += gfa
    totalValue += v.estimatedValueKES
    totalRent  += v.annualRentalKES
    usageCounts[f.usage ?? 'Unknown'] = (usageCounts[f.usage ?? 'Unknown'] ?? 0) + 1
  }

  const avgFloors = features.length
    ? features.reduce((s, f) => s + (f.floors ?? 1), 0) / features.length
    : 0

  const usageRows = Object.entries(usageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([usage, count]) =>
      `<tr><td>${usage}</td><td>${count}</td><td>${((count / features.length) * 100).toFixed(1)}%</td></tr>`
    ).join('')

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Kenya 3D Cadastre Report — ${new Date().toLocaleDateString()}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; padding: 40px; }
  h1 { font-size: 22px; font-weight: 800; color: #1e3a5f; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: 700; color: #1e3a5f; margin: 24px 0 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 24px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 4px; }
  .kpi-value { font-size: 20px; font-weight: 800; color: #0f172a; }
  .kpi-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .value-card { background: #f0f4ff; border: 1px solid #c7d7fe; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
  .value-main { font-size: 28px; font-weight: 900; color: #3730a3; }
  .value-sub { color: #6366f1; font-size: 12px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #e2e8f0; }
  td { padding: 7px 10px; border: 1px solid #e2e8f0; color: #1e293b; }
  tr:nth-child(even) td { background: #f8fafc; }
  .disclaimer { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-top: 24px; font-size: 10px; color: #92400e; }
  @media print {
    body { padding: 20px; }
    button { display: none; }
  }
</style>
</head>
<body>

<h1>Kenya 3D Cadastre</h1>
<p class="meta">
  Area Analysis Report &nbsp;·&nbsp; Generated ${new Date().toLocaleString()}
  &nbsp;·&nbsp; Selection ${selAreaHa} ha
</p>

<div class="kpi-grid">
  <div class="kpi">
    <div class="kpi-label">Buildings</div>
    <div class="kpi-value">${features.length.toLocaleString()}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Total GFA</div>
    <div class="kpi-value">${(totalGFA / 1000).toFixed(1)}k</div>
    <div class="kpi-sub">m²</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Avg Floors</div>
    <div class="kpi-value">${avgFloors.toFixed(1)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Selection</div>
    <div class="kpi-value">${selAreaHa}</div>
    <div class="kpi-sub">hectares</div>
  </div>
</div>

<div class="value-card">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6366f1;margin-bottom:6px;font-weight:700;">Estimated Portfolio Value</div>
  <div class="value-main">${formatKES(totalValue)}</div>
  <div class="value-sub">Annual rental income: ${formatKES(totalRent)}</div>
</div>

<h2>Usage Breakdown</h2>
<table>
  <thead><tr><th>Usage</th><th>Buildings</th><th>Share</th></tr></thead>
  <tbody>${usageRows}</tbody>
</table>

<h2>Building Register (first 50)</h2>
<table>
  <thead>
    <tr>
      <th>Cadastral ID</th><th>Name / OSM ID</th><th>City</th><th>Usage</th>
      <th>Floors</th><th>GFA (m²)</th><th>Est. Value</th>
    </tr>
  </thead>
  <tbody>
    ${features.slice(0, 50).map(f => {
      const gfa = f.grossFloorAreaM2 ?? (f.footprintAreaM2 ?? 50) * (f.floors ?? 1)
      const v   = estimateValue({
        gfa, footprint: f.footprintAreaM2 ?? 50, floors: f.floors ?? 1,
        usage: f.usage ?? 'Unknown', city: (f as any).city ?? 'Unknown',
        yearBuilt: f.yearBuilt, completenessScore: f.completenessScore ?? undefined,
      })
      return `<tr>
        <td>${makeCadastralID(f)}</td>
        <td>${f.name ?? (f.osmID ? 'Way #' + f.osmID : f.buildingID)}</td>
        <td>${(f as any).city ?? '—'}</td>
        <td>${f.usage}</td>
        <td>${f.floors ?? '—'}</td>
        <td>${Math.round(gfa).toLocaleString()}</td>
        <td>${formatKES(v.estimatedValueKES)}</td>
      </tr>`
    }).join('')}
  </tbody>
</table>

${features.length > 50 ? `<p style="margin-top:8px;font-size:11px;color:#64748b;">… and ${features.length - 50} more buildings. Export CSV for full register.</p>` : ''}

<div class="disclaimer">
  <strong>Disclaimer:</strong> Valuations are estimates only and do not constitute a formal or legal property valuation.
  Methodology: KVRB replacement cost approach with Knight Frank Kenya yield data and county location multipliers.
  Always engage a registered valuer (Valuers Registration Board of Kenya) for formal assessments.
</div>

</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) { alert('Allow pop-ups to generate PDF report'); return }
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 800)
}
