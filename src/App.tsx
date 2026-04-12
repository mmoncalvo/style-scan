import React, { useState, useEffect } from 'react';
import { Camera } from './components/Camera';
import { ImageUpload } from './components/ImageUpload';
import { AnalysisResult } from './components/AnalysisResult';
import { History } from './components/History';
import { SkinAnalysis } from './types';
import { Sparkles, History as HistoryIcon, Camera as CameraIcon, AlertCircle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import axios from 'axios';
import logo from "./logo.png";

export default function App() {
  const [currentResult, setCurrentResult] = useState<SkinAnalysis | null>(null);
  const [history, setHistory] = useState<SkinAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [view, setView] = useState<'camera' | 'result' | 'history'>('camera');
  const [inputMethod, setInputMethod] = useState<'camera' | 'upload'>('camera');

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/history');
      setHistory(response.data);
      console.log("🚀 ~ fetchHistory ~ response.data:", response.data)
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCapture = async (blob: Blob) => {
    // Start analysis process
    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append('image', blob, 'capture.jpg');

    try {
      const response = await axios.post('/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log("🚀 ~ handleCapture ~ response:", response)
      setCurrentResult(response.data);
      setView('result');
      fetchHistory();
      toast.success("Análisis completado con éxito");
    } catch (err) {
      console.error("Analysis failed:", err);
      toast.error("El análisis falló. Por favor intenta de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectHistory = (result: SkinAnalysis) => {
    setCurrentResult(result);
    setView('result');
  };

  const handleDeleteHistory = async (id: string) => {
    toast('¿Estás seguro de que deseas eliminar este análisis?', {
      description: 'Esta acción no se puede deshacer.',
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {

            await axios.delete(`/api/history/${id}`);
            fetchHistory();
            toast.success("Análisis eliminado correctamente");
          } catch (err) {
            console.error("Error deleting history:", err);
            toast.error("No se pudo eliminar el historial. Por favor intenta de nuevo.");
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => { }
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30">
      <Toaster theme="dark" position="top-center" />
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 space-x-2">
            <img src={logo} alt="logo" width={30} height={30} />
            <h1 className="text-2xl font-regular">Style<span className="text-emerald-500">Scan</span></h1>
          </div>

          <nav className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setView('camera')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'camera' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <CameraIcon className="w-4 h-4" />
              Cámara
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${view === 'history' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <HistoryIcon className="w-4 h-4" />
              Historial
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'camera' && (
            <motion.div
              key="camera-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-4">Analiza tu piel en segundos</h2>
                <p className="text-zinc-400">
                  Captura una foto o sube una imagen de tu rostro. Nuestra IA analizará
                  múltiples parámetros para darte un reporte detallado.
                </p>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setInputMethod('camera')}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 border ${inputMethod === 'camera'
                    ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                  <CameraIcon className="w-4 h-4" />
                  Usar Cámara
                </button>
                <button
                  onClick={() => setInputMethod('upload')}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 border ${inputMethod === 'upload'
                    ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                  <Upload className="w-4 h-4" />
                  Subir Imagen
                </button>
              </div>

              <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                  {inputMethod === 'camera' ? (
                    <motion.div
                      key="camera-input"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <Camera onCapture={handleCapture} isAnalyzing={isAnalyzing} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="upload-input"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <ImageUpload onUpload={handleCapture} isAnalyzing={isAnalyzing} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {view === 'result' && currentResult && (
            <motion.div
              key="result-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setView('camera')}
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <CameraIcon className="w-4 h-4" />
                  Nuevo Análisis
                </button>
              </div>
              <AnalysisResult result={currentResult} />
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div
              key="history-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Tu Historial</h2>
                <p className="text-zinc-400">Revisa tus análisis anteriores y observa tu progreso.</p>
              </div>
              <History history={history} onSelect={handleSelectHistory} onDelete={handleDeleteHistory} />
              {history.length === 0 && (
                <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
                  <HistoryIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500">No tienes análisis previos aún.</p>
                  <button
                    onClick={() => setView('camera')}
                    className="mt-4 text-emerald-500 font-medium hover:underline"
                  >
                    Comienza tu primer análisis
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-zinc-600 text-sm">
            Powered by Perfect Corp Skin Analysis API & AI Studio.
          </p>
          <div className="mt-4 flex justify-center gap-6 text-zinc-500 text-xs uppercase tracking-widest">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
