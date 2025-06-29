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
  const qrData = JSON.stringify({
    uid: data.uid,
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
    let currentY = y + 10;

    // ✅ Dashed box around section
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.2);
    pdf.setLineDashPattern([1, 1]);
    pdf.rect(x, y, boxWidth, boxHeight);
    pdf.setLineDashPattern([]); // Reset line style

    // ✅ Heading
    pdf.setFontSize(17);
    pdf.setTextColor(0, 128, 0);
    pdf.text('GreenPath', centerX, currentY, { align: 'center' });
    currentY += 7;

    // ✅ Subheading
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text('Waste Management System', centerX, currentY, { align: 'center' });
    currentY += 7;

    // ✅ QR Code
    const qrX = centerX - qrSize / 2;
    let qrCodeUrl = household.qrCodeUrl;

    try {
      if (!qrCodeUrl) {
        const qrData = JSON.stringify({
          uid: household.uid,
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
    currentY += qrSize + 6;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.text(`HouseUID: ${household.uid}`, centerX, currentY, { align: 'center' });
    currentY += 6;
    pdf.text(`Head: ${household.headName}`, centerX, currentY, { align: 'center' });
    currentY += 6;
    pdf.text(`No: ${household.houseNumber}`, centerX, currentY, { align: 'center' });
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
  const userId = `GEN-${uid}`;
  const password = userId;
  const hashedPassword = bcrypt.hashSync(password, 10);

  return {
    userId,
    password,
    hashedPassword,
  };
};
