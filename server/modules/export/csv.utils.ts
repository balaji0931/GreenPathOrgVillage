/**
 * CSV Export Utilities
 * Pure Node.js CSV generation - no external dependencies.
 */
import type { Response } from 'express';

/** BOM prefix for Excel UTF-8 compatibility */
export const CSV_BOM = '\uFEFF';

/**
 * Escape a single CSV field value.
 * Handles commas, quotes, newlines, and null/undefined.
 */
export function escapeCsvField(value: any): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Build a CSV row from an array of field values.
 */
export function toCsvRow(fields: any[]): string {
  return fields.map(escapeCsvField).join(',') + '\r\n';
}

/**
 * Build CSV header row from column names.
 */
export function csvHeader(columns: string[]): string {
  return toCsvRow(columns);
}

/**
 * Generate a full CSV string from headers + rows.
 * Each row is an array of values matching the header order.
 */
export function buildCsv(headers: string[], rows: any[][]): string {
  return CSV_BOM + csvHeader(headers) + rows.map(row => toCsvRow(row)).join('');
}

/**
 * Set CSV download headers on an Express response.
 */
export function setCsvHeaders(res: Response, filename: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
}

/**
 * Set ZIP download headers on an Express response.
 */
export function setZipHeaders(res: Response, filename: string): void {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
}

/**
 * Stream a CSV response - writes BOM + header, then streams data rows.
 * Use for large datasets (10k+ rows) to avoid memory pressure.
 */
export function streamCsvStart(res: Response, filename: string, headers: string[]): void {
  setCsvHeaders(res, filename);
  res.write(CSV_BOM);
  res.write(csvHeader(headers));
}

/**
 * Write a batch of rows to the streaming response.
 */
export function streamCsvRows(res: Response, rows: any[][]): void {
  for (const row of rows) {
    res.write(toCsvRow(row));
  }
}

/**
 * Mask a phone number: show only last 3 digits.
 * e.g. "9876543210" → "•••••••210"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (phone.length <= 3) return phone;
  return '•'.repeat(phone.length - 3) + phone.slice(-3);
}

/**
 * Mask an address: return only the ward name (or empty if no ward provided).
 */
export function maskAddress(address: string | null | undefined, ward: string | null | undefined): string {
  return ward || '';
}

/**
 * Generate a suggested ZIP password.
 * Format: GP-{MON}-{4 digits}-{2 letters}
 * e.g. GP-MAR-7824-BX
 */
export function generateSuggestedPassword(): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[new Date().getMonth()];
  const digits = String(Math.floor(1000 + Math.random() * 9000)); // 4 digits
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const l1 = letters[Math.floor(Math.random() * 26)];
  const l2 = letters[Math.floor(Math.random() * 26)];
  return `GP-${month}-${digits}-${l1}${l2}`;
}

/**
 * Data sensitivity classification per export type.
 */
export const EXPORT_SENSITIVITY: Record<string, 'personal' | 'aggregated'> = {
  households: 'personal',
  collections: 'personal',
  payments: 'personal',
  collectors: 'personal',
  issues: 'personal',
  'daily-waste': 'aggregated',
  compost: 'aggregated',
  sales: 'aggregated',
  coverage: 'aggregated',
  'ward-daily': 'aggregated',
  'vehicle-daily': 'aggregated',
};

/**
 * Human-readable export type labels.
 */
export const EXPORT_LABELS: Record<string, string> = {
  households: 'Household Register',
  collections: 'Waste Collections',
  'daily-waste': 'Daily Waste Quantity',
  compost: 'Compost Production',
  sales: 'Dry Waste Sales',
  payments: 'Payment Ledger',
  collectors: 'Collector Performance',
  issues: 'Issue Tracker',
  coverage: 'Coverage & Segregation Summary',
  'ward-daily': 'Ward-Level Daily Report',
  'vehicle-daily': 'Vehicle Daily Report',
};

/** All valid export type keys */
export const VALID_EXPORT_TYPES = Object.keys(EXPORT_LABELS);

/** Max estimated size per export job (250 MB) */
export const MAX_EXPORT_SIZE_KB = 250 * 1024;

/** Max date range in days */
export const MAX_DATE_RANGE_DAYS = 365;

/** Warn threshold in days */
export const WARN_DATE_RANGE_DAYS = 90;

/** Size estimate: average bytes per CSV row */
export const AVG_BYTES_PER_ROW = 100;
