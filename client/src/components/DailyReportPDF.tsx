import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { LOGO_BASE64 } from "./greenpath-logo-base64";

// ── Types ──────────────────────────────────────────────────────────
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
    wet: number; dry: number; sanitary: number; specialCare: number; mixed: number; isLogged: boolean;
  };
  vehicleStats: Array<{
    registrationNumber: string; vehicleName: string; collectorNames: string;
    count: number; startTime: string | null; endTime: string | null;
    sessions: any[]; totalWorkMs: number; totalBreakMs: number;
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
  /** Unit-type-aware labels for PDF text */
  labels?: {
    household: string;
    householdPlural: string;
    ward: string;
    wardPlural: string;
    org: string;
    houseNumber: string;
  };
}

// ── Helpers ─────────────────────────────────────────────────────
const fmtMs = (ms: number) => { const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return `${h}h ${m}m`; };
const fmtTime = (iso: string | null) => { if (!iso) return "--"; return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }); };
const fmtDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const shortDate = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const genId = (vid: string, date: string) => `GP-${vid.replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase()}-${date.replace(/-/g, "")}`;

// ── Palette ────────────────────────────────────────────────────
const C = {
  brand: "#059669", brandLight: "#d1fae5", brandDark: "#064e3b",
  s900: "#0f172a", s700: "#1e293b", s500: "#334155", s400: "#475569",
  s200: "#e2e8f0", s100: "#f1f5f9", s50: "#f8fafc", white: "#ffffff",
  green: "#15803d", blue: "#2563eb", amber: "#d97706", red: "#dc2626",
  pink: "#db2777", gray: "#4b5563",
  totBg: "#fef3c7", totTx: "#78350f",
};

// ── Render helpers ─────────────────────────────────────────────
const PW = 794;  // A4 width at ~96dpi * 2
const M = 30;
const logo = LOGO_BASE64;

const logoImg = (h: number) => logo
  ? `<img src="${logo}" style="height:${h}px;width:auto;display:block;" />`
  : `<div style="display:flex;align-items:center;gap:6px;"><div style="width:${h}px;height:${h}px;background:${C.brand};border-radius:${h * 0.25}px;display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-weight:900;font-size:${h * 0.5}px;">G</span></div><span style="font-weight:900;font-size:${h * 0.45}px;color:${C.brand};letter-spacing:0.06em;">GREENPATH</span></div>`;

const sec = (t: string) => `
  <div style="display:flex;align-items:center;gap:10px;margin:20px 0 10px;">
    <span style="background:${C.brandLight};color:${C.brandDark};padding:5px 12px;border-radius:6px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.14em;display:inline-block;">${t}</span>
    <div style="flex:1;height:1.5px;background:${C.brandLight};"></div>
  </div>`;

const th = (t: string, a = "left") =>
  `<th style="padding:8px 12px;font-size:13px;font-weight:800;color:#fff;text-align:${a};text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;">${t}</th>`;

const td = (t: string, o: { a?: string; b?: boolean; c?: string; m?: boolean } = {}) =>
  `<td style="padding:7px 12px;font-size:14px;text-align:${o.a || "left"};font-weight:${o.b ? "800" : "600"};color:${o.c || C.s700};${o.m ? "font-family:'Courier New',monospace;" : ""}">${t}</td>`;

const statusColor = (v: number, good: number, mid: number) =>
  v >= good ? C.green : v >= mid ? C.amber : C.red;

const noData = (title: string, message: string) => `
  <div style="background:${C.s50};border:2px dashed ${C.s200};border-radius:10px;padding:18px 16px;text-align:center;margin-top:6px;">
    <div style="font-size:14px;font-weight:800;color:${C.s700};margin-bottom:4px;">${title}</div>
    <div style="font-size:13px;font-weight:600;color:${C.s500};">${message}</div>
  </div>`;

// ── Build the full report as one continuous HTML ───────────────
function buildFullReport(d: PDFReportData): string {
  const L = d.labels || { household: 'Household', householdPlural: 'Households', ward: 'Ward', wardPlural: 'Wards', org: 'Village', houseNumber: 'House Number' };
  const coverage = d.kpis.totalHouseholds > 0 ? (d.kpis.collectedToday / d.kpis.totalHouseholds * 100) : 0;
  const diverted = d.materialData.wet + d.materialData.dry;
  const totalWaste = diverted + d.materialData.mixed + d.materialData.sanitary + d.materialData.specialCare;
  const divPct = totalWaste > 0 ? (diverted / totalWaste * 100) : 0;
  const divColor = statusColor(divPct, 70, 40);
  const divLabel = divPct >= 70 ? "Excellent" : divPct >= 40 ? "Needs Improvement" : "Critical";

  // KPI card builder - horizontal: label+sub left, value right (No progress bar)
  const kpi = (label: string, value: string, sub: string, color: string) => `
    <div style="background:${C.s50};border:1.5px solid ${C.s200};border-radius:10px;padding:14px 16px;border-left:4px solid ${color};display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:800;color:${C.s900};margin-bottom:3px;">${label}</div>
        <div style="font-size:13px;color:${C.s500};font-weight:700;">${sub}</div>
      </div>
      <div style="text-align:right;min-width:80px;">
        <div style="font-size:34px;font-weight:900;color:${color};line-height:1;">${value}</div>
      </div>
    </div>`;

  // 7-day pulse
  const maxC = Math.max(...d.pulses.map(p => p.collections), 1);
  const pulseHead = d.pulses.map(p =>
    `<th style="padding:6px 4px;font-size:14px;font-weight:800;color:${C.s700};text-align:center;text-transform:uppercase;letter-spacing:0.04em;border-bottom:2px solid ${C.s200};">${p.day}</th>`
  ).join("");
  const pulseBars = d.pulses.map(p => {
    const h = Math.max(p.collections / maxC * 50, 5);
    return `<td style="padding:6px 4px;text-align:center;vertical-align:bottom;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
        <span style="font-size:16px;font-weight:900;color:${C.s900};">${p.collections}</span>
        <div style="width:36px;height:${h}px;background:linear-gradient(180deg,${C.brand},${C.brandDark});border-radius:5px;"></div>
        <span style="font-size:13px;font-weight:800;color:${C.amber};">${p.rating}/5</span>
      </div>
    </td>`;
  }).join("");

  // Material table rows
  const matItems = [
    { label: "Wet Waste", kg: d.materialData.wet, color: C.green },
    { label: "Dry Waste", kg: d.materialData.dry, color: C.blue },
    { label: "Mixed / Landfill", kg: d.materialData.mixed, color: C.gray },
    { label: "Sanitary Waste", kg: d.materialData.sanitary, color: C.pink },
    { label: "Special Care", kg: d.materialData.specialCare, color: C.amber },
  ];
  const matRows = matItems.map((m, i) => {
    const pct = totalWaste > 0 ? (m.kg / totalWaste * 100) : 0;
    return `<tr style="background:${i % 2 === 0 ? C.white : C.s50};">
      ${td(`<span style="display:inline-flex;align-items:center;gap:7px;"><span style="width:10px;height:10px;border-radius:3px;background:${m.color};display:inline-block;"></span>${m.label}</span>`, { b: true })}
      <td style="padding:7px 12px;font-size:15px;text-align:right;font-weight:900;color:${C.s900};font-family:'Courier New',monospace;">${m.kg.toFixed(1)} kg</td>
      ${td(`${pct.toFixed(1)}%`, { a: "right", c: C.s700 })}
    </tr>`;
  }).join("");

  // Ward rows
  const wardRows = d.wardPerformance.map((w, i) => {
    const cov = w.total > 0 ? (w.collected / w.total * 100) : 0;
    const cc = statusColor(cov, 90, 70);
    return `<tr style="background:${i % 2 === 0 ? C.white : C.s50};">
      ${td(w.name, { b: true })}
      ${td(`${w.total}`, { a: "center" })}
      ${td(`${w.collected}`, { a: "center", b: true, c: C.green })}
      ${td(`${w.nonCollected}`, { a: "center", c: w.nonCollected > 0 ? C.red : C.s400 })}
      ${td(`${cov.toFixed(1)}%`, { a: "right", b: true, c: cc })}
    </tr>`;
  }).join("");
  const totalCov = d.kpis.totalHouseholds > 0 ? (d.kpis.collectedToday / d.kpis.totalHouseholds * 100).toFixed(1) : "0";

  // Vehicle cards
  const activeV = d.vehicleStats.filter(v => v.count > 0);
  const vCards = activeV.map(v => `
    <div class="avoid-break" style="background:${C.s50};border:1.5px solid ${C.s200};border-radius:10px;padding:12px 14px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${C.s200};">
        <div>
          <span style="font-size:15px;font-weight:900;color:${C.s900};">${v.vehicleName}</span>
          <span style="font-size:12px;color:${C.s700};font-weight:700;margin-left:8px;font-family:'Courier New',monospace;background:${C.s100};padding:2px 6px;border-radius:4px;">${v.registrationNumber}</span>
        </div>
        <div style="background:${C.brand};color:#fff;padding:4px 12px;border-radius:8px;font-size:16px;font-weight:900;">${v.count}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;"><div style="font-size:11px;font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Collectors</div><div style="font-size:14px;font-weight:700;color:${C.s900};">${v.collectorNames || "--"}</div></div>
        <div style="flex:0 0 auto;text-align:center;min-width:70px;"><div style="font-size:11px;font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Start</div><div style="font-size:14px;font-weight:700;color:${C.s900};">${fmtTime(v.startTime)}</div></div>
        <div style="flex:0 0 auto;text-align:center;min-width:70px;"><div style="font-size:11px;font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">End</div><div style="font-size:14px;font-weight:700;color:${C.s900};">${fmtTime(v.endTime)}</div></div>
        <div style="flex:0 0 auto;text-align:center;min-width:80px;"><div style="font-size:11px;font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Work Time</div><div style="font-size:14px;font-weight:800;color:${C.green};">${fmtMs(v.totalWorkMs)}</div></div>
        <div style="flex:0 0 auto;text-align:center;min-width:80px;"><div style="font-size:11px;font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px;">Break Time</div><div style="font-size:14px;font-weight:800;color:${C.amber};">${fmtMs(v.totalBreakMs)}</div></div>
      </div>
    </div>
  `).join("");

  // Hourly table (transposed: vehicles=rows, hours=columns)
  const vehicles = d.collectionTimeline.vehicles;
  const hourly = d.collectionTimeline.hourly;
  const hours = hourly.map(h => h.hour as string);
  const hourHeaders = hours.map(hr =>
    `<th style="padding:5px 4px;font-size:11px;font-weight:800;color:#fff;text-align:center;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap;">${hr}</th>`
  ).join("");
  const vehicleHourRows = vehicles.map((v, vi) => {
    const cells = hourly.map(h => {
      const val = h[v.name] || 0;
      return `<td style="padding:5px 4px;font-size:12px;text-align:center;font-weight:${val > 0 ? '800' : '500'};color:${val > 0 ? C.s900 : C.s500};">${val || "-"}</td>`;
    }).join("");
    const rowTotal = hourly.reduce((s, h) => s + (h[v.name] || 0), 0);
    return `<tr style="background:${vi % 2 === 0 ? C.white : C.s50};">
      <td style="padding:5px 8px;font-size:12px;font-weight:800;color:${C.s900};white-space:nowrap;">${v.name}</td>
      ${cells}
      <td style="padding:5px 6px;font-size:12px;text-align:center;font-weight:900;color:${C.brand};">${rowTotal}</td>
    </tr>`;
  }).join("");
  const totalHourlyCells = hourly.map(h => {
    const t = vehicles.reduce((s, v) => s + (h[v.name] || 0), 0);
    return `<td style="padding:5px 4px;font-size:12px;text-align:center;font-weight:900;color:${C.totTx};">${t || "-"}</td>`;
  }).join("");
  const grandTotal = hourly.reduce((s, h) => s + vehicles.reduce((s2, v) => s2 + (h[v.name] || 0), 0), 0);

  // ── Build the full report ──
  return `
    <div style="width:${PW}px;padding:${M}px;background:#fff;font-family:'Inter','Segoe UI',Roboto,-apple-system,sans-serif;color:${C.s900};box-sizing:border-box;">

      <!-- COVER HEADER: Logo left | Heading center | Village+Date right -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0 14px;margin-bottom:14px;border-bottom:2.5px solid ${C.brand};">
        <div style="flex:0 0 auto;">${logoImg(44)}</div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:14px;font-weight:800;color:${C.s900};text-transform:uppercase;letter-spacing:0.2em;">Daily Operations Report</div>
        </div>
        <div style="flex:0 0 auto;text-align:right;">
          <div style="font-size:16px;font-weight:900;color:${C.s900};margin-bottom:2px;">${d.villageName}</div>
          <div style="font-size:13px;color:${C.s700};font-weight:700;">${fmtDate(d.date)}</div>
        </div>
      </div>

      <!-- META -->
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:14px;padding:8px 0;font-size:13px;">
        <span style="font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;">Generated By:</span>
        <span style="font-weight:800;color:${C.s900};">${d.managerName}</span>
        <span style="color:${C.s200};margin:0 6px;">|</span>
        <span style="font-weight:800;color:${C.s500};text-transform:uppercase;letter-spacing:0.06em;">Report ID:</span>
        <span style="font-weight:800;color:${C.s900};font-family:'Courier New',monospace;">${genId(d.villageId, d.date)}</span>
      </div>

      <!-- KPI GRID (2 cols x 3 rows) -->
      <div class="avoid-break">
        ${sec("Executive Summary")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${kpi("Collection Coverage", `${Math.round(coverage)}%`, `${d.kpis.collectedToday} of ${d.kpis.totalHouseholds} ${L.householdPlural.toLowerCase()}`, statusColor(coverage, 90, 70))}
          ${kpi("Segregation Rating", `${d.kpis.avgSegregationRating}/5`, "Average rating", statusColor(d.kpis.avgSegregationRating, 4, 3))}
          ${kpi("Collected Today", `${d.kpis.collectedToday}`, `Yesterday: ${d.kpis.collectedYesterday}`, C.brand)}
          ${kpi("Not Collected", `${d.kpis.nonCollectedToday}`, `${L.householdPlural} missed today`, d.kpis.nonCollectedToday > 0 ? C.red : C.green)}
          ${kpi(`Total ${L.householdPlural}`, `${d.kpis.totalHouseholds}`, `Registered in ${L.org.toLowerCase()}`, C.blue)}
          ${d.materialData.isLogged ? kpi("Waste Diversion", `${Math.round(divPct)}%`, `${diverted.toFixed(1)}kg diverted`, statusColor(divPct, 70, 40)) : kpi("Waste Diversion", "--", "No material log today", C.s500)}
        </div>
      </div>

      <!-- 7-DAY TREND -->
      <div class="avoid-break">
        ${sec("7-Day Collection Trend")}
        <div style="background:${C.s50};border:1.5px solid ${C.s200};border-radius:10px;padding:14px 12px 10px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr>${pulseHead}</tr></thead>
            <tbody><tr>${pulseBars}</tr></tbody>
          </table>
        </div>
      </div>

      <!-- WASTE MATERIAL LOGS -->
      ${d.materialData.isLogged ? `
        <div class="avoid-break">
          ${sec("Waste Material Logs")}
          <table style="width:100%;border-collapse:collapse;border:1.5px solid ${C.s200};border-radius:10px;overflow:hidden;">
            <thead><tr style="background:linear-gradient(135deg,${C.brandDark},${C.brand});">
              ${th("Material Type")}
              ${th("Weight", "right")}
              ${th("Share", "right")}
            </tr></thead>
            <tbody>
              ${matRows}
              <tr style="background:${C.totBg};border-top:2.5px solid ${C.amber};">
                ${td("TOTAL", { b: true, c: C.totTx })}
                ${td(`${totalWaste.toFixed(1)} kg`, { a: "right", b: true, c: C.totTx, m: true })}
                ${td("100.0%", { a: "right", b: true, c: C.totTx })}
              </tr>
            </tbody>
          </table>
        </div>
      ` : `
        <div class="avoid-break">
          ${sec("Waste Material Logs")}
          ${noData("No Material Data", "Waste type logs were not recorded for this date.")}
        </div>
      `}

      <!-- WASTE DIVERSION RATE -->
      ${d.materialData.isLogged ? `
        <div class="avoid-break">
          ${sec("Waste Diversion Rate")}
          <div style="background:linear-gradient(135deg,${C.s50},${C.brandLight});border:1.5px solid ${C.s200};border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:16px;">
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:800;color:${C.s900};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Diversion Performance</div>
              <div style="height:12px;background:${C.s200};border-radius:6px;overflow:hidden;margin-bottom:8px;">
                <div style="height:100%;width:${Math.min(divPct, 100)}%;background:linear-gradient(90deg,${C.green},${C.brandDark});border-radius:6px;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;">
                <span style="color:${C.brandDark};">Diverted: ${diverted.toFixed(1)} kg</span>
                <span style="color:${C.red};">Landfill: ${(totalWaste - diverted).toFixed(1)} kg</span>
              </div>
            </div>
            <div style="text-align:center;min-width:90px;padding:10px;background:${C.white};border-radius:10px;border:1.5px solid ${divColor}40;">
              <div style="font-size:32px;font-weight:900;color:${divColor};line-height:1;">${Math.round(divPct)}%</div>
              <div style="font-size:11px;font-weight:800;color:${divColor};text-transform:uppercase;letter-spacing:0.08em;margin-top:3px;">${divLabel}</div>
            </div>
          </div>
        </div>
      ` : `
        <div class="avoid-break">
          ${sec("Waste Diversion Rate")}
          ${noData("No Diversion Data", "Diversion rate will appear once waste types are logged.")}
        </div>
      `}

      <!-- WARD TABLE -->
      <div class="avoid-break">
        ${sec(`${L.ward}-Wise Performance`)}
        <table style="width:100%;border-collapse:collapse;border:1.5px solid ${C.s200};border-radius:10px;overflow:hidden;">
          <thead><tr style="background:linear-gradient(135deg,${C.brandDark},${C.brand});">
            ${th(L.ward)}
            ${th(`Total ${L.householdPlural.substring(0,2).toUpperCase()}`, "center")}
            ${th("Collected", "center")}
            ${th("Missed", "center")}
            ${th("Coverage", "right")}
          </tr></thead>
          <tbody>
            ${wardRows}
            <tr style="background:${C.totBg};border-top:2.5px solid ${C.amber};">
              ${td("TOTAL", { b: true, c: C.totTx })}
              ${td(`${d.kpis.totalHouseholds}`, { a: "center", b: true, c: C.totTx })}
              ${td(`${d.kpis.collectedToday}`, { a: "center", b: true, c: C.totTx })}
              ${td(`${d.kpis.nonCollectedToday}`, { a: "center", b: true, c: C.totTx })}
              ${td(`${totalCov}%`, { a: "right", b: true, c: C.totTx })}
            </tr>
          </tbody>
        </table>
      </div>

      <!-- VEHICLE SESSION REPORT -->
      <div class="avoid-break">
        ${sec("Vehicle Session Report")}
      </div>
      ${activeV.length > 0 ? vCards : `<div class="avoid-break">${noData(
    "No Vehicle Sessions",
    "No collection sessions were recorded for this date. Sessions appear here when collectors start and end their routes."
  )}</div>`}

      <!-- HOURLY DISTRIBUTION -->
      <div class="avoid-break">
        ${grandTotal > 0 ? `
          ${sec("Hourly Collection Distribution")}
          <table style="width:100%;border-collapse:collapse;border:1.5px solid ${C.s200};border-radius:10px;overflow:hidden;">
            <thead><tr style="background:linear-gradient(135deg,${C.brandDark},${C.brand});">
              <th style="padding:5px 8px;font-size:11px;font-weight:800;color:#fff;text-align:left;text-transform:uppercase;letter-spacing:0.04em;">Vehicle</th>
              ${hourHeaders}
              <th style="padding:5px 6px;font-size:11px;font-weight:800;color:#fff;text-align:center;text-transform:uppercase;letter-spacing:0.04em;">Total</th>
            </tr></thead>
            <tbody>
              ${vehicleHourRows}
              <tr style="background:${C.totBg};border-top:2px solid ${C.amber};">
                <td style="padding:5px 8px;font-size:12px;font-weight:900;color:${C.totTx};">TOTAL</td>
                ${totalHourlyCells}
                <td style="padding:5px 6px;font-size:12px;text-align:center;font-weight:900;color:${C.totTx};">${grandTotal}</td>
              </tr>
            </tbody>
          </table>
        ` : `
          ${sec("Hourly Collection Distribution")}
          ${noData(
    "No Collection Activity",
    "No hourly collection data is available for this date. This table populates when collectors perform collections during their routes."
  )}
        `}
      </div>

      <!-- WORKFORCE ATTENDANCE LOG -->
      <div class="avoid-break">
        ${sec("Workforce Attendance Log")}
      </div>
      ${(() => {
      const att = d.attendance;
      if (!att) return `<div class="avoid-break">${noData("Attendance Not Available", `Attendance feature may not be enabled for this ${L.org.toLowerCase()}.`)}</div>`;

      const statusBadge = (s: string | null) => {
        if (s === 'present') return `<span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Present</span>`;
        if (s === 'half_day') return `<span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Half Day</span>`;
        if (s === 'absent') return `<span style="background:#fce4ec;color:#b71c1c;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Absent</span>`;
        return `<span style="background:${C.s100};color:${C.s500};padding:4px 10px;border-radius:6px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">Not Marked</span>`;
      };

      const workerTable = (title: string, workers: Array<{ workerName: string; attendance: string | null }>) => {
        if (workers.length === 0) return `<div class="avoid-break" style="margin-bottom:10px;">
            <div style="font-size:14px;font-weight:800;color:${C.s700};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${title}</div>
            <div style="background:${C.s50};border:1.5px dashed ${C.s200};border-radius:10px;padding:14px;text-align:center;font-size:13px;color:${C.s500};font-weight:600;">No ${title.toLowerCase()} registered</div>
          </div>`;
        const rows = workers.map((w, i) => `
            <tr style="background:${i % 2 === 0 ? C.white : C.s50};">
              ${td(String(i + 1), { a: 'center' })}
              ${td(w.workerName, { b: true })}
              <td style="padding:10px 14px;text-align:center;">${statusBadge(w.attendance)}</td>
            </tr>`).join('');
        return `<div class="avoid-break" style="margin-bottom:12px;">
            <div style="font-size:14px;font-weight:800;color:${C.s700};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${title}</div>
            <table style="width:100%;border-collapse:collapse;border:1.5px solid ${C.s200};border-radius:10px;overflow:hidden;">
              <thead><tr style="background:linear-gradient(135deg,${C.brandDark},${C.brand});">
                ${th('#', 'center')}${th('Name')}${th('Status', 'center')}
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      };

      return workerTable('Collectors', att.collectors)
        + workerTable('Helpers', att.helpers)
        + workerTable('Segregators', att.segregators);
    })()}

      <!-- REPORT FOOTER -->
      <div style="text-align:center;padding-top:16px;margin-top:24px;padding-bottom:14px;border-top:2.5px solid ${C.brand};">
        <div style="font-size:13px;color:${C.s700};font-weight:600;line-height:1.8;">
          This report was auto-generated by <strong style="color:${C.brand};">GreenPath Platform</strong><br/>
          on ${fmtDate(d.date)} at ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })} IST<br/>
          <span style="font-size:12px;color:${C.s500};">${new Date().getFullYear()} GreenPath. All rights reserved.</span>
        </div>
      </div>
    </div>
  `;
}

// ── PDF Generation (auto-paginated) ────────────────────────────
export async function generateDailyReportPDF(
  data: PDFReportData,
  onProgress?: (step: string) => void
): Promise<void> {
  onProgress?.("Preparing layout...");

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  document.body.appendChild(container);

  try {
    const div = document.createElement("div");
    div.innerHTML = buildFullReport(data);
    container.appendChild(div);

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // A4 dimensions
    const a4W = 210;
    const a4H = 297;
    const marginMm = 10; // header/footer reserved space
    const contentMm = a4H - 2 * marginMm; // usable content zone per page

    const containerEl = div.firstElementChild as HTMLElement;

    // First render to get accurate element positions
    onProgress?.("Rendering...");
    await new Promise(r => setTimeout(r, 50));

    // Capture canvas at scale 3 for high-res clarity on mobile zoom
    const SCALE = 3;
    const canvas = await html2canvas(containerEl, {
      scale: SCALE,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    // All measurements in CANVAS pixels (post-scale)
    const canvasPxPerMm = canvas.width / a4W;
    const contentPxPerPage = contentMm * canvasPxPerMm;

    // Now do avoid-break logic using CANVAS coordinates
    // We need to re-render after adjusting margins, so we work in CSS px first
    const cssPxPerMm = PW / a4W;
    const cssContentPx = contentMm * cssPxPerMm;

    // Shift elements to avoid breaking across page boundaries
    let changed = true;
    let loops = 0;
    while (changed && loops < 50) {
      changed = false;
      loops++;
      const els = containerEl.querySelectorAll('.avoid-break');
      for (let i = 0; i < els.length; i++) {
        const e = els[i] as HTMLElement;
        const rect = e.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        const top = rect.top - containerRect.top;
        const bottom = top + rect.height;

        const startPage = Math.floor(top / cssContentPx);
        const endPage = Math.floor((bottom - 1) / cssContentPx);

        if (endPage > startPage && rect.height < cssContentPx) {
          const currentMt = parseFloat(window.getComputedStyle(e).marginTop) || 0;
          const pushAmt = ((startPage + 1) * cssContentPx) - top + 8;
          e.style.marginTop = (currentMt + pushAmt) + "px";
          changed = true;
          break;
        }
      }
    }

    // Re-render canvas after margin adjustments
    const finalCanvas = await html2canvas(containerEl, {
      scale: SCALE,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const finalPxPerMm = finalCanvas.width / a4W;
    const finalContentPx = contentMm * finalPxPerMm;
    const totalPages = Math.ceil(finalCanvas.height / finalContentPx);

    onProgress?.(`Creating ${totalPages} page${totalPages > 1 ? "s" : ""}...`);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    for (let p = 0; p < totalPages; p++) {
      if (p > 0) pdf.addPage();

      const srcY = p * finalContentPx;
      const srcH = Math.min(finalContentPx, finalCanvas.height - srcY);

      // Skip pages that are effectively empty (less than 20px of content)
      if (srcH < 20) {
        // Remove the extra page we just added
        if (p > 0) {
          pdf.deletePage(pdf.getNumberOfPages());
        }
        break;
      }

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = finalCanvas.width;
      pageCanvas.height = srcH;
      const ctx = pageCanvas.getContext("2d")!;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(finalCanvas, 0, srcY, finalCanvas.width, srcH, 0, 0, finalCanvas.width, srcH);

      const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);

      const destMmY = p === 0 ? 0 : marginMm;
      const destMmH = srcH / finalPxPerMm;
      pdf.addImage(imgData, "JPEG", 0, destMmY, a4W, destMmH);

      // Header on continuation pages
      if (p > 0) {
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(
          `${data.villageName} \u2022 Daily Report \u2022 ${new Date(data.date + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}`,
          marginMm, marginMm - 4
        );
        pdf.setDrawColor(226, 232, 240);
        pdf.line(marginMm, marginMm - 2, a4W - marginMm, marginMm - 2);
      }

      // Footer on ALL pages
      pdf.setFontSize(7);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Page ${p + 1} of ${totalPages}`, a4W - marginMm, a4H - 6, { align: "right" });
      pdf.text("Confidential | Auto-generated by GreenPath", marginMm, a4H - 6);
    }

    onProgress?.("Saving...");
    await new Promise(r => setTimeout(r, 50));
    pdf.save(`GreenPath_DailyReport_${data.villageName.replace(/\s+/g, "_")}_${data.date}.pdf`);
    onProgress?.("Done!");
  } finally {
    document.body.removeChild(container);
  }
}

