import React, { useState } from 'react';
import { SkinAnalysis, Product } from '../types';
import { motion } from 'motion/react';
import { Activity, User, Droplets, Sparkles, AlertCircle, ShoppingBag, X, Clock } from 'lucide-react';
import productsData from '../../data/products.json';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AnalysisResultProps {
  result: SkinAnalysis;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result }) => {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  React.useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedProduct]);

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

  // Recommend 2 products per area
  const recommendedProducts = areasToImprove.flatMap(area => {
    return productsData.filter((p: any) => p.target === area.targetKey);
  });

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const primaryColor = [11, 92, 102]; // #0B5C66

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE ANÁLISIS FACIAL', 105, 25, { align: 'center' });

    // Summary Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Resumen General', 20, 55);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 65);
    doc.text(`Puntuación de Piel (Skin Score): ${Math.round(result.skinScore)}/100`, 20, 72);
    doc.text(`Edad Biológica Estimada: ${result.skinAge} años`, 20, 79);
    doc.text(`Tipo de Piel: ${result.skinType}`, 20, 86);

    // Metrics Table
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Biomarcadores', 20, 105);

    const tableData = metrics.map(m => [m.label, `${m.value}%`]);
    autoTable(doc, {
      startY: 110,
      head: [['Parámetro', 'Valor']],
      body: tableData,
      headStyles: { fillColor: primaryColor as [number, number, number] },
      margin: { left: 20, right: 20 }
    });

    // Recommendations
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Recomendaciones Personalizadas', 20, finalY);

    const recommendations = areasToImprove.slice(0, 3).map(area => {
      const prods = productsData.filter((p: any) => p.target === area.targetKey).slice(0, 1);
      return [
        area.label,
        prods.length > 0 ? prods[0].title : 'Tratamiento específico',
        prods.length > 0 ? prods[0].description.substring(0, 80) + '...' : '-'
      ];
    });

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Área de Mejora', 'Producto Recomendado', 'Descripción']],
      body: recommendations,
      headStyles: { fillColor: primaryColor as [number, number, number] },
      styles: { fontSize: 10 },
      margin: { left: 20, right: 20 }
    });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Powered by Derma AI - Skin Analysis Studio', 105, 285, { align: 'center' });

    doc.save(`DermaAI_Reporte_${result.id.substring(0, 8)}.pdf`);
    toast.success('Reporte PDF generado correctamente');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-[35%] flex flex-col gap-6">
          {/* Main Score Card */}
          <div className="bg-[#F3F4F6] rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
            {/* Dark Teal Area */}
            <div className="bg-[#0B5C66] w-full rounded-2xl flex flex-col items-center justify-center py-10 shadow-md">
              <div className="w-40 h-40 bg-white rounded-full flex flex-col items-center justify-center shadow-lg relative">
                 <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="80" cy="80" r="76" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                    <circle cx="80" cy="80" r="76" stroke="#0B5C66" strokeWidth="8" fill="none" strokeDasharray="477" strokeDashoffset={477 - (477 * result.skinScore) / 100} />
                 </svg>
                 <span className="text-5xl font-black text-slate-900 leading-none">{Math.round(result.skinScore)}<span className="text-xl">.{(result.skinScore % 1 * 10).toFixed(0)}</span></span>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Skin Score</span>
              </div>
            </div>
            
            <div className="mt-8 text-center px-2">
              <h3 className="text-xl font-bold text-slate-900 mb-3">Estado General</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Su piel muestra una salud general estable, aunque se detectan áreas de mejora en texturas según los biomarcadores. Edad biológica estimada: <span className="font-semibold text-slate-700">{result.skinAge} años</span>.
              </p>
              <button 
                onClick={handleDownloadPDF}
                className="w-full py-4 px-6 bg-[#0B5C66] hover:bg-[#094A52] text-white text-sm font-bold tracking-widest uppercase rounded-xl transition-colors shadow-md"
              >
                Descargar Reporte PDF
              </button>            </div>
          </div>

          {/* Image Card */}
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-md relative aspect-square group">
            <img
                src={result.masks?.['resize_image'] || result.imageUrl}
                alt="Analyzed Base"
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            />
            {activeLayer && result.masks?.[activeLayer] && (
               <img
                  src={result.masks[activeLayer]}
                  alt={`${activeLayer} Mask`}
                  className="absolute inset-0 w-full h-full object-cover mix-blend-normal opacity-90 transition-opacity duration-300"
               />
            )}
            {/* Timestamp Badge */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-white bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg text-xs font-bold tracking-wide">
              <Clock className="w-4 h-4" />
              ESCANEO HACE 2 MINUTOS
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[65%] flex flex-col gap-10">
          
          {/* Detailed Metrics */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
             <div className="mb-8 border-b-2 border-gray-100 pb-4 inline-block">
               <h2 className="text-2xl font-bold text-[#0B5C66]">Métricas Detalladas</h2>
               <p className="text-slate-500 text-sm mt-1">Análisis multiespectral mediante IA avanzada.</p>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-10">
                {metrics.map((metric, idx) => (
                   <motion.div
                     key={metric.label}
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: idx * 0.05 }}
                     onClick={() => setActiveLayer(activeLayer === metric.type ? null : metric.type)}
                     className={`cursor-pointer flex flex-col items-center text-center transition-all duration-200 group ${activeLayer === metric.type ? '' : ''}`}
                   >
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${activeLayer === metric.type ? 'bg-[#0B5C66] shadow-md' : 'bg-teal-50 group-hover:bg-teal-100'}`}>
                       <metric.icon className={`w-5 h-5 ${activeLayer === metric.type ? 'text-white' : 'text-[#0B5C66]'}`} />
                     </div>
                     <div className="text-xl font-black text-slate-800 mb-1">{typeof metric.value === 'number' && metric.value > 10 ? `${metric.value}%` : metric.value}</div>
                     <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">{metric.label}</div>
                   </motion.div>
                ))}
             </div>
          </div>

          {/* Recommended Products */}
          <div className="bg-transparent">
             <div className="flex items-center gap-4 mb-6">
               <h2 className="text-2xl font-bold text-slate-900">Recomendaciones Curadas</h2>
               <span className="bg-teal-100 text-[#0B5C66] text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase">Para Ti</span>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {recommendedProducts.slice(0, 6).map(product => {
                  const relatedMetric = metrics.find(m => m.targetKey === product.target);
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 flex flex-col cursor-pointer group"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden flex items-center justify-center p-4">
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-3 right-3 bg-white w-8 h-8 rounded-full shadow-sm flex items-center justify-center">
                          {relatedMetric ? <relatedMetric.icon className="w-4 h-4 text-[#0B5C66]" /> : <ShoppingBag className="w-4 h-4 text-[#0B5C66]" />}
                        </div>
                      </div>
                      <div className="p-5 flex flex-col flex-grow">
                        <div className="text-[10px] font-bold text-[#0B5C66] tracking-widest uppercase mb-2">{relatedMetric?.label || product.target}</div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight mb-4 flex-grow">{product.title}</h4>
                        
                        <div className="flex items-center justify-between mt-auto">
                          <span className="font-bold text-slate-900">${product.price.toFixed(2)}</span>
                          <button className="w-8 h-8 rounded-full bg-[#0B5C66] text-white flex items-center justify-center shadow-md hover:bg-[#094A52] transition-colors">
                            <span className="text-lg font-light leading-none mb-0.5">+</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
               })}
             </div>
          </div>
        </div>
      </div>

      {/* Modal - Light Theme Adaptation */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white text-slate-600 rounded-full backdrop-blur-md transition-colors shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="aspect-video bg-gray-50 relative shrink-0 max-h-[300px] flex items-center justify-center p-4">
              <img src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-full object-contain" />
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="text-xs text-[#0B5C66] font-bold mb-2 uppercase tracking-widest">{selectedProduct.target}</div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedProduct.title}</h3>
                </div>
                <div className="text-2xl font-bold text-slate-900 shrink-0">${selectedProduct.price.toFixed(2)}</div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed my-6">
                {selectedProduct.description}
              </p>

              <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100">
                {(() => {
                  const m = metrics.find(m => m.targetKey === selectedProduct.target);
                  if (!m) return null;
                  return (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                        <m.icon className="w-6 h-6 text-[#0B5C66]" />
                      </div>
                      <div className="flex flex-col">
                         <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5">{m.label}</div>
                         <div className="text-lg font-black text-slate-900 leading-none">{m.value}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="mt-8">
                <button className="w-full py-4 text-white bg-[#0B5C66] hover:bg-[#094A52] font-bold tracking-wide uppercase text-sm rounded-xl transition-colors shadow-lg shadow-teal-900/20">
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
