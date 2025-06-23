// Icon generation utility for PWA
export function generateIcon(size: number): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Background circle
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Leaf shape
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.95;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const leafSize = size * 0.3;
    
    ctx.beginPath();
    ctx.moveTo(centerX - leafSize, centerY - leafSize * 1.2);
    ctx.quadraticCurveTo(centerX, centerY - leafSize * 1.5, centerX + leafSize, centerY - leafSize * 1.2);
    ctx.quadraticCurveTo(centerX + leafSize * 1.2, centerY - leafSize * 0.5, centerX + leafSize * 1.2, centerY);
    ctx.quadraticCurveTo(centerX + leafSize, centerY + leafSize * 0.8, centerX, centerY + leafSize * 1.2);
    ctx.quadraticCurveTo(centerX - leafSize, centerY + leafSize * 0.8, centerX - leafSize * 1.2, centerY);
    ctx.quadraticCurveTo(centerX - leafSize * 1.2, centerY - leafSize * 0.5, centerX - leafSize, centerY - leafSize * 1.2);
    ctx.fill();

    // Leaf veins
    ctx.strokeStyle = '#16a34a';
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = size * 0.006;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - leafSize * 1.2);
    ctx.lineTo(centerX, centerY + leafSize * 1.2);
    ctx.stroke();

    // Convert to blob
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
}

export async function generateAllIcons() {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  
  for (const size of sizes) {
    const blob = await generateIcon(size);
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `icon-${size}x${size}.png`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}