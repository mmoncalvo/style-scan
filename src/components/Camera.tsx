import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

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

  // Live Diagnostics State
  const [diagnostics, setDiagnostics] = useState({
    lighting: false,
    position: false,
    gaze: false,
    sharpness: false
  });

  // Estabilidad de diagnósticos para evitar parpadeos
  const [stableDiagnostics, setStableDiagnostics] = useState({
    lighting: false,
    position: false,
    gaze: false,
    sharpness: false
  });

  const stabilityCounters = useRef({
    lighting: 0,
    position: 0,
    gaze: 0,
    sharpness: 0
  });

  const STABILITY_THRESHOLD = 5; // Frames necesarios para cambiar estado

  const updateStableDiagnostic = useCallback((key: keyof typeof diagnostics, value: boolean) => {
    setDiagnostics(prev => {
      if (value === prev[key]) {
        stabilityCounters.current[key]++;
        if (stabilityCounters.current[key] >= STABILITY_THRESHOLD) {
          setStableDiagnostics(stable => {
            if (stable[key] !== value) return { ...stable, [key]: value };
            return stable;
          });
        }
        return prev;
      } else {
        stabilityCounters.current[key] = 0;
        return { ...prev, [key]: value };
      }
    });
  }, [STABILITY_THRESHOLD]);

  const [isLandmarkerReady, setIsLandmarkerReady] = useState(false);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>();
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    let active = true;
    const initLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        if (!active) return;
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        if (!active) {
            landmarker.close();
            return;
        }
        landmarkerRef.current = landmarker;
        setIsLandmarkerReady(true);
      } catch (e) {
        console.error("Failed to initialize face landmarker:", e);
      }
    };
    initLandmarker();
    return () => {
      active = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  const processFrame = useCallback(() => {
    if (capturedImage) return;
    
    if (videoRef.current && landmarkerRef.current) {
      const video = videoRef.current;
      
      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        
        try {
          const results = landmarkerRef.current.detectForVideo(video, performance.now());
          
          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            landmarks.forEach(p => {
              if (p.x < minX) minX = p.x;
              if (p.x > maxX) maxX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.y > maxY) maxY = p.y;
            });
            
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const width = maxX - minX;
            const height = maxY - minY;
            
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;
            const videoAR = vw / vh;
            const isLandscape = videoAR > 1.2;

            // 1. Posición y Tamaño Adaptativos
            // En Landscape, el rostro ocupa menos % del ancho total.
            // En Portrait, el rostro ocupa más % del ancho.
            // La ALTURA (height) es la métrica más estable para el óvalo visual.
            const isCenteredX = isLandscape 
              ? (centerX > 0.40 && centerX < 0.60) // Más permisivo en horizontal para laptops
              : (centerX > 0.42 && centerX < 0.58);
            
            const isCenteredY = centerY > 0.35 && centerY < 0.60;
            
            // Altura ideal del rostro respecto al frame para llenar el óvalo
            const isGoodHeight = height > 0.55 && height < 0.85;
            // Ancho adaptativo: en laptop (landscape) el rostro es ~25-40% del ancho, en móvil es ~50-70%
            const isGoodWidth = isLandscape
              ? (width > 0.25 && width < 0.50)
              : (width > 0.45 && width < 0.80);
            
            updateStableDiagnostic('position', isCenteredX && isCenteredY && isGoodHeight && isGoodWidth);
            
            // 2. Orientación (Gaze/Look Straight)
            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
              const matrix = results.facialTransformationMatrixes[0].data;
              const yaw = Math.atan2(-matrix[8], Math.sqrt(matrix[9]*matrix[9] + matrix[10]*matrix[10])) * (180 / Math.PI);
              const pitch = Math.atan2(matrix[9], matrix[10]) * (180 / Math.PI);
              // Un poco más permisivo con el pitch (inclinación) para laptops que suelen estar abajo
              updateStableDiagnostic('gaze', Math.abs(yaw) < 15 && Math.abs(pitch) < 20);
            } else {
              updateStableDiagnostic('gaze', false);
            }

            // 3. Iluminación y Enfoque (Sharpness) con normalización de resolución
            if (canvasRef.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                const sampleSize = 200;
                if (canvas.width !== sampleSize) {
                  canvas.width = sampleSize;
                  canvas.height = sampleSize;
                }

                // Muestreamos la zona de la frente/mejillas
                const sx = Math.max(0, Math.min(vw - sampleSize, centerX * vw - sampleSize / 2));
                const sy = Math.max(0, Math.min(vh - sampleSize, centerY * vh - sampleSize / 2));
                
                ctx.drawImage(video, sx, sy, sampleSize, sampleSize, 0, 0, sampleSize, sampleSize);
                const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
                const data = imageData.data;
                
                let bSum = 0;
                const gray = new Uint8Array(sampleSize * sampleSize);
                for(let i=0; i<data.length; i+=4) {
                  const v = data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114;
                  bSum += v;
                  gray[i/4] = v;
                }
                
                const avgB = bSum / (sampleSize * sampleSize);
                updateStableDiagnostic('lighting', avgB > 75 && avgB < 225);

                // Laplacian Variance para Sharpness
                let lapSum = 0;
                let lapSqSum = 0;
                const count = (sampleSize - 2) * (sampleSize - 2);
                
                for (let y = 1; y < sampleSize - 1; y++) {
                  for (let x = 1; x < sampleSize - 1; x++) {
                    const idx = y * sampleSize + x;
                    const lap = gray[idx - sampleSize] + gray[idx - 1] - 4 * gray[idx] + gray[idx + 1] + gray[idx + sampleSize];
                    lapSum += lap;
                    lapSqSum += lap * lap;
                  }
                }
                
                const lMean = lapSum / count;
                const lVar = (lapSqSum / count) - (lMean * lMean);
                
                // Normalización de Sharpness: Cámaras de menor resolución (720p) generan menos varianza.
                // Escalamos el umbral basado en la resolución vertical.
                // 1080p es nuestro estándar (factor 1.0). 720p sería factor 0.66.
                const sharpnessFactor = Math.min(1.2, Math.max(0.6, vh / 1080));
                const dynamicThreshold = 55 * sharpnessFactor;
                
                updateStableDiagnostic('sharpness', lVar > dynamicThreshold);
              }
            }
          } else {
            updateStableDiagnostic('position', false);
            updateStableDiagnostic('gaze', false);
            updateStableDiagnostic('lighting', false);
            updateStableDiagnostic('sharpness', false);
          }
        } catch (e) {
          console.error("Error in diagnostics:", e);
        }
      }
    }
    
    requestRef.current = requestAnimationFrame(processFrame);
  }, [capturedImage, updateStableDiagnostic]);

  useEffect(() => {
    if (stream && !capturedImage && isLandmarkerReady) {
      requestRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [stream, capturedImage, isLandmarkerReady, processFrame]);

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
          width: { ideal: 3840 },
          height: { ideal: 2160 }
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
    const timer = setTimeout(() => {
      startCamera();
    }, 1000);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [startCamera]);

  const handleVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
      node.play().catch(err => {
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
        // Mirror the image horizontally to match the preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Reset transformation for future drawings
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleConfirm = async () => {
    if (capturedImage) {
      try {
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        onCapture(blob);
      } catch (err) {
        console.error("Error creating blob from image:", err);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setDiagnostics({ lighting: false, position: false, gaze: false, sharpness: false });
    setStableDiagnostics({ lighting: false, position: false, gaze: false, sharpness: false });
    stabilityCounters.current = { lighting: 0, position: 0, gaze: 0, sharpness: 0 };
    lastVideoTimeRef.current = -1;
  };

  const allGood = stableDiagnostics.lighting && stableDiagnostics.position && stableDiagnostics.gaze && stableDiagnostics.sharpness;

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] sm:aspect-[4/5] max-h-[85vh] bg-zinc-100/90 dark:bg-zinc-900/90 rounded-lg overflow-hidden border border-zinc-400 dark:border-zinc-800 shadow-2xl">
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
              ref={handleVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {isLoading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100/90 dark:bg-zinc-900/90 gap-4 z-20">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-zinc-400 text-sm animate-pulse">Iniciando cámara...</p>
              </div>
            )}
            
            {!isLoading && !error && (
              <>
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center pt-6 sm:pt-10 z-20 overflow-hidden">
                  <div className="flex gap-2 sm:gap-4 bg-black/20 backdrop-blur-xl p-2 rounded-lg border border-white/10 shadow-2xl">
                    <DiagnosticTag label="Iluminación" active={stableDiagnostics.lighting} />
                    <DiagnosticTag label="Enfoque" active={stableDiagnostics.sharpness} />
                    <DiagnosticTag label="Posición" active={stableDiagnostics.position} />
                    <DiagnosticTag label="Mirada" active={stableDiagnostics.gaze} />
                  </div>
                </div>
                
                {/* Oval Guía - Centrado absoluto y aumentado de tamaño para forzar cercanía */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className={`w-[280px] h-[380px] sm:w-[340px] sm:h-[460px] rounded-full border-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] transition-colors duration-300 ${allGood ? 'border-emerald-400/50' : 'border-white/30'}`} />
                </div>
              </>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-6 z-20 bg-zinc-100/90 dark:bg-zinc-900/90">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-red-400 font-medium text-lg">Error de Cámara</p>
                  <p className="text-zinc-400 text-sm max-w-sm">{error}</p>
                </div>
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
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
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
              <button
                onClick={capturePhoto}
                disabled={isAnalyzing || !!error || !allGood}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:bg-gray-300"
              >
                <div className="w-14 h-14 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                  <CameraIcon className={`w-6 h-6 ${!allGood ? 'text-gray-400' : 'text-zinc-900'}`} />
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
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 z-20">
              <button
                onClick={handleRetake}
                className="px-6 py-3 rounded-lg bg-zinc-800 text-white flex items-center gap-2 hover:bg-zinc-700 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Repetir
              </button>
              <button
                onClick={handleConfirm}
                disabled={isAnalyzing}
                className="px-6 py-3 rounded-lg bg-emerald-500 text-white flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
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

// Componente auxiliar para los tags de diagnóstico con diseño premium
const DiagnosticTag: React.FC<{ label: string, active: boolean }> = ({ label, active }) => (
  <div className={`
    flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-500
    ${active 
      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
      : 'bg-white/5 border-white/10 text-white/40'}
    border backdrop-blur-md
  `}>
    <span className="text-[10px] font-bold tracking-widest uppercase">{label}</span>
  </div>
);
