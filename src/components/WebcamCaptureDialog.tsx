import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface WebcamCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

export function WebcamCaptureDialog({ open, onOpenChange, onCapture }: WebcamCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Camera access denied. Please check browser permissions.');
      } else {
        toast.error('Could not start camera. Make sure your device has a camera.');
      }
      onOpenChange(false);
    }
  }, [facingMode, onOpenChange]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
      setCapturedImage(null);
      // Small delay to let dialog render
      const timer = setTimeout(() => startCamera(), 100);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
      setCapturedImage(null);
    }
  }, [open, startCamera, stopCamera]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (!capturedImage || !canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          onOpenChange(false);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const flipCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    if (isStreaming) {
      startCamera(newFacing);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Take a Photo
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-[4/3] overflow-hidden">
          {!capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
            />
          ) : (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 flex items-center justify-center gap-3">
          {!capturedImage ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={flipCamera}
                className="rounded-full w-10 h-10"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                onClick={takePhoto}
                disabled={!isStreaming}
                className="rounded-full w-16 h-16 gradient-primary"
              >
                <Camera className="w-6 h-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full w-10 h-10"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={retake}
                className="flex-1 gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retake
              </Button>
              <Button
                onClick={confirmPhoto}
                className="flex-1 gap-2 gradient-primary"
              >
                <Check className="w-4 h-4" />
                Use Photo
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
