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
  const [isLandmarkerReady, setIsLandmarkerReady] = useState(false);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef<number | null>(null);

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

  const STABILITY_THRESHOLD = 12; // ~400ms a 30fps para asegurar que el usuario esté quieto

  const updateStableDiagnostic = useCallback((key: keyof typeof diagnostics, value: boolean) => {
    setDiagnostics(prev => ({ ...prev, [key]: value }));
    
    if (value) {
      stabilityCounters.current[key]++;
      if (stabilityCounters.current[key] >= STABILITY_THRESHOLD) {
        setStableDiagnostics(prev => {
          if (prev[key]) return prev;
          return { ...prev, [key]: true };
        });
      }
    } else {
      stabilityCounters.current[key] = 0;
      setStableDiagnostics(prev => {
        if (!prev[key]) return prev;
        return { ...prev, [key]: false };
      });
    }
  }, []);

  useEffect(() => {
    async function initLandmarker() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setIsLandmarkerReady(true);
      } catch (e) {
        console.error("Failed to initialize FaceLandmarker:", e);
        setError("Error al inicializar el detector facial.");
      }
    }
    initLandmarker();
    return () => {
      landmarkerRef.current?.close();
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
            
            // Extraer puntos clave para un cálculo más preciso
            // https://storage.googleapis.com/mediapipe-assets/documentation/face_grid_points.png
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const noseTip = landmarks[1];
            const chin = landmarks[152];
            const forehead = landmarks[10];

            // Cálculo de dimensiones del rostro
            const faceWidth = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2));
            const faceHeight = Math.sqrt(Math.pow(chin.x - forehead.x, 2) + Math.pow(chin.y - forehead.y, 2));
            const centerX = (leftEye.x + rightEye.x) / 2;
            const centerY = (forehead.y + chin.y) / 2;
            
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;
            const isLandscape = vw > vh;

            // 1. Posición y Distancia (Tamaño)
            // Queremos que el rostro ocupe una parte significativa pero no todo el frame
            const isCenteredX = centerX > 0.45 && centerX < 0.55;
            const isCenteredY = centerY > 0.40 && centerY < 0.60;
            
            // El rostro debe tener un tamaño "ideal" para garantizar resolución en el análisis
            // En vertical (móvil), el rostro debería ocupar ~50-70% de la altura
            // En horizontal (laptop), el rostro debería ocupar ~40-60% de la altura
            const idealHeightMin = isLandscape ? 0.45 : 0.50;
            const idealHeightMax = isLandscape ? 0.70 : 0.85;
            const isGoodDistance = faceHeight > idealHeightMin && faceHeight < idealHeightMax;

            updateStableDiagnostic('position', isCenteredX && isCenteredY && isGoodDistance);
            
            // 2. Orientación (Gaze/Tilt)
            if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
              const matrix = results.facialTransformationMatrixes[0].data;
              // Rotación en radianes convertida a grados
              const yaw = Math.atan2(-matrix[8], Math.sqrt(matrix[9]*matrix[9] + matrix[10]*matrix[10])) * (180 / Math.PI);
              const pitch = Math.atan2(matrix[9], matrix[10]) * (180 / Math.PI);
              const roll = Math.atan2(matrix[4], matrix[0]) * (180 / Math.PI);

              // Tolerancias estrictas para asegurar un buen escaneo
              const isLookingStraight = Math.abs(yaw) < 12 && Math.abs(pitch) < 15 && Math.abs(roll) < 10;
              updateStableDiagnostic('gaze', isLookingStraight);
            }

            // 3. Iluminación y Sharpness Pro (Muestreo Multi-zona)
            if (canvasRef.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                const sampleSize = 160;
                if (canvas.width !== sampleSize) {
                  canvas.width = sampleSize;
                  canvas.height = sampleSize;
                }

                // Muestreamos el área de los ojos/entrecejo para el enfoque, ya que tiene más contraste.
                // Usamos el punto 168 (glabella/entrecejo) como ancla.
                const glabella = landmarks[168] || noseTip;
                const sx = Math.max(0, Math.min(vw - sampleSize, glabella.x * vw - sampleSize / 2));
                const sy = Math.max(0, Math.min(vh - sampleSize, glabella.y * vh - sampleSize / 2));
                
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
                // Iluminación óptima: 80-230. Expandimos un poco el rango superior.
                updateStableDiagnostic('lighting', avgB > 80 && avgB < 230);

                // Cálculo de Varianza Laplaciana optimizado
                let lapSqSum = 0;
                const count = (sampleSize - 2) * (sampleSize - 2);
                
                for (let y = 1; y < sampleSize - 1; y++) {
                  const row = y * sampleSize;
                  for (let x = 1; x < sampleSize - 1; x++) {
                    const idx = row + x;
                    const lap = gray[idx - sampleSize] + gray[idx - 1] - 4 * gray[idx] + gray[idx + 1] + gray[idx + sampleSize];
                    lapSqSum += lap * lap;
                  }
                }
                
                const variance = lapSqSum / count;
                
                // Umbral dinámico mejorado.
                // Reducimos la base de 45 a 32 para ser menos frustrante pero mantener calidad.
                // El resFactor compensa la pérdida de nitidez por pixel en resoluciones altas.
                const resFactor = Math.sqrt((vw * vh) / (1920 * 1080));
                const dynamicThreshold = 32 * Math.max(0.7, Math.min(1.4, resFactor));
                
                updateStableDiagnostic('sharpness', variance > dynamicThreshold);
              }
            }
          } else {
            // Resetear diagnósticos si no hay rostro
            ['position', 'gaze', 'lighting', 'sharpness'].forEach(k => updateStableDiagnostic(k as any, false));
          }
        } catch (e) {
          console.error("Error in diagnostics loop:", e);
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
      setError("Tu navegador no soporta el acceso a la cámara. Intenta con una versión actualizada.");
      setIsLoading(false);
      return;
    }

    try {
      // Intentar obtener la resolución máxima posible
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { min: 640, ideal: 1920, max: 3840 },
          height: { min: 480, ideal: 1080, max: 2160 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Intentar aplicar configuraciones avanzadas si el navegador lo permite
      const track = mediaStream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities();
        const settings: MediaTrackSettings = {};
        
        // Preferir enfoque continuo si está disponible
        if ('focusMode' in capabilities && (capabilities as any).focusMode.includes('continuous')) {
          (settings as any).focusMode = 'continuous';
        }
        
        if (Object.keys(settings).length > 0) {
          try {
            await track.applyConstraints({ advanced: [settings] as any });
          } catch (e) {
            console.warn("Could not apply advanced constraints:", e);
          }
        }
      }

      setStream(mediaStream);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Permiso denegado. Por favor, permite el acceso a la cámara.");
      } else {
        setError("No se pudo acceder a la cámara. Verifica que no esté siendo usada por otra aplicación.");
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

  const capturePhoto = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Aseguramos que el canvas tenga exactamente la resolución del stream de video
      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (ctx) {
        // Mejorar calidad de escalado si fuera necesario (aunque aquí es 1:1)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Espejar la imagen para que coincida con lo que el usuario ve
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        // Usar toBlob en lugar de toDataURL para mejor manejo de memoria y calidad
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setCapturedImage(url);
          }
        }, 'image/jpeg', 0.95); // Aumentamos calidad a 0.95
      }
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (capturedImage) {
      try {
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        onCapture(blob);
      } catch (err) {
        console.error("Error creating blob from image:", err);
      }
    }
  }, [capturedImage, onCapture]);

  const handleRetake = () => {
    setCapturedImage(null);
    setDiagnostics({ lighting: false, position: false, gaze: false, sharpness: false });
    setStableDiagnostics({ lighting: false, position: false, gaze: false, sharpness: false });
    stabilityCounters.current = { lighting: 0, position: 0, gaze: 0, sharpness: 0 };
    lastVideoTimeRef.current = -1;
  };

  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);

  const allGood = stableDiagnostics.lighting && stableDiagnostics.position && stableDiagnostics.gaze && stableDiagnostics.sharpness;

  useEffect(() => {
    if (allGood && !capturedImage) {
      if (countdown === null) {
        setCountdown(3);
        countdownTimer.current = setInterval(() => {
          setCountdown(prev => {
            if (prev === 1) {
              clearInterval(countdownTimer.current!);
              capturePhoto();
              return null;
            }
            return prev ? prev - 1 : null;
          });
        }, 800);
      }
    } else {
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
      setCountdown(null);
    }
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [allGood, capturedImage, capturePhoto]);

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] sm:aspect-[4/5] max-h-[85vh] bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
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
            
            {/* Capa de Gradiente para UI */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

            {isLoading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 gap-4 z-50">
                <div className="relative">
                  <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
                  <div className="absolute inset-0 blur-lg bg-emerald-500/20 animate-pulse" />
                </div>
                <p className="text-zinc-400 text-sm font-medium tracking-wide">CALIBRANDO SENSOR...</p>
              </div>
            )}
            
            {!isLoading && !error && (
              <>
                <div className="absolute top-6 inset-x-0 flex justify-center z-30 px-4">
                  <div className="flex flex-wrap justify-center gap-2 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                    <DiagnosticTag label="Luz" active={stableDiagnostics.lighting} />
                    <DiagnosticTag label="Enfoque" active={stableDiagnostics.sharpness} />
                    <DiagnosticTag label="Posición" active={stableDiagnostics.position} />
                    <DiagnosticTag label="Mirada" active={stableDiagnostics.gaze} />
                  </div>
                </div>
                
                {/* Oval Guía Dinámico */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                  <motion.div 
                    animate={{ 
                      scale: allGood ? 1.02 : 1,
                      borderColor: allGood ? 'rgba(52, 211, 153, 0.8)' : 'rgba(255, 255, 255, 0.2)'
                    }}
                    className="w-[280px] h-[380px] sm:w-[320px] sm:h-[440px] rounded-[140px/190px] sm:rounded-[160px/220px] border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-colors duration-500"
                  >
                    {/* Corner accents */}
                    <div className="absolute inset-0 border-2 border-transparent rounded-[inherit]">
                      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full transition-colors ${allGood ? 'bg-emerald-400' : 'bg-white/40'}`} />
                      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full transition-colors ${allGood ? 'bg-emerald-400' : 'bg-white/40'}`} />
                    </div>
                  </motion.div>
                </div>

                {/* Feedback de Auto-capture */}
                <AnimatePresence>
                  {countdown !== null && (
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center z-40"
                    >
                      <div className="text-8xl font-bold text-white drop-shadow-2xl">
                        {countdown}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Instrucciones Pro */}
                <div className="absolute bottom-28 inset-x-0 text-center z-30 px-6">
                  <p className="text-white/80 text-sm font-medium drop-shadow-md">
                    {allGood 
                      ? "Mantente quieto, capturando..." 
                      : "Ubica tu rostro dentro del óvalo y busca buena iluminación"}
                  </p>
                </div>
              </>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-6 z-50 bg-zinc-900">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-white font-semibold text-xl">Error de Configuración</h3>
                  <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">{error}</p>
                </div>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-all active:scale-95"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {/* Botón de captura manual (Solo como respaldo si no hay auto-capture) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
              <button
                onClick={capturePhoto}
                disabled={isAnalyzing || !!error || !allGood}
                className={`
                  relative group w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500
                  ${allGood ? 'bg-white scale-110 shadow-xl' : 'bg-white/10 scale-100'}
                  disabled:opacity-20
                `}
              >
                <div className={`
                  w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors
                  ${allGood ? 'border-zinc-900' : 'border-white/20'}
                `}>
                  <CameraIcon className={`w-8 h-8 transition-colors ${allGood ? 'text-zinc-900' : 'text-white/40'}`} />
                </div>
                {allGood && (
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500 animate-ping opacity-20" />
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full bg-black"
          >
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-10 left-0 right-0 px-6 flex flex-col gap-4 z-30">
              <div className="text-center mb-2">
                <h4 className="text-white font-semibold text-lg">¿La imagen es clara?</h4>
                <p className="text-white/60 text-xs">Asegúrate que no haya sombras fuertes o desenfoque.</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleRetake}
                  className="flex-1 py-4 rounded-2xl bg-zinc-800/80 backdrop-blur-md text-white font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all active:scale-95"
                >
                  <RefreshCw className="w-5 h-5" />
                  REPETIR
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isAnalyzing}
                  className="flex-[1.5] py-4 rounded-2xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-6 h-6" />
                      ANALIZAR PIEL
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// Componente auxiliar para los tags de diagnóstico con diseño ultra-moderno
const DiagnosticTag: React.FC<{ label: string, active: boolean }> = ({ label, active }) => (
  <div className={`
    flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-700
    ${active 
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
      : 'bg-white/5 border-white/5 text-white/20'}
    border
  `}>
    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-white/10'}`} />
    <span className="text-[10px] font-bold tracking-widest uppercase whitespace-nowrap">{label}</span>
  </div>
);
