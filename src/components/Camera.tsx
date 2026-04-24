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
  const [lightingGood, setLightingGood] = useState(false);
  const [facePositionGood, setFacePositionGood] = useState(false);
  const [lookStraightGood, setLookStraightGood] = useState(false);
  const [sharpnessGood, setSharpnessGood] = useState(false);
  const [lastFaceBox, setLastFaceBox] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  
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
        
         // 1. Lighting and Sharpness Check
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
             const sampleSize = 256; // Increased to 256 for high-res center crop
             if (canvas.width !== sampleSize) {
                 canvas.width = sampleSize;
                 canvas.height = sampleSize;
             }
             
             // Extract an unscaled center crop from the native video resolution
             const vw = video.videoWidth || 640;
             const vh = video.videoHeight || 480;
             const sx = Math.max(0, (vw - sampleSize) / 2);
             const sy = Math.max(0, (vh - sampleSize) / 2);
             const sw = Math.min(vw, sampleSize);
             const sh = Math.min(vh, sampleSize);
             
             ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sampleSize, sampleSize);
             
             const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
             const data = imageData.data;
             
             let sum = 0;
             const gray = new Uint8Array(sampleSize * sampleSize);
             for(let i=0; i<data.length; i+=4) {
               const val = data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114;
               sum += val;
               gray[i/4] = val;
             }
             const avg = sum / (sampleSize * sampleSize);
             setLightingGood(avg > 100 && avg < 220); // Stricter lighting
             
             // Laplacian variance for sharpness (blur detection)
             let laplacianMean = 0;
             const laplacian = new Int16Array(sampleSize * sampleSize);
             for (let y = 1; y < sampleSize - 1; y++) {
                 for (let x = 1; x < sampleSize - 1; x++) {
                     const idx = y * sampleSize + x;
                     const val = gray[idx - sampleSize] + gray[idx - 1] - 4 * gray[idx] + gray[idx + 1] + gray[idx + sampleSize];
                     laplacian[idx] = val;
                     laplacianMean += val;
                 }
             }
             const count = (sampleSize - 2) * (sampleSize - 2);
             laplacianMean /= count;
             let variance = 0;
             for (let y = 1; y < sampleSize - 1; y++) {
                 for (let x = 1; x < sampleSize - 1; x++) {
                     const idx = y * sampleSize + x;
                     const diff = laplacian[idx] - laplacianMean;
                     variance += diff * diff;
                 }
             }
             // El umbral se reduce a 40. Las cámaras web (como MacBook) con fuerte
             // suavizado en el hardware producen varianzas muy bajas. 
             // Valores por debajo de 30-40 indicarán movimiento excesivo (motion blur).
             setSharpnessGood((variance / count) > 40); 
          }
        }

        // 2. Face Position and Look Straight
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
              
              // Video is mirrored for user, so x=0 is right and x=1 is left, but center is still ~0.5
              const isCentered = centerX > 0.35 && centerX < 0.65 && centerY > 0.30 && centerY < 0.70;
              // Stricter size check to prevent "face too small" error. 
              // Face must occupy at least 30% of width and 45% of height.
              const isGoodSize = width > 0.30 && width < 0.55 && height > 0.45 && height < 0.75;
              
              setFacePositionGood(isCentered && isGoodSize);
              if (isCentered && isGoodSize) {
                setLastFaceBox({ x: minX, y: minY, w: width, h: height });
              }
              
              if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
                const matrix = results.facialTransformationMatrixes[0].data;
                const yaw = Math.atan2(-matrix[8], Math.sqrt(matrix[9]*matrix[9] + matrix[10]*matrix[10])) * (180 / Math.PI);
                const pitch = Math.atan2(matrix[9], matrix[10]) * (180 / Math.PI);
                
                setLookStraightGood(Math.abs(yaw) < 14 && Math.abs(pitch) < 14);
              } else {
                setLookStraightGood(false);
              }
            } else {
              setFacePositionGood(false);
              setLookStraightGood(false);
            }
        } catch (e) {
            console.error("Error detecting face:", e);
        }
      }
    }
    
    requestRef.current = requestAnimationFrame(processFrame);
  }, [capturedImage]);

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
    if (videoRef.current && canvasRef.current && lastFaceBox) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // We will crop the image to a square area around the face with some padding
      // This ensures the face is large enough for the API.
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      
      // Calculate crop area with 30% padding
      const padding = 0.3;
      let cropW = lastFaceBox.w * (1 + padding * 2) * vw;
      let cropH = lastFaceBox.h * (1 + padding * 2) * vh;
      
      // Make it square based on the larger dimension
      const size = Math.max(cropW, cropH);
      
      let centerX = (lastFaceBox.x + lastFaceBox.w / 2) * vw;
      let centerY = (lastFaceBox.y + lastFaceBox.h / 2) * vh;
      
      let sx = centerX - size / 2;
      let sy = centerY - size / 2;
      
      // Clamp to video boundaries
      if (sx < 0) sx = 0;
      if (sy < 0) sy = 0;
      if (sx + size > vw) sx = vw - size;
      if (sy + size > vh) sy = vh - size;
      
      // Ensure we don't go out of bounds if size > video dim
      const finalSize = Math.min(size, vw, vh);

      canvas.width = 1024; // Force a good resolution for the API
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Mirror horizontally to match the preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        
        ctx.drawImage(video, sx, sy, finalSize, finalSize, 0, 0, 1024, 1024);
        
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
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
    setLightingGood(false);
    setFacePositionGood(false);
    setLookStraightGood(false);
    setSharpnessGood(false);
    lastVideoTimeRef.current = -1;
  };

  const allGood = lightingGood && facePositionGood && lookStraightGood && sharpnessGood;

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] sm:aspect-[4/5] max-h-[85vh] bg-zinc-100/90 dark:bg-zinc-900/90 rounded-2xl overflow-hidden border border-zinc-400 dark:border-zinc-800 shadow-2xl">
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
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center pt-4 sm:pt-6 z-10 overflow-hidden">
                <div className="flex gap-1.5 sm:gap-3 bg-zinc-900/40 p-1.5 sm:p-2.5 rounded-2xl backdrop-blur-md">
                  <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-white font-bold text-[9px] sm:text-xs text-center shadow-lg transition-colors duration-300 ${lightingGood ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
                    Iluminación<br/><span className="text-[8px] sm:text-[9px] opacity-90">{lightingGood ? 'Bien' : 'Mal'}</span>
                  </div>
                  <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-white font-bold text-[9px] sm:text-xs text-center shadow-lg transition-colors duration-300 ${lookStraightGood ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
                    Mirada Frontal<br/><span className="text-[8px] sm:text-[9px] opacity-90">{lookStraightGood ? 'Bien' : 'Mal'}</span>
                  </div>
                  <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-white font-bold text-[9px] sm:text-xs text-center shadow-lg transition-colors duration-300 ${facePositionGood ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
                    Posición<br/><span className="text-[8px] sm:text-[9px] opacity-90">{facePositionGood ? 'Bien' : 'Mal'}</span>
                  </div>
                  <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-white font-bold text-[9px] sm:text-xs text-center shadow-lg transition-colors duration-300 ${sharpnessGood ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
                    Nitidez<br/><span className="text-[8px] sm:text-[9px] opacity-90">{sharpnessGood ? 'Bien' : 'Mal'}</span>
                  </div>
                </div>
                
                <div className="flex-1 flex items-center justify-center pb-16 sm:items-start sm:justify-center sm:pt-6 sm:pb-0">
                  <div className={`w-[245px] h-[330px] sm:w-[270px] sm:h-[360px] rounded-full border-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] transition-colors duration-300 ${allGood ? 'border-emerald-400' : 'border-white/80'}`} />
                </div>
              </div>
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
