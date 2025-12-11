/**
 * Generate QR Code on canvas element
 * In a real implementation, you would use a library like 'qrcode' or 'qrious'
 */
export function generateQRCode(data: string, canvas: HTMLCanvasElement, size: number = 128): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set canvas size
  canvas.width = size;
  canvas.height = size;

  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // For demo purposes, create a simple pattern that represents a QR code
  // In production, you would use: 
  // import QRCode from 'qrcode';
  // QRCode.toCanvas(canvas, data, { width: size });

  const gridSize = 21; // Standard QR code is 21x21 modules for version 1
  const moduleSize = size / gridSize;

  ctx.fillStyle = '#000000';

  // Create a simple pattern based on the data hash
  const hash = simpleHash(data);
  
  // Draw finder patterns (corners)
  drawFinderPattern(ctx, 0, 0, moduleSize);
  drawFinderPattern(ctx, (gridSize - 7) * moduleSize, 0, moduleSize);
  drawFinderPattern(ctx, 0, (gridSize - 7) * moduleSize, moduleSize);

  // Draw data pattern based on hash
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      // Skip finder patterns and timing patterns
      if (isFinderPattern(i, j, gridSize) || isTimingPattern(i, j, gridSize)) {
        continue;
      }

      // Use hash to determine if module should be filled
      if ((hash + i * j) % 3 === 0) {
        ctx.fillRect(i * moduleSize, j * moduleSize, moduleSize, moduleSize);
      }
    }
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function drawFinderPattern(ctx: CanvasRenderingContext2D, x: number, y: number, moduleSize: number): void {
  // Outer 7x7 border
  ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);
  
  // Inner 5x5 white square
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);
  
  // Inner 3x3 black square
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
}

function isFinderPattern(i: number, j: number, gridSize: number): boolean {
  return (
    (i < 9 && j < 9) || // Top-left
    (i >= gridSize - 8 && j < 9) || // Top-right
    (i < 9 && j >= gridSize - 8) // Bottom-left
  );
}

function isTimingPattern(i: number, j: number, gridSize: number): boolean {
  return (i === 6 && j > 8 && j < gridSize - 8) || (j === 6 && i > 8 && i < gridSize - 8);
}

/**
 * Parse QR code data
 */
export function parseQRData(data: string): any {
  try {
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Validate QR code data structure for household
 */
export function validateHouseholdQR(data: any): boolean {
  return (
    data &&
    typeof data.uid === 'string' &&
    typeof data.headName === 'string' &&
    typeof data.villageId === 'string'
  );
}

/**
 * Validate pre-mapped QR code data structure (from batch generation)
 */
export function validatePreMappedQR(data: any): boolean {
  return (
    data &&
    typeof data.uid === 'string' &&
    typeof data.villageId === 'string' &&
    data.type === 'premapped'
  );
}

/**
 * Convert scanned UID to full database UID (add GEN- prefix if missing)
 */
export function toFullUid(scannedUid: string): string {
  if (scannedUid.startsWith('GEN-')) {
    return scannedUid;
  }
  return `GEN-${scannedUid}`;
}

/**
 * Extract scannable UID from full UID (remove GEN- prefix)
 */
export function getScannableUid(fullUid: string): string {
  return fullUid.replace(/^GEN-/, '');
}
