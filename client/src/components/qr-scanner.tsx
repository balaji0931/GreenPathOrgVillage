import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [noQrMessage, setNoQrMessage] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let qrScanner: QrScanner | null = null;
    let messageTimer: NodeJS.Timeout;
    let isDestroyed = false;

    const initializeScanner = async () => {
      if (!videoRef.current || isDestroyed) return;

      try {
        qrScanner = new QrScanner(
          videoRef.current,
          (result) => {
            console.log('QR Code detected:', result.data);
            isDestroyed = true;
            if (qrScanner) {
              qrScanner.destroy();
            }
            onScan(result.data);
          },
          {
            onDecodeError: (error) => {
              // Show message if no QR code found after some time
              if (!noQrMessage && !isDestroyed) {
                setNoQrMessage(true);
                clearTimeout(messageTimer);
                messageTimer = setTimeout(() => {
                  if (!isDestroyed) {
                    setNoQrMessage(false);
                  }
                }, 3000);
              }
            },
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment',
            maxScansPerSecond: 3,
            calculateScanRegion: (video) => {
              // Define a smaller scan region in the center of the video
              const smallerSize = Math.min(video.videoWidth, video.videoHeight) * 0.6;
              const x = (video.videoWidth - smallerSize) / 2;
              const y = (video.videoHeight - smallerSize) / 2;
              return {
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(smallerSize),
                height: Math.round(smallerSize),
              };
            }
          }
        );

        await qrScanner.start();
        if (!isDestroyed) {
          setIsScanning(true);
        }
      } catch (error) {
        console.error('Error starting QR scanner:', error);
        if (!isDestroyed) {
          toast({
            title: "Camera Error",
            description: "Unable to access camera. Please check permissions.",
            variant: "destructive",
          });
        }
      }
    };

    // Small delay to ensure video element is ready
    const timer = setTimeout(() => {
      if (videoRef.current && !isDestroyed) {
        initializeScanner();
      }
    }, 100);

    return () => {
      isDestroyed = true;
      clearTimeout(timer);
      clearTimeout(messageTimer);
      if (qrScanner) {
        qrScanner.destroy();
      }
    };
  }, [onScan, toast]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        
        {/* Scanning overlay with highlight box */}
        <div className="absolute inset-4 border-2 border-white rounded-lg">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500"></div>
        </div>
        
        {/* Scanning line animation */}
        <div className="absolute inset-4 flex items-center justify-center">
          <div className="w-full h-0.5 bg-green-500 animate-pulse"></div>
        </div>

        {/* Scanning status */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm">
          {isScanning ? (
            <div className="flex items-center space-x-2">
              <div className="animate-pulse w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Scanning for QR code...</span>
            </div>
          ) : (
            "Starting camera..."
          )}
        </div>

        {/* No QR code message */}
        {noQrMessage && isScanning && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 bg-opacity-90 text-white px-4 py-2 rounded-lg text-sm">
            Place QR code inside the box
          </div>
        )}
      </div>
      
      <div className="mt-4 space-y-2">
        <p className="text-sm text-gray-600 text-center">
          Hold your device steady and position the QR code inside the box
        </p>
        
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-8"
          >
            <X className="mr-2" size={16} />
            Cancel
          </Button>
        </div>
      </div>
      
      {!isScanning && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-2"></div>
            <p className="text-sm">Starting camera...</p>
          </div>
        </div>
      )}
    </div>
  );
}