import { useEffect, useRef } from 'react';
import { generateQRCode } from '@/lib/qr-utils';

interface QRGeneratorProps {
  data: string;
  uid: string;
  headName: string;
  houseNumber: string;
  size?: number;
  className?: string;
}

export function QRCodeGenerator({ 
  data, 
  uid, 
  headName, 
  houseNumber, 
  size = 128,
  className = ""
}: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && data) {
      generateQRCode(data, canvasRef.current, size);
    }
  }, [data, size]);

  return (
    <div className={`border border-gray-200 rounded-lg p-3 text-center ${className}`}>
      <canvas 
        ref={canvasRef}
        className="mx-auto mb-2"
        width={size}
        height={size}
      />
      <p className="text-xs font-medium text-gray-800">{uid}</p>
      <p className="text-xs text-gray-600">{headName}</p>
      <p className="text-xs text-gray-500">{houseNumber}</p>
    </div>
  );
}
