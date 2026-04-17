import React, { useState, useEffect } from 'react';
import { Camera } from './components/Camera';
import { ImageUpload } from './components/ImageUpload';
import { AnalysisResult } from './components/AnalysisResult';
import { History } from './components/History';
import { SkinAnalysis } from './types';
import { Sparkles, History as HistoryIcon, Camera as CameraIcon, AlertCircle, Upload, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans selection:bg-[#0B5C66]/30">
      <Toaster theme="light" position="top-center" />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-widest text-slate-900 uppercase">Derma AI</h1>
            </div>

            <nav className="hidden md:flex gap-8">
              <button
                onClick={() => setView('camera')}
                className={`text-sm tracking-wide transition-all ${view === 'camera' || view === 'result' ? 'text-[#0B5C66] font-bold border-b-2 border-[#0B5C66] pb-1' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Análisis
              </button>
              <button
                onClick={() => setView('history')}
                className={`text-sm tracking-wide transition-all ${view === 'history' ? 'text-[#0B5C66] font-bold border-b-2 border-[#0B5C66] pb-1' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Progreso
              </button>
              <button className="text-sm tracking-wide text-slate-500 hover:text-slate-800">
                Clínica
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4 text-[#0B5C66]">
            <div className="hidden md:flex w-8 h-8 rounded-full items-center justify-center hover:bg-gray-100 cursor-pointer transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 cursor-pointer transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </div>
            <div className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 cursor-pointer transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </div>
          </div>
        </div>
      </header>

      {/* Offcanvas Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-64 bg-white shadow-2xl z-[101] md:hidden flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b border-gray-100">
                <h2 className="text-sm font-black tracking-widest text-slate-900 uppercase">Menú</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col p-4 gap-2">
                <button
                  onClick={() => {
                    setView('camera');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 text-left rounded-lg text-sm tracking-wide transition-all ${view === 'camera' || view === 'result' ? 'bg-teal-50 text-[#0B5C66] font-bold' : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
                >
                  Análisis
                </button>
                <button
                  onClick={() => {
                    setView('history');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3 text-left rounded-lg text-sm tracking-wide transition-all ${view === 'history' ? 'bg-teal-50 text-[#0B5C66] font-bold' : 'text-slate-600 hover:bg-gray-50 hover:text-slate-900'}`}
                >
                  Progreso
                </button>
                <button className="p-3 text-left rounded-lg text-sm tracking-wide text-slate-600 hover:bg-gray-50 hover:text-slate-900 transition-all">
                  Clínica
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              <div className="text-center max-w-2xl mx-auto mt-8">
                <h2 className="text-3xl font-bold text-slate-800 mb-4">Analiza tu piel en segundos</h2>
                <p className="text-slate-500">
                  Captura una foto o sube una imagen de tu rostro. Nuestra IA analizará
                  múltiples parámetros para darte un reporte detallado.
                </p>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setInputMethod('camera')}
                  className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 border ${inputMethod === 'camera'
                    ? 'bg-[#0B5C66] text-white border-[#0B5C66] shadow-lg shadow-[#0B5C66]/20'
                    : 'bg-white text-slate-600 border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <CameraIcon className="w-4 h-4" />
                  Usar Cámara
                </button>
                <button
                  onClick={() => setInputMethod('upload')}
                  className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 border ${inputMethod === 'upload'
                    ? 'bg-[#0B5C66] text-white border-[#0B5C66] shadow-lg shadow-[#0B5C66]/20'
                    : 'bg-white text-slate-600 border-gray-200 hover:border-gray-300'
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
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setView('camera')}
                  className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  ← Volver a analizar
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
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-12 mt-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Tu Progreso</h2>
                <p className="text-slate-500">Revisa tus análisis anteriores y observa tu evolución.</p>
              </div>
              <History history={history} onSelect={handleSelectHistory} onDelete={handleDeleteHistory} />
              {history.length === 0 && (
                <div className="text-center py-24 bg-white rounded-3xl border border-gray-200 border-dashed shadow-sm">
                  <HistoryIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No tienes análisis previos aún.</p>
                  <button
                    onClick={() => setView('camera')}
                    className="mt-4 text-[#0B5C66] font-bold hover:underline"
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
      <footer className="border-t border-gray-200 py-12 mt-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            Powered by Perfect Corp Skin Analysis API & AI Studio.
          </p>
          <div className="mt-4 flex justify-center gap-6 text-slate-400 text-xs uppercase tracking-widest font-medium">
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

