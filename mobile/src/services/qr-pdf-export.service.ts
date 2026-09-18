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
import {
  generateQrSvg,
  getScannableUid,
  getDisplayUid,
  resolveUnitLabel,
} from '../utils/qr-matrix';
import { saveFileToPublicDeviceStorage } from './public-file-storage.service';

export const GREENPATH_LOGO_SVG_SYMBOL = `
<svg style="position:absolute;width:0;height:0;overflow:hidden;" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="gp-logo-clip">
      <rect width="1426" height="305" fill="white" transform="translate(50 30)"/>
    </clipPath>
    <symbol id="gp-logo" viewBox="0 0 1526 365">
      <g clip-path="url(#gp-logo-clip)">
        <path d="M153.085 33.8965C125.429 39.7051 93.1291 60.5731 77.1812 82.5167C47.1024 124.037 42.0556 179.112 63.8577 226.226C70.9232 241.285 89.0916 264.95 96.7628 269.468C104.03 273.555 162.169 250.536 176.906 237.843C188.412 227.947 185.788 217.19 169.235 205.358C147.029 189.653 151.672 177.391 185.384 162.761C199.313 156.523 193.459 156.092 172.868 161.686C146.221 169 133.1 179.112 133.1 192.45C133.1 195.892 135.522 203.637 138.348 209.661C144.404 222.353 142.991 229.668 134.109 232.034C125.832 234.186 118.565 230.959 109.481 220.848C97.1665 207.294 91.9178 188.147 93.1291 160.18C93.7347 141.678 94.744 137.376 101.002 123.177C113.518 95.2096 134.109 77.5686 164.592 69.3935C173.676 66.8119 186.192 65.0909 194.469 65.306C207.994 65.5211 208.398 65.7363 200.727 67.4573C184.577 71.5449 170.244 76.4929 159.545 81.8713C147.634 87.895 128.053 106.181 122.4 116.508L118.767 122.962L129.466 126.404C135.32 128.555 148.846 130.491 159.545 131.137C182.76 132.643 199.112 128.125 219.702 115.217C233.833 106.181 253.011 85.5285 261.49 70.2541C266.94 60.3579 266.94 60.1428 263.105 57.1309C254.222 49.6012 225.96 37.1235 211.426 33.8965C192.854 30.0241 171.455 30.0241 153.085 33.8965Z" fill="#0E7C3F"/>
        <path d="M1334.23 172.658V278.073H1350.38H1366.53V238.273C1366.53 190.944 1368.35 179.542 1378.04 168.14C1389.35 154.802 1412.16 150.929 1425.08 160.395C1439.21 170.291 1440.22 174.594 1440.82 229.023L1441.43 278.073H1458.59H1475.54V235.477C1475.54 185.135 1473.32 167.279 1465.85 152.435C1452.73 126.189 1417 116.078 1386.72 129.846C1381.27 132.428 1375.42 136.085 1373.4 138.451C1371.58 140.603 1369.16 142.539 1368.15 142.539C1367.34 142.539 1366.53 125.543 1366.53 104.891V67.2422H1350.38H1334.23V172.658Z" fill="#0E7C3F"/>
        <path d="M1233.3 109.193V127.48H1221.19H1209.07V141.463V155.447H1220.98H1232.9L1233.7 201.055C1234.31 242.791 1234.71 247.524 1238.75 255.484C1240.97 260.217 1244.6 265.81 1246.82 267.747C1254.29 275.061 1268.42 280.224 1280.94 280.224C1295.07 280.224 1313.85 274.846 1315.46 270.543C1316.07 268.822 1314.45 262.153 1311.83 255.699C1307.59 244.512 1307.18 244.082 1303.15 247.094C1298.3 250.751 1283.97 251.181 1277.1 247.739C1268.83 243.652 1267.62 237.413 1267.62 195.247V155.447H1286.79H1305.97V140.818V126.404L1286.79 127.049L1267.62 127.91V109.408V90.9069H1250.46H1233.3V109.193Z" fill="#0E7C3F"/>
        <path d="M450.038 126.619C421.978 134.794 402.598 156.738 397.349 186.641C390.889 223.859 409.462 260.432 441.559 274.201C451.047 278.073 457.103 278.934 476.281 279.149C498.487 279.149 500.102 278.934 512.82 272.264C519.885 268.392 528.162 262.799 530.786 259.787L535.631 254.408L525.74 243.652L516.05 233.11L509.388 238.704C489.806 254.408 461.746 253.978 443.78 237.628C436.916 231.174 429.851 219.772 429.851 214.609C429.851 213.963 455.286 213.533 486.375 213.533H542.899V201.055C542.899 174.379 531.19 148.993 513.425 136.945C494.449 124.037 472.042 120.38 450.038 126.619ZM489.403 157.383C498.689 161.901 505.35 169 508.379 177.606C513.022 190.299 514.031 189.868 471.638 189.868C450.038 189.868 432.071 189.223 431.264 188.578C429.649 186.856 433.888 174.809 438.733 167.494C447.817 154.156 472.647 149.208 489.403 157.383Z" fill="#0E7C3F"/>
        <path d="M613.554 125.543C593.165 129.846 572.776 146.196 563.288 165.773C553.396 186.641 553.598 217.405 564.095 239.349C570.555 252.687 586.705 268.177 601.038 274.201C610.526 278.073 616.582 278.934 635.759 279.149C657.965 279.149 659.58 278.934 672.298 272.264C679.364 268.392 687.64 262.799 690.265 259.787L695.11 254.408L685.218 243.652L675.528 233.11L669.068 238.273C655.947 249.03 635.961 252.902 619.004 247.739C606.488 244.082 591.348 227.302 591.348 216.76C591.348 213.963 598.01 213.533 646.862 213.533H702.377V201.055C702.377 162.762 681.382 133.718 648.477 126.404C633.337 122.962 626.877 122.747 613.554 125.543ZM649.083 157.383C658.773 162.116 667.453 173.088 669.27 182.984L670.683 189.868H629.703C593.366 189.868 589.127 189.438 590.137 186.426C590.742 184.49 591.348 181.693 591.348 179.972C591.348 175.454 605.681 159.535 612.544 156.308C621.427 152.22 639.393 152.65 649.083 157.383Z" fill="#0E7C3F"/>
        <path d="M791.806 125.328C781.511 127.695 769.196 134.149 764.15 140.172C758.497 146.842 756.882 145.766 756.882 135.009V125.328H740.733H724.583V201.701V278.073H741.54H758.699L759.305 231.174C759.91 190.514 760.314 183.414 763.746 176.315C769.398 164.052 780.905 156.953 796.045 155.877C812.599 155.017 820.674 159.534 827.537 173.948C832.382 184.06 832.584 186.426 833.19 231.174L833.997 278.073H849.945H865.893V232.25C865.893 171.152 862.663 154.371 848.33 139.957C836.016 127.48 810.984 121.026 791.806 125.328Z" fill="#0E7C3F"/>
        <path d="M962.185 125.543C953.101 127.695 944.017 132.643 935.337 139.312L929.079 144.26L929.28 135.44L929.482 126.404L913.938 125.759L898.192 125.113V229.668V334.008H914.342H930.492V298.511C930.492 266.026 931.703 258.496 935.538 265.165C936.346 266.456 941.595 270.113 947.247 273.34C956.735 278.503 959.763 279.149 977.931 279.149C995.494 279.149 999.532 278.503 1009.22 273.555C1025.37 265.595 1034.46 256.129 1041.92 239.779C1048.18 226.441 1048.59 224.075 1048.59 202.776C1048.59 182.339 1047.98 178.897 1042.73 166.849C1029 135.009 994.687 117.368 962.185 125.543ZM983.18 155.662C1004.17 160.395 1017.09 182.339 1014.67 208.37C1012.45 232.034 998.32 247.094 975.913 249.46C956.331 251.612 937.961 238.273 932.51 217.621C925.445 191.374 938.567 162.546 960.772 155.877C970.26 152.865 971.068 152.865 983.18 155.662Z" fill="#0E7C3F"/>
        <path d="M1112.18 124.468C1099.05 127.264 1084.12 132.643 1076.24 137.376L1067.76 142.754L1074.22 155.232L1080.68 167.71L1093.4 161.471C1115.81 150.069 1142.25 151.144 1153.16 163.837C1157.4 168.785 1162.64 180.833 1162.64 185.781C1162.64 186.856 1154.77 187.717 1144.88 187.717C1120.45 187.717 1095.02 191.374 1085.93 196.322C1055.85 212.672 1056.26 256.775 1086.54 273.555C1105.92 284.097 1139.83 281.73 1156.59 268.392L1163.65 262.799L1164.26 270.328L1164.86 278.073H1180H1194.94V225.365C1194.94 177.606 1194.54 171.797 1190.7 161.04C1185.86 146.842 1173.14 133.718 1159.01 128.555C1149.32 125.113 1121.46 122.532 1112.18 124.468ZM1161.43 222.784C1161.43 235.477 1156.59 243.006 1144.48 249.46C1127.11 258.926 1104.5 254.408 1099.05 240.425C1093.6 226.871 1100.27 216.975 1117.22 212.888C1119.44 212.242 1130.34 212.027 1141.45 212.027L1161.63 212.457L1161.43 222.784Z" fill="#0E7C3F"/>
        <path d="M306.709 201.701V278.073H323.666H340.825L341.431 232.25C342.036 187.072 342.036 186.641 347.487 176.53C354.149 164.483 366.059 157.598 379.988 157.598C390.486 157.598 389.274 160.395 390.284 134.364L390.687 125.328H381.805C368.28 125.328 357.984 129.416 347.891 138.882L339.008 147.272V136.3V125.328H322.859H306.709V201.701Z" fill="#0E7C3F"/>
        <path d="M208.196 161.901C188.211 169.431 179.934 177.175 182.558 185.351C183.164 187.287 190.431 193.526 198.91 199.334C217.684 212.457 221.923 217.836 221.923 229.453C221.923 240.21 218.289 246.879 201.13 266.886C191.037 278.503 187.605 283.882 187.605 288.615C187.605 295.929 190.229 297.435 204.562 297.435C225.153 297.435 248.974 287.969 269.968 271.404L280.466 262.799V210.306V157.598L249.781 157.813C224.951 157.813 216.876 158.674 208.196 161.901Z" fill="#0E7C3F"/>
      </g>
    </symbol>
  </defs>
</svg>
`;

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
            errorCorrection: 'M',
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
                  <svg class="logo-svg" viewBox="0 0 1526 365" preserveAspectRatio="xMidYMid meet">
                    <use href="#gp-logo" xlink:href="#gp-logo"></use>
                  </svg>
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
        .logo-svg {
          height: 11mm;
          max-width: 44mm;
          width: auto;
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
      ${GREENPATH_LOGO_SVG_SYMBOL}
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

  // Immediately cleanup temporary print cache file to release storage/memory
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

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
