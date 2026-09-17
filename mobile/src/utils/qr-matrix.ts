/**
 * GreenPath Village Manager — Pure Client-Side QR Matrix & SVG Generator
 *
 * Generates vector QR codes on-device without any server roundtrip.
 * Uses standard error correction level 'H' (30% damage tolerance) for outdoor stickers.
 */
import qrcode from 'qrcode-generator';

export interface QrSvgOptions {
  margin?: number;
  cellSize?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  scalable?: boolean;
}

/**
 * Strip GEN- prefix so the QR code encodes a shorter UID string (e.g. "V001-H0001").
 * This produces a lower-density, faster-to-scan QR matrix for field cameras.
 */
export function getScannableUid(fullUid: string): string {
  if (!fullUid) return '';
  return fullUid.replace(/^GEN-/, '');
}

/**
 * Ensure display text has the GEN- prefix for human readability (e.g. "GEN-V001-H0001").
 */
export function getDisplayUid(uid: string): string {
  if (!uid) return '';
  return uid.startsWith('GEN-') ? uid : `GEN-${uid}`;
}

/**
 * Resolve unit label according to village unit type.
 */
export function resolveUnitLabel(unitType?: string): string {
  const UNIT_LABELS: Record<string, string> = {
    gram_panchayat: 'House',
    municipality: 'House',
    apartment: 'Flat',
    township: 'Unit',
    institution_campus: 'Unit',
  };
  return (unitType && UNIT_LABELS[unitType]) || 'House';
}

/**
 * Generate a clean vector SVG string for a given text.
 * Encodes using error correction level 'H' by default for maximum outdoor durability.
 */
export function generateQrSvg(
  text: string,
  options: QrSvgOptions = {}
): string {
  const {
    margin = 2,
    cellSize = 4,
    errorCorrection = 'H',
    scalable = true,
  } = options;

  // TypeNumber 0 = auto-detect smallest version capable of holding the text
  const qr = qrcode(0, errorCorrection);
  qr.addData(text);
  qr.make();

  return qr.createSvgTag({
    margin,
    cellSize,
    scalable,
  });
}

/**
 * Generate boolean 2D matrix (true = dark module, false = light module).
 */
export function generateQrMatrix(
  text: string,
  errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'H'
): boolean[][] {
  const qr = qrcode(0, errorCorrection);
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const matrix: boolean[][] = [];

  for (let r = 0; r < count; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < count; c++) {
      row.push(qr.isDark(r, c));
    }
    matrix.push(row);
  }

  return matrix;
}
