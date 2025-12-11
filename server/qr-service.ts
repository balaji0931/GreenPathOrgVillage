import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { uploadToCloudinary } from './cloudinary';
import bcrypt from 'bcrypt';

export interface HouseholdQRData {
  uid: string;
  headName: string;
  houseNumber: string;
  villageId: string;
  generatorUserId: string;
}

export const generateHouseholdQR = async (data: HouseholdQRData): Promise<{
  qrCodeUrl: string;
  qrCodePublicId: string;
}> => {
  const scannableUid = data.uid.replace(/^GEN-/, '');
  const qrData = JSON.stringify({
    uid: scannableUid,
    headName: data.headName,
    houseNumber: data.houseNumber,
    villageId: data.villageId,
    type: 'household',
    generatedAt: new Date().toISOString(),
  });

  const qrBuffer = await QRCode.toBuffer(qrData, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  const uploadResult = await uploadToCloudinary(qrBuffer, {
    folder: 'greenpath/qr-codes',
    public_id: `qr_${data.uid}_${Date.now()}`,
    resource_type: 'image',
    format: 'png',
  });

  return {
    qrCodeUrl: uploadResult.secure_url,
    qrCodePublicId: uploadResult.public_id,
  };
};

export const generateBulkQRCodesPDF = async (
  households: Array<{
    uid: string;
    headName: string;
    houseNumber: string;
    villageId: string;
    qrCodeUrl?: string;
  }>
): Promise<Buffer> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
    // Fetch logo only once per PDF generation
  const logoUrl = "https://www.greenpathorg.social/logos/png/logo-full-1024x256.png";

  const logoResponse = await fetch(logoUrl);
  const logoArrayBuffer = await logoResponse.arrayBuffer();
  const logoBase64 = Buffer.from(logoArrayBuffer).toString("base64");
  const logoDataURL = `data:image/png;base64,${logoBase64}`;
  const pageWidth = 210;
  const pageHeight = 297;

  const cols = 3;
  const rows = 3;
  const qrSize = 40;

  const boxWidth = pageWidth / cols;  // 70
  const boxHeight = pageHeight / rows; // 99
  const qrCodesPerPage = cols * rows;

  for (let i = 0; i < households.length; i++) {
    const household = households[i];

    if (i > 0 && i % qrCodesPerPage === 0) {
      pdf.addPage();
    }

    const boxIndex = i % qrCodesPerPage;
    const col = boxIndex % cols;
    const row = Math.floor(boxIndex / cols);

    const x = col * boxWidth;
    const y = row * boxHeight;
    const centerX = x + boxWidth / 2;
    let currentY = y + 2;

    // ✅ Dashed box around section
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.2);
    pdf.setLineDashPattern([1, 1]);
    pdf.rect(x, y, boxWidth, boxHeight);
    pdf.setLineDashPattern([]); // Reset line style

    const logoWidth = 40;   
    const logoHeight = 10;       

    pdf.addImage(
      logoDataURL,
      "PNG",
      centerX - logoWidth / 2,
      currentY,
      logoWidth,
      logoHeight
    );

    currentY += logoHeight + 3;


    // ✅ Subheading
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text('Waste Management System', centerX, currentY, { align: 'center' });
    currentY += 6;

    // ✅ QR Code
    const qrX = centerX - qrSize / 2;
    let qrCodeUrl = household.qrCodeUrl;

    try {
      if (!qrCodeUrl) {
        const scannableUid = household.uid.replace(/^GEN-/, '');
        const qrData = JSON.stringify({
          uid: scannableUid,
          headName: household.headName,
          houseNumber: household.houseNumber,
          villageId: household.villageId,
          type: 'household',
        });

        const qrBuffer = await QRCode.toBuffer(qrData, {
          type: 'png',
          width: 200,
          margin: 1,
        });

        qrCodeUrl = 'data:image/png;base64,' + qrBuffer.toString('base64');
      }

      if (qrCodeUrl.startsWith('data:')) {
        pdf.addImage(qrCodeUrl, 'PNG', qrX, currentY, qrSize, qrSize);
      } else {
        const response = await fetch(qrCodeUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataURL = 'data:image/png;base64,' + base64;
          pdf.addImage(dataURL, 'PNG', qrX, currentY, qrSize, qrSize);
        } else {
          throw new Error('Failed to fetch QR code image');
        }
      }

    } catch (error) {
      console.error('QR error for', household.uid, error);
      pdf.setDrawColor(200);
      pdf.setFillColor(245);
      pdf.rect(qrX, currentY, qrSize, qrSize, 'FD');
      pdf.setTextColor(100);
      pdf.setFontSize(8);
      pdf.text('QR Error', centerX, currentY + qrSize / 2, { align: 'center' });
    }

    // ✅ Info text below QR
    currentY += qrSize + 7;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    const displayUid = household.uid.startsWith('GEN-') ? household.uid : `GEN-${household.uid}`;
    pdf.text(`House UID: ${displayUid}`, centerX, currentY, { align: 'center' });
    currentY += 6;
    pdf.text(`Head: ${household.headName}`, centerX, currentY, { align: 'center' });
    currentY += 6;
    pdf.text(`No: ${household.houseNumber}`, centerX, currentY, { align: 'center' });
    currentY += 6;
    pdf.text('Login & manage at: ', centerX, currentY, { align: 'center' });
    currentY += 6;
    pdf.setFontSize(12);
    pdf.setTextColor(0, 128, 0);
    pdf.text('www.greenpathorg.social', centerX, currentY, { align: 'center' });
  }

  try {
    const pdfData = pdf.output('datauristring');
    const base64Data = pdfData.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('Error generating PDF buffer:', error);
    try {
      const pdfBytes = pdf.output('arraybuffer');
      return Buffer.from(new Uint8Array(pdfBytes));
    } catch (fallbackError) {
      console.error('Fallback PDF generation failed:', fallbackError);
      throw new Error('Failed to generate PDF');
    }
  }
};

export const generateGeneratorCredentials = (uid: string): {
  userId: string;
  password: string;
  hashedPassword: string;
} => {
  const userId = uid.startsWith('GEN-') ? uid : `GEN-${uid}`;
  const password = userId;
  const hashedPassword = bcrypt.hashSync(password, 10);

  return {
    userId,
    password,
    hashedPassword,
  };
};

// Helper to extract scannable UID (without GEN- prefix) from full UID
export const getScannableUid = (fullUid: string): string => {
  return fullUid.replace(/^GEN-/, '');
};

// Helper to convert scanned UID to full database UID (with GEN- prefix)
export const toFullUid = (scannedUid: string): string => {
  if (scannedUid.startsWith('GEN-')) {
    return scannedUid;
  }
  return `GEN-${scannedUid}`;
};

// Generate pre-mapped QR code (encodes only {villageId}-H{houseId} for scanning)
export const generatePreMappedQR = async (uid: string, villageId: string): Promise<{
  qrCodeUrl: string;
  qrCodePublicId: string;
}> => {
  const scannableUid = getScannableUid(uid);
  const qrData = JSON.stringify({
    uid: scannableUid,
    villageId,
    type: 'premapped',
    generatedAt: new Date().toISOString(),
  });

  const qrBuffer = await QRCode.toBuffer(qrData, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  const uploadResult = await uploadToCloudinary(qrBuffer, {
    folder: 'greenpath/qr-codes/premapped',
    public_id: `premapped_${uid}_${Date.now()}`,
    resource_type: 'image',
    format: 'png',
  });

  return {
    qrCodeUrl: uploadResult.secure_url,
    qrCodePublicId: uploadResult.public_id,
  };
};

// Generate PDF for pre-mapped QR codes (simpler layout - just UID, no household info)
export const generatePreMappedQRCodesPDF = async (
  qrCodes: Array<{
    uid: string;
    villageId: string;
    qrCodeUrl: string;
  }>
): Promise<Buffer> => {
  const pdf = new jsPDF("p", "mm", "a4");

  // Load logo only once
  const logoUrl = "https://www.greenpathorg.social/logos/png/logo-full-1024x256.png";
  const logoResponse = await fetch(logoUrl);
  const logoArrayBuffer = await logoResponse.arrayBuffer();
  const logoBase64 = Buffer.from(logoArrayBuffer).toString("base64");
  const logoDataURL = `data:image/png;base64,${logoBase64}`;

  // Layout (exact same as first PDF)
  const pageWidth = 210;
  const pageHeight = 297;

  const cols = 3;
  const rows = 3;
  const qrSize = 45;

  const boxWidth = pageWidth / cols;  // 70mm
  const boxHeight = pageHeight / rows; // 99mm
  const qrCodesPerPage = cols * rows;

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
    pdf.setLineDashPattern([1, 1]);
    pdf.rect(x, y, boxWidth, boxHeight);
    pdf.setLineDashPattern([]);

    // Logo (same size as bulk PDF)
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

    // QR code
    const qrX = centerX - qrSize / 2;
    try {
      const response = await fetch(qr.qrCodeUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const dataURL = "data:image/png;base64," + base64;
        pdf.addImage(dataURL, "PNG", qrX, currentY, qrSize, qrSize);
      } else {
        throw new Error("Failed to fetch QR");
      }
    } catch (err) {
      console.error("QR error for", qr.uid, err);
      pdf.setDrawColor(200);
      pdf.setFillColor(245);
      pdf.rect(qrX, currentY, qrSize, qrSize, "FD");
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text("QR Error", centerX, currentY + qrSize / 2, { align: "center" });
    }

    currentY += qrSize + 8;

    // UID (same styling as bulk)
    const displayUid = qr.uid.startsWith("GEN-") ? qr.uid : `GEN-${qr.uid}`;

    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`House UID: ${displayUid}`, centerX, currentY, { align: "center" });
    currentY += 7;

    // No head name or house number (as you wanted)

    // Website line
    pdf.text("Login & manage at:", centerX, currentY, { align: "center" });
    currentY += 7;

    pdf.setFontSize(12);
    pdf.setTextColor(0, 128, 0);
    pdf.text("www.greenpathorg.social", centerX, currentY, { align: "center" });
  }

  // Return buffer
  try {
    const pdfData = pdf.output("datauristring");
    const base64Data = pdfData.split(",")[1];
    return Buffer.from(base64Data, "base64");
  } catch (error) {
    console.error("Error generating PDF buffer:", error);
    const pdfBytes = pdf.output("arraybuffer");
    return Buffer.from(new Uint8Array(pdfBytes));
  }
};
