import React, { useState } from 'react';
import { SkinAnalysis } from '../types';
import { motion } from 'motion/react';
import { Activity, User, Droplets, Sparkles, AlertCircle, ShoppingBag, X } from 'lucide-react';
import productsData from '../../data/products.json';

interface AnalysisResultProps {
  result: SkinAnalysis;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result }) => {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // console.log("🚀 ~ AnalysisResult ~ result:", result)

  const metrics = [
    { label: 'Puntos', type: 'age_spot', targetKey: 'spots', value: result.spots, icon: Activity, color: 'text-blue-400' },
    { label: 'Arrugas', type: 'wrinkle', targetKey: 'wrinkles', value: result.wrinkles, icon: Activity, color: 'text-purple-400' },
    { label: 'Textura', type: 'texture', targetKey: 'texture', value: result.texture, icon: Activity, color: 'text-emerald-400' },
    { label: 'Ojeras', type: 'dark_circle_v2', targetKey: 'darkCircles', value: result.darkCircles, icon: Activity, color: 'text-amber-400' },
    { label: 'Poros', type: 'pore', targetKey: 'pores', value: result.pores, icon: Activity, color: 'text-cyan-400' },
    { label: 'Enrojecimiento', type: 'redness', targetKey: 'redness', value: result.redness, icon: Activity, color: 'text-red-400' },
    { label: 'Grasitud', type: 'oiliness', targetKey: 'oiliness', value: result.oiliness, icon: Activity, color: 'text-yellow-400' },
    { label: 'Humedad', type: 'moisture', targetKey: 'moisture', value: result.moisture, icon: Droplets, color: 'text-sky-400' },
    { label: 'Bolsas', type: 'eye_bag', targetKey: 'eyebag', value: result.eyebag, icon: Activity, color: 'text-indigo-400' },
    { label: 'Párpado Caído', type: 'droopy_upper_eyelid', targetKey: 'droopyEyelid', value: result.droopyEyelid, icon: Activity, color: 'text-violet-400' },
    { label: 'Acné', type: 'acne', targetKey: 'acne', value: result.acne, icon: AlertCircle, color: 'text-rose-400' },
  ];

  // Get 3 areas that need the most attention (lowest values)
  const areasToImprove = [...metrics].sort((a, b) => a.value - b.value).filter((a: any) => a.value < 75);
  console.log("🚀 ~ AnalysisResult ~ areasToImprove:", areasToImprove)

  // Recommend 2 products per area
  const recommendedProducts = areasToImprove.flatMap(area => {
    return productsData.filter((p: any) => p.target === area.targetKey);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden shadow-xl"
    >

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl">
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
              <div className="text-5xl font-bold text-white mb-2">{Math.round(result.skinScore)}</div>
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
                className="absolute inset-0 w-full h-full object-cover opacity-80"
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
      </div>

      {/* RECOMENDACIONES DE PRODUCTOS */}
      <div className="py-6 mt-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Recomendaciones para ti</h3>
            <p className="text-sm text-zinc-400">Productos seleccionados específicamente basados en tu análisis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {recommendedProducts.map(product => {
            const relatedMetric = metrics.find(m => m.targetKey === product.target);
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors group flex flex-col h-full"
              >
                <div className="aspect-[4/3] bg-zinc-800 relative overflow-hidden flex-shrink-0">
                  <img onClick={() => setSelectedProduct(product)} src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" />
                  <div className="absolute top-3 left-3 bg-zinc-900/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-zinc-700/50 flex items-center gap-1.5">
                    {relatedMetric && <relatedMetric.icon className={`w-3.5 h-3.5 ${relatedMetric.color}`} />}
                    <span className="text-[10px] text-white font-medium uppercase tracking-wider">{relatedMetric?.label || product.target}</span>
                    <span className="">{relatedMetric?.value}</span>
                  </div>
                </div>
                <div className="flex flex-col flex-grow">
                  <div className="p-4">
                    <h4 className="text-sm font-bold text-white my-2 line-clamp-2 leading-tight">{product.title}</h4>
                    <p className="text-xs text-zinc-400 line-clamp-3 mb-4 leading-relaxed flex-grow">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto border-t border-zinc-800/50 bg-zinc-800/90 p-4">
                    <span className="font-mono font-bold text-white tracking-tight">${product.price.toFixed(2)}</span>
                    <button onClick={() => setSelectedProduct(product)} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer">Ver más</button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="aspect-video bg-zinc-800 relative shrink-0 max-h-[400px]">
              <img src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-full object-cover bg-center" />
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs text-emerald-400 font-medium mb-4 uppercase tracking-wider">{selectedProduct.target}</div>
                  <h3 className="text-xl font-bold text-white leading-tight">{selectedProduct.title}</h3>
                </div>
                <div className="text-xl font-mono font-bold text-emerald-400 shrink-0">${selectedProduct.price.toFixed(2)}</div>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                {selectedProduct.description}
              </p>

              <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                {(() => {
                  const m = metrics.find(m => m.targetKey === selectedProduct.target);
                  if (!m) return null;
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 shrink-0">
                        <m.icon className={`w-5 h-5 ${m.color}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-white">{m.label}</div>
                        <div className="text-xs text-zinc-400"><span className="text-white font-bold">{m.value}</span></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="mt-6">
                <button className="w-full py-3 border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-bold rounded-xl transition-colors">
                  Añadir al carrito
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
};
