import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraProps {
  onCapture: (blob: Blob) => void;
  isAnalyzing: boolean;
}

export const Camera: React.FC<CameraProps> = ({ onCapture, isAnalyzing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Tu navegador o el entorno actual no soporta el acceso a la cámara. Prueba abriendo la aplicación en una pestaña nueva.");
      setIsLoading(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: false
      });
      setStream(mediaStream);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Permiso denegado. Por favor, permite el acceso a la cámara y recarga la página. Si estás en el editor, intenta abrir la app en una pestaña nueva.");
      } else {
        setError("No se pudo acceder a la cámara. Intenta abrir la aplicación en una pestaña nueva para evitar restricciones del editor.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err);
      });
    }
  }, [stream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleConfirm = () => {
    if (capturedImage && canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onCapture(blob);
        }
      }, 'image/jpeg');
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
      <AnimatePresence mode="wait">
        {!capturedImage ? (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isLoading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 gap-4">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-zinc-400 text-sm animate-pulse">Iniciando cámara...</p>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 p-8 text-center gap-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-red-400 font-medium text-lg">Error de Cámara</p>
                  <p className="text-zinc-400 text-sm max-w-sm">{error}</p>
                </div>
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors"
                >
                  Abrir en pestaña nueva
                </button>
                <button
                  onClick={startCamera}
                  className="text-zinc-500 text-xs hover:text-zinc-300 underline"
                >
                  Reintentar en esta ventana
                </button>
              </div>
            )}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <button
                onClick={capturePhoto}
                disabled={isAnalyzing || !!error}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
              >
                <div className="w-14 h-14 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                  <CameraIcon className="w-6 h-6 text-zinc-900" />
                </div>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full"
          >
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
              <button
                onClick={handleRetake}
                className="px-6 py-3 rounded-full bg-zinc-800 text-white flex items-center gap-2 hover:bg-zinc-700 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Repetir
              </button>
              <button
                onClick={handleConfirm}
                disabled={isAnalyzing}
                className="px-6 py-3 rounded-full bg-emerald-500 text-white flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Analizar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
