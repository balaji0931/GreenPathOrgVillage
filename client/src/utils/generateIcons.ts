
// Icon generation utility for PWA
export function generateIcon(size: number): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Green background
    ctx.fillStyle = '#6ba344';
    ctx.fillRect(0, 0, size, size);

    // White leaf shape
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = size * 0.08;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    const centerX = size / 2;
    const centerY = size / 2;
    const leafSize = size * 0.35;
    
    // Create the curved leaf shape similar to your image
    ctx.beginPath();
    
    // Start from top
    ctx.moveTo(centerX + leafSize * 0.3, centerY - leafSize * 1.1);
    
    // Right curve
    ctx.quadraticCurveTo(
        centerX + leafSize * 1.2, centerY - leafSize * 0.8,
        centerX + leafSize * 1.1, centerY - leafSize * 0.2
    );
    
    ctx.quadraticCurveTo(
        centerX + leafSize * 1.0, centerY + leafSize * 0.4,
        centerX + leafSize * 0.6, centerY + leafSize * 0.8
    );
    
    // Bottom curve
    ctx.quadraticCurveTo(
        centerX + leafSize * 0.2, centerY + leafSize * 1.0,
        centerX - leafSize * 0.2, centerY + leafSize * 0.9
    );
    
    // Left curve
    ctx.quadraticCurveTo(
        centerX - leafSize * 0.8, centerY + leafSize * 0.6,
        centerX - leafSize * 0.9, centerY + leafSize * 0.1
    );
    
    ctx.quadraticCurveTo(
        centerX - leafSize * 0.8, centerY - leafSize * 0.4,
        centerX - leafSize * 0.4, centerY - leafSize * 0.8
    );
    
    // Back to top
    ctx.quadraticCurveTo(
        centerX - leafSize * 0.1, centerY - leafSize * 1.0,
        centerX + leafSize * 0.3, centerY - leafSize * 1.1
    );
    
    ctx.fill();
    
    // Add the inner curved line detail
    ctx.strokeStyle = '#6ba344';
    ctx.lineWidth = size * 0.025;
    ctx.beginPath();
    ctx.moveTo(centerX - leafSize * 0.6, centerY - leafSize * 0.1);
    ctx.quadraticCurveTo(
        centerX - leafSize * 0.2, centerY + leafSize * 0.1,
        centerX + leafSize * 0.4, centerY + leafSize * 0.2
    );
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
