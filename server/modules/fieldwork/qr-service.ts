import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import bcrypt from 'bcrypt';

// --- Helpers ---

/** Strip GEN- prefix to get scannable UID */
export const getScannableUid = (fullUid: string): string => {
  return fullUid.replace(/^GEN-/, '');
};

/** Add GEN- prefix if missing */
export const toFullUid = (scannedUid: string): string => {
  if (scannedUid.startsWith('GEN-')) {
    return scannedUid;
  }
  return `GEN-${scannedUid}`;
};

/** Generate credentials for generator (household) user — async bcrypt */
export const generateGeneratorCredentials = async (uid: string): Promise<{
  userId: string;
  password: string;
  hashedPassword: string;
}> => {
  const userId = uid.startsWith('GEN-') ? uid : `GEN-${uid}`;
  const password = userId;
  const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 10);

  return {
    userId,
    password,
    hashedPassword,
  };
};

// --- QR Generation (on-demand, no Cloudinary) ---

/**
 * Generate a QR PNG buffer for a given UID.
 * Encodes plain UID string for smallest/fastest QR.
 * Error correction level H for maximum durability (30% damage tolerance).
 */
export const generateQRBuffer = async (uid: string): Promise<Buffer> => {
  const scannableUid = getScannableUid(uid);
  return QRCode.toBuffer(scannableUid, {
    type: 'png',
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'H',
    version: 6, // Forced higher version for 'denser' premium look
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
};

// --- Logo cache (fetched once, reused for all PDFs) ---

let cachedLogoDataURL: string | null = null;

async function getLogoDataURL(): Promise<string> {
  if (cachedLogoDataURL) return cachedLogoDataURL;
  try {
    const resp = await fetch("https://www.greenpathindia.in/logos/png/logo-full-1024x256.png");
    const arrayBuffer = await resp.arrayBuffer();
    cachedLogoDataURL = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
  } catch {
    // Fallback: empty transparent pixel if logo fetch fails
    cachedLogoDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRUEFuCymC';
  }
  return cachedLogoDataURL;
}

// --- PDF Generation (local QR, no Cloudinary) ---

/**
 * Generate a printable PDF for pre-mapped QR codes.
 * QR images are generated locally in parallel — no network calls.
 * Layout: 3×3 grid (9 cards per A4 page).
 */
export const generatePreMappedQRCodesPDF = async (
  qrCodes: Array<{ uid: string; villageId: string }>
): Promise<Buffer> => {
  const pdf = new jsPDF("p", "mm", "a4");
  const logoDataURL = await getLogoDataURL();

  // Generate ALL QR buffers in parallel first
  const qrBuffers = await Promise.all(
    qrCodes.map(qr => generateQRBuffer(qr.uid))
  );

  // Convert to data URLs
  const qrDataURLs = qrBuffers.map(buf => "data:image/png;base64," + buf.toString("base64"));

  // Layout constants
  const pageWidth = 210;
  const pageHeight = 297;
  const cols = 3;
  const rows = 3;
  const qrSize = 45;
  const boxWidth = pageWidth / cols;   // 70mm
  const boxHeight = pageHeight / rows; // 99mm
  const qrCodesPerPage = cols * rows;  // 9

  for (let i = 0; i < qrCodes.length; i++) {
    const qr = qrCodes[i];

    // Add new page every 9 cards
    if (i > 0 && i % qrCodesPerPage === 0) {
      pdf.addPage();
    }

    const boxIndex = i % qrCodesPerPage;
    const col = boxIndex % cols;
    const row = Math.floor(boxIndex / cols);

    const x = col * boxWidth;
    const y = row * boxHeight;
    const centerX = x + boxWidth / 2;
    let currentY = y + 5;

    // Dashed border box
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.2);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.rect(x, y, boxWidth, boxHeight);
    pdf.setLineDashPattern([], 0);

    // Logo
    const logoWidth = 44;
    const logoHeight = 11;
    pdf.addImage(
      logoDataURL,
      "PNG",
      centerX - logoWidth / 2,
      currentY,
      logoWidth,
      logoHeight
    );
    currentY += logoHeight + 3;

    // Subheading
    pdf.setFontSize(11);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Waste Management System", centerX, currentY, { align: "center" });
    currentY += 7;

    // QR code image (from pre-generated buffer)
    const qrX = centerX - qrSize / 2;
    pdf.addImage(qrDataURLs[i], "PNG", qrX, currentY, qrSize, qrSize);
    currentY += qrSize + 8;

    // UID text
    const displayUid = qr.uid.startsWith("GEN-") ? qr.uid : `GEN-${qr.uid}`;
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`House UID: ${displayUid}`, centerX, currentY, { align: "center" });
    currentY += 7;

    // Website line
    pdf.text("Login & manage at:", centerX, currentY, { align: "center" });
    currentY += 7;

    pdf.setFontSize(12);
    pdf.setTextColor(0, 128, 0);
    pdf.text("www.greenpathindia.in", centerX, currentY, { align: "center" });
  }

  // Return buffer
  const pdfBytes = pdf.output("arraybuffer");
  return Buffer.from(new Uint8Array(pdfBytes));
};
