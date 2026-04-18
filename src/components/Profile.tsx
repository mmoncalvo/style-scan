import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { User, Mail, CreditCard, Lock, Loader2, Save, LogOut, Clock, History as HistoryIcon } from 'lucide-react';
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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="bg-[#0B5C66] dark:bg-teal-900/40 p-8 text-white">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-grow">
              <h2 className="text-2xl font-bold dark:text-white">{user.fullName || user.username}</h2>
              <p className="text-white/70 dark:text-teal-400/70">@{user.username} • {user.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-3 bg-white/10 dark:bg-slate-800/40 hover:bg-white/20 dark:hover:bg-slate-800/60 rounded-xl transition-all"
              title="Cerrar Sesión"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Nombre Completo</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 dark:focus:ring-teal-400/20 focus:border-[#0B5C66] dark:focus:border-teal-400 text-slate-900 dark:text-white transition-all"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 dark:focus:ring-teal-400/20 focus:border-[#0B5C66] dark:focus:border-teal-400 text-slate-900 dark:text-white transition-all"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Cambiar Contraseña (dejar en blanco para mantener actual)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0B5C66]/20 dark:focus:ring-teal-400/20 focus:border-[#0B5C66] dark:focus:border-teal-400 text-slate-900 dark:text-white transition-all"
                  placeholder="Nueva contraseña"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#0B5C66] dark:bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-[#0B5C66]/20 dark:shadow-teal-900/20 hover:bg-[#0B5C66]/90 dark:hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Actualizar Datos de Perfil
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-[#0B5C66] dark:text-teal-400" />
            Mis Análisis
          </h3>
        </div>

        {history.length > 0 ? (
          <History
            history={history}
            onSelect={onSelectHistory}
            onDelete={onDeleteHistory}
          />
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm border-dashed transition-colors duration-300">
            <Clock className="w-12 h-12 text-gray-200 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Aún no tienes análisis personales.</p>
          </div>
        )}
      </div>

      {user.role === 'admin' && (
        <>
          <div className="h-px bg-gray-100 dark:bg-slate-800" />
          <ProductManager token={token} />
        </>
      )}
    </motion.div>
  );
};
