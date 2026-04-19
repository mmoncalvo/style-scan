import React, { useState, useEffect } from 'react';
import { Camera } from './components/Camera';
import { ImageUpload } from './components/ImageUpload';
import { AnalysisResult } from './components/AnalysisResult';
import { History } from './components/History';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Profile } from './components/Profile';
import { SkinAnalysis, User, Product } from './types';
import { Sparkles, History as HistoryIcon, Camera as CameraIcon, AlertCircle, Upload, Menu, X, User as UserIcon, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import axios from 'axios';

export default function App() {
  const [currentResult, setCurrentResult] = useState<SkinAnalysis | null>(null);
  const [guestHistory, setGuestHistory] = useState<SkinAnalysis[] | null>(null);
  const [userHistory, setUserHistory] = useState<SkinAnalysis[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [view, setView] = useState<'camera' | 'result' | 'history' | 'login' | 'register' | 'profile'>('camera');
  const [inputMethod, setInputMethod] = useState<'camera' | 'upload'>('camera');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobileMenuOpen]);

  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(JSON.parse(localStorage.getItem('user') || 'null'));

  const fetchGuestHistory = async () => {
    try {
      const response = await axios.get('/api/history');
      setGuestHistory(response.data);
    } catch (err) {
      console.error("Error fetching guest history:", err);
    }
  };

  const fetchUserHistory = async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get('/api/my-history', config);
      setUserHistory(response.data);
    } catch (err) {
      console.error("Error fetching user history:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    fetchGuestHistory();
    fetchProducts();
    if (token) {
      fetchUserHistory();
    } else {
      setUserHistory([]);
    }
  }, [token]);

  const handleLogin = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setView('profile');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('login');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleCapture = async (blob: Blob) => {
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('image', blob, 'capture.jpg');

    try {
      const config = token ? { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } } : { headers: { 'Content-Type': 'multipart/form-data' } };
      const response = await axios.post('/api/analyze', formData, config);
      setCurrentResult(response.data);
      setView('result');
      fetchGuestHistory();
      if (token) fetchUserHistory();
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
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            await axios.delete(`/api/history/${id}`, config);
            fetchGuestHistory();
            if (token) fetchUserHistory();
            toast.success("Análisis eliminado correctamente");
          } catch (err) {
            console.error("Error deleting history:", err);
            toast.error("No se pudo eliminar el historial.");
          }
        }
      },
      cancel: { label: 'Cancelar', onClick: () => { } }
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans selection:bg-[#0B5C66]/30 transition-colors duration-300">
      <Toaster theme={darkMode ? 'dark' : 'light'} position="top-center" />

      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('camera')}>
              <h1 className="text-xl font-black tracking-widest text-slate-900 dark:text-white text-nowrap uppercase">Derma AI</h1>
            </div>

            <nav className="hidden md:flex gap-8">
              <button
                onClick={() => setView('camera')}
                className={`text-sm tracking-wide transition-all ${view === 'camera' || view === 'result' ? 'text-[#0B5C66] dark:text-teal-400 font-bold border-b-2 border-[#0B5C66] dark:border-teal-400 pb-1' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Análisis
              </button>
              <button
                onClick={() => setView('history')}
                className={`text-sm tracking-wide transition-all ${view === 'history' ? 'text-[#0B5C66] dark:text-teal-400 font-bold border-b-2 border-[#0B5C66] dark:border-teal-400 pb-1' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Historial
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4 text-[#0B5C66] dark:text-teal-400">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
              aria-label="Cambiar modo de color"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <div
                onClick={() => setView('profile')}
                className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full transition-all ${view === 'profile' ? 'bg-teal-50 dark:bg-teal-900/20 ring-1 ring-[#0B5C66]/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
              >
                <div className="w-8 h-8 rounded-full bg-[#0B5C66] text-white flex items-center justify-center text-xs font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm font-semibold">@{user.username}</span>
              </div>
            ) : (
              <button
                onClick={() => setView('login')}
                className="text-sm font-bold p-2 rounded-full bg-teal-100/50 dark:bg-teal-900/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-teal-700/30 dark:border-teal-500/50 transition-all"
              >
                <UserIcon className="w-5 h-5 block" />
              </button>
            )}
            <div className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 w-64 bg-white dark:bg-slate-900 shadow-2xl z-[101] md:hidden flex flex-col transition-colors duration-300">
              <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
                <h2 className="text-sm font-black tracking-widest text-slate-900 dark:text-white uppercase">Menú</h2>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex flex-col p-4 gap-2">
                <button onClick={() => { setView('camera'); setIsMobileMenuOpen(false); }} className={`p-3 text-left rounded-lg text-sm tracking-wide transition-all ${view === 'camera' || view === 'result' ? 'bg-teal-50 dark:bg-teal-900/20 text-[#0B5C66] dark:text-teal-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}>Análisis</button>
                <button onClick={() => { setView('history'); setIsMobileMenuOpen(false); }} className={`p-3 text-left rounded-lg text-sm tracking-wide transition-all ${view === 'history' ? 'bg-teal-50 dark:bg-teal-900/20 text-[#0B5C66] dark:text-teal-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}>Historial</button>
                {user ? (
                  <button onClick={() => { setView('profile'); setIsMobileMenuOpen(false); }} className={`p-3 text-left rounded-lg text-sm tracking-wide transition-all ${view === 'profile' ? 'bg-teal-50 dark:bg-teal-900/20 text-[#0B5C66] dark:text-teal-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}>Mi Perfil</button>
                ) : (
                  <button onClick={() => { setView('login'); setIsMobileMenuOpen(false); }} className="p-3 text-left rounded-lg text-sm tracking-wide text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 font-bold">Iniciar Sesión</button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'camera' && (
            <motion.div key="camera-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="text-center max-w-4xl mx-auto mt-8">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Analiza tu piel en segundos</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Captura una foto o sube una imagen de tu rostro. Nuestra IA analizará múltiples parámetros para darte un reporte detallado.</p>
              </div>
              <div className="flex justify-center gap-4">
                <button onClick={() => setInputMethod('camera')} className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 border ${inputMethod === 'camera' ? 'bg-[#0B5C66] text-white border-[#0B5C66] shadow-lg shadow-[#0B5C66]/20' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'}`}><CameraIcon className="w-4 h-4" /> Usar Cámara</button>
                <button onClick={() => setInputMethod('upload')} className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 border ${inputMethod === 'upload' ? 'bg-[#0B5C66] text-white border-[#0B5C66] shadow-lg shadow-[#0B5C66]/20' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'}`}><Upload className="w-4 h-4" /> Subir Imagen</button>
              </div>
              <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                  {inputMethod === 'camera' ? (
                    <motion.div key="camera-input" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}><Camera onCapture={handleCapture} isAnalyzing={isAnalyzing} /></motion.div>
                  ) : (
                    <motion.div key="upload-input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><ImageUpload onUpload={handleCapture} isAnalyzing={isAnalyzing} /></motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
          {view === 'result' && currentResult && (
            <motion.div key="result-view" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-6">
              <button onClick={() => setView('camera')} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-2 text-sm font-medium">← Volver a analizar</button>
              <AnalysisResult result={currentResult} allProducts={products} />
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div key="history-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-4xl mx-auto">
              <div className="text-center mb-12 mt-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Historial de Análisis</h2>
                <p className="text-slate-500 dark:text-slate-400">Consulta los resultados de los últimos análisis faciales.</p>
              </div>
              <History history={guestHistory} onSelect={handleSelectHistory} onDelete={handleDeleteHistory} />
              {guestHistory !== null && guestHistory.length === 0 && (
                <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 border-dashed shadow-sm transition-colors duration-300">
                  <HistoryIcon className="w-12 h-12 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No hay análisis recientes disponibles.</p>
                  <button onClick={() => setView('camera')} className="mt-4 text-[#0B5C66] dark:text-teal-400 font-bold hover:underline">Comienza tu primer análisis</button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'login' && <Login onLogin={handleLogin} onSwitchToRegister={() => setView('register')} />}
          {view === 'register' && <Register onRegisterSuccess={() => setView('login')} onSwitchToLogin={() => setView('login')} />}
          {view === 'profile' && user && token && (
            <Profile
              user={user}
              token={token}
              onLogout={handleLogout}
              onUpdate={handleUpdateUser}
              history={userHistory}
              onSelectHistory={handleSelectHistory}
              onDeleteHistory={handleDeleteHistory}
            />
          )}        </AnimatePresence>
      </main>

      <footer className="border-t border-gray-200 dark:border-slate-800 py-12 mt-20 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Powered by Perfect Corp Skin Analysis API & AI Studio.</p>
        </div>
      </footer>
    </div>
  );
}
