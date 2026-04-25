import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Mail,
  CreditCard,
  Lock,
  Loader2,
  Save,
  LogOut,
  Clock,
  History as HistoryIcon,
  ShieldCheck,
  Settings,
  ChevronRight
} from 'lucide-react';
import { User as UserType, SkinAnalysis } from '../types';
import { History } from './History';
import { ProductManager } from './ProductManager';

interface ProfileProps {
  user: UserType;
  token: string;
  onLogout: () => void;
  onUpdate: (updatedUser: UserType) => void;
  history: SkinAnalysis[];
  onSelectHistory: (result: SkinAnalysis) => void;
  onDeleteHistory: (id: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({
  user,
  token,
  onLogout,
  onUpdate,
  history,
  onSelectHistory,
  onDeleteHistory
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'admin'>('info');
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    email: user.email || '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.put('/api/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdate(response.data.user);
      setFormData({ ...formData, password: '' });
      toast.success('Perfil actualizado correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-8 transition-all duration-300">
        <div className="h-18 mb-4 bg-gradient-to-r from-[#0B5C66] to-[#148e9c] dark:from-teal-950 dark:to-slate-900 relative">
          {user.role === 'admin' && (
            <div className="absolute top-6 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Admin</span>
            </div>
          )}
        </div>
        <div className="px-8 pb-8">
          <div className="relative flex flex-col md:flex-row md:items-end gap-6 -mt-12 mb-6">
            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-xl">
              <div className="w-full h-full bg-[#0B5C66] dark:bg-teal-700 rounded-xl flex items-center justify-center text-4xl font-black text-white">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-grow pt-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">@{user.username}</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{user.fullName || 'Usuario de StyleScan'}</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-all border border-rose-200/50 dark:border-rose-900/30"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar border-b border-gray-100 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'info' ? 'border-[#0B5C66] dark:border-teal-400 text-[#0B5C66] dark:text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Settings className="w-4 h-4" />
              Información
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-[#0B5C66] dark:border-teal-400 text-[#0B5C66] dark:text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Clock className="w-4 h-4" />
              Historial ({history?.length || 0})
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-6 py-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 whitespace-nowrap ${activeTab === 'admin' ? 'border-[#0B5C66] dark:border-teal-400 text-[#0B5C66] dark:text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <ShoppingBagIcon className="w-4 h-4" />
                Catálogo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Editar Información</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-[#0B5C66] dark:text-white outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-[#0B5C66] dark:text-white outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña (opcional)</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-[#0B5C66] dark:text-white outline-none transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-[#0B5C66] dark:bg-teal-600 text-white rounded-2xl font-bold hover:bg-[#0B5C66]/90 transition-all shadow-lg shadow-[#0B5C66]/20 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Cambios</>}
                  </button>
                </form>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-teal-50 dark:bg-teal-900/20 p-6 rounded-3xl border border-teal-100 dark:border-teal-900/30">
                <h4 className="text-sm font-bold text-[#0B5C66] dark:text-teal-400 uppercase tracking-widest mb-4">Resumen de Cuenta</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-teal-200/30 dark:border-teal-900/30">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Total de Análisis</span>
                    <span className="font-bold text-slate-900 dark:text-white">{history.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-teal-200/30 dark:border-teal-900/30">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Rol de Usuario</span>
                    <span className="text-xs font-black uppercase bg-teal-200/50 dark:bg-teal-900/50 px-2 py-0.5 rounded text-[#0B5C66] dark:text-teal-400">{user.role}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div>
              {history && history.length > 0 ? (
                <History
                  history={history}
                  onSelect={onSelectHistory}
                  onDelete={onDeleteHistory}
                />
              ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                  <HistoryIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Aún no tienes análisis personales.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'admin' && user.role === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ProductManager token={token} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Simple icon wrapper for ShoppingBag
const ShoppingBagIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
