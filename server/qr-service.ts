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

/**
 * Generate QR code for a household
 */
export const generateHouseholdQR = async (data: HouseholdQRData): Promise<{
  qrCodeUrl: string;
  qrCodePublicId: string;
}> => {
  // Create QR code data string
  const qrData = JSON.stringify({
    uid: data.uid,
    headName: data.headName,
    houseNumber: data.houseNumber,
    villageId: data.villageId,
    type: 'household',
    generatedAt: new Date().toISOString(),
  });

  // Generate QR code as buffer
  const qrBuffer = await QRCode.toBuffer(qrData, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  // Upload to Cloudinary
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

/**
 * Generate bulk QR codes PDF
 */
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
  
  // Grid settings for 3x4 layout (12 QR codes per page)
  const cols = 3;
  const rows = 4;
  const qrSize = 45;
  const spacing = 15;
  const margin = 20;
  const startX = margin;
  const startY = margin;
  const qrCodesPerPage = cols * rows; // 12 QR codes per page

  for (let i = 0; i < households.length; i++) {
    const household = households[i];
    
    // Add new page after every 12 QR codes (except for the first page)
    if (i > 0 && i % qrCodesPerPage === 0) {
      pdf.addPage();
    }

    // Calculate position on current page
    const pagePosition = i % qrCodesPerPage;
    const col = pagePosition % cols;
    const row = Math.floor(pagePosition / cols);
    
    const x = startX + col * (qrSize + spacing);
    const y = startY + row * (qrSize + 30); // Extra space for text

    try {
      // Use existing QR code URL or generate placeholder
      let qrCodeUrl = household.qrCodeUrl;
      
      if (!qrCodeUrl) {
        // Generate temporary QR code for households without one
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

      // Add QR code to PDF
      if (qrCodeUrl.startsWith('data:')) {
        pdf.addImage(qrCodeUrl, 'PNG', x, y, qrSize, qrSize);
      } else {
        // For Cloudinary URLs, fetch and convert
        const response = await fetch(qrCodeUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataURL = 'data:image/png;base64,' + base64;
          pdf.addImage(dataURL, 'PNG', x, y, qrSize, qrSize);
        } else {
          throw new Error('Failed to fetch QR code image');
        }
      }

      // Add household information below QR code
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.text(household.uid, x + qrSize/2, y + qrSize + 6, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.text(household.headName, x + qrSize/2, y + qrSize + 12, { align: 'center' });
      pdf.text(`House: ${household.houseNumber}`, x + qrSize/2, y + qrSize + 18, { align: 'center' });
      
    } catch (error) {
      console.error('Error processing QR code for household:', household.uid, error);
      
      // Draw error placeholder
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(245, 245, 245);
      pdf.rect(x, y, qrSize, qrSize, 'FD');
      
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      pdf.text('QR Error', x + qrSize/2, y + qrSize/2, { align: 'center' });
      pdf.text(household.uid, x + qrSize/2, y + qrSize + 6, { align: 'center' });
      pdf.text(household.headName, x + qrSize/2, y + qrSize + 12, { align: 'center' });
    }
  }

  // Generate PDF as buffer using uint8array method for better compatibility
  try {
    const pdfData = pdf.output('datauristring');
    const base64Data = pdfData.split(',')[1];
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF buffer:', error);
    // Fallback method
    try {
      const pdfBytes = pdf.output('arraybuffer');
      return Buffer.from(new Uint8Array(pdfBytes));
    } catch (fallbackError) {
      console.error('Fallback PDF generation failed:', fallbackError);
      throw new Error('Failed to generate PDF');
    }
  }
};

/**
 * Generate generator account credentials
 */
export const generateGeneratorCredentials = (uid: string): {
  userId: string;
  password: string;
  hashedPassword: string;
} => {
  const userId = `GEN-${uid}`;
  const password = userId; // Password same as user ID
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  return {
    userId,
    password,
    hashedPassword,
  };
};