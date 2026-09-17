/**
 * GreenPath Village Manager — Client-Side QR Sticker PDF Export Service
 *
 * Implements:
 * - 100% on-device A4 printable sticker sheet generation (3×3 grid, 9 cards/page)
 * - Zero server rendering / zero Cloudinary / zero server CPU load
 * - Pure vector QR SVG modules embedded in HTML
 * - Instant PDF generation via native expo-print (<300ms)
 * - Immediate native sharing via expo-sharing (WhatsApp, Files, Bluetooth/WiFi thermal printer)
 */
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LOGO_BASE64 } from '../constants/logo-base64';
import {
  generateQrSvg,
  getScannableUid,
  getDisplayUid,
  resolveUnitLabel,
} from '../utils/qr-matrix';
import { saveFileToPublicDeviceStorage } from './public-file-storage.service';

export interface QrCardItem {
  uid: string;
  batchId?: string;
  status?: string;
}

export interface QrPdfExportOptions {
  items: QrCardItem[];
  title: string;
  unitType?: string;
  villageName?: string;
  onProgress?: (rendered: number, total: number) => void;
}

export interface QrPdfExportResult {
  uri: string;
  filePath: string;
  fileName: string;
  totalCards: number;
  totalPages: number;
}

/**
 * Generate A4 HTML template for pre-mapped QR sticker sheets matching web/server visual design.
 */
export function buildQrStickersHtml(
  items: QrCardItem[],
  unitLabel: string = 'House'
): string {
  const cardsPerPage = 9;
  const pagesCount = Math.ceil(items.length / cardsPerPage);

  // Build pages
  let pagesHtml = '';

  for (let p = 0; p < pagesCount; p++) {
    const pageItems = items.slice(p * cardsPerPage, (p + 1) * cardsPerPage);
    const isLastPage = p === pagesCount - 1;

    // Build 3 rows × 3 columns table structure for 100% reliable print rendering across devices
    let tableRowsHtml = '';
    for (let row = 0; row < 3; row++) {
      let cellsHtml = '';
      for (let col = 0; col < 3; col++) {
        const itemIndex = row * 3 + col;
        if (itemIndex < pageItems.length) {
          const item = pageItems[itemIndex];
          const scannableUid = getScannableUid(item.uid);
          const displayUid = getDisplayUid(item.uid);
          const rawSvg = generateQrSvg(scannableUid, {
            margin: 1,
            cellSize: 4,
            errorCorrection: 'H',
            scalable: true,
          });
          const svgTag = rawSvg.replace(
            '<svg ',
            '<svg width="44mm" height="44mm" style="width:44mm;height:44mm;display:block;" '
          );

          cellsHtml += `
            <td class="qr-cell">
              <div class="card-inner">
                <div class="logo-wrap">
                  <img src="${LOGO_BASE64}" class="logo-img" alt="GreenPath" />
                </div>
                <div class="card-subtitle">Waste Management System</div>
                <div class="qr-wrap">
                  ${svgTag}
                </div>
                <div class="uid-title">${unitLabel} UID: <span class="uid-bold">${displayUid}</span></div>
                <div class="footer-note">Login & manage at:</div>
                <div class="footer-url">www.greenpathindia.in</div>
              </div>
            </td>
          `;
        } else {
          // Fill remaining empty slots to keep 3x3 grid alignment intact on the last page
          cellsHtml += `
            <td class="qr-cell qr-cell-empty"></td>
          `;
        }
      }
      tableRowsHtml += `<tr style="height: 96.5mm;">${cellsHtml}</tr>`;
    }

    pagesHtml += `
      <div class="page-sheet ${isLastPage ? 'page-sheet-last' : ''}">
        <table class="sheet-table">
          ${tableRowsHtml}
        </table>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>GreenPath QR Sticker Sheet</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 3mm 3mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
        }
        .page-sheet {
          width: 100%;
          height: 290mm;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          box-sizing: border-box;
          display: block;
        }
        .page-sheet.page-sheet-last {
          page-break-after: auto;
          break-after: auto;
        }
        .sheet-table {
          width: 100%;
          height: 290mm;
          border-collapse: collapse;
          table-layout: fixed;
        }
        tr {
          height: 96.5mm;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .qr-cell {
          width: 33.3333%;
          height: 96.5mm;
          padding: 3mm 2mm;
          text-align: center;
          vertical-align: middle;
          border: 0.25mm dashed #94a3b8;
          box-sizing: border-box;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .qr-cell-empty {
          border: 0.25mm dashed #e2e8f0;
          background: transparent;
        }
        .card-inner {
          width: 100%;
          margin: 0 auto;
          text-align: center;
        }
        .logo-wrap {
          height: 11mm;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2mm;
        }
        .logo-img {
          max-height: 11mm;
          max-width: 44mm;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }
        .card-subtitle {
          font-size: 8.5pt;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.2px;
          margin: 0 0 2.5mm 0;
          text-transform: uppercase;
        }
        .qr-wrap {
          width: 44mm;
          height: 44mm;
          margin: 0 auto 2.5mm auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-wrap svg {
          width: 44mm;
          height: 44mm;
          display: block;
        }
        .uid-title {
          font-size: 10pt;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 1.5mm 0;
          letter-spacing: -0.2px;
        }
        .uid-bold {
          font-weight: 800;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .footer-note {
          font-size: 7.5pt;
          color: #64748b;
          margin: 0 0 0.5mm 0;
        }
        .footer-url {
          font-size: 8.5pt;
          font-weight: 800;
          color: #059669;
          letter-spacing: 0.3px;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;
}

/**
 * Generate client-side PDF file on device.
 */
export async function exportQrStickersPdf(
  options: QrPdfExportOptions
): Promise<QrPdfExportResult> {
  const { items, title, unitType, villageName } = options;

  if (!items || items.length === 0) {
    throw new Error('No QR codes provided for export');
  }

  const unitLabel = resolveUnitLabel(unitType);
  const html = buildQrStickersHtml(items, unitLabel);

  // Generate vector PDF directly using device's native OS print adapter with explicit A4 paper points (595x842 at 72 PPI)
  const { uri } = await Print.printToFileAsync({
    html,
    width: 595,
    height: 842,
    base64: false,
  });

  // Clean filename
  const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanVillage = (villageName || 'Village').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `GreenPath_${cleanVillage}_${cleanTitle}_${Date.now()}.pdf`;
  const destinationPath = `${FileSystem.documentDirectory}${fileName}`;

  // Copy from temporary print cache to persistent app document directory
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

  const totalPages = Math.ceil(items.length / 9);

  return {
    uri: destinationPath,
    filePath: destinationPath,
    fileName,
    totalCards: items.length,
    totalPages,
  };
}

/**
 * Convenience helper: generate client-side PDF and open native share sheet immediately.
 */
export async function exportAndShareQrPdf(
  options: QrPdfExportOptions
): Promise<QrPdfExportResult> {
  const result = await exportQrStickersPdf(options);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(result.filePath, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Share ${options.title}`,
    });
  }

  return result;
}
