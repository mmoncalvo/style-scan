import React, { useState } from 'react';
import { SkinAnalysis } from '../types';
import { motion } from 'motion/react';
import { Activity, User, Droplets, Sparkles, AlertCircle } from 'lucide-react';

interface AnalysisResultProps {
  result: SkinAnalysis;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result }) => {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  const metrics = [
    { label: 'Puntos', type: 'age_spot', value: result.spots, icon: Activity, color: 'text-blue-400' },
    { label: 'Arrugas', type: 'wrinkle', value: result.wrinkles, icon: Activity, color: 'text-purple-400' },
    { label: 'Textura', type: 'texture', value: result.texture, icon: Activity, color: 'text-emerald-400' },
    { label: 'Ojeras', type: 'dark_circle_v2', value: result.darkCircles, icon: Activity, color: 'text-amber-400' },
    { label: 'Poros', type: 'pore', value: result.pores, icon: Activity, color: 'text-cyan-400' },
    { label: 'Enrojecimiento', type: 'redness', value: result.redness, icon: Activity, color: 'text-red-400' },
    { label: 'Grasitud', type: 'oiliness', value: result.oiliness, icon: Activity, color: 'text-yellow-400' },
    { label: 'Humedad', type: 'moisture', value: result.moisture, icon: Droplets, color: 'text-sky-400' },
    { label: 'Bolsas', type: 'eye_bag', value: result.eyebag, icon: Activity, color: 'text-indigo-400' },
    { label: 'Párpado Caído', type: 'droopy_upper_eyelid', value: result.droopyEyelid, icon: Activity, color: 'text-violet-400' },
    { label: 'Acné', type: 'acne', value: result.acne, icon: AlertCircle, color: 'text-rose-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl"
    >
      {result.isMock && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 flex items-center gap-3 text-amber-500">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            ¡Aviso! Se han agotado los créditos de la API. Estos son resultados de prueba (Mock).
          </p>
        </div>
      )}
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-semibold text-white">Resultado del Análisis</h2>
        </div>
        <div className="text-zinc-500 text-sm font-mono">
          {new Date(result.createdAt).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {/* Main Stats */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-zinc-800/50 p-6 rounded-xl border border-zinc-700/50 text-center">
            <div className="text-sm text-zinc-400 uppercase tracking-wider mb-1">Puntaje de Piel</div>
            <div className="text-5xl font-bold text-white mb-2">{Math.round(result.skinScore * 100) / 100}</div>
            <div className="w-full bg-zinc-700 h-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${result.skinScore}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 text-center">
              <User className="w-5 h-5 text-zinc-400 mx-auto mb-2" />
              <div className="text-xs text-zinc-400 uppercase tracking-wider">Edad de Piel</div>
              <div className="text-2xl font-bold text-white">{result.skinAge}</div>
            </div>
            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 text-center">
              <Activity className="w-5 h-5 text-zinc-400 mx-auto mb-2" />
              <div className="text-xs text-zinc-400 uppercase tracking-wider">Tipo de Piel</div>
              <div className="text-lg font-bold text-white truncate">{result.skinType}</div>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-zinc-700 aspect-square bg-black">
            {/* The resized image mask if available, otherwise fallback to the upload snapshot */}
            <img
              src={result.masks?.['resize_image'] || result.imageUrl}
              alt="Analyzed Base"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {activeLayer && result.masks?.[activeLayer] && (
              <img
                src={result.masks[activeLayer]}
                alt={`${activeLayer} Mask`}
                className="absolute inset-0 w-full h-full object-cover mix-blend-normal opacity-90 transition-opacity duration-300"
              />
            )}
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {metrics.map((metric, idx) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setActiveLayer(activeLayer === metric.type ? null : metric.type)}
              className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${activeLayer === metric.type
                ? 'bg-zinc-800 border-zinc-500 shadow-md transform scale-105'
                : 'bg-zinc-800/30 border-zinc-700/30 hover:bg-zinc-800/50'
                }`}
            >
              <metric.icon className={`w-5 h-5 ${metric.color} mb-2`} />
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{metric.label}</div>
              <div className="text-xl font-bold text-white">{metric.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
