/**
 * GreenPath Village Manager — Daily Report PDF Service
 *
 * Implements:
 * - Pure client-side HTML-to-PDF report generation matching the web application
 * - Uses native expo-print and expo-file-system without external heavy engines
 * - Saves persistent PDF directly to FileSystem.documentDirectory
 * - Avoids page breaks across KPI blocks, tables, and session cards
 */
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { LOGO_BASE64 } from '../constants/logo-base64';
import { saveFileToPublicDeviceStorage } from './public-file-storage.service';

export interface PDFReportData {
  villageName: string;
  villageId: string;
  date: string;
  managerName: string;
  kpis: {
    totalHouseholds: number;
    collectedToday: number;
    collectedYesterday: number;
    nonCollectedToday: number;
    avgSegregationRating: number;
  };
  pulses: Array<{ day: string; collections: number; rating: number }>;
  wardPerformance: Array<{ name: string; total: number; collected: number; nonCollected: number }>;
  materialData: {
    wet: number;
    dry: number;
    sanitary: number;
    specialCare: number;
    mixed: number;
    isLogged: boolean;
  };
  vehicleStats: Array<{
    registrationNumber: string;
    vehicleName: string;
    collectorNames: string;
    count: number;
    startTime: string | null;
    endTime: string | null;
    sessions: any[];
    totalWorkMs: number;
    totalBreakMs: number;
  }>;
  collectionTimeline: {
    vehicles: Array<{ name: string; color: string }>;
    hourly: Array<Record<string, any>>;
  };
  attendance?: {
    collectors: Array<{ workerName: string; attendance: string | null }>;
    helpers: Array<{ workerName: string; attendance: string | null }>;
    segregators: Array<{ workerName: string; attendance: string | null }>;
  };
  labels?: {
    household: string;
    householdPlural: string;
    ward: string;
    wardPlural: string;
    org: string;
    houseNumber: string;
  };
}

// ── Palette matching web application ─────────────────────────────────
const C = {
  brand: '#059669',
  brandLight: '#d1fae5',
  brandDark: '#064e3b',
  s900: '#0f172a',
  s700: '#1e293b',
  s500: '#334155',
  s400: '#475569',
  s200: '#e2e8f0',
  s100: '#f1f5f9',
  s50: '#f8fafc',
  white: '#ffffff',
  green: '#15803d',
  blue: '#2563eb',
  amber: '#d97706',
  red: '#dc2626',
  pink: '#db2777',
  gray: '#4b5563',
  totBg: '#fef3c7',
  totTx: '#78350f',
};

// ── Helpers ──────────────────────────────────────────────────────────
const fmtMs = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
};

const fmtTime = (iso: string | null) => {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
};

const fmtDate = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const genId = (vid: string, date: string) =>
  `GP-${vid.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase()}-${date.replace(/-/g, '')}`;

const logoImg = (h: number) =>
  LOGO_BASE64
    ? `<img src="${LOGO_BASE64}" style="height:${h}px;width:auto;display:block;" />`
    : `<div style="display:flex;align-items:center;gap:6px;"><div style="width:${h}px;height:${h}px;background:${C.brand};border-radius:${h * 0.25}px;display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-weight:900;font-size:${h * 0.5}px;">G</span></div><span style="font-weight:900;font-size:${h * 0.45}px;color:${C.brand};letter-spacing:0.06em;">GREENPATH</span></div>`;

const sec = (t: string) => `
  <div style="display:flex;align-items:center;gap:10px;margin:22px 0 10px;">
    <span style="background:${C.brandLight};color:${C.brandDark};padding:5px 12px;border-radius:6px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.14em;display:inline-block;">${t}</span>
    <div style="flex:1;height:1.5px;background:${C.brandLight};"></div>
  </div>`;

const th = (t: string, a = 'left') =>
  `<th style="padding:8px 12px;font-size:12px;font-weight:800;color:#fff;text-align:${a};text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;">${t}</th>`;

const td = (t: string, o: { a?: string; b?: boolean; c?: string; m?: boolean } = {}) =>
  `<td style="padding:7px 12px;font-size:13px;text-align:${o.a || 'left'};font-weight:${o.b ? '800' : '600'};color:${o.c || C.s700};${o.m ? "font-family:'Courier New',monospace;" : ''}">${t}</td>`;

const statusColor = (v: number, good: number, mid: number) =>
  v >= good ? C.green : v >= mid ? C.amber : C.red;

const noData = (title: string, message: string) => `
  <div style="background:${C.s50};border:1.5px dashed ${C.s200};border-radius:10px;padding:16px 14px;text-align:center;margin-top:6px;">
    <div style="font-size:13px;font-weight:800;color:${C.s700};margin-bottom:3px;">${title}</div>
    <div style="font-size:12px;font-weight:600;color:${C.s500};">${message}</div>
  </div>`;

// ── HTML Report Builder ───────────────────────────────────────────────
export function buildFullReportHtml(d: PDFReportData): string {
  const L = d.labels || {
    household: 'Household',
    householdPlural: 'Households',
    ward: 'Ward',
    wardPlural: 'Wards',
    org: 'Village',
    houseNumber: 'House Number',
  };
  const coverage =
    d.kpis.totalHouseholds > 0
      ? (d.kpis.collectedToday / d.kpis.totalHouseholds) * 100
      : 0;
  const diverted = d.materialData.wet + d.materialData.dry;
  const totalWaste =
    diverted +
    d.materialData.mixed +
    d.materialData.sanitary +
    d.materialData.specialCare;
  const divPct = totalWaste > 0 ? (diverted / totalWaste) * 100 : 0;
  const divColor = statusColor(divPct, 70, 40);
  const divLabel =
    divPct >= 70 ? 'Excellent' : divPct >= 40 ? 'Needs Improvement' : 'Critical';

  // KPI card builder
  const kpi = (label: string, value: string, sub: string, color: string) => `
    <div style="background:${C.s50};border:1.5px solid ${C.s200};border-radius:10px;padding:12px 14px;border-left:4px solid ${color};display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:800;color:${C.s900};margin-bottom:2px;">${label}</div>
        <div style="font-size:12px;color:${C.s500};font-weight:700;">${sub}</div>
      </div>
      <div style="text-align:right;min-width:70px;">
        <div style="font-size:28px;font-weight:900;color:${color};line-height:1;">${value}</div>
      </div>
    </div>`;

  // 7-day pulse
  const maxC = Math.max(...d.pulses.map((p) => p.collections), 1);
  const pulseHead = d.pulses
    .map(
      (p) =>
        `<th style="padding:6px 4px;font-size:12px;font-weight:800;color:${C.s700};text-align:center;text-transform:uppercase;letter-spacing:0.04em;border-bottom:2px solid ${C.s200};">${p.day}</th>`
    )
    .join('');
  const pulseBars = d.pulses
    .map((p) => {
      const h = Math.max((p.collections / maxC) * 44, 4);
      return `<td style="padding:6px 4px;text-align:center;vertical-align:bottom;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
          <span style="font-size:14px;font-weight:900;color:${C.s900};">${p.collections}</span>
          <div style="width:30px;height:${h}px;background:linear-gradient(180deg,${C.brand},${C.brandDark});border-radius:4px;"></div>
          <span style="font-size:11px;font-weight:800;color:${C.amber};">${p.rating}/5</span>
        </div>
      </td>`;
    })
    .join('');

  // Material table rows
  const matItems = [
    { label: 'Wet Waste', kg: d.materialData.wet, color: C.green },
    { label: 'Dry Waste', kg: d.materialData.dry, color: C.blue },
    { label: 'Mixed / Landfill', kg: d.materialData.mixed, color: C.gray },
    { label: 'Sanitary Waste', kg: d.materialData.sanitary, color: C.pink },
    { label: 'Special Care', kg: d.materialData.specialCare, color: C.amber },
  ];
  const matRows = matItems
    .map((m, i) => {
      const pct = totalWaste > 0 ? (m.kg / totalWaste) * 100 : 0;
      return `<tr style="background:${i % 2 === 0 ? C.white : C.s50};">
        ${td(
          `<span style="display:inline-flex;align-items:center;gap:7px;"><span style="width:9px;height:9px;border-radius:2px;background:${m.color};display:inline-block;"></span>${m.label}</span>`,
          { b: true }
        )}
        <td style="padding:7px 12px;font-size:13px;text-align:right;font-weight:900;color:${C.s900};font-family:'Courier New',monospace;">${m.kg.toFixed(1)} kg</td>
        ${td(`${pct.toFixed(1)}%`, { a: 'right', c: C.s700 })}
      </tr>`;
    })
    .join('');

  // Ward rows
  const wardRows = d.wardPerformance
    .map((w, i) => {
      const cov = w.total > 0 ? (w.collected / w.total) * 100 : 0;
      const cc = statusColor(cov, 90, 70);
      return `<tr style="background:${i % 2 === 0 ? C.white : C.s50};">
        ${td(w.name, { b: true })}
        ${td(`${w.total}`, { a: 'center' })}
        ${td(`${w.collected}`, { a: 'center', b: true, c: C.green })}
        ${td(`${w.nonCollected}`, { a: 'center', c: w.nonCollected > 0 ? C.red : C.s400 })}
        ${td(`${cov.toFixed(1)}%`, { a: 'right', b: true, c: cc })}
      </tr>`;
    })
    .join('');
  const totalCov =
    d.kpis.totalHouseholds > 0
      ? ((d.kpis.collectedToday / d.kpis.totalHouseholds) * 100).toFixed(1)
      : '0';

  // Vehicle cards
  const activeV = d.vehicleStats.filter((v) => v.count > 0);
  const vCards = activeV
    .map(
      (v) => `
    <div class="avoid-break" style="background:${C.s50};border:1.5px solid ${C.s200};border-radius:10px;padding:11px 13px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${C.s200};">
        <div>
          <span style="font-size:14px;font-weight:900;color:${C.s900};">${v.vehicleName}</span>
          <span style="font-size:11px;color:${C.s700};font-weight:700;margin-left:8px;font-family:'Courier New',monospace;background:${C.s100};padding:2px 6px;border-radius:4px;">${v.registrationNumber}</span>
        </div>
        <div style="background:${C.brand};color:#fff;padding:3px 10px;border-radius:6px;font-size:14px;font-weight:900;">${v.count}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;"><div style="font-size:10px;font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Collectors</div><div style="font-size:13px;font-weight:700;color:${C.s900};">${v.collectorNames || '--'}</div></div>
        <div style="flex:0 0 auto;text-align:center;min-width:65px;"><div style="font-size:10px;font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Start</div><div style="font-size:13px;font-weight:700;color:${C.s900};">${fmtTime(v.startTime)}</div></div>
        <div style="flex:0 0 auto;text-align:center;min-width:65px;"><div style="font-size:10px;font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">End</div><div style="font-size:13px;font-weight:700;color:${C.s900};">${fmtTime(v.endTime)}</div></div>
        <div style="flex:0 0 auto;text-align:center;min-width:75px;"><div style="font-size:10px;font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Work Time</div><div style="font-size:13px;font-weight:800;color:${C.green};">${fmtMs(v.totalWorkMs)}</div></div>
        <div style="flex:0 0 auto;text-align:center;min-width:75px;"><div style="font-size:10px;font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Break Time</div><div style="font-size:13px;font-weight:800;color:${C.amber};">${fmtMs(v.totalBreakMs)}</div></div>
      </div>
    </div>`
    )
    .join('');

  // Hourly table (transposed: vehicles = rows, hours = columns)
  const vehicles = d.collectionTimeline?.vehicles || [];
  const hourly = d.collectionTimeline?.hourly || [];
  const hours = hourly.map((h) => h.hour as string);
  const hourHeaders = hours
    .map(
      (hr) =>
        `<th style="padding:5px 4px;font-size:10px;font-weight:800;color:#fff;text-align:center;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap;">${hr}</th>`
    )
    .join('');
  const vehicleHourRows = vehicles
    .map((v, vi) => {
      const cells = hourly
        .map((h) => {
          const val = h[v.name] || 0;
          return `<td style="padding:5px 3px;font-size:11px;text-align:center;font-weight:${val > 0 ? '800' : '500'};color:${val > 0 ? C.s900 : C.s500};">${val || '-'}</td>`;
        })
        .join('');
      const rowTotal = hourly.reduce((s, h) => s + (h[v.name] || 0), 0);
      return `<tr style="background:${vi % 2 === 0 ? C.white : C.s50};">
        <td style="padding:5px 8px;font-size:11px;font-weight:800;color:${C.s900};white-space:nowrap;">${v.name}</td>
        ${cells}
        <td style="padding:5px 6px;font-size:11px;text-align:center;font-weight:900;color:${C.brand};">${rowTotal}</td>
      </tr>`;
    })
    .join('');
  const totalHourlyCells = hourly
    .map((h) => {
      const t = vehicles.reduce((s, v) => s + (h[v.name] || 0), 0);
      return `<td style="padding:5px 3px;font-size:11px;text-align:center;font-weight:900;color:${C.totTx};">${t || '-'}</td>`;
    })
    .join('');
  const grandTotal = hourly.reduce(
    (s, h) => s + vehicles.reduce((s2, v) => s2 + (h[v.name] || 0), 0),
    0
  );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>GreenPath Daily Report - ${d.villageName} - ${d.date}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: ${C.s900};
            width: 100%;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div style="padding: 10px; background: #fff; width: 100%;">
          <!-- COVER HEADER: Logo left | Heading center | Village+Date right -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0 14px;margin-bottom:12px;border-bottom:2.5px solid ${C.brand};">
            <div style="flex:0 0 auto;">${logoImg(40)}</div>
            <div style="flex:1;text-align:center;">
              <div style="font-size:13px;font-weight:800;color:${C.s900};text-transform:uppercase;letter-spacing:0.2em;">Daily Operations Report</div>
            </div>
            <div style="flex:0 0 auto;text-align:right;">
              <div style="font-size:15px;font-weight:900;color:${C.s900};margin-bottom:2px;">${d.villageName}</div>
              <div style="font-size:12px;color:${C.s700};font-weight:700;">${fmtDate(d.date)}</div>
            </div>
          </div>

          <!-- META -->
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:14px;padding:6px 0;font-size:12px;">
            <span style="font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;">Generated By:</span>
            <span style="font-weight:800;color:${C.s900};">${d.managerName}</span>
            <span style="color:${C.s200};margin:0 6px;">|</span>
            <span style="font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;">Report ID:</span>
            <span style="font-weight:800;color:${C.s900};font-family:'Courier New',monospace;">${genId(d.villageId, d.date)}</span>
          </div>

          <!-- KPI GRID (2 cols x 3 rows) -->
          <div class="avoid-break">
            ${sec('Executive Summary')}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              ${kpi(
                'Collection Coverage',
                `${Math.round(coverage)}%`,
                `${d.kpis.collectedToday} of ${d.kpis.totalHouseholds} ${L.householdPlural.toLowerCase()}`,
                statusColor(coverage, 90, 70)
              )}
              ${kpi(
                'Segregation Rating',
                `${d.kpis.avgSegregationRating}/5`,
                'Average rating',
                statusColor(d.kpis.avgSegregationRating, 4, 3)
              )}
              ${kpi(
                'Collected Today',
                `${d.kpis.collectedToday}`,
                `Yesterday: ${d.kpis.collectedYesterday}`,
                C.brand
              )}
              ${kpi(
                'Not Collected',
                `${d.kpis.nonCollectedToday}`,
                `${L.householdPlural} missed today`,
                d.kpis.nonCollectedToday > 0 ? C.red : C.green
              )}
              ${kpi(
                `Total ${L.householdPlural}`,
                `${d.kpis.totalHouseholds}`,
                `Registered in ${L.org.toLowerCase()}`,
                C.blue
              )}
              ${
                d.materialData.isLogged
                  ? kpi(
                      'Waste Diversion',
                      `${Math.round(divPct)}%`,
                      `${diverted.toFixed(1)}kg diverted`,
                      statusColor(divPct, 70, 40)
                    )
                  : kpi('Waste Diversion', '--', 'No material log today', C.s500)
              }
            </div>
          </div>

          <!-- 7-DAY TREND -->
          <div class="avoid-break">
            ${sec('7-Day Collection Trend')}
            <div style="background:${C.s50};border:1.5px solid ${C.s200};border-radius:10px;padding:12px 10px 8px;overflow:hidden;">
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr>${pulseHead}</tr></thead>
                <tbody><tr>${pulseBars}</tr></tbody>
              </table>
            </div>
          </div>

          <!-- WASTE MATERIAL LOGS -->
          ${
            d.materialData.isLogged
              ? `
            <div class="avoid-break">
              ${sec('Waste Material Logs')}
              <table style="width:100%;border-collapse:collapse;border:1.5px solid ${C.s200};border-radius:10px;overflow:hidden;">
                <thead><tr style="background:linear-gradient(135deg,${C.brandDark},${C.brand});">
                  ${th('Material Type')}
                  ${th('Weight', 'right')}
                  ${th('Share', 'right')}
                </tr></thead>
                <tbody>
                  ${matRows}
                  <tr style="background:${C.totBg};border-top:2.5px solid ${C.amber};">
                    ${td('TOTAL', { b: true, c: C.totTx })}
                    ${td(`${totalWaste.toFixed(1)} kg`, { a: 'right', b: true, c: C.totTx, m: true })}
                    ${td('100.0%', { a: 'right', b: true, c: C.totTx })}
                  </tr>
                </tbody>
              </table>
            </div>
          `
              : `
            <div class="avoid-break">
              ${sec('Waste Material Logs')}
              ${noData('No Material Data', 'Waste type logs were not recorded for this date.')}
            </div>
          `
          }

          <!-- WASTE DIVERSION RATE -->
          ${
            d.materialData.isLogged
              ? `
            <div class="avoid-break">
              ${sec('Waste Diversion Rate')}
              <div style="background:linear-gradient(135deg,${C.s50},${C.brandLight});border:1.5px solid ${C.s200};border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:14px;">
                <div style="flex:1;">
                  <div style="font-size:12px;font-weight:800;color:${C.s900};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Diversion Performance</div>
                  <div style="height:11px;background:${C.s200};border-radius:6px;overflow:hidden;margin-bottom:6px;">
                    <div style="height:100%;width:${Math.min(divPct, 100)}%;background:linear-gradient(90deg,${C.green},${C.brandDark});border-radius:6px;"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;">
                    <span style="color:${C.brandDark};">Diverted: ${diverted.toFixed(1)} kg</span>
                    <span style="color:${C.red};">Landfill: ${(totalWaste - diverted).toFixed(1)} kg</span>
                  </div>
                </div>
                <div style="text-align:center;min-width:80px;padding:8px;background:${C.white};border-radius:8px;border:1.5px solid ${divColor}40;">
                  <div style="font-size:28px;font-weight:900;color:${divColor};line-height:1;">${Math.round(divPct)}%</div>
                  <div style="font-size:10px;font-weight:800;color:${divColor};text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">${divLabel}</div>
                </div>
              </div>
            </div>
          `
              : `
            <div class="avoid-break">
              ${sec('Waste Diversion Rate')}
              ${noData('No Diversion Data', 'Diversion rate will appear once waste types are logged.')}
            </div>
          `
          }

          <!-- WARD TABLE -->
          <div class="avoid-break">
            ${sec(`${L.ward}-Wise Performance`)}
            <table style="width:100%;border-collapse:collapse;border:1.5px solid ${C.s200};border-radius:10px;overflow:hidden;">
              <thead><tr style="background:linear-gradient(135deg,${C.brandDark},${C.brand});">
                ${th(L.ward)}
                ${th(`Total ${L.householdPlural.substring(0, 2).toUpperCase()}`, 'center')}
                ${th('Collected', 'center')}
                ${th('Missed', 'center')}
                ${th('Coverage', 'right')}
              </tr></thead>
              <tbody>
                ${wardRows}
                <tr style="background:${C.totBg};border-top:2.5px solid ${C.amber};">
                  ${td('TOTAL', { b: true, c: C.totTx })}
                  ${td(`${d.kpis.totalHouseholds}`, { a: 'center', b: true, c: C.totTx })}
                  ${td(`${d.kpis.collectedToday}`, { a: 'center', b: true, c: C.totTx })}
                  ${td(`${d.kpis.nonCollectedToday}`, { a: 'center', b: true, c: C.totTx })}
                  ${td(`${totalCov}%`, { a: 'right', b: true, c: C.totTx })}
                </tr>
              </tbody>
            </table>
          </div>

          <!-- VEHICLE SESSION REPORT -->
          <div class="avoid-break">
            ${sec('Vehicle Session Report')}
          </div>
          ${
            activeV.length > 0
              ? vCards
              : `<div class="avoid-break">${noData(
                  'No Vehicle Sessions',
                  'No collection sessions were recorded for this date. Sessions appear here when collectors start and end their routes.'
                )}</div>`
          }

          <!-- HOURLY DISTRIBUTION -->
          <div class="avoid-break">
            ${
              grandTotal > 0
                ? `
              ${sec('Hourly Collection Distribution')}
              <table style="width:100%;border-collapse:collapse;border:1.5px solid ${C.s200};border-radius:10px;overflow:hidden;">
                <thead><tr style="background:linear-gradient(135deg,${C.brandDark},${C.brand});">
                  <th style="padding:5px 8px;font-size:10px;font-weight:800;color:#fff;text-align:left;text-transform:uppercase;letter-spacing:0.04em;">Vehicle</th>
                  ${hourHeaders}
                  <th style="padding:5px 6px;font-size:10px;font-weight:800;color:#fff;text-align:center;text-transform:uppercase;letter-spacing:0.04em;">Total</th>
                </tr></thead>
                <tbody>
                  ${vehicleHourRows}
                  <tr style="background:${C.totBg};border-top:2px solid ${C.amber};">
                    <td style="padding:5px 8px;font-size:11px;font-weight:900;color:${C.totTx};">TOTAL</td>
                    ${totalHourlyCells}
                    <td style="padding:5px 6px;font-size:11px;text-align:center;font-weight:900;color:${C.totTx};">${grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            `
                : `
              ${sec('Hourly Collection Distribution')}
              ${noData(
                'No Collection Activity',
                'No hourly collection data is available for this date. This table populates when collectors perform collections during their routes.'
              )}
            `
            }
          </div>

          <!-- WORKFORCE ATTENDANCE LOG -->
          <div class="avoid-break">
            ${sec('Workforce Attendance Log')}
          </div>
          ${(() => {
            const att = d.attendance;
            if (!att)
              return `<div class="avoid-break">${noData('Attendance Not Available', `Attendance feature may not be enabled for this ${L.org.toLowerCase()}.`)}</div>`;

            const statusBadge = (s: string | null) => {
              if (s === 'present')
                return `<span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Present</span>`;
              if (s === 'half_day')
                return `<span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Half Day</span>`;
              if (s === 'absent')
                return `<span style="background:#fce4ec;color:#b71c1c;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Absent</span>`;
              return `<span style="background:${C.s100};color:${C.s500};padding:4px 10px;border-radius:6px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Not Marked</span>`;
            };

            const workerTable = (
              title: string,
              workers: Array<{ workerName: string; attendance: string | null }> = []
            ) => {
              if (!workers || workers.length === 0)
                return `<div class="avoid-break" style="margin-bottom:10px;">
                  <div style="font-size:13px;font-weight:800;color:${C.s700};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${title}</div>
                  <div style="background:${C.s50};border:1.5px dashed ${C.s200};border-radius:10px;padding:12px;text-align:center;font-size:12px;color:${C.s500};font-weight:600;">No ${title.toLowerCase()} registered</div>
                </div>`;
              const rows = workers
                .map(
                  (w, i) => `
                <tr style="background:${i % 2 === 0 ? C.white : C.s50};">
                  ${td(String(i + 1), { a: 'center' })}
                  ${td(w.workerName, { b: true })}
                  <td style="padding:8px 12px;text-align:center;">${statusBadge(w.attendance)}</td>
                </tr>`
                )
                .join('');
              return `<div class="avoid-break" style="margin-bottom:12px;">
                <div style="font-size:13px;font-weight:800;color:${C.s700};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${title}</div>
                <table style="width:100%;border-collapse:collapse;border:1.5px solid ${C.s200};border-radius:10px;overflow:hidden;">
                  <thead><tr style="background:linear-gradient(135deg,${C.brandDark},${C.brand});">
                    ${th('#', 'center')}${th('Name')}${th('Status', 'center')}
                  </tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>`;
            };

            return (
              workerTable('Collectors', att.collectors || []) +
              workerTable('Helpers', att.helpers || []) +
              workerTable('Segregators', att.segregators || [])
            );
          })()}

          <!-- REPORT FOOTER -->
          <div style="text-align:center;padding-top:14px;margin-top:20px;padding-bottom:10px;border-top:2.5px solid ${C.brand};">
            <div style="font-size:12px;color:${C.s700};font-weight:600;line-height:1.7;">
              This report was auto-generated by <strong style="color:${C.brand};">GreenPath Platform</strong><br/>
              on ${fmtDate(d.date)} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} IST<br/>
              <span style="font-size:11px;color:${C.s500};">${new Date().getFullYear()} GreenPath. All rights reserved.</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ── Mobile PDF Generation & Background Downloader ────────────────────
export async function generateDailyReportPDFMobile(
  data: PDFReportData
): Promise<{ uri: string; filePath: string; fileName: string }> {
  const html = buildFullReportHtml(data);

  // Generate real vector PDF using device's native OS print adapter
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Target filename and destination in persistent app documents folder
  const cleanVillage = (data.villageName || 'Village').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `GreenPath_DailyReport_${cleanVillage}_${data.date}.pdf`;
  const destinationPath = `${FileSystem.documentDirectory}${fileName}`;

  // Copy from temporary print cache to persistent documentDirectory
  await FileSystem.copyAsync({
    from: uri,
    to: destinationPath,
  });

  // Automatically save directly to public Downloads folder (Android SAF) / Files app (iOS)
  await saveFileToPublicDeviceStorage({
    localUri: destinationPath,
    fileName,
    mimeType: 'application/pdf',
  });

  return {
    uri: destinationPath,
    filePath: destinationPath,
    fileName,
  };
}
